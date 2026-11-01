import { describe, expect, it, vi } from 'vitest';
import { createPsiGrid2D, measurePosition2D, gaussianWell2D, positionMoments2D, type PositionMeasurement2DAxes } from '@psi-zoo/sim-core';
import { QuantumWorld2D, DEFAULT_SPATIAL_MEASUREMENT_SEED, type WorldOptions2D } from './world2d';
import { createWorldPreset2D } from './worldPresets2d';
import { createSeededRandom } from '../random';
import { measurement2dReference, stateDistance2D } from '../../../sim-core/tests/helpers/measurement2dReference';

const grid = () => createPsiGrid2D({ nx: 24, ny: 21 });
function setup(preset: 'mood' | 'bell' = 'mood', extra: Partial<WorldOptions2D> = {}) {
  const g = grid(), options = { ...createWorldPreset2D(g, preset), ...extra };
  return { g, options, world: new QuantumWorld2D(g, options) };
}
function spatial(w: QuantumWorld2D) { return w.ids.map(id => w.spatialState(id).values); }
function mood(w: QuantumWorld2D) {
  const snapshot = w.getSnapshot();
  return { pairs: snapshot.pairs, history: snapshot.moodHistory, locals: snapshot.creatures.map(c => c.localMood) };
}
function maxDifference(a: Float64Array, b: Float64Array) { return Math.max(...a.map((v, k) => Math.abs(v - b[k]!))); }

describe('owned spatial measurement command and seed', () => {
  it('pins the default seed, validates uint32 seeds and starts each new world independently', () => {
    expect(DEFAULT_SPATIAL_MEASUREMENT_SEED).toBe(0x53504154);
    const { world } = setup();
    expect(world.getSnapshot()).toMatchObject({ spatialMeasurementSeed: 0x53504154, spatialMeasurementCount: 0, spatialDrawCount: 0, lastAction: null, rosterRevision: 2 });
    for (const seed of [0, 1, 0xffffffff]) expect(setup('mood', { spatialMeasurementSeed: seed }).world.getSnapshot().spatialMeasurementSeed).toBe(seed);
    for (const seed of [-1, 0x100000000, 1.5, NaN, Infinity, null]) {
      expect(() => setup('mood', { spatialMeasurementSeed: seed as number })).toThrow(/unsigned 32-bit/);
    }
    world.measureSpatial('a', 'xy', 0.4);
    const fresh = setup().world;
    expect(fresh.getSnapshot()).toMatchObject({ lastAction: null, spatialMeasurementCount: 0, spatialDrawCount: 0 });
    const initial = setup().world;
    expect(fresh.measureSpatial('a', 'x', 0.4)).toEqual(initial.measureSpatial('a', 'x', 0.4));
  });

  it('uses one consuming stream for all targets and both axes, with actual cumulative counts', () => {
    const { world, options } = setup('mood', { spatialMeasurementSeed: 42 });
    const rng = createSeededRandom(42), references = new Map(options.creatures.map(c => [c.id, c.psi]));
    let draws = 0;
    const script: readonly [string, PositionMeasurement2DAxes, number][] = [['b', 'x', 0.4], ['a', 'xy', 0.2], ['b', 'xy', 2], ['a', 'x', 0.01], ['b', 'x', 3]];
    for (const [index, [id, axes, sigma]] of script.entries()) {
      const reference = measurePosition2D(references.get(id)!, sigma, axes, rng);
      references.set(id, reference.state); draws += axes === 'x' ? 1 : 2;
      const result = world.measureSpatial(id, axes, sigma);
      expect(result.status).toBe('committed');
      if (result.status !== 'committed') throw new Error('Expected success');
      expect(result).toMatchObject({ drawsConsumed: axes === 'x' ? 1 : 2, spatialDrawCount: draws });
      expect(result.receipt).toMatchObject({ kind: 'spatial-measurement', targetId: id, axes, resolution: sigma, xIndex: reference.xIndex, x: reference.x,
        probability: reference.probability, sequence: index + 1, spatialSequence: index + 1, spatialDrawCount: draws, time: 0 });
      if (axes === 'x') { expect(result.receipt).not.toHaveProperty('y'); expect(result.receipt).not.toHaveProperty('yIndex'); }
      else if (reference.axes === 'xy') expect(result.receipt).toMatchObject({ y: reference.y, yIndex: reference.yIndex });
      expect(world.spatialState(id).values).toEqual(reference.state.values);
      expect(world.lastAction).toBe(result.receipt); expect(world.getSnapshot().lastAction).toBe(result.receipt);
      expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.receipt)).toBe(true);
      expect(result.receipt).not.toHaveProperty('state'); expect(result.receipt).not.toHaveProperty('probabilities');
    }
    expect(world.getSnapshot()).toMatchObject({ spatialDrawCount: draws, spatialMeasurementCount: script.length });
  });

  it('rejects in axes/resolution/target order without draws or replacing the prior receipt', () => {
    const { world } = setup();
    world.measureSpatial('a', 'x', 0.4);
    const before = world.getSnapshot(), values = spatial(world), receipt = world.lastAction;
    const attempts = [
      ['missing', 'invalid', NaN, 'invalid-axes'], ['missing', 'x', 0, 'invalid-resolution'],
      ['missing', 'xy', 0.4, 'target-missing'], ['a', 'x', NaN, 'invalid-resolution'], ['a', 'xy', Infinity, 'invalid-resolution'],
    ] as const;
    for (const [id, axes, sigma, reason] of attempts) {
      const result = world.measureSpatial(id, axes as PositionMeasurement2DAxes, sigma);
      expect(result).toMatchObject({ status: 'rejected', reason, drawsConsumed: 0, spatialDrawCount: 1 });
      expect(Object.isFrozen(result)).toBe(true);
      expect(world.lastAction).toBe(receipt); expect(world.getSnapshot()).toEqual(before); expect(spatial(world)).toEqual(values);
    }
  });

  it.each(['x', 'xy'] as const)('keeps saved reset initials, terrain, clock, selection, non-targets and moods unchanged at %s commit', axes => {
    const { world, g } = setup(), initial = spatial(world), terrain = gaussianWell2D(g, 2, 0.3, -0.7, 2);
    world.step(terrain, 0.03); world.select('b');
    const before = world.getSnapshot(), b = world.spatialState('b').values, moodBefore = mood(world), field = terrain.slice();
    // These defensive copies are not authority; the command must use owned psi.
    const bogus = world.spatialState('a'); bogus.values.fill(0);
    const query = vi.spyOn(world, 'spatialState');
    const result = world.measureSpatial('a', axes, 0.4);
    expect(query).not.toHaveBeenCalled(); query.mockRestore();
    expect(result.status).toBe('committed');
    if (result.status !== 'committed') throw new Error('Expected success');
    expect(result.receipt.time).toBe(0.03);
    expect(world.time).toBe(before.time); expect(world.selected).toBe(before.selected); expect(terrain).toEqual(field);
    expect(world.spatialState('b').values).toEqual(b); expect(mood(world)).toEqual(moodBefore);
    expect(world.spatialState('a').values).not.toEqual(initial[0]);
    world.resetEvolution(); expect(spatial(world)).toEqual(initial);
    expect(world.getSnapshot()).toMatchObject({ time: 0, lastAction: null, spatialDrawCount: 0, spatialMeasurementCount: 0 });
    expect(world.lastAction).toBeNull(); expect(terrain).toEqual(field);
  });

  it('invalidates only the target cache entries and preserves non-target cache identity', () => {
    const { world, g } = setup();
    world.effectivePotential('a', new Float64Array(g.nx * g.ny)); world.getSnapshot();
    const caches = world as unknown as { spatialMeans: Map<string, unknown>; spatialDiagnostics: Map<string, unknown> };
    const bMean = caches.spatialMeans.get('b'), bDiagnostic = caches.spatialDiagnostics.get('b');
    expect(caches.spatialMeans.has('a')).toBe(true); expect(caches.spatialDiagnostics.has('a')).toBe(true);
    world.measureSpatial('a', 'xy', 0.4);
    expect(caches.spatialMeans.has('a')).toBe(false); expect(caches.spatialDiagnostics.has('a')).toBe(false);
    expect(caches.spatialMeans.get('b')).toBe(bMean); expect(caches.spatialDiagnostics.get('b')).toBe(bDiagnostic);
  });

  it.each([false, true])('invalidates warmed means AND diagnostics; next step matches independently measured reference, diagnostics=%s', diagnostics => {
    const { world, g, options } = setup('mood', { spatialMeasurementSeed: 42 });
    const interactions = { ...options.interactions, social: true };
    world.setInteractions(interactions);
    const terrain = gaussianWell2D(g, 2, 0.5, -0.4, 2);
    world.step(terrain, 0.03);
    const current = world.ids.map(id => world.state(id));
    world.effectivePotential('a', terrain); // warm spatialMeans before any diagnostic cache
    if (diagnostics) world.getSnapshot();
    const result = world.measureSpatial('a', 'xy', 0.4);
    if (result.status !== 'committed' || result.receipt.axes !== 'xy') throw new Error('Expected xy success');
    const reference = measurement2dReference(current[0]!.psi, 0.4);
    const measured = { ...current[0]!.psi, values: reference.posterior(result.receipt.xIndex, result.receipt.yIndex) };
    const expected = new QuantumWorld2D(g, { creatures: [{ ...current[0]!, psi: measured }, current[1]!], interactions });
    // Check potentials BEFORE refreshing snapshots: an accidentally retained means
    // cache must not be hidden by a newly populated diagnostic cache.
    for (const id of world.ids) expect(maxDifference(world.effectivePotential(id, terrain), expected.effectivePotential(id, terrain))).toBeLessThan(1e-12);
    const actual = world.getSnapshot().creatures[0]!, moments = positionMoments2D(measured);
    expect(Math.abs(actual.x - moments.x)).toBeLessThan(1e-12);
    expect(Math.abs(actual.y - moments.y)).toBeLessThan(1e-12);
    expect(Math.abs(actual.sigmaX - moments.sigmaX)).toBeLessThan(1e-12);
    expect(Math.abs(actual.sigmaY - moments.sigmaY)).toBeLessThan(1e-12);
    world.step(terrain, 1 / 120); expected.step(terrain, 1 / 120);
    for (const id of world.ids) {
      expect(stateDistance2D(g, world.spatialState(id).values, expected.spatialState(id).values)).toBeLessThan(1e-11);
      expect(world.state(id).mood).toEqual(expected.state(id).mood);
    }
  });

  it.each(['a', 'b'])('measures either member %s of a registered pair in a mixed four-creature roster', target => {
    const { world, g } = setup('bell', { spatialMeasurementSeed: 42 }); world.addTemplate(); world.addTemplate();
    world.setInteractions({ drives: true, social: true });
    const terrain = gaussianWell2D(g, 2, 0.5, -0.4, 2), original = spatial(world), moods = mood(world), initial = createWorldPreset2D(g, 'bell');
    world.effectivePotential('c', terrain); world.getSnapshot();
    const result = world.measureSpatial(target, 'xy', 0.4);
    if (result.status !== 'committed' || result.receipt.axes !== 'xy') throw new Error('Expected xy');
    expect(mood(world)).toEqual(moods);
    for (const id of world.ids.filter(id => id !== target)) expect(world.spatialState(id).values).toEqual(original[world.ids.indexOf(id)]);
    expect(() => world.state(target)).toThrow(/no independent/);
    expect(world.effectivePotential('a', terrain)).toEqual(terrain); expect(world.effectivePotential('b', terrain)).toEqual(terrain);
    const measured = measurement2dReference(initial.creatures.find(c => c.id === target)!.psi, 0.4).posterior(result.receipt.xIndex, result.receipt.yIndex);
    const expected = new QuantumWorld2D(g, { ...initial, interactions: world.getSnapshot().interactions, creatures: initial.creatures.map(c => c.id === target ? { ...c, psi: { ...c.psi, values: measured } } : c) });
    expected.addTemplate(); expected.addTemplate();
    for (const id of ['c', 'd']) expect(world.effectivePotential(id, terrain)).toEqual(expected.effectivePotential(id, terrain));
    world.step(terrain, 1 / 120); expected.step(terrain, 1 / 120);
    for (const id of world.ids) expect(stateDistance2D(g, world.spatialState(id).values, expected.spatialState(id).values)).toBeLessThan(1e-11);
    expect(world.getSnapshot().pairs).toEqual(expected.getSnapshot().pairs);
  });

  it('keeps spatial and mood seed options independent', () => {
    const a = setup('bell', { measurementSeed: 1, spatialMeasurementSeed: 42 }).world;
    const b = setup('bell', { measurementSeed: 2, spatialMeasurementSeed: 42 }).world;
    a.measurePair('friendship', 'X'); b.measurePair('friendship', 'X');
    a.measureSpatial('a', 'xy', 0.4); b.measureSpatial('a', 'xy', 0.4);
    expect(spatial(a)).toEqual(spatial(b));
    const c = setup('bell', { measurementSeed: 42, spatialMeasurementSeed: 1 }).world;
    const d = setup('bell', { measurementSeed: 42, spatialMeasurementSeed: 2 }).world;
    c.measureSpatial('b', 'xy', 0.4); d.measureSpatial('b', 'xy', 0.4);
    expect(c.measureMood('friendship', 'a', 'Z')).toEqual(d.measureMood('friendship', 'a', 'Z'));
  });

  it.each(['posterior', 'y-distribution'] as const)('handles a real %s underflow with retained seeded draws and prior success intact', stage => {
    const sigma = 1 / Math.sqrt(1490), dy = stage === 'posterior' ? sigma * Math.sqrt(-2 * Math.log(0.8)) : 1;
    const g = createPsiGrid2D({ nx: 2, ny: 2, xmin: 0, xmax: 3, ymin: 0, ymax: 3 * dy });
    const base = createWorldPreset2D(g, 'independent'), psi = { ...g, values: new Float64Array(8) };
    if (stage === 'posterior') psi.values[6] = 1 / Math.sqrt(g.dx * g.dy);
    else psi.values[2] = psi.values[6] = 1 / Math.sqrt(2 * g.dx * g.dy);
    // Inverse LCG stepping gives a normal first draw followed by exactly zero;
    // the third draw is c/2^32. No fake RNG or production injection is needed.
    const seed = 4150723358, rng = createSeededRandom(seed);
    expect(rng()).toBe(634785765 / 2 ** 32); expect(rng()).toBe(0);
    expect(rng()).toBe(1013904223 / 2 ** 32);
    const w = new QuantumWorld2D(g, { ...base, creatures: [{ ...base.creatures[0]!, psi }], spatialMeasurementSeed: seed });
    const success = w.measureSpatial('a', 'x', Number.MAX_VALUE);
    expect(success.status).toBe('committed');
    const values = spatial(w), last = w.lastAction, before = w.getSnapshot();
    const result = w.measureSpatial('a', 'xy', sigma), consumed = stage === 'posterior' ? 2 : 1;
    expect(result).toMatchObject({ status: 'failed', stage, drawsConsumed: consumed, spatialDrawCount: 1 + consumed });
    expect(w.lastAction).toBe(last); expect(spatial(w)).toEqual(values);
    expect({ ...w.getSnapshot(), spatialDrawCount: 1 }).toEqual(before);
    w.resetEvolution(); expect(w.measureSpatial('a', 'x', Number.MAX_VALUE)).toEqual(success);
    expect(w.measureSpatial('a', 'xy', sigma)).toEqual(result);
  });

  it('reset reproduces mixed spatial/mood command scripts and clears both action sequences, not roster revision', () => {
    const { world } = setup('bell', { spatialMeasurementSeed: 17, measurementSeed: 42 });
    const revision = world.rosterRevision;
    const run = () => {
      // Constructor preparation remains in legacy history; reset intentionally
      // clears it. Compare command events, not that initialization-only prefix.
      const historyStart = world.getSnapshot().moodHistory.length;
      const commands = [world.measureSpatial('b', 'x', 0.4), world.measureMood('friendship', 'a', 'Z'), world.measureSpatial('a', 'xy', 0.2), world.measurePair('friendship', 'X')];
      world.measureAndRelease('friendship', 'Z');
      const snapshot = world.getSnapshot();
      return { commands, values: spatial(world), last: world.lastAction, snapshot: { ...snapshot, moodHistory: snapshot.moodHistory.slice(historyStart) } };
    };
    const first = run(); world.resetEvolution();
    expect(world.rosterRevision).toBe(revision); expect(world.lastAction).toBeNull();
    expect(run()).toEqual(first);
  });
});
