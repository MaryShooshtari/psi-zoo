# Slice 4A — pure qubit mathematical core

Implementation: `packages/sim-core/src/qubit.ts`. Tests:
`packages/sim-core/tests/qubit.test.ts`. No browser, world, creature, social,
measurement, or Lean functionality is added in this slice.

## Public API and ownership

All exports are available from `@psi-zoo/sim-core`:

- `QubitState`: owned `Float64Array` with exactly four interleaved entries
  `[Re alpha, Im alpha, Re beta, Im beta]`.
- `QubitHamiltonian`: real finite `{ ax, ay, az }`.
- `BlochVector`: readonly Cartesian `{ x, y, z }`.
- `createQubitState(alpha: Complex, beta: Complex)`: copy and normalize finite,
  nonzero amplitudes once. Reuses the existing `Complex` type (`real`, `imag`).
- `createBasisQubit(index: 0 | 1)`: new computational basis state.
- `validateQubitState(state)`: reject invalid length, nonfinite components, or
  squared norm differing from one by more than `1e-10`; never normalize.
- `qubitNormSquared(state)`: raw sum of squares for drift diagnostics. Checks
  length/finiteness but permits non-unit norms; extreme values can overflow.
- `evolveQubit(state, field, dt)`: new state under a field constant over this
  interval. Supports finite negative time. Never mutates or aliases inputs.
- `blochVector(state)`: validate and extract coordinates without normalization
  or clipping. Returns a fresh value object.

`readonly values` prevents property reassignment, not buffer mutation. Callers
may edit their owned buffer but are responsible for preserving its invariant.
The type itself is not a proof of normalization. Evolution and Bloch extraction
validate every input, including zero-time and zero-field calls.

```ts
import { createBasisQubit, evolveQubit, blochVector } from '@psi-zoo/sim-core';

const north = createBasisQubit(0);
const state = evolveQubit(north, { ax: 1, ay: 0, az: 0 }, Math.PI / 4);
const r = blochVector(state); // approximately { x: 0, y: -1, z: 0 }
// north remains unchanged.
```

## Equations and conventions

Dimensionless `hbar = 1`; there is no spatial grid, `dx`, or spatial boundary
condition. The basis order is `|0>, |1>` and the Pauli matrices are

```text
sigma_x = [[0, 1], [1, 0]]
sigma_y = [[0, -i], [i, 0]]
sigma_z = [[1, 0], [0, -1]]
H = ax sigma_x + ay sigma_y + az sigma_z
U(dt) = cos(|a|dt) I - i sin(|a|dt) (a/|a| dot sigma)
```

This is the closed-form exponential, not a time-discretization approximation
for a constant Hamiltonian. There is **no factor 1/2 in H**. Consequently,
`dr/dt = 2 a cross r`: a right-handed Bloch rotation by `2|a|dt`.

```text
rx = 2 Re(conj(alpha) beta)
ry = 2 Im(conj(alpha) beta)
rz = |alpha|^2 - |beta|^2
```

Global phase cancels. For a pure state the extracted radius equals the squared
state norm, so roundoff drift is visible rather than hidden. A zero field or
zero time returns an exact independent copy after validation.

## Tests, tolerances, and measured drift

Tests were written and run before implementation: all 22 initially failed
because the new API did not exist. After implementation:

- `npm run test`: **254 tests passed in 18 files**, including all 232 existing
  tests and 22 qubit tests.
- `npm run typecheck`: passed for both workspaces.
- `npm run build`: passed, including its repeated typecheck.

Analytic axis cases check complex amplitudes, Pauli-y sign, and the factor of
two. General-axis cases use an independent SO(3) Rodrigues rotation. Additional
checks cover both basis states, six signed Bloch directions, extreme initial
amplitude scales, zero field/time, inverse time, composition, global phase,
within-runtime deterministic replay, ownership, and invalid inputs.

Absolute error budgets (double precision, not claimed exact unitarity):

| Check | Tolerance |
| --- | --- |
| Single-step analytic amplitudes/coordinates | `3e-15` |
| General-axis Rodrigues comparison | `5e-15` |
| 100 forward + 100 reverse steps, amplitude error | `1e-13` |
| 10,000 steps: maximum norm drift, radius drift, final rotation error | `2e-11` |
| Input normalized-state acceptance guard | `1e-10` |

Single-step budgets allow a few dozen floating-point operations. The many-step
budget allows accumulated roundoff over 10,000 steps and is deliberately
stricter than the input acceptance guard; it is not a universal error bound.
No evolution step renormalizes. A test deliberately introduces an accepted
small norm deviation and checks that evolution and Bloch extraction retain it.

Measured over 10,000 steps of `dt=0.013`, starting with the normalized state
proportional to `(0.3-0.4i, -0.2+0.7i)`, in the local Node runtime:

| Field `(ax, ay, az)` | Max squared-norm drift from initial | Max Bloch-radius error from 1 |
| --- | --- | --- |
| `(0.7, -1.1, 0.3)` | `4.906e-13` | `4.907e-13` |
| `(0, 0.9, 0)` | `6.361e-13` | `6.364e-13` |

## Limitations

Unitarity is exact mathematically, not in floating point. Longer runs can exceed
the norm guard and will then be rejected rather than silently repaired.
Scaled field arithmetic avoids forming an overflowing field magnitude and
avoids dividing by tiny magnitudes; an unrepresentable accumulated phase is
rejected with `RangeError`. Very large finite phases lose phase accuracy, and
subnormal components/products can underflow. Normalization of extreme initial
amplitude ratios can discard components below representable range.

Repeated execution is deterministic in a given JS runtime; transcendental
functions are not promised bitwise identical across engines. A changing field
can be supplied between calls, but each call assumes a constant Hamiltonian:
no exact time-ordered solution for a continuously varying field is claimed.
This is a single pure qubit, not a mixed state or an entangled joint state.
No connection to creature behavior or formal verification is claimed.

Slice 4A stops here. Any Slice 4B integration requires separate review.
