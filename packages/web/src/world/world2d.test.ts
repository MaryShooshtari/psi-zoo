import { describe, expect, it } from 'vitest';
import { createPsiGrid2D, CayleyStepper2D, gaussianWell2D, blochVector, type PsiGrid2D } from '@psi-zoo/sim-core';
import { QuantumWorld2D, initialCreature2D, type WorldOptions2D } from './world2d';
import { createWorldPreset2D, type WorldPreset2D } from './worldPresets2d';
import { SimulationPlayback2D } from '../simulation2d';
const geometry = (nx = 32, ny = 27) => createPsiGrid2D({ nx, ny });
function world(preset: WorldPreset2D = 'mood', g = geometry()) { return new QuantumWorld2D(g, createWorldPreset2D(g, preset)); }
function difference(g: PsiGrid2D, a: Float64Array, b: Float64Array) { let sum = 0; for (let k = 0; k < a.length; k++) sum += (a[k]! - b[k]!) ** 2; return Math.sqrt(sum * g.dx * g.dy); }
function advance(w: QuantumWorld2D, v: Float64Array, dt: number, count: number) { for (let k = 0; k < count; k++) w.step(v, dt); }

describe('owned synchronous independent 2D creatures', () => {
  it('matches the existing single-wavefunction core and playback exactly when interactions are disabled', () => {
    const g = geometry(), options = createWorldPreset2D(g, 'independent'), initial = options.creatures[0]!, w = new QuantumWorld2D(g, options);
    const reference = { ...initial.psi, values: initial.psi.values.slice() }, s = new CayleyStepper2D(g), v = gaussianWell2D(g, 2, 0.5, -0.3, 2);
    for (let k = 0; k < 100; k++) { w.step(v, 1 / 120); s.step(reference, v, 1 / 120); }
    expect(w.state('a').psi.values).toEqual(reference.values);
    // Same initial Gaussian as the existing default single-Gaussian playback.
    const single = new SimulationPlayback2D({ request: () => 0, cancel: () => {} }, () => {}, { grid: g });
    const c = initialCreature2D(g, 'single', {}, 0, initial.parameters), one = new QuantumWorld2D(g, { ...options, creatures: [c] });
    const solver = new CayleyStepper2D(g), zero = new Float64Array(g.nx * g.ny);
    for (let k = 0; k < 80; k++) { one.step(zero, 1 / 120); solver.step(single.psi, zero, 1 / 120); }
    expect(one.state('single').psi.values).toEqual(single.psi.values);
  });
  it('owns separate normalized buffers and rejects duplicates, nonunit states, bad moods and incompatible domains', () => {
    const g = geometry(), options = createWorldPreset2D(g, 'mood'), w = new QuantumWorld2D(g, options), before = w.state('a');
    options.creatures[0]!.psi.values.fill(0); options.creatures[0]!.mood.values.fill(0); expect(w.state('a').psi.values).toEqual(before.psi.values);
    const copy = w.state('a'); copy.psi.values.fill(0); copy.mood.values.fill(0); expect(w.state('a').psi.values).toEqual(before.psi.values); expect(w.state('b').psi.values).not.toEqual(before.psi.values);
    expect(() => w.add(before)).toThrow(/unique/);
    for (const changed of [{ xmin: -9 }, { nx: g.nx + 1 }, { dy: g.dy / 2 }]) expect(() => w.add({ ...before, id: 'bad', psi: { ...before.psi, ...changed } })).toThrow(/geometry/);
    expect(() => w.add({ ...before, id: 'bad', mood: { values: new Float64Array(4) } })).toThrow(/norm/);
    expect(() => w.add({ ...before, id: 'bad', psi: { ...before.psi, values: new Float64Array(before.psi.values.length) } })).toThrow(/norm/);
    expect(() => w.step(new Float64Array(g.nx * g.ny), NaN)).toThrow();
  });
  it('zero drive strength removes only the potential bias, not unitary mood evolution', () => {
    const g = geometry(), options = createWorldPreset2D(g, 'mood'), zero = new Float64Array(g.nx * g.ny);
    const off = new QuantumWorld2D(g, { ...options, creatures: options.creatures.map(c => ({ ...c, parameters: { ...c.parameters, driveStrength: 0 } })) });
    const on = new QuantumWorld2D(g, options); advance(off, zero, 0.01, 100); advance(on, zero, 0.01, 100);
    expect(difference(g, off.state('a').psi.values, on.state('a').psi.values)).toBeGreaterThan(0.02);
    expect(off.state('a').mood.values).toEqual(on.state('a').mood.values);
    expect(off.getSnapshot().creatures[0]!.x).toBeCloseTo(-1.5, 10);
    expect(on.getSnapshot().creatures[0]!.x).toBeGreaterThan(off.getSnapshot().creatures[0]!.x + 0.05);
  });
  it('failed world steps do not partially commit members or time; zero step is a state no-op', () => {
    const g = geometry(), options = createWorldPreset2D(g, 'mood');
    const extreme: WorldOptions2D = { ...options, creatures: options.creatures.map(c => ({ ...c, parameters: { ...c.parameters, moodFrequency: Number.MAX_VALUE } })) };
    const w = new QuantumWorld2D(g, extreme), before = w.ids.map(id => w.state(id)), v = new Float64Array(g.nx * g.ny);
    w.step(v, 0); expect(w.time).toBe(0); expect(() => w.step(v, 10)).toThrow(/phase/);
    for (const c of before) { expect(w.state(c.id).psi.values).toEqual(c.psi.values); expect(w.state(c.id).mood.values).toEqual(c.mood.values); } expect(w.time).toBe(0);
    v[3] = NaN; expect(() => w.step(v, 0.01)).toThrow(/finite/); expect(w.time).toBe(0);
  });
  it('preserves each norm, mood norm and Bloch radius for 1,000 coupled steps', () => {
    const g = geometry(), w = world('mood', g); w.addTemplate(); w.setInteractions({ social: true });
    const v = gaussianWell2D(g, 2, 0, 0, 2); let spatial = 0, mood = 0;
    for (let k = 0; k < 1000; k++) {
      w.step(v, 1 / 120);
      if (k % 10 === 0 || k === 999) for (const c of w.getSnapshot().creatures) {
        spatial = Math.max(spatial, Math.abs(c.norm - 1)); mood = Math.max(mood, Math.abs(c.moodNorm - 1), Math.abs(Math.hypot(c.bloch.x, c.bloch.y, c.bloch.z) - 1));
      }
    }
    console.log('5C 3-creature 1000-step max norm drift', { spatial, mood }); expect(spatial).toBeLessThan(1e-10); expect(mood).toBeLessThan(1e-10);
  });
  it('stable ID ordering is independent of initial storage order for a three-creature coupled world', () => {
    const g = geometry(), options = createWorldPreset2D(g, 'mood');
    const extra = initialCreature2D(g, 'c', { x0: 0, y0: 2, px: -0.2 }, 0, options.creatures[0]!.parameters);
    const all = [...options.creatures, extra], settings = { ...options.interactions, social: true };
    const a = new QuantumWorld2D(g, { creatures: all, interactions: settings }), b = new QuantumWorld2D(g, { creatures: [...all].reverse(), interactions: settings });
    const v = new Float64Array(g.nx * g.ny); advance(a, v, 0.01, 100); advance(b, v, 0.01, 100);
    let max = 0;
    for (const id of a.ids) { const sa = a.state(id), sb = b.state(id); max = Math.max(max, difference(g, sa.psi.values, sb.psi.values)); expect(sa.mood.values).toEqual(sb.mood.values); expect(a.effectivePotential(id, v)).toEqual(b.effectivePotential(id, v)); }
    console.log('5C reordered-world complex-state error', max); expect(max).toBe(0);
  });
  it('alone and uncoupled pair agree, social partner changes evolution; removal removes its potential', () => {
    const g = geometry(), options = createWorldPreset2D(g, 'attraction'), zero = new Float64Array(g.nx * g.ny);
    const alone = new QuantumWorld2D(g, { ...options, creatures: [options.creatures[0]!] }), pair = new QuantumWorld2D(g, options), coupled = new QuantumWorld2D(g, options);
    pair.setInteractions({ strength: 0 }); advance(alone, zero, 0.01, 80); advance(pair, zero, 0.01, 80); advance(coupled, zero, 0.01, 80);
    expect(alone.state('a').psi.values).toEqual(pair.state('a').psi.values);
    expect(difference(g, coupled.state('a').psi.values, pair.state('a').psi.values)).toBeGreaterThan(0.05);
    const before = coupled.state('a'); coupled.remove('b'); expect(coupled.state('a').psi.values).toEqual(before.psi.values); expect(coupled.effectivePotential('a', zero).every(x => x === 0)).toBe(true);
  });
  it('add/remove/selection preserve existing states; current-roster reset restores saved initial states/moods', () => {
    const g = geometry(), w = world('mood', g), v = new Float64Array(g.nx * g.ny), initial = w.state('a'); advance(w, v, 0.01, 20);
    const before = w.state('a'), time = w.time; expect(w.addTemplate()).toBe('c'); expect(w.state('a').psi.values).toEqual(before.psi.values); expect(w.time).toBe(time);
    w.addTemplate(); expect(w.ids).toHaveLength(4); expect(() => w.addTemplate()).toThrow(/limit/);
    w.select('b'); w.remove('c'); expect(w.getSnapshot().selected).toBe('b'); w.remove('b'); expect(w.getSnapshot().selected).toBe('a');
    expect(w.state('a').psi.values).toEqual(before.psi.values); expect(w.state('a').mood.values).toEqual(before.mood.values);
    w.resetEvolution(); expect(w.time).toBe(0); expect(w.state('a').psi.values).toEqual(initial.psi.values); expect(w.state('a').mood.values).toEqual(initial.mood.values);
    w.remove('d'); expect(() => w.remove('a')).toThrow(/remain/);
  });
  it('all world presets reset deterministically without mutating supplied configurations', () => {
    const g = geometry(), v = new Float64Array(g.nx * g.ny);
    for (const preset of ['independent', 'mood', 'attraction', 'repulsion'] as const) {
      const a = world(preset, g), b = world(preset, g); advance(a, v, 0.01, 10); a.resetEvolution();
      for (const id of a.ids) { expect(a.state(id).psi.values).toEqual(b.state(id).psi.values); expect(a.state(id).mood.values).toEqual(b.state(id).mood.values); }
    }
  });
  it('terrain edits and clear preserve every full state/mood/time; next step uses new terrain for all', () => {
    const g = geometry(); let callback: ((now: number) => void) | undefined;
    const c = new SimulationPlayback2D({ request: cb => { callback = cb; return 1; }, cancel: () => { callback = undefined; } }, () => {}, { grid: g, worldPreset: 'mood' });
    const w = c.world!, reference = world('mood', g); c.play(); callback?.(0); callback?.(25); const time = w.time;
    advance(reference, new Float64Array(g.nx * g.ny), 1 / 120, 3);
    const states = w.ids.map(id => w.state(id)); c.stamp(0, 0, { tool: 'barrier', sigma: 3, amplitude: 4 });
    for (const state of states) { expect(w.state(state.id).psi.values).toEqual(state.psi.values); expect(w.state(state.id).mood.values).toEqual(state.mood.values); }
    expect(w.time).toBe(time); expect(c.snapshot().playing).toBe(true); callback?.(50);
    advance(reference, new Float64Array(g.nx * g.ny), 1 / 120, 3);
    for (const id of w.ids) expect(difference(g, w.state(id).psi.values, reference.state(id).psi.values)).toBeGreaterThan(0.001);
    const after = w.ids.map(id => w.state(id)), later = w.time; c.clearTerrain();
    for (const state of after) { expect(w.state(state.id).psi.values).toEqual(state.psi.values); expect(w.state(state.id).mood.values).toEqual(state.mood.values); }
    expect(w.time).toBe(later); c.stamp(0, 0, { tool: 'well', sigma: 2, amplitude: 2 }); const terrain = c.potential;
    c.reset(); expect(w.time).toBe(0); expect(c.potential).toEqual(terrain);
    c.loadWorldPreset('repulsion'); expect(c.world!.time).toBe(0); expect(c.potential).toEqual(terrain);
    expect(() => c.loadPreset('barrier')).toThrow(/single-Gaussian/); c.dispose();
  });
});

describe('behavioral and numerical evidence, not scripted movement', () => {
  it('default-grid mood/attraction/repulsion examples differ from the identical free reference before wall returns', () => {
    const g = createPsiGrid2D(), v = new Float64Array(g.nx * g.ny), results: Record<string, ReturnType<QuantumWorld2D['getSnapshot']>> = {};
    for (const preset of ['independent', 'mood', 'attraction', 'repulsion'] as const) { const w = world(preset, g); advance(w, v, 1 / 120, 240); results[preset] = w.getSnapshot(); }
    console.log('5C default 128x128, dt=1/120, t=2 centroids', Object.fromEntries(Object.entries(results).map(([name, s]) => [name, s.creatures.map(c => ({ id: c.id, x: c.x, y: c.y, norm: c.norm }))])));
    const freeA = results.independent!.creatures[0]!, mood = results.mood!.creatures, attract = results.attraction!.creatures, repel = results.repulsion!.creatures;
    expect(mood[0]!.x - freeA.x).toBeGreaterThan(0.15); expect(mood[1]!.y).toBeLessThan(-0.15);
    expect(attract[0]!.x - freeA.x).toBeGreaterThan(0.15); expect(repel[0]!.x - freeA.x).toBeLessThan(-0.15);
    for (const s of Object.values(results)) for (const c of s.creatures) expect(Math.abs(c.norm - 1)).toBeLessThan(1e-10);
  }, 30000);
  it('characterizes FIRST-order coupled full-state convergence, mood matches the exact precession', () => {
    const g = geometry(), v = gaussianWell2D(g, 1, 0.2, -0.1, 2);
    const run = (dt: number) => { const w = world('mood', g); w.setInteractions({ social: true, strength: 2 }); advance(w, v, dt, Math.round(1 / dt)); return w; };
    const ref = run(1 / 1600), runs = [run(0.04), run(0.02), run(0.01)];
    const errors = runs.map(w => Math.hypot(...w.ids.map(id => difference(g, w.state(id).psi.values, ref.state(id).psi.values))));
    const moodErrors = runs.map(w => Math.max(...w.ids.map(id => { const a = blochVector(w.state(id).mood), b = blochVector(ref.state(id).mood); return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); })));
    const ratios = [errors[0]! / errors[1]!, errors[1]! / errors[2]!]; console.log('5C coupled dt=.04,.02,.01 ref=1/1600 t=1', { errors, ratios, moodErrors });
    for (const ratio of ratios) { expect(ratio).toBeGreaterThan(1.7); expect(ratio).toBeLessThan(2.3); } for (const e of moodErrors) expect(e).toBeLessThan(1e-11);
  }, 30000);
});
