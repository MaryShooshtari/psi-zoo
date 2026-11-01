import { expect, it } from 'vitest';
import { SimulationPlayback2D, type Snapshot2D } from './simulation2d';
import { createPsiGrid2D } from '@psi-zoo/sim-core';
import { densityBrightness2D, densityViewport2D, fillDensityPixels2D } from './render/density2d';
import { QuantumWorld2D } from './world/world2d';
import { createWorldPreset2D } from './world/worldPresets2d';

function harness() {
  let id = 0; const pending = new Map<number, (now: number) => void>(), frames: Snapshot2D[] = [];
  const controller = new SimulationPlayback2D({ request: cb => { pending.set(++id, cb); return id; }, cancel: key => { pending.delete(key); } }, s => frames.push(s), { grid: { nx: 20, ny: 17 } });
  const tick = (now: number) => { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(cb => cb(now)); };
  return { controller, pending, frames, tick };
}
it('fixed timestep is independent of frame rate, stalls capped, pause/reset/dispose cancel frames', () => {
  const a = harness(), b = harness(), initial = a.controller.psi.values.slice();
  a.controller.play(); b.controller.play(); a.tick(0); b.tick(0);
  for (let k = 1; k <= 60; k++) a.tick(k * 1000 / 60);
  for (let k = 1; k <= 30; k++) b.tick(k * 1000 / 30);
  expect(a.controller.snapshot().time).toBe(1); expect(a.controller.psi.values).toEqual(b.controller.psi.values);
  const time = a.controller.snapshot().time; a.tick(10000); expect(a.controller.snapshot().time - time).toBeCloseTo(8 / 120, 14);
  const stale = [...a.pending.values()][0]!; a.controller.pause(); expect(a.pending.size).toBe(0); stale(20000); expect(a.pending.size).toBe(0);
  a.controller.reset(); expect(a.controller.snapshot().time).toBe(0); expect(a.controller.psi.values).toEqual(initial);
  a.controller.play(); a.controller.dispose(); expect(a.pending.size).toBe(0); a.controller.play(); expect(a.pending.size).toBe(0);
  b.controller.dispose();
});
it('invalid input and numerical failures stop playback with a recoverable error', () => {
  expect(() => new SimulationPlayback2D({ request: () => 0, cancel: () => {} }, () => {}, { dt: NaN })).toThrow();
  const h = harness(); h.controller.play(); h.tick(0); h.controller.psi.values[0] = NaN; h.tick(20);
  expect(h.controller.snapshot().error).toMatch(/finite/); expect(h.pending.size).toBe(0);
  h.controller.reset(); expect(h.controller.snapshot().error).toBeNull(); expect(h.controller.snapshot().norm).toBeCloseTo(1, 13);
});
for (const playing of [false, true]) for (const rejected of [false, true]) {
  it(`world spatial command preserves scheduler identity and half-step remainder; playing=${playing}, rejected=${rejected}`, () => {
    let requests = 0, cancels = 0;
    const pending = new Map<number, (now: number) => void>();
    const c = new SimulationPlayback2D({ request: cb => { pending.set(++requests, cb); return requests; }, cancel: id => { cancels++; pending.delete(id); } }, () => {}, { grid: { nx: 20, ny: 17 }, worldPreset: 'mood' });
    const tick = (now: number) => { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(cb => cb(now)); };
    const w = c.world!, originalControllerState = c.psi.values.slice();
    const reference = new QuantumWorld2D(c.psi, createWorldPreset2D(c.psi, 'mood'));
    c.stamp(0, 0, { tool: 'well', sigma: 2, amplitude: 1 });
    const terrain = c.potential, revision = c.terrainRevision;
    if (playing) { c.play(); tick(0); tick(1000 / 240); }
    const callbacks = [...pending.entries()], requested = requests, cancelled = cancels;
    const result = w.measureSpatial('a', 'xy', rejected ? 0 : 0.4);
    expect(result.status).toBe(rejected ? 'rejected' : 'committed');
    if (!rejected) reference.measureSpatial('a', 'xy', 0.4);
    expect(c.world).toBe(w); expect(c.psi.values).toEqual(originalControllerState);
    expect([...pending.entries()]).toEqual(callbacks); expect(requests).toBe(requested); expect(cancels).toBe(cancelled);
    if (playing) expect([...pending.values()][0]).toBe(callbacks[0]![1]);
    expect(c.potential).toEqual(terrain); expect(c.terrainRevision).toBe(revision);
    expect(c.snapshot()).toMatchObject({ time: 0, playing, error: null });
    if (!playing) { c.play(); tick(0); tick(1000 / 240); expect(w.time).toBe(0); }
    // The second half-step must advance exactly once: a hidden pause/play or
    // timing-reference reset would leave time at zero here.
    tick(1000 / 120); reference.step(terrain, c.dt);
    expect(w.time).toBe(c.dt); expect(requests).toBe((playing ? requested : requested + 3) + 1);
    for (const id of w.ids) {
      expect(w.spatialState(id).values).toEqual(reference.spatialState(id).values);
      expect(w.state(id).mood).toEqual(reference.state(id).mood);
    }
    expect(c.snapshot()).toMatchObject({ playing: true, error: null });
    c.dispose();
  });
}

it('heatmap is fixed, finite, oriented low-y down, aspect preserving and nonmutating', () => {
  const g = createPsiGrid2D({ nx: 2, ny: 3, xmin: -4, xmax: 4, ymin: -2, ymax: 2 });
  g.values[0] = 1; const original = g.values.slice(), pixels = new Uint8ClampedArray(24);
  fillDensityPixels2D(g, pixels); expect(g.values).toEqual(original);
  expect(pixels[0]).toBe(8); expect(pixels[16]).toBeGreaterThan(190); expect(pixels[19]).toBe(255);
  expect(densityBrightness2D(0)).toBe(0); expect(densityBrightness2D(0.08)).toBeCloseTo(Math.sqrt(.08 / .092), 15);
  // Fixed, monotone tail visibility, with exact zero and no probability floor.
  expect(densityBrightness2D(.0001)).toBeGreaterThan(.09);
  expect(densityBrightness2D(.001)).toBeLessThan(densityBrightness2D(.01));
  expect(densityBrightness2D(1)).toBeLessThan(1);
  for (const v of [NaN, Infinity, -1]) expect(() => densityBrightness2D(v)).toThrow();
  const viewport = densityViewport2D(g, 600, 600); expect(viewport).toEqual({ x: 0, y: 150, width: 600, height: 300 });
});
