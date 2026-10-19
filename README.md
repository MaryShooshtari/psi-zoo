# Psi Zoo

A quantum-creature terrarium for learning, playing, and formally exploring
Schrödinger dynamics.

**Status:** Slice 0 scaffold. The small moving rectangle is a **placeholder**,
not a simulated wavefunction. See [the roadmap](docs/ROADMAP.md).

## Local development

Requires Node >=22.19 and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

## Validate changes

```bash
npm run test
npm run typecheck
npm run build
```

## Directory structure

- `packages/sim-core`: dependency-free mathematical data structures and stepper interface
- `packages/web`: React + Vite + Canvas renderer
- `docs/PROJECT_SPEC.md`: initial project handover
- `docs/ROADMAP.md`: vertical slices
- `AGENTS.md` and `.pi/prompts/`: coding agent guardrails and shortcuts

The separate companion repository `psi-zoo-proofs` will formalize selected
mathematical claims in Lean 4 + Mathlib. No Lean proof is claimed yet.
