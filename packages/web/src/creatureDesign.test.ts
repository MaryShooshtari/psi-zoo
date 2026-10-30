import { describe, expect, it } from 'vitest';
import { createPsiGrid2D } from '@psi-zoo/sim-core';
import { creatureColor2D, creatureLabel, creatureName, simpleMood } from './creatureIdentity';
import { blinkClosed, createCreatureDecoration, faceAnchor, pickCreature, registeredConnections } from './render/creatureDecoration';
import { QuantumWorld2D } from './world/world2d';
import { createWorldPreset2D } from './world/worldPresets2d';
function fixture() { const g = createPsiGrid2D({ nx: 32, ny: 24, xmin: -10, xmax: 10, ymin: -10, ymax: 10 }); return new QuantumWorld2D(g, createWorldPreset2D(g, 'bell')); }
function context() {
  const calls: unknown[][] = [];
  const ctx = new Proxy({} as CanvasRenderingContext2D, { get(target, key) { if (key in target) return Reflect.get(target, key); return (...args: unknown[]) => calls.push([key, ...args]); } });
  return { ctx, calls };
}
describe('deterministic creature presentation', () => {
  it('keeps four stable names, colors and IDs independent of ordering/reset/selection', () => {
    expect(['a', 'b', 'c', 'd'].map(creatureName)).toEqual(['Mochi', 'Pip', 'Lumi', 'Nori']);
    expect(new Set(['a', 'b', 'c', 'd'].map(id => creatureColor2D(id).join(','))).size).toBe(4);
    const w = fixture(), identities = w.ids.map(id => [creatureLabel(id), creatureColor2D(id)]);
    w.select('b'); w.resetEvolution();
    expect(w.ids.map(id => [creatureLabel(id), creatureColor2D(id)])).toEqual(identities);
    expect(creatureName('extra-1')).toBe(creatureName('extra-1'));
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
