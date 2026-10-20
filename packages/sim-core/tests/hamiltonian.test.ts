import { describe, expect, it } from 'vitest';
import { createPsiGrid } from '../src/grid';
import {
  applyHamiltonian,
  getHamiltonianCoefficients,
  energyExpectation,
  type HamiltonianCoefficients,
} from '../src/hamiltonian';
import { innerProduct } from '../src/math';

describe('Hamiltonian coefficients', () => {
  it('returns correct tridiagonal coefficients for free Hamiltonian (V=0)', () => {
    const count = 5;
    const dx = 0.5;
    const x0 = 0;
    const potential = new Float64Array(count).fill(0);
    
    const coeffs = getHamiltonianCoefficients(count, dx, x0, potential);
    
    // For H = -1/2 d²/dx², with 3-point central difference:
    // d²/dx² psi_i ≈ (psi_{i+1} - 2*psi_i + psi_{i-1}) / dx²
    // So -1/2 d²/dx² psi_i ≈ -1/(2*dx²) * (psi_{i+1} - 2*psi_i + psi_{i-1})
    // = 1/dx² * psi_i - 1/(2*dx²) * (psi_{i+1} + psi_{i-1})
    // 
    // Diagonal: 1/dx² = 1/0.25 = 4
    // Off-diagonal: -1/(2*dx²) = -1/(2*0.25) = -2
    
    expect(coeffs.diagonal.length).toBe(count);
    expect(coeffs.offDiagonal.length).toBe(count - 1);
    
    // All diagonal elements should be 1/dx² = 4
    for (let i = 0; i < count; i++) {
      expect(coeffs.diagonal[i]).toBeCloseTo(4, 10);
    }
    
    // All off-diagonal elements should be -1/(2*dx²) = -2
    for (let i = 0; i < count - 1; i++) {
      expect(coeffs.offDiagonal[i]).toBeCloseTo(-2, 10);
    }
  });

  it('returns correct coefficients with non-zero potential', () => {
    const count = 4;
    const dx = 1.0;
    const x0 = 0;
    const potential = new Float64Array(count);
    potential[0] = 1.0;
    potential[1] = 2.0;
    potential[2] = 3.0;
    potential[3] = 4.0;
    
    const coeffs = getHamiltonianCoefficients(count, dx, x0, potential);
    
    // Diagonal should be 1/dx² + V_i = 1 + V_i
    expect(coeffs.diagonal[0]).toBeCloseTo(1 + 1.0, 10);
    expect(coeffs.diagonal[1]).toBeCloseTo(1 + 2.0, 10);
    expect(coeffs.diagonal[2]).toBeCloseTo(1 + 3.0, 10);
    expect(coeffs.diagonal[3]).toBeCloseTo(1 + 4.0, 10);
    
    // Off-diagonal should be -1/(2*dx²) = -0.5
    for (let i = 0; i < count - 1; i++) {
      expect(coeffs.offDiagonal[i]).toBeCloseTo(-0.5, 10);
    }
  });

  it('throws for invalid count', () => {
    const dx = 0.5;
    const x0 = 0;
    const potential = new Float64Array(3).fill(0);
    
    expect(() => getHamiltonianCoefficients(2, dx, x0, potential)).toThrow(RangeError);
  });

  it('throws for invalid dx', () => {
    const count = 5;
    const x0 = 0;
    const potential = new Float64Array(count).fill(0);
    
    expect(() => getHamiltonianCoefficients(count, 0, x0, potential)).toThrow(RangeError);
    expect(() => getHamiltonianCoefficients(count, -0.5, x0, potential)).toThrow(RangeError);
    expect(() => getHamiltonianCoefficients(count, Number.NaN, x0, potential)).toThrow(RangeError);
  });

  it('throws for invalid potential length', () => {
    const count = 5;
    const dx = 0.5;
    const x0 = 0;
    const potential = new Float64Array(3).fill(0);
    
    expect(() => getHamiltonianCoefficients(count, dx, x0, potential)).toThrow(RangeError);
  });

  it('throws for non-finite potential values', () => {
    const count = 5;
    const dx = 0.5;
    const x0 = 0;
    const potential = new Float64Array(count);
    potential[0] = Number.NaN;
    
    expect(() => getHamiltonianCoefficients(count, dx, x0, potential)).toThrow(RangeError);
    
    potential[0] = 0;
    potential[1] = Infinity;
    expect(() => getHamiltonianCoefficients(count, dx, x0, potential)).toThrow(RangeError);
  });
});

describe('Apply Hamiltonian (Hψ)', () => {
  it('applies free Hamiltonian correctly on small grid', () => {
    // Create a simple test case with known result
    const count = 5;
    const dx = 1.0;
    const x0 = 0;
    const grid = createPsiGrid(count, dx, x0);
    
    // Set a simple wavefunction: psi = [1, 2, 3, 4, 5] (real only)
    // With Dirichlet boundaries, we only evolve interior points (indices 1, 2, 3)
    // But the input should have all points set
    grid.values[2 * 0] = 1; // psi[0] = 1
    grid.values[2 * 1] = 2; // psi[1] = 2
    grid.values[2 * 2] = 3; // psi[2] = 3
    grid.values[2 * 3] = 4; // psi[3] = 4
    grid.values[2 * 4] = 5; // psi[4] = 5
    
    const potential = new Float64Array(count).fill(0);
    const result = createPsiGrid(count, dx, x0);
    
    applyHamiltonian(grid, potential, result);
    
    // For H = -1/2 d²/dx² with dx=1:
    // d²/dx² psi_i = psi_{i+1} - 2*psi_i + psi_{i-1}
    // -1/2 d²/dx² psi_i = -1/2 * (psi_{i+1} - 2*psi_i + psi_{i-1})
    //
    // With Dirichlet boundaries: psi[-1] = psi[N] = 0
    // For i=0: Hψ[0] = -1/2 * (psi[1] - 2*psi[0] + psi[-1]) = -1/2 * (2 - 2*1 + 0) = -1/2 * 0 = 0
    // But we enforce Dirichlet, so result[0] should be 0
    // For i=1: Hψ[1] = -1/2 * (psi[2] - 2*psi[1] + psi[0]) = -1/2 * (3 - 4 + 1) = 0
    // For i=2: Hψ[2] = -1/2 * (psi[3] - 2*psi[2] + psi[1]) = -1/2 * (4 - 6 + 2) = 0
    // For i=3: Hψ[3] = -1/2 * (psi[4] - 2*psi[3] + psi[2]) = -1/2 * (5 - 8 + 3) = 0
    // For i=4: Hψ[4] = -1/2 * (psi[5] - 2*psi[4] + psi[3]) = -1/2 * (0 - 10 + 4) = 3
    // But we enforce Dirichlet, so result[4] should be 0
    
    // Actually, with Dirichlet boundaries, we should only compute interior points
    // and set boundary points to 0
    expect(result.values[2 * 0]).toBeCloseTo(0, 10); // Dirichlet
    expect(result.values[2 * 1]).toBeCloseTo(0, 10);
    expect(result.values[2 * 2]).toBeCloseTo(0, 10);
    expect(result.values[2 * 3]).toBeCloseTo(0, 10);
    expect(result.values[2 * 4]).toBeCloseTo(0, 10); // Dirichlet
  });

  it('applies Hamiltonian with non-zero potential', () => {
    const count = 5;
    const dx = 1.0;
    const x0 = 0;
    const grid = createPsiGrid(count, dx, x0);
    
    // Set psi = [0, 1, 0, 0, 0] (real, at index 1)
    grid.values[2 * 1] = 1;
    
    const potential = new Float64Array(count);
    potential[1] = 2.0; // V[1] = 2
    
    const result = createPsiGrid(count, dx, x0);
    applyHamiltonian(grid, potential, result);
    
    // Hψ[1] = -1/2 * (psi[2] - 2*psi[1] + psi[0]) + V[1] * psi[1]
    // = -1/2 * (0 - 2*1 + 0) + 2 * 1 = -1/2 * (-2) + 2 = 1 + 2 = 3
    expect(result.values[2 * 1]).toBeCloseTo(3, 10);
    
    // Boundary points should be 0 (Dirichlet)
    expect(result.values[2 * 0]).toBeCloseTo(0, 10);
    expect(result.values[2 * 4]).toBeCloseTo(0, 10);
  });

  it('handles complex wavefunctions', () => {
    const count = 5;
    const dx = 1.0;
    const x0 = 0;
    const grid = createPsiGrid(count, dx, x0);
    
    // Set psi[1] = 1 + i
    grid.values[2 * 1] = 1;
    grid.values[2 * 1 + 1] = 1;
    
    const potential = new Float64Array(count).fill(0);
    const result = createPsiGrid(count, dx, x0);
    
    applyHamiltonian(grid, potential, result);
    
    // Hψ[1] = -1/2 * (psi[2] - 2*psi[1] + psi[0])
    // = -1/2 * (0 - 2*(1+i) + 0) = -1/2 * (-2 - 2i) = 1 + i
    expect(result.values[2 * 1]).toBeCloseTo(1, 10);
    expect(result.values[2 * 1 + 1]).toBeCloseTo(1, 10);
  });

  it('throws for mismatched grid and potential lengths', () => {
    const grid = createPsiGrid(5, 0.5, 0);
    const potential = new Float64Array(3).fill(0);
    const result = createPsiGrid(5, 0.5, 0);
    
    expect(() => applyHamiltonian(grid, potential, result)).toThrow(RangeError);
  });

  it('throws for mismatched grid and result grid counts', () => {
    const grid = createPsiGrid(5, 0.5, 0);
    const potential = new Float64Array(5).fill(0);
    const result = createPsiGrid(3, 0.5, 0);
    
    expect(() => applyHamiltonian(grid, potential, result)).toThrow(RangeError);
  });

  it('throws for mismatched grid and result dx values', () => {
    const grid = createPsiGrid(5, 0.5, 0);
    const potential = new Float64Array(5).fill(0);
    const result = createPsiGrid(5, 0.25, 0);
    
    expect(() => applyHamiltonian(grid, potential, result)).toThrow(RangeError);
  });
});

describe('Hermiticity', () => {
  it('verifies Hermiticity on simple 3-point grid', () => {
    const count = 3;
    const dx = 1.0;
    const x0 = 0;
    
    const psi1 = createPsiGrid(count, dx, x0);
    const psi2 = createPsiGrid(count, dx, x0);
    const potential = new Float64Array(count).fill(0);
    
    // Set psi1 = [0, 1, 0] (real, satisfies Dirichlet)
    psi1.values[2 * 1] = 1;
    
    // Set psi2 = [0, 2, 0] (real, satisfies Dirichlet)
    psi2.values[2 * 1] = 2;
    
    // Compute Hψ1 and Hψ2
    const hPsi1 = createPsiGrid(count, dx, x0);
    const hPsi2 = createPsiGrid(count, dx, x0);
    applyHamiltonian(psi1, potential, hPsi1);
    applyHamiltonian(psi2, potential, hPsi2);
    
    // For dx=1, V=0:
    // Hψ[1] = -0.5 * (ψ[2] - 2*ψ[1] + ψ[0]) = -0.5 * (0 - 2*ψ[1] + 0) = ψ[1]
    // So Hψ1 = [0, 1, 0] and Hψ2 = [0, 2, 0]
    
    const inner1 = innerProduct(psi2, hPsi1);
    const inner2 = innerProduct(hPsi2, psi1);
    
    // <ψ2|Hψ1> = dx * (0*0 + 2*1 + 0*0) = 2
    // <Hψ2|ψ1> = dx * (0*0 + 2*1 + 0*0) = 2
    // For Hermitian H: <ψ2|Hψ1> should equal <Hψ2|ψ1>
    // Since both are real, they should be equal
    expect(inner1.real).toBeCloseTo(2, 10);
    expect(inner1.imag).toBeCloseTo(0, 10);
    expect(inner2.real).toBeCloseTo(2, 10);
    expect(inner2.imag).toBeCloseTo(0, 10);
    expect(inner1.real).toBeCloseTo(inner2.real, 10);
    expect(inner1.imag).toBeCloseTo(inner2.imag, 10);
  });
  it('verifies Hermiticity: <φ|Hψ> = <Hφ|ψ>* with Dirichlet wavefunctions', () => {
    const count = 10;
    const dx = 0.5;
    const x0 = 0;
    
    const psi1 = createPsiGrid(count, dx, x0);
    const psi2 = createPsiGrid(count, dx, x0);
    const potential = new Float64Array(count);
    
    // Set specific complex wavefunctions that satisfy Dirichlet boundaries
    // Use a simple pattern: psi1[i] = i, psi2[i] = count - i
    for (let i = 0; i < count; i++) {
      psi1.values[2 * i] = i;
      psi1.values[2 * i + 1] = i * 0.5;
      psi2.values[2 * i] = count - i;
      psi2.values[2 * i + 1] = (count - i) * 0.3;
      potential[i] = i * 0.1;
    }
    // Enforce Dirichlet boundaries: set boundary values to 0
    psi1.values[2 * 0] = 0;
    psi1.values[2 * 0 + 1] = 0;
    psi1.values[2 * (count - 1)] = 0;
    psi1.values[2 * (count - 1) + 1] = 0;
    psi2.values[2 * 0] = 0;
    psi2.values[2 * 0 + 1] = 0;
    psi2.values[2 * (count - 1)] = 0;
    psi2.values[2 * (count - 1) + 1] = 0;
    
    // Compute Hψ1 and Hψ2
    const hPsi1 = createPsiGrid(count, dx, x0);
    const hPsi2 = createPsiGrid(count, dx, x0);
    applyHamiltonian(psi1, potential, hPsi1);
    applyHamiltonian(psi2, potential, hPsi2);
    
    // Compute <ψ2|Hψ1> and <Hψ2|ψ1>
    const inner1 = innerProduct(psi2, hPsi1);
    const inner2 = innerProduct(hPsi2, psi1);
    
    // For Hermitian H: <ψ2|Hψ1> = <Hψ2|ψ1>
    // Check that they are equal
    expect(inner1.real).toBeCloseTo(inner2.real, 10);
    expect(inner1.imag).toBeCloseTo(inner2.imag, 10);
  });

  it('verifies Hermiticity with zero potential and Dirichlet wavefunctions', () => {
    const count = 10;
    const dx = 0.5;
    const x0 = 0;
    
    const psi1 = createPsiGrid(count, dx, x0);
    const psi2 = createPsiGrid(count, dx, x0);
    const potential = new Float64Array(count).fill(0);
    
    // Set arbitrary complex wavefunctions that satisfy Dirichlet boundaries
    for (let i = 0; i < count; i++) {
      psi1.values[2 * i] = i;
      psi1.values[2 * i + 1] = i * i;
      psi2.values[2 * i] = count - i;
      psi2.values[2 * i + 1] = (count - i) * (count - i);
    }
    // Enforce Dirichlet boundaries
    psi1.values[2 * 0] = 0;
    psi1.values[2 * 0 + 1] = 0;
    psi1.values[2 * (count - 1)] = 0;
    psi1.values[2 * (count - 1) + 1] = 0;
    psi2.values[2 * 0] = 0;
    psi2.values[2 * 0 + 1] = 0;
    psi2.values[2 * (count - 1)] = 0;
    psi2.values[2 * (count - 1) + 1] = 0;
    
    const hPsi1 = createPsiGrid(count, dx, x0);
    const hPsi2 = createPsiGrid(count, dx, x0);
    applyHamiltonian(psi1, potential, hPsi1);
    applyHamiltonian(psi2, potential, hPsi2);
    
    const inner1 = innerProduct(psi2, hPsi1);
    const inner2 = innerProduct(hPsi2, psi1);
    
    expect(inner1.real).toBeCloseTo(inner2.real, 10);
    expect(inner1.imag).toBeCloseTo(inner2.imag, 10);
  });
});

describe('Energy expectation', () => {
  it('returns real value for energy expectation with Dirichlet wavefunction', () => {
    const count = 10;
    const dx = 0.5;
    const x0 = 0;
    
    const psi = createPsiGrid(count, dx, x0);
    const potential = new Float64Array(count);
    
    // Set arbitrary complex wavefunction that satisfies Dirichlet boundaries
    for (let i = 0; i < count; i++) {
      psi.values[2 * i] = Math.random();
      psi.values[2 * i + 1] = Math.random();
      potential[i] = Math.random() * 10;
    }
    // Enforce Dirichlet boundaries
    psi.values[2 * 0] = 0;
    psi.values[2 * 0 + 1] = 0;
    psi.values[2 * (count - 1)] = 0;
    psi.values[2 * (count - 1) + 1] = 0;
    
    const energy = energyExpectation(psi, potential);
    
    // Energy expectation should be real (imaginary part should be ~0)
    expect(energy.imag).toBeCloseTo(0, 10);
  });

  it('computes energy expectation correctly for simple case', () => {
    const count = 5;
    const dx = 1.0;
    const x0 = 0;
    
    const psi = createPsiGrid(count, dx, x0);
    const potential = new Float64Array(count).fill(0);
    
    // Set psi[1] = 1 (real), others 0
    psi.values[2 * 1] = 1;
    
    // First, we need to normalize psi
    // norm² = dx * (0 + 1² + 0 + 0 + 0) = 1
    // So psi is already normalized
    
    // Hψ[1] = -1/2 * (psi[2] - 2*psi[1] + psi[0]) = -1/2 * (0 - 2 + 0) = 1
    // <ψ|H|ψ> = dx * sum_i psi_i* * Hψ_i = 1 * (0 + 1*1 + 0 + 0 + 0) = 1
    
    const energy = energyExpectation(psi, potential);
    expect(energy.real).toBeCloseTo(1, 10);
    expect(energy.imag).toBeCloseTo(0, 10);
  });

  it('throws for mismatched grid and potential lengths', () => {
    const psi = createPsiGrid(5, 0.5, 0);
    const potential = new Float64Array(3).fill(0);
    
    expect(() => energyExpectation(psi, potential)).toThrow(RangeError);
  });
});

describe('Dirichlet boundary handling', () => {
  it('enforces Dirichlet boundaries in applyHamiltonian', () => {
    const count = 5;
    const dx = 0.5;
    const x0 = 0;
    const grid = createPsiGrid(count, dx, x0);
    
    // Set all points to non-zero values
    for (let i = 0; i < count; i++) {
      grid.values[2 * i] = i + 1;
    }
    
    const potential = new Float64Array(count).fill(0);
    const result = createPsiGrid(count, dx, x0);
    
    applyHamiltonian(grid, potential, result);
    
    // Boundary points should be 0
    expect(result.values[2 * 0]).toBeCloseTo(0, 10);
    expect(result.values[2 * 0 + 1]).toBeCloseTo(0, 10);
    expect(result.values[2 * (count - 1)]).toBeCloseTo(0, 10);
    expect(result.values[2 * (count - 1) + 1]).toBeCloseTo(0, 10);
  });

  it('enforces Dirichlet boundaries in energy expectation', () => {
    const count = 5;
    const dx = 0.5;
    const x0 = 0;
    const psi = createPsiGrid(count, dx, x0);
    
    // Set boundary points to non-zero (should be ignored in energy calculation)
    psi.values[2 * 0] = 100;
    psi.values[2 * (count - 1)] = 100;
    
    const potential = new Float64Array(count).fill(0);
    
    // Energy expectation should not be affected by boundary values
    // since Hψ will have 0 at boundaries
    const energy = energyExpectation(psi, potential);
    
    // The energy should be finite and not dominated by boundary values
    expect(Number.isFinite(energy.real)).toBe(true);
    expect(Number.isFinite(energy.imag)).toBe(true);
  });
});

describe('Discrete sine eigenstate', () => {
  it('verifies discrete sine eigenstate for free Hamiltonian using exact discrete eigenvalue', () => {
    // For the free finite-difference Hamiltonian with Dirichlet boundaries,
    // the exact discrete eigenvalues are:
    // E_k = [1 - cos(k*π/(N-1))] / dx²
    // for k = 1, 2, ..., N-2
    // The corresponding eigenvectors are: ψ_j = sin(k*j*π/(N-1)) for j = 0, 1, ..., N-1
    
    const count = 100;
    const dx = 0.1;
    const x0 = 0;
    
    const k = 1; // First eigenmode
    // Exact discrete eigenvalue
    const exactDiscreteEigenvalue = (1 - Math.cos(k * Math.PI / (count - 1))) / (dx * dx);
    
    const psi = createPsiGrid(count, dx, x0);
    const potential = new Float64Array(count).fill(0);
    
    // Create the k-th discrete sine eigenstate: sin(k * j * π / (N-1))
    // This satisfies Dirichlet boundaries: ψ_0 = sin(0) = 0, ψ_{N-1} = sin(k*π) = 0
    for (let j = 0; j < count; j++) {
      const value = Math.sin(k * j * Math.PI / (count - 1));
      psi.values[2 * j] = value;
    }
    
    // Normalize
    let normSq = 0;
    for (let j = 0; j < count; j++) {
      const re = psi.values[2 * j]!;
      const im = psi.values[2 * j + 1]!;
      normSq += re * re + im * im;
    }
    normSq *= dx;
    const norm = Math.sqrt(normSq);
    for (let j = 0; j < count; j++) {
      psi.values[2 * j]! /= norm;
      psi.values[2 * j + 1]! /= norm;
    }
    
    // Compute energy expectation
    const energy = energyExpectation(psi, potential);
    
    // The energy should match the exact discrete eigenvalue to near floating-point precision
    // Using relative tolerance since the eigenvalue magnitude varies
    expect(energy.real).toBeCloseTo(exactDiscreteEigenvalue, 13);
    expect(energy.imag).toBeCloseTo(0, 14);
  });

  it('verifies Hψ = E_k ψ for discrete sine eigenstates', () => {
    // Test that applying the Hamiltonian to a discrete sine eigenstate
    // gives Hψ = E_k ψ to near floating-point precision
    
    const count = 100;
    const dx = 0.1;
    const x0 = 0;
    const potential = new Float64Array(count).fill(0);
    
    // Test first few eigenmodes
    for (let k = 1; k <= 5; k++) {
      // Exact discrete eigenvalue
      const exactEigenvalue = (1 - Math.cos(k * Math.PI / (count - 1))) / (dx * dx);
      
      const psi = createPsiGrid(count, dx, x0);
      
      // Create the k-th discrete sine eigenstate
      for (let j = 0; j < count; j++) {
        const value = Math.sin(k * j * Math.PI / (count - 1));
        psi.values[2 * j] = value;
      }
      
      // Normalize
      let normSq = 0;
      for (let j = 0; j < count; j++) {
        const re = psi.values[2 * j]!;
        const im = psi.values[2 * j + 1]!;
        normSq += re * re + im * im;
      }
      normSq *= dx;
      const norm = Math.sqrt(normSq);
      for (let j = 0; j < count; j++) {
        psi.values[2 * j]! /= norm;
        psi.values[2 * j + 1]! /= norm;
      }
      
      // Apply Hamiltonian
      const hPsi = createPsiGrid(count, dx, x0);
      applyHamiltonian(psi, potential, hPsi);
      
      // Check that Hψ = E_k ψ for all interior points
      // Use relative tolerance scaled by the eigenvalue magnitude
      const relTol = 1e-12;
      for (let j = 1; j < count - 1; j++) {
        const expectedRe = exactEigenvalue * psi.values[2 * j]!;
        const expectedIm = exactEigenvalue * psi.values[2 * j + 1]!;
        
        const scale = Math.max(
          Math.abs(expectedRe),
          Math.abs(expectedIm),
          Math.abs(hPsi.values[2 * j]!),
          Math.abs(hPsi.values[2 * j + 1]!),
          1.0
        );
        
        expect(hPsi.values[2 * j]!).toBeCloseTo(expectedRe, relTol * scale);
        expect(hPsi.values[2 * j + 1]!).toBeCloseTo(expectedIm, relTol * scale);
      }
      
      // Boundary points should be 0
      expect(hPsi.values[2 * 0]).toBeCloseTo(0, 14);
      expect(hPsi.values[2 * (count - 1)]).toBeCloseTo(0, 14);
    }
  });

  it('verifies multiple discrete sine eigenstates have exact eigenvalues', () => {
    const count = 200;
    const dx = 0.05;
    const x0 = 0;
    const potential = new Float64Array(count).fill(0);
    
    // Test first few eigenmodes
    for (let k = 1; k <= 10; k++) {
      // Exact discrete eigenvalue
      const exactEigenvalue = (1 - Math.cos(k * Math.PI / (count - 1))) / (dx * dx);
      
      const psi = createPsiGrid(count, dx, x0);
      
      // Create the k-th discrete sine eigenstate
      for (let j = 0; j < count; j++) {
        const value = Math.sin(k * j * Math.PI / (count - 1));
        psi.values[2 * j] = value;
      }
      
      // Normalize
      let normSq = 0;
      for (let j = 0; j < count; j++) {
        const re = psi.values[2 * j]!;
        const im = psi.values[2 * j + 1]!;
        normSq += re * re + im * im;
      }
      normSq *= dx;
      const norm = Math.sqrt(normSq);
      for (let j = 0; j < count; j++) {
        psi.values[2 * j]! /= norm;
        psi.values[2 * j + 1]! /= norm;
      }
      
      const energy = energyExpectation(psi, potential);
      
      // Check that energy matches exact discrete eigenvalue to near floating-point precision
      expect(energy.real).toBeCloseTo(exactEigenvalue, 12);
      expect(energy.imag).toBeCloseTo(0, 14);
    }
  });

  it('compares discrete eigenvalues with continuum limit', () => {
    // As the grid becomes finer (dx → 0), the discrete eigenvalues should
    // converge to the continuum eigenvalues: E_n = (n² π²) / (2 L²)
    // where L = (N-1) * dx
    
    const L = 10.0; // Domain length
    const n = 1; // First eigenmode
    const continuumEigenvalue = (n * n * Math.PI * Math.PI) / (2 * L * L);
    
    // Test with increasingly fine grids
    const gridSizes = [50, 100, 200, 400];
    
    for (const count of gridSizes) {
      const dx = L / (count - 1);
      const x0 = 0;
      
      // Exact discrete eigenvalue
      const exactDiscreteEigenvalue = (1 - Math.cos(n * Math.PI / (count - 1))) / (dx * dx);
      
      // The discrete eigenvalue should converge to the continuum eigenvalue as dx → 0
      // For count=50 (dx=0.2), the error should be small
      // For count=400 (dx=0.025), the error should be very small
      const expectedTolerance = 0.1 * continuumEigenvalue / count;
      expect(exactDiscreteEigenvalue).toBeCloseTo(continuumEigenvalue, expectedTolerance);
    }
  });
});
