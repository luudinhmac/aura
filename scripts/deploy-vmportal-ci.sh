#!/usr/bin/env bash
set -Eeuo pipefail

target="${1:-}"
commit_sha="${2:-}"
pipeline_id="${3:-}"

if [[ ! "$commit_sha" =~ ^[0-9a-f]{40}$ || ! "$pipeline_id" =~ ^[0-9]+$ ]]; then
  echo "Invalid commit or pipeline identifier" >&2
  exit 2
fi

short_sha="${commit_sha:0:7}"
incoming="/data/aura-talent/incoming/${commit_sha}-${pipeline_id}"
shared_nginx_conf="/data/aura-talent/shared/nginx/nginx.conf"

case "$target" in
  staging)
    release_root="/data/aura-talent/staging/releases"
    release_dir="$release_root/$short_sha"
    env_file="/data/aura-talent/staging/.env"
    compose_file="docker-compose.staging.yml"
    project_name="aura-talent-staging"
    ;;
  production)
    release_root="/data/aura-talent/releases"
    release_dir="$release_root/$short_sha"
    env_file="/data/aura-talent/.env"
    compose_file="docker-compose.yml"
    project_name="aura-talent"
    ;;
  *)
    echo "Target must be staging or production" >&2
    exit 2
    ;;
esac

if [[ ! -f "$env_file" ]]; then
  echo "Required environment file is missing: $env_file" >&2
  exit 1
fi

mkdir -p "$release_root"
if [[ -d "$release_dir" ]]; then
  if [[ ! -f "$release_dir/.deploy-commit" || "$(<"$release_dir/.deploy-commit")" != "$commit_sha" ]]; then
    echo "Release path exists but does not match this commit: $release_dir" >&2
    exit 1
  fi
  rm -rf -- "$incoming"
else
  if [[ ! -d "$incoming" || ! -f "$incoming/$compose_file" ]]; then
    echo "Incoming release archive is incomplete" >&2
    exit 1
  fi
  printf '%s\n' "$commit_sha" > "$incoming/.deploy-commit"
  mv -- "$incoming" "$release_dir"
fi

export AURA_IMAGE_TAG="$commit_sha"
compose=(docker compose --project-name "$project_name" --env-file "$env_file" --file "$release_dir/$compose_file")

if [[ "$target" == "staging" ]]; then
  cert_tmp="$(mktemp)"
  validation_container=""
  cleanup_staging_preflight() {
    rm -f -- "$cert_tmp"
    if [[ -n "$validation_container" ]]; then
      docker rm -f "$validation_container" >/dev/null 2>&1 || true
    fi
  }
  trap cleanup_staging_preflight EXIT
  if ! docker exec aura-nginx sh -c 'test -r /etc/nginx/certs/aura.com.crt && test -r /etc/nginx/private/aura.com.key'; then
    echo "The active Nginx container cannot read the mounted certificate/key" >&2
    exit 1
  fi
  if ! docker cp aura-nginx:/etc/nginx/certs/aura.com.crt "$cert_tmp" >/dev/null || ! openssl x509 -in "$cert_tmp" -noout -ext subjectAltName | grep -Fq 'DNS:*.aura.com'; then
    echo "The mounted certificate is missing or does not cover *.aura.com" >&2
    exit 1
  fi

  for required in STAGING_POSTGRES_DB STAGING_POSTGRES_USER STAGING_POSTGRES_PASSWORD STAGING_DATABASE_URL STAGING_JWT_SECRET STAGING_BOOTSTRAP_ADMIN_PASSWORD; do
    if ! grep -Eq "^${required}=.+$" "$env_file"; then
      echo "Staging env file is missing a required value: $required" >&2
      exit 1
    fi
  done
  if ! grep -Eq '^STAGING_BOOTSTRAP_ADMIN_IF_EMPTY=true$' "$env_file"; then
    echo "Staging env must enable one-time admin bootstrap for its fresh database" >&2
    exit 1
  fi
  staging_database_url="$(grep -E '^STAGING_DATABASE_URL=' "$env_file" | tail -n 1 | cut -d= -f2-)"
  if [[ ! "$staging_database_url" =~ ^postgres(ql)?://[^@]+@postgres(:[0-9]+)?/ ]]; then
    echo "STAGING_DATABASE_URL must use the isolated Compose service host 'postgres'" >&2
    exit 1
  fi

  "${compose[@]}" config --quiet
  "${compose[@]}" up -d --build --remove-orphans

  healthy=0
  for _ in $(seq 1 60); do
    if curl --fail --silent --show-error http://127.0.0.1:13001/ >/dev/null 2>&1; then
      healthy=1
      break
    fi
    sleep 2
  done
  if [[ "$healthy" != 1 ]]; then
    "${compose[@]}" logs --no-color --tail=100 app migrate >&2 || true
    echo "Staging app did not become healthy on 127.0.0.1:13001" >&2
    exit 1
  fi

  # The config resolves both production app and staging-app at startup.
  # Validate it on both real Docker networks before changing the live Nginx.
  validation_container="aura-nginx-preflight-${pipeline_id}"
  docker run --rm -d --name "$validation_container" \
    --network aura-talent_aura-network \
    -v "$release_dir/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
    -v "/opt/aura-ca/certs:/etc/nginx/certs:ro" \
    -v "/opt/aura-ca/private:/etc/nginx/private:ro" \
    nginx:alpine sleep 600 >/dev/null
  docker network connect aura-talent-staging_staging-network "$validation_container"
  docker exec "$validation_container" nginx -t
  docker rm -f "$validation_container" >/dev/null
  validation_container=""

  mkdir -p "$(dirname "$shared_nginx_conf")"

  active_nginx_conf="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/etc/nginx/nginx.conf"}}{{.Source}}{{end}}{{end}}' aura-nginx)"
  if [[ "$active_nginx_conf" == "$shared_nginx_conf" ]]; then
    backup="${shared_nginx_conf}.previous-${pipeline_id}"
    cp -- "$shared_nginx_conf" "$backup"
    cat "$release_dir/nginx/nginx.conf" > "$shared_nginx_conf"
    if ! docker exec aura-nginx nginx -t; then
      cat "$backup" > "$shared_nginx_conf"
      rm -f -- "$backup"
      exit 1
    fi
    docker exec aura-nginx nginx -s reload
    rm -f -- "$backup"
  else
    if [[ -e "$shared_nginx_conf" ]] && ! grep -Fq 'Managed by Aura Talent GitLab CI/CD' "$shared_nginx_conf"; then
      echo "Refusing to replace an existing unmanaged Nginx config: $shared_nginx_conf" >&2
      exit 1
    fi
    if [[ ! -e "$shared_nginx_conf" ]]; then
      cp -- "$release_dir/nginx/nginx.conf" "$shared_nginx_conf"
    else
      cat "$release_dir/nginx/nginx.conf" > "$shared_nginx_conf"
    fi
    production_compose=(docker compose --project-name aura-talent --env-file /data/aura-talent/.env --file "$release_dir/docker-compose.yml")
    "${production_compose[@]}" config --quiet
    "${production_compose[@]}" up -d --no-deps nginx
    docker exec aura-nginx nginx -t
  fi

  curl --fail --silent --show-error --insecure \
    --resolve staging.aura.com:443:127.0.0.1 https://staging.aura.com/ >/dev/null
else
  if ! docker image inspect "aura-talent:$commit_sha" >/dev/null 2>&1; then
    echo "The staged image aura-talent:$commit_sha is not present; refusing production rebuild" >&2
    exit 1
  fi
  "${compose[@]}" config --quiet
  "${compose[@]}" up -d --no-build
  curl --fail --silent --show-error --insecure \
    --resolve aura.com:443:127.0.0.1 https://aura.com/ >/dev/null
fi

echo "Deployed $target release $commit_sha"
