/** hbar=m=1. nx,ny count INTERIOR points; all four unstored boundaries are zero. */
export interface PsiGrid2D {
  readonly nx: number; readonly ny: number;
  readonly xmin: number; readonly xmax: number;
  readonly ymin: number; readonly ymax: number;
  readonly dx: number; readonly dy: number;
  /** Row-major k=j*nx+i; values[2*k], values[2*k+1] are real,imaginary. */
  readonly values: Float64Array;
}
export interface Grid2DOptions {
  nx?: number; ny?: number; xmin?: number; xmax?: number; ymin?: number; ymax?: number;
}
export function createPsiGrid2D(options: Grid2DOptions = {}): PsiGrid2D {
  const { nx = 128, ny = 128, xmin = -10, xmax = 10, ymin = -10, ymax = 10 } = options;
  if (!Number.isSafeInteger(nx) || !Number.isSafeInteger(ny) || nx < 1 || ny < 1 || !Number.isSafeInteger(2 * nx * ny)) {
    throw new RangeError('nx and ny must be positive safe integers with a safe storage size');
  }
  const dx = (xmax - xmin) / (nx + 1), dy = (ymax - ymin) / (ny + 1);
  if (![xmin, xmax, ymin, ymax, dx, dy, 1 / (dx * dx), 1 / (dy * dy), dx * dy].every(Number.isFinite)
    || dx <= 0 || dy <= 0 || dx * dy <= 0) throw new RangeError('Finite increasing bounds and representable positive spacings/area required');
  return { nx, ny, xmin, xmax, ymin, ymax, dx, dy, values: new Float64Array(2 * nx * ny) };
}
export function index2D(g: PsiGrid2D, i: number, j: number): number {
  if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || i >= g.nx || j < 0 || j >= g.ny) throw new RangeError('Interior grid index out of range');
  return j * g.nx + i;
}
export function xCoordinate2D(g: PsiGrid2D, i: number): number { index2D(g, i, 0); return g.xmin + (i + 1) * g.dx; }
export function yCoordinate2D(g: PsiGrid2D, j: number): number { index2D(g, 0, j); return g.ymin + (j + 1) * g.dy; }
export function validateState2D(g: PsiGrid2D): void {
  if (g.values.length !== 2 * g.nx * g.ny) throw new RangeError('2D state size must equal 2*nx*ny');
  // Keep the complete finite-value guard, without a typed-array iterator in
  // this repeatedly called hot path. Read in the same ascending index order.
  const values = g.values;
  for (let k = 0; k < values.length; k++) if (!Number.isFinite(values[k])) throw new RangeError('2D state must be finite');
}
export function validatePotential2D(g: PsiGrid2D, potential: Float64Array): void {
  if (potential.length !== g.nx * g.ny) throw new RangeError('2D potential size must equal nx*ny');
  for (let k = 0; k < potential.length; k++) if (!Number.isFinite(potential[k])) throw new RangeError('2D potential must be real and finite');
}
