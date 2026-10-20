import {
  CrankNicolsonStepper, createPsiGrid, initializeGaussian, normalize,
  normSquared, energyExpectation, type PsiGrid,
} from '@psi-zoo/sim-core';

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

function initialState(): PsiGrid {
  const psi = createPsiGrid(401, 0.1, -20);
  initializeGaussian(psi, -5, 1, 0.75, false);
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
  private state = initialState();
  private readonly potential = new Float64Array(401);
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

  reset(): void {
    if (this.disposed) return;
    this.pause();
    this.state = initialState();
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
