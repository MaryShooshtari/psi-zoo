# Directed Gaussian packets — Slice 2 Phase 3A

Units: **hbar = m = 1**. This phase adds configurable initial momentum and
validates free directed motion. It does not add scattering presets, reflection /
transmission metrics, or scripted motion. The CN and Thomas solvers are unchanged.

## Initialization and compatibility

The existing public API is extended, not replaced:

```ts
initializeGaussian(grid, xCenter, sigma, k0 = 0, normalizeFlag = true);
```

`k0` is the carrier momentum `p0` because hbar=1. The initializer samples

`psi(x,0) = N exp(-(x-xCenter)^2/(4*sigma^2)) exp(i*p0*x)`.

The density has standard deviation sigma; in the continuum the unchirped packet
has momentum standard deviation `1/(2*sigma)` and saturates `Δx Δp = 1/2`.
This is a continuum statement, not an assertion that finite-difference momentum
observables exactly saturate the continuum uncertainty relation.

The phase `exp(i*p0*x)` is retained for compatibility with all existing complex
states. Relative to `exp(i*p0*(x-xCenter))` it differs only by a constant global
phase, with identical density, phase gradient, energy and evolution of observables.
Omitted/undefined momentum now means zero. Existing explicit momentum and fifth
normalization-flag calls are unchanged. Nonfinite center/momentum inputs are
rejected before writing; sigma must remain positive and finite.

Normalization is the established discrete convention `dx * sum |psi_i|^2 = 1`.
For evolution, initialize with normalization disabled, set both complex endpoints
to exactly zero, then normalize **once**. The stepper never renormalizes.

## Browser control and Reset

The initial-momentum slider selects p0 in **[-1.5,1.5]**, in UI increments of 0.25.
The default remains **0.75**, preserving the accepted Slice 1/2 startup behavior.
Negative values launch left, positive values right; zero spreads without centroid
drift in free space. A potential can accelerate, reflect or otherwise reshape
these packets, so those directional descriptions are not guarantees under V != 0.

Selection only updates the next initial condition: `setInitialMomentum(p0)` does
not change the live packet, time, diagnostics, terrain, or playback state. The
controller validates finite values within the same bounds. Its `initialMomentum`
getter describes the selected next-reset value, not a measurement of current p.

**Reset** pauses, regenerates the packet with the selected momentum at center=-5
and sigma=1, and restores t=0. Terrain and its array identity are preserved.
**Clear Terrain** still removes only barriers; it does not alter the selected
momentum or reset the packet. To reproduce the original free startup, select
p0=0.75, Clear Terrain, then Reset. Painting, fixed-step scheduling, rendering,
and cleanup retain their Phase 2 behavior.

## Resolution and the correct velocity reference

The browser uses 401 samples on **[-20,20]**, **dx=0.1**, **dt=0.01**, sigma=1.
Thus sigma spans 10 grid spacings, the carrier phase increment satisfies
`|p0*dx| <= 0.15`, and the shortest allowed carrier wavelength spans about 42
samples. The momentum spread is 0.5: the carrier bound alone does not describe
the entire momentum distribution, but its significant tails are also far below
the Nyquist scale `pi/dx ≈ 31.42` for these packets.

For a continuum plane wave, `E(k)=k^2/2` and `v=k`. For the repository's central
finite-difference kinetic operator,

`E_h(k) = (1-cos(k*dx))/dx^2`,

`v_h(k) = dE_h/dk = sin(k*dx)/dx`.

A Gaussian is not a plane wave: average group velocities over its momentum
density `w(k) ∝ exp(-2*sigma^2*(k-p0)^2)`. Ignoring negligible sampling aliases,
the infinite-lattice, continuous-time packet velocity is

`v_packet,h = exp(-dx^2/(8*sigma^2)) * sin(p0*dx)/dx`.

CN adds temporal phase dispersion. Its effective frequency and derivative are

`omega_CN(k) = 2*atan(dt*E_h(k)/2)/dt`,

`v_CN(k) = v_h(k) / (1+(dt*E_h(k)/2)^2)`.

The precise centroid reference is the weighted average of **v_CN(k)**, not just
p0 or v_h(p0). The tests integrate this independently using midpoint quadrature
on the first Brillouin zone, without calling H, the stepper, or a production
velocity helper. Refining from 8192 to 16384 points must change it by <2e-14.
The Gaussian sampling aliases are negligible at sigma/dx=10.

## Tests, tolerances and measured results

`packages/sim-core/tests/gaussian.test.ts` covers omitted/zero and signed momentum,
norm, density moments, complex phase gradient, opposite-momentum conjugacy, the
legacy absolute phase, and input rejection. Density mean/variance tolerance is
1e-12; normalized probability error is <2e-15. Adjacent normalized complex overlaps
agree with `exp(i*p0*dx)` to <3e-15 in each component. The existing discrete momentum
observable agrees with the finite-width lattice expression to <2e-14.

`directedGaussianEvolution.test.ts` uses the same grid/dt/sigma, but center=0 so
both directions have equal wall clearance. It evolves to t=2 for
p0=-1.5,-0.75,0,0.75,1.5 and checks at **every step**:

- Norm drift <2e-12; static-H energy drift <2e-12*max(1,|E_initial|).
  These are conservative accumulated-roundoff budgets for up to 400 solves.
- Centroid error against the CN spectral reference <2e-11 spatial units.
  This tests the discretized dynamics, not continuum accuracy to that tolerance.
- Exactly zero endpoints, >12 measured density standard deviations to the nearest
  wall, and probability <1e-20 in the outer two spatial units at either wall.
- Measured velocity within 2e-4 of the finite-width continuous-time lattice value,
  and within 0.008 of the continuum p0 across the allowed UI range. These are
  discretization allowances, deliberately distinct from conservation roundoff.
- At p0=1.5, halving dt from 0.01 to 0.005 gives an error ratio in [3.9,4.1]
  toward the lattice velocity, with the coarse error >1e-5 (well above roundoff).

Observed velocities from the t=2 runs (rounded, not hard-coded test targets):

| p0 | Carrier v_h(p0) | Finite-width lattice velocity | Measured CN velocity |
|---:|---:|---:|---:|
| -1.5 | -1.494381324736 | -1.492514515079 | -1.492407233315 |
| -0.75 | -0.749297072727 | -0.748361036531 | -0.748348679242 |
| 0 | 0 | 0 | approximately 0 (absolute value <5e-16) |
| 0.75 | 0.749297072727 | 0.748361036531 | 0.748348679242 |
| 1.5 | 1.494381324736 | 1.492514515079 | 1.492407233315 |

In these five baseline runs: max norm drift <4.9e-14, max absolute energy drift
<6.2e-14, centroid/spectral disagreement <1e-14, minimum wall clearance >12.108
standard deviations, and maximum outer-strip probability <4.5e-27. A separate
measurement run used the actual core loaded through Vite's TypeScript support;
the executable tests enforce the broader portable budgets above.

`packages/web/src/simulation.test.ts` additionally checks selection versus live
state, regeneration/reset, exact endpoints/normalization, preserved terrain,
Clear Terrain behavior, stale-callback cancellation, invalid values/disposal,
free left/zero/right motion from the actual browser center=-5 through t=1, and
norm/static painted-H energy conservation through t=2 for all five momenta.
All pre-existing free-Gaussian convergence and playback tests are retained.

## Limits and browser review

The domain has reflecting **Dirichlet** walls, not periodic or absorbing boundaries.
No constant-velocity prediction applies once appreciable density reaches a wall.
The center=0 reference tests are isolated from walls through t=2; the browser
starts at -5, so left-moving packets have less clearance. Longer times, stronger
or finer terrain, larger momenta, or different sigma need renewed domain-size and
convergence checks. CN norm conservation alone does not guarantee accurate phase
or continuum dynamics. Energy conservation is only expected while V is unchanged.

Phase 2's manual browser acceptance was reported by the user (14/14 checks).
The new momentum control has **not** been manually browser-tested in this phase.
Review it by clearing terrain, selecting -1.5/0/+1.5, pressing Reset and then Play:
verify leftward/stationary-centroid/rightward free evolution. Change selection
while playing and confirm there is no instantaneous kick; Reset must apply it,
pause at t=0, and preserve previously painted terrain. Repeat the established
painting/resize/HiDPI/cleanup checks after the added controls. No R/T quantities
or quantitative scattering claims are implemented; that remains Phase 3B.
