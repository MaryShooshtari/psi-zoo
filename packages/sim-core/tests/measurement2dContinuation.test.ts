import { describe, expect, it } from 'vitest';
import { createPsiGrid2D, initializeGaussian2D, CayleyStepper2D, normSquared2D, positionMoments2D,
  measurePosition2D, type PositionMeasurement2DAxes } from '../src';

declare const console: { log(...args: unknown[]): void };

// Discrete validity at the approved default, not a continuum-accuracy claim at
// sigma=0.2. All 128x128 stored sites are interior; four unstored zero boundaries.
// hbar=m=1, dx=dy=20/129, dt=1/120. No per-step normalization.
describe('default-grid measurement and unchanged Cayley continuation', () => {
  for (const axes of ['x', 'xy'] as const) for (const sigma of [0.2, 0.4, 2]) {
    it.each([false, true])(`ten ${axes} updates then 240 steps, sigma=${sigma}, wall=%s`, wall => {
      let state = createPsiGrid2D();
      initializeGaussian2D(state, { x0: wall ? -9.6 : 0, y0: wall ? 9.6 : 0, sigmaX: 0.8, sigmaY: 1.1, px: 0.3, py: -0.2 });
      let maxPosteriorError = 0, calls = 0;
      for (let action = 0; action < 10; action++) {
        const result = measurePosition2D(state, sigma, axes, () => {
          calls++;
          return action % 2 === 0 ? 0.35 : 0.65;
        });
        maxPosteriorError = Math.max(maxPosteriorError, Math.abs(normSquared2D(result.state) - 1), Math.abs(result.posteriorNormSquared - 1));
        expect(result.state.values.every(Number.isFinite)).toBe(true);
        state = result.state;
      }
      expect(calls).toBe(axes === 'x' ? 10 : 20);
      expect(maxPosteriorError).toBeLessThanOrEqual(1e-11);
      const initialNorm = normSquared2D(state), stepper = new CayleyStepper2D(state);
      const potential = Float64Array.from({ length: state.nx * state.ny }, (_, k) => {
        const x = state.xmin + (k % state.nx + 1) * state.dx;
        const y = state.ymin + (Math.floor(k / state.nx) + 1) * state.dy;
        return 0.02 * (x * x + y * y); // frozen, real Hermitian potential
      });
      let maxDrift = 0;
      for (let step = 0; step < 240; step++) {
        stepper.step(state, potential, 1 / 120);
        maxDrift = Math.max(maxDrift, Math.abs(normSquared2D(state) - initialNorm));
      }
      expect(maxDrift).toBeLessThanOrEqual(1e-10);
      expect(state.values.every(Number.isFinite)).toBe(true);
      console.log('2D measurement continuation (discrete only)', { axes, sigma, wall, calls, maxPosteriorError, maxDrift });
    });
  }

  it.each(['x', 'xy'] as PositionMeasurement2DAxes[])('matches an independently specified resolved Gaussian posterior-width convention: %s', axes => {
    const g = createPsiGrid2D();
    // Prior POSITION DENSITY variances sX²,sY²; detector likelihood has variance
    // sigma². Product variance is (s^-2+sigma^-2)^-1, not sigma² or sigma²/2.
    const sx = 1.2, sy = 0.9, sigma = 0.8;
    initializeGaussian2D(g, { sigmaX: sx, sigmaY: sy, px: 0.4, py: -0.3 });
    const result = measurePosition2D(g, sigma, axes, () => 0.5);
    const moments = positionMoments2D(result.state);
    // These centered, resolved fixtures have exponentially tiny wall/lattice
    // corrections; 1e-10 also covers ordinary Float64 summation at 16384 sites.
    expect(Math.abs(moments.varianceX - 1 / (1 / sx ** 2 + 1 / sigma ** 2))).toBeLessThan(1e-10);
    const expectedY = axes === 'xy' ? 1 / (1 / sy ** 2 + 1 / sigma ** 2) : sy ** 2;
    expect(Math.abs(moments.varianceY - expectedY)).toBeLessThan(1e-10);
    // This immediate-posterior check makes no assertion about continuum
    // spreading at the sharp minimum or energy conservation across an update.
  });
});
