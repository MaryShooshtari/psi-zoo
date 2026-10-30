import { expect, it } from 'vitest';
import { createPsiGrid2D, initializeGaussian2D, probabilityDensity2D } from '@psi-zoo/sim-core';
import { creatureColor2D, fillCreatureDensityPixels2D } from './creatures2d';
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
