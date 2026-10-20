import type { PsiGrid } from './grid';
import { getHamiltonianCoefficients } from './hamiltonian';
import { solveTridiagonal } from './tridiagonal';
import type { Stepper } from './stepper';

/**
 * 1D Crank–Nicolson evolution, hbar=m=1, x_i=x0+i*dx.
 * Uses the three-point finite-difference H with fixed zero Dirichlet endpoints.
 * A real potential is assumed time-independent across steps for energy conservation.
 *
 * Mutates only psi.values' N-2 interior entries, after the entire solve succeeds.
 * Never changes the potential, projects the initial state, or renormalizes.
 * All four endpoint components must be exactly zero (including for dt=0).
 * Finite negative dt is supported for reverse evolution. dt=0 validates then
 * returns without writing. O(N) time and memory; no coefficient caching.
 *
 * The Cayley transform preserves discrete norm and static-H energy in exact
 * arithmetic; finite precision accumulates roundoff. Large dt remains subject
 * to time-discretization phase error, and extreme scales can cause a checked
 * arithmetic/Thomas pivot failure. Unconditional stability is not exact dynamics.
 */
export class CrankNicolsonStepper implements Stepper {
  step(psi: PsiGrid, potential: Float64Array, dt: number): void {
    if (!Number.isFinite(dt)) throw new RangeError('dt must be finite');
    const { diagonal, offDiagonal } = getHamiltonianCoefficients(psi.count, psi.dx, psi.x0, potential);
    if (psi.values.length !== 2 * psi.count) throw new RangeError('psi.values length must equal 2*count');
    for (const value of psi.values) {
      if (!Number.isFinite(value)) throw new RangeError('Input state values must be finite');
    }
    for (const i of [0, 1, 2 * psi.count - 2, 2 * psi.count - 1]) {
      if (psi.values[i] !== 0) throw new RangeError('Dirichlet endpoints must be exactly zero');
    }
    for (const value of [...diagonal, ...offDiagonal]) {
      if (!Number.isFinite(value)) throw new RangeError('Hamiltonian coefficients must be finite; check dx and potential');
    }
    if (dt === 0) return;
    const n = psi.count - 2;
    const main = new Float64Array(2 * n);
    const lower = new Float64Array(2 * (n - 1));
    const upper = new Float64Array(lower.length);
    const rhs = new Float64Array(2 * n);
    const halfDt = dt / 2;
    for (let j = 0; j < n; j++) {
      const i = j + 1;
      const d = halfDt * diagonal[i]!;
      main[2 * j] = 1;
      main[2 * j + 1] = d;
      if (j < n - 1) {
        lower[2 * j + 1] = halfDt * offDiagonal[i]!;
        upper[2 * j + 1] = lower[2 * j + 1]!;
      }
      // B*psi = psi - i*dt*H*psi/2; multiplication by -i
      // maps (real,imag) to (imag,-real). Endpoints are known zero.
      const prev = halfDt * offDiagonal[i - 1]!;
      const next = halfDt * offDiagonal[i]!;
      const hr = d * psi.values[2 * i]! + prev * psi.values[2 * (i - 1)]! + next * psi.values[2 * (i + 1)]!;
      const hi = d * psi.values[2 * i + 1]! + prev * psi.values[2 * (i - 1) + 1]! + next * psi.values[2 * (i + 1) + 1]!;
      rhs[2 * j] = psi.values[2 * i]! + hi;
      rhs[2 * j + 1] = psi.values[2 * i + 1]! - hr;
    }
    // Solver validates constructed arrays and rejects nonfinite results. Commit
    // only after it returns, so validation/numerical failures are atomic.
    const { x } = solveTridiagonal(main, lower, upper, rhs);
    psi.values.set(x, 2);
  }
}
