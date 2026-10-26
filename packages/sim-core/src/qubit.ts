/** Pure two-level quantum math, hbar=1. No spatial grid or boundary conditions. */
import type { Complex } from './math';

/**
 * |psi> = alpha|0> + beta|1>, with |alpha|^2 + |beta|^2 approximately 1.
 * Interleaved storage: [Re alpha, Im alpha, Re beta, Im beta]. No dx weight.
 * Constructors and evolution allocate owned storage and never alias inputs.
 * The property is readonly, NOT its buffer: callers may edit values but must
 * preserve the invariant. Evolution/Bloch extraction validate it on every call.
 */
export interface QubitState {
  readonly values: Float64Array;
}

/** Real finite coefficients in H = ax*sigma_x + ay*sigma_y + az*sigma_z. */
export interface QubitHamiltonian {
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
}

/** Cartesian expectation values of the standard Pauli matrices. */
export interface BlochVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

// An acceptance guard, not a correction or a universal long-run error bound.
const NORM_TOLERANCE = 1e-10;

/**
 * Normalize finite nonzero complex amplitudes ONCE into new owned storage.
 * Scaled arithmetic avoids overflowing/underflowing the input sum of squares.
 * Relative components below floating-point range may underflow to zero.
 * Zero or nonfinite amplitudes throw RangeError; inputs are never mutated.
 */
export function createQubitState(alpha: Complex, beta: Complex): QubitState {
  const values = new Float64Array([alpha.real, alpha.imag, beta.real, beta.imag]);
  if (!values.every(Number.isFinite)) throw new RangeError('Qubit amplitudes must be finite');
  const scale = Math.max(...values.map(Math.abs));
  if (scale === 0) throw new RangeError('Qubit amplitudes must not all be zero');
  for (let i = 0; i < 4; i++) values[i]! /= scale;
  const length = Math.hypot(...values);
  for (let i = 0; i < 4; i++) values[i]! /= length;
  return { values };
}

/** New standard computational basis state |0>=(1,0) or |1>=(0,1). */
export function createBasisQubit(index: 0 | 1): QubitState {
  if (index !== 0 && index !== 1) throw new RangeError('Qubit basis index must be 0 or 1');
  const values = new Float64Array(4);
  values[2 * index] = 1;
  return { values };
}

/**
 * Raw sum of squared amplitudes, without normalization or dx weighting.
 * Checks length/finiteness, but deliberately permits non-unit norms for drift
 * diagnostics (an extreme finite input may yield Infinity through overflow).
 */
export function qubitNormSquared(state: QubitState): number {
  const v = state.values;
  if (v.length !== 4) throw new RangeError('Qubit state length must equal 4');
  if (!v.every(Number.isFinite)) throw new RangeError('Qubit amplitudes must be finite');
  return v[0]! ** 2 + v[1]! ** 2 + v[2]! ** 2 + v[3]! ** 2;
}

/**
 * Throw RangeError unless there are four finite components and |norm^2-1|
 * <= 1e-10. Never normalize: accumulated numerical drift remains observable.
 * This structural type is not a compile-time proof of normalization.
 */
export function validateQubitState(state: QubitState): void {
  const norm = qubitNormSquared(state);
  if (!Number.isFinite(norm) || Math.abs(norm - 1) > NORM_TOLERANCE) {
    throw new RangeError('Qubit norm squared must be within 1e-10 of 1');
  }
}

/**
 * Closed-form constant-H evolution into NEW storage, never mutating inputs:
 * U(dt) = cos(|a|dt) I - i sin(|a|dt) (a/|a| dot sigma).
 * sigma_x=[[0,1],[1,0]], sigma_y=[[0,-i],[i,0]], sigma_z=diag(1,-1).
 * There is NO factor 1/2 in H: the Bloch rotation angle is +2|a|dt,
 * with dr/dt = 2 a cross r. Finite negative dt reverses evolution.
 * Zero field/time validates all inputs then returns an exact independent copy.
 *
 * The formula is unitary in exact arithmetic, not exactly in floating point.
 * No per-step renormalization. Scaling avoids forming an overflowing |a| or
 * dividing by a tiny |a|. Nonfinite coefficients/time or an unrepresentable
 * phase |a|dt throw RangeError. Very large finite phases lose phase accuracy;
 * subnormal arithmetic may underflow. Determinism is within a given JS runtime,
 * not a promise of bitwise-identical transcendental results across engines.
 */
export function evolveQubit(state: QubitState, field: QubitHamiltonian, dt: number): QubitState {
  validateQubitState(state);
  const { ax, ay, az } = field;
  if (![ax, ay, az].every(Number.isFinite)) throw new RangeError('Qubit Hamiltonian coefficients must be finite');
  if (!Number.isFinite(dt)) throw new RangeError('dt must be finite');
  const scale = Math.max(Math.abs(ax), Math.abs(ay), Math.abs(az));
  if (scale === 0 || dt === 0) return { values: state.values.slice() };
  const length = Math.hypot(ax / scale, ay / scale, az / scale);
  const nx = (ax / scale) / length, ny = (ay / scale) / length, nz = (az / scale) / length;
  const angle = (scale * dt) * length;
  if (!Number.isFinite(angle)) throw new RangeError('Qubit evolution phase must be finite');
  const c = Math.cos(angle), s = Math.sin(angle);
  const v = state.values;
  const ar = v[0]!, ai = v[1]!, br = v[2]!, bi = v[3]!;
  // (n dot sigma)|psi>: top=nz*alpha+(nx-i*ny)*beta,
  // bottom=(nx+i*ny)*alpha-nz*beta. Then -i maps (re,im) to (im,-re).
  const topReal = nz * ar + nx * br + ny * bi;
  const topImag = nz * ai + nx * bi - ny * br;
  const bottomReal = nx * ar - ny * ai - nz * br;
  const bottomImag = nx * ai + ny * ar - nz * bi;
  return { values: new Float64Array([
    c * ar + s * topImag, c * ai - s * topReal,
    c * br + s * bottomImag, c * bi - s * bottomReal,
  ]) };
}

/**
 * rx=2 Re(conj(alpha)*beta), ry=2 Im(conj(alpha)*beta),
 * rz=|alpha|^2-|beta|^2. Validates the state; no clipping or normalization.
 * For a pure state the radius equals norm^2 (1 in exact normalized arithmetic).
 * Global phase cancels. Returns a fresh value object.
 */
export function blochVector(state: QubitState): BlochVector {
  validateQubitState(state);
  const v = state.values;
  return {
    x: 2 * (v[0]! * v[2]! + v[1]! * v[3]!),
    y: 2 * (v[0]! * v[3]! - v[1]! * v[2]!),
    z: v[0]! ** 2 + v[1]! ** 2 - v[2]! ** 2 - v[3]! ** 2,
  };
}
