import type { Grid2DOptions } from '@psi-zoo/sim-core';

export const PLAYGROUND_SPACING_2D = 20 / 129;
/** Choose once per experiment, never on ResizeObserver/view changes. Keep the
 * original sample spacing, ~128² cells and ~400 physical area; redistribute
 * samples between axes instead of coarsening a larger square. Rounding leaves
 * <2% aspect mismatch in normal layouts. Units hbar=m=1; four zero Dirichlet
 * boundaries. Extreme aspect ratios are bounded to keep both axes resolved. */
export function playgroundGrid2D(width: number, height: number): Required<Grid2DOptions> {
  if (![width, height].every(Number.isFinite) || width <= 0 || height <= 0) throw new RangeError('Playground dimensions must be positive and finite');
  const aspect = Math.max(.25, Math.min(4, width / height));
  const xIntervals = Math.round(129 * Math.sqrt(aspect));
  const yIntervals = Math.round(129 / Math.sqrt(aspect));
  const lx = xIntervals * PLAYGROUND_SPACING_2D, ly = yIntervals * PLAYGROUND_SPACING_2D;
  return { nx: xIntervals - 1, ny: yIntervals - 1, xmin: -lx/2, xmax: lx/2, ymin: -ly/2, ymax: ly/2 };
}
