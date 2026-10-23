import { describe, expect, it, vi } from 'vitest';
import { CrankNicolsonStepper, createGaussianBarrier, createPsiGrid, initializeGaussian, normalize, energyExpectation, normSquared, positionExpectation, positionVariance } from '@psi-zoo/sim-core';
import { SimulationPlayback, type FrameScheduler, type SimulationSnapshot } from './simulation';

function harness() {
  let id = 0;
  const pending = new Map<number, (now: number) => void>();
  const scheduler: FrameScheduler = {
    request: callback => { pending.set(++id, callback); return id; },
    cancel: key => { pending.delete(key); },
  };
  const published: SimulationSnapshot[] = [];
  const controller = new SimulationPlayback(scheduler, snapshot => published.push(snapshot));
  function frame(now: number) {
    const callbacks = [...pending.values()]; pending.clear();
    callbacks.forEach(callback => callback(now));
  }
  return { controller, pending, frame, scheduler, published };
}

describe('browser simulation playback', () => {
  it('initializes the validated Gaussian, exact endpoints, and diagnostics', () => {
    const { controller: c } = harness();
    expect(c.psi.count).toBe(401);
    expect(c.psi.dx).toBe(0.1);
    expect(c.psi.x0).toBe(-20);
    expect([c.psi.values[0], c.psi.values[1], c.psi.values.at(-2), c.psi.values.at(-1)]).toEqual([0, 0, 0, 0]);
    expect(Math.abs(normSquared(c.psi) - 1)).toBeLessThan(1e-14);
    expect(Math.abs(positionExpectation(c.psi) + 5)).toBeLessThan(1e-12);
    expect(Math.abs(Math.sqrt(positionVariance(c.psi)) - 1)).toBeLessThan(1e-12);
    expect(c.snapshot().playing).toBe(false);
    expect(c.snapshot().norm).toBe(normSquared(c.psi));
    expect(c.snapshot().energy).toBe(energyExpectation(c.psi, new Float64Array(401)).real);
  });
  it('plays the numerical solution to t=2 and reports its actual norm and energy', () => {
    const { controller: c, frame, published } = harness();
    const initial = c.psi.values.slice();
    c.play(); frame(0);
    for (let i = 1; i <= 200; i++) frame(i * 10);
    expect(c.snapshot().time).toBe(2);
    expect(published.at(-1)).toEqual(c.snapshot());
    expect(c.psi.values).not.toEqual(initial);
    expect(Math.abs(positionExpectation(c.psi) + 3.5033026415167634)).toBeLessThan(1e-10);
    expect(Math.abs(Math.sqrt(positionVariance(c.psi)) - 1.4113213829311015)).toBeLessThan(1e-10);
    expect(Math.abs(c.snapshot().norm - 1)).toBeLessThan(1e-12);
    expect(c.snapshot().norm).toBe(normSquared(c.psi));
    expect(c.snapshot().energy).toBe(energyExpectation(c.psi, new Float64Array(401)).real);
  });
  it('pauses without advancing and resumes without catching up paused wall time', () => {
    const { controller: c, frame, pending } = harness();
    c.play(); frame(0); frame(20); c.pause();
    const values = c.psi.values.slice(), time = c.snapshot().time;
    expect(pending.size).toBe(0); frame(1000);
    expect(c.psi.values).toEqual(values); expect(c.snapshot().time).toBe(time);
    c.play(); frame(2000); expect(c.snapshot().time).toBe(time);
    frame(2010); expect(c.snapshot().time).toBe(time + 0.01);
  });
  it('reset pauses and reconstructs the exact initial state', () => {
    const { controller: c, frame, pending } = harness();
    const values = c.psi.values.slice(), energy = c.snapshot().energy;
    c.play(); frame(0); frame(40); c.reset();
    expect(c.psi.values).toEqual(values);
    expect(c.snapshot()).toMatchObject({ time: 0, energy, playing: false, error: null });
    expect(pending.size).toBe(0);
  });
  it('has one loop, and dispose blocks stale callbacks (StrictMode-style cleanup)', () => {
    const { controller: c, scheduler, pending, frame } = harness();
    c.play(); c.play(); expect(pending.size).toBe(1);
    const stale = [...pending.values()][0]!;
    c.dispose(); expect(pending.size).toBe(0);
    const replacement = new SimulationPlayback(scheduler, () => {});
    replacement.play(); stale(100); expect(pending.size).toBe(1);
    frame(200); expect(c.snapshot().time).toBe(0);
    replacement.dispose(); expect(pending.size).toBe(0);
    c.play(); expect(pending.size).toBe(0);
  });
  it('gives identical fixed-step states at 30, 60 and 144 Hz', () => {
    const results = [30, 60, 144].map(hz => {
      const { controller: c, frame } = harness(); c.play(); frame(0);
      for (let i = 1; i <= hz * 2; i++) frame(i * 1000 / hz);
      c.pause(); return c;
    });
    results.forEach(c => {
      expect(c.snapshot().time).toBe(2);
      expect(c.psi.values).toEqual(results[0]!.psi.values);
    });
  });
  it('bounds work after a stall instead of blocking the UI with catch-up', () => {
    const { controller: c, frame } = harness(); c.play(); frame(0); frame(10000);
    expect(c.snapshot().time).toBe(0.08);
    frame(10010); expect(c.snapshot().time).toBe(0.09);
  });
  it('reports nonfinite state diagnostics and can reset after failure', () => {
    const { controller: c, frame, published, pending } = harness();
    c.psi.values[100] = NaN;
    c.play(); frame(0);
    expect(published.at(-1)?.error).toBeTruthy();
    expect(published.at(-1)?.playing).toBe(false);
    expect(c.snapshot().error).toBeTruthy();
    expect(pending.size).toBe(0);
    c.reset(); expect(c.snapshot().norm).toBeCloseTo(1, 12);
  });
  it('paints while paused without changing psi or time, and refreshes energy', () => {
    const { controller: c, published, pending } = harness();
    const values = c.psi.values.slice(), energy = c.snapshot().energy;
    c.stamp(-5, { amplitude: 1, sigma: 0.6 });
    expect(c.potential).toEqual(createGaussianBarrier(c.psi, { amplitude: 1, sigma: 0.6, center: -5 }));
    expect(c.psi.values).toEqual(values);
    expect(c.snapshot().time).toBe(0);
    expect(c.snapshot().energy).toBeGreaterThan(energy);
    expect(published.at(-1)).toEqual(c.snapshot());
    expect(pending.size).toBe(0);
    c.paint(-5, -2, { amplitude: 1, sigma: 0.6 });
    expect(c.potential[180]).toBe(1);
    expect(c.psi.values).toEqual(values);
  });
  it('passes the same terrain array to every solver step while playing', () => {
    const spy = vi.spyOn(CrankNicolsonStepper.prototype, 'step');
    try {
      const { controller: c, frame } = harness();
      const terrain = c.potential;
      c.play(); frame(0); frame(10);
      c.paint(-6, -3, { amplitude: 1, sigma: 0.6 });
      const energy = c.snapshot().energy;
      for (let i = 2; i <= 200; i++) frame(i * 10);
      expect(spy).toHaveBeenCalledTimes(200);
      for (const call of spy.mock.calls) expect(call[1]).toBe(terrain);
      expect(c.snapshot().playing).toBe(true);
      // Roundoff budget, not a continuum/scattering accuracy claim.
      expect(Math.abs(c.snapshot().norm - 1)).toBeLessThan(2e-12);
      expect(Math.abs(c.snapshot().energy - energy)).toBeLessThan(2e-12);
    } finally { spy.mockRestore(); }
  });
  it('reset preserves terrain, clear preserves array identity and does not reset psi/time', () => {
    const { controller: c, frame, published } = harness();
    const initial = c.psi.values.slice(), terrain = c.potential;
    c.stamp(-5, { amplitude: 2, sigma: 0.5 });
    const painted = terrain.slice();
    c.play(); frame(0); frame(20); c.reset();
    expect(c.psi.values).toEqual(initial);
    expect(c.snapshot()).toMatchObject({ time: 0, playing: false });
    expect(c.potential).toBe(terrain);
    expect(c.potential).toEqual(painted);
    c.play(); frame(50); frame(70);
    const values = c.psi.values.slice(), time = c.snapshot().time;
    c.clearTerrain();
    expect(c.potential).toBe(terrain);
    expect(terrain).toEqual(new Float64Array(401));
    expect(c.psi.values).toEqual(values);
    expect(c.snapshot()).toMatchObject({ time, playing: true });
    expect(published.at(-1)).toEqual(c.snapshot());
  });
  it('rejects invalid UI brush settings atomically and blocks edits after disposal', () => {
    const { controller: c, published } = harness();
    for (const brush of [
      { amplitude: NaN, sigma: 0.6 }, { amplitude: 6, sigma: 0.6 },
      { amplitude: -1, sigma: 0.6 }, { amplitude: 1, sigma: 0.01 },
      { amplitude: 1, sigma: Infinity }, { amplitude: 1, sigma: 3 },
    ]) expect(() => c.stamp(0, brush)).toThrow(RangeError);
    expect(() => c.paint(0, NaN, { amplitude: 1, sigma: 0.6 })).toThrow(RangeError);
    expect(c.potential.every(v => v === 0)).toBe(true);
    expect(published).toHaveLength(0);
    c.stamp(0, { amplitude: 1, sigma: 0.6 });
    const before = c.potential.slice(), count = published.length;
    c.dispose(); c.stamp(2, { amplitude: 1, sigma: 0.6 });
    c.paint(0, 2, { amplitude: 1, sigma: 0.6 }); c.clearTerrain();
    expect(c.potential).toEqual(before);
    expect(published).toHaveLength(count);
  });
  it.each([-1.5, -0.75, 0, 0.75, 1.5])('Reset uses selected p0=%s, preserves terrain, and keeps directed evolution conservative', p0 => {
    const { controller: c, frame, pending } = harness();
    const terrain = c.potential;
    c.stamp(1, { amplitude: 1, sigma: 0.6 });
    const painted = terrain.slice();
    c.play(); frame(0); frame(40);
    const beforeSelection = c.psi.values.slice(), time = c.snapshot().time;
    c.setInitialMomentum(p0);
    expect(c.initialMomentum).toBe(p0);
    expect(c.psi.values).toEqual(beforeSelection);
    expect(c.snapshot()).toMatchObject({ time, playing: true });
    const stale = [...pending.values()][0]!;
    c.reset();
    expect(c.snapshot()).toMatchObject({ time: 0, playing: false, error: null });
    expect(pending.size).toBe(0); stale(100); expect(pending.size).toBe(0);
    expect(c.potential).toBe(terrain); expect(terrain).toEqual(painted);
    const expected = createPsiGrid(401, 0.1, -20);
    initializeGaussian(expected, -5, 1, p0, false);
    expected.values[0] = expected.values[1] = expected.values[800] = expected.values[801] = 0;
    normalize(expected);
    expect(c.psi.values).toEqual(expected.values);
    const norm = c.snapshot().norm, energy = c.snapshot().energy;
    c.play(); frame(200);
    for (let i = 1; i <= 200; i++) frame(200 + i * 10);
    expect(Math.abs(c.snapshot().norm - norm)).toBeLessThan(2e-12);
    expect(Math.abs(c.snapshot().energy - energy)).toBeLessThan(2e-12 * Math.max(1, Math.abs(energy)));
    c.clearTerrain();
    expect(c.initialMomentum).toBe(p0);
    c.reset(); expect(c.psi.values).toEqual(expected.values);
    c.dispose();
  });
  it.each([-1.5, 0, 1.5])('moves the browser free packet in the selected direction p0=%s', p0 => {
    const { controller: c, frame } = harness();
    c.setInitialMomentum(p0); c.reset(); c.play(); frame(0);
    for (let i = 1; i <= 100; i++) frame(i * 10);
    const velocity = positionExpectation(c.psi) + 5; // t=1, initial mean=-5.
    const latticeVelocity = Math.exp(-(0.1 ** 2) / 8) * Math.sin(p0 * 0.1) / 0.1;
    expect(Math.abs(velocity - latticeVelocity)).toBeLessThan(2e-4);
    if (p0 === 0) expect(Math.abs(velocity)).toBeLessThan(1e-12);
    else expect(Math.sign(velocity)).toBe(Math.sign(p0));
    c.dispose();
  });
  it('validates momentum selection before mutation and ignores changes after disposal', () => {
    const { controller: c } = harness();
    expect(c.initialMomentum).toBe(0.75);
    const before = c.psi.values.slice();
    for (const p0 of [NaN, Infinity, -Infinity, -1.51, 1.51]) {
      expect(() => c.setInitialMomentum(p0)).toThrow(RangeError);
      expect(c.initialMomentum).toBe(0.75);
      expect(c.psi.values).toEqual(before);
    }
    c.setInitialMomentum(-0.75); c.dispose(); c.setInitialMomentum(1);
    c.reset(); expect(c.initialMomentum).toBe(-0.75);
    expect(c.psi.values).toEqual(before);
  });
  it('stops and reports numerical errors without scheduling further frames', () => {
    const { controller: c, frame, pending } = harness();
    c.psi.values[0] = 1;
    c.play(); frame(0); frame(10);
    expect(c.snapshot().playing).toBe(false);
    expect(c.snapshot().error).toMatch(/Dirichlet/);
    expect(pending.size).toBe(0);
    c.reset(); expect(c.snapshot().error).toBe(null);
  });
});
