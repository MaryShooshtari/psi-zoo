# Slice 5A — two-dimensional quantum dynamics

This is the historical 5A numerical/acceptance record. Slice 5B retains its
integrator and tests and adds live terrain tools, presets, and a signed overlay;
see [current terrain controls and evidence](TERRAIN_2D_VALIDATION.md). Statements
below about terrain being absent describe the 5A milestone, not the current UI.

## Run and inspect

Run `npm run dev`, open the Vite URL, and select **2D Gaussian demo** above the
existing 1D interface. The new view starts paused. **Play**, **Pause**, and
**Reset** operate on one free complex wavefunction. Diagnostics show physical
time, area-weighted norm, x/y density standard deviations, and discrete energy.
Reset restores the identical stored initial complex state and pauses.

**1D simulations** returns to the existing creature and single-packet scenes.
Switching dimensions unmounts/disposes the inactive controller, cancels its
animation frames, and starts the selected view afresh. It does not preserve an
inactive experiment. Background tabs pause. Physics uses an accumulator with
fixed dt, at most eight steps per frame; stalls discard excess wall time rather
than increasing dt. React publication is throttled to 10 Hz during playback;
Canvas rendering is independent of React and does not alter the state.

## Model, grid and API contracts

Units are dimensionless, hbar = m = 1:

`i dpsi/dt = [-1/2 (d²/dx² + d²/dy²) + V] psi`.

Defaults are **128 × 128 interior points**, x,y in **[-10,10]**,
`dx=dy=20/129 ≈ 0.15503876`, `dt=1/120`. `nx,ny` count interior points, NOT
endpoints. Coordinates are `xmin+(i+1)dx`, `ymin+(j+1)dy`, with
`dx=(xmax-xmin)/(nx+1)` and the analogous dy. All four unstored boundary values
are exactly zero (homogeneous Dirichlet); there is no periodic wrapping.

`grid2d.ts` provides metadata, coordinate/index helpers and grid creation.
Wavefunctions are interleaved Float64Array values of length `2*nx*ny`, row-major
`k=j*nx+i`, real at `2*k`, imaginary at `2*k+1`. V is a separate real
Float64Array of length `nx*ny`. Positive integer dimensions, finite increasing
bounds, representable spacings/area, finite amplitudes, and finite real potentials
are required. Use the factory-created grid metadata; do not forge/mutate metadata.
Stepper instances bind dimensions and spacings, but can operate on another state
with the same dimensions/spacings. Negative finite dt is supported in sim-core;
the browser playback dt must be positive. A validated zero dt writes nothing.
Extreme coefficient magnitudes above 1e100 are rejected, rather than promising
accurate finite arithmetic for all representable physical parameters. Input
validation precedes mutation; arithmetic overflow during evolution may leave a
partially advanced state, requiring Reset. Evolution never renormalizes.

`gaussian2d.ts` initializes

`exp(-X²/(4 sigmaX²)-Y²/(4 sigmaY²)+i(px X+py Y))`,

where X=x-x0, Y=y-y0. Widths are positive finite **position-density standard
deviations**, not amplitude widths. The stored state is then normalized using
`dx*dy*sum |psi|²`. Demo defaults: center (0,0), widths (0.8,0.8), momenta (0,0),
V=0. Grid, Gaussian, dt and static potential are configurable through
`SimulationPlayback2D` options, not new UI sliders.

`observables2d.ts` contracts:
- `normSquared2D`: area-weighted norm, no normalized-input requirement.
- `normalize2D`: in-place normalization, rejects zero/nonfinite norm.
- `probabilityDensity2D`: |psi|² (not cell probability); optional disjoint output
  buffer. Multiply density by dx*dy to obtain cell probability.
- `positionMoments2D`: divides by norm, so any nonzero finite-norm state is
  accepted. Returns means, variances and standard deviations. A centered second
  pass avoids subtractive cancellation in the raw second-moment formula.
- `energyExpectation2D`: real area-weighted `<psi|H_discrete|psi>`, **without**
  division by norm. Normalize first for physical energy. Its edge quadratic form
  is algebraically the same nearest-neighbor Laplacian, including the zero
  boundary edges, plus the same real V. Hermiticity makes the expectation real;
  no imaginary roundoff residual is needed.

These are separate 2D APIs: the existing 1D grid includes stored boundary
endpoints and its API and tests remain unchanged.

## Actual propagation algorithm

`adi2d.ts` implements the symmetric Cayley splitting

`P_V(dt/2) C_x(dt/2) C_y(dt) C_x(dt/2) P_V(dt/2)`

(rightmost acts first; the sequence is palindromic). Here
`C_A(tau)=(I+i tau A/2)^(-1)(I-i tau A/2)` and
`P_V(tau)=exp(-i tau V)`. This is **second-order and unitary in exact arithmetic**,
but **not the unsplit full 2D Crank–Nicolson update**, nor FFT propagation.

Each kinetic direction uses the finite-difference diagonal `1/h²` and adjacent
off-diagonals `-1/(2h²)`. A substep solves a tridiagonal system with diagonal
`1+i tau/(2h²)` and off-diagonal `-i tau/(4h²)`, applied to a right-hand side
with the opposite imaginary signs. Rows use dx; strided columns use dy.
A specialized Thomas solver caches complex inverse pivots and eliminated upper
diagonals, reusing a line RHS/solution workspace. It has no dense matrix, per-cell
objects, or per-step full-state allocation. The existing general 1D solver was
not changed because it allocates output and factors per solve.

Real symmetric directional Hamiltonians are Hermitian in the area-weighted
inner product (the area is constant), so their Cayley factors preserve norm.
The real-potential exponential has modulus one at each point and also preserves
norm. Their product is unitary; finite precision introduces accumulated roundoff.
V is **frozen throughout each whole step**; no time-dependent sampling convention
is implemented. Potential phase multiplication is explicit real/imaginary
rotation, with both old components read before writing.

**Norm conservation is not energy conservation.** The splitting generally does
not commute with the complete static H when V is nontrivial. Static-V energy
drift is measured below rather than asserted to vanish. For free evolution the
directional operators commute, and each Cayley factor commutes with Hx+Hy, so
free discrete energy is preserved to roundoff. The two half-x factors and one
full-y factor have slightly different finite-dt phase errors: exact x/y exchange
symmetry is only recovered in the dt→0 limit, although reflection symmetry is
preserved. Tests explicitly allow this O(dt²) axis-exchange difference.

## Executed numerical evidence

Baseline before edits: **296 tests** passed, typecheck and production build passed.
After implementation: **314 tests in 25 files** passed, typecheck and production
build passed. All existing tests ran unchanged, including 1D physics, scattering,
measurement, world and controller tests. No tests were disabled or deleted.

Reproduce the new benchmarks with:

```sh
npx vitest run packages/sim-core/tests/dynamics2d.test.ts
npx vitest run packages/web/src/simulation2d.test.ts
npm run test
npm run typecheck
npm run build
```

### Free Gaussian, unbounded-space comparison

Both benchmarks use 128×128 interior points on [-10,10]², dx=dy=20/129,
dt=1/120, 240 steps, **t=2**. No per-step normalization. The independent
continuum prediction is

`sigma(t)=sigma0*sqrt(1+(t/(2*sigma0²))²)` and `mean(t)=center+p*t`.

| Initial widths | Momentum | Relative x width error | Relative y width error | Measured center at t=2 |
| --- | --- | ---: | ---: | --- |
| (0.8,0.8) | (0,0) | 0.331700% | 0.332213% | approximately (0,0) |
| (0.65,1.1) | (0.5,-0.4) | 0.851315% | 0.178262% | (0.99191243,-0.79750110) |

Each width is within the specified 2% criterion. Directed continuum center is
(1,-0.8): absolute errors 0.00808757 and 0.00249890. Finite-difference dispersion
is not exactly continuum dispersion. The nearest wall is more than five final
continuum standard deviations from either center, avoiding significant boundary
interaction during these comparisons. These results are evidence at the tested
resolution/time, not an assertion of continuum accuracy after wall reflections.

### Invariants and eigenmode

- **10,000 steps**, 16×13 interior points on [-10,10]², dt=0.01:
  maximum absolute norm drift **5.37126e-13** for V=0 and **6.69353e-13** for
  `V=0.1x²+0.16y²+0.07xy`. Both are below 1e-10, without renormalization.
- Forward/backward: 100 steps at +0.0125 followed by 100 at -0.0125,
  37×24 unequal-spacing grid, same nontrivial V. Area-weighted complex-state
  recovery error tested below **2e-13**.
- 19×14 Dirichlet product sine mode (kx,ky)=(3,2), dt=0.015, 150 steps:
  constant density and full complex phase tested to 12 decimal places;
  energy drift below **1e-13**. Independent eigenvalues are
  `lambda=2/h²*sin²(k*pi/(2*(N+1)))` and predicted accumulated phase is
  `-steps*(4 atan(dt*lambdaX/4)+2 atan(dt*lambdaY/2))`.
- A one-interior-cell test includes V=2.3 and checks the exact potential phase
  plus the two independent kinetic Cayley phases, with every external neighbor
  zero. No periodic neighbor can enter.
- Reflection symmetry, transpose/axis exchange, non-square and unequal-spacing
  evolution, zero dt, finite values, coordinate layout, Gaussian moments,
  invalid input and area normalization are also checked.

### Temporal convergence and static-potential energy

Same spatial discretization for every comparison: 32×27 interior points on
[-10,10]², t=1, V=0.1x²+0.16y²+0.07xy. Initial center (-0.5,0), density widths
(0.9,0.7), momenta (0.7,-0.2). Reference uses dt=1/1280. Error is
`sqrt(dx*dy*sum |psi_dt-psi_ref|²)`, including phase, with no global-phase
alignment. Keeping the grid fixed isolates temporal error rather than comparing
a spatially discretized state against an unrelated continuum reference.

| dt | Full complex-state error | Maximum absolute energy drift through t=1 |
| ---: | ---: | ---: |
| 0.04 | 1.02402159e-4 | 4.94804108e-6 |
| 0.02 | 2.55870936e-5 | 1.23908263e-6 |
| 0.01 | 6.36843473e-6 | 3.09900304e-7 |

Error ratios are **4.00210** and **4.01780**, consistent with second-order time
accuracy; the finite reference error explains the small departure from four.
Energy drift likewise decreases approximately quadratically, but is not zero.
Tests require ratios between 3.8 and 4.2, rather than just decreasing density error.

## Rendering, performance and browser evidence

`render/density2d.ts` maps each interior sample to one equal display cell,
with low y at the bottom. A reusable 128×128 ImageData and Canvas2D staging
surface are enlarged with nearest-neighbor sampling. The rectangular physical
aspect ratio is preserved, with dark letterboxing if necessary. Fixed brightness
`f=1-exp(-rho/0.08)` maps navy RGB(8,14,25) toward cyan-white RGB(198,244,255).
It is nonlinear and not an autoscaled probability/color axis. Nonfinite or
negative density is rejected, rather than hidden; the renderer does not modify psi.

Measured on this Windows desktop with Node 24.20.0 and Chrome 155:
- Warmed isolated Node test: **1.26 ms/physics step**, averaged over 300 steps
  after 30 warmups, default grid, V=0, dt=1/120. During the parallel full test
  suite it measured **2.86 ms/step**; timings are workload-dependent, not a CI
  performance assertion.
- Actual headless Chrome: **1.89 ms/physics step**, same warmup/count; complete
  1000×520 Canvas2D heatmap draw **2.16 ms**, averaged over 100 draws after
  10 warmups. Rendering timing measures synchronous work, not a GPU/compositor
  completion fence. GPU was disabled for the acceptance run.
- Real scheduled browser playback advanced **2.175 physical seconds in 2.209
  wall seconds**, with 136 draw calls including setup. It remained responsive
  to Pause/Reset/mode switches. No observed blocking bottleneck in this run;
  renderer and physics cost are comparable. This is not mobile-device evidence.
- Core amplitudes **262,144 bytes**, V **131,072 bytes**, solver scratch
  `6*(nx+ny)*8` = **12,288 bytes**: **405,504 bytes / 396 KiB** total numerical
  state/workspace. Browser deterministic-reset copy adds **256 KiB** (652 KiB
  total numerical buffers). ImageData plus staging pixels add approximately
  **128 KiB**, excluding object overhead, browser buffering and the displayed
  Canvas backing store (which also scales with device pixel ratio).

Reproduce dependency-free Chrome acceptance with:

```sh
node scripts/two-dimensional-browser-check.mjs
node scripts/creature-browser-check.mjs
node scripts/observer-browser-check.mjs
```

The new script uses the installed Chrome executable (override `CHROME_PATH`),
a temporary profile, a local Vite server and CDP. It checks real UI playback,
spreading, finite normalized diagnostics, deterministic rendered reset, no
pending animation frames after mode switches, return to functioning 1D and 2D,
and no browser errors. It also measures the actual browser-compiled solver and
renderer using a separate benchmark state, never replacing the displayed state.
All **7 new browser checks**, **22 existing creature checks** and **14 existing
Observer checks** passed. The existing Observer script regenerates its historical
screenshots; those unrelated artifacts were restored after this regression run.

Automated real-Chrome checks are distinct from human visual/device acceptance.
**Still manual:** inspect legibility/color/aspect ratio on target screens, narrow
mobile layouts, keyboard/screen-reader usability, and long-session performance.
For visual inspection, Play through t≈2: the one centered cloud broadens and
fades while norm stays near one; Pause freezes it; Reset restores its initial
size. Return to 1D and verify its existing controls. Appearance alone is not
physics validation: the analytic widths, independently specified sine-mode
phase, invariants, reversibility and full-state convergence provide the evidence.

## Scope and limitations

Only Slice 5A is implemented. No new dependencies, 2D terrain painting, creature
interactions, moods, entanglement, collapse, notebook integration, Workers,
WebGL/GPU propagation, backend, or Lean changes. The dedicated reusable solver
and distinct component filename (`Gaussian2DDemo.tsx`, avoiding case-insensitive
collision with `simulation2d.ts`) are implementation choices, not physics changes.

Finite Dirichlet walls eventually reflect the packet; finite differences cause
spatial dispersion error; Cayley/splitting phases have O(dt²) global temporal
error. Norm conservation alone does not guarantee phase, width, energy or
continuum accuracy. Time-dependent potentials and advanced performance work
remain for later stages. No claim of exhaustive physical validation or formal
verification of TypeScript follows from these tests.
