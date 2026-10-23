import { describe, expect, it } from 'vitest';
import { runScatteringExperiment, createScatteringExperiment, SCATTERING_CONFIG, type ScatteringRun } from '../src';

import { stationaryGaussian, stationaryPacketTransmission } from './helpers/stationaryGaussian';

const cache = new Map<string, ScatteringRun>();
function run(amplitude = 1.8, dx = 0.1, dt = 0.02, halfExtent = 120) {
  const key = [amplitude, dx, dt, halfExtent].join(',');
  let result = cache.get(key);
  if (!result) {
    result = runScatteringExperiment({ amplitude, dx, dt, halfExtent });
    cache.set(key, result);
  }
  return result;
}
function outgoing(result: ScatteringRun) {
  return result.samples.filter(s => s.time >= SCATTERING_CONFIG.windowStart);
}

describe('resolved Gaussian-barrier scattering (no wall returns)', () => {
  it.each([0, 1.2, 1.8, 5])('accounts for probability and conserves norm/static energy for height %s', amplitude => {
    const r = run(amplitude);
    expect(r.samples[0]!.left).toBeGreaterThan(0.9999999999);
    // Incoming left mass is NOT reflection. Samples remain raw regional masses.
    for (const s of r.samples) {
      expect(Math.abs(s.left + s.interaction + s.right - s.norm)).toBeLessThan(5e-14);
      expect([s.left, s.interaction, s.right].every(p => Number.isFinite(p) && p >= 0)).toBe(true);
    }
    // Roundoff budgets for thousands of steps; independent of R/T accuracy.
    expect(r.maxNormDrift).toBeLessThan(2e-11);
    expect(r.maxEnergyDrift).toBeLessThan(2e-11);
    expect(r.maxBoundaryMass).toBeLessThan(1e-12);
    expect([r.psi.values[0], r.psi.values[1], r.psi.values.at(-2), r.psi.values.at(-1)]).toEqual([0, 0, 0, 0]);
    const window = outgoing(r);
    expect(window.map(s => s.time)).toEqual([40, 41, 42, 43, 44]);
    expect(Math.max(...window.map(s => s.interaction))).toBeLessThan(1e-5);
    for (const key of ['left', 'right'] as const) {
      const values = window.map(s => s[key]);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThan(1e-5);
    }
  }, 30000);

  it('has approximately unit free transmission, dominant strong-barrier reflection, and a split packet', () => {
    expect(run(0).samples.at(-1)!.right).toBeGreaterThan(0.99999);
    expect(run(5).samples.at(-1)!.left).toBeGreaterThan(0.999);
    const partial = run(1.2).samples.at(-1)!;
    expect(partial.left).toBeGreaterThan(0.4); expect(partial.left).toBeLessThan(0.5);
    expect(partial.right).toBeGreaterThan(0.5); expect(partial.right).toBeLessThan(0.6);
  });

  it('converges spatially in outgoing probability, with a useful extrapolation error budget', () => {
    // Keep time fine so dx refinement is not hidden by temporal error.
    const values = [0.2, 0.1, 0.05].map(dx => run(1.8, dx, 0.01).samples.at(-1)!.right);
    const coarseChange = Math.abs(values[0]! - values[1]!);
    const fineChange = Math.abs(values[1]! - values[2]!);
    expect(coarseChange / fineChange).toBeGreaterThan(3.5);
    expect(coarseChange / fineChange).toBeLessThan(4.5);
    // At dx=.1 the remaining O(dx^2) error is about 4/3 of this difference.
    // Measured ~0.001234: a 0.0015 probability budget, not 0.1% precision.
    expect(4 / 3 * fineChange).toBeLessThan(0.0015);
  }, 60000);

  it.each([1.2, 5])('refines the contrast case A=%s toward independent packet-weighted stationary transmission', amplitude => {
    const base = run(amplitude), fine = run(amplitude, 0.05);
    const coarseT = base.samples.at(-1)!.right, fineT = fine.samples.at(-1)!.right;
    expect(Math.abs(coarseT - fineT)).toBeLessThan(0.002);
    const extrapolated = (4 * fineT - coarseT) / 3;
    expect(Math.abs(extrapolated - stationaryPacketTransmission(amplitude).transmission)).toBeLessThan(2e-5);
    expect(fine.maxNormDrift).toBeLessThan(2e-11); expect(fine.maxEnergyDrift).toBeLessThan(2e-11);
    expect(fine.maxBoundaryMass).toBeLessThan(1e-12);
    expect(Math.max(...outgoing(fine).map(s => s.interaction))).toBeLessThan(1e-5);
  }, 30000);

  it('converges temporally in full complex state while post-scattering probabilities stay stable', () => {
    const results = [0.04, 0.02, 0.01].map(dt => run(1.8, 0.1, dt));
    function distance(a: ScatteringRun, b: ScatteringRun) {
      let sum = 0;
      for (let i = 0; i < a.psi.values.length; i++) sum += (a.psi.values[i]! - b.psi.values[i]!) ** 2;
      return Math.sqrt(a.psi.dx * sum);
    }
    const coarse = distance(results[0]!, results[1]!), fine = distance(results[1]!, results[2]!);
    expect(coarse).toBeGreaterThan(1e-5);
    expect(coarse / fine).toBeGreaterThan(3.8); expect(coarse / fine).toBeLessThan(4.2);
    const transmissions = results.map(r => r.samples.at(-1)!.right);
    expect(Math.max(...transmissions) - Math.min(...transmissions)).toBeLessThan(1e-6);
  }, 60000);

  it('has unchanged outgoing masses on enlarging the domain and is deterministic', () => {
    const base = run(), larger = run(1.8, 0.1, 0.02, 160);
    expect(Math.abs(base.samples.at(-1)!.right - larger.samples.at(-1)!.right)).toBeLessThan(1e-10);
    const repeated = runScatteringExperiment();
    expect(repeated.psi.values).toEqual(base.psi.values);
  }, 60000);

  it('validates the independent stationary benchmark by free propagation and flux conservation', () => {
    for (const k of [0.5, 1.5, 2.5]) {
      expect(Math.abs(stationaryGaussian(k, 0).transmission - 1)).toBeLessThan(1e-7);
      for (const amplitude of [1.2, 1.8, 5]) {
        const s = stationaryGaussian(k, amplitude);
        expect(Math.abs(s.transmission + s.reflection - 1)).toBeLessThan(1e-7);
      }
    }
  });

  it('shows sub-barrier transmission exceeding a conservative incident over-barrier tail bound', () => {
    const r = run(), transmitted = r.samples.at(-1)!.right;
    const p0 = 1.5, sigmaP = 1 / (2 * 3), maximum = 1.8;
    expect(r.initialKineticEnergy).toBeLessThan(maximum);
    // For a normal momentum distribution, Q(z) < phi(z)/z (Mills bound).
    // Include BOTH |k|>sqrt(2*Vmax) tails. E_h(k)<=k²/2, so this continuum
    // cutoff conservatively includes every over-barrier lattice component too.
    const mills = (z: number) => Math.exp(-z * z / 2) / (Math.sqrt(2 * Math.PI) * z);
    const cutoff = Math.sqrt(2 * maximum);
    const upperTail = mills((cutoff - p0) / sigmaP) + mills((cutoff + p0) / sigmaP);
    expect(upperTail).toBeLessThan(0.01);
    expect(transmitted).toBeGreaterThan(0.19);
    expect(transmitted - upperTail).toBeGreaterThan(0.18);

    const reference = stationaryPacketTransmission(maximum);
    const refined = stationaryPacketTransmission(maximum, 640, 0.005);
    expect(Math.abs(reference.weight - 1)).toBeLessThan(1e-12);
    expect(Math.abs(reference.transmission - refined.transmission)).toBeLessThan(1e-7);
    const coarse = run(1.8, 0.1, 0.01).samples.at(-1)!.right;
    const fine = run(1.8, 0.05, 0.01).samples.at(-1)!.right;
    const extrapolated = (4 * fine - coarse) / 3;
    expect(Math.abs(extrapolated - refined.transmission)).toBeLessThan(3e-5);
    // Wave-packet transmission is not a monochromatic value at k=p0.
    expect(Math.abs(refined.transmission - stationaryGaussian(p0, maximum).transmission)).toBeGreaterThan(0.005);
  }, 60000);

  it('rejects invalid experiment discretizations and sampling schedules', () => {
    for (const options of [{ dx: 0 }, { dx: 0.17 }, { halfExtent: 20 }, { amplitude: -1 }]) {
      expect(() => createScatteringExperiment(options)).toThrow(RangeError);
    }
    for (const options of [{ dt: 0 }, { endTime: -1 }, { sampleInterval: 0.013 }, { dt: NaN }]) {
      expect(() => runScatteringExperiment(options)).toThrow(RangeError);
    }
  });
});
