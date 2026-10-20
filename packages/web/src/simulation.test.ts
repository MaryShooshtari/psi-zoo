import { describe, expect, it } from 'vitest';
import { energyExpectation, normSquared, positionExpectation, positionVariance } from '@psi-zoo/sim-core';
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
