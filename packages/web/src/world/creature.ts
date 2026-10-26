import {
  CrankNicolsonStepper, createZeroPotential, normSquared, evolveQubit, blochVector, measurePosition,
  type PsiGrid, type QubitState, type QubitHamiltonian, type PositionMeasurementResult,
} from '@psi-zoo/sim-core';

export interface CreatureDrive {
  /** Nonnegative finite force magnitude F0, in dimensionless hbar=m=1 units. */
  readonly forceScale: number;
}

export interface CreatureOptions {
  /** Normalized discrete state with exactly zero Dirichlet endpoints; copied. */
  readonly psi: PsiGrid;
  /** Normalized mood and finite constant mood Hamiltonian; both copied. */
  readonly mood: QubitState;
  readonly moodHamiltonian: QubitHamiltonian;
  readonly drive: CreatureDrive;
  /** Fixed positive physics dt; default 0.01, matching ordinary playback. */
  readonly timeStep?: number;
}

export interface CreatureSnapshot {
  /** Independent copies: callers may edit these without changing the Creature. */
  readonly psi: PsiGrid;
  readonly mood: QubitState;
  readonly moodHamiltonian: QubitHamiltonian;
  readonly drive: CreatureDrive;
  readonly time: number;
}

function copyPsi(psi: PsiGrid): PsiGrid {
  return { count: psi.count, dx: psi.dx, x0: psi.x0, values: psi.values.slice() };
}

/**
 * Browser-independent world rule, depending only inward on sim-core.
 * Owns one spatial state, one mood and copied immutable-in-use configuration.
 * No timers, rendering, owned RNG, direct motion, or spatial backreaction
 * on mood. Observation delegates to the core POVM with a caller-supplied RNG. Create a new instance to reset or change configuration/grid.
 *
 * x_i=x0+i*dx, fixed xRef=x0+(count-1)*dx/2, hbar=m=1.
 * F(t)=F0*rz(t), V_total(x,t)=V_terrain(x)-F(t)*(x-xRef).
 * The force acts ONLY through the Hamiltonian passed to the existing CN solver.
 *
 * Every step uses exact constant-field mood evolution at dt/2 to sample force,
 * CN with that midpoint potential for the entire dt, and mood at dt as the new
 * endpoint. This is a second-order time approximation for the driven spatial
 * equation, not exact time-ordered evolution. Terrain is held fixed per call.
 * Neither state is renormalized. CN preserves norm to roundoff, but spatial
 * energy need not be conserved when precession/terrain changes the Hamiltonian.
 */
export class Creature {
  readonly timeStep: number;
  readonly xRef: number;
  private psi: PsiGrid;
  private mood: QubitState;
  private readonly moodHamiltonian: QubitHamiltonian;
  private readonly drive: CreatureDrive;
  private readonly stepper = new CrankNicolsonStepper();
  private steps = 0;

  constructor(options: CreatureOptions) {
    const dt = options.timeStep ?? 0.01;
    if (!Number.isFinite(dt) || dt <= 0 || dt / 2 === 0) {
      throw new RangeError('timeStep must be positive and finite with a representable half-step');
    }
    if (!Number.isFinite(options.drive.forceScale) || options.drive.forceScale < 0) {
      throw new RangeError('forceScale must be nonnegative and finite');
    }
    // Reuse core geometry/state/Dirichlet/coefficient validation. dt=0 never writes.
    const zero = createZeroPotential(options.psi);
    this.stepper.step(options.psi, zero, 0);
    const norm = normSquared(options.psi);
    if (!Number.isFinite(norm) || Math.abs(norm - 1) > 1e-10) {
      throw new RangeError('Spatial norm squared must be within 1e-10 of 1');
    }
    // dt=0 validates both the normalized mood and its Hamiltonian, and copies.
    this.mood = evolveQubit(options.mood, options.moodHamiltonian, 0);
    this.psi = copyPsi(options.psi);
    this.moodHamiltonian = { ...options.moodHamiltonian };
    this.drive = { ...options.drive };
    this.timeStep = dt;
    this.xRef = options.psi.x0 + (options.psi.count - 1) * options.psi.dx / 2;
  }

  /** Owned-copy snapshot, not a live view. Time is integer steps * fixed dt. */
  snapshot(): CreatureSnapshot {
    return {
      psi: copyPsi(this.psi), mood: { values: this.mood.values.slice() },
      moodHamiltonian: { ...this.moodHamiltonian }, drive: { ...this.drive },
      time: this.steps * this.timeStep,
    };
  }

  /**
   * Independent validated copy at the same step count, for speculative evolution.
   * No normalization or solver advancement. A coordinator can advance forks and
   * replace its owned instances only after all succeed, without exposing commits.
   */
  fork(): Creature {
    const copy = new Creature({
      psi: this.psi, mood: this.mood, moodHamiltonian: this.moodHamiltonian,
      drive: this.drive, timeStep: this.timeStep,
    });
    copy.steps = this.steps;
    return copy;
  }

  /** Existing Gaussian POVM on spatial state only; preserve mood/time. The result
   * owns its state independently of this Creature. Failed measurement never commits.
   */
  observePosition(resolution: number, rng: () => number): PositionMeasurementResult {
    const result = measurePosition(this.psi, resolution, rng);
    this.psi = copyPsi(result.state);
    return result;
  }

  /**
   * New real finite total potential at the CURRENT endpoint mood, for diagnostics.
   * This is not the midpoint potential used internally for the next step.
   * Terrain is borrowed only during this call; never changed or retained.
   */
  potential(terrain: Float64Array): Float64Array {
    return this.composePotential(terrain, this.mood);
  }

  /**
   * Advance exactly one fixed physics step. Terrain is sampled once and copied
   * additively. All calculations use temporary state; commit BOTH states and time
   * only after the solver succeeds. Validation/arithmetic failures throw RangeError
   * without advancing. O(N) time and memory, with no per-step normalization.
   */
  step(terrain: Float64Array): void {
    const nextSteps = this.steps + 1;
    if (!Number.isSafeInteger(nextSteps) || !Number.isFinite(nextSteps * this.timeStep)) {
      throw new RangeError('Creature time is not representable');
    }
    const midpoint = evolveQubit(this.mood, this.moodHamiltonian, this.timeStep / 2);
    const potential = this.composePotential(terrain, midpoint);
    const nextMood = evolveQubit(this.mood, this.moodHamiltonian, this.timeStep);
    const nextPsi = copyPsi(this.psi);
    this.stepper.step(nextPsi, potential, this.timeStep);
    this.psi = nextPsi;
    this.mood = nextMood;
    this.steps = nextSteps;
  }

  private composePotential(terrain: Float64Array, mood: QubitState): Float64Array {
    if (terrain.length !== this.psi.count) throw new RangeError('Terrain length must equal grid count');
    const force = this.drive.forceScale * blochVector(mood).z;
    if (!Number.isFinite(force)) throw new RangeError('Mood force must be finite');
    const potential = new Float64Array(this.psi.count);
    for (let i = 0; i < this.psi.count; i++) {
      const external = terrain[i]!;
      const x = this.psi.x0 + i * this.psi.dx;
      const total = force === 0 ? external : external - force * (x - this.xRef);
      if (!Number.isFinite(external) || !Number.isFinite(total)) {
        throw new RangeError('Terrain and composed mood potential must be finite');
      }
      potential[i] = total;
    }
    return potential;
  }
}
