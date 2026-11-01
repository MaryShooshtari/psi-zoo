import type { PsiGrid2D } from '@psi-zoo/sim-core';
import { densityBrightness2D, interiorViewport2D } from './density2d';
/** Owner-selected P1 twilight palette. Legacy Gaussian colors stay separate. */
export const WORLD_SKY_RGB = [45, 51, 75] as const;
export const CREATURE_COLORS_2D = [[126, 222, 207], [248, 161, 191], [249, 213, 132], [190, 174, 246]] as const;
export function creatureColor2D(id: string): readonly number[] {
  const index = ['a', 'b', 'c', 'd'].indexOf(id);
  return CREATURE_COLORS_2D[index >= 0 ? index : [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 4]!;
}
/** Independent brightness layers, NOT complex amplitudes. Blend RGB contributions
 * of f(rho)=sqrt(rho/(rho+.012)), screen-composited for display only. No aggregate probability
 * is normalized, and overlap cannot generate a cross-amplitude interference term.
 */
export function fillCreatureDensityPixels2D(g: PsiGrid2D, layers: readonly { density: Float64Array; color: readonly number[] }[], pixels: Uint8ClampedArray,
  rgb: Float64Array = new Float64Array(3 * g.nx * g.ny), sky: readonly number[] = [8, 14, 25]): void {
  const cells = g.nx * g.ny;
  if (pixels.length !== 4 * cells || rgb.length !== 3 * cells || rgb.buffer === pixels.buffer
    || layers.some(l => l.density.length !== cells || l.density.buffer === rgb.buffer)) throw new RangeError('Creature density image size/alias mismatch');
  const skyR = sky[0]!, skyG = sky[1]!, skyB = sky[2]!;
  for (let k = 0; k < cells; k++) { rgb[3*k] = skyR; rgb[3*k+1] = skyG; rgb[3*k+2] = skyB; }
  // Bounded screen blending keeps overlapping identities tinted instead of
  // clipping their sum to white. This is color compositing, never probability.
  for (const layer of layers) {
    const r = layer.color[0]! - skyR, green = layer.color[1]! - skyG, b = layer.color[2]! - skyB;
    for (let k = 0; k < cells; k++) {
      const f = densityBrightness2D(layer.density[k]!);
      rgb[3*k]! += r*f*(255-rgb[3*k]!)/(255-skyR); rgb[3*k+1]! += green*f*(255-rgb[3*k+1]!)/(255-skyG); rgb[3*k+2]! += b*f*(255-rgb[3*k+2]!)/(255-skyB);
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
    fillCreatureDensityPixels2D(g, layers, image.data, rgb, WORLD_SKY_RGB); staging!.putImageData(image, 0, 0);
    context.fillStyle = '#2d334b'; context.fillRect(0, 0, width, height); context.imageSmoothingEnabled = true;
    const v = interiorViewport2D(g, width, height); context.drawImage(surface, v.x, v.y, v.width, v.height);
  }
  // Read-only borrowed display buffers, valid until the next draw. Not psi.
  draw.layers = [] as { id: string; density: Float64Array }[];
  return draw;
}
