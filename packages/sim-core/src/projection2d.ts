import { validatePotential2D, validateState2D, type PsiGrid2D } from './grid2d';

/** x marginal of position density: rhoX[i] = dy * sum_j |psi[i,j]|^2.
 * Integrating with dx gives the original norm, not a peak-normalized curve.
 * Read-only w.r.t. psi; output must be disjoint, nx long, and may be reused.
 * Uses factory grid metadata (interior samples, unstored zero boundaries).
 */
export function projectDensityX(g: PsiGrid2D, output: Float64Array = new Float64Array(g.nx)): Float64Array {
  validateState2D(g);
  if (output.length !== g.nx || output.buffer === g.values.buffer) throw new RangeError('Marginal output must be disjoint and have nx entries');
  output.fill(0);
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const k = 2 * (j * g.nx + i);
    output[i]! += g.values[k]! ** 2 + g.values[k + 1]! ** 2;
  }
  for (let i = 0; i < g.nx; i++) {
    output[i]! *= g.dy;
    if (!Number.isFinite(output[i]) || output[i]! < 0) throw new RangeError('Marginal density must be finite and nonnegative');
  }
  return output;
}

/** Unweighted vertical average of shared editable terrain (not an effective 1D
 * Hamiltonian or a density-weighted energy expectation). No psi values are read.
 * Divide before summing to avoid overflowing a representable finite average.
 */
export function projectTerrainX(g: PsiGrid2D, terrain: Float64Array, output: Float64Array = new Float64Array(g.nx)): Float64Array {
  validatePotential2D(g, terrain);
  if (output.length !== g.nx || output.buffer === terrain.buffer || output.buffer === g.values.buffer) throw new RangeError('Terrain projection output must be disjoint and have nx entries');
  output.fill(0);
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) output[i]! += terrain[j * g.nx + i]! / g.ny;
  for (let i = 0; i < g.nx; i++) if (!Number.isFinite(output[i])) throw new RangeError('Terrain average must be finite');
  return output;
}
