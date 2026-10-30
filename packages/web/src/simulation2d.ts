import { createPsiGrid2D, initializeGaussian2D, CayleyStepper2D, normSquared2D,
  positionMoments2D, energyExpectation2D, stampPotential2D, validatePotentialLimit2D, type TerrainBrush2D, type Grid2DOptions, type Gaussian2DOptions } from '@psi-zoo/sim-core';
import type { FrameScheduler } from './simulation';
import { createTerrainPreset2D, type TerrainPreset2D } from './terrainPresets';
import { QuantumWorld2D, type WorldSnapshot2D } from './world/world2d';
import { createWorldPreset2D, type WorldPreset2D } from './world/worldPresets2d';
export interface Simulation2DOptions {
  grid?: Grid2DOptions; gaussian?: Gaussian2DOptions; dt?: number; potential?: Float64Array; potentialLimit?: number;
  /** Optional world adapter; the same terrain and fixed-step playback loop serve both modes. */
  worldPreset?: WorldPreset2D;
  /** Optional UI-only cadence: draw each animation frame, publish a current
   * timestamped diagnostic snapshot at this interval. Physics still runs at dt.
   * Default callers keep the original one-snapshot-per-frame behavior. */
  presentation?: { draw: () => void; intervalMs: number };
}
export interface Snapshot2D {
  time: number; norm: number; sigmaX: number; sigmaY: number; energy: number; playing: boolean; error: string | null;
  terrainRevision: number; potentialMin: number; potentialMax: number; potentialL1: number; experiment: string;
  world?: WorldSnapshot2D;
}
/** Same accumulator policy as 1D: fixed dt, max eight steps/frame, excess wall
 * time discarded. No React/Canvas dependencies. Owns editable terrain separately
 * from psi. Synchronous edits and complete solver steps cannot interleave on the
 * main thread. Kinetic caches are unchanged; the stepper reads current V each step.
 */
export class SimulationPlayback2D {
  readonly psi;
  private readonly field: Float64Array;
  private worldModel: QuantumWorld2D | null = null;
  get world(): QuantumWorld2D | null { return this.worldModel; }
  readonly dt: number;
  readonly potentialLimit: number;
  private revision = 0;
  private experiment = 'Free/custom initial packet';
  private statsDirty = false;
  private terrainStats = { potentialMin: 0, potentialMax: 0, potentialL1: 0 };
  private readonly stepper;
  private readonly initial: Float64Array;
  private steps = 0;
  private playing = false;
  private disposed = false;
  private error: string | null = null;
  private frameId: number | undefined;
  private previous: number | undefined;
  private accumulator = 0;
  private generation = 0;
  private lastPublication = -Infinity;
  private readonly presentation: Simulation2DOptions['presentation'];
  constructor(private readonly scheduler: FrameScheduler, private readonly onFrame: (s: Snapshot2D) => void, options: Simulation2DOptions = {}) {
    this.presentation = options.presentation;
    if (this.presentation && (!Number.isFinite(this.presentation.intervalMs) || this.presentation.intervalMs < 0)) throw new RangeError('Presentation interval must be finite and nonnegative');
    this.dt = options.dt ?? 1 / 120;
    if (!Number.isFinite(this.dt) || this.dt <= 0) throw new RangeError('Playback dt must be positive and finite');
    this.psi = createPsiGrid2D(options.grid); initializeGaussian2D(this.psi, options.gaussian);
    this.initial = this.psi.values.slice();
    this.potentialLimit = options.potentialLimit ?? 20; validatePotentialLimit2D(this.potentialLimit);
    this.field = options.potential?.slice() ?? new Float64Array(this.psi.nx * this.psi.ny);
    this.stepper = new CayleyStepper2D(this.psi); this.stepper.step(this.psi, this.field, 0);
    if (this.field.some(v => Math.abs(v) > this.potentialLimit)) throw new RangeError('Initial terrain exceeds configured limit');
    this.updateTerrainStats();
    if (options.worldPreset) this.worldModel = new QuantumWorld2D(this.psi, createWorldPreset2D(this.psi, options.worldPreset));
  }
  snapshot(): Snapshot2D {
    if (this.statsDirty) this.updateTerrainStats();
    if (this.worldModel) {
      const world = this.worldModel.getSnapshot(), selected = world.creatures.find(c => c.id === world.selected)!;
      return { time: world.time, norm: selected.norm, sigmaX: selected.sigmaX, sigmaY: selected.sigmaY,
        energy: NaN, playing: this.playing, error: this.error, terrainRevision: this.revision,
        ...this.terrainStats, experiment: this.experiment, world };
    }
    const m = this.error ? { sigmaX: NaN, sigmaY: NaN } : positionMoments2D(this.psi);
    return { time: this.steps * this.dt, norm: this.error ? NaN : normSquared2D(this.psi),
      sigmaX: m.sigmaX, sigmaY: m.sigmaY, energy: this.error ? NaN : energyExpectation2D(this.psi, this.field), playing: this.playing, error: this.error,
      terrainRevision: this.revision, ...this.terrainStats, experiment: this.experiment };
  }
  /** Inspection is always a copy; renderers may reuse an output buffer and copy
   * only when terrainRevision changes. Never exposes the solver's owned V. */
  get potential(): Float64Array { return this.field.slice(); }
  get terrainRevision(): number { return this.revision; }
  copyPotential(out: Float64Array): void {
    if (out.length !== this.field.length || out.buffer === this.psi.values.buffer) throw new RangeError('Potential output size/alias mismatch');
    out.set(this.field);
  }
  stamp(x: number, y: number, brush: TerrainBrush2D): void {
    if (this.disposed || this.error) return;
    // Strokes can apply many local stamps per pointer event: publish only once
    // after that event, not per stamp. Statistics are lazy, never scanned here.
    if (stampPotential2D(this.psi, this.field, x, y, brush, this.potentialLimit)) { this.revision++; this.statsDirty = true; }
  }
  clearTerrain(): void {
    if (this.disposed) return;
    if (this.field.some(v => v !== 0)) { this.field.fill(0); this.terrainChanged(); }
  }
  loadPreset(preset: TerrainPreset2D): void {
    if (this.disposed) return;
    if (this.worldModel) throw new RangeError('Terrain experiment presets belong to single-Gaussian mode; use world presets here');
    const setup = createTerrainPreset2D(this.psi, preset);
    if (setup.potential.some(v => Math.abs(v) > this.potentialLimit)) throw new RangeError('Preset exceeds configured terrain limit');
    // Generate the replacement packet before committing, retaining grid/stepper identity.
    const next = { ...this.psi, values: new Float64Array(this.psi.values.length) };
    initializeGaussian2D(next, setup.gaussian);
    this.pause(); this.psi.values.set(next.values); this.initial.set(next.values);
    this.field.set(setup.potential); this.steps = 0; this.error = null; this.experiment = setup.description;
    this.terrainChanged();
  }
  /** Replace only the world experiment; preserve canonical player terrain. */
  loadWorldPreset(preset: WorldPreset2D): void {
    if (this.disposed) return;
    const next = new QuantumWorld2D(this.psi, createWorldPreset2D(this.psi, preset));
    this.pause(); this.worldModel = next; this.steps = 0; this.error = null;
    this.experiment = `World: ${preset} (shared terrain preserved)`; this.publish();
  }
  private terrainChanged(): void {
    this.revision++; this.updateTerrainStats(); this.publish();
  }
  private updateTerrainStats(): void {
    this.statsDirty = false;
    let min = Infinity, max = -Infinity, sum = 0;
    for (const v of this.field) { min = Math.min(min, v); max = Math.max(max, v); sum += Math.abs(v); }
    this.terrainStats = { potentialMin: min, potentialMax: max, potentialL1: sum * this.psi.dx * this.psi.dy };
  }
  play(): void {
    if (this.disposed || this.playing || this.error) return;
    this.playing = true; this.previous = undefined; this.accumulator = 0;
    this.publish(); this.schedule();
  }
  pause(): void {
    this.playing = false; this.generation++;
    if (this.frameId !== undefined) this.scheduler.cancel(this.frameId);
    this.frameId = undefined; this.previous = undefined; this.accumulator = 0;
  }
  reset(): void {
    if (this.disposed) return;
    this.pause();
    if (this.worldModel) this.worldModel.resetEvolution(); else this.psi.values.set(this.initial);
    this.steps = 0; this.error = null; this.publish();
  }
  dispose(): void { this.pause(); this.disposed = true; }
  private publish(now = -Infinity): void {
    const snapshot = this.snapshot();
    if (!snapshot.error) this.presentation?.draw();
    this.onFrame(snapshot);
    this.lastPublication = now;
  }
  private schedule(): void {
    const generation = this.generation;
    this.frameId = this.scheduler.request(now => {
      if (this.disposed || !this.playing || generation !== this.generation) return;
      this.frameId = undefined;
      try {
        if (this.previous !== undefined) this.accumulator += Math.min(Math.max(0, (now - this.previous) / 1000), 8 * this.dt);
        this.previous = now;
        let count = 0;
        while (this.accumulator + 1e-12 >= this.dt && count < 8) {
          if (this.worldModel) this.worldModel.step(this.field, this.dt);
          else this.stepper.step(this.psi, this.field, this.dt);
          this.steps++; count++;
          this.accumulator = Math.max(0, this.accumulator - this.dt);
        }
        if (!this.presentation || now - this.lastPublication >= this.presentation.intervalMs) this.publish(now);
        else this.presentation.draw();
      } catch (error) {
        this.pause(); this.error = error instanceof Error ? error.message : String(error); this.publish(now);
      }
      if (this.playing && !this.disposed) this.schedule();
    });
  }
}
