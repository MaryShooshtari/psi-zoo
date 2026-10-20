/**
 * Dimensionless units: hbar = 1, mass = 1.
 * One-dimensional finite-difference Hamiltonian for the Schrödinger equation.
 * 
 * H = -(1/2) d²/dx² + V(x)
 * 
 * Uses three-point central finite-difference approximation with Dirichlet boundaries.
 */
import type { PsiGrid } from './grid';
import { innerProduct, type Complex } from './math';

/**
 * Tridiagonal Hamiltonian coefficients for the finite-difference approximation.
 * The Hamiltonian is represented as:
 * H_i,j = diagonal[i] * δ_i,j + offDiagonal[i-1] * δ_{i,j+1} + offDiagonal[i] * δ_{i+1,j}
 * 
 * For Dirichlet boundaries, the first and last diagonal elements correspond to
 * boundary points which should have ψ = 0.
 */
export interface HamiltonianCoefficients {
  /** Diagonal elements: H_ii = 1/dx² + V_i */
  readonly diagonal: Float64Array;
  /** Off-diagonal elements: H_{i,i+1} = H_{i+1,i} = -1/(2*dx²) */
  readonly offDiagonal: Float64Array;
}

/**
 * Computes the tridiagonal Hamiltonian coefficients.
 * 
 * The finite-difference approximation for the second derivative is:
 * d²/dx² ψ_i ≈ (ψ_{i+1} - 2ψ_i + ψ_{i-1}) / dx²
 * 
 * Therefore:
 * - (1/2) d²/dx² ψ_i ≈ -1/(2*dx²) * (ψ_{i+1} - 2ψ_i + ψ_{i-1})
 *                      = (1/dx²) * ψ_i - 1/(2*dx²) * (ψ_{i+1} + ψ_{i-1})
 * 
 * So the Hamiltonian matrix elements are:
 * - Diagonal: H_ii = 1/dx² + V_i
 * - Off-diagonal: H_{i,i+1} = H_{i+1,i} = -1/(2*dx²)
 * 
 * @param count - Number of grid points (must be >= 3)
 * @param dx - Grid spacing (must be positive and finite)
 * @param x0 - Starting position (must be finite)
 * @param potential - Potential values at each grid point (length must equal count)
 * @returns The tridiagonal Hamiltonian coefficients
 */
export function getHamiltonianCoefficients(
  count: number,
  dx: number,
  x0: number,
  potential: Float64Array
): HamiltonianCoefficients {
  // Validate inputs
  if (!Number.isInteger(count) || count < 3) {
    throw new RangeError(`count must be an integer >= 3, got ${count}`);
  }
  if (!Number.isFinite(dx) || dx <= 0) {
    throw new RangeError(`dx must be positive and finite, got ${dx}`);
  }
  if (!Number.isFinite(x0)) {
    throw new RangeError(`x0 must be finite, got ${x0}`);
  }
  if (potential.length !== count) {
    throw new RangeError(
      `potential length ${potential.length} must equal count ${count}`
    );
  }
  
  // Validate potential values
  for (let i = 0; i < count; i++) {
    if (!Number.isFinite(potential[i])) {
      throw new RangeError(
        `potential[${i}] must be finite, got ${potential[i]}`
      );
    }
  }
  
  const invDxSq = 1 / (dx * dx);
  const offDiagValue = -0.5 * invDxSq;
  
  // Create diagonal: 1/dx² + V_i
  const diagonal = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    diagonal[i] = invDxSq + potential[i]!;
  }
  
  // Create off-diagonal: -1/(2*dx²) for each pair
  const offDiagonal = new Float64Array(count - 1);
  for (let i = 0; i < count - 1; i++) {
    offDiagonal[i] = offDiagValue;
  }
  
  return { diagonal, offDiagonal };
}

/**
 * Applies the Hamiltonian to a wavefunction: Hψ → result.
 * 
 * Uses the three-point central finite-difference approximation:
 * (Hψ)_i = -1/(2*dx²) * (ψ_{i+1} - 2ψ_i + ψ_{i-1}) + V_i * ψ_i
 * 
 * Enforces Dirichlet boundary conditions: ψ[0] = ψ[N-1] = 0.
 * The result at boundary points is set to 0.
 * 
 * @param psi - Input wavefunction grid
 * @param potential - Potential values at each grid point (length must equal psi.count)
 * @param result - Output grid to store Hψ (must have same count and dx as psi)
 */
export function applyHamiltonian(
  psi: PsiGrid,
  potential: Float64Array,
  result: PsiGrid
): void {
  // Validate inputs
  if (potential.length !== psi.count) {
    throw new RangeError(
      `potential length ${potential.length} must equal psi.count ${psi.count}`
    );
  }
  if (result.count !== psi.count) {
    throw new RangeError(
      `result.count ${result.count} must equal psi.count ${psi.count}`
    );
  }
  if (result.dx !== psi.dx) {
    throw new RangeError(
      `result.dx ${result.dx} must equal psi.dx ${psi.dx}`
    );
  }
  
  const count = psi.count;
  const dx = psi.dx;
  const invDxSq = 1 / (dx * dx);
  
  // Apply Hamiltonian to all points, enforcing Dirichlet boundaries
  // For Dirichlet boundaries, we treat psi[0] and psi[N-1] as 0 in the computation
  // and set the result at boundaries to 0
  for (let i = 0; i < count; i++) {
    // Get psi at i-1, i, i+1 with Dirichlet boundary conditions
    const psiPrevRe = (i > 0) ? psi.values[2 * (i - 1)]! : 0;
    const psiPrevIm = (i > 0) ? psi.values[2 * (i - 1) + 1]! : 0;
    const psiRe = psi.values[2 * i]!;
    const psiIm = psi.values[2 * i + 1]!;
    const psiNextRe = (i < count - 1) ? psi.values[2 * (i + 1)]! : 0;
    const psiNextIm = (i < count - 1) ? psi.values[2 * (i + 1) + 1]! : 0;
    
    // Compute second derivative: (ψ_{i+1} - 2ψ_i + ψ_{i-1}) / dx²
    const d2psiRe = (psiNextRe - 2 * psiRe + psiPrevRe) * invDxSq;
    const d2psiIm = (psiNextIm - 2 * psiIm + psiPrevIm) * invDxSq;
    
    // Apply -1/2 * d²/dx²
    const hKineticRe = -0.5 * d2psiRe;
    const hKineticIm = -0.5 * d2psiIm;
    
    // Add potential term: V_i * ψ_i
    const v = potential[i]!;
    const hPotentialRe = v * psiRe;
    const hPotentialIm = v * psiIm;
    
    // Total: Hψ_i = -1/2 d²/dx² ψ_i + V_i ψ_i
    // For Dirichlet boundaries, set result to 0 at boundaries
    if (i === 0 || i === count - 1) {
      result.values[2 * i] = 0;
      result.values[2 * i + 1] = 0;
    } else {
      result.values[2 * i] = hKineticRe + hPotentialRe;
      result.values[2 * i + 1] = hKineticIm + hPotentialIm;
    }
  }
}

/**
 * Computes the energy expectation value ⟨ψ|H|ψ⟩.
 * 
 * Uses the dx-weighted inner product: ⟨ψ|H|ψ⟩ = dx * sum_i (ψ_i)* * (Hψ)_i
 * 
 * For a Hermitian Hamiltonian, this should be a real number.
 * 
 * @param psi - Wavefunction grid
 * @param potential - Potential values at each grid point (length must equal psi.count)
 * @returns The energy expectation value as a Complex number (imaginary part should be ~0)
 */
export function energyExpectation(
  psi: PsiGrid,
  potential: Float64Array
): Complex {
  if (potential.length !== psi.count) {
    throw new RangeError(
      `potential length ${potential.length} must equal psi.count ${psi.count}`
    );
  }
  
  // Create a temporary grid for Hψ
  const hPsi = {
    count: psi.count,
    dx: psi.dx,
    x0: psi.x0,
    values: new Float64Array(psi.values.length),
  };
  
  // Apply Hamiltonian
  applyHamiltonian(psi, potential, hPsi);
  
  // Compute inner product ⟨ψ|Hψ⟩
  return innerProduct(psi, hPsi);
}
