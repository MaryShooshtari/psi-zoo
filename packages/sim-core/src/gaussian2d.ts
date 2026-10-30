import { type PsiGrid2D } from './grid2d';
import { normalize2D } from './observables2d';
export interface Gaussian2DOptions {
  x0?: number; y0?: number; sigmaX?: number; sigmaY?: number; px?: number; py?: number;
}
/** exp(-X²/(4 sigmaX²)-Y²/(4 sigmaY²)+i(px X+py Y)), then area-normalize.
 * sigmaX,Y are standard deviations of the initial POSITION DENSITY in unbounded space.
 */
export function initializeGaussian2D(g: PsiGrid2D, options: Gaussian2DOptions = {}): void {
  const { x0 = 0, y0 = 0, sigmaX = 0.8, sigmaY = 0.8, px = 0, py = 0 } = options;
  if (![x0, y0, sigmaX, sigmaY, px, py].every(Number.isFinite) || sigmaX <= 0 || sigmaY <= 0) throw new RangeError('Gaussian parameters must be finite, widths positive');
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const x = g.xmin + (i + 1) * g.dx - x0, y = g.ymin + (j + 1) * g.dy - y0;
    const envelope = Math.exp(-0.25 * ((x / sigmaX) ** 2 + (y / sigmaY) ** 2)), phase = px * x + py * y;
    if (!Number.isFinite(phase)) throw new RangeError('Gaussian phase overflow');
    const k = 2 * (j * g.nx + i);
    g.values[k] = envelope * Math.cos(phase); g.values[k + 1] = envelope * Math.sin(phase);
  }
  normalize2D(g);
}
