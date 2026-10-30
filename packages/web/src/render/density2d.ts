import type { PsiGrid2D } from '@psi-zoo/sim-core';

/** Fixed mapping: f=1-exp(-rho/0.08). No frame-wise autoscaling or phase color.
 * The UI uses dusky sky to pastel cloud; the pixel helper also retains its
 * legacy palette default. Brightness is not probability mass; area-weighted
 * probabilities belong in diagnostics.
 */
export function densityBrightness2D(rho: number): number {
  if (!Number.isFinite(rho) || rho < 0) throw new RangeError('Density must be finite and nonnegative');
  return -Math.expm1(-rho / 0.08);
}
export function densityViewport2D(g: PsiGrid2D, width: number, height: number) {
  const scale = Math.min(width / (g.xmax - g.xmin), height / (g.ymax - g.ymin));
  const w = scale * (g.xmax - g.xmin), h = scale * (g.ymax - g.ymin);
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
/** Cell centers coincide with physical interior samples, leaving a half-cell
 * boundary margin on each side of the domain viewport. Shared by both layers. */
export function interiorViewport2D(g: PsiGrid2D, width: number, height: number) {
  const v = densityViewport2D(g, width, height);
  const hx = v.width / (2 * (g.nx + 1)), hy = v.height / (2 * (g.ny + 1));
  return { x: v.x + hx, y: v.y + hy, width: v.width - 2 * hx, height: v.height - 2 * hy };
}
export function physicalToCanvas2D(g: PsiGrid2D, x: number, y: number, width: number, height: number) {
  const v = densityViewport2D(g, width, height);
  return { x: v.x + (x - g.xmin) / (g.xmax - g.xmin) * v.width,
    y: v.y + (g.ymax - y) / (g.ymax - g.ymin) * v.height };
}
export function canvasToPhysical2D(g: PsiGrid2D, x: number, y: number, width: number, height: number) {
  const v = densityViewport2D(g, width, height);
  if (!Number.isFinite(x) || !Number.isFinite(y) || v.width <= 0 || v.height <= 0 || x < v.x || y < v.y || x > v.x + v.width || y > v.y + v.height) return null;
  return { x: g.xmin + (x - v.x) / v.width * (g.xmax - g.xmin),
    y: g.ymax - (y - v.y) / v.height * (g.ymax - g.ymin) };
}
/** Each interior sample occupies one equal rectangular display cell; low y is
 * at the bottom. Pixel cells represent samples, not stored boundary endpoints.
 * Caller-owned ImageData can be reused. Never modifies psi.
 */
export const TERRARIUM_SKY_RGB = [199, 217, 237] as const;
const TERRARIUM_CLOUD_RGB = [163, 118, 200] as const;
export function fillDensityPixels2D(g: PsiGrid2D, pixels: Uint8ClampedArray,
  sky: readonly number[] = [8, 14, 25], cloud: readonly number[] = [198, 244, 255]): void {
  if (pixels.length !== 4 * g.nx * g.ny) throw new RangeError('Pixel size must equal 4*nx*ny');
  const r = sky[0]!, green = sky[1]!, b = sky[2]!;
  const dr = cloud[0]! - r, dg = cloud[1]! - green, db = cloud[2]! - b;
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const k = 2 * (j * g.nx + i), p = 4 * ((g.ny - j - 1) * g.nx + i);
    const f = densityBrightness2D(g.values[k]! ** 2 + g.values[k + 1]! ** 2);
    pixels[p] = r + dr * f;
    pixels[p + 1] = green + dg * f;
    pixels[p + 2] = b + db * f; pixels[p + 3] = 255;
  }
}
/** Reusable Canvas2D staging surface and ImageData; no per-frame image allocation. */
export function createDensityRenderer2D(g: PsiGrid2D) {
  const surface = document.createElement('canvas'); surface.width = g.nx; surface.height = g.ny;
  const staging = surface.getContext('2d');
  if (!staging) throw new Error('Canvas2D unavailable');
  const image = staging.createImageData(g.nx, g.ny);
  return (context: CanvasRenderingContext2D, width: number, height: number) => {
    fillDensityPixels2D(g, image.data, TERRARIUM_SKY_RGB, TERRARIUM_CLOUD_RGB); staging.putImageData(image, 0, 0);
    context.fillStyle = '#c7d9ed'; context.fillRect(0, 0, width, height);
    const v = interiorViewport2D(g, width, height); context.imageSmoothingEnabled = false;
    context.drawImage(surface, v.x, v.y, v.width, v.height);
  };
}
