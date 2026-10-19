import type { PsiGrid } from './grid';

/** Contract for a future Schrödinger time integrator (not yet implemented). */
export interface Stepper {
  step(psi: PsiGrid, potential: Float64Array, dt: number): void;
}
