import { describe, expect, it } from 'vitest';
import {
  CrankNicolsonStepper, createPsiGrid, initializeGaussian, normalize,
  normSquared, positionExpectation, positionVariance, type PsiGrid,
} from '../src';

// hbar=m=1. Same physical domain and initial conditions for all refinements.
const xLeft = -20, xRight = 20, xCenter = -5, sigma0 = 1;
const times = [0, 0.5, 1, 2];

function prepare(dx: number, k0: number): PsiGrid {
  const psi = createPsiGrid(Math.round((xRight - xLeft) / dx) + 1, dx, xLeft);
  expect(psi.x0 + (psi.count - 1) * dx).toBe(xRight);
  // Unchirped: linear phase only; envelope exp(-(x-xCenter)^2/(4*sigma0^2)).
  initializeGaussian(psi, xCenter, sigma0, k0, false);
  psi.values[0] = psi.values[1] = 0;
  psi.values[2 * psi.count - 2] = psi.values[2 * psi.count - 1] = 0;
  normalize(psi); // Exactly once, AFTER imposing the initial boundary condition.
  return psi;
}

// Independent two-pass density moments, rather than <x^2>-<x>^2.
function moments(psi: PsiGrid) {
  let probability = 0, firstMoment = 0, boundaryMass = 0;
  for (let i = 0; i < psi.count; i++) {
    const x = psi.x0 + i * psi.dx;
    const weight = psi.dx * (psi.values[2 * i]! ** 2 + psi.values[2 * i + 1]! ** 2);
    probability += weight;
    firstMoment += x * weight;
    // The outer two spatial units at EACH end, not just the fixed-zero endpoints.
    if (x <= xLeft + 2 || x >= xRight - 2) boundaryMass += weight;
  }
  const mean = firstMoment / probability;
  let secondCentralMoment = 0;
  for (let i = 0; i < psi.count; i++) {
    const x = psi.x0 + i * psi.dx;
    secondCentralMoment += psi.dx * (x - mean) ** 2 *
      (psi.values[2 * i]! ** 2 + psi.values[2 * i + 1]! ** 2);
  }
  return { probability, mean, sigma: Math.sqrt(secondCentralMoment / probability), boundaryMass };
}

// Continuum reference specified independently of analyticFreeGaussianWidth().
function analytic(t: number, k0: number) {
  return { mean: xCenter + k0 * t, sigma: sigma0 * Math.sqrt(1 + t ** 2 / (4 * sigma0 ** 4)) };
}

function evolve(dx: number, dt: number, k0: number) {
  const psi = prepare(dx, k0);
  const potential = new Float64Array(psi.count); // V=0, never altered.
  const stepper = new CrankNicolsonStepper();
  const p0 = moments(psi).probability;
  expect(Math.abs(p0 - 1)).toBeLessThan(2e-15);
  let maxNormDrift = 0, maxBoundaryMass = 0, minBoundarySigmas = Infinity;
  const samples: Array<ReturnType<typeof moments> & { t: number }> = [];
  const steps = Math.round(2 / dt);
  expect(Math.abs(steps * dt - 2)).toBeLessThan(1e-14);
  for (let step = 0; step <= steps; step++) {
    if (step > 0) stepper.step(psi, potential, dt);
    const measured = moments(psi);
    maxNormDrift = Math.max(maxNormDrift, Math.abs(measured.probability - p0));
    maxBoundaryMass = Math.max(maxBoundaryMass, measured.boundaryMass);
    minBoundarySigmas = Math.min(minBoundarySigmas,
      Math.min(measured.mean - xLeft, xRight - measured.mean) / measured.sigma);
    expect([psi.values[0], psi.values[1], psi.values.at(-2), psi.values.at(-1)]).toEqual([0, 0, 0, 0]);
    if (times.some(t => Math.abs(step * dt - t) < 1e-14)) {
      // Moment utilities use a different accumulation and variance formula.
      expect(Math.abs(measured.mean - positionExpectation(psi))).toBeLessThan(1e-12);
      expect(Math.abs(measured.sigma ** 2 - positionVariance(psi))).toBeLessThan(1e-12);
      expect(Math.abs(measured.probability - normSquared(psi))).toBeLessThan(1e-14);
      samples.push({ t: step * dt, ...measured });
    }
  }
  // Roundoff budget for up to 1600 steps, NOT a continuum accuracy tolerance.
  expect(maxNormDrift).toBeLessThan(5e-12);
  // >9 measured standard deviations to the wall plus negligible outer-strip mass
  // at EVERY step ensures the tested time interval precedes boundary reflections.
  expect(minBoundarySigmas).toBeGreaterThan(9);
  expect(maxBoundaryMass).toBeLessThan(1e-14);
  return { psi, samples, final: moments(psi), maxNormDrift, maxBoundaryMass, minBoundarySigmas };
}

function stateDistance(a: PsiGrid, b: PsiGrid): number {
  let sum = 0;
  for (let i = 0; i < a.values.length; i++) sum += (a.values[i]! - b.values[i]!) ** 2;
  return Math.sqrt(a.dx * sum); // Complex dx-weighted L2 error, including phase.
}

describe('analytic free Gaussian evolution', () => {
  it.each([0, 0.75])('matches continuum mean and standard deviation for k0=%s', k0 => {
    const result = evolve(0.1, 0.01, k0);
    expect(result.samples.map(s => s.t)).toEqual(times);
    let previousSigma = 0;
    for (const sample of result.samples) {
      const reference = analytic(sample.t, k0);
      // Preliminary physical accuracy target; refinements below test convergence
      // rather than hiding finite-difference/temporal dispersion in this bound.
      expect(Math.abs(sample.mean - reference.mean)).toBeLessThan(0.01);
      expect(Math.abs(sample.sigma - reference.sigma)).toBeLessThan(0.01);
      if (sample.t === 0) {
        expect(Math.abs(sample.mean - reference.mean)).toBeLessThan(1e-12);
        expect(Math.abs(sample.sigma - reference.sigma)).toBeLessThan(1e-12);
      }
      if (k0 === 0) expect(Math.abs(sample.mean - xCenter)).toBeLessThan(1e-12);
      expect(sample.sigma).toBeGreaterThan(previousSigma);
      previousSigma = sample.sigma;
    }
    if (k0 !== 0) expect(Math.abs((result.final.mean - xCenter) / 2 - k0)).toBeLessThan(0.005);
  });

  it('converges spatially toward continuum moments on the same domain at t=2', () => {
    // dt=0.0025 makes temporal error much smaller than the dx=0.05 error.
    const reference = analytic(2, 0.75);
    const errors = [0.2, 0.1, 0.05].map(dx => {
      const result = evolve(dx, 0.0025, 0.75);
      return { dx, mean: Math.abs(result.final.mean - reference.mean),
        sigma: Math.abs(result.final.sigma - reference.sigma), norm: result.maxNormDrift,
        boundaryMass: result.maxBoundaryMass, boundarySigmas: result.minBoundarySigmas };
    });
    for (let i = 1; i < errors.length; i++) {
      for (const key of ['mean', 'sigma'] as const) {
        const ratio = errors[i - 1]![key] / errors[i]![key];
        // O(dx^2) predicts factor 4; allow higher-order and temporal contributions.
        expect(ratio).toBeGreaterThan(3.6);
        expect(ratio).toBeLessThan(4.4);
      }
    }
  });

  it('converges quadratically in time against a fine-dt solution on a fixed grid', () => {
    // Same dx throughout: spatial error cancels in the numerical comparison.
    const reference = evolve(0.1, 0.00125, 0.75);
    const checkReference = evolve(0.1, 0.0025, 0.75);
    const errors = [0.08, 0.04, 0.02].map(dt => {
      const result = evolve(0.1, dt, 0.75);
      return { dt, error: stateDistance(result.psi, reference.psi), norm: result.maxNormDrift };
    });
    for (let i = 1; i < errors.length; i++) {
      const ratio = errors[i - 1]!.error / errors[i]!.error;
      expect(ratio).toBeGreaterThan(3.6);
      expect(ratio).toBeLessThan(4.4);
    }
    // Verify that the reference's own time error is well below the smallest
    // measured error, and measured errors are far above roundoff.
    const referenceDifference = stateDistance(reference.psi, checkReference.psi);
    expect(referenceDifference).toBeLessThan(0.02 * errors[2]!.error);
    expect(errors[2]!.error).toBeGreaterThan(1e-9);
  }, 20000);
});
