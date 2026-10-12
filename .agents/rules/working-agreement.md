---
trigger: always_on
description: How an Antigravity agent runs a task in this repository. Plan first, stay in scope, stop before risky commands, and finish only when the checks pass.
---

# Working agreement for Antigravity agents

AGENTS.md at the repository root is the project rulebook and always applies. This file adds only
how to run a task in Antigravity. If the two ever disagree, AGENTS.md wins.

## 1. Where the task comes from

- The developer pastes one numbered prompt per chat (P1 to P13, U1 to U11, O1 to O4, or a FIX
  PROMPT). That prompt is the task. Do nothing it does not ask for.
- A feature prompt can come with a UI addendum (U3 to U10) in the same message. The addendum
  decides layout, look and wording. The feature prompt decides data, rules, permissions and tests.
- If the prompt conflicts with AGENTS.md or prisma/schema.prisma, stop and ask. Do not guess.

## 2. Plan before code

- For every numbered prompt, follow the `start-prompt` skill: check the branch, write an
  implementation plan, and wait for the developer to approve it before changing files.
- Small follow-up questions in the same chat do not need a new plan.

## 3. Stay in scope

- No extra features, refactors, renames or dependency upgrades that the prompt did not ask for.
  Put good ideas under "Left out" in the final report instead.
- Keep the versions pinned in AGENTS.md section 2.

## 4. Stop and ask the developer instead of running

- Any git command that changes branches or the remote: push, pull, fetch, checkout, switch,
  merge, rebase, reset, branch -d or -D, stash, tag, config.
- `npm audit fix --force`, `npm install prisma@latest`, or any Prisma package other than 7.10.0.
- `npx prisma migrate reset`, `npm run db:reset`, or anything that deletes database data.
  Never set PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION.
- Deleting files outside `.next`, `coverage` and `node_modules`.

Allowed without asking: `git status`, `git diff`, `git log`, `git branch --show-current`,
`git add` and `git commit` on the current feature branch.

## 5. Never edit unless the developer asks

`.env.local`, `.env.production`, migrations already merged into develop, `src/generated/`,
`AGENTS.md`, and everything under `.agents/`.

## 6. Done means checked

- A task is done only when the `verify-work` skill passes (`npm run check` and `npm run build`).
- Never make checks pass by weakening them: no `@ts-ignore`, no `eslint-disable`, no `any`, no
  skipped or deleted tests, no changes to lint, TypeScript or Prettier settings.
- Any change to prisma/schema.prisma or prisma/migrations follows the `safe-migration` skill.

## 7. Talking to the developer

- Use simple, plain English and short sentences. Explain a decision in one or two sentences.
- When blocked, ask one clear question with the options you see.
- End every task with the report in AGENTS.md section 11.
