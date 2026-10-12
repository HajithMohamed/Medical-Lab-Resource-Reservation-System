---
name: verify-work
description: Checks that the current changes are really finished by running the project's lint, type, format, test and build commands and fixing failures at the root cause. Use before saying a task is done, before a commit that ends a prompt, or when the developer says "verify", "run the checks" or "is it working".
---

# Verify the work

## 1. Make sure the database is running (from P2 on)

- Run `docker compose ps`. If the `db` service is not running or not healthy, run
  `npm run db:up` and wait until it is healthy.
- If Docker is not available, tell the developer and ask them to start Docker Desktop.

## 2. Run the checks in this order

1. `npm run check` (lint, typecheck, format check and tests).
2. `npm run build`.

If a script does not exist yet (for example during P1, before it is added), run the ones that
exist and say which ones were missing.

## 3. If something fails

1. Read the first real error, not the last line.
2. Explain the root cause in one or two sentences.
3. Fix the cause with the smallest change that follows AGENTS.md.
   - Format check failed: run `npm run format`, then check again.
   - A test failed: decide whether the code or the test is wrong. Never delete, skip or loosen a
     test just to make it pass.
4. Run the failed command again, then the full list again.
5. After three failed attempts on the same error, stop and report what you tried.

Never add `@ts-ignore`, `eslint-disable`, `any`, or change lint, TypeScript, Prettier, Vitest or
CI settings to make a check pass.

## 4. Check what will be committed

Run `git status` and make sure none of these appear: `.env.local`, `.env.*.local`,
`.env.production`, `src/generated/`, `coverage/`, `.next/`. If one does, stop and tell the
developer.

## 5. Check the page (UI changes only)

If the task changed a page and the developer has `npm run dev` running, use the Next.js MCP tools
(`get_errors`, `compile_route`) when they are available, and open the page in the browser at about
375px and 1280px wide. Report anything that looks broken. Ask before opening the browser.

## 6. Report

List each command with PASS or FAIL. Only say "done" when everything passes.
