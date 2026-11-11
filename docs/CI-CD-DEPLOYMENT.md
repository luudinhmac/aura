# GitLab CI/CD: staging and production

## Intended flow

- Merge requests that change application or deployment files run quality checks (`interruptible: true`) on a GitLab Shared Runner. A merge request changing only non-runtime files (`docs/`, root-level Markdown, `prisma/migrations-archive/`, `.agents/`, `.vscode/`, `.gitignore`, `.gitattributes`, `metadata.json`) gets a lightweight `docs_only` marker job instead; it does not build or deploy the app.
- A push/merge to `main` that changes application or deployment files (or a manual `web` Run pipeline on `main`) runs the same checks, then deploys that commit to `staging.aura.com` automatically. A non-runtime `main` push is filtered out at `workflow:rules` so GitLab does not create an empty pipeline and leaves staging unchanged. Protect `main` in GitLab; the YAML itself does not enforce branch protection.
- Production is a separate manual job in the same pipeline and cannot run until staging deployment succeeds. It deploys the same commit and Docker image staged by that pipeline.
- `resource_group` serializes deployments per environment, and deploy jobs set `interruptible: false`. Pipelines are restricted to merge requests and `main`; the VM runner is not assigned to untrusted merge-request jobs. The `workflow` and job-level `rules:changes:regexp` filter treats any changed path outside the non-runtime exclusions above as deploy-relevant, including new source/configuration files. A mixed code-and-docs change therefore follows the full pipeline.

The path filter requires GitLab 19.2 or later. Check it with CI Lint on the project before merging this configuration. GitLab's `Pipelines must succeed` merge check may block a merge request with no pipeline, which is why non-runtime merge requests retain the small `docs_only` job. A manually started (`web`) pipeline on `main` bypasses the push-diff filter and runs the full jobs; this is not a docs-only auto-deploy. For a non-runtime `main` commit, production must be approved from the most recent successful **application** pipeline whose exact image/SHA was verified on staging, not from the docs commit.

## VM boundaries and persistent state

- Production remains the Compose project `aura-talent`, with its existing `/data/aura-talent/.env`, PostgreSQL volume, and uploads volume. The deployment script never runs `down -v`, `db push --force-reset`, or a seed/import script.
- Staging is a separate Compose project `aura-talent-staging`, with its own PostgreSQL and uploads volumes, its own secret file at `/data/aura-talent/staging/.env`, and an app port bound only to `127.0.0.1:13001`.
- Nginx serves both hostnames with the existing certificate/key paths and joins both the production and staging Docker networks. Before staging is exposed, the deployment checks that `aura.com.crt` includes the `*.aura.com` SAN. Nginx proxies staging directly to the `staging-app:3000` network alias; port `127.0.0.1:13001` is only for VM-local health checks. The production Compose configuration requires the staging network to exist, so a fresh installation must create staging before starting production Nginx.
- Release directories are commit-specific. Production releases go under `/data/aura-talent/releases/<short-sha>`; staging releases go under `/data/aura-talent/staging/releases/<short-sha>`. The repository root is not used as a live checkout.
- The staging deployment starts staging and checks app health, then validates Nginx in a temporary container attached to both Docker networks. It updates the shared Nginx config. On initial setup, Nginx may be recreated once to mount that stable config and join the staging network; this can briefly interrupt HTTP(S) traffic. Subsequent config updates are validated and reloaded in place.

## GitLab setup required before enabling jobs

The items below are configuration requirements to verify in GitLab, not proof that the current project/runner settings are already protected. In particular, confirm branch protection, runner scope and CI variable protection before relying on them for access control.

1. Protect `main`; configure the `aura-runner` runner as project-locked and protected, and disable its “run untagged jobs” option so the untagged `verify` job is picked up by a Shared Runner. Do not allow it to run untrusted merge-request pipelines. `gitlab-runner` must not be added to the Docker group.
2. Confirm GitLab Shared Runners are enabled for the project; they run the `verify` job using `node:22-alpine`.
3. Add protected, masked/file-type CI variables as appropriate:
   - `VM_DEPLOY_HOST` (VM SSH host reachable from the runner; normally `127.0.0.1` because `aura-runner` is on that VM).
   - `VM_DEPLOY_USER` (`aura-talent`).
   - `VM_DEPLOY_SSH_KEY` (file variable; corresponding public key authorized for `aura-talent`).
   - `VM_DEPLOY_KNOWN_HOSTS` (file variable with the pinned SSH host key; do not generate trust dynamically in CI).
   - The deploy job restricts the GitLab file variable `VM_DEPLOY_SSH_KEY` to mode `0600` before invoking OpenSSH. This is required with the shell executor when its temporary file is created with group-readable permissions.
4. Provision `/data/aura-talent/staging/.env` with unique staging-only credentials and the variables used in `docker-compose.staging.yml`: `STAGING_POSTGRES_DB`, `STAGING_POSTGRES_USER`, `STAGING_POSTGRES_PASSWORD`, `STAGING_DATABASE_URL`, `STAGING_JWT_SECRET`, `STAGING_BOOTSTRAP_ADMIN_PASSWORD`, and `STAGING_BOOTSTRAP_ADMIN_IF_EMPTY=true`. The bootstrap admin password is required for manual browser testing of a fresh staging DB. `STAGING_DATABASE_URL` must address host `postgres` on the staging Compose network. Never reuse production secrets.
5. Point `staging.aura.com` DNS to the VM and verify it resolves there. Verify the VM already has SSH client, Docker Compose, `openssl`, and `curl`. The deployment connection is key-only and the application deployment uses only account `aura-talent`.
6. Configure the GitLab `production` environment as protected if the GitLab tier supports protected environments. Regardless, the YAML keeps production manual and requires staging success.

## Verification coverage

The `verify` job runs TypeScript checking (`pnpm run lint`), frontend build, and tests that do not require a PostgreSQL instance or pre-existing business rows. Six existing DB-dependent suites (`accountTypeInvariant`, `auditLog`, `databaseConstraints`, `databaseTransactions`, `financialRetention`, `timezone`) are excluded because they need seeded records or a live schema and may mutate data. They are not run against either production or staging. A separate disposable seeded-database test harness is a follow-up before claiming full database integration coverage.

The deploy script validates the target, commit SHA, staging environment file, wildcard certificate SAN (read through the active Nginx container because the VM deploy account does not have direct host-file access), Compose configuration, staging HTTP health, and local HTTPS virtual-host routing. Production deployment additionally refuses to proceed unless the exact staged image for that full commit SHA exists locally.

## Rollback

- Staging: redeploy a previous successful pipeline commit; staging DB and uploads are retained.
- Production: run the manual production job for a previously staged commit. This restores the application image/code but does not reverse schema changes; database rollback must be planned separately. Never remove production volumes as part of application rollback.

## Current rollout status

On 2026-11-10, pipeline `3050392360` for commit `153a748` passed `verify` and `deploy_staging`. The follow-up documentation commit `5b7cad0` passed those jobs in pipeline `3050411864`. Both `staging.aura.com` and `aura.com` displayed the login page after the staging deployment; VM-local HTTPS checks returned 200 and staging/production app and PostgreSQL containers were healthy. These were unauthenticated smoke checks, not full business-flow tests. `deploy_production` remained manual and was not run; production application code is therefore not yet confirmed to match the staged commit.

For the operator's commit/Merge Request/release checklist, use [Production code deployment](./PRODUCTION_CODE_DEPLOYMENT.md). Historical CI failures and their fixes remain in [project state](./project-state.md) and [changelog](./changes/CHANGELOG.md).
