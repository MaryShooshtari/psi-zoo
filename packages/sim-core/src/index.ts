export { createPsiGrid, normSquared } from './grid';
export type { PsiGrid } from './grid';
export type { Stepper } from './stepper';
export {
  createZeroPotential,
  createGaussianBarrier,
  stampGaussianPotential,
  paintGaussianPath,
  type PotentialGrid,
  type GaussianBrush,
  type GaussianBarrier,
} from './potential';
export { CrankNicolsonStepper } from './crankNicolson';
export {
  innerProduct,
  normalize,
  expectationValue,
  positionExpectation,
  momentumExpectation,
  positionVariance,
  momentumVariance,
  type Complex,
} from './math';
export {
  initializeGaussian,
  analyticGaussianNorm,
  analyticGaussianWidth,
  analyticGaussianPositionExpectation,
  analyticGaussianMomentumExpectation,
  analyticFreeGaussianWidth,
} from './gaussian';
export {
  getHamiltonianCoefficients,
  applyHamiltonian,
  energyExpectation,
  type HamiltonianCoefficients,
} from './hamiltonian';
export {
  solveTridiagonal,
  type TridiagonalSolution,
} from './tridiagonal';
