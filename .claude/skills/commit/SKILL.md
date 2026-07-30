---
name: commit
description: Create a git commit with a simple, humanized message and no Co-Authored-By trailer. Trigger on "commit", "commit this", "commit changes".
---

# Commit

1. Check `git status` (no `-uall`), `git diff`, and `git log --oneline -10` to learn this repo's own commit style.
2. Stage only the relevant files by name (never `-A`/`.`). Skip anything that looks like a secret.
3. Write a short, plain, human-sounding message matching the repo's existing convention (type/scope format if that's what the log shows, plain subject otherwise). No emoji, no filler body, **no `Co-Authored-By` trailer or AI attribution**.
4. Commit via heredoc, then confirm with `git status`. Don't `--amend`, `--no-verify`, or push unless asked.
