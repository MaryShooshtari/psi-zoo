import type { Complex } from './math';

export interface TridiagonalSolution {
  /** Newly allocated solution, interleaved [real, imaginary, ...]. */
  readonly x: Float64Array;
}

// Scale the denominator before division; never square its original magnitude.
function divide(ar: number, ai: number, br: number, bi: number): Complex {
  const scale = Math.max(Math.abs(br), Math.abs(bi));
  const r = br / scale, s = bi / scale;
  const denominator = r * r + s * s;
  const real = ((ar / scale) * r + (ai / scale) * s) / denominator;
  const imag = ((ai / scale) * r - (ar / scale) * s) / denominator;
  finite(real, imag);
  return { real, imag };
}

function finite(real: number, imag: number): void {
  if (!Number.isFinite(real) || !Number.isFinite(imag)) {
    throw new RangeError('Nonfinite intermediate or solution in tridiagonal solve');
  }
}

/**
 * Solve A*x=rhs in O(N) time and O(N) auxiliary memory, without mutating inputs.
 * All arrays contain interleaved complex entries. mainDiag and rhs have N entries;
 * lowerDiag[j]=A[j+1,j] and upperDiag[j]=A[j,j+1] have N-1 entries. N must be >=1.
 *
 * Uses normalized Thomas elimination: p_i=b_i-a_i*c'_{i-1},
 * c'_i=c_i/p_i, d'_i=(rhs_i-a_i*d'_{i-1})/p_i;
 * back substitution is x_i=d'_i-c'_i*x_{i+1}.
 *
 * NO PIVOTING: this is not guaranteed stable for every nonsingular matrix.
 * Rejects pivots whose max-component magnitude is <=32*Number.EPSILON times
 * the largest max-component magnitude in the original row or its elimination
 * correction. No absolute unit-scale floor is used, so uniform rescaling does
 * not change the policy (apart from floating-point range limits). Zero pivots
 * and nonfinite intermediates/results throw RangeError. This guard is not a
 * condition-number estimate or a guarantee of forward accuracy.
 */
export function solveTridiagonal(
  mainDiag: Float64Array,
  lowerDiag: Float64Array,
  upperDiag: Float64Array,
  rhs: Float64Array,
): TridiagonalSolution {
  const n = mainDiag.length / 2;
  if (!Number.isInteger(n) || n < 1 || rhs.length !== 2 * n ||
      lowerDiag.length !== 2 * (n - 1) || upperDiag.length !== 2 * (n - 1)) {
    throw new RangeError('Expected N>=1 complex diagonal/rhs entries and N-1 lower/upper entries');
  }
  for (const array of [mainDiag, lowerDiag, upperDiag, rhs]) {
    for (const value of array) {
      if (!Number.isFinite(value)) throw new RangeError('Tridiagonal inputs must be finite');
    }
  }
  const c = new Float64Array(upperDiag.length);
  // Normalized RHS workspace becomes the output during backward substitution.
  const x = new Float64Array(rhs.length);
  for (let i = 0; i < n; i++) {
    const j = 2 * i;
    const br = mainDiag[j]!, bi = mainDiag[j + 1]!;
    const ar = i > 0 ? lowerDiag[j - 2]! : 0;
    const ai = i > 0 ? lowerDiag[j - 1]! : 0;
    const cr = i < n - 1 ? upperDiag[j]! : 0;
    const ci = i < n - 1 ? upperDiag[j + 1]! : 0;
    const correctionRe = i > 0 ? ar * c[j - 2]! - ai * c[j - 1]! : 0;
    const correctionIm = i > 0 ? ar * c[j - 1]! + ai * c[j - 2]! : 0;
    const pr = br - correctionRe, pi = bi - correctionIm;
    finite(pr, pi);
    const scale = Math.max(Math.abs(br), Math.abs(bi), Math.abs(ar), Math.abs(ai),
      Math.abs(cr), Math.abs(ci), Math.abs(correctionRe), Math.abs(correctionIm));
    const pivot = Math.max(Math.abs(pr), Math.abs(pi));
    if (pivot === 0 || pivot / scale <= 32 * Number.EPSILON) {
      throw new RangeError(`Unsafe pivot at index ${i} (no pivoting)`);
    }
    if (i < n - 1) {
      const value = divide(cr, ci, pr, pi);
      c[j] = value.real; c[j + 1] = value.imag;
    }
    const rr = rhs[j]! - (i > 0 ? ar * x[j - 2]! - ai * x[j - 1]! : 0);
    const ri = rhs[j + 1]! - (i > 0 ? ar * x[j - 1]! + ai * x[j - 2]! : 0);
    const value = divide(rr, ri, pr, pi);
    x[j] = value.real; x[j + 1] = value.imag;
  }
  for (let i = n - 2; i >= 0; i--) {
    const j = 2 * i;
    const real = x[j]! - (c[j]! * x[j + 2]! - c[j + 1]! * x[j + 3]!);
    const imag = x[j + 1]! - (c[j]! * x[j + 3]! + c[j + 1]! * x[j + 2]!);
    finite(real, imag);
    x[j] = real; x[j + 1] = imag;
  }
  return { x };
}
