import { describe, expect, it } from 'vitest';
import { createPsiGrid2D } from '../src/grid2d';
import { initializeGaussian2D } from '../src/gaussian2d';
import { projectDensityX, projectTerrainX } from '../src/projection2d';

describe('read-only 2D x projections', () => {
  it('uses interleaved real/imaginary values, dy, row-major indexing and reusable output on unequal spacings', () => {
    const g = createPsiGrid2D({ nx: 3, ny: 2, xmin: -3, xmax: 5, ymin: -2, ymax: 7 });
    g.values.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const before = g.values.slice(), output = new Float64Array([100, 200, 300]);
    expect(projectDensityX(g, output)).toBe(output);
    expect([...output]).toEqual([3 * (5 + 113), 3 * (25 + 181), 3 * (61 + 265)]);
    expect(g.values).toEqual(before);
    expect(projectDensityX(g)).toEqual(output);
    expect(g.dx * output.reduce((s, v) => s + v, 0)).toBe(g.dx * g.dy * 650);
  });
  for (const [sigmaX, sigmaY] of [[.8, .8], [.65, 1.1]]) {
    it(`matches an independently normalized Gaussian marginal, widths ${sigmaX}/${sigmaY}`, () => {
      const g = createPsiGrid2D({ nx: 97, ny: 62, xmin: -9, xmax: 10, ymin: -8, ymax: 7 });
      initializeGaussian2D(g, { x0: -.7, y0: .4, sigmaX, sigmaY, px: .7, py: -.3 });
      const before = g.values.slice(), rho = projectDensityX(g);
      // Separable probability convention: exp(-(x-x0)^2/(2*sigmaX^2)),
      // normalized with dx. Finite-y normalization cancels in the marginal.
      const expected = Float64Array.from({ length: g.nx }, (_, i) => Math.exp(-((g.xmin + (i + 1) * g.dx + .7) ** 2) / (2 * sigmaX! ** 2)));
      const integral = g.dx * expected.reduce((s, v) => s + v, 0);
      for (let i = 0; i < g.nx; i++) expect(rho[i]).toBeCloseTo(expected[i]! / integral, 13);
      expect(g.dx * rho.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 13);
      expect([...rho].every(v => Number.isFinite(v) && v >= 0)).toBe(true);
      expect(g.values).toEqual(before);
    });
  }
  it('retains amplitude scaling instead of independently normalizing peaks or mass', () => {
    const g = createPsiGrid2D({ nx: 17, ny: 11 }); initializeGaussian2D(g);
    const a = projectDensityX(g);
    for (let k = 0; k < g.values.length; k++) g.values[k]! *= 2;
    const b = projectDensityX(g);
    for (let i = 0; i < g.nx; i++) expect(b[i]).toBe(4 * a[i]!);
    expect(g.dx * b.reduce((s, v) => s + v, 0)).toBeCloseTo(4, 13);
  });
  it('averages signed shared terrain vertically, not by probability or dy', () => {
    const g = createPsiGrid2D({ nx: 3, ny: 2, ymin: -2, ymax: 7 });
    const terrain = new Float64Array([2, -6, 5, 4, 2, -5]), before = terrain.slice();
    const out = new Float64Array(3);
    expect(projectTerrainX(g, terrain, out)).toBe(out);
    expect([...out]).toEqual([3, -2, 0]);
    g.values.fill(7); // Deliberately unnormalized: terrain average must ignore psi.
    expect(projectTerrainX(g, terrain)).toEqual(out);
    expect(terrain).toEqual(before);
  });
  it('rejects invalid sizes, aliases, nonfinite data and unrepresentable density', () => {
    const g = createPsiGrid2D({ nx: 3, ny: 2 }), terrain = new Float64Array(6);
    expect(() => projectDensityX(g, new Float64Array(2))).toThrow();
    expect(() => projectDensityX(g, g.values.subarray(0, 3))).toThrow();
    expect(() => projectTerrainX(g, terrain, terrain.subarray(0, 3))).toThrow();
    expect(() => projectTerrainX(g, terrain, g.values.subarray(0, 3))).toThrow();
    expect(() => projectTerrainX(g, new Float64Array(5))).toThrow();
    expect(() => projectTerrainX(g, terrain, new Float64Array(2))).toThrow();
    g.values[0] = NaN; expect(() => projectDensityX(g)).toThrow();
    g.values[0] = Number.MAX_VALUE; expect(() => projectDensityX(g)).toThrow();
    terrain[0] = Infinity; expect(() => projectTerrainX(g, terrain)).toThrow();
  });
  it('handles a single interior row/column and averages large finite terrain without overflow', () => {
    const g = createPsiGrid2D({ nx: 1, ny: 1 }); g.values.set([3, 4]);
    expect(projectDensityX(g)[0]).toBe(25 * g.dy);
    const h = createPsiGrid2D({ nx: 1, ny: 4 });
    expect(projectTerrainX(h, new Float64Array(4).fill(Number.MAX_VALUE))[0]).toBe(Number.MAX_VALUE);
  });
});
