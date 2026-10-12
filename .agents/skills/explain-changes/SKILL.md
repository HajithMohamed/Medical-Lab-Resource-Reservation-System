---
name: explain-changes
description: Explains the changes on the current branch in simple English so the developer can understand every file and defend it in the demo video and an interview. Use when the developer asks "explain this", "what did you change", "help me understand" or "prepare me for the interview".
---

# Explain the changes

This skill only reads and explains. Do not change any file.

## 1. Collect the changes

- `git branch --show-current`
- `git log --oneline develop..HEAD`
- `git diff --stat develop...HEAD`
- Then read the changed files.

## 2. Explain, in this order

1. **The big picture**: three to five sentences. What can a user do now that they could not do
   before? Which problem from the README (P1 to P5) does it help with?
2. **The request path**: follow one real action through the layers, for example
   "Kasun clicks Book: page -> action -> service -> database rule -> message".
3. **File by file**: for each changed file, one or two lines on what it does and why it is in
   that folder (app, actions, services, lib, components, config, prisma, tests).
4. **Decisions**: each technical choice in this branch, the simpler or more common option we did
   not take, and why.
5. **How it stays safe**: permissions checked, input validated with zod, database constraints,
   and the tests that prove it.

## 3. Interview practice

Finish with five likely interview questions about this branch, each with a short model answer
in simple English. Include at least one question on a trade-off and one on what could go wrong.

Use simple words and short sentences. Explain any technical term the first time you use it.
