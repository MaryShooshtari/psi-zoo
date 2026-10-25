import {
  CrankNicolsonStepper, createPsiGrid, initializeGaussian, normalize,
  normSquared, energyExpectation, createZeroPotential, stampGaussianPotential,
  paintGaussianPath, probabilityRegions, createScatteringExperiment, SCATTERING_CONFIG, measurePosition,
  type RegionProbabilities, type GaussianBrush, type PsiGrid,
} from '@psi-zoo/sim-core';

import { createSeededRandom } from './random';

export const DEFAULT_MEASUREMENT_SEED = 831;
// dx=0.1: at least two cells per response sigma; default sharper than initial sigma=1.
export const MEASUREMENT_LIMITS = { min: 0.2, max: 2, default: 0.4 } as const;
export const DEFAULT_INITIAL_MOMENTUM = 0.75;
// dx=0.1: carrier |p0*dx| <= 0.15, well below the lattice/Nyquist scale.
export const INITIAL_MOMENTUM_LIMIT = 1.5;
export const TERRAIN_MAX_HEIGHT = 5;
export const BRUSH_LIMITS = { minSigma: 0.3, maxSigma: 2, minAmplitude: 0.1 } as const;
export const DEFAULT_BRUSH: GaussianBrush = { amplitude: 1, sigma: 0.6 };

function validateBrush(brush: GaussianBrush): void {
  if (!Number.isFinite(brush.sigma) || brush.sigma < BRUSH_LIMITS.minSigma || brush.sigma > BRUSH_LIMITS.maxSigma
    || !Number.isFinite(brush.amplitude) || brush.amplitude < BRUSH_LIMITS.minAmplitude || brush.amplitude > TERRAIN_MAX_HEIGHT) {
    throw new RangeError('Brush must have sigma in [0.3, 2] and amplitude in [0.1, 5]');
  }
}

const DT = 0.01;
const MAX_STEPS_PER_FRAME = 8;
export interface FrameScheduler {
  request(callback: (now: number) => void): number;
  cancel(id: number): void;
}
export type SimulationMode = 'exploration' | 'scattering';
export type ScatteringStatus = 'provisional' | 'separated' | 'modified' | 'outside-window' | 'unavailable';
export interface Observation {
  readonly index: number;
  readonly position: number;
  readonly resolution: number;
  readonly probability: number;
  readonly time: number;
}
export interface SimulationSnapshot {
  time: number;
  norm: number;
  energy: number;
  energyReference: number;
  energyDrift: number;
  observation: Observation | null;
  measurementCount: number;
  playing: boolean;
  error: string | null;
  mode: SimulationMode;
  regions: RegionProbabilities | null;
  scatteringStatus: ScatteringStatus;
  reflection: number | null;
  transmission: number | null;
}

function initialState(p0 = DEFAULT_INITIAL_MOMENTUM, mode: SimulationMode = 'exploration'): PsiGrid {
  const extent = mode === 'scattering' ? SCATTERING_CONFIG.halfExtent : 20;
  const dx = mode === 'scattering' ? SCATTERING_CONFIG.dx : 0.1;
  const psi = createPsiGrid(Math.round(2 * extent / dx) + 1, dx, -extent);
  initializeGaussian(psi, mode === 'scattering' ? SCATTERING_CONFIG.center : -5,
    mode === 'scattering' ? SCATTERING_CONFIG.sigma : 1, p0, false);
  psi.values[0] = psi.values[1] = 0;
  psi.values[2 * (psi.count - 1)] = psi.values[2 * (psi.count - 1) + 1] = 0;
  normalize(psi); // Once only, after imposing the initial Dirichlet endpoints.
  return psi;
}

/** Browser-side orchestration; physics stays in sim-core. No React dependency.
 * One unit of wall time advances one unit of physical time in ordinary playback.
 * Stalls are capped at eight fixed steps/frame: excess wall time is discarded,
 * never replaced by a larger numerical dt. Pause/resume discards fractional time.
 */
export class SimulationPlayback {
  private selectedMomentum = DEFAULT_INITIAL_MOMENTUM;
  private state = initialState(this.selectedMomentum);
  private terrain = createZeroPotential(this.state);
  private mode: SimulationMode = 'exploration';
  private pristineDemo = false;
  private initialNorm = normSquared(this.state);
  private energyReference = energyExpectation(this.state, this.terrain).real;
  private observation: Observation | null = null;
  private measurementCount = 0;
  private measuredSinceReset = false;
  private selectedResolution: number = MEASUREMENT_LIMITS.default;
  private random: () => number;
  private readonly stepper = new CrankNicolsonStepper();
  private steps = 0;
  private playing = false;
  private disposed = false;
  private error: string | null = null;
  private frameId: number | undefined;
  private previous: number | undefined;
  private accumulator = 0;
  private generation = 0;

  constructor(
    private readonly scheduler: FrameScheduler,
    private readonly onFrame: (snapshot: SimulationSnapshot) => void,
    private readonly seed = DEFAULT_MEASUREMENT_SEED,
  ) {
    this.random = createSeededRandom(seed);
  }

  get lastObservation(): Observation | null { return this.observation; }
  get measurementResolution(): number { return this.selectedResolution; }

  setMeasurementResolution(resolution: number): void {
    if (this.disposed) return;
    if (!Number.isFinite(resolution) || resolution < MEASUREMENT_LIMITS.min || resolution > MEASUREMENT_LIMITS.max) {
      throw new RangeError('Measurement resolution must be finite and in [0.2, 2]');
    }
    this.selectedResolution = resolution;
  }

  /** The action has no click-position argument: the Born distribution chooses
   * the outcome. Preserve terrain, time, pending frame, and pause/play state.
   */
  observe(): void {
    if (this.disposed || this.error) return;
    const result = measurePosition(this.state, this.selectedResolution, this.random);
    const energy = energyExpectation(result.state, this.terrain).real;
    if (!Number.isFinite(energy)) throw new RangeError('Nonfinite post-measurement energy');
    this.state = result.state;
    this.energyReference = energy;
    this.observation = {
      index: result.index, position: result.position, resolution: result.resolution,
      probability: result.probability, time: this.steps * this.timeStep,
    };
    this.measurementCount++;
    this.measuredSinceReset = true;
    this.onFrame(this.snapshot());
  }

  /** Reset and explicit preset loads rewind the RNG, clear observation history,
   * and establish energy under the current terrain. Resolution is retained.
   */
  private resetObservation(): void {
    this.random = createSeededRandom(this.seed);
    this.observation = null;
    this.measurementCount = 0;
    this.measuredSinceReset = false;
    this.energyReference = energyExpectation(this.state, this.terrain).real;
  }

  /** Read-only grid metadata; values are the actual state used by the renderer. */
  get psi(): PsiGrid { return this.state; }

  /** Pending initial-condition selection; applied only on Reset, never as a kick. */
  get initialMomentum(): number { return this.selectedMomentum; }

  setInitialMomentum(p0: number): void {
    if (this.disposed) return;
    if (!Number.isFinite(p0) || Math.abs(p0) > INITIAL_MOMENTUM_LIMIT) {
      throw new RangeError('Initial momentum must be finite and in [-1.5, 1.5]');
    }
    this.selectedMomentum = p0;
  }

  get timeStep(): number { return this.mode === 'scattering' ? SCATTERING_CONFIG.dt : DT; }

  /** Explicit mode loads replace packet AND terrain, pause, and restore t=0.
   * Reset, in contrast, preserves terrain and uses the currently selected momentum.
   */
  loadScatteringDemo(): void {
    if (this.disposed) return;
    const experiment = createScatteringExperiment();
    this.pause(); this.mode = 'scattering';
    this.state = experiment.psi; this.terrain = experiment.potential;
    this.selectedMomentum = SCATTERING_CONFIG.momentum;
    this.pristineDemo = true; this.steps = 0; this.error = null;
    this.initialNorm = normSquared(this.state);
    this.resetObservation();
    this.onFrame(this.snapshot());
  }

  loadFreeExploration(): void {
    if (this.disposed) return;
    this.pause(); this.mode = 'exploration'; this.selectedMomentum = DEFAULT_INITIAL_MOMENTUM;
    this.state = initialState(); this.terrain = createZeroPotential(this.state);
    this.pristineDemo = false; this.steps = 0; this.error = null;
    this.initialNorm = normSquared(this.state);
    this.resetObservation();
    this.onFrame(this.snapshot());
  }

  /** Renderer view of the owned array. Callers must use editing methods to mutate.
   * Identity is stable except explicit mode loads, which can change grid size.
   */
  get potential(): Float64Array { return this.terrain; }

  stamp(center: number, brush: GaussianBrush): void {
    if (this.disposed || this.error) return;
    validateBrush(brush);
    stampGaussianPotential(this.state, this.terrain, { ...brush, center }, TERRAIN_MAX_HEIGHT);
    this.energyReference = energyExpectation(this.state, this.terrain).real;
    this.pristineDemo = false;
    this.onFrame(this.snapshot());
  }

  paint(from: number, to: number, brush: GaussianBrush): void {
    if (this.disposed || this.error) return;
    validateBrush(brush);
    paintGaussianPath(this.state, this.terrain, brush, from, to, TERRAIN_MAX_HEIGHT);
    this.energyReference = energyExpectation(this.state, this.terrain).real;
    this.pristineDemo = false;
    this.onFrame(this.snapshot());
  }

  /** Clear only V, without changing state, time, playback, or array identity. */
  clearTerrain(): void {
    if (this.disposed) return;
    this.terrain.fill(0);
    this.energyReference = energyExpectation(this.state, this.terrain).real;
    this.pristineDemo = false;
    this.onFrame(this.snapshot());
  }

  snapshot(): SimulationSnapshot {
    const time = this.steps * this.timeStep;
    if (this.error) return { time, norm: NaN, energy: NaN, energyReference: this.energyReference,
      energyDrift: NaN, observation: this.observation, measurementCount: this.measurementCount,
      playing: false, error: this.error,
      mode: this.mode, regions: null, scatteringStatus: 'unavailable', reflection: null, transmission: null };
    const norm = normSquared(this.state);
    const energy = energyExpectation(this.state, this.potential).real;
    if (!Number.isFinite(norm) || norm <= 0 || !Number.isFinite(energy)) {
      throw new RangeError('Nonfinite or zero probability norm / energy');
    }
    const regions = probabilityRegions(this.state, SCATTERING_CONFIG.leftEdge, SCATTERING_CONFIG.rightEdge);
    let scatteringStatus: ScatteringStatus = 'provisional';
    if (this.mode === 'scattering') {
      if (!this.pristineDemo || this.measuredSinceReset) scatteringStatus = 'modified';
      else if (time > SCATTERING_CONFIG.windowEnd) scatteringStatus = 'outside-window';
      else if (time >= SCATTERING_CONFIG.windowStart && regions.interaction / this.initialNorm < SCATTERING_CONFIG.residualLimit) {
        const boundary = probabilityRegions(this.state, this.state.x0 + 5,
          this.state.x0 + (this.state.count - 1) * this.state.dx - 5);
        if ((boundary.left + boundary.right) / this.initialNorm < 1e-12
          && Math.abs(norm - this.initialNorm) < 2e-11) scatteringStatus = 'separated';
      }
    }
    const separated = scatteringStatus === 'separated';
    return { time, norm, energy, energyReference: this.energyReference, energyDrift: energy - this.energyReference,
      observation: this.observation, measurementCount: this.measurementCount,
      playing: this.playing, error: this.error, mode: this.mode,
      regions, scatteringStatus, reflection: separated ? regions.left / this.initialNorm : null,
      transmission: separated ? regions.right / this.initialNorm : null };
  }

  play(): void {
    if (this.disposed || this.playing || this.error) return;
    this.playing = true;
    this.previous = undefined;
    this.accumulator = 0;
    this.schedule();
  }

  pause(): void {
    this.playing = false;
    this.generation++;
    if (this.frameId !== undefined) this.scheduler.cancel(this.frameId);
    this.frameId = undefined;
    this.previous = undefined;
    this.accumulator = 0;
  }

  /** Pause and regenerate the initial packet with selected momentum at t=0;
   * intentionally preserve terrain and its array identity.
   */
  reset(): void {
    if (this.disposed) return;
    this.pause();
    this.state = initialState(this.selectedMomentum, this.mode);
    this.initialNorm = normSquared(this.state);
    if (this.selectedMomentum !== SCATTERING_CONFIG.momentum) this.pristineDemo = false;
    this.steps = 0;
    this.error = null;
    this.resetObservation();
  }

  dispose(): void { this.pause(); this.disposed = true; }

  private schedule(): void {
    const generation = this.generation;
    this.frameId = this.scheduler.request(now => {
      if (this.disposed || !this.playing || generation !== this.generation) return;
      this.frameId = undefined;
      try {
        this.advance(now);
        this.onFrame(this.snapshot());
      } catch (error) {
        this.pause();
        this.error = error instanceof Error ? error.message : String(error);
        // If diagnostics themselves fail, communicate the failure rather than
        // throwing again or publishing misleading finite measurements.
        this.onFrame(this.snapshot());
      }
      if (this.playing && !this.disposed) this.schedule();
    });
  }

  /** Simulation advancement is separate from the canvas/UI callback. */
  private advance(now: number): void {
    const dt = this.timeStep;
    if (this.previous !== undefined) {
      this.accumulator += Math.min(Math.max(0, (now - this.previous) / 1000), MAX_STEPS_PER_FRAME * dt);
    }
    this.previous = now;
    let count = 0;
    while (this.accumulator + 1e-12 >= dt && count < MAX_STEPS_PER_FRAME) {
      this.stepper.step(this.state, this.potential, dt);
      this.steps++;
      count++;
      this.accumulator = Math.max(0, this.accumulator - dt);
    }
  }
}
