---
name: start-prompt
description: Runs one numbered build prompt (P1-P13, U1-U11, O1-O4) from start to finish in this repository. Use when the developer pastes a build prompt, a feature prompt with its UI addendum, or says "start prompt", "run P5" or similar.
---

# Start a build prompt

Follow these steps in order. Do not skip the plan.

## 1. Check where you are

1. Run `git branch --show-current`.
2. If it prints `main` or `develop`, stop. Tell the developer which branch to create (the prompt
   names it, for example `feature/auth`) and wait. Do not create or switch branches yourself.
3. If the prompt names a branch and the current branch is different, stop and ask.
4. Run `git status`. If there are uncommitted changes the prompt did not create, stop and ask.

## 2. Read before you plan

- AGENTS.md (already loaded as a rule) and every file the prompt tells you to read.
- From U1 on: docs/design-system.md and docs/design-reference.html for any UI work.
- For a Next.js API you are not sure about: the guide in `node_modules/next/dist/docs/`.
- The existing code the task touches. Reuse what exists (helpers in src/lib, components in
  src/components) instead of writing a second version.

## 3. Write the implementation plan, then wait

Create a plan with these headings and ask the developer to approve it:

1. **Goal**: one or two sentences in simple English.
2. **Files**: each file you will create or change, with one line on why.
3. **Rules touched**: which AGENTS.md rules and business rules this task must respect.
4. **Database**: any schema or migration change (if yes, you will use the `safe-migration` skill).
5. **Tests**: the tests you will add, including the "not allowed" cases.
6. **Commands**: the commands you expect to run.
7. **Questions**: anything unclear. If something is unclear, ask now instead of guessing.

Do not change any file until the developer approves the plan.

## 4. Build in small steps

- Work through the prompt's numbered steps in order.
- After each meaningful step, commit on the current branch with a Conventional Commit message
  (`feat(auth): ...`, `test(bookings): ...`). Use the commit messages the prompt suggests.
- If you hit a problem the prompt did not expect, stop and explain it. Do not work around a rule.

## 5. Verify

Use the `verify-work` skill. Fix problems until it passes. Do not report the task as done before
it passes.

## 6. Report

Finish with the report from AGENTS.md section 11:

- Files changed (grouped: pages, actions, services, lib, components, tests, docs).
- How to test the feature by hand, as numbered clicks in the browser, with the demo user to sign
  in as.
- Commands run and their results.
- Anything unsure or left out.

Then add a short section **"Explain it in an interview"**: three to five plain-English sentences
on what was built and why, which the developer can say in the demo video.
