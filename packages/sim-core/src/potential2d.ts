import { validatePotential2D, type PsiGrid2D } from './grid2d';

export type TerrainTool2D = 'barrier' | 'well' | 'erase';
export interface TerrainBrush2D { tool: TerrainTool2D; sigma: number; amplitude: number }
export function validateTerrainBrush2D(b: TerrainBrush2D): void {
  if (!['barrier', 'well', 'erase'].includes(b.tool) || !Number.isFinite(b.sigma) || b.sigma <= 0
    || !Number.isFinite(b.amplitude) || b.amplitude <= 0) throw new RangeError('Brush requires a valid tool, positive finite sigma and amplitude');
}
export function validatePotentialLimit2D(limit: number): void {
  if (!Number.isFinite(limit) || limit <= 0) throw new RangeError('Potential limit must be positive and finite');
}
/** In-place additive Gaussian or full-strength sign-independent erase, truncated
 * to the disk r<=3*sigma. Only the clipped local support is visited. Validates
 * affected values before mutation; validate the entire field on creation/load.
 * Returns whether any value changed. No wavefunction access or allocations.
 */
export function stampPotential2D(g: PsiGrid2D, values: Float64Array, x: number, y: number, b: TerrainBrush2D, limit = 20): boolean {
  validateTerrainBrush2D(b); validatePotentialLimit2D(limit);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new RangeError('Brush coordinates must be finite');
  if (!Number.isSafeInteger(g.nx) || !Number.isSafeInteger(g.ny) || g.nx < 1 || g.ny < 1
    || !Number.isFinite(g.xmin) || !Number.isFinite(g.ymin) || !Number.isFinite(g.dx) || !Number.isFinite(g.dy) || g.dx <= 0 || g.dy <= 0 || values.length !== g.nx * g.ny) throw new RangeError('Invalid terrain grid or potential size');
  const r = 3 * b.sigma;
  if (!Number.isFinite(r)) throw new RangeError('Brush support must be finite');
  const ilo = Math.max(0, Math.ceil((x - r - g.xmin) / g.dx - 1));
  const ihi = Math.min(g.nx - 1, Math.floor((x + r - g.xmin) / g.dx - 1));
  const jlo = Math.max(0, Math.ceil((y - r - g.ymin) / g.dy - 1));
  const jhi = Math.min(g.ny - 1, Math.floor((y + r - g.ymin) / g.dy - 1));
  // Validate local rectangle first, making invalid-input failures atomic.
  for (let j = jlo; j <= jhi; j++) for (let i = ilo; i <= ihi; i++) {
    if (!Number.isFinite(values[j * g.nx + i])) throw new RangeError('Terrain values must be finite');
  }
  let changed = false;
  for (let j = jlo; j <= jhi; j++) for (let i = ilo; i <= ihi; i++) {
    const dx = (g.xmin + (i + 1) * g.dx - x) / b.sigma;
    const dy = (g.ymin + (j + 1) * g.dy - y) / b.sigma;
    const q = dx * dx + dy * dy;
    if (q > 9) continue;
    const k = j * g.nx + i, old = values[k]!, weight = Math.exp(-q / 2);
    const next = b.tool === 'erase' ? old * (1 - weight)
      : Math.max(-limit, Math.min(limit, old + (b.tool === 'barrier' ? 1 : -1) * b.amplitude * weight));
    if (next !== old) { values[k] = next; changed = true; }
  }
  return changed;
}
/** Finite caller-owned field generators. These do not impose the editor limit. */
export function verticalBarrier2D(g: PsiGrid2D, height: number, left: number, right: number, smoothing: number): Float64Array {
  if (![height, left, right, smoothing].every(Number.isFinite) || height <= 0 || right <= left || smoothing <= 0) throw new RangeError('Barrier needs positive height/smoothing and finite ordered edges');
  const v = new Float64Array(g.nx * g.ny);
  for (let i = 0; i < g.nx; i++) {
    const x = g.xmin + (i + 1) * g.dx;
    const value = height * 0.5 * (Math.tanh((x - left) / smoothing) - Math.tanh((x - right) / smoothing));
    for (let j = 0; j < g.ny; j++) v[j * g.nx + i] = value;
  }
  validatePotential2D(g, v); return v;
}
export function gaussianWell2D(g: PsiGrid2D, depth: number, x0: number, y0: number, sigma: number): Float64Array {
  if (![depth, x0, y0, sigma].every(Number.isFinite) || depth <= 0 || sigma <= 0) throw new RangeError('Well needs finite center and positive finite depth/width');
  const v = new Float64Array(g.nx * g.ny);
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const x = (g.xmin + (i + 1) * g.dx - x0) / sigma, y = (g.ymin + (j + 1) * g.dy - y0) / sigma;
    v[j * g.nx + i] = -depth * Math.exp(-0.5 * (x * x + y * y));
  }
  validatePotential2D(g, v); return v;
}
