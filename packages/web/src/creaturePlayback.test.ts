import { describe, expect, it, vi } from 'vitest';
import { normSquared, positionExpectation, positionVariance, blochVector, qubitNormSquared, CrankNicolsonStepper } from '@psi-zoo/sim-core';
import { SimulationPlayback, type SimulationSnapshot } from './simulation';
import { TwoCreatureWorld } from './world/twoCreatureWorld';
import { Creature } from './world/creature';

function harness() {
  let id = 0;
  const pending = new Map<number, (now: number) => void>();
  const published: SimulationSnapshot[] = [];
  const c = new SimulationPlayback({ request: cb => { pending.set(++id, cb); return id; }, cancel: key => { pending.delete(key); } }, s => published.push(s));
  c.loadCreatureDemo();
  const frame = (now: number) => { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(cb => cb(now)); };
  return { c, frame, pending, published };
}

describe('two-creature browser playback without DOM', () => {
  it('initializes/reset deterministically and caches independent render snapshots without rebuilding on reads', () => {
    const { c, frame } = harness(), initial = c.creatureStates!;
    expect(c.snapshot().mode).toBe('creatures');
    expect(c.creatureStates).toBe(initial);
    expect(initial.a.psi.values).not.toBe(initial.b.psi.values);
    expect(positionExpectation(initial.a.psi)).toBeLessThan(0);
    expect(positionExpectation(initial.b.psi)).toBeGreaterThan(0);
    c.play(); frame(0); frame(40); c.pause();
    expect(c.creatureStates!.time).toBe(0.04);
    c.reset(); expect(c.creatureStates).toEqual(initial);
    expect(c.snapshot().playing).toBe(false);
  });

  it('advances the real world synchronously, is refresh-rate independent, pauses and disposes stale callbacks', () => {
    const spy = vi.spyOn(TwoCreatureWorld.prototype, 'step');
    try {
      const a = harness(), b = harness();
      for (const h of [a, b]) { h.c.play(); h.frame(0); }
      for (let i = 1; i <= 30; i++) a.frame(i * 1000 / 30);
      for (let i = 1; i <= 144; i++) b.frame(i * 1000 / 144);
      expect(a.c.creatureStates).toEqual(b.c.creatureStates);
      expect(a.c.creatureStates!.a.time).toBe(1); expect(a.c.creatureStates!.b.time).toBe(1);
      expect(spy).toHaveBeenCalledTimes(200);
      a.c.pause(); const state = a.c.creatureStates; a.frame(5000); expect(a.c.creatureStates).toBe(state);
      const stale = [...b.pending.values()][0]!; b.c.dispose(); stale(5000);
      expect(b.pending.size).toBe(0); expect(b.c.creatureStates!.time).toBe(1);
    } finally { spy.mockRestore(); }
  });

  it('coupling is validated, pending until Reset, and changes physical states from identical initial conditions', () => {
    const results = [-3, 0, 3].map(g => {
      const h = harness(), initial = h.c.creatureStates!;
      h.c.setSocialCoupling(g);
      expect(h.c.creatureStates).toBe(initial);
      h.c.reset(); expect(h.c.creatureStates!.coupling).toBe(g);
      expect(h.c.creatureStates!.a).toEqual(initial.a);
      expect(h.c.creatureStates!.b).toEqual(initial.b);
      expect(h.c.creatureStates!.time).toBe(0);
      expect(h.c.potential.every(v => v === 0)).toBe(true);
      h.c.play(); h.frame(0); for (let k = 1; k <= 200; k++) h.frame(k * 10);
      h.c.pause();
      expect(h.c.creatureStates!.time).toBe(2);
      return h.c.creatureStates!;
    });
    expect(results[0]!.a.psi.values).not.toEqual(results[1]!.a.psi.values);
    expect(results[1]!.a.psi.values).not.toEqual(results[2]!.a.psi.values);
    // Same physical endpoint, not wall-clock screenshots: attraction speeds the
    // approach/crossing, repulsion retards it. Broad finite-grid contrasts.
    const means = results.map(s => positionExpectation(s.a.psi));
    expect(means[0]! - means[1]!).toBeGreaterThan(0.3);
    expect(means[1]! - means[2]!).toBeGreaterThan(0.3);
    for (const s of results) {
      expect(Math.abs(positionExpectation(s.a.psi) + positionExpectation(s.b.psi))).toBeLessThan(2e-12);
      for (const id of ['a', 'b'] as const) expect(Math.abs(normSquared(s[id].psi) - 1)).toBeLessThan(2e-12);
    }
    const { c } = harness(); for (const g of [NaN, Infinity, -3.1, 3.1]) expect(() => c.setSocialCoupling(g)).toThrow(RangeError);
  });

  it('default moods cause real centroid changes relative to zero-drive and swapped-mood counterfactuals', () => {
    const { c, frame } = harness(), initial = c.creatureStates!;
    expect(initial.a.mood.values).toEqual(new Float64Array([1, 0, 0, 0]));
    expect(initial.b.mood.values).toEqual(new Float64Array([0, 0, 1, 0]));
    for (const id of ['a', 'b'] as const) {
      expect(initial[id].moodHamiltonian).toEqual({ ax: 0.6, ay: 0, az: 0.15 });
      expect(initial[id].drive.forceScale).toBe(0.12);
    }
    const counterfactual = (swap: boolean) => new TwoCreatureWorld({
      a: { ...initial.a, mood: swap ? initial.b.mood : initial.a.mood, drive: { forceScale: swap ? 0.12 : 0 } },
      b: { ...initial.b, mood: swap ? initial.a.mood : initial.b.mood, drive: { forceScale: swap ? 0.12 : 0 } },
      coupling: initial.coupling,
    });
    const disabled = counterfactual(false), swapped = counterfactual(true);
    c.play(); frame(0);
    for (let k = 1; k <= 200; k++) { frame(k * 10); disabled.step(c.potential); swapped.step(c.potential); }
    c.pause(); const actual = c.creatureStates!;
    for (const id of ['a', 'b'] as const) {
      const direction = id === 'a' ? 1 : -1;
      const x = positionExpectation(actual[id].psi);
      // Broad physical contrasts on this grid, not continuum/roundoff accuracy claims.
      expect(direction * (x - positionExpectation(disabled.snapshot()[id].psi))).toBeGreaterThan(0.08);
      expect(direction * (x - positionExpectation(swapped.snapshot()[id].psi))).toBeGreaterThan(0.16);
      const z = (0.15 ** 2 + 0.6 ** 2 * Math.cos(2 * Math.hypot(0.6, 0.15) * 2)) / (0.6 ** 2 + 0.15 ** 2);
      expect(Math.abs(blochVector(actual[id].mood).z - direction * z)).toBeLessThan(2e-13);
      // Same spatial initial state with the other mood reverses the initial potential slope.
      const own = new Creature(initial[id]), other = new Creature({ ...initial[id], mood: initial[id === 'a' ? 'b' : 'a'].mood });
      expect(own.potential(c.potential)[210]).toBeCloseTo(-direction * 0.12, 14);
      expect(other.potential(c.potential)[210]).toBeCloseTo(direction * 0.12, 14);
    }
  });

  it('selection changes observables and observation target, not either live state or partner collapse', () => {
    const { c, frame, pending } = harness();
    c.play(); frame(0); frame(50);
    const before = c.creatureStates!, scheduled = [...pending.keys()];
    c.selectCreature('b'); expect(c.creatureStates).toBe(before);
    const inspection = c.snapshot().inspection!;
    expect(inspection.position).toBe(positionExpectation(before.b.psi));
    expect(inspection.bloch).toEqual(blochVector(before.b.mood));
    expect(inspection.moodNorm).toBe(qubitNormSquared(before.b.mood));
    c.observe(); const after = c.creatureStates!;
    expect(after.a).toEqual(before.a); expect(after.b.mood).toEqual(before.b.mood);
    expect(after.b.psi.values).not.toEqual(before.b.psi.values);
    expect(Math.abs(normSquared(after.b.psi) - 1)).toBeLessThan(3e-15);
    expect(after.time).toBe(before.time); expect([...pending.keys()]).toEqual(scheduled);
    expect(c.snapshot().playing).toBe(true); expect(c.snapshot().measurementCount).toBe(1);
    c.selectCreature('a'); expect(c.lastObservation).toBeNull(); expect(c.snapshot().measurementCount).toBe(0);
    frame(60); expect(c.creatureStates!.a.time).toBe(0.06); expect(c.creatureStates!.b.time).toBe(0.06);
  });

  it('replays seeded selected observations after Reset and then re-spreads', () => {
    const { c, frame } = harness(); c.setSocialCoupling(0); c.reset(); c.selectCreature('b'); c.observe();
    const measured = c.creatureStates!, record = c.lastObservation;
    c.reset(); c.observe(); expect(c.creatureStates).toEqual(measured); expect(c.lastObservation).toEqual(record);
    c.play(); frame(0); for (let k = 1; k <= 100; k++) frame(k * 10);
    expect(positionVariance(c.creatureStates!.b.psi)).toBeGreaterThan(2 * positionVariance(measured.b.psi));
    expect(Math.abs(normSquared(c.creatureStates!.b.psi) - 1)).toBeLessThan(2e-12);
  });

  it('shared painted terrain enters BOTH solves, Reset preserves it and Clear changes no states/time', () => {
    const { c, frame } = harness(); c.setSocialCoupling(0); c.reset();
    c.paint(-1, 1, { amplitude: 1, sigma: 0.6 });
    const v = c.potential.slice(), before = c.creatureStates!;
    const spy = vi.spyOn(CrankNicolsonStepper.prototype, 'step');
    try {
      c.play(); frame(0); frame(10);
      const solves = spy.mock.calls.filter(call => call[2] !== 0);
      expect(solves).toHaveLength(2);
      for (const call of solves) expect(call[1][200]).toBe(v[200]); // x=x_ref: zero mood potential.
    } finally { spy.mockRestore(); }
    const state = c.creatureStates; c.clearTerrain(); expect(c.creatureStates).toBe(state);
    expect(c.potential.every(value => value === 0)).toBe(true);
    c.stamp(0, { amplitude: 1, sigma: 0.6 }); c.reset(); expect(c.potential[200]).toBe(1);
    expect(c.creatureStates!.a.psi.values).toEqual(before.a.psi.values);
  });

  it('stops after a failed world step without advancing the cached physical state and can Reset', () => {
    const { c, frame, pending } = harness(), before = c.creatureStates!;
    const spy = vi.spyOn(TwoCreatureWorld.prototype, 'step').mockImplementation(() => { throw new RangeError('Injected world failure'); });
    try {
      c.play(); frame(0); frame(10);
      expect(c.snapshot().error).toBe('Injected world failure');
      expect(c.snapshot().playing).toBe(false); expect(pending.size).toBe(0);
      expect(c.creatureStates).toEqual(before);
    } finally { spy.mockRestore(); }
    c.reset(); expect(c.snapshot().error).toBeNull(); expect(c.creatureStates).toEqual(before);
  });

  it('retains old presets, prevents cross-mode stale worlds, and validates selection', () => {
    const { c } = harness();
    expect(() => c.selectCreature('x' as 'a')).toThrow(RangeError);
    c.loadScatteringDemo(); expect(c.creatureStates).toBeNull(); expect(c.snapshot().mode).toBe('scattering');
    expect(c.psi.count).toBe(2401); c.loadFreeExploration(); expect(c.psi.count).toBe(401);
    c.loadCreatureDemo(); expect(c.creatureStates!.time).toBe(0);
    c.dispose(); const before = c.creatureStates; c.loadCreatureDemo(); c.observe(); c.selectCreature('b');
    expect(c.creatureStates).toBe(before);
  });
});
