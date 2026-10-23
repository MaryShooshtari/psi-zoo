/** Dimensionless units: hbar = m = 1. Real, nonnegative 1D barrier landscapes. */
import type { PsiGrid } from './grid';

/** Same geometry as PsiGrid; wavefunction storage is neither needed nor touched. */
export type PotentialGrid = Pick<PsiGrid, 'count' | 'dx' | 'x0'>;

export interface GaussianBrush {
  /** Peak potential energy A, finite and >= 0. */
  readonly amplitude: number;
  /** Spatial width sigma, finite and > 0 (not a wavefunction width). */
  readonly sigma: number;
}

export interface GaussianBarrier extends GaussianBrush {
  /** Physical coordinate, finite; may lie outside the sampled domain. */
  readonly center: number;
}

function validateGrid(grid: PotentialGrid): void {
  if (!Number.isSafeInteger(grid.count) || grid.count < 3) {
    throw new RangeError('count must be a safe integer >= 3');
  }
  if (!Number.isFinite(grid.dx) || grid.dx <= 0 || !Number.isFinite(grid.x0)) {
    throw new RangeError('dx must be positive and finite, x0 finite');
  }
  const span = (grid.count - 1) * grid.dx;
  if (!Number.isFinite(span) || !Number.isFinite(grid.x0 + span)) {
    throw new RangeError('grid extent and endpoint must be finite');
  }
}

function validateBrush(brush: GaussianBrush): void {
  if (!Number.isFinite(brush.amplitude) || brush.amplitude < 0) {
    throw new RangeError('amplitude must be nonnegative and finite');
  }
  if (!Number.isFinite(brush.sigma) || brush.sigma <= 0) {
    throw new RangeError('sigma must be positive and finite');
  }
}

function validatePosition(position: number): void {
  if (!Number.isFinite(position)) throw new RangeError('position must be finite');
}

/** Avoid sigma^2 under/overflow, and recover if subtraction itself overflows. */
function gaussianAt(x: number, center: number, brush: GaussianBrush): number {
  const difference = x - center;
  const z = Number.isFinite(difference)
    ? difference / brush.sigma
    : x / brush.sigma - center / brush.sigma;
  return brush.amplitude * Math.exp(-0.5 * z * z);
}

/** Allocate N zeros at x_i = x0 + i*dx, including both Dirichlet endpoints. */
export function createZeroPotential(grid: PotentialGrid): Float64Array {
  validateGrid(grid);
  return new Float64Array(grid.count);
}

/**
 * Sample V(x) = A exp(-(x-center)^2/(2 sigma^2)); bounded by A.
 * No normalization: off-grid centers may have sampled peaks below A. Profiles
 * are clipped to the domain, never wrapped or shifted inward. Endpoint V may
 * be nonzero: Dirichlet conditions constrain psi, not V.
 */
export function createGaussianBarrier(grid: PotentialGrid, barrier: GaussianBarrier): Float64Array {
  validateGrid(grid);
  validateBrush(barrier);
  validatePosition(barrier.center);
  const potential = new Float64Array(grid.count);
  for (let i = 0; i < grid.count; i++) {
    potential[i] = gaussianAt(grid.x0 + i * grid.dx, barrier.center, barrier);
  }
  return potential;
}

/**
 * Raise an existing landscape in place with one Gaussian, using max, not sum.
 * Repeated stamps are idempotent. Same cap/validation contract as path painting.
 */
export function stampGaussianPotential(
  grid: PotentialGrid,
  potential: Float64Array,
  barrier: GaussianBarrier,
  maxHeight: number,
): void {
  paintGaussianPath(grid, potential, barrier, barrier.center, barrier.center, maxHeight);
}

/**
 * Sweep a fixed brush along the linearly interpolated segment from -> to.
 * At each x, max over all interpolated centers equals a Gaussian evaluated at
 * the distance to [min(from,to), max(from,to)]. This exact continuous envelope
 * avoids sampling gaps and is independent of segment subdivision/direction or
 * repeated events for the same traversed path and fixed brush settings.
 *
 * Mutates only potential; O(N) time, O(1) extra storage, no per-stamp allocation.
 * All inputs are checked before writing. The finite positive maxHeight is an
 * explicit caller-chosen cap: amplitude and existing values must already lie
 * in [0,maxHeight], otherwise throw RangeError (no silent terrain truncation).
 * Negative wells are intentionally outside this positive-barrier painting API;
 * the existing Hamiltonian/Stepper still accept general finite real potentials.
 * Off-domain positions are allowed; only their in-domain profile is sampled.
 */
export function paintGaussianPath(
  grid: PotentialGrid,
  potential: Float64Array,
  brush: GaussianBrush,
  from: number,
  to: number,
  maxHeight: number,
): void {
  validateGrid(grid);
  validateBrush(brush);
  validatePosition(from);
  validatePosition(to);
  if (!Number.isFinite(maxHeight) || maxHeight <= 0 || brush.amplitude > maxHeight) {
    throw new RangeError('maxHeight must be positive and finite, and >= amplitude');
  }
  if (potential.length !== grid.count) {
    throw new RangeError('potential length must equal count');
  }
  for (const value of potential) {
    if (!Number.isFinite(value) || value < 0 || value > maxHeight) {
      throw new RangeError('potential values must be finite and in [0, maxHeight]');
    }
  }
  const left = Math.min(from, to), right = Math.max(from, to);
  for (let i = 0; i < grid.count; i++) {
    const x = grid.x0 + i * grid.dx;
    const closestCenter = Math.max(left, Math.min(x, right));
    potential[i] = Math.max(potential[i]!, gaussianAt(x, closestCenter, brush));
  }
}
