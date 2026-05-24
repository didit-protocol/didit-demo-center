# didit-demo-center

This repository does not yet have repo-specific Codex instructions. Follow the Didit workspace conventions and the mandatory Linear task rules below.

## Codex Linear Tasks

These rules are mandatory for any task launched from Linear through Codex Cloud, a `@codex` mention, or a delegated Codex issue.

1. **Read the full Linear issue first.** Treat Linear as the source of truth. Before coding, inspect the issue title, description, labels, linked PRs, attachments, and comments. Do not rely only on the Codex task title or the mention comment. If the full issue body is missing from the Codex task context, fetch it with the Linear connector or stop and report that the required issue context is unavailable.
2. **Route to the right repo and environment.** Confirm the target repo from the issue body, labels, paths, and affected product area. If the issue spans multiple repos, call that out and either use the explicitly requested repo first or split the work into coordinated PRs.
3. **Use production evidence when a session ID appears.** If the issue contains a Didit verification/session UUID, inspect the session before changing code. Use the staff CLI or the `didit-staff-cli` skill with `DIDIT_STAFF_API_KEY`, download the relevant images/artifacts, and reproduce the problem with a targeted test or fixture.
4. **Create a PR by default.** A task is not complete until the implementation is committed, pushed to a branch, and a GitHub PR exists against the repo's normal base branch, unless the user explicitly asked for investigation only.
5. **Wait for CI and keep fixing.** Run the strongest practical local checks, then watch the PR checks. If CI fails, continue debugging and push follow-up fixes until checks pass or there is a concrete external blocker.
6. **Keep binary artifacts when they are part of the fix.** For OCR/image tasks, fixtures, review images, and generated artifacts that explain or lock the regression should stay in the PR. If Codex Cloud cannot create the PR because the diff contains binary files, use the task's `Copy git apply` bundle in a clean checkout, commit the binary artifacts, push the branch, and open the PR manually.
7. **Report evidence, not just edits.** The final Linear/GitHub update must include the PR link, tests run, CI status, session IDs inspected, downloaded artifacts or fixture paths, and any remaining risk.
