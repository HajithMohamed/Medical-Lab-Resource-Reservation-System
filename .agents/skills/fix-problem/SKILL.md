---
name: fix-problem
description: Finds and fixes the root cause of a failed CI run, a failing check or a bug, and adds a test that proves the fix. Use when the developer says CI failed, pastes an error or log, reports a bug, or pastes the FIX PROMPT.
---

# Fix a problem

## 1. Get the facts

- If the developer pasted an error or log, start from that.
- If CI failed and the GitHub CLI is installed, you may read (never change) the run:
  `gh run list --branch <current branch> --limit 3` then `gh run view <run id> --log-failed`.
- Reproduce it locally with the same command (`npm run check`, `npm run build`, or the failing
  test file with `npx vitest run <path>`).

## 2. Explain before you change anything

In two or three plain-English sentences: what failed, why, and which file is responsible. If you
are not sure, say what you would check next and ask.

## 3. Fix

- Make the smallest change that follows AGENTS.md. Do not refactor nearby code.
- Never make the check pass by weakening it (no `@ts-ignore`, `eslint-disable`, `any`, skipped
  tests or changed config).
- If the fix needs a schema change, use the `safe-migration` skill.

## 4. Prove it

- Add or update a test that fails without the fix and passes with it (unit test for pure
  functions, integration test for services).
- Use the `verify-work` skill.

## 5. Commit and report

- Commit on the current branch: `fix(<scope>): <what was fixed>`.
- Report: the cause, the fix, the new test, and the check results.
