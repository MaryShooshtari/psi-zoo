# Quantum scattering and tunnelling — Slice 2 Phase 3B

This is numerical evidence for the **existing** three-point Hamiltonian and
Crank–Nicolson/Thomas implementation, not a formal verification or an exact
continuum solution. hbar=m=1 throughout. No solver algorithms were changed.

## Reproduce headlessly

```bash
npm run test -- packages/sim-core/tests/regions.test.ts packages/sim-core/tests/scattering.test.ts
node scripts/scattering-report.mjs
```

Validation run for this implementation: **193 tests in 13 files passed**;
`npm run typecheck` and `npm run build` passed. The report command above also ran
successfully, including during final release review. The user reports **8/8
Phase 3B browser acceptance checks passed**. The coding agent also captured the
actual Chrome demo through t=44 during release review; that capture is not a
repeat of the full device/input acceptance suite (see checklist below).

The report uses the existing Vite development dependency only to load TypeScript;
`sim-core` itself remains dependency-free and browser-independent. It prints all
cases, refinement results, drifts, the stationary benchmark, and the tail bound.

Public numerical APIs:

- `probabilityRegions(psi, leftEdge, rightEdge)` returns raw `{left, interaction,
  right, total}` probability masses, not R/T coefficients.
- `createScatteringExperiment({amplitude?, dx?, halfExtent?})` builds the initial
  state and Gaussian potential without stepping.
- `runScatteringExperiment({amplitude?, dx?, halfExtent?, dt?, endTime?,
  sampleInterval?})` returns fixed-time samples, final state/potential, initial
  kinetic energy, and maximum sampled norm/energy/accounting/boundary diagnostics.
- `SCATTERING_CONFIG` is the immutable shared default used by tests and the demo.

Overrides support convergence experiments, **not** an automatic certification of
arbitrary settings. Geometry must tile the domain; time/sampling intervals must
be integral step counts. The creator rejects halfExtent<60 but does not promise
that every permitted domain or run duration is free of wall contamination.

## Regions and interpretation

At every sample, with `x_i=x0+i*dx`, accumulate `dx*sum |psi_i|^2` over three
**disjoint** sets:

- Left: x < -4
- Interaction: -4 <= x <= 4
- Right: x > 4

Each grid point, including endpoints and points exactly on a cut, belongs to one
set. This is the established rectangle-sum convention, not a trapezoidal integral
or interpolated partial-cell assignment. Tests include off-grid cuts, zero-width
regions, unnormalized/zero states, input validation, and no mutation. Region sums
agree with the independently accumulated norm to floating-point roundoff.

**P_left is almost one at t=0, but reflection is not almost one.** It contains the
incoming packet. Low interaction mass alone also does not establish that a
collision has happened. Only a known left-incident, static-barrier experiment
with separated outgoing packets, before wall returns, supports
`R_est=P_left/P_initial` and `T_est=P_right/P_initial`. We do not divide by outgoing
mass or by the current norm to hide residual interaction probability or drift.

For hand-painted terrain these cuts are merely reference regions, not automatic
barrier detection. Potentials painted outside them invalidate any interpretation
of the middle interval as encompassing all interactions.

## Parameters and boundary isolation

| Quantity | Value |
|---|---:|
| Domain / boundary condition | [-120,120], fixed-zero Dirichlet endpoints |
| Base resolution | dx=0.1 (2401 points), dt=0.02 |
| Initial packet | center=-24, density sigma=3, carrier p0=1.5 |
| Initial amplitude | N exp(-(x+24)^2/(4*3^2)) exp(i*1.5*x) |
| Barrier | A exp(-x^2/(2*0.6^2)), centered at 0 |
| Heights tested | 0, 1.2, 1.8, 5 |
| Sampling | Every 1 physical time unit, t=0 through 44 |
| Separated-packet window | t=40,41,42,43,44 |
| Interaction acceptance | P_interaction < 1e-5 in that window |

The initial packet spans 30 grid spacings per sigma; the barrier spans six.
Carrier p0*dx=0.15. The initial momentum width is 1/6. Both carrier and significant
momentum tails are resolved well below the Nyquist scale pi/dx. Packet endpoints
are zeroed before a **single** dx-weighted normalization; there is no per-step
normalization. Barrier tails at the cuts are about 4.0e-10 for A=1.8.
Initial interaction/right mass is below 1e-10, and initial potential energy is
about 1.6e-14, so this is an initially separated incident packet, not a packet
prepared inside the barrier.

Unlike the small exploration scene, this domain has sufficient clearance for a
long outgoing measurement window. Tests monitor probability in the outer five
spatial units at **every sampled time**, not just the zero endpoints. The maximum
across the four base cases is 5.92e-16. Expanding the domain to [-160,160] changes
the default final transmission by <4e-16. This is strong empirical isolation,
not a rigorous bound on every instant between samples or all high-frequency
roundoff components. No long-time or infinite-domain accuracy claim is made.

## Measured base results

At t=44, normalized to the initial norm (already one to roundoff):

| A | R estimate | T estimate | Interaction probability | Max norm drift | Max absolute energy drift |
|---:|---:|---:|---:|---:|---:|
| 0 | 3.11e-9 | 0.999999150235 | 8.47e-7 | 4.08e-13 | 4.66e-13 |
| 1.2 | 0.442312267150 | 0.557686898421 | 8.34e-7 | 3.37e-13 | 3.84e-13 |
| 1.8 | 0.800247470031 | 0.199751925706 | 6.04e-7 | 3.14e-13 | 3.59e-13 |
| 5 | 0.999426216344 | 0.000573425387 | 3.58e-7 | 3.23e-13 | 3.66e-13 |

Digits here record reproducibility, **not** continuum precision at those digits.
The default A=1.8 browser demo has an absolute probability discretization budget
of **0.0015**, established below. The A=1.2 contrast case has a somewhat larger
base spatial error (~0.001805); it is not advertised with the default demo budget.

Across t=40..44, maximum interaction masses for A=0,1.2,1.8,5 are respectively
6.32e-6, 6.63e-6, 4.65e-6, 2.73e-6. Maximum changes of R are 1.86e-8, 5.47e-6,
4.00e-6, 2.37e-6; maximum changes of T are 5.49e-6, 3.27e-7, 3.97e-8, 6.00e-11.
Thus the stable window is not inferred merely from waiting a scripted duration.
The default T changes far less across this window than its spatial error.

Portable test budgets: sampled norm/energy drift <2e-11 each, probability
accounting error <5e-14, outer-strip probability <1e-12, interaction mass and
within-window R/T variation <1e-5. These conservative roundoff/window budgets
are distinct from the spatial accuracy budget. Maximum base accounting error
observed is <4.4e-15. Energy conservation applies only to **static** real V.

## Spatial and temporal convergence

Default A=1.8, same physical packet/domain/cuts, dt=0.01, measured at t=44:

| dx | T |
|---:|---:|
| 0.2 | 0.196098758215 |
| 0.1 | 0.199751925706 |
| 0.05 | 0.200676962595 |

Successive differences have ratio **3.94921**, close to four as expected for
central differences. Tests require [3.5,4.5]. Richardson extrapolation gives
T≈0.200985308225; the estimated remaining dx=0.1 error is about **0.00123338**.
An initial 0.001 target failed on this evidence; the documented budget is 0.0015,
not a silently claimed 0.1% accuracy. Refinement samples also retain negligible
boundary mass and conservation drift (largest sampled energy drift in these
runs ~1.01e-12).

At fixed dx=0.1, final transmissions for dt=0.04,0.02,0.01 agree to <1.1e-12.
This alone is not a test of time accuracy: for a static H, CN shares scattering
eigenstates with H, while its phase evolution still has temporal error. The
**full complex states**, with no phase alignment, have successive dx-weighted
L2 distances **0.008938977791** and **0.002235861814**, ratio **3.998001**. Tests
require [3.8,4.2] and resolved error >1e-5. Thus outgoing probabilities are stable
while temporal phase convergence is independently demonstrated.

Contrast refinements dx=0.1 -> 0.05, dt=0.02:

| A | Base T | Fine T | Continuum packet-weighted stationary T |
|---:|---:|---:|---:|
| 1.2 | 0.557686898421 | 0.559040537496 | 0.559491603847 |
| 5 | 0.000573425387 | 0.000569815553 | 0.000568612575 |

Their Richardson estimates agree with the stationary calculation within 2e-5
(the actual differences are ~1.5e-7 and ~3e-10). Their fine runs also check norm,
energy, boundary mass and residual interaction. This is not a convergence proof
for every brush-painted potential.

## Tunnelling: mean energy is not sufficient

For the A=1.8 experiment:

- Carrier continuum kinetic energy: p0²/2 = **1.125**.
- Continuum mean kinetic energy including momentum spread:
  (p0² + sigma_p²)/2 = **1.138888888889**.
- Measured initial finite-difference kinetic expectation: **1.136624184402**.
- Barrier maximum: **1.8**. Initial potential overlap is negligible.
- Incident momentum density: `w(k)=3*sqrt(2/pi)*exp(-18*(k-1.5)^2)`;
  sigma_p=1/6, with a nonzero high-energy tail.

An over-barrier continuum component has |k| > sqrt(2*1.8)≈1.8973666. For each
normal tail, Mills' inequality `Q(z) < exp(-z²/2)/(sqrt(2*pi)*z)` gives a combined
upper bound **0.009754702482** on BOTH high-|k| tails. On the resolved lattice,
E_h(k)=(1-cos(k*dx))/dx² <= k²/2, so the continuum cutoff conservatively includes
the lattice over-barrier components as well. Sampling aliases are negligible at
sigma/dx=30; the backward incident tail is <1.2e-19. This tail estimate pertains
to the separated initial packet, not to momentum observed after interaction.

The measured transmitted mass **0.199752** is far larger than this <0.009755
maximum possible incident over-barrier contribution, even allowing the 0.0015
spatial budget and residual separation error. This, together with the stationary
comparison, is numerical evidence of substantial **sub-barrier transmission**.
It is not based solely on E_mean<Vmax. Subtracting the tail bound is an asymptotic
channel argument; at finite time regional projectors are not exact energy-channel
projectors, so it is not presented as a rigorously certified lower bound on a
finite-time 'tunnelling-only' observable.

### Independent stationary benchmark

`tests/helpers/stationaryGaussian.ts` does not import CN, H, the potential module,
or the tridiagonal solver. It solves the **continuum stationary** equation
`f''=2(V-E)f` backward from a pure outgoing solution at x=8 using RK4, matches
incoming/reflected plane waves at x=-8, and computes equal-asymptotic-wave-number
flux transmission. Free propagation and R+T=1 are checked independently to 1e-7.

Stationary transmission is then averaged over the incident momentum density,
not just evaluated at its carrier or mean energy. Doubling the momentum bins
320->640 while halving the ODE step 0.01->0.005 changes the averaged result by
~7.4e-11 (test limit 1e-7). The integration is on k in (0,3.5); excluded Gaussian
mass is negligible for this packet. Gaussian barrier truncation at |x|=8 is
also negligible compared with the quoted error budgets.

- Monochromatic T at k=1.5: **0.173524532468**.
- Packet-weighted stationary T: **0.200986355229**.
- Time-dependent spatially extrapolated T: **0.200985308225**.
- Difference: approximately **1.05e-6**, within the 3e-5 test budget.

The raw dx=0.1 simulation is not expected to match the continuum benchmark at
roundoff precision. RK/quadrature refinement checks this independent numerical
benchmark, not an analytic theorem or a full certified error bound.

## Browser behavior and remaining manual checks

**Load tunnelling demo** pauses, sets the shared large-domain parameters, restores
t=0 and the Gaussian barrier, selects p0=1.5, and turns Painting mode off. **Load
free exploration** explicitly replaces the scene with the original small-domain
free packet and p0=0.75. These explicit loads may replace the potential array
because the grid size changes; all ordinary painting/clearing/resets preserve its
identity. No scripted density motion is used.

**Reset** pauses and regenerates the selected mode's packet at its initial center
and width using the selected momentum, preserving terrain. It does NOT reload
a cleared/edited barrier. **Clear Terrain** does not reset packet, time, selected
momentum or playback. Painting remains available in either mode, paused/running.

All regional readouts are from the actual current psi. Only an untouched demo,
reset with p0=1.5, in t=40..44, residual interaction <1e-5, negligible current
outer-strip mass and small norm drift supplies R/T estimates. Painting/clearing
or applying another momentum invalidates interpretation until a demo reload;
changing only the pending momentum does not alter the current run. Before
separation, in exploration, after edits, or after the window, R/T is withheld and
status explains why. These conservative gates do not certify arbitrary scenes.

The renderer uses actual grid geometry, labels independent density/potential
scales, and shows dotted region cuts. No large display buffers are copied each
frame. React diagnostics retain the existing 10Hz throttle and trailing updates;
all capture/listener/timer/RAF cleanup remains in place. The original exploration
parameters and all pre-existing tests are retained.

The user accepted Phase 3A's 173 tests and browser checks before this work.
The user subsequently reported **8/8 Phase 3B browser acceptance checks passed**.
The grouped checklist below is retained for regression review, not as pending
acceptance. The coding agent's release capture separately confirmed the incident,
collision and separated-packet display, norm/energy readouts and final R/T; it did
not repeat the full device/input checklist:

1. Load each mode while paused/running: verify pause, t=0, selected momentum,
   domain/axis labels, grid count, dt, initial packet/barrier, and painting-off state.
2. In the untouched demo, see P_left≈1 initially but no R value. Play through
   collision/splitting, then pause in t=40..44: R≈0.8002, T≈0.1998, interaction <1e-5.
   Continue beyond 44: confirm estimates are withheld rather than called final.
3. Paint or clear while paused/running: immediate overlay/probability/energy
   refresh, no direct change to psi, and provisional/modified R/T status. Reset
   preserves this terrain; reloading restores the validated barrier.
4. Change pending momentum during a separated run: no kick and no invalidation
   of the current run. Reset applies it and invalidates the preset interpretation.
5. Check keyboard access, narrow layouts, DPR/zoom, capture outside the canvas,
   switching modes mid-stroke, background pause, errors, and StrictMode/HMR cleanup.

## Authentic scattering GIF — capture provenance

[README demonstration](media/scattering.gif): **900×591 pixels, 221 frames,
4,255,611 bytes (4.06 MiB), 18.6 seconds, infinite loop**. Frames advance every
80 ms (12.5 fps), with a one-second final-frame hold. Physical time 0–44 is shown
at approximately **2.5× speed**; the loop restarts the demonstration, not a
physical time-reversed evolution.

The coding agent ran the actual Vite/React application in installed headless
Chrome, selected **Load tunnelling demo**, clicked **Play**, and captured native
Chrome DevTools Protocol PNG screenshots approximately every 200 ms in real
time. Playback used the unchanged browser controller and Crank–Nicolson solver,
with dx=0.1, dt=0.02 and all default parameters from the table above. No solver
steps were skipped or replaced. At t=44, **Pause** preserved the separated readout:
R=0.8002, T=0.1998, norm=1.0000000000, energy=1.13662418.

Temporary browser-only CSS hid editing controls and explanatory prose and reduced
page margins so the **unmodified live canvas, axes, potential, physical time,
norm, energy, regional masses, provisional/separated status, R/T and solver/grid
footer** fit together. It did not change canvas dimensions, plotting scales,
wavefunction values, diagnostics or application source. The GIF shows the incident
packet, collision/interference, and reflected/transmitted outgoing packets.

No capture/encoding packages were available in the checked tool locations. An
external temporary Node script used the installed browser's debugging protocol
and a dependency-free palette/LZW GIF encoder. The only processing was screenshot
color quantization and accelerated GIF timing; no fabricated or interpolated
frames were inserted. Capture scripts, raw PNGs and temporary browser profiles
remain outside the repository. No application dependencies were added.

Verification: Chrome's native `ImageDecoder` decoded all 221 GIF frames at the
expected dimensions and duration; a browser `Image` decoded the GIF successfully.
Incident, collision and final decoded frames were reviewed for legibility and
agreement with the running simulation. The GIF carries a NETSCAPE infinite-loop
extension and a one-second final hold. The README uses the repository-relative
path `docs/media/scattering.gif`, which resolves on GitHub.

To recapture manually: run `npm run dev`, load the unchanged tunnelling demo,
record the canvas plus diagnostics from t=0 through t≈44, and pause while R/T is
shown. Export at 800–960 px width and 10–15 fps with approximately 2.5× playback
speed and a final readout hold. Preserve axes and provisional/separated labels;
identify acceleration in the caption and do not alter dt or physics to speed up
recording.
