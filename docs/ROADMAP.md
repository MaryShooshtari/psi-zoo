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

## Slice 3 — observer (functionally approved)
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
- 4A: pure qubit exponential and Bloch extraction; [validation](QUBIT_VALIDATION.md).
- 4B: owned Creature with midpoint mood drive through V; [validation](CREATURE_VALIDATION.md).
- 4C: atomic synchronized pair with explicit frozen-density contact interaction;
  [model, refinement and limitations](SOCIAL_INTERACTION_VALIDATION.md).
- 4D implemented for review: default two-creature browser scene, selection/Bloch
  inspection, reset-applied coupling, shared painting, selected observation, and
  retained single-packet presets/notebook. Final review: 296 tests, typecheck/build,
  DOM-free compilation, 22 pair/preset Chrome checks and 14 Observer regressions
  pass. Default-mood counterfactual verifies a modest real force effect; authentic
  [Slice 4 GIF](media/creatures.gif) now leads the README. Full manual device
  acceptance remains separate; no automatic commit, push, or next-slice work.
  [Controls and browser validation](TWO_CREATURE_BROWSER_VALIDATION.md).

## Slice 5A — two-dimensional quantum dynamics
- Implemented in isolation from the 1D world: 128×128 interior-point default,
  four zero Dirichlet boundaries, real static potentials, symmetric row/column
  Cayley splitting, Gaussian initialization and area-weighted observables.
- Validated: 314 total tests including all 296 unchanged baseline tests;
  <0.86% Gaussian width errors at t=2, <7e-13 norm drift over 10,000 steps,
  independent discrete-eigenmode phase, reversal and second-order full-state
  temporal convergence. Typecheck/build pass.
- Minimal Canvas2D heatmap and fixed-step Play/Pause/Reset with dimension switch.
  Real Chrome acceptance and retained 1D browser regressions pass. Human visual,
  device and accessibility acceptance remain separate.
- [Physics, results, performance and reproduction](TWO_DIMENSIONAL_VALIDATION.md).
- This historical 5A validation covers the numerical foundation; 5B extends
  only its terrain controls and rendering, as recorded below.

## Slice 5B — interactive 2D potential terrain
- Additive bounded positive/negative Gaussian tools, sign-independent erasing,
  fixed-distance residual strokes, and read-only terrain inspection/revisions.
- Live edits preserve the full complex state/time; the unchanged 5A stepper reads
  current V on its next whole step. Current energy includes external edits.
- Shared physical pointer/layer mapping, cached signed Canvas2D overlay,
  reproducible free/scattering/well presets, and distinct Reset/Clear/Load actions.
- 335 tests (all 314 baseline tests unchanged), typecheck/build, 21 2D Chrome
  checks and existing 22 creature/14 Observer browser regressions pass. Exact
  instantaneous energy relation, edited/static norm and static energy refinement
  are tested; 2D scattering region masses are not calibrated R/T coefficients.
- [Physics, controls, measurements and limitations](TERRAIN_2D_VALIDATION.md).
  Human visual/device/accessibility acceptance remains separate.

## Slice 5C — independent 2D creatures on shared terrain
- One to four independent area-normalized spatial states and unitary mood qubits;
  unchanged 2D Cayley solver and qubit math. Separate terrain/drive/social buffers,
  no self-interaction, stable-ID synchronous endpoint snapshots and atomic commit.
- Live mood drive and centroid-based Gaussian social feedback; no coherent
  cross-creature amplitudes, joint state or entanglement. Whole feedback scheme
  is generally first-order, not the frozen solver's second-order method.
- Existing playback/terrain/brush/overlay ownership reused; colored independent
  densities, selection/inspection, live toggles/ranges, deterministic presets,
  current-roster reset and bounded add/remove. 1D and Gaussian 2D remain available.
- 355 tests including all 335 unchanged baseline tests, typecheck/build, separate
  DOM-free world compile, 21 world + 21 Gaussian/terrain + 22 existing creature +
  14 Observer Chrome checks pass. Bit-identical uncoupled reference/order tests,
  norm drift, actual causal behavior and first-order full-state refinement checked.
- Default-grid performance measured for one/two/four; four-creature fixed-step
  playback can lag on tested hardware. Human visual/device/accessibility and
  sustained performance acceptance remains open. No automatic commit or push.
- [Model, controls, numerical evidence and benchmarks](WORLD_2D_VALIDATION.md).

## Slice 5D — entangled mood qubits
- Genuine four-complex-amplitude Bell states with authoritative pair ownership,
  reduced local density matrices, mixed Bloch vectors, purity and entropy.
- Exact analytical local X rotations, seeded Z/X Born measurements, sequential
  pair measurements and inspectable global preparation/measurement/release events.
- Registered pairs suspend all mood-dependent spatial drive and social terms;
  globally coordinated Measure & Release factors a product state or measures
  first. No spatial entanglement, spatial collapse or joint spatial solver.
- Existing terrain, independent 5C interactions, synchronous stepping and
  current-roster reset retained; safe deletion requires release. Friendship
  preset and keyboard-operable controls extend the existing world interface.
- 375 tests (355 existing unchanged), typecheck/build and DOM-free world compile;
  30 world, 21 Gaussian/terrain, 22 1D creature and 14 Observer Chrome checks pass.
  Algebraic no-signalling and exact spatial continuity are tested. Current
  performance is slower than the historical run; no real-time guarantee,
  including for two creatures. Human/device/accessibility acceptance remains open.
- [Model boundaries, evidence, benchmarks and review](ENTANGLEMENT_2D_VALIDATION.md).
  No dependency, solver, Lean, commit or push changes.

## Slice 5E.1 — visual foundation and fixed viewport (historical phase record)
- Pastel single-viewport shell, centered square 2D playground, default creature
  world, persistent playback/time/selection and retained standalone 1D/Gaussian
  demonstrations. No projection or onboarding yet; switching simulations still
  starts a fresh experiment, as before.
- Floating internally scrolling settings/help dialog preserves existing terrain,
  creature, mood, entanglement and diagnostic controls; keyboard focus, Escape,
  outside dismissal and compact-viewport access are browser-tested.
- 384 tests, typecheck/build, DOM-free world compile; 36 shell + 30 world +
  21 Gaussian/terrain + 22 legacy creature + 14 Observer Chrome checks pass.
- Final matched production interacting minute: 0.953 before / 0.992 after;
  no physics/controller changes. Earlier slow runs and limitations are recorded
  in [the phase validation report](TERRARIUM_SHELL_VALIDATION.md).
- Human visual/device/screen-reader acceptance remains separate. This records the
  5E.1 boundary; 5E.2 follows below. Later phases remain separately reviewed.

## Slice 5E.2 — unified 1D/2D view (historical phase record; sustained performance open)
- One authoritative 2D terrarium, main pressed-state 1D/2D view buttons, true
  dy-weighted x-marginal densities, common linear density scale, and separate
  unweighted **Average terrain along y**, not an effective 1D Hamiltonian.
- Presentation-only 450 ms mirror transition; live destination/current completion,
  cancelled rapid reversals, immediate reduced motion, preserved playback,
  amplitudes, moods, ownership, terrain, physical time and seeded randomness.
- Standalone 1D/Observer and Gaussian demonstrations remain explicitly separate
  under Advanced / Legacy. No solver, physics policy, package or Lean changes.
  28 protected source files are byte-identical; world/index additions are query/export only.
- 399 tests / 38 files, typecheck/build, DOM-free world and performance-entry
  compile checks; **146 Chrome checks** (23 projection + 36 shell + 87 existing)
  pass with no runtime/console errors.
- Final short paired 2D throughput: 1.00034 before / 0.99931 after. Sustained
  minute: **0.85453 before / 0.70253 after**. Sustained acceptance is **not closed**;
  earlier controls/candidates and adverse runs are retained. No universal real-time claim.
- [Implementation, mathematical conventions, evidence, usage and remaining review](PROJECTION_1D_VALIDATION.md).
  This records the 5E.2 boundary; 5E.3 follows below. Sustained acceptance is not retroactively closed.

## Retained: Slice 5E.3 — creatures, controls and interaction (historical review record)
- Deterministic Mochi/Pip/Lumi/Nori identities, density-anchored face/mood badges,
  selection halos and static registered-pair links. Body density/brightness and
  main view continuity remain unchanged. Split/empty/stale anchors are safe;
  blinks use no quantum randomness, new animation loop or React frame updates.
- Non-measuring primary cloud/hill selection with local-density/tie/tail policy,
  cancelled outside drags, and native-list alternative. Pair preparation,
  measurement, release and safe deletion retain the original commands/guards.
- One top-right internally navigated popover with all eight requested sections,
  Back/focus handling, compact persistent inspector, full diagnostics and retained
  legacy notebook/experiments. Friendly tool shortcuts do not stamp automatically.
- **408 tests / 39 files; 174 browser checks** (51 design/projection + 36 shell +
  87 existing) pass, as do typecheck/build and DOM-free/performance TypeScript
  checks. **37 protected source files are byte-identical**, including all sim-core
  and world implementation sources and numerical controllers. No physics,
  dependency, version, Lean, commit or push changes.
- Incremental median Canvas draw cost passes the bounded <2 ms budget: final
  two/four-creature deltas ~0.0/0.1 ms. Final same-build serial on/off throughput
  is 0.97503/0.99857. Earlier whole-source comparison is unfavorable
  (0.79311 before / 0.59937 after); **whole-app/sustained acceptance remains open**.
  The isolated budget and bounded successful run are not a universal FPS/parity claim.
- [Implementation, interaction policy, files, tests, performance and manual review](CREATURE_DESIGN_VALIDATION.md).
  This records the stop boundary before the separately authorized 5E.4 work below.

## Current: Slice 5E.4 — museum onboarding, science and notebook (implemented for review)
- Explicitly confirmed optional guide: real Play plus ≥20% computed width growth,
  actual same-world marginal view, return to 2D and actual positive terrain edit.
  Next/Back, Skip, Replay, reduced motion, native pointer and keyboard alternatives.
  Finish/Skip disposes the guide and restores one initial paused creature, clean
  2D terrain and time zero. Replay cancellation preserves the personal scene/RNG.
- Always-accessible contextual science and ten authored local notebook chapters,
  progressive Observe / Understand / Explore the mathematics, native MathML,
  internal chapter links, internal scrolling and modal keyboard focus handling.
  Specific pinned Lean sources distinguish exact model proofs from TypeScript,
  floating-point behavior, the split 2D solver and the game. Linked Lean build passed.
- **421 tests / 40 files; 229 nonduplicated browser checks** (252 executions),
  typecheck/build, DOM-free world/performance compiles passed. **36 protected
  numerical/world/input/render-support files are byte-identical**; no solver,
  qubit, probability, RNG, grid, dt, normalization, ownership or step-policy changes.
  No dependencies, versions, Lean source, commits or pushes changed.
- Guide/settings/notebook focus, keyboard traversal, sampled contrast, reduced
  motion and five desktop viewports checked; notebook/shell also checked at
  512×300. Real AT, actual browser zoom, touch/pen and device acceptance remain open.
- Performance: final unpaired 60 s interacting run **0.97918**; final matched
  60 s source pair **0.69961 before / 0.70482 after**. Earlier sustained ABBA
  **0.70430 / 0.71483**. Most bounded 1D/morph/face/popover/inspector/Bell probes
  were near real time; four-creature probes ~0.71–0.73. Raw adverse runs retained.
  **Do not declare the historical ~0.965 sustained gate or all Slice 5E accepted.**
- [Architecture, files, scientific scope, tests, exact trying instructions,
  measurements and remaining review](MUSEUM_VALIDATION.md).
  **Stop for independent review; no automatic next phase.**

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
