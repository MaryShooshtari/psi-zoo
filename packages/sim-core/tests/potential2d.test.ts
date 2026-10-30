import { describe, expect, it } from 'vitest';
import { createPsiGrid2D, stampPotential2D, verticalBarrier2D, gaussianWell2D, initializeGaussian2D,
  CayleyStepper2D, energyExpectation2D, normSquared2D } from '../src';
import { validatePotential2D } from '../src/grid2d';
declare const console: { log(...args: unknown[]): void };
const brush = { tool: 'barrier' as const, sigma: 0.7, amplitude: 2 };

describe('local bounded 2D potential tools', () => {
  it('zero storage, non-square indexing, centered symmetry, additive stamps and clipping', () => {
    const g = createPsiGrid2D({ nx: 21, ny: 15, xmin: -2.2, xmax: 2.2, ymin: -1.6, ymax: 1.6 }), v = new Float64Array(g.nx * g.ny);
    expect(v.length).toBe(315); expect(v.every(x => x === 0)).toBe(true);
    stampPotential2D(g, v, 0, 0, brush); const center = 7 * 21 + 10;
    expect(v[center]).toBe(2); expect(Math.max(...v)).toBe(2);
    for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) expect(v[j * g.nx + i]).toBeCloseTo(v[(g.ny - j - 1) * g.nx + g.nx - i - 1]!, 13);
    const before = v.slice(); stampPotential2D(g, v, 0, 0, brush);
    for (let k = 0; k < v.length; k++) expect(v[k]).toBeCloseTo(2 * before[k]!, 13);
    for (let k = 0; k < 15; k++) stampPotential2D(g, v, 0, 0, brush); expect(v[center]).toBe(20);
    for (let k = 0; k < 50; k++) stampPotential2D(g, v, 0, 0, { ...brush, tool: 'well' }); expect(v[center]).toBe(-20);
    expect(v.every(x => x >= -20 && x <= 20)).toBe(true);
  });
  it('sign-independent erasing reduces magnitude without crossing zero', () => {
    const g = createPsiGrid2D({ nx: 31, ny: 25 });
    for (const sign of [-1, 1]) {
      const v = new Float64Array(g.nx * g.ny).fill(3 * sign), before = v.slice();
      stampPotential2D(g, v, 0, 0, { ...brush, tool: 'erase' });
      expect(v.some((x, k) => Math.abs(x) < Math.abs(before[k]!))).toBe(true);
      expect(v.every(x => Math.abs(x) <= 3 && x * sign >= 0)).toBe(true);
    }
  });
  it('finite cutoff, safe edges and no writes beyond a subarray', () => {
    const g = createPsiGrid2D({ nx: 20, ny: 13 }), storage = new Float64Array(262).fill(123), v = storage.subarray(1, 261); v.fill(0);
    stampPotential2D(g, v, -10, -10, brush); expect(storage[0]).toBe(123); expect(storage[261]).toBe(123);
    expect(v.some(x => x > 0)).toBe(true); expect(v[v.length - 1]).toBe(0);
    const before = v.slice(); expect(stampPotential2D(g, v, 100, 100, brush)).toBe(false); expect(v).toEqual(before);
  });
  it('rejects invalid parameters and nonfinite touched values atomically', () => {
    const g = createPsiGrid2D({ nx: 9, ny: 9 }), v = new Float64Array(81);
    for (const sigma of [0, -1, Infinity, NaN]) expect(() => stampPotential2D(g, v, 0, 0, { ...brush, sigma })).toThrow();
    for (const amplitude of [0, -1, Infinity, NaN]) expect(() => stampPotential2D(g, v, 0, 0, { ...brush, amplitude })).toThrow();
    expect(() => stampPotential2D(g, v, NaN, 0, brush)).toThrow(); expect(() => stampPotential2D(g, v, 0, 0, brush, 0)).toThrow();
    expect(() => stampPotential2D(g, new Float64Array(2), 0, 0, brush)).toThrow();
    expect(() => stampPotential2D({ ...g, nx: 0 }, v, 0, 0, brush)).toThrow();
    v[40] = NaN; const original = v.slice(); expect(() => stampPotential2D(g, v, 0, 0, brush)).toThrow(); expect(v).toEqual(original);
    expect(() => validatePotential2D(g, v)).toThrow();
    expect(() => verticalBarrier2D(g, 6, 1, -1, 0.2)).toThrow(); expect(() => gaussianWell2D(g, 5, 0, 0, 0)).toThrow();
  });
  it('smooth barrier spans y and Gaussian well is negative and localized', () => {
    const g = createPsiGrid2D({ nx: 101, ny: 75 }), v = verticalBarrier2D(g, 6, -0.4, 0.4, 0.22), w = gaussianWell2D(g, 5, 0, 0, 1.5);
    for (let j = 1; j < g.ny; j++) expect(v.slice(j * g.nx, (j + 1) * g.nx)).toEqual(v.slice(0, g.nx));
    expect(v[50]).toBeGreaterThan(5.6); expect(v[0]).toBeLessThan(1e-12); expect(w.every(x => x <= 0)).toBe(true);
    expect(w[37 * 101 + 50]).toBe(-5); expect(Math.abs(w[0]!)).toBeLessThan(1e-15);
  });
});

describe('terrain Hamiltonian physics', () => {
  it.each(['barrier', 'well', 'mixed'])('preserves norm for static %s without renormalization', kind => {
    const g = createPsiGrid2D({ nx: 42, ny: 35 }); initializeGaussian2D(g);
    const v = kind === 'barrier' ? verticalBarrier2D(g, 6, -0.4, 0.4, 0.22) : gaussianWell2D(g, 5, 0, 0, 1.5);
    if (kind === 'mixed') stampPotential2D(g, v, 2, -1, { ...brush, amplitude: 8 });
    const s = new CayleyStepper2D(g); let max = 0;
    for (let k = 0; k < 1000; k++) { s.step(g, v, 1 / 120); max = Math.max(max, Math.abs(normSquared2D(g) - 1)); }
    console.log('5B static norm', { kind, max }); expect(max).toBeLessThan(1e-11);
  });
  it('repeated sign-changing interventions preserve norm through subsequent evolution', () => {
    const g = createPsiGrid2D({ nx: 35, ny: 28 }); initializeGaussian2D(g);
    const v = new Float64Array(g.nx * g.ny), s = new CayleyStepper2D(g); let max = 0;
    for (let k = 0; k < 500; k++) {
      if (k % 17 === 0) {
        const before = g.values.slice();
        stampPotential2D(g, v, Math.sin(k) * 2, Math.cos(k) * 2, { ...brush, tool: k % 2 ? 'well' : 'barrier' });
        expect(g.values).toEqual(before);
      }
      s.step(g, v, 1 / 120); max = Math.max(max, Math.abs(normSquared2D(g) - 1));
    }
    console.log('5B repeatedly edited norm max drift', max); expect(max).toBeLessThan(1e-11);
  });
  it('editing leaves psi/norm exactly unchanged and gives the independently summed instantaneous energy change', () => {
    const g = createPsiGrid2D({ nx: 48, ny: 39 }); initializeGaussian2D(g, { px: 0.6, py: -0.2 });
    const v = gaussianWell2D(g, 2, 0, 0, 1.5), initial = g.values.slice(), oldV = v.slice(), oldE = energyExpectation2D(g, v), oldNorm = normSquared2D(g);
    stampPotential2D(g, v, 0.3, -0.4, brush);
    let expected = 0;
    for (let k = 0; k < v.length; k++) expected += (initial[2 * k]! ** 2 + initial[2 * k + 1]! ** 2) * (v[k]! - oldV[k]!) * g.dx * g.dy;
    const actual = energyExpectation2D(g, v) - oldE;
    console.log('5B instantaneous energy change', { expected, actual, error: Math.abs(expected - actual) });
    expect(g.values).toEqual(initial); expect(normSquared2D(g)).toBe(oldNorm); expect(Math.abs(actual - expected)).toBeLessThan(2e-14);
    const oldEvolution = { ...g, values: initial.slice() }, s = new CayleyStepper2D(g);
    s.step(g, v, 1 / 120); s.step(oldEvolution, oldV, 1 / 120);
    let difference = 0; for (let k = 0; k < initial.length; k++) difference += (g.values[k]! - oldEvolution.values[k]!) ** 2;
    expect(Math.sqrt(difference * g.dx * g.dy)).toBeGreaterThan(0.001); expect(normSquared2D(g)).toBeCloseTo(1, 13);
  });
});
