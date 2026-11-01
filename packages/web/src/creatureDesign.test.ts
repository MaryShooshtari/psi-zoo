import { describe, expect, it } from 'vitest';
import { createPsiGrid2D } from '@psi-zoo/sim-core';
import { creatureColor2D, creatureLabel, simpleMood } from './creatureIdentity';
import { measurementReactionTargets, actionCandidates, projectedActionCandidates, blinkClosed, createCreatureDecoration, faceAnchor, pickCreature, registeredConnections } from './render/creatureDecoration';
import { QuantumWorld2D } from './world/world2d';
import { createWorldPreset2D } from './world/worldPresets2d';
function fixture() { const g = createPsiGrid2D({ nx: 32, ny: 24, xmin: -10, xmax: 10, ymin: -10, ymax: 10 }); return new QuantumWorld2D(g, createWorldPreset2D(g, 'bell')); }
function context() {
  const calls: unknown[][] = [];
  const ctx = new Proxy({} as CanvasRenderingContext2D, { get(target, key) { if (key in target) return Reflect.get(target, key); return (...args: unknown[]) => calls.push([key, ...args]); } });
  return { ctx, calls };
}
describe('measurement-only visual reactions', () => {
  it('marks the measured spatial target, not a selected or paired substitute', () => {
    const w = fixture(); w.select('b'); w.measureSpatial('a', 'x', .4);
    expect(measurementReactionTargets(w.lastAction!)).toEqual(['a']); expect(Object.isFrozen(measurementReactionTargets(w.lastAction!))).toBe(true);
  });
  it('distinguishes preparation, sampled release and mere product factorization', () => {
    const w = fixture(), pair = w.getSnapshot().pairs[0]!;
    w.measureAndRelease(pair.id, 'Z'); expect(measurementReactionTargets(w.lastAction!)).toHaveLength(1);
    w.prepareBellPair('new', 'b', 'a'); expect(measurementReactionTargets(w.lastAction!)).toEqual([]);
    w.measurePair('new', 'X'); expect(measurementReactionTargets(w.lastAction!)).toEqual(['b', 'a']);
    w.measureAndRelease('new', 'X'); expect(measurementReactionTargets(w.lastAction!)).toEqual([]);
  });
  it('uses a small surprise mouth only for eligible UI targets, not in reduced motion', () => {
    const w = fixture(), density = new Float64Array(w.geometry.nx * w.geometry.ny); w.copyDensity('a', density);
    const draw = createCreatureDecoration(w.geometry), { ctx, calls } = context();
    draw(ctx, 600, 600, [{ id: 'a', density }], w.getSnapshot(), 'a', false, false, 0, false, undefined, w, ['a']);
    expect(calls).toContainEqual(['ellipse', 0, 5, 2, 2.5, 0, 0, 2 * Math.PI]);
    calls.length = 0; draw(ctx, 600, 600, [{ id: 'a', density }], w.getSnapshot(), 'a', false, true, 0, false, undefined, w, ['a']);
    expect(calls).not.toContainEqual(['ellipse', 0, 5, 2, 2.5, 0, 0, 2 * Math.PI]);
  });
});
describe('deterministic creature presentation', () => {
  it('keeps neutral labels, colors and IDs independent of ordering/reset/selection', () => {
    expect(['a', 'b', 'c', 'd'].map(creatureLabel)).toEqual(['Creature A', 'Creature B', 'Creature C', 'Creature D']);
    expect(new Set(['a', 'b', 'c', 'd'].map(id => creatureColor2D(id).join(','))).size).toBe(4);
    const w = fixture(), identities = w.ids.map(id => [creatureLabel(id), creatureColor2D(id)]);
    w.select('b'); w.resetEvolution();
    expect(w.ids.map(id => [creatureLabel(id), creatureColor2D(id)])).toEqual(identities);
    expect(creatureLabel('extra-1')).toBe('Creature EXTRA-1');
    expect(creatureLabel('extra-2')).not.toBe(creatureLabel('extra-1'));
    expect(simpleMood(0, .5)).toBe('Mixed mood');
  });
  it('anchors split clouds on significant density, never a low-density midpoint', () => {
    const d = new Float64Array([0, .8, .2, .001, .2, .8, 0]);
    expect(faceAnchor(d, 3)).toEqual({ index: 1, peak: .8 });
    expect(faceAnchor(d, 5)?.index).toBe(5);
    expect(faceAnchor(new Float64Array(7), 3)).toBeNull();
    expect(faceAnchor(new Float64Array([1e-10]), 0)).toBeNull();
    expect([...d]).toEqual([0, .8, .2, .001, .2, .8, 0]);
  });
  it('selects the largest local contribution, retains overlap ties, then uses stable ID order', () => {
    const layers = [{ id: 'b', density: new Float64Array([.8, .5, 1e-9]) }, { id: 'a', density: new Float64Array([.2, .5, 1e-9]) }];
    expect(pickCreature(layers, 0, 'a')).toBe('b'); expect(pickCreature(layers, 1, 'b')).toBe('b');
    expect(pickCreature(layers, 1, 'absent')).toBe('a'); expect(pickCreature(layers, 2, 'b')).toBeNull();
    expect(pickCreature(layers, -1, 'a')).toBeNull();
  });
  it('blink timing is deterministic and disabled under reduced motion', () => {
    let closed = 0;
    for (let t = 0; t < 8400; t += 20) { closed += +blinkClosed('a', t, false); expect(blinkClosed('a', t, true)).toBe(false); }
    expect(closed).toBeGreaterThan(0); expect(closed).toBeLessThan(20);
  });
  it('selection and both overlay presentations preserve every amplitude and subsequent seeded outcomes', () => {
    const w = fixture(), reference = fixture(), before = w.ids.map(id => w.spatialState(id).values), snap = w.getSnapshot();
    const densities = w.ids.map(id => { const density = new Float64Array(w.geometry.nx * w.geometry.ny); w.copyDensity(id, density); return { id, density }; });
    const marginals = w.ids.map(id => { const density = new Float64Array(w.geometry.nx); w.copyProjectedDensityX(id, density); return { id, density }; });
    const oldDensities = densities.map(l => l.density.slice()), { ctx } = context(), decorate = createCreatureDecoration(w.geometry);
    for (let k = 0; k < 80; k++) {
      w.select(k % 2 ? 'a' : 'b');
      decorate(ctx, 600, 600, densities, snap, w.selected, false, false, k * 50);
      decorate(ctx, 1000, 500, marginals, snap, w.selected, true, k % 2 === 0, k * 50);
    }
    expect(w.time).toBe(0);
    w.ids.forEach((id, i) => { expect(w.spatialState(id).values).toEqual(before[i]); expect(densities[i]!.density).toEqual(oldDensities[i]); });
    expect(w.getSnapshot().pairs).toEqual(reference.getSnapshot().pairs);
    for (let k = 0; k < 8; k++) {
      const basis = k % 2 ? 'X' : 'Z', pair = w.getSnapshot().pairs[0]!;
      expect(w.measureMood(pair.id, 'a', basis)).toEqual(reference.measureMood(pair.id, 'a', basis));
    }
  });
  it('reuses anchors between publications without rescanning the whole density every frame', () => {
    const w = fixture(), snapshot = w.getSnapshot(), actual = new Float64Array(w.geometry.nx * w.geometry.ny); w.copyDensity('a', actual);
    let reads = 0;
    const density = new Proxy(actual, { get(target, key) { if (typeof key === 'string' && /^\d+$/.test(key)) reads++; const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } });
    const decorate = createCreatureDecoration(w.geometry), { ctx } = context();
    decorate(ctx, 600, 600, [{ id: 'a', density }], snapshot, 'a', false, false, 0);
    expect(reads).toBeGreaterThanOrEqual(actual.length); reads = 0;
    for (let t = 1; t < 80; t += 10) decorate(ctx, 600, 600, [{ id: 'a', density }], snapshot, 'a', false, false, t);
    expect(reads).toBeLessThan(40);
  });
  it('suppresses an overlay immediately when its cached anchor loses significant density', () => {
    const w = fixture(), density = new Float64Array(w.geometry.nx * w.geometry.ny); w.copyDensity('a', density);
    const decorate = createCreatureDecoration(w.geometry), { ctx, calls } = context(), layers = [{ id: 'a', density }];
    decorate(ctx, 600, 600, layers, w.getSnapshot(), 'a', false, true, 0);
    expect(calls.some(c => c[0] === 'translate')).toBe(true);
    calls.length = 0; density.fill(0);
    decorate(ctx, 600, 600, layers, w.getSnapshot(), 'a', false, true, 20);
    expect(calls.some(c => c[0] === 'translate')).toBe(false);
  });
  it('armed classification returns every eligible visible ID without the inspection tie policy', () => {
    const layers = [{ id: 'b', density: new Float64Array([.8, .5, 1e-9]) }, { id: 'a', density: new Float64Array([.2, .5, 1e-9]) }];
    const before = layers.map(l => l.density.slice());
    expect(actionCandidates(layers, 0)).toEqual(['b', 'a']); expect(actionCandidates(layers, 1)).toEqual(['b', 'a']);
    expect(pickCreature(layers, 0, 'a')).toBe('b');
    expect(actionCandidates(layers, 2)).toEqual([]); expect(actionCandidates(layers, -1)).toEqual([]);
    expect(actionCandidates(layers, .5)).toEqual([]); expect(actionCandidates(layers, 100)).toEqual([]);
    layers.forEach((l, i) => expect(l.density).toEqual(before[i]));
    expect(actionCandidates(layers.slice(1), 0)).toEqual(['a']);
  });
  it('computes the marginal threshold before any under-curve filtering', () => {
    const layers = [{ id: 'large-elsewhere', density: new Float64Array([.0001, 10]) }, { id: 'tiny-local', density: new Float64Array([.001, .001]) }];
    const plot = { y: 99.995, top: 0, baseline: 100, scale: 10 };
    // The tall layer misses here, but its visible peak still sets the 0.1 threshold.
    expect(actionCandidates(layers, 0, plot)).toEqual([]);
    expect(actionCandidates(layers.slice(1), 0, plot)).toEqual(['tiny-local']);
  });
  it('marginal actions require the actual curve and inclusive plotting viewport', () => {
    const layers = [{ id: 'a', density: new Float64Array([.5]) }, { id: 'b', density: new Float64Array([.25]) }];
    const plot = { y: 50, top: 0, baseline: 100, scale: 1 };
    expect(actionCandidates(layers, 0, plot)).toEqual(['a']);
    expect(actionCandidates(layers, 0, { ...plot, y: 75 })).toEqual(['a', 'b']);
    expect(actionCandidates(layers, 0, { ...plot, y: 49 })).toEqual([]);
    for (const y of [-1, 101, NaN]) expect(actionCandidates(layers, 0, { ...plot, y })).toEqual([]);
    expect(actionCandidates(layers, 0, { ...plot, scale: 0 })).toEqual([]);
  });
  it('uses the actual linear marginal segment, not the nearest taller sample', () => {
    const layers = [{ id: 'a', density: new Float64Array([.5, .1]) }], g = createPsiGrid2D({ nx: 2, ny: 1, xmin: 0, xmax: 3 });
    const plot = { top: 0, baseline: 100, scale: 1, samplePosition: 1.5 };
    expect(actionCandidates(layers, 0, { ...plot, y: 69 })).toEqual([]);
    expect(actionCandidates(layers, 0, { ...plot, y: 70 })).toEqual(['a']);
    expect(actionCandidates(layers, 0, { ...plot, y: 75, samplePosition: .5 })).toEqual(['a']);
    // At width=300: viewport left=52/right=272; height=200 gives top=30/baseline=130.
    const middle = 52 + (272 - 52) / 2;
    expect(projectedActionCandidates(layers, g, middle, 99, 300, 200, 1)).toEqual([]);
    expect(projectedActionCandidates(layers, g, middle, 100, 300, 200, 1)).toEqual(['a']);
    expect(projectedActionCandidates(layers, g, 51, 130, 300, 200, 1)).toEqual([]);
    expect(projectedActionCandidates(layers, g, 52, 130, 300, 200, 1)).toEqual([]);
    expect(projectedActionCandidates(layers, g, 272, 130, 300, 200, 1)).toEqual([]);
  });
  it('draws the selected F1 ink face and brackets without a head ellipse or circular ring', () => {
    const w = fixture(), density = new Float64Array(w.geometry.nx * w.geometry.ny); w.copyDensity('a', density);
    const { ctx, calls } = context(); createCreatureDecoration(w.geometry)(ctx, 600, 600, [{ id: 'a', density }], w.getSnapshot(), 'a', false, true, 0);
    expect(calls.some(c => c[0] === 'translate')).toBe(true);
    expect(calls.filter(c => c[0] === 'arc')).toHaveLength(0);
    const ellipses = calls.filter(c => c[0] === 'ellipse'); expect(ellipses).toHaveLength(6);
    // Cheeks, soft eyes and tiny catchlights only; no head-sized ellipse.
    expect(ellipses.every(c => Number(c[3]) <= 3.5 && Number(c[4]) <= 3)).toBe(true);
    expect(calls).toContainEqual(['moveTo', -18, -7]); expect(calls).toContainEqual(['lineTo', -10, -15]);
    expect(calls).toContainEqual(['fillText', 'Creature A ∞', 0, -23]); expect(ctx.fillStyle).toBe('#f9f4ff');
  });
  it('invalidates a still-qualifying old anchor immediately after a spatial commit marker', () => {
    const w = fixture(), snap = w.getSnapshot(), g = w.geometry, c = snap.creatures[0]!;
    const mean = (Math.round((c.y - g.ymin) / g.dy) - 1) * g.nx + Math.round((c.x - g.xmin) / g.dx) - 1;
    const density = new Float64Array(g.nx * g.ny); density[mean - 2] = 1;
    const decorate = createCreatureDecoration(g), { ctx, calls } = context(), layers = [{ id: 'a', density }];
    const x = () => calls.find(c => c[0] === 'translate')?.[1];
    decorate(ctx, 600, 600, layers, snap, 'a', false, true, 0); const oldX = x();
    density[mean - 2] = .3; density[mean + 4] = 2; calls.length = 0;
    decorate(ctx, 600, 600, layers, snap, 'a', false, true, 20); expect(x()).toBe(oldX);
    calls.length = 0;
    // Synthetic scalar metadata isolates the invalidation rule from changing means.
    decorate(ctx, 600, 600, layers, { ...snap, spatialMeasurementCount: snap.spatialMeasurementCount + 1 }, 'a', false, true, 21);
    expect(x()).not.toBe(oldX); expect(Number(x())).toBeGreaterThan(Number(oldX));
  });
  it('invalidates anchors on a changed world reference or explicit lifetime reset', () => {
    const w = fixture(), snap = w.getSnapshot(), g = w.geometry, density = new Float64Array(g.nx * g.ny);
    const oldIndex = 11 * g.nx + 12, newIndex = 11 * g.nx + 20; density[oldIndex] = 1;
    const decorate = createCreatureDecoration(g), { ctx, calls } = context(), layers = [{ id: 'a', density }];
    const x = () => calls.find(c => c[0] === 'translate')?.[1];
    decorate(ctx, 600, 600, layers, snap, 'a', false, true, 0, false, undefined, w); const oldX = x();
    density[oldIndex] = .3; density[newIndex] = 2; calls.length = 0;
    const replacement = fixture();
    decorate(ctx, 600, 600, layers, snap, 'a', false, true, 20, false, undefined, replacement); expect(x()).not.toBe(oldX);
    density[oldIndex] = 4; calls.length = 0; decorate.invalidate();
    decorate(ctx, 600, 600, layers, snap, 'a', false, true, 21, false, undefined, replacement); expect(x()).toBe(oldX);
  });
  it('connections follow registered ownership through measurement, release, reset and deletion', () => {
    const w = fixture(), initial = registeredConnections(w.getSnapshot()); expect(initial).toHaveLength(1);
    w.measureMood(initial[0]!.id, 'a', 'Z'); expect(registeredConnections(w.getSnapshot())).toEqual(initial);
    w.measureAndRelease(initial[0]!.id, 'Z'); expect(registeredConnections(w.getSnapshot())).toEqual([]);
    w.resetEvolution(); expect(registeredConnections(w.getSnapshot())).toEqual(initial);
    w.measureAndRelease(initial[0]!.id, 'Z');
    w.remove('b'); expect(registeredConnections(w.getSnapshot())).toEqual([]);
    w.resetEvolution(); expect(registeredConnections(w.getSnapshot())).toEqual([]);
  });
});
