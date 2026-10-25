import { createPsiGrid, normSquared, type PsiGrid } from './grid';
import { normalize } from './math';

export interface PositionMeasurementResult {
  /** New normalized state; the input state is never mutated. */
  readonly state: PsiGrid;
  readonly index: number;
  readonly position: number;
  /** Gaussian response width in spatial units, NOT a posterior packet width. */
  readonly resolution: number;
  /** Probability mass of the sampled outcome, not a probability density. */
  readonly probability: number;
  /** Outcome masses indexed like the grid, with zero endpoint masses. */
  readonly probabilities: Float64Array;
  readonly inputNormSquared: number;
}

/**
 * Finite-resolution position measurement, hbar=m=1, x_i=x0+i*dx.
 * Allowed inputs AND reported outcomes are interior Dirichlet sites 1..N-2.
 * K(j|i) = exp(-(x_j-x_i)^2/(2*resolution^2)) / Z_i, where Z_i sums
 * over allowed j SEPARATELY for each i (including near the walls).
 * Resolution is the untruncated Gaussian response sigma; truncation/discreteness
 * changes its actual mean and variance near boundaries or below grid scale.
 *
 * Returns P(j)=sum_i w_i K(j|i), w_i=dx*|psi_i|^2/inputNormSquared.
 * These are discrete masses: there is no extra dx in the sum over outcomes.
 * This is a diagonal Gaussian POVM, NOT exact coordinate projection. No DOM,
 * hidden randomness, state mutation, or dependence on the evolution solver.
 * O(N^2) time and O(N) memory; no dense measurement matrix is retained.
 * Nonfinite/zero/underflowed/overflowed input norms are rejected explicitly.
 * Gaussian tails below floating-point range may underflow to zero.
 */
export function positionMeasurementProbabilities(psi: PsiGrid, resolution: number): Float64Array {
  return prepareMeasurement(psi, resolution).probabilities;
}

/**
 * Sample once using the required rng() in [0,1), then apply the positive real
 * Kraus mask sqrt(K(j|i)): psi'_i = sqrt(K(j|i))*psi_i / sqrt(N*P(j)),
 * N=inputNormSquared. Relative complex phases survive wherever the mask is
 * nonzero. A final normalization removes summation roundoff only; endpoints
 * remain exactly zero. The returned state can be passed directly to CN.
 */
export function measurePosition(
  psi: PsiGrid, resolution: number, rng: () => number,
): PositionMeasurementResult {
  const { probabilities, columnSums, response, inputNormSquared } = prepareMeasurement(psi, resolution);
  const draw = rng();
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1) throw new RangeError('RNG must return a finite number in [0, 1)');
  // Sum once more so a rounded total just below 1 cannot leave u near 1
  // outside the CDF. Strict comparison skips zero-mass bins even when u=0.
  const total = probabilities.reduce((a, b) => a + b, 0);
  const target = draw * total;
  let cumulative = 0, index = 1;
  for (let j = 1; j < psi.count - 1; j++) {
    if (probabilities[j]! > 0) index = j; // last positive bin is roundoff fallback
    cumulative += probabilities[j]!;
    if (target < cumulative) break;
  }
  const probability = probabilities[index]!;
  const state = createPsiGrid(psi.count, psi.dx, psi.x0);
  const inputNorm = Math.sqrt(inputNormSquared);
  const outcomeNorm = Math.sqrt(probability);
  for (let i = 1; i < psi.count - 1; i++) {
    const mask = Math.sqrt(response[Math.abs(index - i)]! / columnSums[i]!);
    state.values[2 * i] = (psi.values[2 * i]! / inputNorm) * (mask / outcomeNorm);
    state.values[2 * i + 1] = (psi.values[2 * i + 1]! / inputNorm) * (mask / outcomeNorm);
  }
  const posteriorNorm = normSquared(state);
  if (!Number.isFinite(posteriorNorm) || posteriorNorm <= 0) throw new RangeError('Posterior norm is not representable');
  normalize(state);
  for (const value of state.values) {
    if (!Number.isFinite(value)) throw new RangeError('Posterior values must be finite');
  }
  return {
    state, index, position: psi.x0 + index * psi.dx, resolution,
    probability, probabilities, inputNormSquared,
  };
}

function prepareMeasurement(psi: PsiGrid, resolution: number) {
  if (!Number.isFinite(resolution) || resolution <= 0) throw new RangeError('resolution must be positive and finite');
  if (!Number.isSafeInteger(psi.count) || psi.count < 3 || psi.values.length !== 2 * psi.count
    || !Number.isFinite(psi.dx) || psi.dx <= 0 || !Number.isFinite(psi.x0)
    || !Number.isFinite((psi.count - 1) * psi.dx)
    || !Number.isFinite(psi.x0 + (psi.count - 1) * psi.dx)) {
    throw new RangeError('Invalid grid geometry or state length');
  }
  for (const value of psi.values) {
    if (!Number.isFinite(value)) throw new RangeError('State values must be finite');
  }
  for (const i of [0, 1, 2 * psi.count - 2, 2 * psi.count - 1]) {
    if (psi.values[i] !== 0) throw new RangeError('Dirichlet endpoints must be exactly zero');
  }
  const inputNormSquared = normSquared(psi);
  if (!Number.isFinite(inputNormSquared) || inputNormSquared <= 0) {
    throw new RangeError('Input norm must be positive, finite and representable');
  }
  const response = new Float64Array(psi.count);
  response[0] = 1; // Avoid 0*Infinity for sub-grid resolutions.
  for (let offset = 1; offset < psi.count; offset++) {
    const distance = (offset * psi.dx) / resolution;
    response[offset] = Math.exp(-0.5 * distance * distance);
  }
  const probabilities = new Float64Array(psi.count);
  const columnSums = new Float64Array(psi.count);
  for (let i = 1; i < psi.count - 1; i++) {
    let z = 0;
    for (let j = 1; j < psi.count - 1; j++) z += response[Math.abs(j - i)]!;
    columnSums[i] = z;
    // Divide amplitudes first to avoid overflow when a finite norm has large density.
    const re = psi.values[2 * i]! / Math.sqrt(inputNormSquared);
    const im = psi.values[2 * i + 1]! / Math.sqrt(inputNormSquared);
    const weight = psi.dx * (re * re + im * im);
    for (let j = 1; j < psi.count - 1; j++) {
      probabilities[j]! += weight * (response[Math.abs(j - i)]! / z);
    }
  }
  const total = probabilities.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(total) || total <= 0) throw new RangeError('Outcome probabilities are not representable');
  for (let j = 1; j < psi.count - 1; j++) probabilities[j]! /= total;
  return { probabilities, columnSums, response, inputNormSquared };
}
