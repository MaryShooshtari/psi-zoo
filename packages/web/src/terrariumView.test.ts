import { afterEach, expect, it, vi } from 'vitest';
import { createPsiGrid2D, gaussianWell2D, projectDensityX } from '@psi-zoo/sim-core';
import { TerrariumViewTransition, MIRROR_DURATION_MS } from './terrariumView';
import { QuantumWorld2D } from './world/world2d';
import { createWorldPreset2D } from './world/worldPresets2d';

afterEach(() => vi.useRealTimers());
it('reverses a single bounded presentation transition without stale timer completion', () => {
  vi.useFakeTimers();
  const changed = vi.fn(), view = new TerrariumViewTransition('2d', changed);
  view.setMode('1d', false); expect(view.transitioning).toBe(true);
  vi.advanceTimersByTime(250); view.setMode('2d', false);
  vi.advanceTimersByTime(200); expect(view.transitioning).toBe(true); expect(view.mode).toBe('2d');
  vi.advanceTimersByTime(250); expect(view.transitioning).toBe(false); expect(vi.getTimerCount()).toBe(0);
  for (let i = 0; i < 21; i++) view.setMode(i % 2 ? '2d' : '1d', false);
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(MIRROR_DURATION_MS); expect(view.mode).toBe('1d'); expect(view.transitioning).toBe(false);
  view.setMode('2d', false); view.dispose();
  const count = changed.mock.calls.length; vi.runAllTimers(); view.setMode('1d', false);
  expect(changed).toHaveBeenCalledTimes(count); expect(vi.getTimerCount()).toBe(0);
});
it('reduced motion switches immediately and can stop an in-flight tilt', () => {
  vi.useFakeTimers(); const view = new TerrariumViewTransition('2d', () => {});
  view.setMode('1d', true); expect(view.mode).toBe('1d'); expect(view.transitioning).toBe(false); expect(vi.getTimerCount()).toBe(0);
  view.setMode('2d', false); expect(view.transitioning).toBe(true);
  view.finish(); expect(view.transitioning).toBe(false); expect(vi.getTimerCount()).toBe(0);
});
for (const preset of ['mood', 'bell'] as const) it(`${preset}: paused switching preserves every complex value, mood, terrain, time, ownership and RNG sequence`, () => {
  vi.useFakeTimers();
  const g = createPsiGrid2D({ nx: 31, ny: 23 }), terrain = gaussianWell2D(g, 2, .2, -.1, 2);
  const world = new QuantumWorld2D(g, createWorldPreset2D(g, preset));
  const reference = new QuantumWorld2D(g, createWorldPreset2D(g, preset));
  for (let i = 0; i < 15; i++) { world.step(terrain, 1 / 120); reference.step(terrain, 1 / 120); }
  const before = world.ids.map(id => world.spatialState(id).values), snapshot = world.getSnapshot(), v = terrain.slice();
  const output = new Float64Array(g.nx);
  const view = new TerrariumViewTransition('2d', () => {
    for (const id of world.ids) world.copyProjectedDensityX(id, output);
  });
  for (let i = 0; i < 20; i++) { view.setMode(i % 2 ? '2d' : '1d', false); vi.advanceTimersByTime(75); }
  vi.runAllTimers();
  expect(world.ids.map(id => world.spatialState(id).values)).toEqual(before);
  expect(world.getSnapshot()).toEqual(snapshot); expect(terrain).toEqual(v);
  for (const id of world.ids) {
    world.copyProjectedDensityX(id, output);
    expect(output).toEqual(projectDensityX(world.spatialState(id)));
  }
  // Compare several stochastic outcomes, not only snapshots (which cannot reveal
  // a hidden consumed RNG sample). Preparations do not consume randomness.
  if (preset !== 'bell') for (const w of [world, reference]) w.prepareBellPair('p', 'a', 'b');
  for (let k = 0; k < 8; k++) {
    const pair = preset === 'bell' && k === 0 ? 'friendship' : 'p';
    expect(world.measureMood(pair, 'a', k % 2 ? 'X' : 'Z')).toEqual(reference.measureMood(pair, 'a', k % 2 ? 'X' : 'Z'));
    for (const w of [world, reference]) { w.measureAndRelease(pair, 'Z'); w.prepareBellPair('p', 'a', 'b'); }
  }
});
it('playing: presentation callbacks read latest committed data without extra or skipped evolution', () => {
  vi.useFakeTimers(); const g = createPsiGrid2D({ nx: 27, ny: 19 }), terrain = new Float64Array(g.nx * g.ny);
  const a = new QuantumWorld2D(g, createWorldPreset2D(g, 'mood')), b = new QuantumWorld2D(g, createWorldPreset2D(g, 'mood'));
  a.setInteractions({ social: true }); b.setInteractions({ social: true });
  const output = new Float64Array(g.nx); let lastDrawnTime = -1;
  const view = new TerrariumViewTransition('2d', () => { a.copyProjectedDensityX('a', output); lastDrawnTime = a.time; });
  view.setMode('1d', false);
  for (let k = 0; k < 70; k++) { a.step(terrain, 1 / 120); b.step(terrain, 1 / 120); vi.advanceTimersByTime(8); }
  view.setMode('2d', true); view.setMode('1d', true);
  expect(lastDrawnTime).toBe(a.time); expect(output).toEqual(projectDensityX(a.spatialState('a')));
  expect(a.getSnapshot()).toEqual(b.getSnapshot());
  for (const id of a.ids) expect(a.spatialState(id).values).toEqual(b.spatialState(id).values);
});
