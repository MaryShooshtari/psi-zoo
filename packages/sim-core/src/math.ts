/** Dimensionless units: hbar = 1, mass = 1. Complex math utilities for wavefunctions. */
import type { PsiGrid } from './grid';

/** Complex number representation for return values. */
export interface Complex {
  readonly real: number;
  readonly imag: number;
}

/**
 * Computes the complex inner product of two wavefunctions.
 * ⟨psi1|psi2⟩ = dx * sum_i (psi1_i)* * psi2_i
 * where (psi1_i)* is the complex conjugate of psi1 at position i.
 * 
 * The wavefunctions must have the same count and dx values.
 */
export function innerProduct(psi1: PsiGrid, psi2: PsiGrid): Complex {
  if (psi1.count !== psi2.count) {
    throw new RangeError(`Grid count mismatch: ${psi1.count} vs ${psi2.count}`);
  }
  if (psi1.dx !== psi2.dx) {
    throw new RangeError(`Grid spacing mismatch: ${psi1.dx} vs ${psi2.dx}`);
  }

  let realSum = 0;
  let imagSum = 0;

  for (let i = 0; i < psi1.count; i++) {
    // psi1 at position i: re1 + im1 * i
    const re1 = psi1.values[2 * i]!;
    const im1 = psi1.values[2 * i + 1]!;
    
    // psi2 at position i: re2 + im2 * i
    const re2 = psi2.values[2 * i]!;
    const im2 = psi2.values[2 * i + 1]!;
    
    // (psi1_i)* * psi2_i = (re1 - im1 * i) * (re2 + im2 * i)
    // = re1 * re2 + re1 * im2 * i - im1 * re2 * i - im1 * im2 * i²
    // = (re1 * re2 + im1 * im2) + (re1 * im2 - im1 * re2) * i
    realSum += re1 * re2 + im1 * im2;
    imagSum += re1 * im2 - im1 * re2;
  }

  return {
    real: psi1.dx * realSum,
    imag: psi1.dx * imagSum,
  };
}

/**
 * Normalizes a wavefunction to have norm squared equal to 1.
 * Modifies the wavefunction in place.
 * 
 * For a zero wavefunction, this is a no-op.
 */
export function normalize(psi: PsiGrid): void {
  let sum = 0;
  for (let i = 0; i < psi.count; i++) {
    const re = psi.values[2 * i]!;
    const im = psi.values[2 * i + 1]!;
    sum += re * re + im * im;
  }

  const normSquared = psi.dx * sum;
  
  if (normSquared === 0) {
    // Zero wavefunction - nothing to normalize
    return;
  }

  const norm = Math.sqrt(normSquared);
  const scale = 1 / norm;

  for (let i = 0; i < psi.count; i++) {
    psi.values[2 * i]! *= scale;
    psi.values[2 * i + 1]! *= scale;
  }
}

/**
 * Computes the expectation value ⟨psi1|O|psi2⟩ where O is represented by psi2.
 * This is equivalent to innerProduct(psi1, psi2) when O is the identity.
 * 
 * More generally, this computes ⟨psi1|psi2⟩ which is the expectation of the
 * operator that projects onto psi2, when psi1 is the state.
 */
export function expectationValue(psi1: PsiGrid, psi2: PsiGrid): Complex {
  return innerProduct(psi1, psi2);
}

/**
 * Computes the expectation value of position ⟨x⟩ for a wavefunction.
 * ⟨x⟩ = sum_i (x_i * |psi_i|² * dx) / sum_i (|psi_i|² * dx)
 * where x_i = x0 + i * dx.
 */
export function positionExpectation(psi: PsiGrid): number {
  let sum = 0;
  let normSq = 0;

  for (let i = 0; i < psi.count; i++) {
    const x = psi.x0 + i * psi.dx;
    const re = psi.values[2 * i]!;
    const im = psi.values[2 * i + 1]!;
    const prob = re * re + im * im;
    
    sum += x * prob;
    normSq += prob;
  }

  // Both sum and normSq need to be multiplied by dx
  return (psi.dx * sum) / (psi.dx * normSq);
}

/**
 * Computes the expectation value of momentum ⟨p⟩ for a wavefunction.
 * In position space, p = -i * d/dx (with hbar = 1).
 * For a discrete grid, we use the finite difference approximation.
 * 
 * This uses Dirichlet boundary conditions (psi = 0 at boundaries).
 */
export function momentumExpectation(psi: PsiGrid): number {
  let sumReal = 0;
  let sumImag = 0;
  let normSq = 0;

  // Compute norm squared
  for (let i = 0; i < psi.count; i++) {
    const re = psi.values[2 * i]!;
    const im = psi.values[2 * i + 1]!;
    normSq += re * re + im * im;
  }
  normSq *= psi.dx;

  if (normSq === 0) {
    return 0;
  }

  // Compute ⟨psi| d/dx |psi⟩ using central difference
  // d/dx psi_i ≈ (psi_{i+1} - psi_{i-1}) / (2*dx)
  // We use Dirichlet boundaries: psi_{-1} = psi_{N} = 0
  for (let i = 0; i < psi.count; i++) {
    const psiRe = psi.values[2 * i]!;
    const psiIm = psi.values[2 * i + 1]!;
    
    // Get psi_{i+1} and psi_{i-1} with Dirichlet boundaries
    const psiNextRe = (i < psi.count - 1) ? psi.values[2 * (i + 1)]! : 0;
    const psiNextIm = (i < psi.count - 1) ? psi.values[2 * (i + 1) + 1]! : 0;
    const psiPrevRe = (i > 0) ? psi.values[2 * (i - 1)]! : 0;
    const psiPrevIm = (i > 0) ? psi.values[2 * (i - 1) + 1]! : 0;
    
    // d/dx psi_i = (psi_{i+1} - psi_{i-1}) / (2*dx)
    const dpsiRe = (psiNextRe - psiPrevRe) / (2 * psi.dx);
    const dpsiIm = (psiNextIm - psiPrevIm) / (2 * psi.dx);
    
    // ⟨psi| d/dx |psi⟩ contribution: psi_i* * d/dx psi_i
    // = (psiRe - psiIm * i) * (dpsiRe + dpsiIm * i)
    // = psiRe * dpsiRe + psiRe * dpsiIm * i - psiIm * dpsiRe * i - psiIm * dpsiIm * i²
    // = (psiRe * dpsiRe + psiIm * dpsiIm) + (psiRe * dpsiIm - psiIm * dpsiRe) * i
    sumReal += psiRe * dpsiRe + psiIm * dpsiIm;
    sumImag += psiRe * dpsiIm - psiIm * dpsiRe;
  }

  // ⟨p⟩ = -i * ⟨psi| d/dx |psi⟩ / ⟨psi|psi⟩
  // ⟨psi| d/dx |psi⟩ = dx * (sumReal + i * sumImag)
  // -i * (a + bi) = b - a*i, so the real part is b
  // ⟨p⟩ = dx * sumImag / normSq
  
  return (psi.dx * sumImag) / normSq;
}

/**
 * Computes the variance of position Var(x) = ⟨x²⟩ - ⟨x⟩².
 */
export function positionVariance(psi: PsiGrid): number {
  let sumX = 0;
  let sumX2 = 0;
  let normSq = 0;

  for (let i = 0; i < psi.count; i++) {
    const x = psi.x0 + i * psi.dx;
    const re = psi.values[2 * i]!;
    const im = psi.values[2 * i + 1]!;
    const prob = re * re + im * im;
    
    sumX += x * prob;
    sumX2 += x * x * prob;
    normSq += prob;
  }

  const dx = psi.dx;
  const meanX = (dx * sumX) / (dx * normSq);
  const meanX2 = (dx * sumX2) / (dx * normSq);
  
  return meanX2 - meanX * meanX;
}

/**
 * Computes the variance of momentum Var(p) = ⟨p²⟩ - ⟨p⟩².
 * For a wavefunction in position space, p² = -d²/dx² (with hbar = 1).
 */
export function momentumVariance(psi: PsiGrid): number {
  const meanP = momentumExpectation(psi);
  
  // Compute ⟨p²⟩ = ⟨psi| -d²/dx² |psi⟩ / ⟨psi|psi⟩
  // -d²/dx² psi_i ≈ -(psi_{i+1} - 2*psi_i + psi_{i-1}) / dx²
  
  let sumP2 = 0;
  let normSq = 0;

  // Compute norm squared
  for (let i = 0; i < psi.count; i++) {
    const re = psi.values[2 * i]!;
    const im = psi.values[2 * i + 1]!;
    normSq += re * re + im * im;
  }
  normSq *= psi.dx;

  if (normSq === 0) {
    return 0;
  }

  // Compute ⟨psi| -d²/dx² |psi⟩
  for (let i = 0; i < psi.count; i++) {
    const psiRe = psi.values[2 * i]!;
    const psiIm = psi.values[2 * i + 1]!;
    
    // Get neighbors with Dirichlet boundaries
    const psiNextRe = (i < psi.count - 1) ? psi.values[2 * (i + 1)]! : 0;
    const psiNextIm = (i < psi.count - 1) ? psi.values[2 * (i + 1) + 1]! : 0;
    const psiPrevRe = (i > 0) ? psi.values[2 * (i - 1)]! : 0;
    const psiPrevIm = (i > 0) ? psi.values[2 * (i - 1) + 1]! : 0;
    
    // d²/dx² psi_i ≈ (psi_{i+1} - 2*psi_i + psi_{i-1}) / dx²
    const d2psiRe = (psiNextRe - 2 * psiRe + psiPrevRe) / (psi.dx * psi.dx);
    const d2psiIm = (psiNextIm - 2 * psiIm + psiPrevIm) / (psi.dx * psi.dx);
    
    // -d²/dx² psi_i
    const negD2psiRe = -d2psiRe;
    const negD2psiIm = -d2psiIm;
    
    // psi_i* * (-d²/dx² psi_i)
    sumP2 += psiRe * negD2psiRe + psiIm * negD2psiIm;
  }

  // ⟨psi| -d²/dx² |psi⟩ = dx * sum_i psi_i* * (-d²/dx² psi_i)
  const p2Expectation = (psi.dx * sumP2) / normSq;
  
  return p2Expectation - meanP * meanP;
}
