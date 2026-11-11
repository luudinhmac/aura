# Agent Development Rules

## Implementation
- Analyze the relevant code before making changes.
- Follow existing architecture and coding conventions.
- Avoid unrelated modifications.

## Validation
After implementing a feature:
1. Run lint and type checks.
2. Run relevant unit tests.
3. Start the application if necessary.
4. Use Playwright MCP to open the application.
5. Inspect the DOM and accessibility tree.
6. Test user interactions and forms.
7. Check browser console errors.
8. Fix detected issues and retest.

## Completion
- Do not consider a feature complete based only on a successful build.
- Verify the actual behavior in the browser.
- Report tests passed, failed, or blocked.
- Never claim tests passed without executing them.

## System Capability Record
- The canonical inventory of implemented capabilities and business rules is [`docs/system-capabilities.md`](docs/system-capabilities.md).
- Every code or feature change must update that file in the same change when behavior, permissions, APIs, data models, validation, or user workflows are affected.
- Also update [`docs/project-state.md`](docs/project-state.md) for status/decision changes and [`docs/changes/CHANGELOG.md`](docs/changes/CHANGELOG.md) for the dated change entry.
