# Instructions for Pi and other coding agents

## Product and design contracts
- Read `docs/PROJECT_SPEC.md` and `docs/ROADMAP.md` before substantial changes.
- Work on ONE roadmap slice or focused task at a time. Tell the user the plan in <= 5 bullets before editing.
- Read relevant existing files, implement the smallest coherent change, then test.
- Never commit, push, change package versions, install agent packages, or make major architecture decisions without user approval.
- Never claim a feature or proof is finished unless the relevant checks actually ran.
- Always summarize edited files, test results, assumptions, and next step in plain language.

## Architecture
- `packages/sim-core`: pure TypeScript, NO DOM/React, numerical state in Float64Array.
- `packages/web`: Vite/React/Canvas2D; browser dependencies stay here.
- World/game rules should depend on `sim-core`; UI should depend on world/game rules, not vice versa.
- The Lean + Mathlib proofs live in a completely separate `psi-zoo-proofs` Git repo.
- Units in physics code: hbar = m = 1. Choose and document grid spacing and boundary conditions.
- The browser currently contains a **Slice 0 placeholder animation**. Do not describe it as Schrödinger evolution.

## Scientific correctness checks
- Add/adjust tests before introducing new physics claims; numerical tolerance must be justified.
- Crank–Nicolson for a Hermitian finite-difference H preserves the discrete norm up to floating-point error; specify boundary conventions.
- Test norm, static-H energy, and free Gaussian packet width against an independently specified analytic convention.
- The initial handover simplifies some physics. A Gaussian localization filter is a finite-resolution measurement update, NOT an exact orthogonal projection. Distinguish these in docs and proofs.
- Two independent single-particle densities do NOT automatically interfere: interference needs coherent amplitudes.
- Entanglement needs a joint tensor-product state; do not fake it by correlating independent random variables.
- Never use scripted visual movements as evidence of validated quantum dynamics.

## Checks before declaring a task done
```bash
npm run test
npm run typecheck
npm run build
```
- Check `git diff` before proposing a commit.
- No unasked destructive shell commands. Never commit API keys, auth files, or secrets.
- If a check fails, report the exact error and what you tried.
