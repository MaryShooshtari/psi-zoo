# Slice 4C — two-creature mean-field contact interaction

## Scope, location, and API

The browser-independent coordinator is
`packages/web/src/world/twoCreatureWorld.ts`, alongside the existing Creature.
It depends on that world entity and on core types; `sim-core` does not depend
on world rules. No playback, UI, notebook, measurement, or Lean files change.
No dependencies or packages are added.

Exports from `twoCreatureWorld.ts`:

- `TwoCreatureWorldOptions`: `{ a: CreatureOptions, b: CreatureOptions, coupling: number }`.
- `TwoCreatureWorldSnapshot`: `{ a, b, coupling, time }`, with independent
  `CreatureSnapshot` copies, never live state views.
- `SocialPotentials`: `{ a: Float64Array, b: Float64Array }`.
- `TwoCreatureWorld`: constructor, `step(terrain)`, `snapshot()`,
  `socialPotentials()`, readonly `coupling`, and `timeStep` getter.

```ts
import { TwoCreatureWorld } from './world/twoCreatureWorld';

const world = new TwoCreatureWorld({ a: initialA, b: initialB, coupling: 2 });
world.step(terrain); // One shared fixed dt; caller's terrain remains unchanged.
const { a, b, time } = world.snapshot();
const social = world.socialPotentials(); // Current endpoint social-only samples.
```

Each initial condition is copied into a separate owned Creature at t=0. The
world accepts exactly two initial conditions, not caller-owned live instances.
Their `count`, `dx`, `x0`, and fixed timestep must match exactly: there is no
resampling, tolerance-based grid matching, or multiple-rate stepping. Existing
Creature validation enforces finite values, representable solver coefficients,
normalized initial states, and exact zero Dirichlet endpoints. Coupling must be
real/finite; either sign and zero are supported. Default dt remains 0.01.
Configuration changes and reset require a new world. No timers/resources need
disposal. Terrain is borrowed per call and neither mutated nor retained.

## Mathematical model and units

Units are `hbar=m=1`. On the common uniform grid `x_j=x0+j*dx`:

```text
rho_A,j = Re(psi_A,j)^2 + Im(psi_A,j)^2
rho_B,j = Re(psi_B,j)^2 + Im(psi_B,j)^2
V_social,A,j = g * rho_B,j
V_social,B,j = g * rho_A,j
V_total,i,j = V_terrain,j + V_mood,i,j + V_social,i,j
H_i = -(1/2) D_xx + V_total,i
```

`rho` is a probability DENSITY, not the probability mass `dx*rho`. There is no
extra `dx` in either contact potential. Spatial norms and overlap/energy
integrals DO include `dx`. Each density is used only for the OTHER creature's
potential: there are no `g*rho_A` terms in A's own potential or vice versa.
The two independent input densities are not summed into a coherent amplitude.

- `g=0`: independent Creature evolution, including each mood's existing drive.
- `g>0`: overlap costs positive interaction energy; another density peak is a
  repulsive potential bump.
- `g<0`: overlap lowers interaction energy; another density peak is an attractive
  well.

These signs describe the model's interaction, not a universal trajectory rule
for every initial state/time. Large momenta, terrain, walls, and strong coupling
can change the observed motion. The initial sign-validation experiment below
isolates the effect before boundary encounters.

The existing mood drive is unchanged: `F_i=F0_i*rz_i`,
`V_mood,i=-F_i*(x-x_ref)`, with fixed domain-center `x_ref`. Mood evolves
independently under its own constant Pauli Hamiltonian and is sampled at the
midpoint of each spatial step.

## Synchronization and atomicity

For each interval `[t,t+dt]`:

1. Take independent snapshots of BOTH creatures at their common endpoint t.
2. Compute BOTH densities and BOTH social potential arrays from those snapshots.
3. Validate terrain length/finiteness and allocate BOTH arrays
   `terrainA=terrain+g*rho_B(t)` and `terrainB=terrain+g*rho_A(t)`.
4. Fork BOTH owned Creatures at the same step count.
5. Advance fork A with terrainA and fork B with terrainB. Each invokes the
   existing Creature step: exact midpoint mood sampling, additive mood
   potential, existing CN solve, and endpoint mood evolution.
6. Only after both succeed, replace the owned pair with the candidates using a
   single pair assignment. Shared world time is the synchronized member time,
   not a separately accumulated clock.

No density from an already-advanced state can enter the other member's step.
Although the two numerical solves execute sequentially, their inputs are fixed
before either runs. Swapping labels/list order swaps the results bit-for-bit in
the tested runtime, including asymmetric moods, momenta, and terrain changes.

The sole Creature API extension is `fork(): Creature`. It makes an independent
validated copy preserving configuration, numerical values, fixed dt, and integer
step count. It never normalizes or advances the state. The world can discard
failed speculative evolutions without exposing a public commit token, duplicating
solver code, or attempting numerical rollback. Existing Creature methods retain
their behavior. Fork construction rechecks the existing `1e-10` squared-norm
acceptance guards; a sufficiently long/drifting run may therefore fail rather
than be silently repaired. Copies cost O(N) time and storage per step.

Terrain, social multiplication, and additive composition overflow are checked.
Failure in either mood/drive/solver path discards both candidates. Tests include
natural failure in either member and an injected failure AFTER the second real
CN solve has completed, confirming that even late errors cannot advance the
owned world. A successful retry matches a fresh world's first step exactly.

## Temporal discretization

Social densities are frozen at the START of the interval, not extrapolated or
solved self-consistently. This is an explicit treatment of the nonlinear
coupling. For smooth solutions it is generally a FIRST-ORDER time scheme for
the coupled system. Midpoint mood sampling and a second-order CN solve for a
fixed prescribed potential do not make the nonlinear pair scheme second-order.
There is no nonlinear iteration, predictor-corrector, convolution, or kernel.

Each step uses a real potential and a Hermitian finite-difference Hamiltonian,
so each Cayley/CN solve preserves its own discrete norm in exact arithmetic.
Finite-precision roundoff remains observable; there is no per-step normalization.
Norm stability alone does not guarantee accurate phase, trajectories, density
feedback, or energy at large dt or strong coupling.

## Conservation: individual versus combined energy

An individual creature's Hamiltonian changes with the other creature's density;
its individual energy is NOT generally conserved, even under static terrain.
For time-independent terrain and fixed mood potentials, the continuously evolved
semidiscrete mean-field model instead has the combined spatial energy functional

```text
E = <psi_A | T + V_terrain + V_mood,A | psi_A>
  + <psi_B | T + V_terrain + V_mood,B | psi_B>
  + g * dx * sum_j rho_A,j * rho_B,j
```

The interaction term is counted ONCE. Adding each member's energy under its
full social Hamiltonian would double-count it. The finite-difference T and
weighted inner products use the same fixed zero Dirichlet boundary convention
as the solver. The frozen-density algorithm does NOT exactly conserve this
combined nonlinear energy; the refinement test measures its nonzero drift and
its reduction with dt. No exact discrete conservation claim is made.

Precessing moods with nonzero drive make the base potentials time-dependent and
can do work. Terrain edits can do work too. Then even the exact spatial
mean-field evolution need not conserve this E. Mood is a one-way source of drive,
not a closed-system backreaction model; adding its constant-H qubit energy does
not provide a demonstrated total-energy conservation law for that game coupling.

## Tests and measured results

Tests were written before implementation. The first run failed at import with
`Cannot find module './twoCreatureWorld'`, as expected before the module existed.
The new suite contains 17 tests covering:

- independent forks/ownership, immutable external snapshots, and borrowed terrain;
- g=0 exact equality with separately stepped Creatures;
- signed social potentials equal to the OTHER density, without a dx factor;
- localized disjoint states demonstrating no self-interaction;
- repeated exact comparison with separately constructed old-density references;
- opposite interaction signs, asymmetric label/order swapping, determinism;
- both spatial norms, mood norms, Bloch radii, and Dirichlet endpoints;
- mismatch/invalid-input/overflow rejection, early/late failure, and retry;
- full-amplitude temporal refinement and combined-energy drift refinement.

All trajectory/refinement measurements use normalized, initially stationary
Gaussians centered at -0.8 and +0.8, density sigma=0.8, `dx=0.1`, domain
`[-20,20]`, and zero terrain/mood drive. At t=1 with dt=0.01:

| g | Mean x_A | Mean x_B | Overlap `dx sum rho_A rho_B` |
| --- | --- | --- | --- |
| -3 | -0.570369563 | 0.570369563 | 0.214303210 |
| 0 | -0.800000000 | 0.800000000 | 0.149292592 |
| +3 | -1.018637457 | 1.018637457 | 0.074254487 |

Tests require a separation change greater than 0.1 and overlap change greater
than 0.005 relative to the zero-coupling case. These are deliberately broad
physical contrasts, not fragile rounded-output assertions or continuum accuracy
claims.

### Temporal refinement and energy experiment

For g=2 at t=1 on the SAME spatial grid, error is the joint weighted L2 distance
of the two complex wavefunctions from a dt=0.000625 reference. Global phase is
included, so this is stricter than a density-only error. The energy column is
maximum absolute drift from the initial combined E, sampled at every step:

| dt | Joint amplitude error | Max combined-energy drift |
| --- | --- | --- |
| 0.02 | 8.46181653e-4 | 2.47058254e-4 |
| 0.01 | 4.08556558e-4 | 1.23079416e-4 |
| 0.005 | 1.90650715e-4 | 6.14257874e-5 |
| 0.000625 (reference) | — | 7.66566682e-6 |

Amplitude error ratios are approximately 2.071 and 2.143, consistent with
first-order refinement and a finite-dt reference. Tests accept ratios between
1.7 and 2.5, require resolved error above 1e-5, and require each dt halving to
reduce maximum energy drift by at least 30%. Energy drift is nonzero by design;
the coarse drift must exceed 1e-6. This is a measured convergence experiment, not
a universal convergence/stability proof or a spatial-continuum extrapolation.

### Long-run roundoff checks

With g=1.2, dt=0.01, 1,000 steps (t=10), mood fields `(0.7,-0.3,0.2)` and
`(-0.4,0.2,0.1)`, and drive magnitudes 0.1 and 0.15 respectively, maximum absolute
errors from one in the local Node runtime were:

| Quantity | A | B | Per-member test budget |
| --- | --- | --- | --- |
| Spatial squared norm | 5.33e-15 | 4.55e-15 | 5e-12 |
| Mood squared norm | 2.68e-14 | 8.95e-14 | 2e-12 |
| Bloch radius | 2.69e-14 | 8.96e-14 | 2e-12 |

Budgets allow accumulated floating-point roundoff; they are not exact unitarity
claims. This long run tests invariants, not continuum trajectory agreement after
possible boundary effects. Replay equality is within a given runtime; bitwise
transcendental results are not promised across JavaScript engines.

## Checks run

- `npm run test`: **284 passed in 20 files** (267 existing + 17 new).
- `npm run typecheck`: passed for both workspaces.
- `npm run build`: passed, including its repeated typecheck.
- Strict browser-independent TypeScript compilation: **zero diagnostics**, with
  `target=ES2022`, `lib=[lib.es2022.d.ts]`, `types=[]`, strict mode,
  `noUncheckedIndexedAccess`, Bundler resolution, and the repository source alias
  for `@psi-zoo/sim-core`. Root files were `creature.ts` and
  `twoCreatureWorld.ts`; their core imports were included transitively.

An initial typecheck caught `TS2683` in the test's injected-failure spy because
its `this` lacked an explicit type. Annotating `this: CrankNicolsonStepper`
resolved it; the complete checks above subsequently passed.

## Model boundaries and remaining limitations

This is deterministic mean-field interaction between two independent
single-particle states. There is no joint tensor-product state, entanglement,
exchange symmetry, coherent cross-creature interference, correlated measurement,
or exact two-particle dynamics. Feedback through density does not create those
quantum structures. No measurement mechanics are changed.

Strong attraction can sharpen densities; large coupling or coarse timesteps can
make explicit feedback inaccurate despite good norms. Grid/Nyquist resolution,
phase error, walls, finite density tails, and extreme-scale underflow/overflow
remain limitations. Finiteness checks reject unrepresentable arithmetic, not
poor physical resolution. Copies intentionally favor simple atomic ownership
over allocation efficiency. Coupling/grids/configuration are fixed for a world;
there is no smoothing kernel, dynamic social tuning, or additional creature.

Slice 4C stops here. Browser integration and 4D require separate review.
