import {
  CrankNicolsonStepper, createPsiGrid, initializeGaussian, normalize,
  normSquared, energyExpectation, createZeroPotential, stampGaussianPotential,
  paintGaussianPath, type GaussianBrush, type PsiGrid,
} from '@psi-zoo/sim-core';

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
export interface SimulationSnapshot {
  time: number;
  norm: number;
  energy: number;
  playing: boolean;
  error: string | null;
}

function initialState(p0 = DEFAULT_INITIAL_MOMENTUM): PsiGrid {
  const psi = createPsiGrid(401, 0.1, -20);
  initializeGaussian(psi, -5, 1, p0, false);
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
  private readonly terrain = createZeroPotential(this.state);
  private readonly stepper = new CrankNicolsonStepper();
  private steps = 0;
  private playing = false;
  private disposed = false;
  private error: string | null = null;
  private frameId: number | undefined;
  private previous: number | undefined;
  private accumulator = 0;
  private generation = 0;

  constructor(private readonly scheduler: FrameScheduler, private readonly onFrame: (snapshot: SimulationSnapshot) => void) {}

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

  /** Renderer view of the owned array. Callers must use editing methods to mutate. */
  get potential(): Float64Array { return this.terrain; }

  stamp(center: number, brush: GaussianBrush): void {
    if (this.disposed || this.error) return;
    validateBrush(brush);
    stampGaussianPotential(this.state, this.terrain, { ...brush, center }, TERRAIN_MAX_HEIGHT);
    this.onFrame(this.snapshot());
  }

  paint(from: number, to: number, brush: GaussianBrush): void {
    if (this.disposed || this.error) return;
    validateBrush(brush);
    paintGaussianPath(this.state, this.terrain, brush, from, to, TERRAIN_MAX_HEIGHT);
    this.onFrame(this.snapshot());
  }

  /** Clear only V, without changing state, time, playback, or array identity. */
  clearTerrain(): void {
    if (this.disposed) return;
    this.terrain.fill(0);
    this.onFrame(this.snapshot());
  }

  snapshot(): SimulationSnapshot {
    if (this.error) return { time: this.steps * DT, norm: NaN, energy: NaN, playing: false, error: this.error };
    const norm = normSquared(this.state);
    const energy = energyExpectation(this.state, this.potential).real;
    if (!Number.isFinite(norm) || norm <= 0 || !Number.isFinite(energy)) {
      throw new RangeError('Nonfinite or zero probability norm / energy');
    }
    return { time: this.steps * DT, norm, energy, playing: this.playing, error: this.error };
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
    this.state = initialState(this.selectedMomentum);
    this.steps = 0;
    this.error = null;
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
        this.onFrame({ time: this.steps * DT, norm: NaN, energy: NaN, playing: false, error: this.error });
      }
      if (this.playing && !this.disposed) this.schedule();
    });
  }

  /** Simulation advancement is separate from the canvas/UI callback. */
  private advance(now: number): void {
    if (this.previous !== undefined) {
      this.accumulator += Math.min(Math.max(0, (now - this.previous) / 1000), MAX_STEPS_PER_FRAME * DT);
    }
    this.previous = now;
    let count = 0;
    while (this.accumulator + 1e-12 >= DT && count < MAX_STEPS_PER_FRAME) {
      this.stepper.step(this.state, this.potential, DT);
      this.steps++;
      count++;
      this.accumulator = Math.max(0, this.accumulator - DT);
    }
  }
}
