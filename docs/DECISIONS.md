# Design decisions log

- **Architecture:** npm workspace; core math framework-independent; React only for UI.
- **MVP:** 1D Dirichlet-grid dynamics, fixed physics timestep, Canvas2D.
- **Physics units:** hbar = m = 1 (dimensionless).
- **Stepper:** Crank–Nicolson on a Hermitian discrete Hamiltonian.
- **Validation:** analytic free Gaussian, norm, and energy; test before visual feature.
- **Proofs:** separate Lean 4 / Mathlib repo to keep dependency caches separate.
- **Current status:** Slice 0 placeholder, not a Schrödinger solver.

When agent and user agree on a new meaningful choice, record it here with rationale.
