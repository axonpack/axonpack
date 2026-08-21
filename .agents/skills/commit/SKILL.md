---
name: commit
description: Create a git commit with a simple, humanized message and no Co-Authored-By trailer. Trigger on "commit", "commit this", "commit changes".
---

# Commit

**Only run this when the user asks for a commit in so many words.** Never as the tail end of writing
code: finishing a change, passing the gates, and reporting what changed is where a turn stops.
"implement X", "continue", "do it" and "next" are not requests to commit. The user reads the working
tree before it becomes history, and committing unasked takes that away.

1. Check `git status` (no `-uall`), `git diff`, and `git log --oneline -10` to learn this repo's own commit style.
2. Stage only the relevant files by name — never `-A`, `.`, or `-u`, even scoped to a directory, because each of those also stages whatever you did not mean to. Skip anything that looks like a secret.
3. Write a short, plain, human-sounding message matching the repo's existing convention (type/scope format if that's what the log shows, plain subject otherwise). No emoji, no filler body, **no `Co-Authored-By` trailer or AI attribution**.
4. Commit via heredoc, then confirm with `git status`. Don't `--amend`, `--no-verify`, or push unless asked.
