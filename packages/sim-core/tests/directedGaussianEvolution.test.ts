import { describe, expect, it } from 'vitest';
import {
  CrankNicolsonStepper, createPsiGrid, createZeroPotential, initializeGaussian,
  normalize, normSquared, energyExpectation, positionExpectation, positionVariance,
} from '../src';

// Same dx, dt and sigma as the browser. Center at 0 to isolate both directions
// equally from the walls on [-20,20]. No periodic solver or normalization in time.
const dx = 0.1, sigma = 1, finalTime = 2;

/** Independent spectral reference, not computed by applying H or the stepper.
 * E_h(k)=(1-cos(k*h))/h^2; CN phase frequency=2 atan(dt*E_h/2)/dt.
 * Average its derivative over |psi_hat|^2 ~ exp(-2*sigma^2*(k-p0)^2).
 * Gaussian aliasing at this dx is negligible. Integrate over the first Brillouin
 * zone with midpoint quadrature and explicitly check quadrature refinement.
 */
function spectralVelocity(p0: number, dt: number, samples = 8192): number {
  let weight = 0, weightedVelocity = 0;
  const dk = 2 * Math.PI / dx / samples;
  for (let j = 0; j < samples; j++) {
    const k = -Math.PI / dx + (j + 0.5) * dk;
    const density = Math.exp(-2 * sigma ** 2 * (k - p0) ** 2);
    const energy = (1 - Math.cos(k * dx)) / dx ** 2;
    const velocity = Math.sin(k * dx) / dx / (1 + (dt * energy / 2) ** 2);
    weight += density;
    weightedVelocity += density * velocity;
  }
  return weightedVelocity / weight;
}

function evolve(p0: number, dt = 0.01) {
  const psi = createPsiGrid(401, dx, -20);
  initializeGaussian(psi, 0, sigma, p0, false);
  psi.values[0] = psi.values[1] = psi.values[2 * psi.count - 2] = psi.values[2 * psi.count - 1] = 0;
  normalize(psi);
  const potential = createZeroPotential(psi), stepper = new CrankNicolsonStepper();
  const n0 = normSquared(psi), e0 = energyExpectation(psi, potential).real;
  const initialMean = positionExpectation(psi);
  const referenceVelocity = spectralVelocity(p0, dt);
  expect(Math.abs(referenceVelocity - spectralVelocity(p0, dt, 16384))).toBeLessThan(2e-14);
  let maxNormDrift = 0, maxEnergyDrift = 0, maxCentroidError = 0;
  let maxBoundaryMass = 0, minWallSigmas = Infinity;
  for (let step = 0; step <= Math.round(finalTime / dt); step++) {
    if (step > 0) stepper.step(psi, potential, dt);
    const mean = positionExpectation(psi);
    maxNormDrift = Math.max(maxNormDrift, Math.abs(normSquared(psi) - n0));
    maxEnergyDrift = Math.max(maxEnergyDrift, Math.abs(energyExpectation(psi, potential).real - e0));
    maxCentroidError = Math.max(maxCentroidError, Math.abs(mean - initialMean - step * dt * referenceVelocity));
    const width = Math.sqrt(positionVariance(psi));
    minWallSigmas = Math.min(minWallSigmas, (20 - Math.abs(mean)) / width);
    let boundaryMass = 0;
    for (let i = 0; i < psi.count; i++) {
      const x = psi.x0 + i * psi.dx;
      if (Math.abs(x) >= 18) boundaryMass += psi.dx * (psi.values[2 * i]! ** 2 + psi.values[2 * i + 1]! ** 2);
    }
    maxBoundaryMass = Math.max(maxBoundaryMass, boundaryMass);
    expect([psi.values[0], psi.values[1], psi.values.at(-2), psi.values.at(-1)]).toEqual([0, 0, 0, 0]);
  }
  // Roundoff budgets for <=400 solves and repeated moment summation.
  expect(maxNormDrift).toBeLessThan(2e-12);
  expect(maxEnergyDrift).toBeLessThan(2e-12 * Math.max(1, Math.abs(e0)));
  // Spectral prediction includes spatial dispersion, finite momentum spread and
  // CN phase error. Its agreement is not a continuum-accuracy claim.
  expect(maxCentroidError).toBeLessThan(2e-11);
  expect(minWallSigmas).toBeGreaterThan(12);
  expect(maxBoundaryMass).toBeLessThan(1e-20);
  return { velocity: (positionExpectation(psi) - initialMean) / finalTime, referenceVelocity };
}

describe('directed free Gaussian evolution, hbar=m=1', () => {
  it.each([-1.5, -0.75, 0, 0.75, 1.5])('matches finite-difference/CN motion for p0=%s before wall interactions', p0 => {
    const result = evolve(p0);
    const carrierVelocity = Math.sin(p0 * dx) / dx;
    // A finite Gaussian averages velocities over its momentum spread. For exact
    // time evolution on the infinite spatial lattice this adds the overlap factor.
    const latticePacketVelocity = Math.exp(-(dx ** 2) / (8 * sigma ** 2)) * carrierVelocity;
    expect(Math.abs(result.velocity - latticePacketVelocity)).toBeLessThan(2e-4);
    // Conservative total velocity accuracy within the UI range, not roundoff.
    expect(Math.abs(result.velocity - p0)).toBeLessThan(0.008);
    if (p0 === 0) expect(Math.abs(result.velocity)).toBeLessThan(1e-13);
    else {
      expect(Math.sign(result.velocity)).toBe(Math.sign(p0));
      expect(Math.abs(result.velocity)).toBeLessThan(Math.abs(carrierVelocity));
    }
  });

  it('reduces the temporal velocity error quadratically toward the finite-width lattice result', () => {
    const p0 = 1.5;
    const latticeVelocity = Math.exp(-(dx ** 2) / (8 * sigma ** 2)) * Math.sin(p0 * dx) / dx;
    const coarse = evolve(p0, 0.01), fine = evolve(p0, 0.005);
    const coarseError = Math.abs(coarse.velocity - latticeVelocity);
    const fineError = Math.abs(fine.velocity - latticeVelocity);
    expect(coarseError).toBeGreaterThan(1e-5); // Error is resolved above roundoff.
    expect(coarseError / fineError).toBeGreaterThan(3.9);
    expect(coarseError / fineError).toBeLessThan(4.1);
  });
});
