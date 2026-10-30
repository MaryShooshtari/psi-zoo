import { validatePotential2D, validateState2D, type PsiGrid2D } from './grid2d';

/** Area-weighted squared norm. Does not require normalized input. */
export function normSquared2D(g: PsiGrid2D): number {
  validateState2D(g);
  let sum = 0;
  for (let k = 0; k < g.values.length; k += 2) sum += g.values[k]! ** 2 + g.values[k + 1]! ** 2;
  return sum * g.dx * g.dy;
}
/** Normalize in place; zero/nonfinite norm is an error (not a physical state). */
export function normalize2D(g: PsiGrid2D): void {
  const n = normSquared2D(g);
  if (!Number.isFinite(n) || n <= 0) throw new RangeError('Cannot normalize zero or nonfinite 2D norm');
  const scale = 1 / Math.sqrt(n);
  for (let k = 0; k < g.values.length; k++) g.values[k]! *= scale;
}
/** Density, not cell probability. No normalization requirement. Optional reusable output. */
export function probabilityDensity2D(g: PsiGrid2D, out: Float64Array = new Float64Array(g.nx * g.ny)): Float64Array {
  validateState2D(g);
  if (out.length !== g.nx * g.ny || out.buffer === g.values.buffer) throw new RangeError('Density output must be disjoint and have nx*ny entries');
  for (let k = 0; k < out.length; k++) out[k] = g.values[2 * k]! ** 2 + g.values[2 * k + 1]! ** 2;
  return out;
}
/** Centroid only: same norm/mean summation as positionMoments2D, without the
 * centered variance pass. Used when an interaction needs no displayed widths. */
export function positionMean2D(g: PsiGrid2D) {
  const norm = normSquared2D(g);
  if (!Number.isFinite(norm) || norm <= 0) throw new RangeError('Position moments require a finite positive norm');
  let x = 0, y = 0;
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const k = 2 * (j * g.nx + i), p = (g.values[k]! ** 2 + g.values[k + 1]! ** 2) * g.dx * g.dy / norm;
    x += (g.xmin + (i + 1) * g.dx) * p; y += (g.ymin + (j + 1) * g.dy) * p;
  }
  return { norm, x, y };
}
/** Divides by norm: accepts any finite, nonzero state, not only normalized states. */
export function positionMoments2D(g: PsiGrid2D) {
  const { norm, x, y } = positionMean2D(g);
  // Centered second pass avoids subtracting nearly equal large raw moments.
  let vx = 0, vy = 0;
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const k = 2 * (j * g.nx + i), p = (g.values[k]! ** 2 + g.values[k + 1]! ** 2) * g.dx * g.dy / norm;
    vx += (g.xmin + (i + 1) * g.dx - x) ** 2 * p; vy += (g.ymin + (j + 1) * g.dy - y) ** 2 * p;
  }
  // Expose the already-computed norm so diagnostics need not scan/validate again.
  return { norm, x, y, varianceX: vx, varianceY: vy, sigmaX: Math.sqrt(vx), sigmaY: Math.sqrt(vy) };
}
/** Real <psi|H_discrete|psi>, NOT divided by norm; normalized input for physical energy.
 * Edge-form kinetic quadratic form includes both zero Dirichlet boundary edges.
 * This is algebraically the same three-point Laplacian as the propagator and
 * makes its Hermitian real expectation explicit without a spurious imaginary part.
 */
export function energyExpectation2D(g: PsiGrid2D, potential: Float64Array): number {
  validateState2D(g); validatePotential2D(g, potential);
  let sum = 0;
  const a = g.values;
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const cell = j * g.nx + i, k = 2 * cell;
    sum += potential[cell]! * (a[k]! ** 2 + a[k + 1]! ** 2);
    for (let c = 0; c < 2; c++) {
      const v = a[k + c]!;
      sum += (v - (i > 0 ? a[k + c - 2]! : 0)) ** 2 / (2 * g.dx ** 2);
      sum += (v - (j > 0 ? a[k + c - 2 * g.nx]! : 0)) ** 2 / (2 * g.dy ** 2);
      if (i === g.nx - 1) sum += v * v / (2 * g.dx ** 2);
      if (j === g.ny - 1) sum += v * v / (2 * g.dy ** 2);
    }
  }
  return sum * g.dx * g.dy;
}
