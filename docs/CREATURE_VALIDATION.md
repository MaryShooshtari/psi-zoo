# Slice 4B — one Creature and a mood-dependent drive

## Scope and architecture

`packages/web/src/world/creature.ts` is a browser-independent world module in
this repository's documented `web/src/world/` location. It imports only the
public `@psi-zoo/sim-core` API. Core mathematics does not depend on the world.
No playback, React, Canvas, measurement, social, or Lean code is changed.
There is no browser integration in 4B; the existing controller still behaves
exactly as before. No new package or dependency is needed.

## API and lifecycle

Exports from the module:

- `CreatureDrive`: `{ forceScale }`, a nonnegative finite force magnitude F0.
- `CreatureOptions`: `{ psi, mood, moodHamiltonian, drive, timeStep? }`.
- `CreatureSnapshot`: copied spatial/mood states and configuration, plus `time`.
- `Creature`: construct with options; use `step(terrain)`, `snapshot()`,
  `potential(terrain)`, and readonly `timeStep` / `xRef`.

Construction copies both numerical buffers and configuration objects. Initial
spatial and qubit squared norms must be within `1e-10` of one; nothing is
silently normalized or repaired. Spatial endpoints must already be exactly
zero. Core validation checks geometry, finite components, qubit Hamiltonian,
and representable spatial Hamiltonian coefficients. Drive magnitude must be
finite/nonnegative; dt must be finite/positive with a nonzero representable
half-step. Default dt is `0.01`, matching ordinary playback. A caller using a
different fixed physics timestep supplies it once during construction.

Each `step` advances both states by that fixed dt. Time is integer step count
multiplied by dt, not accumulated wall time. Neither terrain nor snapshots are
retained as mutable aliases. Snapshots and diagnostic potentials are independent
copies. A failed step leaves both owned states and time unchanged. Create a new
Creature to reset or change its initial conditions, configuration, or grid.
There are no timers or external resources to dispose.

## Coupling and timestep ordering

Dimensionless units: `hbar=m=1`. Caller-selected uniform grid:

```text
x_i = x0 + i*dx, i=0,...,N-1
x_ref = x0 + (N-1)*dx/2              (fixed domain center)
F(t) = F0 * rz(t)
V_mood(x,t) = -F(t) * (x-x_ref)
V_total = V_terrain + V_mood
H_spatial = -(1/2) D_xx + V_total
```

The existing three-point spatial Hamiltonian and CN solver use fixed zero
Dirichlet endpoints. Potential samples, including endpoint samples, may be
positive or negative; all terrain and composed values must be finite. Terrain
is added into fresh storage without mutation. Overflow is rejected, not capped.
The potential's negative gradient is `+F`; positive rz drives toward increasing
x. The reference coordinate is a fixed potential-energy offset convention,
not the packet position and never an instruction to move the packet.

For a step from t to t+dt:

1. Compute the midpoint mood `q_mid = evolveQubit(q_t, H_mood, dt/2)`.
2. Sample `F_mid = F0 * blochVector(q_mid).z`.
3. Compose terrain with `-F_mid*(x_i-x_ref)`. Terrain is fixed over this call.
4. Compute endpoint mood `q_next = evolveQubit(q_t, H_mood, dt)`.
5. Apply the existing `CrankNicolsonStepper` to a temporary spatial copy using
   the midpoint total potential for the whole dt.
6. Commit both endpoint states and increment the step count only on success.

`potential(terrain)` uses the CURRENT endpoint mood for energy/force diagnostics,
not the midpoint mood of the next step. No position translation, manual density
update, interpolation, or per-step normalization is performed.

Constant-field qubit evolution uses the 4A exponential. Midpoint potential
sampling plus CN gives a second-order time approximation of the driven spatial
equation for smooth mood evolution and fixed terrain. It is not the exact
time-ordered spatial propagator.

## Numerical validation

Tests were added before implementation. The initial test command failed at
import with `Cannot find module './creature'`, as expected before the new module
existed. After implementation:

- `npm run test`: **267 tests passed in 19 files** (254 existing + 13 Creature).
- `npm run typecheck`: passed for both workspaces.
- `npm run build`: passed, including its repeated typecheck.
- Separate strict ES2022-only compilation of the Creature and its core imports,
  with no DOM library or ambient type packages: **zero diagnostics**.

Tests cover owned buffers/configuration/snapshots, lifecycle, zero-drive exact
agreement with the existing CN solver for both free and nonuniform external
potentials, additive signed terrain on an offset grid, force directions,
analytic midpoint precession, trajectories, temporal convergence, spatial/qubit
norms, Bloch radius, static versus time-dependent energy, deterministic replay,
input errors, and atomic composition/solver failure.

Trajectory tests use a normalized, stationary Gaussian with density sigma=1,
`dx=0.1` on `[-20,20]`, dt=0.01, and F0=0.4. At t=2, local measured results:

| Mood/drive | Mean x | Mean lattice momentum |
| --- | --- | --- |
| rz=+1, static | 0.7985663342 | 0.7981445150 |
| rz=-1, static | -0.7985663342 | -0.7981445150 |
| Zero drive | -6.26e-16 | -4.01e-16 |
| Initially rz=+1, H_mood=0.8 sigma_x | 0.3118125312 | -0.0145744112 |

Static continuum references are x=F*t^2/2 and p=F*t; absolute tolerance `0.005`
allows finite-difference dispersion and CN error, not roundoff. With
`H_mood=w sigma_x`, the independent references are

```text
F(t) = F0*cos(2*w*t)
p(t) = F0*sin(2*w*t)/(2*w)
x(t) = F0*(1-cos(2*w*t))/(4*w^2)
```

The precessing trajectory agrees within `0.002` in x and p. These comparisons
are before wall interactions; no continuum-accuracy claim is made after
reflection. Direct analytic midpoint potential comparison uses `8e-14`, and
repeated full-state comparison to CN with that independently prescribed
potential uses `2e-14`.

At t=1, maximum complex-component errors versus a dt=0.0025 solution on the
same grid were `3.22376e-5` for dt=0.04 and `7.96847e-6` for dt=0.02. Their ratio
was **4.04565**, inside the tested `[3.8,4.3]` second-order range. This isolates
temporal convergence; it does not remove spatial discretization error.

Over 1,000 steps with field `(0.7,-0.3,0.2)`, maximum absolute errors from one
were measured as:

| Quantity | Measured maximum | Test budget |
| --- | --- | --- |
| Spatial squared norm | 4.22e-15 | 5e-12 |
| Qubit squared norm | 2.68e-14 | 2e-12 |
| Bloch radius | 2.69e-14 | 2e-12 |

The budgets allow accumulated double-precision roundoff; they are not exact
unitarity claims or universal bounds for arbitrarily long runs. Endpoint zeros
and unchanged terrain are also checked. Repeated inputs are bit-for-bit
reproducible within the tested runtime, not guaranteed across JS engines.

Standalone measurement/compile probes initially omitted the repository's source
alias and failed with `CrankNicolsonStepper is not a constructor` / TypeScript
`TS2305` missing exports. Rerunning with the same source alias used by the
existing tests and web tsconfig succeeded. No dependency changes were made.

## Norm, energy, and model limitations

Each real midpoint potential defines a Hermitian discrete Hamiltonian, so its
CN step preserves spatial norm in exact arithmetic. Successive different
Hermitian Hamiltonians still preserve norm; they do NOT generally conserve the
instantaneous spatial energy. For a fixed total H the static-energy test passes
within `2e-12` (measured change about `-3.05e-16`). With precessing mood, measured
instantaneous spatial energy changed by about `0.12462` over t=2, while norm
remained stable. Such a change is physical driving, not automatically solver
drift. Arbitrary between-step terrain edits likewise need not conserve energy.

This is a deliberately one-way, expectation-value-based game coupling: mood
sets a classical spatial force, with no backreaction from position to mood.
It is NOT a jointly evolved position-qubit tensor-product interaction, does not
generate entanglement, and makes no closed-system total-energy conservation
claim. Large forces can drive the packet toward lattice/Nyquist scales or walls;
large dt can introduce substantial phase error despite norm stability. Numerical
accuracy requires resolved dx/dt and suitable domains. Extreme scales may cause
checked overflow or underflow as described in the core modules. Defensive copies
and temporary solver state cost O(N) storage/work per step and snapshot.

4B stops here; browser integration, a second creature, and 4C require review.
