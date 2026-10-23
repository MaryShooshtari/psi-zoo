import { describe, expect, it } from 'vitest';
import { createPsiGrid, normSquared } from '../src/grid';
import {
  initializeGaussian,
  analyticGaussianNorm,
  analyticGaussianWidth,
  analyticGaussianPositionExpectation,
  analyticGaussianMomentumExpectation,
  analyticFreeGaussianWidth,
} from '../src/gaussian';
import { normalize, positionExpectation, positionVariance, momentumExpectation } from '../src/math';

describe('Gaussian wavepacket initialization', () => {
  it('defaults omitted momentum to zero, preserving explicit and unnormalized calls', () => {
    const implicit = createPsiGrid(401, 0.1, -20), explicit = createPsiGrid(401, 0.1, -20);
    initializeGaussian(implicit, -5, 1);
    initializeGaussian(explicit, -5, 1, 0);
    expect(implicit.values).toEqual(explicit.values);
    for (let i = 0; i < implicit.count; i++) expect(Math.abs(implicit.values[2 * i + 1]!)).toBe(0);
    initializeGaussian(implicit, -5, 1, undefined, false);
    expect(implicit.values[300]).toBe(1);
    expect(Math.abs(normSquared(implicit) - Math.sqrt(2 * Math.PI))).toBeLessThan(1e-14);
  });

  it.each([-1.5, -0.75, 0, 0.75, 1.5])('preserves norm, density width, and phase gradient for p0=%s', p0 => {
    const psi = createPsiGrid(401, 0.1, -20);
    initializeGaussian(psi, -5, 1, p0);
    expect(Math.abs(normSquared(psi) - 1)).toBeLessThan(2e-15);
    expect(Math.abs(positionExpectation(psi) + 5)).toBeLessThan(1e-12);
    expect(Math.abs(positionVariance(psi) - 1)).toBeLessThan(1e-12);
    // Adjacent complex overlap, normalized by magnitudes, measures phase gradient
    // without relying on branch-sensitive atan2 or an absolute global phase.
    for (let i = 140; i < 160; i++) {
      const ar = psi.values[2 * i]!, ai = psi.values[2 * i + 1]!;
      const br = psi.values[2 * (i + 1)]!, bi = psi.values[2 * (i + 1) + 1]!;
      const magnitude = Math.hypot(ar, ai) * Math.hypot(br, bi);
      expect(Math.abs((ar * br + ai * bi) / magnitude - Math.cos(p0 * psi.dx))).toBeLessThan(3e-15);
      expect(Math.abs((ar * bi - ai * br) / magnitude - Math.sin(p0 * psi.dx))).toBeLessThan(3e-15);
    }
    // The central-difference momentum observable is not the continuum p0.
    const expectedDiscrete = Math.exp(-(psi.dx ** 2) / 8) * Math.sin(p0 * psi.dx) / psi.dx;
    expect(Math.abs(momentumExpectation(psi) - expectedDiscrete)).toBeLessThan(2e-14);
  });

  it('keeps the legacy absolute phase and gives conjugate states for opposite momenta', () => {
    const positive = createPsiGrid(401, 0.1, -20), negative = createPsiGrid(401, 0.1, -20);
    initializeGaussian(positive, -5, 1, 0.75, false);
    initializeGaussian(negative, -5, 1, -0.75, false);
    for (let i = 0; i < positive.count; i++) {
      const x = positive.x0 + i * positive.dx;
      const envelope = Math.exp(-((x + 5) ** 2) / 4);
      expect(positive.values[2 * i]).toBe(envelope * Math.cos(0.75 * x));
      expect(positive.values[2 * i + 1]).toBe(envelope * Math.sin(0.75 * x));
      expect(negative.values[2 * i]).toBe(positive.values[2 * i]);
      expect(negative.values[2 * i + 1]).toBe(-positive.values[2 * i + 1]!);
    }
  });

  it.each([NaN, Infinity, -Infinity])('rejects nonfinite momentum/center %s before writing', invalid => {
    const psi = createPsiGrid(41, 0.1, -2);
    psi.values.fill(0.25);
    const before = psi.values.slice();
    expect(() => initializeGaussian(psi, 0, 1, invalid)).toThrow(RangeError);
    expect(psi.values).toEqual(before);
    expect(() => initializeGaussian(psi, invalid, 1, 0)).toThrow(RangeError);
    expect(psi.values).toEqual(before);
  });
  it('creates a Gaussian centered at x0 with given sigma', () => {
    const grid = createPsiGrid(100, 0.1, -5);
    const xCenter = 0;
    const sigma = 1.0;
    const k0 = 0;
    
    initializeGaussian(grid, xCenter, sigma, k0, true);
    
    // Check that the peak is at the center
    const centerIndex = Math.round((xCenter - grid.x0) / grid.dx);
    let maxValue = 0;
    let maxIndex = 0;
    for (let i = 0; i < grid.count; i++) {
      const re = grid.values[2 * i]!;
      const im = grid.values[2 * i + 1]!;
      const magnitude = Math.sqrt(re * re + im * im);
      if (magnitude > maxValue) {
        maxValue = magnitude;
        maxIndex = i;
      }
    }
    
    // With grid from -5 to 5 (dx=0.1, 100 points), center at x=0 is at index 50
    expect(maxIndex).toBeCloseTo(centerIndex, 1);
  });

  it('creates a Gaussian with specified momentum (k0)', () => {
    const grid = createPsiGrid(100, 0.1, -5);
    const xCenter = 0;
    const sigma = 1.0;
    const k0 = 2.0; // Non-zero momentum
    
    initializeGaussian(grid, xCenter, sigma, k0, true);
    
    // With non-zero k0, the wavefunction should have imaginary components
    let hasImaginary = false;
    for (let i = 0; i < grid.count; i++) {
      if (Math.abs(grid.values[2 * i + 1]!) > 1e-10) {
        hasImaginary = true;
        break;
      }
    }
    
    expect(hasImaginary).toBe(true);
  });

  it('creates a real Gaussian when k0 = 0', () => {
    const grid = createPsiGrid(100, 0.1, -5);
    const xCenter = 0;
    const sigma = 1.0;
    const k0 = 0;
    
    initializeGaussian(grid, xCenter, sigma, k0, true);
    
    // With k0 = 0, all imaginary parts should be zero
    for (let i = 0; i < grid.count; i++) {
      expect(grid.values[2 * i + 1]!).toBeCloseTo(0, 10);
    }
  });

  it('normalizes the Gaussian when normalize=true', () => {
    const grid = createPsiGrid(100, 0.1, -5);
    const xCenter = 0;
    const sigma = 1.0;
    const k0 = 0;
    
    initializeGaussian(grid, xCenter, sigma, k0, true);
    
    // Compute norm squared
    let sum = 0;
    for (let i = 0; i < grid.count; i++) {
      const re = grid.values[2 * i]!;
      const im = grid.values[2 * i + 1]!;
      sum += re * re + im * im;
    }
    const normSq = grid.dx * sum;
    
    expect(normSq).toBeCloseTo(1, 10);
  });

  it('does not normalize when normalize=false', () => {
    const grid = createPsiGrid(100, 0.1, -5);
    const xCenter = 0;
    const sigma = 1.0;
    const k0 = 0;
    
    initializeGaussian(grid, xCenter, sigma, k0, false);
    
    // Compute norm squared - should not be 1
    let sum = 0;
    for (let i = 0; i < grid.count; i++) {
      const re = grid.values[2 * i]!;
      const im = grid.values[2 * i + 1]!;
      sum += re * re + im * im;
    }
    const normSq = grid.dx * sum;
    
    // For a Gaussian with sigma=1, the analytic norm is sigma * sqrt(2*pi) = sqrt(2*pi)
    // But we're using discrete approximation, so just check it's not 1
    expect(normSq).not.toBeCloseTo(1, 5);
  });

  it('throws for invalid sigma', () => {
    const grid = createPsiGrid(100, 0.1, -5);
    expect(() => initializeGaussian(grid, 0, 0, 0)).toThrow(RangeError);
    expect(() => initializeGaussian(grid, 0, -1, 0)).toThrow(RangeError);
  });
});

describe('Analytic Gaussian quantities', () => {
  it('computes analytic norm for Gaussian', () => {
    const sigma = 1.0;
    const norm = analyticGaussianNorm(sigma);
    // For a continuous Gaussian, norm = sigma * sqrt(2*pi)
    expect(norm).toBeCloseTo(sigma * Math.sqrt(2 * Math.PI));
  });

  it('computes analytic width (variance) for Gaussian', () => {
    const sigma = 2.0;
    const width = analyticGaussianWidth(sigma);
    // For a Gaussian, the variance of |psi|² is sigma²
    expect(width).toBeCloseTo(sigma * sigma);
  });

  it('computes analytic position expectation for Gaussian', () => {
    const xCenter = 3.0;
    const sigma = 1.0;
    const xExp = analyticGaussianPositionExpectation(xCenter, sigma);
    expect(xExp).toBe(xCenter);
  });

  it('computes analytic momentum expectation for Gaussian', () => {
    const k0 = 2.0;
    const pExp = analyticGaussianMomentumExpectation(k0);
    // With hbar = 1, p = k
    expect(pExp).toBe(k0);
  });

  it('computes analytic free Gaussian width at time t', () => {
    const sigma0 = 1.0;
    const t = 2.0;
    const width = analyticFreeGaussianWidth(sigma0, t);
    // For a free Gaussian, sigma(t) = sigma0 * sqrt(1 + (t / (2 * sigma0²))²)
    // Variance = sigma(t)² = sigma0² * (1 + (t / (2 * sigma0²))²)
    const expected = sigma0 * sigma0 * (1 + (t / (2 * sigma0 * sigma0)) ** 2);
    expect(width).toBeCloseTo(expected);
  });

  it('free Gaussian width at t=0 equals initial width', () => {
    const sigma0 = 1.5;
    const width = analyticFreeGaussianWidth(sigma0, 0);
    expect(width).toBeCloseTo(sigma0 * sigma0);
  });

  it('free Gaussian width increases with time', () => {
    const sigma0 = 1.0;
    const widthAt0 = analyticFreeGaussianWidth(sigma0, 0);
    const widthAt1 = analyticFreeGaussianWidth(sigma0, 1);
    const widthAt2 = analyticFreeGaussianWidth(sigma0, 2);
    
    expect(widthAt1).toBeGreaterThan(widthAt0);
    expect(widthAt2).toBeGreaterThan(widthAt1);
  });
});

describe('Gaussian validation against analytic quantities', () => {
  it('discrete Gaussian position expectation matches analytic', () => {
    // Use a grid that actually covers -10 to 10
    const grid = createPsiGrid(2000, 0.01, -10);
    const xCenter = 0.5;
    const sigma = 1.0;
    const k0 = 0;
    
    initializeGaussian(grid, xCenter, sigma, k0, true);
    
    const discreteXExp = positionExpectation(grid);
    const analyticXExp = analyticGaussianPositionExpectation(xCenter, sigma);
    
    // With a wide grid (-10 to 10) and small dx (0.01), we should get close to the analytic value
    expect(discreteXExp).toBeCloseTo(analyticXExp, 1);
  });

  it('discrete Gaussian momentum expectation matches analytic', () => {
    // Use a wider grid with more points for better accuracy
    const grid = createPsiGrid(4000, 0.005, -10);
    const xCenter = 0;
    const sigma = 1.0;
    const k0 = 1.0; // Use k0 = 1 for easier testing
    
    initializeGaussian(grid, xCenter, sigma, k0, true);
    
    const discretePExt = momentumExpectation(grid);
    const analyticPExt = analyticGaussianMomentumExpectation(k0);
    
    // Momentum expectation is sensitive to discretization
    // With a very wide grid and small dx, we should get close
    // The finite difference approximation has O(dx²) error
    // For k0 = 1, we expect ⟨p⟩ = 1
    expect(discretePExt).toBeCloseTo(analyticPExt, 0.1);
  });

  it('discrete Gaussian variance approximately matches analytic', () => {
    // Use a grid that actually covers -10 to 10
    const grid = createPsiGrid(2000, 0.01, -10);
    const xCenter = 0;
    const sigma = 1.0;
    const k0 = 0;
    
    initializeGaussian(grid, xCenter, sigma, k0, true);
    
    const discreteVar = positionVariance(grid);
    const analyticVar = analyticGaussianWidth(sigma);
    
    // Discrete approximation may have some error
    // With a wide grid (-10 to 10) and small dx (0.01), we should get close to 1
    expect(discreteVar).toBeCloseTo(analyticVar, 1);
  });
});
