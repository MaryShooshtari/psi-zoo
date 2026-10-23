import { describe, expect, it } from 'vitest';
import {
  createPsiGrid, createZeroPotential, createGaussianBarrier,
  stampGaussianPotential, paintGaussianPath, CrankNicolsonStepper,
  getHamiltonianCoefficients, initializeGaussian, normalize, normSquared,
  energyExpectation, type Stepper,
} from '../src';

const grid = createPsiGrid(41, 0.25, -5);
const brush = { amplitude: 3, sigma: 0.5 };
const cap = 5;

describe('potential landscapes (hbar=m=1)', () => {
  it('creates independent zero-filled Float64Arrays without changing psi', () => {
    const before = grid.values.slice();
    const a = createZeroPotential(grid), b = createZeroPotential(grid);
    expect(a).toBeInstanceOf(Float64Array);
    expect(a).toEqual(new Float64Array(grid.count));
    a[2] = 1;
    expect(b[2]).toBe(0);
    expect(grid.values).toEqual(before);
  });

  it('samples the specified Gaussian with exact on-grid peak and symmetry', () => {
    const v = createGaussianBarrier(grid, { ...brush, center: 0 });
    expect(v[20]).toBe(3);
    for (let i = 0; i < grid.count; i++) {
      const x = grid.x0 + i * grid.dx;
      // Independent direct formula, not the implementation helper.
      expect(v[i]).toBeCloseTo(3 * Math.exp(-x * x / (2 * 0.5 ** 2)), 14);
      expect(v[i]).toBe(v[grid.count - 1 - i]);
    }
    const offGrid = createGaussianBarrier(grid, { ...brush, center: 0.125 });
    expect(Math.max(...offGrid)).toBeLessThan(brush.amplitude);
  });

  it('uses sigma as the potential profile width, not the wavefunction width', () => {
    const narrow = createGaussianBarrier(grid, { ...brush, center: 0 });
    const wide = createGaussianBarrier(grid, { ...brush, sigma: 1, center: 0 });
    expect(narrow[22]).toBeCloseTo(3 * Math.exp(-0.5), 14);
    expect(wide[24]).toBeCloseTo(3 * Math.exp(-0.5), 14);
    expect(wide[24]!).toBeGreaterThan(narrow[24]!);
  });

  it('clips at boundaries without wrapping, renormalizing or clamping centers', () => {
    const edge = createGaussianBarrier(grid, { ...brush, center: -5 });
    const outside = createGaussianBarrier(grid, { ...brush, center: -5.5 });
    expect(edge[0]).toBe(3);
    expect(outside[0]).toBeCloseTo(3 * Math.exp(-0.5), 14);
    expect(outside.at(-1)!).toBeLessThan(outside[0]!);
    const v = createZeroPotential(grid);
    paintGaussianPath(grid, v, brush, -6, -5.5, cap);
    expect(v).toEqual(outside);
    const right = createGaussianBarrier(grid, { ...brush, center: 5 });
    expect(right).toEqual(edge.slice().reverse());
  });

  it('stamps in place using max, is idempotent and retains higher terrain', () => {
    const v = createZeroPotential(grid);
    v[20] = 4;
    const beforePsi = grid.values.slice();
    stampGaussianPotential(grid, v, { ...brush, center: 0 }, cap);
    const once = v.slice();
    for (let i = 0; i < 20; i++) stampGaussianPotential(grid, v, { ...brush, center: 0 }, cap);
    expect(v).toEqual(once);
    expect(v[20]).toBe(4);
    expect(v.every(x => x >= 0 && x <= cap)).toBe(true);
    expect(grid.values).toEqual(beforePsi);
  });

  it('fills sparse paths by the exact interpolated max envelope', () => {
    const v = createZeroPotential(grid);
    paintGaussianPath(grid, v, brush, -2, 2, cap);
    for (let i = 0; i < grid.count; i++) {
      const x = grid.x0 + i * grid.dx;
      const distance = Math.max(-2 - x, 0, x - 2);
      expect(v[i]).toBeCloseTo(3 * Math.exp(-(distance ** 2) / (2 * 0.5 ** 2)), 14);
    }
    const split = createZeroPotential(grid);
    for (const [a, b] of [[-2, -1.37], [-1.37, 0.13], [0.13, 2]]) {
      paintGaussianPath(grid, split, brush, a!, b!, cap);
    }
    expect(split).toEqual(v);
    paintGaussianPath(grid, split, brush, 2, -2, cap);
    expect(split).toEqual(v);
    const point = createZeroPotential(grid);
    paintGaussianPath(grid, point, brush, 0.125, 0.125, cap);
    expect(point).toEqual(createGaussianBarrier(grid, { ...brush, center: 0.125 }));
  });

  it('handles subnormal widths and extreme finite scales without NaN or overflow', () => {
    for (const sigma of [Number.MIN_VALUE, 1e-200, 1e200, Number.MAX_VALUE]) {
      const v = createGaussianBarrier(grid, { amplitude: Number.MAX_VALUE, sigma, center: 0 });
      expect(v[20]).toBe(Number.MAX_VALUE);
      expect(v.every(x => Number.isFinite(x) && x >= 0 && x <= Number.MAX_VALUE)).toBe(true);
    }
    const hugeGrid = { count: 3, dx: 5e307, x0: -1e308 };
    const huge = createGaussianBarrier(hugeGrid, {
      amplitude: 2, sigma: 1e308, center: 1e308,
    });
    expect(huge[0]).toBeCloseTo(2 * Math.exp(-2), 14);
    expect(huge.every(Number.isFinite)).toBe(true);
    const v = createZeroPotential(grid);
    paintGaussianPath(grid, v, brush, -Number.MAX_VALUE, Number.MAX_VALUE, cap);
    expect(v).toEqual(new Float64Array(grid.count).fill(3));
  });

  it.each([NaN, Infinity, -Infinity, -1])('rejects invalid amplitude %s', amplitude => {
    expect(() => createGaussianBarrier(grid, { ...brush, amplitude, center: 0 })).toThrow(RangeError);
  });
  it.each([NaN, Infinity, -Infinity, 0, -1])('rejects invalid sigma %s', sigma => {
    expect(() => createGaussianBarrier(grid, { ...brush, sigma, center: 0 })).toThrow(RangeError);
  });
  it('allows a zero-height Gaussian', () => {
    expect(createGaussianBarrier(grid, { ...brush, amplitude: 0, center: 0 })).toEqual(createZeroPotential(grid));
  });

  it('rejects malformed geometry and nonfinite positions', () => {
    for (const geometry of [
      { ...grid, count: 2 }, { ...grid, count: 3.5 },
      { ...grid, dx: 0 }, { ...grid, dx: Infinity }, { ...grid, x0: NaN },
      { count: 3, dx: 1e308, x0: 0 },
    ]) expect(() => createZeroPotential(geometry)).toThrow(RangeError);
    for (const center of [NaN, Infinity, -Infinity]) {
      expect(() => createGaussianBarrier(grid, { ...brush, center })).toThrow(RangeError);
      const v = createZeroPotential(grid);
      expect(() => stampGaussianPotential(grid, v, { ...brush, center }, cap)).toThrow(RangeError);
      expect(() => paintGaussianPath(grid, v, brush, 0, center, cap)).toThrow(RangeError);
      expect(() => paintGaussianPath(grid, v, brush, center, 0, cap)).toThrow(RangeError);
      expect(v).toEqual(createZeroPotential(grid));
    }
  });

  it('validates the entire landscape and brush before any mutation', () => {
    for (const bad of [NaN, Infinity, -Infinity, -1, cap + 1]) {
      const v = createZeroPotential(grid);
      v[v.length - 1] = bad;
      const before = v.slice();
      expect(() => stampGaussianPotential(grid, v, { ...brush, center: 0 }, cap)).toThrow(RangeError);
      expect(v).toEqual(before);
    }
    const v = createZeroPotential(grid);
    for (const maxHeight of [NaN, Infinity, -1, 0, 2]) {
      expect(() => paintGaussianPath(grid, v, brush, -1, 1, maxHeight)).toThrow(RangeError);
    }
    expect(() => stampGaussianPotential(grid, v, { ...brush, sigma: 0, center: 0 }, cap)).toThrow(RangeError);
    expect(() => paintGaussianPath(grid, v, { ...brush, amplitude: NaN }, -1, 1, cap)).toThrow(RangeError);
    expect(() => paintGaussianPath(grid, new Float64Array(3), brush, -1, 1, cap)).toThrow(RangeError);
    expect(v).toEqual(createZeroPotential(grid));
  });

  it('feeds the existing Hamiltonian and Stepper with static norm/energy conservation', () => {
    const psi = createPsiGrid(161, 0.1, -8);
    initializeGaussian(psi, -2, 0.75, 1, false);
    psi.values[0] = psi.values[1] = psi.values[2 * psi.count - 2] = psi.values[2 * psi.count - 1] = 0;
    normalize(psi);
    const v = createGaussianBarrier(psi, { ...brush, center: 0 });
    paintGaussianPath(psi, v, { amplitude: 1, sigma: 0.3 }, 2, 3, cap);
    const coefficients = getHamiltonianCoefficients(psi.count, psi.dx, psi.x0, v);
    for (let i = 0; i < psi.count; i++) {
      expect(coefficients.diagonal[i]).toBe(1 / (psi.dx * psi.dx) + v[i]!);
    }
    const before = v.slice(), n0 = normSquared(psi), e0 = energyExpectation(psi, v).real;
    const stepper: Stepper = new CrankNicolsonStepper();
    for (let k = 0; k < 200; k++) stepper.step(psi, v, 0.01);
    // Accumulated double-precision roundoff budgets, not continuum accuracy claims.
    expect(Math.abs(normSquared(psi) - n0)).toBeLessThan(2e-12);
    expect(Math.abs(energyExpectation(psi, v).real - e0)).toBeLessThan(2e-12 * Math.max(1, Math.abs(e0)));
    expect(psi.values.every(Number.isFinite)).toBe(true);
    expect([psi.values[0], psi.values[1], psi.values.at(-2), psi.values.at(-1)]).toEqual([0, 0, 0, 0]);
    expect(v).toEqual(before);
  });

  it('reproduces Slice 1 zero-potential evolution bit for bit without changing V', () => {
    const a = createPsiGrid(101, 0.2, -10), b = createPsiGrid(101, 0.2, -10);
    initializeGaussian(a, -2, 1, 0.75, false);
    a.values[0] = a.values[1] = a.values[2 * a.count - 2] = a.values[2 * a.count - 1] = 0;
    normalize(a);
    b.values.set(a.values);
    const built = createZeroPotential(a), original = new Float64Array(a.count);
    const stepper: Stepper = new CrankNicolsonStepper();
    for (let k = 0; k < 100; k++) {
      stepper.step(a, built, 0.01);
      stepper.step(b, original, 0.01);
    }
    expect(a.values).toEqual(b.values);
    expect(built).toEqual(original);
  });
});
