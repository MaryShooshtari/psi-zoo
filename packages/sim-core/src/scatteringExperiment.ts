import { createPsiGrid, normSquared, type PsiGrid } from './grid';
import { initializeGaussian } from './gaussian';
import { normalize } from './math';
import { createGaussianBarrier, createZeroPotential } from './potential';
import { CrankNicolsonStepper } from './crankNicolson';
import { energyExpectation } from './hamiltonian';
import { probabilityRegions, type RegionProbabilities } from './regions';

/** Resolved left-incident numerical experiment, hbar=m=1, Dirichlet walls.
 * The validated window applies ONLY to the unchanged default packet/barrier.
 * Changing resolution/domain in headless runs requires the same convergence checks.
 */
export const SCATTERING_CONFIG = Object.freeze({
  halfExtent: 120, dx: 0.1, dt: 0.02,
  center: -24, sigma: 3, momentum: 1.5,
  amplitude: 1.8, barrierSigma: 0.6, barrierCenter: 0,
  leftEdge: -4, rightEdge: 4,
  windowStart: 40, windowEnd: 44, residualLimit: 1e-5,
});

export interface ScatteringOptions {
  readonly amplitude?: number;
  readonly dx?: number;
  readonly halfExtent?: number;
}
export interface ScatteringRunOptions extends ScatteringOptions {
  readonly dt?: number;
  readonly endTime?: number;
  readonly sampleInterval?: number;
}
export interface ScatteringSample extends RegionProbabilities {
  readonly time: number;
  readonly norm: number;
  readonly energy: number;
  readonly boundaryMass: number;
}
export interface ScatteringRun {
  readonly psi: PsiGrid;
  readonly potential: Float64Array;
  readonly samples: readonly ScatteringSample[];
  readonly initialKineticEnergy: number;
  readonly maxNormDrift: number;
  readonly maxEnergyDrift: number;
  readonly maxAccountingError: number;
  readonly maxBoundaryMass: number;
}

function integralSteps(duration: number, dt: number): number {
  const ratio = duration / dt;
  const count = Math.round(ratio);
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isSafeInteger(count) || count < 1
    || Math.abs(ratio - count) > 1e-8) {
    throw new RangeError('Duration must be positive, finite, and an integer number of steps');
  }
  return count;
}

/** Allocates a reproducible initial state and real Gaussian potential. No stepping. */
export function createScatteringExperiment(options: ScatteringOptions = {}): { psi: PsiGrid; potential: Float64Array } {
  const { dx = SCATTERING_CONFIG.dx, halfExtent = SCATTERING_CONFIG.halfExtent,
    amplitude = SCATTERING_CONFIG.amplitude } = options;
  if (!Number.isFinite(dx) || dx <= 0 || !Number.isFinite(halfExtent) || halfExtent < 60) {
    throw new RangeError('dx must be positive and finite; halfExtent must be finite and >= 60');
  }
  const intervals = integralSteps(2 * halfExtent, dx);
  const psi = createPsiGrid(intervals + 1, dx, -halfExtent);
  const potential = createGaussianBarrier(psi, {
    amplitude, sigma: SCATTERING_CONFIG.barrierSigma, center: SCATTERING_CONFIG.barrierCenter,
  });
  initializeGaussian(psi, SCATTERING_CONFIG.center, SCATTERING_CONFIG.sigma, SCATTERING_CONFIG.momentum, false);
  psi.values[0] = psi.values[1] = psi.values[2 * psi.count - 2] = psi.values[2 * psi.count - 1] = 0;
  normalize(psi);
  return { psi, potential };
}

/** Deterministic headless experiment using the unchanged CN solver. Samples raw
 * regions at fixed times; does not label approaching incident mass as reflection.
 * Drifts and boundary-strip mass are maxima at SAMPLED times, not certified bounds
 * between samples. Returns final state for full-complex-state refinement tests.
 */
export function runScatteringExperiment(options: ScatteringRunOptions = {}): ScatteringRun {
  const { dt = SCATTERING_CONFIG.dt, endTime = SCATTERING_CONFIG.windowEnd, sampleInterval = 1 } = options;
  if (!Number.isFinite(dt) || dt <= 0) throw new RangeError('dt must be positive and finite');
  const steps = integralSteps(endTime, dt), sampleSteps = integralSteps(sampleInterval, dt);
  if (steps % sampleSteps !== 0) throw new RangeError('endTime must be an integer number of sample intervals');
  const { psi, potential } = createScatteringExperiment(options);
  const n0 = normSquared(psi), e0 = energyExpectation(psi, potential).real;
  const initialKineticEnergy = energyExpectation(psi, createZeroPotential(psi)).real / n0;
  const stepper = new CrankNicolsonStepper(), samples: ScatteringSample[] = [];
  let maxNormDrift = 0, maxEnergyDrift = 0, maxAccountingError = 0, maxBoundaryMass = 0;
  for (let step = 0; step <= steps; step++) {
    if (step > 0) stepper.step(psi, potential, dt);
    if (step % sampleSteps !== 0) continue;
    const regions = probabilityRegions(psi, SCATTERING_CONFIG.leftEdge, SCATTERING_CONFIG.rightEdge);
    const norm = normSquared(psi), energy = energyExpectation(psi, potential).real;
    const boundary = probabilityRegions(psi, psi.x0 + 5, psi.x0 + (psi.count - 1) * psi.dx - 5);
    const boundaryMass = boundary.left + boundary.right;
    maxNormDrift = Math.max(maxNormDrift, Math.abs(norm - n0));
    maxEnergyDrift = Math.max(maxEnergyDrift, Math.abs(energy - e0));
    maxAccountingError = Math.max(maxAccountingError, Math.abs(regions.total - norm));
    maxBoundaryMass = Math.max(maxBoundaryMass, boundaryMass);
    samples.push({ time: step * dt, ...regions, norm, energy, boundaryMass });
  }
  return { psi, potential, samples, initialKineticEnergy, maxNormDrift, maxEnergyDrift, maxAccountingError, maxBoundaryMass };
}
