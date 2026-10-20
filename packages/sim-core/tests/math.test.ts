import { describe, expect, it } from 'vitest';
import { createPsiGrid } from '../src/grid';
import {
  innerProduct,
  normalize,
  expectationValue,
  positionExpectation,
  momentumExpectation,
  positionVariance,
  momentumVariance,
} from '../src/math';

describe('Complex inner product', () => {
  it('computes inner product of real-valued wavefunctions', () => {
    const psi1 = createPsiGrid(4, 0.5);
    const psi2 = createPsiGrid(4, 0.5);
    
    // Set psi1 = [1, 0, 2, 0] (real values at positions 0, 1)
    psi1.values[2 * 0] = 1; // re0
    psi1.values[2 * 1] = 2; // re1
    
    // Set psi2 = [3, 0, 4, 0] (real values at positions 0, 1)
    psi2.values[2 * 0] = 3; // re0
    psi2.values[2 * 1] = 4; // re1
    
    // Inner product should be dx * (1*3 + 2*4) = 0.5 * (3 + 8) = 5.5
    const result = innerProduct(psi1, psi2);
    expect(result.real).toBeCloseTo(5.5);
    expect(result.imag).toBeCloseTo(0);
  });

  it('computes inner product of complex-valued wavefunctions', () => {
    const psi1 = createPsiGrid(4, 0.5);
    const psi2 = createPsiGrid(4, 0.5);
    
    // Set psi1 = [1, 2, 3, 4] (complex: 1+2i at pos 0, 3+4i at pos 1)
    psi1.values[2 * 0] = 1; // re0
    psi1.values[2 * 0 + 1] = 2; // im0
    psi1.values[2 * 1] = 3; // re1
    psi1.values[2 * 1 + 1] = 4; // im1
    
    // Set psi2 = [5, 6, 7, 8] (complex: 5+6i at pos 0, 7+8i at pos 1)
    psi2.values[2 * 0] = 5; // re0
    psi2.values[2 * 0 + 1] = 6; // im0
    psi2.values[2 * 1] = 7; // re1
    psi2.values[2 * 1 + 1] = 8; // im1
    
    // Inner product = dx * [(1-2i)*(5+6i) + (3-4i)*(7+8i)]
    // = 0.5 * [(5 + 6i - 10i - 12i²) + (21 + 24i - 28i - 32i²)]
    // = 0.5 * [(5 - 4i + 12) + (21 - 4i + 32)]
    // = 0.5 * [(17 - 4i) + (53 - 4i)]
    // = 0.5 * (70 - 8i) = 35 - 4i
    const result = innerProduct(psi1, psi2);
    expect(result.real).toBeCloseTo(35);
    expect(result.imag).toBeCloseTo(-4);
  });

  it('returns conjugate-linear in first argument', () => {
    const psi1 = createPsiGrid(4, 0.5);
    const psi2 = createPsiGrid(4, 0.5);
    
    // Set psi1 = [0, 1, 0, 0] (i at pos 0)
    psi1.values[2 * 0 + 1] = 1;
    
    // Set psi2 = [0, 1, 0, 0] (i at pos 0)
    psi2.values[2 * 0 + 1] = 1;
    
    // <i|i> = dx * (0 - 1i) * (0 + 1i) = dx * (0 - i²) = dx * 1 = 0.5
    const result = innerProduct(psi1, psi2);
    expect(result.real).toBeCloseTo(0.5);
    expect(result.imag).toBeCloseTo(0);
  });

  it('throws for mismatched grid counts', () => {
    const psi1 = createPsiGrid(4, 0.5);
    const psi2 = createPsiGrid(8, 0.5);
    expect(() => innerProduct(psi1, psi2)).toThrow(RangeError);
  });

  it('throws for mismatched dx values', () => {
    const psi1 = createPsiGrid(4, 0.5);
    const psi2 = createPsiGrid(4, 0.25);
    expect(() => innerProduct(psi1, psi2)).toThrow(RangeError);
  });
});

describe('Normalization', () => {
  it('normalizes a real-valued wavefunction', () => {
    const psi = createPsiGrid(4, 0.5);
    psi.values[2 * 0] = 2; // re0
    psi.values[2 * 1] = 2; // re1
    
    // Norm squared = 0.5 * (2² + 2²) = 0.5 * 8 = 4
    // Norm = 2
    // After normalization, values should be divided by 2
    normalize(psi);
    
    expect(psi.values[2 * 0]).toBeCloseTo(1);
    expect(psi.values[2 * 1]).toBeCloseTo(1);
    expect(psi.values[2 * 0 + 1]).toBe(0);
    expect(psi.values[2 * 1 + 1]).toBe(0);
  });

  it('normalizes a complex-valued wavefunction', () => {
    const psi = createPsiGrid(4, 0.5);
    psi.values[2 * 0] = 3; // re0
    psi.values[2 * 0 + 1] = 4; // im0
    
    // Norm squared = 0.5 * (3² + 4²) = 0.5 * 25 = 12.5
    // Norm = sqrt(12.5)
    // After normalization, values should be divided by sqrt(12.5)
    normalize(psi);
    
    const norm = Math.sqrt(12.5);
    expect(psi.values[2 * 0]).toBeCloseTo(3 / norm);
    expect(psi.values[2 * 0 + 1]).toBeCloseTo(4 / norm);
  });

  it('handles zero wavefunction', () => {
    const psi = createPsiGrid(4, 0.5);
    // All zeros - should not throw
    normalize(psi);
    
    // Should still be all zeros
    for (let i = 0; i < psi.values.length; i++) {
      expect(psi.values[i]).toBe(0);
    }
  });

  it('normalized wavefunction has norm squared of 1', () => {
    const psi = createPsiGrid(100, 0.01);
    // Set a Gaussian-like wavefunction
    for (let i = 0; i < psi.count; i++) {
      const x = psi.x0 + i * psi.dx;
      const val = Math.exp(-x * x / 2);
      psi.values[2 * i] = val;
    }
    
    normalize(psi);
    
    // Compute norm squared manually
    let sum = 0;
    for (let i = 0; i < psi.count; i++) {
      const re = psi.values[2 * i]!;
      const im = psi.values[2 * i + 1]!;
      sum += re * re + im * im;
    }
    const normSq = psi.dx * sum;
    
    expect(normSq).toBeCloseTo(1, 15);
  });
});

describe('Expectation values', () => {
  it('computes expectation of identity operator (should be norm squared)', () => {
    const psi = createPsiGrid(4, 0.5);
    psi.values[2 * 0] = 2; // re0
    psi.values[2 * 1] = 2; // re1
    
    // <psi|psi> = 0.5 * (2² + 2²) = 4
    const result = expectationValue(psi, psi);
    expect(result.real).toBeCloseTo(4);
    expect(result.imag).toBeCloseTo(0);
  });

  it('computes position expectation for symmetric wavefunction at origin', () => {
    // Use a grid that actually covers -5 to 5
    const psi = createPsiGrid(1000, 0.01, -5);
    // Create a symmetric wavefunction centered at x=0
    for (let i = 0; i < psi.count; i++) {
      const x = psi.x0 + i * psi.dx;
      const val = Math.exp(-x * x / 2);
      psi.values[2 * i] = val;
    }
    normalize(psi);
    
    const xExp = positionExpectation(psi);
    // For a symmetric wavefunction centered at 0, <x> should be 0
    // The grid goes from -5 to 5, so the discrete approximation should be close to 0
    expect(xExp).toBeCloseTo(0, 2);
  });

  it('computes position expectation for shifted wavefunction', () => {
    // Use a grid that actually covers -5 to 5
    const psi = createPsiGrid(1000, 0.01, -5);
    // Create a wavefunction centered at x=1
    for (let i = 0; i < psi.count; i++) {
      const x = psi.x0 + i * psi.dx;
      const val = Math.exp(-(x - 1) * (x - 1) / 2);
      psi.values[2 * i] = val;
    }
    normalize(psi);
    
    const xExp = positionExpectation(psi);
    // For a wavefunction centered at x=1, <x> should be close to 1
    // With grid from -5 to 5 and dx=0.01, the discrete approximation should be good
    expect(xExp).toBeCloseTo(1, 1);
  });

  it('computes momentum expectation for real wavefunction (should be 0)', () => {
    const psi = createPsiGrid(100, 0.01, -5);
    // Create a real-valued Gaussian
    for (let i = 0; i < psi.count; i++) {
      const x = psi.x0 + i * psi.dx;
      const val = Math.exp(-x * x / 2);
      psi.values[2 * i] = val;
    }
    normalize(psi);
    
    const pExp = momentumExpectation(psi);
    // For a real wavefunction, <p> = 0 (no imaginary part)
    expect(pExp).toBeCloseTo(0, 10);
  });

  it('computes position variance for Gaussian', () => {
    // Use a grid that actually covers -10 to 10
    const psi = createPsiGrid(2000, 0.01, -10);
    const sigma = 1.0;
    // Create a Gaussian where sigma is the std dev of |psi|²
    // For psi(x) = exp(-x²/(4*sigma²)), |psi|² = exp(-x²/(2*sigma²)) has variance sigma²
    for (let i = 0; i < psi.count; i++) {
      const x = psi.x0 + i * psi.dx;
      const val = Math.exp(-x * x / (4 * sigma * sigma));
      psi.values[2 * i] = val;
    }
    // Normalize to account for discretization
    normalize(psi);
    
    const variance = positionVariance(psi);
    // For a Gaussian with sigma=1, variance should be close to sigma² = 1
    // Note: discrete approximation may have some error
    // With a wide grid (-10 to 10) and small dx (0.01), we should get close to 1
    expect(variance).toBeCloseTo(1, 1);
  });
});
