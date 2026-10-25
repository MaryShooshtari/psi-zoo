import { describe, expect, it, vi } from 'vitest';
import { CrankNicolsonStepper, createGaussianBarrier, createPsiGrid, initializeGaussian, normalize, energyExpectation, normSquared, positionExpectation, positionVariance, probabilityRegions, createScatteringExperiment, runScatteringExperiment } from '@psi-zoo/sim-core';
import { SimulationPlayback, type FrameScheduler, type SimulationSnapshot } from './simulation';

function harness(seed?: number) {
  let id = 0;
  const pending = new Map<number, (now: number) => void>();
  const scheduler: FrameScheduler = {
    request: callback => { pending.set(++id, callback); return id; },
    cancel: key => { pending.delete(key); },
  };
  const published: SimulationSnapshot[] = [];
  const controller = new SimulationPlayback(scheduler, snapshot => published.push(snapshot), seed);
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
  it('loads the reproducible demo paused, with matching state/terrain and reset/clear semantics', () => {
    const { controller: c, frame, pending } = harness();
    c.play(); frame(0); frame(10);
    const stale = [...pending.values()][0]!;
    c.loadScatteringDemo(); stale(100);
    const expected = createScatteringExperiment();
    expect(c.psi.values).toEqual(expected.psi.values);
    expect(c.potential).toEqual(expected.potential);
    expect(c.initialMomentum).toBe(1.5);
    expect(c.snapshot()).toMatchObject({ mode: 'scattering', time: 0, playing: false, scatteringStatus: 'provisional', reflection: null, transmission: null });
    expect(c.snapshot().regions!.left).toBeGreaterThan(0.9999999999);
    expect(pending.size).toBe(0);
    const terrain = c.potential;
    c.reset(); expect(c.potential).toBe(terrain); expect(c.psi.values).toEqual(expected.psi.values);
    c.clearTerrain(); expect(c.potential).toBe(terrain);
    expect(c.potential.every(x => x === 0)).toBe(true);
    expect(c.snapshot().scatteringStatus).toBe('modified');
    c.reset(); expect(c.snapshot().scatteringStatus).toBe('modified');
    c.loadFreeExploration();
    expect(c.psi.count).toBe(401); expect(c.psi.x0).toBe(-20);
    expect(c.initialMomentum).toBe(0.75);
    expect(c.snapshot()).toMatchObject({ mode: 'exploration', time: 0, playing: false, reflection: null });
    c.dispose(); c.loadScatteringDemo(); expect(c.psi.count).toBe(401);
  });
  it('publishes actual regions but R/T only in the unchanged separated-packet window', () => {
    const { controller: c, frame } = harness();
    c.loadScatteringDemo(); c.play(); frame(0);
    for (let i = 1; i <= 999; i++) frame(i * 40);
    expect(c.snapshot().time).toBe(39.96);
    expect(c.snapshot().scatteringStatus).toBe('provisional');
    frame(40000);
    expect(c.snapshot().scatteringStatus).toBe('separated');
    for (let i = 1001; i <= 1100; i++) frame(i * 40);
    const s = c.snapshot(), p = probabilityRegions(c.psi, -4, 4);
    expect(s.regions).toEqual(p);
    expect(Math.abs(p.total - s.norm)).toBeLessThan(5e-14);
    expect(s.reflection!).toBeGreaterThan(0.79); expect(s.reflection!).toBeLessThan(0.81);
    expect(s.transmission!).toBeGreaterThan(0.19); expect(s.transmission!).toBeLessThan(0.21);
    expect(s.regions!.interaction).toBeLessThan(1e-5);
    expect(c.psi.values).toEqual(runScatteringExperiment().psi.values);
    // The time gate alone is insufficient: residual interaction/wall mass must
    // also withhold R/T. Manufacture states only to exercise these safety guards.
    const actual = c.psi.values.slice();
    c.psi.values.fill(0); c.psi.values[2400] = 1 / Math.sqrt(c.psi.dx);
    expect(c.snapshot().scatteringStatus).toBe('provisional');
    c.psi.values.fill(0); c.psi.values[4780] = 1 / Math.sqrt(c.psi.dx);
    expect(c.snapshot().transmission).toBeNull();
    c.psi.values.set(actual);
    // A pending selection does not invalidate the actual currently evolving run.
    c.setInitialMomentum(0.75); expect(c.snapshot().scatteringStatus).toBe('separated');
    frame(44020); expect(c.snapshot().scatteringStatus).toBe('outside-window');
    expect(c.snapshot().transmission).toBeNull();
    c.reset(); expect(c.snapshot().scatteringStatus).toBe('modified');
    c.dispose();
  }, 30000);
  it('invalidates quantitative interpretation after painting, even after reset', () => {
    const { controller: c } = harness();
    c.loadScatteringDemo(); const before = c.psi.values.slice();
    c.paint(-2, 2, { amplitude: 2, sigma: 0.6 });
    expect(c.psi.values).toEqual(before);
    expect(c.snapshot().scatteringStatus).toBe('modified');
    c.reset(); expect(c.snapshot().scatteringStatus).toBe('modified');
    c.loadScatteringDemo(); expect(c.snapshot().scatteringStatus).toBe('provisional');
    c.stamp(5, { amplitude: 1, sigma: 0.6 });
    expect(c.snapshot().transmission).toBeNull();
    c.dispose();
  });
  it('observes paused without altering time or terrain, publishes once and replaces only the state', () => {
    const { controller: c, published, pending } = harness();
    c.stamp(-5, { amplitude: 2, sigma: 0.6 });
    const terrain = c.potential, values = terrain.slice(), state = c.psi;
    const before = published.length;
    c.observe();
    const s = c.snapshot();
    expect(c.psi).not.toBe(state);
    expect(c.potential).toBe(terrain); expect(terrain).toEqual(values);
    expect(s).toMatchObject({ time: 0, playing: false, measurementCount: 1, energyDrift: 0 });
    expect(s.observation).toMatchObject({ time: 0, resolution: 0.4 });
    expect(s.observation!.position).toBe(c.psi.x0 + s.observation!.index * c.psi.dx);
    expect(s.energyReference).toBe(s.energy);
    expect(s.energy).toBe(energyExpectation(c.psi, terrain).real);
    expect(s.norm).toBeCloseTo(1, 14);
    expect(published.length - before).toBe(1);
    expect(published.at(-1)).toEqual(s); expect(pending.size).toBe(0);
    expect(positionVariance(c.psi)).toBeLessThan(positionVariance(state));
  });
  it('observes while playing without rescheduling, then evolves with stable norm/energy and re-spreads', () => {
    const { controller: c, frame, pending } = harness();
    c.play(); frame(0); frame(30);
    const scheduled = [...pending.entries()], time = c.snapshot().time;
    c.observe();
    const variance = positionVariance(c.psi), energy = c.snapshot().energy;
    expect(c.snapshot()).toMatchObject({ time, playing: true, energyDrift: 0 });
    expect([...pending.entries()]).toEqual(scheduled);
    for (let i = 1; i <= 100; i++) frame(30 + i * 10);
    expect(c.snapshot().time).toBe(time + 1);
    expect(Math.abs(c.snapshot().norm - 1)).toBeLessThan(2e-12);
    expect(Math.abs(c.snapshot().energy - energy)).toBeLessThan(2e-12);
    expect(Math.abs(c.snapshot().energyDrift)).toBeLessThan(2e-12);
    expect(positionVariance(c.psi)).toBeGreaterThan(4 * variance);
    c.pause(); const pausedTime = c.snapshot().time;
    c.observe(); expect(c.snapshot()).toMatchObject({ time: pausedTime, playing: false, measurementCount: 2 });
    c.play(); frame(5000); frame(5010);
    expect(c.snapshot().time).toBe(pausedTime + 0.01);
  });
  it('replays seeded actions, does not sample in snapshots/settings, and rewinds RNG on reset/preset loads', () => {
    const a = harness(123), b = harness(123), other = harness(456);
    for (const h of [a, b, other]) {
      h.controller.setMeasurementResolution(0.5);
      h.controller.setInitialMomentum(0);
      h.controller.reset();
    }
    const initial = a.controller.psi.values.slice();
    for (let action = 0; action < 3; action++) {
      a.controller.snapshot(); a.controller.snapshot(); // reads consume no randomness
      a.controller.observe(); b.controller.observe(); other.controller.observe();
      expect(a.controller.lastObservation).toEqual(b.controller.lastObservation);
      expect(a.controller.psi.values).toEqual(b.controller.psi.values);
    }
    expect(a.controller.lastObservation).not.toEqual(other.controller.lastObservation);
    const replayState = a.controller.psi.values.slice();
    a.controller.stamp(5, { amplitude: 1, sigma: 0.6 });
    const terrain = a.controller.potential, painted = terrain.slice();
    a.controller.reset();
    expect(a.controller.psi.values).toEqual(initial);
    expect(a.controller.potential).toBe(terrain); expect(terrain).toEqual(painted);
    expect(a.controller.snapshot()).toMatchObject({ time: 0, playing: false, observation: null, measurementCount: 0, energyDrift: 0 });
    expect(a.controller.measurementResolution).toBe(0.5);
    for (let i = 0; i < 3; i++) a.controller.observe();
    expect(a.controller.psi.values).toEqual(replayState);
    a.controller.loadFreeExploration(); a.controller.observe();
    const loaded = a.controller.lastObservation;
    a.controller.loadFreeExploration(); a.controller.observe();
    expect(a.controller.lastObservation).toEqual(loaded);
  });
  it('clears already-published separated-packet R/T immediately on observation', () => {
    const { controller: c, frame } = harness();
    c.loadScatteringDemo(); c.play(); frame(0);
    for (let i = 1; i <= 1000; i++) frame(i * 40);
    expect(c.snapshot().scatteringStatus).toBe('separated');
    expect(c.snapshot().transmission).not.toBeNull();
    const terrain = c.potential.slice();
    c.observe();
    expect(c.snapshot()).toMatchObject({ time: 40, playing: true, scatteringStatus: 'modified',
      reflection: null, transmission: null, energyDrift: 0, measurementCount: 1 });
    expect(c.potential).toEqual(terrain);
    c.dispose();
  });
  it('invalidates scattering after observation and restores pristine interpretation on reset only if terrain is intact', () => {
    const { controller: c } = harness();
    c.loadScatteringDemo();
    const terrain = c.potential, initial = c.psi.values.slice();
    c.observe();
    expect(c.snapshot()).toMatchObject({ scatteringStatus: 'modified', reflection: null, transmission: null });
    c.reset();
    expect(c.snapshot()).toMatchObject({ scatteringStatus: 'provisional', observation: null, measurementCount: 0, energyDrift: 0 });
    expect(c.psi.values).toEqual(initial); expect(c.potential).toBe(terrain);
    c.observe(); c.clearTerrain(); c.reset();
    expect(c.snapshot().scatteringStatus).toBe('modified');
    c.loadScatteringDemo();
    expect(c.snapshot()).toMatchObject({ scatteringStatus: 'provisional', observation: null, energyDrift: 0 });
  });
  it('resets energy reference after terrain changes and validates resolution without changing state', () => {
    const { controller: c, published } = harness();
    const state = c.psi.values.slice();
    for (const resolution of [0, -1, NaN, Infinity, 0.19, 2.01]) {
      expect(() => c.setMeasurementResolution(resolution)).toThrow(RangeError);
    }
    expect(c.measurementResolution).toBe(0.4);
    expect(c.psi.values).toEqual(state); expect(published).toHaveLength(0);
    for (const resolution of [0.2, 2]) {
      c.setMeasurementResolution(resolution); c.observe();
      expect(c.snapshot().norm).toBeCloseTo(1, 14);
    }
    c.stamp(-5, { amplitude: 2, sigma: 0.6 });
    expect(c.snapshot().energyDrift).toBe(0);
    c.paint(-6, -4, { amplitude: 3, sigma: 0.6 });
    expect(c.snapshot().energyDrift).toBe(0);
    c.clearTerrain(); expect(c.snapshot().energyDrift).toBe(0);
    const before = c.snapshot(); c.dispose(); c.observe(); c.setMeasurementResolution(1);
    expect(c.snapshot()).toEqual(before); expect(c.measurementResolution).toBe(2);
  });
  it('blocks observation in a failed controller until reset', () => {
    const { controller: c, frame } = harness();
    c.psi.values[100] = NaN; c.play(); frame(0);
    c.observe(); expect(c.snapshot().measurementCount).toBe(0);
    c.reset(); c.observe(); expect(c.snapshot().measurementCount).toBe(1);
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
