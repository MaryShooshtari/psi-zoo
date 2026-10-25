# Vertical-slice roadmap

## Completed foundation: Slice 0 — scaffold
- npm workspaces for `sim-core` and `web`, React + Vite + Canvas2D
- typed numerical grid, CI workflow, and agent instructions
- The original placeholder has been replaced by numerical evolution.

## Slice 1 — a Gaussian that lives
- Implemented: grid/inner-product helpers with discrete norm including `dx`,
  finite-difference Hamiltonian, interior Dirichlet Crank–Nicolson evolution,
  and complex tridiagonal Thomas solve.
- Validated: probability norm, static-potential energy, free-Gaussian mean and
  width, and spatial/temporal convergence before boundary reflections.
  See [measured results](FREE_GAUSSIAN_VALIDATION.md).
- Browser: actual evolved |psi|^2 and state-derived diagnostics, with tested
  fixed-step playback controller. No per-step normalization.
- The subsequent Slice 2 browser acceptance and README GIF cover the evolved
  density display; see the Slice 2 validation record below.
- [Lab-notebook content](notebook/README.md) connects the simulation to the
  completed exact CN proofs. The CN entry remains documentation-only; Slice 3
  adds a browser-rendered Observer entry.

## Slice 2 — touch the world
- Phase 1 implemented: pure bounded Gaussian barriers, idempotent stamps, exact
  interpolated path painting, validation and Hamiltonian/stepper tests.
- Phase 2 accepted: 148 automated tests and user-reported 14/14 manual browser
  checks; pointer painting while paused/running, explicit brush
  controls, independently scaled potential overlay, controller-owned terrain,
  and tested pointer/controller lifecycle. Reset preserves terrain; Clear Terrain
  removes barriers without resetting the wavefunction or time.
- See [API, interaction contracts, and manual browser checklist](POTENTIAL_LANDSCAPES.md).
- Phase 3A accepted: 173 tests and user-reported browser checks; optional core
  Gaussian momentum, reset-applied browser momentum selection, signed free evolution
  with finite-difference/CN velocity references, and norm/static-H energy tests.
  See [directed packet validation](DIRECTED_GAUSSIAN_VALIDATION.md).
- Phase 3B validated: 193 automated tests, typecheck/build, numerical report, and
  user-reported 8/8 browser acceptance checks. Pure disjoint probability regions,
  deterministic free/reflecting/partial Gaussian-barrier experiments, sampled
  accounting/conservation, spatial and full-state temporal convergence, isolated
  separated-packet window, Gaussian over-barrier-tail bound, and independent
  packet-weighted stationary tunnelling benchmark. The browser loads that exact
  large-domain preset and withholds R/T until separation; edits invalidate the
  quantitative interpretation without removing painting/free exploration.
- Authentic [scattering GIF](media/scattering.gif) captured from the running Chrome
  simulation through t=44, with accelerated presentation only. See
  [results, limitations, browser acceptance and capture provenance](SCATTERING_VALIDATION.md).

## Current: Slice 3 — observer (functionally approved)
- Phase 3A: boundary-normalized Gaussian POVM probabilities, injected sampling,
  normalized phase-preserving update, and numerical measurement/CN tests.
- Phase 3B: Paint/Observe modes, seeded controller-owned RNG, sampled-position
  marker, resolution controls, keyboard observation, Reset and diagnostic handling.
- Phase 3C: Markdown/native-MathML Born-rule notebook, observation example,
  checked sharp-projection vs Gaussian distinction, and fixed square-root-spaced
  density display that includes every normalized grid peak without autoscaling.
- Validated: 232 automated tests, full typecheck/build and Chrome acceptance
  across all 12 requested items. Real-browser checking found and fixed a click
  isPrimary guard that synthetic tests had missed. Authentic screenshots and
  reproducible checks: [Slice 3 release validation](OBSERVER_VALIDATION.md).
- Functional definition of done met and approved: observe, re-spread, and read why.
  Authentic [observation GIF](media/observer.gif) now shows initial evolution,
  measurement/localization and re-spreading in the README. Final release checks
  pass; committing and pushing remain manual steps, with no automatic commit.

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
Exact coordinate projection is now present and checked in the companion;
its operator is not the app's finite-resolution Gaussian POVM. The Observer
entry links the checked source at a pinned commit. Gaussian POVM verification
and Bloch milestones remain separate work.
