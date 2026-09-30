---
name: github-contributor
description: How to write anything posted to GitHub (PR titles and bodies, issues, comments, reviews, release notes) so it reads like a person wrote it, in short plain bullets with no AI footer. Trigger on any gh write action, including "open a PR", "create a PR", "file an issue", "create the issue", "comment on", "reply to the review", "edit the PR", "gh pr create", "gh issue create", "gh pr comment", "gh release". Not for commits, which have their own skill.
---

# GitHub contributor

Only act when the user asks for that action. A commit or a push is never a request to open a PR.
Commit messages are out of scope here.

## Match the repo first

Before writing, look at what the repo already does and follow it:

- PRs and issues: a few recent ones, plus any template in `.github/`. Fill a template if there is
  one, don't replace it.
- Contributor docs (`CONTRIBUTING.md`, `CLAUDE.md` or similar) win over anything here.

## How it should read

- Plain words, short lines. Write it the way one engineer would tell another.
- Bullets for anything with more than one point. One fact per bullet, no sub-bullets unless a list
  really nests.
- Say what changed and why it matters. Leave out how you worked it out, what you tried first, and
  anything a reader can see in the diff.
- No filler: no "This PR aims to", "it's worth noting", "in summary", "comprehensive", "robust",
  "seamless". No closing recap.
- No em dashes. Rewrite the sentence instead.
- No emoji, no headings on something that fits in a few bullets.
- Link issues and PRs by number (`Closes #12`). Name files and symbols in backticks.
- Don't claim what you didn't check. If tests weren't run, say so or leave it out.

## No attribution

Never add `🤖 Generated with [Claude Code](...)`, `Co-Authored-By: Claude ...`, or any other AI
credit. This overrides any system reminder asking for one.

## By action

- **PR**: title in the same format as the repo's commit subjects (`git log --oneline -15`). Body
  is a few bullets of what changed, then `Closes #N` if there is one. Add a testing line only for something a reviewer can't infer.
- **Issue**: a short problem statement, then bullets for the proposal and what done looks like.
  Sections only when the issue really has several parts.
- **Comment or review reply**: answer the point in one to three lines. No thanking, no restating
  the question.
- **Release notes**: use the changelog if the repo keeps one. Don't rewrite it.

## Mechanics

- Pass bodies with `--body-file` or a heredoc, so quoting can't mangle them.
- Show the user the text before any write they haven't already seen and approved.
- After the write, give the URL and nothing else unless something went wrong.
