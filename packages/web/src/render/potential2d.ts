import type { PsiGrid2D } from '@psi-zoo/sim-core';
import { interiorViewport2D } from './density2d';

/** Signed energy colors, independent of density: warm positive, blue negative,
 * zero transparent. Alpha=|V|/limit; user opacity is applied at compositing time.
 */
export function fillPotentialPixels2D(g: PsiGrid2D, values: Float64Array, pixels: Uint8ClampedArray, limit: number): void {
  if (values.length !== g.nx * g.ny || pixels.length !== 4 * values.length || !Number.isFinite(limit) || limit <= 0) throw new RangeError('Invalid potential rendering buffers/scale');
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const value = values[j * g.nx + i]!;
    if (!Number.isFinite(value)) throw new RangeError('Potential rendering requires finite values');
    const p = 4 * ((g.ny - 1 - j) * g.nx + i);
    pixels[p] = value >= 0 ? 255 : 95; pixels[p + 1] = value >= 0 ? 105 : 125; pixels[p + 2] = value >= 0 ? 65 : 255;
    pixels[p + 3] = 255 * Math.min(1, Math.abs(value) / limit);
  }
}
export function createPotentialRenderer2D(g: PsiGrid2D, source: { readonly terrainRevision: number; readonly potentialLimit: number; copyPotential(out: Float64Array): void }) {
  const surface = document.createElement('canvas'); surface.width = g.nx; surface.height = g.ny;
  const staging = surface.getContext('2d'); if (!staging) throw new Error('Canvas2D unavailable');
  const image = staging.createImageData(g.nx, g.ny), values = new Float64Array(g.nx * g.ny);
  let key = '', rebuilds = 0;
  return {
    get rebuilds() { return rebuilds; },
    draw(context: CanvasRenderingContext2D, width: number, height: number, visible: boolean, opacity: number): void {
      if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw new RangeError('Overlay opacity must be in [0,1]');
      if (!visible || opacity === 0) return;
      const nextKey = `${source.terrainRevision}:${width}:${height}:${source.potentialLimit}:${opacity}`;
      if (key !== nextKey) {
        source.copyPotential(values); fillPotentialPixels2D(g, values, image.data, source.potentialLimit);
        staging.putImageData(image, 0, 0); key = nextKey; rebuilds++;
      }
      const v = interiorViewport2D(g, width, height);
      context.save(); context.globalAlpha = opacity; context.imageSmoothingEnabled = false;
      context.drawImage(surface, v.x, v.y, v.width, v.height); context.restore();
    },
  };
}
