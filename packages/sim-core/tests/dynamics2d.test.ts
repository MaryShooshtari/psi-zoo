import { describe, expect, it } from 'vitest';
// Test-runner globals only; sim-core deliberately has no DOM/Node type dependency.
declare const console: { log(...args: unknown[]): void };
declare const performance: { now(): number };
import { createPsiGrid2D, index2D, xCoordinate2D, yCoordinate2D, initializeGaussian2D,
  normalize2D, normSquared2D, positionMoments2D, probabilityDensity2D, energyExpectation2D,
  CayleyStepper2D, type PsiGrid2D } from '../src';

function setup(nx = 32, ny = 25) {
  const g = createPsiGrid2D({ nx, ny }); initializeGaussian2D(g);
  return { g, v: new Float64Array(nx * ny), s: new CayleyStepper2D(g) };
}
function distance(g: PsiGrid2D, a: Float64Array, b: Float64Array) {
  let sum = 0; for (let k = 0; k < a.length; k++) sum += (a[k]! - b[k]!) ** 2;
  return Math.sqrt(sum * g.dx * g.dy);
}
function evolve(g: PsiGrid2D, v: Float64Array, dt: number, steps: number) {
  const s = new CayleyStepper2D(g); for (let k = 0; k < steps; k++) s.step(g, v, dt);
}
function potential(g: PsiGrid2D) {
  return Float64Array.from({ length: g.nx * g.ny }, (_, k) => {
    const x = xCoordinate2D(g, k % g.nx), y = yCoordinate2D(g, Math.floor(k / g.nx));
    return 0.1 * x * x + 0.16 * y * y + 0.07 * x * y;
  });
}

describe('interior-only 2D grid and observables', () => {
  it('defaults, coordinates, row-major non-square layout and area weighting', () => {
    const defaults = createPsiGrid2D(); expect(defaults.values.length).toBe(2 * 128 * 128); expect(defaults.dx).toBe(20 / 129);
    const g = createPsiGrid2D({ nx: 3, ny: 2, xmin: -2, xmax: 2, ymin: -3, ymax: 3 });
    expect(g.values.length).toBe(12); expect(g.dx).toBe(1); expect(g.dy).toBe(2);
    expect(index2D(g, 2, 1)).toBe(5); expect(xCoordinate2D(g, 0)).toBe(-1); expect(yCoordinate2D(g, 1)).toBe(1);
    g.values.fill(1); expect(normSquared2D(g)).toBe(24); normalize2D(g); expect(normSquared2D(g)).toBeCloseTo(1, 14);
    expect(positionMoments2D(g).x).toBeCloseTo(0, 14);
    expect(probabilityDensity2D(g).reduce((a, b) => a + b, 0) * g.dx * g.dy).toBeCloseTo(1, 14);
  });
  it('rejects invalid dimensions, bounds, indices, parameters and buffers', () => {
    for (const nx of [0, -1, 1.5, NaN, Infinity]) expect(() => createPsiGrid2D({ nx })).toThrow(RangeError);
    for (const xmin of [NaN, Infinity, 10, 11]) expect(() => createPsiGrid2D({ xmin })).toThrow(RangeError);
    expect(() => createPsiGrid2D({ ymin: -Infinity })).toThrow();
    const { g, s, v } = setup();
    expect(() => index2D(g, g.nx, 0)).toThrow();
    for (const sigmaX of [0, -1, Infinity, NaN]) expect(() => initializeGaussian2D(g, { sigmaX })).toThrow();
    expect(() => initializeGaussian2D(g, { py: NaN })).toThrow();
    expect(() => s.step(g, new Float64Array(2), 0)).toThrow(/potential size/);
    v[1] = NaN; expect(() => s.step(g, v, 0.1)).toThrow(/finite/);
    expect(() => normalize2D(createPsiGrid2D())).toThrow();
  });
  it('Gaussian position widths and means, scaled states, and density output reuse', () => {
    const { g } = setup(128, 100); initializeGaussian2D(g, { x0: 1, y0: -2, sigmaX: 0.7, sigmaY: 1.1 });
    for (let k = 0; k < g.values.length; k++) g.values[k]! *= 3;
    const m = positionMoments2D(g); expect(m.x).toBeCloseTo(1, 10); expect(m.y).toBeCloseTo(-2, 9);
    expect(m.sigmaX).toBeCloseTo(0.7, 10); expect(m.sigmaY).toBeCloseTo(1.1, 9);
    const out = new Float64Array(g.nx * g.ny); expect(probabilityDensity2D(g, out)).toBe(out);
  });
});

describe('symmetric unitary Cayley 2D dynamics', () => {
  it('zero dt leaves every component bit-identical', () => {
    const { g, s, v } = setup(); const before = g.values.slice(); s.step(g, v, 0); expect(g.values).toEqual(before);
    expect(() => s.step(g, v, Infinity)).toThrow();
  });
  it.each([false, true])('10,000 steps preserve norm, nonzero V=%s', nonzero => {
    const { g, s } = setup(16, 13), v = nonzero ? potential(g) : new Float64Array(g.nx * g.ny);
    let max = 0;
    for (let k = 0; k < 10000; k++) { s.step(g, v, 0.01); max = Math.max(max, Math.abs(normSquared2D(g) - 1)); }
    console.log('2D long-run max norm drift', { nonzero, max }); expect(max).toBeLessThan(1e-10);
    expect(g.values.every(Number.isFinite)).toBe(true);
  });
  it('reverses the full complex state with static V and unequal spacings', () => {
    const { g, s } = setup(37, 24), v = potential(g), initial = g.values.slice();
    for (let k = 0; k < 100; k++) s.step(g, v, 0.0125);
    for (let k = 0; k < 100; k++) s.step(g, v, -0.0125);
    expect(distance(g, initial, g.values)).toBeLessThan(2e-13);
  });
  it('preserves reflection symmetry and axis exchange to splitting accuracy', () => {
    const { g, v } = setup(48, 48); evolve(g, v, 0.002, 200);
    let reflection = 0, exchange = 0;
    for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) for (let c = 0; c < 2; c++) {
      const z = g.values[2 * (j * g.nx + i) + c]!;
      reflection = Math.max(reflection, Math.abs(z - g.values[2 * (j * g.nx + g.nx - 1 - i) + c]!));
      exchange = Math.max(exchange, Math.abs(z - g.values[2 * (i * g.nx + j) + c]!));
    }
    expect(reflection).toBeLessThan(1e-13);
    // x uses two half-Cayley steps, y one full step: finite-dt phases differ O(dt²).
    expect(exchange).toBeLessThan(2e-7);
  });
  it('axis exchange on transposed non-square grids with unequal spacings gives comparable complex states', () => {
    const a = createPsiGrid2D({ nx: 33, ny: 26, xmin: -8, xmax: 8, ymin: -10, ymax: 10 });
    const b = createPsiGrid2D({ nx: 26, ny: 33, xmin: -10, xmax: 10, ymin: -8, ymax: 8 });
    initializeGaussian2D(a, { sigmaX: 0.8, sigmaY: 1.1, px: 0.3, py: -0.2 });
    initializeGaussian2D(b, { sigmaX: 1.1, sigmaY: 0.8, px: -0.2, py: 0.3 });
    evolve(a, new Float64Array(a.nx * a.ny), 0.001, 200);
    evolve(b, new Float64Array(b.nx * b.ny), 0.001, 200);
    let sum = 0;
    for (let j = 0; j < a.ny; j++) for (let i = 0; i < a.nx; i++) for (let c = 0; c < 2; c++) {
      sum += (a.values[2 * (j * a.nx + i) + c]! - b.values[2 * (i * b.nx + j) + c]!) ** 2;
    }
    expect(Math.sqrt(sum * a.dx * a.dy)).toBeLessThan(1e-7);
  });
  it('Dirichlet product eigenmode has the independently predicted Cayley phase and energy', () => {
    const { g, v } = setup(19, 14), kx = 3, ky = 2, dt = 0.015, steps = 150;
    for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
      const k = 2 * (j * g.nx + i); g.values[k] = Math.sin(kx * Math.PI * (i + 1) / (g.nx + 1)) * Math.sin(ky * Math.PI * (j + 1) / (g.ny + 1)); g.values[k + 1] = 0;
    }
    normalize2D(g); const initial = g.values.slice(), rho = probabilityDensity2D(g);
    const lx = 2 / g.dx ** 2 * Math.sin(kx * Math.PI / (2 * (g.nx + 1))) ** 2;
    const ly = 2 / g.dy ** 2 * Math.sin(ky * Math.PI / (2 * (g.ny + 1))) ** 2;
    const e = energyExpectation2D(g, v); expect(e).toBeCloseTo(lx + ly, 13);
    evolve(g, v, dt, steps);
    const phase = -steps * (4 * Math.atan(dt * lx / 4) + 2 * Math.atan(dt * ly / 2));
    const finalDensity = probabilityDensity2D(g);
    for (let k = 0; k < rho.length; k++) {
      expect(g.values[2 * k]).toBeCloseTo(initial[2 * k]! * Math.cos(phase), 12);
      expect(g.values[2 * k + 1]).toBeCloseTo(initial[2 * k]! * Math.sin(phase), 12);
      expect(finalDensity[k]).toBeCloseTo(rho[k]!, 12);
    }
    expect(Math.abs(energyExpectation2D(g, v) - e)).toBeLessThan(1e-13);
  });
  it('single interior cell uses zero external neighbors, with no wrapping', () => {
    const { g, v, s } = setup(1, 1); const initial = g.values[0]!; v[0] = 2.3;
    s.step(g, v, 0.1);
    const phase = -0.23 - 4 * Math.atan(0.1 / (4 * g.dx ** 2)) - 2 * Math.atan(0.1 / (2 * g.dy ** 2));
    expect(g.values[0]).toBeCloseTo(initial * Math.cos(phase), 14);
    expect(g.values[1]).toBeCloseTo(initial * Math.sin(phase), 14);
  });
});

describe('2D analytical and numerical benchmarks', () => {
  it.each([[0.8, 0.8, 0, 0], [0.65, 1.1, 0.5, -0.4]])('free Gaussian sigma=(%s,%s), p=(%s,%s)', (sx, sy, px, py) => {
    const { g, v } = setup(128, 128); initializeGaussian2D(g, { sigmaX: sx, sigmaY: sy, px, py });
    evolve(g, v, 1 / 120, 240); const m = positionMoments2D(g), t = 2;
    const exactX = sx * Math.sqrt(1 + (t / (2 * sx * sx)) ** 2), exactY = sy * Math.sqrt(1 + (t / (2 * sy * sy)) ** 2);
    const errorX = Math.abs(m.sigmaX / exactX - 1), errorY = Math.abs(m.sigmaY / exactY - 1);
    console.log('2D Gaussian benchmark', { sx, sy, dx: g.dx, dt: 1 / 120, t, errorX, errorY, meanX: m.x, meanY: m.y });
    expect(errorX).toBeLessThan(0.02); expect(errorY).toBeLessThan(0.02);
    expect(Math.abs(m.x - px * t)).toBeLessThan(0.012); expect(Math.abs(m.y - py * t)).toBeLessThan(0.012);
  });
  it('second-order full-state temporal convergence and characterized static-V energy drift', () => {
    const run = (dt: number) => {
      const { g } = setup(32, 27); initializeGaussian2D(g, { x0: -0.5, sigmaX: 0.9, sigmaY: 0.7, px: 0.7, py: -0.2 });
      const v = potential(g), e0 = energyExpectation2D(g, v); let maxDrift = 0;
      const s = new CayleyStepper2D(g);
      for (let k = 0; k < Math.round(1 / dt); k++) { s.step(g, v, dt); maxDrift = Math.max(maxDrift, Math.abs(energyExpectation2D(g, v) - e0)); }
      return { g, maxDrift };
    };
    const ref = run(1 / 1280), runs = [run(0.04), run(0.02), run(0.01)];
    const errors = runs.map(r => distance(r.g, r.g.values, ref.g.values));
    const ratios = [errors[0]! / errors[1]!, errors[1]! / errors[2]!];
    console.log('2D convergence dt=[.04,.02,.01], ref=1/1280', { errors, ratios, maxEnergyDrifts: runs.map(r => r.maxDrift) });
    for (const ratio of ratios) { expect(ratio).toBeGreaterThan(3.8); expect(ratio).toBeLessThan(4.2); }
    expect(runs[0]!.maxDrift).toBeGreaterThan(1e-7);
    expect(runs[0]!.maxDrift / runs[1]!.maxDrift).toBeGreaterThan(3.8);
    expect(runs[1]!.maxDrift / runs[2]!.maxDrift).toBeGreaterThan(3.8);
  });
  it('reports warmed headless default-grid performance and exact numeric workspace bytes', () => {
    const { g, s, v } = setup(128, 128);
    for (let k = 0; k < 30; k++) s.step(g, v, 1 / 120);
    const start = performance.now(); for (let k = 0; k < 300; k++) s.step(g, v, 1 / 120);
    console.log('2D headless performance', { millisecondsPerStep: (performance.now() - start) / 300,
      stateAndPotentialBytes: g.values.byteLength + v.byteLength, solverWorkspaceBytes: 6 * (g.nx + g.ny) * 8 });
    expect(normSquared2D(g)).toBeCloseTo(1, 11);
  });
});
