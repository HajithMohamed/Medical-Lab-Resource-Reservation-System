---
name: prepare-pr
description: Prepares a branch for its pull request into develop by checking the CHANGELOG and decision records and writing the PR title and description. Use when a prompt is finished and the developer says "prepare the PR", "write the PR" or "ready to merge".
---

# Prepare the pull request

You prepare everything. The developer pushes and opens the pull request; you never push.

## 1. Check the branch is ready

1. Use the `verify-work` skill. Stop if anything fails.
2. `git status` must be clean (everything committed).
3. `CHANGELOG.md` has an entry under "Unreleased" for this branch (Keep a Changelog style:
   Added, Changed, Fixed). Add it if missing and commit with `docs: update changelog`.
4. If the branch made a technical decision, `docs/decisions.md` has a short record for it
   (context, decision, why, trade-off). Add it if missing.

## 2. Write the pull request text

Read `.github/pull_request_template.md` if it exists and fill in every section. Otherwise use:

- **Title**: a Conventional Commit line, for example `feat(bookings): clash-free booking`.
  This becomes the squash-merge commit on develop.
- **What and why**: two or three sentences in simple English.
- **Problems addressed**: P1 to P5 from the README, where it applies.
- **How to test**: numbered steps with the demo user to sign in as.
- **Checks**: lint, typecheck, format, tests, build (all passing).
- **Screenshots**: say which page to screenshot, if the branch changed the UI.

## 3. Hand over

Show the title and description in the chat (do not save them inside the repository). Then give
the developer these steps to do themselves:

1. `git push -u origin <current branch>`
2. On GitHub: "Compare & pull request", base `develop`, paste the title and description.
3. Wait for the green CI tick, then "Squash and merge".
