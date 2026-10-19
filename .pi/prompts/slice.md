---
description: Implement one Psi Zoo roadmap slice using tests-first development
argument-hint: "<slice number or task>"
---
Read AGENTS.md, docs/PROJECT_SPEC.md, docs/ROADMAP.md, and relevant code.
Work only on: $ARGUMENTS.

First reply with a short plan (<= 5 bullets) and key physics assumptions.
Then implement in small reviewable changes, preferring tests that fail before
adding implementation. Run `npm run test`, `npm run typecheck`, `npm run build`.
Show results and `git diff --stat`. Do not commit or push without approval.
Explain one important design decision so I learn the workflow.
