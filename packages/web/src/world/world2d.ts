import { createPsiGrid2D, initializeGaussian2D, normSquared2D, positionMoments2D, positionMean2D, probabilityDensity2D, projectDensityX, CayleyStepper2D,
  validateQubitState, createBasisQubit, creatureParameters2D,
  composeEffectivePotential2D, createInteractionWorkspace2D, socialPotentialAt2D, validateInteractionSettings2D,
  type PsiGrid2D, type QubitState, type Gaussian2DOptions, type CreatureParameters2D, type InteractionSettings2D, type InteractionSource2D, type InteractionWorkspace2D, validatePotential2D } from '@psi-zoo/sim-core';

import { MoodRegistry2D } from './moodRegistry2d';
import type { MoodBasis } from '@psi-zoo/sim-core';
export interface CreatureInitial2D {
  readonly id: string; readonly psi: PsiGrid2D; readonly mood: QubitState; readonly parameters: CreatureParameters2D;
}
export interface WorldOptions2D {
  readonly creatures: readonly CreatureInitial2D[]; readonly interactions: InteractionSettings2D; readonly maxPopulation?: number;
  readonly measurementSeed?: number;
  readonly bellPairs?: readonly { id: string; creatureAId: string; creatureBId: string }[];
}
interface OwnedCreature {
  id: string; psi: PsiGrid2D; candidate: PsiGrid2D; initial: Float64Array;
  parameters: CreatureParameters2D;
  potential: Float64Array; stepper: CayleyStepper2D; workspace: InteractionWorkspace2D;
}
export interface CreatureDiagnostic2D extends InteractionSource2D {
  readonly norm: number; readonly sigmaX: number; readonly sigmaY: number;
  readonly bloch: { readonly x: number; readonly y: number; readonly z: number }; readonly moodNorm: number;
  readonly forceX: number; readonly forceY: number; readonly socialAtMean: number;
  readonly localMood: ReturnType<MoodRegistry2D['local']>;
}
export interface WorldSnapshot2D {
  readonly time: number; readonly selected: string; readonly maxPopulation: number;
  readonly interactions: InteractionSettings2D; readonly creatures: readonly CreatureDiagnostic2D[];
  readonly pairs: ReturnType<MoodRegistry2D['inspectPairs']>;
  readonly moodHistory: MoodRegistry2D['history'];
}
function copyGrid(g: PsiGrid2D): PsiGrid2D { return { ...g, values: g.values.slice() }; }
export function initialCreature2D(g: PsiGrid2D, id: string, gaussian: Gaussian2DOptions,
  basis: 0 | 1, parameters: CreatureParameters2D): CreatureInitial2D {
  const psi = createPsiGrid2D(g); initializeGaussian2D(psi, gaussian);
  return { id, psi, mood: createBasisQubit(basis), parameters };
}
/** Browser-independent centroid/mood mean-field model, NOT an exact many-body state.
 * No timers, terrain editing or rendering. Seeded randomness occurs only in
 * explicit mood measurement commands, never in stepping. Terrain is borrowed only
 * for a synchronous whole step; the playback controller remains its sole owner.
 * Each member owns spatial amplitudes, frozen potential and solver; moods have
 * one authoritative registry owner (independent or shared pair). Candidate state
 * buffers are preallocated: transactional commit without per-step grid allocation.
 */
export class QuantumWorld2D {
  readonly maxPopulation: number;
  private members: OwnedCreature[] = [];
  private settings: InteractionSettings2D;
  private selectedId = '';
  private clock = 0;
  private readonly moods: MoodRegistry2D;
  // Spatial-only, private cache for the currently committed amplitudes. Mood
  // commands/settings never invalidate spatial moments or expose live buffers.
  private readonly spatialDiagnostics = new Map<string, Readonly<ReturnType<typeof positionMoments2D>>>();
  private readonly spatialMeans = new Map<string, Readonly<ReturnType<typeof positionMean2D>>>();
  constructor(readonly geometry: PsiGrid2D, options: WorldOptions2D) {
    // Validate metadata against the factory convention, including all domain bounds.
    const reference = createPsiGrid2D(geometry);
    if (reference.dx !== geometry.dx || reference.dy !== geometry.dy) throw new RangeError('Invalid world grid geometry');
    this.moods = new MoodRegistry2D(options.measurementSeed);
    const max = options.maxPopulation ?? 4;
    if (!Number.isSafeInteger(max) || max < 1 || max > 4 || options.creatures.length < 1 || options.creatures.length > max) throw new RangeError('World population must be in [1,maxPopulation], with maxPopulation in [1,4]');
    this.maxPopulation = max; validateInteractionSettings2D(options.interactions); this.settings = { ...options.interactions };
    for (const c of options.creatures) this.add(c);
    this.selectedId = this.members[0]!.id;
    for (const p of options.bellPairs ?? []) this.prepareBellPair(p.id, p.creatureAId, p.creatureBId);
  }
  get time(): number { return this.clock; }
  get selected(): string { return this.selectedId; }
  get ids(): readonly string[] { return this.members.map(c => c.id); }
  select(id: string): void { this.member(id); this.selectedId = id; }
  setInteractions(s: Partial<InteractionSettings2D>): void {
    const next = { ...this.settings, ...s }; validateInteractionSettings2D(next); this.settings = next;
  }
  add(c: CreatureInitial2D): void {
    if (!c.id.trim() || this.members.some(m => m.id === c.id)) throw new RangeError('Creature IDs must be nonempty and unique');
    if (this.members.length >= this.maxPopulation) throw new RangeError('World population limit reached');
    const g = c.psi, expected = this.geometry;
    for (const key of ['nx', 'ny', 'dx', 'dy', 'xmin', 'xmax', 'ymin', 'ymax'] as const) if (g[key] !== expected[key]) throw new RangeError('Creature grid geometry must match world');
    const n = normSquared2D(g); if (!Number.isFinite(n) || Math.abs(n - 1) > 1e-10) throw new RangeError('Creature spatial norm must be within 1e-10 of 1');
    validateQubitState(c.mood); const parameters = creatureParameters2D(c.parameters);
    const psi = copyGrid(g), candidate = copyGrid(g);
    this.moods.add(c.id, c.mood);
    this.members.push({ id: c.id, psi, candidate, initial: g.values.slice(),
      parameters, potential: new Float64Array(g.nx * g.ny), stepper: new CayleyStepper2D(psi), workspace: createInteractionWorkspace2D(g) });
    this.members.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    if (!this.selectedId) this.selectedId = c.id;
  }
  /** Deterministic templates; adding never rewinds existing members or world time. */
  addTemplate(): string {
    const templates = [
      { id: 'a', x0: -1.5, y0: 0 }, { id: 'b', x0: 1.5, y0: 0 },
      { id: 'c', x0: 0, y0: -2.5 }, { id: 'd', x0: 0, y0: 2.5 },
    ];
    let template = templates.find(t => !this.members.some(c => c.id === t.id));
    if (!template) {
      let index = 1; while (this.members.some(c => c.id === `extra-${index}`)) index++;
      template = { id: `extra-${index}`, x0: 0, y0: 0 };
    }
    this.add(initialCreature2D(this.geometry, template.id, { x0: template.x0, y0: template.y0, sigmaX: 0.7, sigmaY: 0.7 }, 0,
      { driveStrength: 0.25, preferredDirection: { x: 0, y: 1 }, moodFrequency: 0.7 }));
    this.select(template.id); return template.id;
  }
  remove(id = this.selectedId): void {
    this.member(id); if (this.members.length === 1) throw new RangeError('At least one creature must remain');
    this.moods.remove(id);
    this.spatialDiagnostics.delete(id);
    this.spatialMeans.delete(id);
    this.members = this.members.filter(c => c.id !== id);
    if (this.selectedId === id) this.selectedId = this.members[0]!.id;
  }
  /** Independent diagnostic/test copy; rejects paired moods rather than fabricating
   * a pure qubit for a mixed local state. Use spatialState/getSnapshot for pairs. */
  state(id: string): CreatureInitial2D {
    const c = this.member(id); return { id, psi: copyGrid(c.psi), mood: this.moods.independentState(id), parameters: creatureParameters2D(c.parameters) };
  }
  copyDensity(id: string, out: Float64Array): void { probabilityDensity2D(this.member(id).psi, out); }
  /** Read-only presentation query, no full complex-state copy or cached world mutation. */
  copyProjectedDensityX(id: string, out: Float64Array): void { projectDensityX(this.member(id).psi, out); }
  resetEvolution(): void {
    for (const c of this.members) c.psi.values.set(c.initial);
    this.moods.reset();
    this.spatialDiagnostics.clear();
    this.spatialMeans.clear();
    this.clock = 0;
  }
  /** Endpoint diagnostics use committed states, never last-step frozen potentials. */
  getSnapshot(): WorldSnapshot2D {
    const sources = this.sources();
    const creatures = this.members.map((c, i) => {
      const a = sources[i]!, localMood = this.moods.local(c.id), bloch = localMood.bloch;
      const force = this.settings.drives && !this.moods.paired(c.id) ? c.parameters.driveStrength * a.sz : 0;
      return { ...a, norm: a.norm, sigmaX: a.sigmaX, sigmaY: a.sigmaY, bloch, localMood, moodNorm: localMood.density.entries[0]! + localMood.density.entries[6]!,
        forceX: force * c.parameters.preferredDirection.x, forceY: force * c.parameters.preferredDirection.y,
        socialAtMean: this.moods.paired(c.id) ? 0 : socialPotentialAt2D(a, sources.filter(s => !this.moods.paired(s.id)), this.settings, a.x, a.y) };
    });
    return { time: this.clock, selected: this.selectedId, maxPopulation: this.maxPopulation, interactions: { ...this.settings }, creatures, pairs: this.moods.inspectPairs(), moodHistory: this.moods.history };
  }
  /** Public phase A/B helper also supports separate potential-construction benchmarks.
   * Reuses owned effective buffers; no spatial/mood advancement, no terrain writes. */
  preparePotentials(terrain: Float64Array): void {
    validatePotential2D(this.geometry, terrain);
    // Registered members (and a completely disabled world) have exactly terrain
    // as their H potential. Do not compute unused centroids, widths or Bloch data.
    const active = this.members.filter(c => !this.moods.paired(c.id) && (this.settings.drives || this.settings.social));
    const sources = active.map(c => ({ id: c.id, ...this.spatialMean(c), sz: this.moods.local(c.id).bloch.z, parameters: c.parameters }));
    for (const c of this.members) {
      const source = sources.find(s => s.id === c.id);
      if (!source) c.potential.set(terrain);
      else composeEffectivePotential2D(this.geometry, terrain, source, sources, this.settings, c.potential, c.workspace);
    }
  }
  effectivePotential(id: string, terrain: Float64Array): Float64Array { this.preparePotentials(terrain); return this.member(id).potential.slice(); }
  /** A: all endpoint means/Bloch values; B: ALL frozen potentials; C: all spatial
   * candidate solves; D: all mood unitaries; E: swap every candidate and commit
   * clock. No member ever sees a neighbor's advanced state. Frozen feedback makes
   * this whole coupled scheme generally FIRST-order, despite second-order Cayley.
   */
  step(terrain: Float64Array, dt: number): void {
    if (!Number.isFinite(dt) || dt < 0 || !Number.isFinite(this.clock + dt)) throw new RangeError('World dt must be finite and nonnegative with finite next time');
    this.preparePotentials(terrain);
    if (dt === 0) return;
    // Validate all mood phases before writing any candidate, including overflow.
    for (const c of this.members) if (!Number.isFinite(c.parameters.moodFrequency / 2 * dt)) throw new RangeError('Mood phase overflow');
    for (const c of this.members) { c.candidate.values.set(c.psi.values); c.stepper.step(c.candidate, c.potential, dt); }
    this.moods.advance(new Map(this.members.map(c => [c.id, c.parameters.moodFrequency])), dt);
    for (let i = 0; i < this.members.length; i++) {
      const c = this.members[i]!, old = c.psi; c.psi = c.candidate; c.candidate = old;
    }
    this.clock += dt;
    this.spatialDiagnostics.clear();
    this.spatialMeans.clear();
  }
  private spatialMean(c: OwnedCreature) {
    let p = this.spatialDiagnostics.get(c.id) ?? this.spatialMeans.get(c.id);
    if (!p) { p = Object.freeze(positionMean2D(c.psi)); this.spatialMeans.set(c.id, p); }
    return p;
  }
  private spatialDiagnostic(c: OwnedCreature) {
    let p = this.spatialDiagnostics.get(c.id);
    if (!p) { p = Object.freeze(positionMoments2D(c.psi)); this.spatialDiagnostics.set(c.id, p); }
    return p;
  }
  private source(c: OwnedCreature) {
    const p = this.spatialDiagnostic(c);
    return { id: c.id, x: p.x, y: p.y, norm: p.norm, sigmaX: p.sigmaX, sigmaY: p.sigmaY, sz: this.moods.local(c.id).bloch.z, parameters: c.parameters };
  }
  private sources() { return this.members.map(c => this.source(c)); }
  /** Spatial-only diagnostic copy works for both ownership types. */
  spatialState(id: string): PsiGrid2D { return copyGrid(this.member(id).psi); }
  prepareBellPair(pairId: string, a: string, b: string): void { this.member(a); this.member(b); this.moods.prepareBell(pairId,a,b); }
  measureMood(pairId: string, creatureId: string, basis: MoodBasis) { return this.moods.measure(pairId,creatureId,basis); }
  measurePair(pairId: string, basis: MoodBasis) { return this.moods.measureBoth(pairId,basis); }
  measureAndRelease(pairId: string, basis: MoodBasis): void { this.moods.release(pairId,basis); }
  private member(id: string): OwnedCreature { const c = this.members.find(c => c.id === id); if (!c) throw new RangeError(`Unknown creature: ${id}`); return c; }
}
