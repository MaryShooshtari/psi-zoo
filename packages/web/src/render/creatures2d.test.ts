import { expect, it, vi } from 'vitest';
import { createPsiGrid2D, initializeGaussian2D, probabilityDensity2D } from '@psi-zoo/sim-core';
import { CREATURE_COLORS_2D, WORLD_SKY_RGB, creatureColor2D, createCreatureRenderer2D, fillCreatureDensityPixels2D } from './creatures2d';
it('pins the owner-selected P1 palette without changing the standalone Gaussian sky', async () => {
  expect(WORLD_SKY_RGB).toEqual([45, 51, 75]);
  expect(CREATURE_COLORS_2D).toEqual([[126, 222, 207], [248, 161, 191], [249, 213, 132], [190, 174, 246]]);
  const { TERRARIUM_SKY_RGB } = await import('./density2d'); expect(TERRARIUM_SKY_RGB).toEqual([199, 217, 237]);
});
it('matches an independent fixed-transfer P1 pixel reference with unchanged inputs and staging sizes', () => {
  const g = createPsiGrid2D({ nx: 2, ny: 2 }), a = new Float64Array([0, .01, .08, .8]), b = new Float64Array([.03, 0, .02, .1]);
  const before = [a.slice(), b.slice()], pixels = new Uint8ClampedArray(16), rgb = new Float64Array(12);
  fillCreatureDensityPixels2D(g, [{ density: a, color: creatureColor2D('a') }, { density: b, color: creatureColor2D('b') }], pixels, rgb, WORLD_SKY_RGB);
  const expected = new Uint8ClampedArray(16), colors = [[126, 222, 207], [248, 161, 191]], sky = [45, 51, 75];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const k = 2 * j + i, p = 4 * (2 * (1 - j) + i);
    for (let c = 0; c < 3; c++) {
      const first = sky[c]! + (colors[0]![c]! - sky[c]!) * Math.sqrt(a[k]! / (a[k]! + .012));
      expected[p + c] = first + (colors[1]![c]! - sky[c]!) * Math.sqrt(b[k]! / (b[k]! + .012)) * (255-first)/(255-sky[c]!);
    }
    expected[p + 3] = 255;
  }
  expect(pixels).toEqual(expected); expect(a).toEqual(before[0]); expect(b).toEqual(before[1]);
  expect(() => fillCreatureDensityPixels2D(g, [{ density: a, color: colors[0]! }], new Uint8ClampedArray(15), rgb, WORLD_SKY_RGB)).toThrow('size/alias');
  expect(() => fillCreatureDensityPixels2D(g, [{ density: a, color: colors[0]! }], pixels, new Float64Array(13), WORLD_SKY_RGB)).toThrow('size/alias');
});
it('fills the main-world boundary margin with the same P1 sky and reuses density/image buffers', () => {
  const g = createPsiGrid2D({ nx: 2, ny: 2 }), rho = new Float64Array([0, 0, 0, 1]), images: ImageData[] = [];
  const staging = { createImageData: (nx: number, ny: number) => ({ data: new Uint8ClampedArray(4 * nx * ny) }), putImageData: (image: ImageData) => images.push(image) };
  const ctx = { fillStyle: '', imageSmoothingEnabled: true, fillRect: vi.fn(), drawImage: vi.fn(), strokeRect: vi.fn() };
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => staging }) });
  try {
    const draw = createCreatureRenderer2D(g, { ids: ['a'], copyDensity: (_id, out) => out.set(rho) });
    draw(ctx as unknown as CanvasRenderingContext2D, 500, 500, 'a', false); const buffer = draw.layers[0]!.density;
    draw(ctx as unknown as CanvasRenderingContext2D, 500, 500, 'a', false);
    expect(ctx.fillStyle).toBe('#2d334b'); expect(images[0]!.data.slice(0, 3)).toEqual(new Uint8ClampedArray([45, 51, 75]));
    expect(draw.layers[0]!.density).toBe(buffer); expect(images[1]).toBe(images[0]); expect(ctx.imageSmoothingEnabled).toBe(true);
    draw(ctx as unknown as CanvasRenderingContext2D, 900, 500, 'a', false);
    expect(ctx.strokeRect).not.toHaveBeenCalled();
    expect(draw.layers[0]!.density).toBe(buffer);
  } finally { vi.unstubAllGlobals(); }
});
it('overlapping independent layers are phase-insensitive densities, never coherent amplitude sums', () => {
  const g = createPsiGrid2D({ nx: 19, ny: 13 }); initializeGaussian2D(g);
  const a = probabilityDensity2D(g); for (let k = 0; k < g.values.length; k++) g.values[k]! *= -1;
  const b = probabilityDensity2D(g); expect(a).toEqual(b);
  const solo = new Uint8ClampedArray(4 * a.length), both = new Uint8ClampedArray(solo.length), reference = new Uint8ClampedArray(solo.length);
  fillCreatureDensityPixels2D(g, [{ density: a, color: creatureColor2D('a') }], solo);
  fillCreatureDensityPixels2D(g, [{ density: a, color: creatureColor2D('a') }, { density: b, color: creatureColor2D('b') }], both);
  fillCreatureDensityPixels2D(g, [{ density: a, color: creatureColor2D('a') }, { density: a, color: creatureColor2D('b') }], reference);
  expect(both).toEqual(reference); expect(both).not.toEqual(solo);
  expect((a.reduce((x, y) => x + y, 0) + b.reduce((x, y) => x + y, 0)) * g.dx * g.dy).toBeCloseTo(2, 13);
  expect(creatureColor2D('a')).not.toEqual(creatureColor2D('b'));
});
it('density image preserves row orientation, rejects invalid density, and does not mutate inputs', () => {
  const g = createPsiGrid2D({ nx: 2, ny: 2 }), rho = new Float64Array([1, 0, 0, 0]), before = rho.slice(), pixels = new Uint8ClampedArray(16);
  fillCreatureDensityPixels2D(g, [{ density: rho, color: creatureColor2D('a') }], pixels);
  expect(rho).toEqual(before); expect(pixels[0]).toBe(8); expect(pixels[8]).toBeGreaterThan(60); expect(pixels[11]).toBe(255);
  rho[0] = NaN; expect(() => fillCreatureDensityPixels2D(g, [{ density: rho, color: creatureColor2D('a') }], pixels)).toThrow();
});
