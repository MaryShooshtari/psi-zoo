import { describe, expect, it } from 'vitest';
import { createPsiGrid, normSquared, probabilityRegions } from '../src';

describe('disjoint probability regions, dx-weighted raw mass', () => {
  it('counts both cut points in the interaction region, each sample exactly once', () => {
    const psi = createPsiGrid(5, 0.5, -1);
    psi.values.set([1, 0, 0, 2, 3, 0, 0, 4, 5, 0]);
    const before = psi.values.slice();
    const p = probabilityRegions(psi, -0.5, 0.5);
    expect(p).toEqual({ left: 0.5, interaction: 14.5, right: 12.5, total: 27.5 });
    expect(p.total).toBe(normSquared(psi));
    expect(psi.values).toEqual(before);
  });
  it('handles off-grid cuts, empty exterior regions, and a zero-width interaction region', () => {
    const psi = createPsiGrid(5, 0.5, -1); psi.values.fill(1);
    expect(probabilityRegions(psi, -0.25, 0.25)).toEqual({ left: 2, interaction: 1, right: 2, total: 5 });
    expect(probabilityRegions(psi, -2, 2)).toEqual({ left: 0, interaction: 5, right: 0, total: 5 });
    expect(probabilityRegions(psi, 0, 0).interaction).toBe(1);
    expect(probabilityRegions(psi, 0.1, 0.1).interaction).toBe(0);
    expect(probabilityRegions(psi, 2, 3).left).toBe(5);
    expect(probabilityRegions(psi, -3, -2).right).toBe(5);
  });
  it('returns zeros for a zero state and does not normalize arbitrary states', () => {
    const psi = createPsiGrid(7, 0.1);
    expect(probabilityRegions(psi, 0.2, 0.4).total).toBe(0);
    psi.values.fill(0.3);
    const p = probabilityRegions(psi, 0.2, 0.4);
    expect(Math.abs(p.total - normSquared(psi))).toBeLessThan(1e-15);
    expect(p.total).not.toBeCloseTo(1);
  });
  it('rejects invalid cuts, geometry, state storage, nonfinite values and overflow', () => {
    const psi = createPsiGrid(5, 0.5, -1);
    for (const [left, right] of [[NaN, 0], [0, Infinity], [1, -1]]) {
      expect(() => probabilityRegions(psi, left!, right!)).toThrow(RangeError);
    }
    for (const invalid of [
      { ...psi, count: 2 }, { ...psi, dx: 0 }, { ...psi, x0: NaN },
      { ...psi, dx: 1e308 }, { ...psi, values: new Float64Array(2) },
    ]) expect(() => probabilityRegions(invalid, -1, 1)).toThrow(RangeError);
    for (const bad of [NaN, Infinity, Number.MAX_VALUE]) {
      psi.values[2] = bad;
      expect(() => probabilityRegions(psi, -1, 1)).toThrow(RangeError);
    }
  });
});
