import { Creature, type CreatureOptions, type CreatureSnapshot } from './creature';
import type { PsiGrid, PositionMeasurementResult } from '@psi-zoo/sim-core';

export type CreatureId = 'a' | 'b';

export interface TwoCreatureWorldOptions {
  /** Initial conditions are copied into two independent owned Creatures at t=0. */
  readonly a: CreatureOptions;
  readonly b: CreatureOptions;
  /** Finite real contact coupling: positive repels, negative attracts, zero decouples. */
  readonly coupling: number;
}

export interface TwoCreatureWorldSnapshot {
  /** Independent snapshots, never live views of either owned Creature. */
  readonly a: CreatureSnapshot;
  readonly b: CreatureSnapshot;
  readonly coupling: number;
  readonly time: number;
}

export interface SocialPotentials {
  /** Newly allocated g*|psi_B|^2 and g*|psi_A|^2 respectively; no dx factor. */
  readonly a: Float64Array;
  readonly b: Float64Array;
}

function contactPotential(psi: PsiGrid, coupling: number): Float64Array {
  const potential = new Float64Array(psi.count);
  for (let i = 0; i < psi.count; i++) {
    const density = psi.values[2 * i]! ** 2 + psi.values[2 * i + 1]! ** 2;
    const value = coupling * density;
    if (!Number.isFinite(density) || !Number.isFinite(value)) {
      throw new RangeError('Density and social potential must be finite');
    }
    potential[i] = value;
  }
  return potential;
}

/**
 * Exactly two synchronized Creatures on the same 1D Dirichlet grid, hbar=m=1.
 * V_social,A=g*rho_B and V_social,B=g*rho_A, rho=|psi|^2 (density, not mass).
 * This is a deterministic mean-field contact model, not a joint quantum state,
 * coherent cross-creature interference, entanglement, or self-interaction.
 *
 * BOTH social potentials use endpoint densities at t, frozen for [t,t+dt]. Each
 * Creature retains its midpoint mood sampling and its existing real-potential
 * CN solve. Explicit frozen densities make the nonlinear scheme generally
 * first-order in time; CN alone does not make this combined scheme second-order.
 * Norm is preserved to roundoff; exact combined-energy conservation is NOT
 * promised. No caller terrain, options, or mutable live state is retained.
 */
export class TwoCreatureWorld {
  readonly coupling: number;
  private pair: readonly [Creature, Creature];

  constructor(options: TwoCreatureWorldOptions) {
    if (!Number.isFinite(options.coupling)) throw new RangeError('coupling must be finite');
    const a = new Creature(options.a), b = new Creature(options.b);
    const ga = options.a.psi, gb = options.b.psi;
    if (ga.count !== gb.count || ga.dx !== gb.dx || ga.x0 !== gb.x0) {
      throw new RangeError('Creature grids must have matching count, dx, and x0');
    }
    if (a.timeStep !== b.timeStep) throw new RangeError('Creature timesteps must match');
    this.pair = [a, b];
    this.coupling = options.coupling;
  }

  get timeStep(): number { return this.pair[0].timeStep; }

  snapshot(): TwoCreatureWorldSnapshot {
    const a = this.pair[0].snapshot(), b = this.pair[1].snapshot();
    return { a, b, coupling: this.coupling, time: a.time };
  }

  /** Measure only the selected spatial state, without advancing either clock or
   * collapsing the partner. Commit a measured fork only after the POVM succeeds.
   * Caller-supplied RNG consumption itself cannot be rolled back on failure.
   */
  observePosition(target: CreatureId, resolution: number, rng: () => number): PositionMeasurementResult {
    if (target !== 'a' && target !== 'b') throw new RangeError('Creature target must be a or b');
    const index = target === 'a' ? 0 : 1;
    const candidate = this.pair[index].fork();
    const result = candidate.observePosition(resolution, rng);
    this.pair = index === 0 ? [candidate, this.pair[1]] : [this.pair[0], candidate];
    return result;
  }

  /** Endpoint social-only diagnostic arrays; computed from the same snapshot pair. */
  socialPotentials(): SocialPotentials {
    const { a, b } = this.snapshot();
    return { a: contactPotential(b.psi, this.coupling), b: contactPotential(a.psi, this.coupling) };
  }

  /**
   * One fixed step, atomically for the pair. First compute BOTH old-density
   * potentials and BOTH additive terrain arrays. Advance only independent forks;
   * a single pair replacement commits after both succeed. Exceptions discard
   * candidates, including any successfully advanced first member. World time is
   * the synchronized member time, so there is no separate clock to roll back.
   * O(N) time/storage; copies favor ownership/atomicity over allocation efficiency.
   */
  step(terrain: Float64Array): void {
    const social = this.socialPotentials();
    if (terrain.length !== social.a.length) throw new RangeError('Terrain length must equal grid count');
    const terrainA = new Float64Array(terrain.length), terrainB = new Float64Array(terrain.length);
    for (let i = 0; i < terrain.length; i++) {
      const external = terrain[i]!;
      const a = external + social.a[i]!, b = external + social.b[i]!;
      if (!Number.isFinite(external) || !Number.isFinite(a) || !Number.isFinite(b)) {
        throw new RangeError('Terrain and composed social potentials must be finite');
      }
      terrainA[i] = a;
      terrainB[i] = b;
    }
    const a = this.pair[0].fork(), b = this.pair[1].fork();
    a.step(terrainA);
    b.step(terrainB);
    this.pair = [a, b];
  }
}
