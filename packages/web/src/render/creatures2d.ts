import type { PsiGrid2D } from '@psi-zoo/sim-core';
import { densityBrightness2D, interiorViewport2D, TERRARIUM_SKY_RGB } from './density2d';
export const CREATURE_COLORS_2D = [[120, 185, 176], [228, 133, 174], [227, 179, 100], [163, 137, 207]] as const;
export function creatureColor2D(id: string): readonly number[] {
  const index = ['a', 'b', 'c', 'd'].indexOf(id);
  return CREATURE_COLORS_2D[index >= 0 ? index : [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 4]!;
}
/** Independent brightness layers, NOT complex amplitudes. Add RGB contributions
 * of f(rho)=1-exp(-rho/.08), clamped for display only. No aggregate probability
 * is normalized, and overlap cannot generate a cross-amplitude interference term.
 */
export function fillCreatureDensityPixels2D(g: PsiGrid2D, layers: readonly { density: Float64Array; color: readonly number[] }[], pixels: Uint8ClampedArray,
  rgb: Float64Array = new Float64Array(3 * g.nx * g.ny), sky: readonly number[] = [8, 14, 25]): void {
  const cells = g.nx * g.ny;
  if (pixels.length !== 4 * cells || rgb.length !== 3 * cells || rgb.buffer === pixels.buffer
    || layers.some(l => l.density.length !== cells || l.density.buffer === rgb.buffer)) throw new RangeError('Creature density image size/alias mismatch');
  const skyR = sky[0]!, skyG = sky[1]!, skyB = sky[2]!;
  for (let k = 0; k < cells; k++) { rgb[3*k] = skyR; rgb[3*k+1] = skyG; rgb[3*k+2] = skyB; }
  // Layer-major traversal hoists color/index lookups out of the cell loop. Each
  // channel still adds layers in the identical order, in Float64 (not clamped
  // after each layer); expm1 and the final Uint8 conversion are unchanged.
  for (const layer of layers) {
    const r = layer.color[0]! - skyR, green = layer.color[1]! - skyG, b = layer.color[2]! - skyB;
    for (let k = 0; k < cells; k++) {
      const f = densityBrightness2D(layer.density[k]!);
      rgb[3*k]! += r*f; rgb[3*k+1]! += green*f; rgb[3*k+2]! += b*f;
    }
  }
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const k = 3 * (j * g.nx + i), p = 4 * ((g.ny-j-1) * g.nx+i);
    pixels[p] = rgb[k]!; pixels[p+1] = rgb[k+1]!; pixels[p+2] = rgb[k+2]!; pixels[p+3] = 255;
  }
}
export function createCreatureRenderer2D(g: PsiGrid2D, source: { readonly ids: readonly string[]; copyDensity(id: string, out: Float64Array): void }) {
  const surface = document.createElement('canvas'); surface.width = g.nx; surface.height = g.ny;
  const staging = surface.getContext('2d'); if (!staging) throw new Error('Canvas2D unavailable');
  const image = staging.createImageData(g.nx, g.ny), cache = new Map<string, Float64Array>(), rgb = new Float64Array(3 * g.nx * g.ny);
  function draw(context: CanvasRenderingContext2D, width: number, height: number, selected: string, selectedOnly: boolean): void {
    const ids = source.ids;
    for (const id of cache.keys()) if (!ids.includes(id)) cache.delete(id);
    const layers = ids.filter(id => !selectedOnly || id === selected).map(id => {
      let density = cache.get(id); if (!density) { density = new Float64Array(g.nx * g.ny); cache.set(id, density); }
      source.copyDensity(id, density); return { id, density, color: creatureColor2D(id) };
    });
    draw.layers = layers;
    fillCreatureDensityPixels2D(g, layers, image.data, rgb, TERRARIUM_SKY_RGB); staging!.putImageData(image, 0, 0);
    context.fillStyle = '#c7d9ed'; context.fillRect(0, 0, width, height); context.imageSmoothingEnabled = false;
    const v = interiorViewport2D(g, width, height); context.drawImage(surface, v.x, v.y, v.width, v.height);
  }
  // Read-only borrowed display buffers, valid until the next draw. Not psi.
  draw.layers = [] as { id: string; density: Float64Array }[];
  return draw;
}
