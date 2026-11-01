import { describe, expect, it, vi } from 'vitest';
import { createPsiGrid2D, initializeGaussian2D, normSquared2D, type PsiGrid2D,
  measurePosition2D, PositionMeasurement2DError, type PositionMeasurement2DAxes,
  type PositionMeasurement2DStage } from '../src';
import { binDraw, measurement2dReference, stateDistance2D } from './helpers/measurement2dReference';

declare const console: { log(...args: unknown[]): void };

function correlated(nx = 4, ny = 3): PsiGrid2D {
  const g = createPsiGrid2D({ nx, ny, xmin: -2, xmax: 3, ymin: -3, ymax: 5 });
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = 2 * (j * nx + i);
    const amplitude = Math.exp(-0.7 * (i - j) ** 2) + 0.4 * Math.exp(-((i - nx + 1) ** 2) - j * j);
    g.values[k] = amplitude * Math.cos(0.9 * i - 0.4 * j);
    g.values[k + 1] = amplitude * Math.sin(0.9 * i - 0.4 * j);
  }
  return g;
}
function unitGrid(nx = 2, ny = 2) {
  return createPsiGrid2D({ nx, ny, xmin: 0, xmax: nx + 1, ymin: 0, ymax: ny + 1 });
}
function bytes(g: PsiGrid2D) {
  return new Uint8Array(g.values.buffer, g.values.byteOffset, g.values.byteLength).slice();
}
function failure(call: () => unknown, stage: PositionMeasurement2DStage, message?: RegExp) {
  try { call(); } catch (error) {
    expect(error).toBeInstanceOf(PositionMeasurement2DError);
    expect(error).toBeInstanceOf(RangeError);
    expect((error as PositionMeasurement2DError).stage).toBe(stage);
    if (message) expect((error as Error).message).toMatch(message);
    return error as PositionMeasurement2DError;
  }
  throw new Error(`Expected ${stage} failure`);
}

// Real floating-point edge fixture. dx=1, exp(-dx²/(2 sigma²)) rounds to MIN_VALUE.
// dy gives off-diagonal response 0.8, hence conditional-y masses 4/9 and 5/9.
function subnormalFixture() {
  const sigma = 1 / Math.sqrt(1490), dy = sigma * Math.sqrt(-2 * Math.log(0.8));
  const g = createPsiGrid2D({ nx: 2, ny: 2, xmin: 0, xmax: 3, ymin: 0, ymax: 3 * dy });
  g.values[6] = 1; // input (1,1), opposite x detector bin is subnormal
  expect(Math.exp(-0.5 * (g.dx / sigma) ** 2)).toBe(Number.MIN_VALUE);
  return { g, sigma };
}

describe('finite-resolution 2D detector: independent joint reference', () => {
  it.each([[4, 3], [1, 1], [1, 4], [4, 1]])('enumerates every x and xy outcome, nx=%s ny=%s', (nx, ny) => {
    const g = correlated(nx, ny), before = bytes(g), sigma = 1.2;
    const reference = measurement2dReference(g, sigma);
    let maxProbabilityError = 0, maxStateError = 0;
    for (let a = 0; a < nx; a++) {
      const xDraw = binDraw(reference.x, a);
      const rng = vi.fn(() => xDraw);
      const x = measurePosition2D(g, sigma, 'x', rng);
      expect(rng).toHaveBeenCalledTimes(1);
      expect(x.axes).toBe('x'); expect(x.xIndex).toBe(a);
      expect(x.x).toBe(g.xmin + (a + 1) * g.dx);
      expect(x).not.toHaveProperty('y'); expect(x).not.toHaveProperty('yIndex');
      expect(x).not.toHaveProperty('probabilities');
      expect(Object.keys(x).sort()).toEqual(['axes', 'state', 'resolution', 'probability', 'inputNormSquared', 'posteriorNormSquared', 'xIndex', 'x'].sort());
      expect(x.inputNormSquared).toBeCloseTo(reference.norm, 12);
      expect(x.resolution).toBe(sigma);
      expect(x.state).not.toBe(g); expect(x.state.values.buffer).not.toBe(g.values.buffer);
      expect({ ...x.state, values: null }).toEqual({ ...g, values: null });
      maxProbabilityError = Math.max(maxProbabilityError, Math.abs(x.probability - reference.x[a]!));
      maxStateError = Math.max(maxStateError, stateDistance2D(g, x.state.values, reference.posterior(a)));
      for (let b = 0; b < ny; b++) {
        const draws = [xDraw, binDraw(reference.conditionalY(a), b)];
        const jointRng = vi.fn(() => draws.shift()!);
        const xy = measurePosition2D(g, sigma, 'xy', jointRng);
        expect(jointRng).toHaveBeenCalledTimes(2);
        expect(xy.axes).toBe('xy'); expect(xy.xIndex).toBe(a);
        if (xy.axes !== 'xy') throw new Error('Expected xy result');
        expect(xy.yIndex).toBe(b); expect(xy.y).toBe(g.ymin + (b + 1) * g.dy);
        maxProbabilityError = Math.max(maxProbabilityError, Math.abs(xy.probability - reference.joint[b * nx + a]!));
        maxStateError = Math.max(maxStateError, stateDistance2D(g, xy.state.values, reference.posterior(a, b)));
        expect(Math.abs(xy.posteriorNormSquared - 1)).toBeLessThanOrEqual(1e-12);
        expect(Math.abs(normSquared2D(xy.state) - 1)).toBeLessThanOrEqual(1e-12);
      }
    }
    // Independent enumeration errors, no free global-phase alignment: masks are positive.
    expect(maxProbabilityError).toBeLessThanOrEqual(1e-12);
    expect(maxStateError).toBeLessThanOrEqual(1e-11);
    expect(bytes(g)).toEqual(before);
    console.log('2D detector reference errors', { nx, ny, maxProbabilityError, maxStateError });
  });

  it.each([0.02, 0.7, 100, Number.MAX_VALUE])('has complete per-input responses at every edge/corner, sigma=%s', sigma => {
    const g = correlated(3, 2), reference = measurement2dReference(g, sigma);
    for (const column of [...reference.rx, ...reference.ry]) {
      expect(Math.abs(column.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-12);
    }
    for (let k = 0; k < g.nx * g.ny; k++) {
      g.values.fill(0); g.values[2 * k] = 1; g.values[2 * k + 1] = -0.5;
      const ref = measurement2dReference(g, sigma);
      let sum = 0;
      for (let a = 0; a < g.nx; a++) {
        if (ref.x[a] === 0) continue;
        const x = measurePosition2D(g, sigma, 'x', () => binDraw(ref.x, a));
        expect(Math.abs(x.probability - ref.x[a]!)).toBeLessThan(1e-12); sum += x.probability;
        for (let b = 0; b < g.ny; b++) {
          const mass = ref.joint[b * g.nx + a]!;
          if (mass === 0) continue;
          const draws = [binDraw(ref.x, a), binDraw(ref.conditionalY(a), b)];
          const xy = measurePosition2D(g, sigma, 'xy', () => draws.shift()!);
          expect(Math.abs(xy.probability - mass)).toBeLessThan(1e-12);
          expect(stateDistance2D(g, xy.state.values, ref.posterior(a, b))).toBeLessThan(1e-11);
        }
      }
      expect(Math.abs(sum - 1)).toBeLessThan(1e-12);
    }
  });

  it('preserves global/relative phases, input scaling and correlated conditional y (not unconditional y)', () => {
    const g = unitGrid(); g.values[0] = 1; g.values[7] = 2;
    const x = measurePosition2D(g, 0.25, 'x', () => 0);
    // A full x-mask changes conditional y in this correlated state; it does not sample y.
    const yZeroMass = x.state.values[0]! ** 2 + x.state.values[1]! ** 2;
    expect(yZeroMass).toBeGreaterThan(0.99);
    expect(x.state.values[7]).toBeGreaterThan(0); // finite-width update, not exact projection
    const sigma = 0.7, base = measurePosition2D(g, sigma, 'xy', () => 0.3);
    const phase = 0.8, scaled = { ...g, values: g.values.slice() };
    for (let k = 0; k < g.values.length; k += 2) {
      scaled.values[k] = 3 * (g.values[k]! * Math.cos(phase) - g.values[k + 1]! * Math.sin(phase));
      scaled.values[k + 1] = 3 * (g.values[k]! * Math.sin(phase) + g.values[k + 1]! * Math.cos(phase));
    }
    const rotated = measurePosition2D(scaled, sigma, 'xy', () => 0.3);
    expect(rotated.probability).toBeCloseTo(base.probability, 14);
    expect(rotated.inputNormSquared).toBeCloseTo(9 * base.inputNormSquared, 12);
    for (let k = 0; k < g.values.length; k += 2) {
      const re = base.state.values[k]!, im = base.state.values[k + 1]!;
      expect(rotated.state.values[k]).toBeCloseTo(re * Math.cos(phase) - im * Math.sin(phase), 14);
      expect(rotated.state.values[k + 1]).toBeCloseTo(re * Math.sin(phase) + im * Math.cos(phase), 14);
    }
  });

  it('is invariant under very large and very small representable non-unit scaling', () => {
    const g = correlated(), reference = measurePosition2D(g, 0.7, 'xy', () => 0.4);
    for (const factor of [1e150, 1e-150]) {
      const scaled = { ...g, values: Float64Array.from(g.values, value => value * factor) };
      const result = measurePosition2D(scaled, 0.7, 'xy', () => 0.4);
      expect(Math.abs(result.probability - reference.probability)).toBeLessThan(1e-12);
      expect(stateDistance2D(g, result.state.values, reference.state.values)).toBeLessThan(1e-11);
      expect(Math.abs(result.inputNormSquared / ((reference.inputNormSquared * factor) * factor) - 1)).toBeLessThan(1e-14);
    }
  });

  it('agrees for a separable complex Gaussian without assuming separability for other inputs', () => {
    const g = correlated(5, 4);
    initializeGaussian2D(g, { x0: 0.4, y0: 0.2, sigmaX: 0.9, sigmaY: 1.1, px: 0.7, py: -0.4 });
    const ref = measurement2dReference(g, 0.8), a = 2, b = 1;
    const draws = [binDraw(ref.x, a), binDraw(ref.conditionalY(a), b)];
    const result = measurePosition2D(g, 0.8, 'xy', () => draws.shift()!);
    expect(Math.abs(result.probability - ref.joint[b * g.nx + a]!)).toBeLessThan(1e-12);
    expect(stateDistance2D(g, result.state.values, ref.posterior(a, b))).toBeLessThan(1e-11);
  });
});

describe('2D detector draw boundaries, staged errors and immutability', () => {
  it.each(['x', 'xy'] as const)('consumes every required deterministic draw, skips zero bins; axes=%s', axes => {
    const g = unitGrid(4, 3); g.values[2 * (1 * g.nx + 2)] = 1;
    for (const draw of [0, 1 - Number.EPSILON / 2]) {
      const rng = vi.fn(() => draw), before = bytes(g);
      const result = measurePosition2D(g, Number.MIN_VALUE, axes, rng);
      expect(rng).toHaveBeenCalledTimes(axes === 'x' ? 1 : 2);
      expect(result.xIndex).toBe(2); expect(result.probability).toBe(1);
      if (result.axes === 'xy') expect(result.yIndex).toBe(1);
      expect(bytes(g)).toEqual(before);
    }
  });

  it('handles zero/near-one draws and rounded CDF totals reproducibly', () => {
    const g = unitGrid(7, 3); g.values.fill(1);
    for (const draw of [0, 1 - Number.EPSILON / 2]) {
      const first = measurePosition2D(g, Number.MAX_VALUE, 'xy', () => draw);
      expect(first).toEqual(measurePosition2D(g, Number.MAX_VALUE, 'xy', () => draw));
      expect(first.xIndex).toBe(draw === 0 ? 0 : 6);
      if (first.axes === 'xy') expect(first.yIndex).toBe(draw === 0 ? 0 : 2);
    }
  });

  it('uses a strict CDF boundary rather than choosing the previous bin', () => {
    const g = unitGrid(3, 1); g.values.fill(1);
    expect(measurePosition2D(g, Number.MAX_VALUE, 'x', () => 1 / 3).xIndex).toBe(1);
    expect(measurePosition2D(g, Number.MAX_VALUE, 'x', () => 2 / 3).xIndex).toBe(2);
  });

  it('rejects invalid axes, sigma and callback before draws', () => {
    const g = correlated(), before = bytes(g), rng = vi.fn(() => 0);
    for (const sigma of [0, -1, NaN, Infinity, -Infinity]) failure(() => measurePosition2D(g, sigma, 'xy', rng), 'input');
    for (const axes of ['', 'y', 'XY', null]) failure(() => measurePosition2D(g, 0.4, axes as PositionMeasurement2DAxes, rng), 'input');
    for (const callback of [null, undefined, 0, {}]) failure(() => measurePosition2D(g, 0.4, 'xy', callback as () => number), 'input');
    expect(rng).not.toHaveBeenCalled(); expect(bytes(g)).toEqual(before);
  });

  it('rejects malformed geometry, storage, nonfinite entries and unrepresentable norms without draws', () => {
    const g = correlated(), rng = vi.fn(() => 0);
    const malformed = [
      { ...g, nx: 0 }, { ...g, ny: -1 }, { ...g, nx: 1.5 }, { ...g, ny: Infinity },
      { ...g, nx: Number.MAX_SAFE_INTEGER }, { ...g, xmin: NaN }, { ...g, ymax: Infinity },
      { ...g, xmax: g.xmin }, { ...g, ymax: g.ymin - 1 }, { ...g, dx: g.dx * 1.01 },
      { ...g, dy: 0 }, { ...g, dx: NaN }, { ...g, values: new Float64Array(3) },
      { ...g, xmin: -Number.MAX_VALUE, xmax: Number.MAX_VALUE },
      { ...g, xmin: 0, xmax: 1e-200, dx: 1e-200 / (g.nx + 1) },
      { ...g, xmin: 0, xmax: 1e200, ymin: 0, ymax: 1e200,
        dx: 1e200 / (g.nx + 1), dy: 1e200 / (g.ny + 1) }, // area overflows
      { ...g, values: [] as unknown as Float64Array },
      null as unknown as PsiGrid2D,
    ];
    for (const bad of malformed) failure(() => measurePosition2D(bad, 0.4, 'xy', rng), 'input');
    for (const value of [0, NaN, Infinity, -Infinity, Number.MIN_VALUE, Number.MAX_VALUE, 1e-200]) {
      const bad = unitGrid(); bad.values[0] = value; const before = bytes(bad);
      failure(() => measurePosition2D(bad, 0.4, 'xy', rng), 'input'); expect(bytes(bad)).toEqual(before);
    }
    expect(rng).not.toHaveBeenCalled();
  });

  it.each(['x', 'xy'] as const)('accepts positive finite widths outside the UI range; %s', axes => {
    for (const sigma of [Number.MIN_VALUE, 0.01, 3, Number.MAX_VALUE]) {
      expect(measurePosition2D(correlated(), sigma, axes, () => 0.5).probability).toBeGreaterThan(0);
    }
  });

  it('reports invalid/throwing callbacks at their actual stage and retains the cause', () => {
    const g = correlated(), before = bytes(g);
    for (const bad of [NaN, Infinity, -Infinity, -0.01, 1]) for (const invocation of [1, 2]) {
      let calls = 0;
      failure(() => measurePosition2D(g, 0.7, 'xy', () => ++calls === invocation ? bad : 0.5), invocation === 1 ? 'x-draw' : 'y-draw');
      expect(calls).toBe(invocation); expect(bytes(g)).toEqual(before);
    }
    const cause = new Error('callback failure');
    for (const invocation of [1, 2]) {
      let calls = 0;
      const error = failure(() => measurePosition2D(g, 0.7, 'xy', () => { if (++calls === invocation) throw cause; return 0.5; }), invocation === 1 ? 'x-draw' : 'y-draw');
      expect(error.cause).toBe(cause); expect(calls).toBe(invocation); expect(bytes(g)).toEqual(before);
    }
  });

  it('avoids intermediate squares overflowing/underflowing for representable true input norms', () => {
    for (const [spacing, amplitude, norm] of [[1e-50, 1e200, 1e300], [1e100, 1e-200, 1e-200]]) {
      const g = createPsiGrid2D({ nx: 1, ny: 1, xmin: 0, xmax: 2 * spacing!, ymin: 0, ymax: 2 * spacing! });
      g.values[0] = amplitude!;
      const result = measurePosition2D(g, 0.4, 'xy', () => 0);
      expect(Math.abs(result.inputNormSquared / norm! - 1)).toBeLessThan(1e-14);
      expect(Math.abs(result.posteriorNormSquared - 1)).toBeLessThan(1e-14);
      expect(result.state.values.every(Number.isFinite)).toBe(true);
    }
    // Large factory-valid area is not itself invalid; its true state norm matters.
    const tall = createPsiGrid2D({ nx: 2, ny: 2, xmin: 0, xmax: 3, ymin: 0, ymax: 3e200 });
    tall.values[0] = 1e-100;
    expect(measurePosition2D(tall, 0.4, 'x', () => 0).inputNormSquared).toBeCloseTo(1, 14);
    // Even finite per-site squares can overflow their unweighted sum, while area rescues the norm.
    const g = createPsiGrid2D({ nx: 4, ny: 1, xmin: 0, xmax: 0.5, ymin: 0, ymax: 0.2 });
    g.values.fill(1e154);
    expect(measurePosition2D(g, 0.4, 'x', () => 0.5).inputNormSquared / 8e306).toBeCloseTo(1, 14);
  });
});

describe('real numerical edge fixtures (not mocked detector failures)', () => {
  it('normalizes subnormal conditional input-y masses before y convolution', () => {
    const { g, sigma } = subnormalFixture(), before = bytes(g), draws = [0, 0.9];
    const rng = vi.fn(() => draws.shift()!);
    const result = measurePosition2D(g, sigma, 'xy', rng);
    expect(rng).toHaveBeenCalledTimes(2); expect(result.xIndex).toBe(0);
    if (result.axes !== 'xy') throw new Error('Expected xy');
    expect(result.yIndex).toBe(1); expect(result.probability).toBe(Number.MIN_VALUE);
    expect(result.posteriorNormSquared).toBeCloseTo(1, 14); expect(bytes(g)).toEqual(before);
    console.log('2D subnormal conditional fixture', { dx: g.dx, dy: g.dy, sigma, occupiedComponent: 6, amplitude: 1, selectedXMass: Number.MIN_VALUE, selectedYMass: 5 / 9, probability: result.probability });
  });

  it('refuses a zero joint product after two draws at posterior under option A', () => {
    const { g, sigma } = subnormalFixture(), before = bytes(g), rng = vi.fn(() => 0);
    expect(Number.MIN_VALUE * (4 / 9)).toBe(0);
    failure(() => measurePosition2D(g, sigma, 'xy', rng), 'posterior', /unrepresentable.*mass/i);
    expect(rng).toHaveBeenCalledTimes(2); expect(bytes(g)).toEqual(before);
  });

  it('reaches a zero conditional total before the y draw with one retained draw', () => {
    const g = unitGrid(); g.values[2] = 1; g.values[6] = 1;
    const sigma = 1 / Math.sqrt(1490), before = bytes(g), rng = vi.fn(() => 0);
    // x marginal first aggregates the two half masses: 1*MIN_VALUE survives.
    // Each row's conditional 0.5*MIN_VALUE rounds to zero: C=0.
    expect(0.5 * Number.MIN_VALUE).toBe(0);
    failure(() => measurePosition2D(g, sigma, 'xy', rng), 'y-distribution');
    expect(rng).toHaveBeenCalledTimes(1); expect(bytes(g)).toEqual(before);
  });

  it('retains a representable posterior tail by taking axis square roots separately', () => {
    const g = unitGrid(); g.values[0] = 1; g.values[6] = 1;
    const sigma = 1 / Math.sqrt(1490);
    expect(Number.MIN_VALUE * Number.MIN_VALUE).toBe(0);
    const result = measurePosition2D(g, sigma, 'xy', () => 0);
    expect(result.probability).toBeGreaterThan(0);
    expect(result.state.values[6]).toBeGreaterThan(0);
    expect(result.posteriorNormSquared).toBeCloseTo(1, 14);
  });

  it('rescales a positive-mask candidate whose direct unscaled norm underflows', () => {
    const { g, sigma } = subnormalFixture(); g.values[6] = 1e-100;
    const before = bytes(g), mask = Math.sqrt(Number.MIN_VALUE);
    expect((g.values[6]! * mask) ** 2 * g.dx * g.dy).toBe(0);
    const rng = vi.fn(() => 0), result = measurePosition2D(g, sigma, 'x', rng);
    expect(result.probability).toBe(Number.MIN_VALUE); expect(rng).toHaveBeenCalledTimes(1);
    expect(result.posteriorNormSquared).toBeCloseTo(1, 14); expect(bytes(g)).toEqual(before);
  });
});
