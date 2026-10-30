import { describe, expect, it } from 'vitest';
import {
  createPsiGrid, initializeGaussian, normalize, normSquared, positionVariance,
  CrankNicolsonStepper, measurePosition, positionMeasurementProbabilities, type PsiGrid,
} from '../src';

function point(index = 1, count = 7): PsiGrid {
  const psi = createPsiGrid(count, 0.5, -1);
  psi.values[2 * index] = Math.sqrt(2);
  return psi;
}

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

// Independent full conditional matrix, not the implementation's offset kernel.
function reference(psi: PsiGrid, sigma: number) {
  const p = new Float64Array(psi.count);
  const columns: number[][] = [];
  for (let i = 1; i < psi.count - 1; i++) {
    const column = Array.from({ length: psi.count }, (_, j) =>
      j === 0 || j === psi.count - 1 ? 0 : Math.exp(-(((j - i) * psi.dx) ** 2) / (2 * sigma ** 2)));
    const z = column.reduce((a, b) => a + b, 0);
    columns[i] = column.map(v => v / z);
    const w = psi.dx * (psi.values[2 * i]! ** 2 + psi.values[2 * i + 1]! ** 2) / normSquared(psi);
    for (let j = 1; j < psi.count - 1; j++) p[j]! += w * columns[i]![j]!;
  }
  return { p, columns };
}

function packet() {
  const psi = createPsiGrid(801, 0.05, -20);
  initializeGaussian(psi, 0, 2, 0.3);
  psi.values[0] = psi.values[1] = psi.values[psi.values.length - 2] = psi.values[psi.values.length - 1] = 0;
  normalize(psi);
  return psi;
}

function boundaries(psi: PsiGrid) {
  expect([psi.values[0], psi.values[1], psi.values.at(-2), psi.values.at(-1)]).toEqual([0, 0, 0, 0]);
}

describe('finite-resolution Gaussian position measurement (not coordinate projection)', () => {
  it.each([Number.MIN_VALUE, 0.2, 0.8, 100, Number.MAX_VALUE])('normalizes every response column including boundaries, sigma=%s', sigma => {
    for (let i = 1; i < 6; i++) {
      const p = positionMeasurementProbabilities(point(i), sigma);
      expect(Math.abs(p.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(2e-15);
      expect(p[0]).toBe(0); expect(p[6]).toBe(0);
      expect([...p].every(v => Number.isFinite(v) && v >= 0)).toBe(true);
      if (sigma === Number.MIN_VALUE) expect(p[i]).toBe(1);
      if (sigma === Number.MAX_VALUE) expect(p[i]).toBeCloseTo(0.2, 15);
    }
  });

  it('matches independent boundary-corrected probabilities and posterior complex amplitudes for non-unit input', () => {
    const psi = point();
    psi.values[2] = 2; psi.values[3] = -3;
    psi.values[8] = -4; psi.values[9] = 1;
    const before = psi.values.slice();
    const { p, columns } = reference(psi, 0.8);
    const actual = positionMeasurementProbabilities(psi, 0.8);
    for (let j = 0; j < psi.count; j++) expect(actual[j]).toBeCloseTo(p[j]!, 15);
    const result = measurePosition(psi, 0.8, () => 0.4);
    expect(result.inputNormSquared).toBe(normSquared(psi));
    expect(result.position).toBe(psi.x0 + result.index * psi.dx);
    expect(result.resolution).toBe(0.8);
    expect(result.probability).toBeCloseTo(p[result.index]!, 15);
    expect(result.probabilities).toEqual(actual);
    for (let i = 1; i < psi.count - 1; i++) {
      const factor = Math.sqrt(columns[i]![result.index]! / (normSquared(psi) * p[result.index]!));
      for (let c = 0; c < 2; c++) expect(result.state.values[2 * i + c]).toBeCloseTo(psi.values[2 * i + c]! * factor, 14);
    }
    expect(psi.values).toEqual(before);
    expect(result.state.values).not.toBe(psi.values);
    expect(Math.abs(normSquared(result.state) - 1)).toBeLessThan(1e-15);
    boundaries(result.state);
  });

  it('gives normalized boundary posteriors for every outcome without becoming an exact projector', () => {
    const psi = point(1);
    psi.values[3] = -0.4;
    psi.values[10] = 2;
    psi.values[11] = 0.7;
    const { p, columns } = reference(psi, 0.6);
    let cumulative = 0;
    for (let j = 1; j < psi.count - 1; j++) {
      const result = measurePosition(psi, 0.6, () => cumulative + p[j]! / 2);
      expect(result.index).toBe(j);
      expect(Math.abs(normSquared(result.state) - 1)).toBeLessThan(1e-15);
      boundaries(result.state);
      for (const i of [1, 5]) {
        const posteriorMass = psi.dx * (result.state.values[2 * i]! ** 2 + result.state.values[2 * i + 1]! ** 2);
        const priorMass = psi.dx * (psi.values[2 * i]! ** 2 + psi.values[2 * i + 1]! ** 2) / normSquared(psi);
        expect(posteriorMass).toBeCloseTo(priorMass * columns[i]![j]! / p[j]!, 14);
        expect(posteriorMass).toBeGreaterThan(0);
      }
      cumulative += p[j]!;
    }
  });

  it.each([0.03, 0.65])('samples known Born mixtures including resolution effects, sigma=%s', sigma => {
    const psi = point(1);
    psi.values[2] = Math.sqrt(0.5); // mass 1/4
    psi.values[10] = Math.sqrt(1.5); // mass 3/4
    const expected = reference(psi, sigma).p;
    const counts = new Float64Array(psi.count);
    const rng = seeded(831);
    const trials = 20000;
    for (let k = 0; k < trials; k++) counts[measurePosition(psi, sigma, rng).index]!++;
    for (let j = 0; j < psi.count; j++) {
      // Six binomial standard errors, with one-count allowance for tiny bins.
      const tolerance = 6 * Math.sqrt(expected[j]! * (1 - expected[j]!) / trials) + 1 / trials;
      expect(Math.abs(counts[j]! / trials - expected[j]!)).toBeLessThan(tolerance);
    }
    if (sigma === 0.65) expect(expected[2]! + expected[3]! + expected[4]!).toBeGreaterThan(0.25);
  });

  it('is reproducible, consumes one RNG value, and handles zero and near-one draws', () => {
    const psi = point(3);
    const draws = [0, 0.25, 0.5, 1 - Number.EPSILON];
    const run = () => {
      let calls = 0;
      const results = draws.map(() => measurePosition(psi, 0.7, () => draws[calls++]!));
      expect(calls).toBe(draws.length);
      return results;
    };
    expect(run()).toEqual(run());
    expect(run().map(r => r.index)).toEqual([1, 2, 3, 5]);
    // Zero-probability leading bins must not be selected even for u=0.
    expect(measurePosition(psi, Number.MIN_VALUE, () => 0).index).toBe(3);
    expect(measurePosition(point(1, 3), 0.5, () => 0.99).index).toBe(1);
  });

  it('localizes, retains phase wherever the mask is nonzero, and produces finite normalized values', () => {
    const psi = packet();
    const result = measurePosition(psi, 0.5, () => 0.5);
    expect(positionVariance(result.state)).toBeLessThan(positionVariance(psi) / 10);
    // Interior posterior variance for two Gaussian densities: (s0^-2 + sigma^-2)^-1.
    expect(positionVariance(result.state)).toBeCloseTo(1 / (1 / 4 + 1 / 0.25), 12);
    for (let i = 1; i < psi.count - 1; i++) {
      const re = result.state.values[2 * i]!, im = result.state.values[2 * i + 1]!;
      expect(Number.isFinite(re) && Number.isFinite(im)).toBe(true);
      if (Math.hypot(re, im) > 1e-100) {
        expect(Math.atan2(im, re)).toBeCloseTo(Math.atan2(psi.values[2 * i + 1]!, psi.values[2 * i]!), 14);
      }
    }
    expect(Math.abs(normSquared(result.state) - 1)).toBeLessThan(3e-15);
    boundaries(result.state);
  });

  it('continues CN evolution with stable norm and physically resolved re-spreading', () => {
    const { state } = measurePosition(packet(), 0.5, () => 0.5);
    const initialVariance = positionVariance(state);
    const stepper = new CrankNicolsonStepper();
    const potential = new Float64Array(state.count);
    let maxDrift = 0;
    for (let k = 0; k < 1000; k++) {
      stepper.step(state, potential, 0.001);
      maxDrift = Math.max(maxDrift, Math.abs(normSquared(state) - 1));
    }
    // 1000-step roundoff budget, no per-step normalization.
    expect(maxDrift).toBeLessThan(5e-12);
    boundaries(state);
    expect([...state.values].every(Number.isFinite)).toBe(true);
    expect(positionVariance(state)).toBeGreaterThan(4 * initialVariance);
    // Continuum unchirped Gaussian variance at t=1; allow O(dx^2) dispersion.
    expect(Math.abs(positionVariance(state) - (initialVariance + 1 / (4 * initialVariance)))).toBeLessThan(0.01);
  });

  it('rejects invalid resolutions, RNG draws and zero states without mutating the input', () => {
    const psi = point();
    const before = psi.values.slice();
    for (const resolution of [0, -1, NaN, Infinity]) {
      expect(() => measurePosition(psi, resolution, () => 0.5)).toThrow(RangeError);
      expect(() => positionMeasurementProbabilities(psi, resolution)).toThrow(RangeError);
    }
    for (const u of [-0.1, 1, Infinity, NaN]) expect(() => measurePosition(psi, 0.5, () => u)).toThrow(RangeError);
    expect(() => measurePosition(createPsiGrid(5, 0.5), 0.5, () => 0)).toThrow(RangeError);
    expect(psi.values).toEqual(before);
  });

  it('rejects malformed geometry, storage, nonfinite states, invalid endpoints and unrepresentable norms', () => {
    const psi = point();
    for (const bad of [
      { ...psi, count: 2 }, { ...psi, count: 3.5 }, { ...psi, dx: 0 }, { ...psi, dx: Infinity },
      { ...psi, x0: NaN }, { ...psi, dx: 1e308 }, { ...psi, values: new Float64Array(2) },
    ]) expect(() => measurePosition(bad, 0.5, () => 0)).toThrow(RangeError);
    for (const index of [0, 1, 12, 13]) {
      const bad = point(); bad.values[index] = 1;
      expect(() => measurePosition(bad, 0.5, () => 0)).toThrow(/Dirichlet/);
    }
    for (const value of [NaN, Infinity, Number.MAX_VALUE, Number.MIN_VALUE]) {
      const bad = point(); bad.values[2] = value;
      expect(() => measurePosition(bad, 0.5, () => 0)).toThrow(RangeError);
    }
  });
});
