# didit-demo-center

This repository does not yet have repo-specific Codex instructions. Follow the Didit workspace conventions and the mandatory Linear task rules below.

## Codex Linear Tasks

These rules are hard-stop gates for any task launched from Linear through Codex Cloud, a `@codex` mention, or a delegated Codex issue. They are not advisory. If any required gate cannot be completed, stop and report the blocker instead of making a best-effort code change.

### Required preflight before code edits

1. **Read the full Linear issue.** Use the `<LINEAR_CONTEXT>` block when present, including title, description, labels, attachments, and comments. If only the title or mention comment is visible, fetch the issue with the Linear connector. Do not code from the title alone.
2. **State the routing decision.** Identify the intended repo/environment from the issue body, labels, comments, and paths. If the issue/comment asks for one repo but Codex opened another, stop and report the routing mismatch unless the issue clearly requires the opened repo.
3. **Session UUIDs require evidence first.** If the issue contains a Didit verification/session UUID, do not edit code until you have inspected that session and attempted to download the relevant artifacts. Use `scripts/staff/pull_problematic_images.py` when available, or the `didit-staff-cli` skill when not. If `DIDIT_STAFF_API_KEY` or staff tooling is unavailable, stop and report that blocker. Synthetic unit tests alone are not an acceptable reproduction for session-linked bugs.
4. **Reproduce before fixing.** Add or run the failing test/fixture before implementation. For OCR/session bugs, use the downloaded image/artifact or explain why it could not be obtained.

### Required completion gate

1. **Create the PR by default.** Do not finish with only a local diff, task diff, or "Create PR" button. Push a branch and open a GitHub PR against the repo's normal base branch unless the user explicitly requested investigation only.
2. **Run and watch CI.** Run targeted local checks, open the PR, then inspect GitHub checks. If CI fails, keep fixing and pushing until green or until a concrete external blocker is documented.
3. **Preserve required binary artifacts.** OCR/image fixtures and review artifacts that prove the regression must stay in the PR. If Codex Cloud cannot create a PR because binary files are present, use the task menu's `Copy git apply` bundle in a clean checkout, commit the binaries, push, and open the PR manually.
4. **Final update must include evidence.** Report the Linear issue ID/link, PR link, CI status, session IDs inspected, artifact/fixture paths, tests run, and any blocker. If any of these is missing, the task is not done.
