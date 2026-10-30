export * from './joint-qubit';
export { composeEffectivePotential2D, createInteractionWorkspace2D, type InteractionWorkspace2D, drivePotentialAt2D, socialPotentialAt2D, creatureParameters2D, validateInteractionSettings2D,
  type CreatureParameters2D, type InteractionSettings2D, type InteractionSource2D } from './interaction2d';
export { stampPotential2D, validateTerrainBrush2D, validatePotentialLimit2D, verticalBarrier2D, gaussianWell2D, type TerrainTool2D, type TerrainBrush2D } from './potential2d';
export { validatePotential2D, createPsiGrid2D, index2D, xCoordinate2D, yCoordinate2D, type PsiGrid2D, type Grid2DOptions } from './grid2d';
export { initializeGaussian2D, type Gaussian2DOptions } from './gaussian2d';
export { normSquared2D, normalize2D, probabilityDensity2D, positionMean2D, positionMoments2D, energyExpectation2D } from './observables2d';
export { CayleyStepper2D } from './adi2d';
export { projectDensityX, projectTerrainX } from './projection2d';
export { createPsiGrid, normSquared } from './grid';
export type { PsiGrid } from './grid';
export type { Stepper } from './stepper';
export {
  createQubitState, createBasisQubit, validateQubitState, qubitNormSquared,
  evolveQubit, blochVector, type QubitState, type QubitHamiltonian, type BlochVector,
} from './qubit';
export {
  measurePosition, positionMeasurementProbabilities, type PositionMeasurementResult,
} from './measurement';
export { probabilityRegions, type RegionProbabilities } from './regions';
export {
  SCATTERING_CONFIG, createScatteringExperiment, runScatteringExperiment,
  type ScatteringOptions, type ScatteringRunOptions, type ScatteringSample, type ScatteringRun,
} from './scatteringExperiment';
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
