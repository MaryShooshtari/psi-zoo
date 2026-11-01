import type { PsiGrid2D } from './grid2d';

export type PositionMeasurement2DAxes = 'x' | 'xy';
export type PositionMeasurement2DStage =
  'input' | 'x-distribution' | 'x-draw' | 'y-distribution' | 'y-draw' | 'posterior';

/** Stage identifies the operation, not the consumed draw count. Callback side
 * effects cannot be rewound. Only this error type represents a handled failure.
 */
export class PositionMeasurement2DError extends RangeError {
  constructor(readonly stage: PositionMeasurement2DStage, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PositionMeasurement2DError';
  }
}

interface PositionMeasurement2DCommon {
  /** Newly allocated full 2D posterior; input amplitudes are never written. */
  readonly state: PsiGrid2D;
  /** Gaussian detector sigma in world units, not a posterior packet width. */
  readonly resolution: number;
  /** Selected discrete outcome mass; always finite and strictly positive. */
  readonly probability: number;
  readonly inputNormSquared: number;
  readonly posteriorNormSquared: number;
  readonly xIndex: number;
  readonly x: number;
}
export type PositionMeasurement2DResult =
  | (PositionMeasurement2DCommon & { readonly axes: 'x' })
  | (PositionMeasurement2DCommon & { readonly axes: 'xy'; readonly yIndex: number; readonly y: number });

/**
 * Finite-resolution diagonal Gaussian POVM, NOT an exact coordinate projection.
 * hbar=m=1. Row-major interior grid; all four unstored Dirichlet boundaries are
 * excluded from both inputs and detector outcomes. Area weight is dx*dy.
 *
 * R_x(a|i)=exp(-((a-i)*dx/sigma)^2/2)/Z_x(i), similarly for y, each Z summed
 * over all allowed detector sites for that input (including boundary sites).
 * X-only samples once and applies sqrt(R_x) across ALL y. Joint sampling uses
 * pX(a), then pY(b|a), with two calls even for deterministic branches; only then
 * constructs sqrt(R_x)*sqrt(R_y)*psi. No intermediate x-only commit/result.
 *
 * Normalize conditional input-y masses BEFORE the y convolution. Option A:
 * if the selected joint mass rounds to zero after both draws, fail at posterior
 * even if a scaled posterior could be usable. Never floor, retry or resample.
 * Gaussian tails below floating-point range may underflow naturally.
 *
 * O(nx*ny + nx² + ny²) work, O(nx+ny) axis workspace plus one O(nx*ny) candidate.
 * No joint outcome table, DOM, solver, hidden RNG or persistent workspace.
 */
export function measurePosition2D(
  psi: PsiGrid2D, resolution: number, axes: PositionMeasurement2DAxes, rng: () => number,
): PositionMeasurement2DResult {
  validateInput(psi, resolution, axes, rng);
  const area = psi.dx * psi.dy;
  const input = scaledNorm(psi.values, area, 'input');
  // Unit Euclidean masses equal dx*dy*|psi|²/N. Dividing by the largest
  // amplitude before squaring avoids overflow/underflow of an intermediate
  // raw square or unweighted sum when the actual area norm is representable.
  const massAt = (k: number) => {
    const re = psi.values[k]! / input.scale, im = psi.values[k + 1]! / input.scale;
    return (re * re + im * im) / input.sum;
  };
  const x = responseAxis(psi.nx, psi.dx, resolution);
  const inputX = new Float64Array(psi.nx);
  for (let j = 0; j < psi.ny; j++) for (let i = 0; i < psi.nx; i++) {
    inputX[i]! += massAt(2 * (j * psi.nx + i));
  }
  const px = convolve(inputX, x);
  normalizeMasses(px, 'x-distribution');
  const xIndex = sample(px, rng, 'x-draw');
  let probability = px[xIndex]!;
  let yIndex: number | undefined;
  let y: AxisResponse | undefined;
  if (axes === 'xy') {
    const conditional = new Float64Array(psi.ny);
    for (let j = 0; j < psi.ny; j++) for (let i = 0; i < psi.nx; i++) {
      conditional[j]! += massAt(2 * (j * psi.nx + i)) * (x.response[Math.abs(xIndex - i)]! / x.totals[i]!);
    }
    // C and pX were accumulated differently and need not be bit-identical.
    // In particular do not convolve tiny unnormalized c[j] with Ry first.
    normalizeMasses(conditional, 'y-distribution');
    y = responseAxis(psi.ny, psi.dy, resolution);
    const py = convolve(conditional, y);
    normalizeMasses(py, 'y-distribution');
    yIndex = sample(py, rng, 'y-draw');
    probability *= py[yIndex]!;
  }
  if (!Number.isFinite(probability) || probability <= 0) {
    throw new PositionMeasurement2DError('posterior', 'Unrepresentable selected outcome mass');
  }

  const values = new Float64Array(psi.values.length);
  const inputLength = Math.sqrt(input.sum);
  for (let j = 0; j < psi.ny; j++) {
    const yMask = y && yIndex !== undefined
      ? Math.sqrt(y.response[Math.abs(yIndex - j)]!) / Math.sqrt(y.totals[j]!) : 1;
    for (let i = 0; i < psi.nx; i++) {
      const k = 2 * (j * psi.nx + i);
      // Separate square roots retain masks even when the product of two
      // response values (or response/Z) would underflow before sqrt.
      const xMask = Math.sqrt(x.response[Math.abs(xIndex - i)]!) / Math.sqrt(x.totals[i]!);
      values[k] = ((psi.values[k]! / input.scale) / inputLength) * xMask * yMask;
      values[k + 1] = ((psi.values[k + 1]! / input.scale) / inputLength) * xMask * yMask;
    }
  }
  // A candidate's DIRECT squared norm may underflow. Normalize using its
  // largest entry and dimensionless sum instead of dividing by joint mass.
  const candidate = scaledComponents(values, 'posterior');
  const candidateLength = Math.sqrt(candidate.sum), sqrtArea = Math.sqrt(area);
  for (let k = 0; k < values.length; k++) {
    values[k] = ((values[k]! / candidate.scale) / candidateLength) / sqrtArea;
  }
  const posteriorNormSquared = scaledNorm(values, area, 'posterior').normSquared;
  const state: PsiGrid2D = {
    nx: psi.nx, ny: psi.ny, xmin: psi.xmin, xmax: psi.xmax, ymin: psi.ymin, ymax: psi.ymax,
    dx: psi.dx, dy: psi.dy, values,
  };
  const common = {
    state, resolution, probability, inputNormSquared: input.normSquared, posteriorNormSquared,
    xIndex, x: psi.xmin + (xIndex + 1) * psi.dx,
  };
  if (axes === 'xy' && yIndex !== undefined) {
    return { ...common, axes, yIndex, y: psi.ymin + (yIndex + 1) * psi.dy };
  }
  return { ...common, axes: 'x' };
}

function validateInput(psi: PsiGrid2D, resolution: number, axes: PositionMeasurement2DAxes, rng: () => number): void {
  if (axes !== 'x' && axes !== 'xy') throw new PositionMeasurement2DError('input', 'axes must be x or xy');
  if (typeof rng !== 'function') throw new PositionMeasurement2DError('input', 'rng must be a callback');
  if (!Number.isFinite(resolution) || resolution <= 0) throw new PositionMeasurement2DError('input', 'resolution must be positive and finite');
  if (!psi || !Number.isSafeInteger(psi.nx) || !Number.isSafeInteger(psi.ny) || psi.nx < 1 || psi.ny < 1
    || !Number.isSafeInteger(2 * psi.nx * psi.ny) || !(psi.values instanceof Float64Array)
    || psi.values.length !== 2 * psi.nx * psi.ny) {
    throw new PositionMeasurement2DError('input', 'Invalid interior dimensions or Float64 storage length');
  }
  // Match createPsiGrid2D without allocating a throwaway full grid. Equality
  // is intentional: a factory-consistent grid computes the same spacings.
  const dx = (psi.xmax - psi.xmin) / (psi.nx + 1), dy = (psi.ymax - psi.ymin) / (psi.ny + 1);
  if (![psi.xmin, psi.xmax, psi.ymin, psi.ymax, dx, dy, 1 / (dx * dx), 1 / (dy * dy), dx * dy].every(Number.isFinite)
    || dx <= 0 || dy <= 0 || dx * dy <= 0 || psi.dx !== dx || psi.dy !== dy) {
    throw new PositionMeasurement2DError('input', 'Finite increasing bounds and factory-consistent representable spacings/area required');
  }
}

function scaledComponents(values: Float64Array, stage: 'input' | 'posterior') {
  let scale = 0;
  for (let k = 0; k < values.length; k++) {
    const value = values[k]!;
    if (!Number.isFinite(value)) throw new PositionMeasurement2DError(stage, 'State entries must be finite');
    scale = Math.max(scale, Math.abs(value));
  }
  if (scale === 0) throw new PositionMeasurement2DError(stage, 'State norm must be positive');
  let sum = 0;
  for (let k = 0; k < values.length; k++) sum += (values[k]! / scale) ** 2;
  return { scale, sum };
}
function scaledNorm(values: Float64Array, area: number, stage: 'input' | 'posterior') {
  const components = scaledComponents(values, stage);
  const length = (components.scale * Math.sqrt(area)) * Math.sqrt(components.sum);
  const normSquared = length * length;
  if (!Number.isFinite(normSquared) || normSquared <= 0) {
    throw new PositionMeasurement2DError(stage, 'State norm must be positive, finite and representable');
  }
  return { ...components, normSquared };
}

interface AxisResponse { response: Float64Array; totals: Float64Array }
function responseAxis(count: number, spacing: number, sigma: number): AxisResponse {
  const response = new Float64Array(count), totals = new Float64Array(count);
  response[0] = 1; // exact even when sigma*sigma underflows
  for (let offset = 1; offset < count; offset++) {
    const distance = (offset * spacing) / sigma;
    response[offset] = Math.exp(-0.5 * distance * distance);
  }
  for (let input = 0; input < count; input++) {
    let total = 0;
    for (let outcome = 0; outcome < count; outcome++) total += response[Math.abs(outcome - input)]!;
    totals[input] = total;
  }
  return { response, totals };
}
function convolve(masses: Float64Array, axis: AxisResponse): Float64Array {
  const outcomes = new Float64Array(masses.length);
  for (let input = 0; input < masses.length; input++) for (let outcome = 0; outcome < masses.length; outcome++) {
    outcomes[outcome]! += masses[input]! * (axis.response[Math.abs(outcome - input)]! / axis.totals[input]!);
  }
  return outcomes;
}
function normalizeMasses(masses: Float64Array, stage: 'x-distribution' | 'y-distribution'): void {
  let total = 0;
  for (let k = 0; k < masses.length; k++) {
    if (!Number.isFinite(masses[k]) || masses[k]! < 0) throw new PositionMeasurement2DError(stage, 'Invalid outcome distribution');
    total += masses[k]!;
  }
  if (!Number.isFinite(total) || total <= 0) throw new PositionMeasurement2DError(stage, 'Outcome total must be positive and finite');
  for (let k = 0; k < masses.length; k++) masses[k]! /= total;
}
function sample(masses: Float64Array, rng: () => number, stage: 'x-draw' | 'y-draw'): number {
  let draw: number;
  try { draw = rng(); } catch (cause) {
    throw new PositionMeasurement2DError(stage, 'RNG callback threw', { cause });
  }
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1) {
    throw new PositionMeasurement2DError(stage, 'RNG must return a finite number in [0, 1)');
  }
  let total = 0;
  for (let k = 0; k < masses.length; k++) total += masses[k]!;
  const target = draw * total;
  let cumulative = 0, lastPositive = 0;
  for (let k = 0; k < masses.length; k++) {
    if (masses[k]! > 0) lastPositive = k;
    cumulative += masses[k]!;
    if (masses[k]! > 0 && target < cumulative) return k;
  }
  return lastPositive; // rounded CDF upper edge; never select a zero-mass bin
}
