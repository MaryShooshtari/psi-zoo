/** Dimensionless units: hbar = 1, mass = 1. One-dimensional uniform grid. */
export interface PsiGrid {
  readonly count: number;
  readonly x0: number;
  readonly dx: number;
  /** Interleaved real/imaginary values: [re0, im0, re1, im1, ...]. */
  readonly values: Float64Array;
}

export function createPsiGrid(count: number, dx: number, x0 = 0): PsiGrid {
  if (!Number.isInteger(count) || count < 3) {
    throw new RangeError('count must be an integer >= 3');
  }
  if (!Number.isFinite(dx) || dx <= 0 || !Number.isFinite(x0)) {
    throw new RangeError('dx must be positive and finite, x0 finite');
  }
  return { count, dx, x0, values: new Float64Array(2 * count) };
}

/** Discrete spatial norm: dx * sum_i |psi_i|^2. */
export function normSquared(psi: PsiGrid): number {
  let sum = 0;
  for (let i = 0; i < psi.count; i += 1) {
    const re = psi.values[2 * i] ?? 0;
    const im = psi.values[2 * i + 1] ?? 0;
    sum += re * re + im * im;
  }
  return psi.dx * sum;
}
