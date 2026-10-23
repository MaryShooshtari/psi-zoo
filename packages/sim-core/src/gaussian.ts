/** Dimensionless units: hbar = 1, mass = 1. Gaussian wavepacket utilities. */
import type { PsiGrid } from './grid';
import { normalize } from './math';

/**
 * Initializes a Gaussian wavepacket on the given grid.
 * 
 * psi(x) = N exp(-(x-xCenter)²/(4*sigma²)) exp(i*k0*x).
 * sigma is the standard deviation of the density |psi|². In the continuum,
 * this unchirped packet has momentum spread 1/(2*sigma), saturating Δx Δp=1/2.
 * N is obtained by dx-weighted discrete normalization when requested.
 *
 * The legacy exp(i*k0*x) convention is retained: exp(i*k0*(x-xCenter))
 * differs only by a global phase. k0 is p0 in hbar=1 units; it is not the
 * finite-difference velocity sin(k0*dx)/dx. Callers impose Dirichlet endpoints
 * before their final normalization if the state will be passed to the stepper.
 * 
 * @param grid - The grid to initialize
 * @param xCenter - The center position of the Gaussian
 * @param sigma - The standard deviation of |psi|² (must be positive)
 * @param k0 - Optional carrier momentum p0 (hbar = 1, p = k), default 0
 * @param normalizeFlag - Whether to normalize the wavefunction (default: true)
 */
export function initializeGaussian(
  grid: PsiGrid,
  xCenter: number,
  sigma: number,
  k0: number = 0,
  normalizeFlag: boolean = true
): void {
  if (!Number.isFinite(sigma) || sigma <= 0) {
    throw new RangeError('sigma must be positive and finite');
  }

  if (!Number.isFinite(xCenter) || !Number.isFinite(k0)) {
    throw new RangeError('xCenter and k0 (initial momentum) must be finite');
  }
  
  for (let i = 0; i < grid.count; i++) {
    const x = grid.x0 + i * grid.dx;
    const dx = x - xCenter;
    
    // Gaussian envelope: exp(-(x - xCenter)² / (4 * sigma²))
    // This gives |psi|² = exp(-(x - xCenter)² / (2 * sigma²)), which has variance sigma²
    const envelope = Math.exp(-dx * dx / (4 * sigma * sigma));
    
    // Phase factor: exp(i * k0 * x) = cos(k0 * x) + i * sin(k0 * x)
    const phase = k0 * x;
    const cosPhase = Math.cos(phase);
    const sinPhase = Math.sin(phase);
    
    // Full wavefunction: envelope * phase
    // Note: We don't include the continuous normalization factor here
    // because the discrete normalization (via normalize()) will handle it
    grid.values[2 * i] = envelope * cosPhase;
    grid.values[2 * i + 1] = envelope * sinPhase;
  }

  if (normalizeFlag) {
    normalize(grid);
  }
}

/**
 * Computes the squared L2 norm of the unnormalized continuous envelope.
 * For psi(x) = exp(-x²/(4*sigma²)), integral |psi|² dx = sigma*sqrt(2*pi).
 * 
 * @param sigma - The standard deviation of |psi|²
 * @returns The norm of the continuous Gaussian
 */
export function analyticGaussianNorm(sigma: number): number {
  return sigma * Math.sqrt(2 * Math.PI);
}

/**
 * Computes the analytic width (variance) of a Gaussian wavefunction.
 * For a Gaussian with parameter sigma, the variance of |psi|² is sigma².
 * 
 * @param sigma - The standard deviation of |psi|²
 * @returns The variance (width squared) of the Gaussian
 */
export function analyticGaussianWidth(sigma: number): number {
  return sigma * sigma;
}

/**
 * Computes the analytic position expectation for a Gaussian wavefunction.
 * For a Gaussian centered at xCenter, ⟨x⟩ = xCenter.
 * 
 * @param xCenter - The center position of the Gaussian
 * @param sigma - The standard deviation of |psi|² (unused, for API consistency)
 * @returns The position expectation
 */
export function analyticGaussianPositionExpectation(
  xCenter: number,
  sigma: number
): number {
  return xCenter;
}

/**
 * Computes the analytic momentum expectation for a Gaussian wavefunction.
 * For a Gaussian with wavenumber k0, ⟨p⟩ = k0 (with hbar = 1).
 * 
 * @param k0 - The initial momentum (wavenumber)
 * @returns The momentum expectation
 */
export function analyticGaussianMomentumExpectation(k0: number): number {
  return k0;
}

/**
 * Computes the analytic width (variance) of a free Gaussian wavepacket at time t.
 * 
 * For a free particle (V = 0), the Schrödinger equation solution for a
 * Gaussian initial state with width sigma0 is:
 * 
 * sigma(t) = sigma0 * sqrt(1 + (t / (2 * sigma0²))²)
 * 
 * The variance is sigma(t)².
 * 
 * Derivation:
 * The free Schrödinger equation is i * dpsi/dt = -1/2 * d²psi/dx²
 * For a Gaussian initial state psi(x,0) = exp(-x²/(4*sigma0²)) * exp(i*k0*x)
 * (note: we use sigma0² as the initial variance)
 * 
 * The solution is:
 * psi(x,t) = 1/sqrt(1 + i*t/(2*sigma0²)) * exp(-(x - k0*t)² / (4*sigma0² * (1 + i*t/(2*sigma0²))))
 *           * exp(i*k0*x - i*k0²*t/2)
 * 
 * The width parameter evolves as:
 * sigma(t) = sigma0 * sqrt(1 + (t / (2 * sigma0²))²)
 * 
 * @param sigma0 - The initial standard deviation of |psi|²
 * @param t - The time
 * @returns The variance (width squared) at time t
 */
export function analyticFreeGaussianWidth(sigma0: number, t: number): number {
  const term = t / (2 * sigma0 * sigma0);
  return sigma0 * sigma0 * (1 + term * term);
}
