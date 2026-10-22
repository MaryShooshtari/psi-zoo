# Vertical-slice roadmap

## Completed foundation: Slice 0 — scaffold
- npm workspaces for `sim-core` and `web`, React + Vite + Canvas2D
- typed numerical grid, CI workflow, and agent instructions
- The original placeholder has been replaced by numerical evolution.

## Current: Slice 1 — a Gaussian that lives
- Implemented: grid/inner-product helpers with discrete norm including `dx`,
  finite-difference Hamiltonian, interior Dirichlet Crank–Nicolson evolution,
  and complex tridiagonal Thomas solve.
- Validated: probability norm, static-potential energy, free-Gaussian mean and
  width, and spatial/temporal convergence before boundary reflections.
  See [measured results](FREE_GAUSSIAN_VALIDATION.md).
- Browser: actual evolved |psi|^2 and state-derived diagnostics, with tested
  fixed-step playback controller. No per-step normalization.
- Still pending: manual browser review and a README GIF/screenshot.
- [Lab-notebook content](notebook/README.md) now connects the simulation to the
  completed exact CN proofs. Content is Markdown only; no notebook renderer yet.

## Slice 2 — touch the world
Pointer-drag edits `V(x)`; show scattering and potential overlay; tests.

## Slice 3 — observer
Born probability, sampled finite-resolution localization update, re-spread;
notebook with correct distinction between a position projector and Gaussian mask.

## Slice 4 — creature
Qubit, Bloch inspection, mood coupling to V, interactions. Confirm scientific model.

## Slice 5+ — terrarium
2D ADI solver (validated); explore genuinely joint entangled states when ready.

## Parallel Lean lane
Completed in the [companion repository](https://github.com/MaryShooshtari/psi-zoo-proofs):
finite weighted norm and inner product, interior Hamiltonian Hermiticity,
conditional CN conservation, left-matrix invertibility and unique solvability,
explicit evolution, and Cayley-transform matrix unitarity.
[Notebook statements and source map](notebook/crank-nicolson.md) cross-link these
checked results. This is exact mathematics, not formal verification of TypeScript.
Further projector/measurement and Bloch milestones remain separate work.
