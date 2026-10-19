# Vertical-slice roadmap

## Current: Slice 0 — scaffold (shipped in starter)
- npm workspaces for `sim-core` and `web`
- React + Vite + Canvas2D placeholder animated at a fixed physics timestep
- typed numerical grid and a smoke test, CI workflow, agent instructions
- IMPORTANT: placeholder animation is NOT quantum physics

## Next: Slice 1 — a Gaussian that lives
- Add grid/inner-product helpers with discrete norm including `dx`
- Implement finite-difference Hamiltonian, 1D Dirichlet boundary conditions,
  Crank–Nicolson solve with complex tridiagonal Thomas algorithm
- Add discrete norm test over many steps, static-potential energy test,
  and packet width vs analytic free-Gaussian solution under clearly defined
  initial-width convention and before boundary reflections
- Render |psi|^2, and optionally phase, from ACTUAL stepped data
- Ship with passing tests and a GIF/screenshot in README

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
Learn Lean basics. Then finite-dimensional projector lemmas, then a Cayley
transform unitarity proof. Cross-link only proven Lean code to notebook claims.
