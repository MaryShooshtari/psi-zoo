import { describe, expect, it, vi } from 'vitest';
import {
  createPsiGrid, initializeGaussian, normalize, createBasisQubit,
  normSquared, qubitNormSquared, blochVector, positionExpectation, energyExpectation,
  CrankNicolsonStepper, type PsiGrid,
} from '@psi-zoo/sim-core';
import { Creature, type CreatureOptions } from './creature';
import { TwoCreatureWorld, type TwoCreatureWorldSnapshot } from './twoCreatureWorld';

function packet(center: number, momentum = 0, count = 401, dx = 0.1, x0 = -20) {
  const psi = createPsiGrid(count, dx, x0);
  initializeGaussian(psi, center, 0.8, momentum, false);
  psi.values[0] = psi.values[1] = psi.values[2 * count - 2] = psi.values[2 * count - 1] = 0;
  normalize(psi);
  return psi;
}
function options(center = -0.8, overrides: Partial<CreatureOptions> = {}): CreatureOptions {
  return { psi: packet(center), mood: createBasisQubit(0), moodHamiltonian: { ax: 0, ay: 0, az: 0 },
    drive: { forceScale: 0 }, ...overrides };
}
function world(coupling = 2, dt = 0.01) {
  return new TwoCreatureWorld({ a: options(-0.8, { timeStep: dt }), b: options(0.8, { timeStep: dt }), coupling });
}
const terrain = () => new Float64Array(401);
function density(psi: PsiGrid) {
  return Float64Array.from({ length: psi.count }, (_, i) => psi.values[2 * i]! ** 2 + psi.values[2 * i + 1]! ** 2);
}
function overlap(s: TwoCreatureWorldSnapshot) {
  const a = density(s.a.psi), b = density(s.b.psi);
  return s.a.psi.dx * a.reduce((sum, value, i) => sum + value * b[i]!, 0);
}
function distance(a: TwoCreatureWorldSnapshot, b: TwoCreatureWorldSnapshot) {
  // dx-weighted joint L2 amplitude error, including global phases, same grid.
  let sum = 0;
  for (const key of ['a', 'b'] as const) {
    a[key].psi.values.forEach((value, i) => { sum += (value - b[key].psi.values[i]!) ** 2; });
  }
  return Math.sqrt(a.a.psi.dx * sum);
}
function energy(s: TwoCreatureWorldSnapshot) {
  // Zero terrain and mood drive in this experiment. Count the cross term ONCE.
  const zero = new Float64Array(s.a.psi.count);
  return energyExpectation(s.a.psi, zero).real + energyExpectation(s.b.psi, zero).real + s.coupling * overlap(s);
}
function run(coupling = 2, dt = 0.01, t = 1) {
  const w = world(coupling, dt), v = terrain(), e0 = energy(w.snapshot());
  let maxEnergyDrift = 0;
  for (let k = 0; k < Math.round(t / dt); k++) {
    w.step(v); maxEnergyDrift = Math.max(maxEnergyDrift, Math.abs(energy(w.snapshot()) - e0));
  }
  return { state: w.snapshot(), maxEnergyDrift };
}

describe('two-creature synchronous frozen-density contact model', () => {
  it('Creature forks preserve time and buffers exactly, but subsequent steps are independent', () => {
    const c = new Creature(options()), v = terrain();
    for (let k = 0; k < 3; k++) c.step(v);
    const before = c.snapshot(), fork = c.fork();
    expect(fork.snapshot()).toEqual(before);
    expect(fork.timeStep).toBe(c.timeStep);
    fork.step(v);
    expect(c.snapshot()).toEqual(before);
    expect(fork.snapshot().time).toBe(0.04);
  });

  it('g=0 exactly agrees with independent creatures, including mood drive and time', () => {
    const a = options(-1, { drive: { forceScale: 0.2 }, moodHamiltonian: { ax: 0.7, ay: -0.3, az: 0.2 } });
    const b = options(0.7, { drive: { forceScale: 0.1 }, mood: createBasisQubit(1), moodHamiltonian: { ax: -0.2, ay: 0.4, az: 0 } });
    const w = new TwoCreatureWorld({ a, b, coupling: 0 }), independentA = new Creature(a), independentB = new Creature(b);
    const v = Float64Array.from({ length: 401 }, (_, i) => 0.002 * (-20 + i * 0.1) ** 2);
    const before = v.slice();
    for (let k = 0; k < 200; k++) { w.step(v); independentA.step(v); independentB.step(v); }
    expect(w.snapshot().a).toEqual(independentA.snapshot());
    expect(w.snapshot().b).toEqual(independentB.snapshot());
    expect(w.snapshot().time).toBe(2);
    expect(v).toEqual(before);
  });

  it.each([-2, 0, 2])('social potentials are exactly g times the OTHER density, not dx-weighted masses, g=%s', coupling => {
    const w = world(coupling), s = w.snapshot(), social = w.socialPotentials();
    expect(social.a).toEqual(density(s.b.psi).map(value => coupling * value));
    expect(social.b).toEqual(density(s.a.psi).map(value => coupling * value));
    social.a.fill(9); social.b.fill(9);
    expect(w.snapshot()).toEqual(s);
    expect(w.socialPotentials().a).not.toEqual(social.a);
  });

  it('does not introduce self-interaction, even for completely disjoint localized states', () => {
    const a = createPsiGrid(7, 0.5, -1.5), b = createPsiGrid(7, 0.5, -1.5);
    a.values[2] = Math.sqrt(2); b.values[10] = Math.sqrt(2);
    const w = new TwoCreatureWorld({ a: options(0, { psi: a }), b: options(0, { psi: b }), coupling: 3 });
    const social = w.socialPotentials();
    expect(social.a[1]).toBe(0); expect(social.a[5]).toBeCloseTo(6, 14);
    expect(social.b[5]).toBe(0); expect(social.b[1]).toBeCloseTo(6, 14);
  });

  it('uses synchronized old densities for BOTH solves and adds social, terrain, and midpoint mood potentials', () => {
    const a = options(-0.8, { drive: { forceScale: 0.2 }, moodHamiltonian: { ax: 0.8, ay: 0, az: 0 } });
    const b = options(0.8, { drive: { forceScale: 0.3 }, moodHamiltonian: { ax: 0.3, ay: 0, az: 0 } });
    const w = new TwoCreatureWorld({ a, b, coupling: 2 }), refA = new Creature(a), refB = new Creature(b);
    const v = terrain().fill(-0.1), before = v.slice();
    for (let k = 0; k < 30; k++) {
      const rhoA = density(refA.snapshot().psi), rhoB = density(refB.snapshot().psi);
      const va = v.map((value, i) => value + 2 * rhoB[i]!);
      const vb = v.map((value, i) => value + 2 * rhoA[i]!);
      // Both arrays exist before the first update; no density from refA_next.
      refA.step(va); refB.step(vb); w.step(v);
      expect(w.snapshot().a).toEqual(refA.snapshot());
      expect(w.snapshot().b).toEqual(refB.snapshot());
    }
    expect(v).toEqual(before);
  });

  it('repulsion increases separation/reduces overlap, attraction does the opposite relative to g=0', () => {
    const repulsive = run(3).state, free = run(0).state, attractive = run(-3).state;
    const separation = (s: TwoCreatureWorldSnapshot) => positionExpectation(s.b.psi) - positionExpectation(s.a.psi);
    expect(separation(repulsive)).toBeGreaterThan(separation(free) + 0.1);
    expect(separation(attractive)).toBeLessThan(separation(free) - 0.1);
    expect(overlap(repulsive)).toBeLessThan(overlap(free) - 0.005);
    expect(overlap(attractive)).toBeGreaterThan(overlap(free) + 0.005);
  });

  it('swapping asymmetric labels/list order swaps bit-for-bit results over repeated steps', () => {
    const a = options(-1, { psi: packet(-1, 0.3), drive: { forceScale: 0.1 }, moodHamiltonian: { ax: 0.5, ay: 0.1, az: 0 } });
    const b = options(0.5, { psi: packet(0.5, -0.2), mood: createBasisQubit(1), moodHamiltonian: { ax: -0.3, ay: 0.2, az: 0.4 } });
    const ab = new TwoCreatureWorld({ a, b, coupling: -1.2 }), ba = new TwoCreatureWorld({ a: b, b: a, coupling: -1.2 });
    for (let k = 0; k < 100; k++) { const v = terrain().fill(k < 50 ? -0.1 : 0.2); ab.step(v); ba.step(v); }
    expect(ab.snapshot().a).toEqual(ba.snapshot().b);
    expect(ab.snapshot().b).toEqual(ba.snapshot().a);
    expect(ab.snapshot().time).toBe(ba.snapshot().time);
  });

  it('preserves both spatial/mood norms and Bloch radii through 1000 coupled steps', () => {
    const a = options(-0.8, { drive: { forceScale: 0.1 }, moodHamiltonian: { ax: 0.7, ay: -0.3, az: 0.2 } });
    const b = options(0.8, { drive: { forceScale: 0.15 }, moodHamiltonian: { ax: -0.4, ay: 0.2, az: 0.1 } });
    const w = new TwoCreatureWorld({ a, b, coupling: 1.2 }), v = terrain();
    for (let k = 0; k < 1000; k++) {
      w.step(v);
      for (const state of [w.snapshot().a, w.snapshot().b]) {
        const r = blochVector(state.mood);
        // Accumulated double-precision roundoff budgets, no normalization.
        expect(Math.abs(normSquared(state.psi) - 1)).toBeLessThan(5e-12);
        expect(Math.abs(qubitNormSquared(state.mood) - 1)).toBeLessThan(2e-12);
        expect(Math.abs(Math.hypot(r.x, r.y, r.z) - 1)).toBeLessThan(2e-12);
        expect([state.psi.values[0], state.psi.values[1], state.psi.values[800], state.psi.values[801]]).toEqual([0, 0, 0, 0]);
      }
    }
    expect(w.snapshot().time).toBe(10);
  });

  it('owns both inputs independently, protects external snapshots, and does not retain terrain', () => {
    const input = options(), w = new TwoCreatureWorld({ a: input, b: input, coupling: 1 });
    const before = w.snapshot(); input.psi.values.fill(0); input.mood.values.fill(0);
    expect(w.snapshot()).toEqual(before);
    const external = w.snapshot(); external.a.psi.values.fill(0); external.b.mood.values.fill(0);
    expect(w.snapshot()).toEqual(before);
    const v = terrain(), vBefore = v.slice(); w.step(v);
    expect(before.a.psi.values).not.toEqual(w.snapshot().a.psi.values);
    expect(v).toEqual(vBefore);
    const current = w.snapshot(); v.fill(NaN);
    expect(w.snapshot()).toEqual(current);
    w.step(terrain()); // The old terrain was not retained.
  });

  it('replays deterministically', () => {
    const replay = () => { const w = world(-1); for (let k = 0; k < 100; k++) w.step(terrain().fill(Math.sin(k) * 0.1)); return w.snapshot(); };
    expect(replay()).toEqual(replay());
  });

  it.each(['a', 'b'] as const)('failure in member %s leaves the entire world unchanged', member => {
    const config = { a: options(), b: options(0.8), coupling: 1 };
    config[member] = options(0, { drive: { forceScale: Number.MAX_VALUE } });
    const w = new TwoCreatureWorld(config), before = w.snapshot(), v = terrain();
    expect(() => w.step(v)).toThrow(RangeError);
    expect(w.snapshot()).toEqual(before);
    expect(v).toEqual(terrain());
  });

  it('discards both candidates after a late solver failure, and can retry successfully', () => {
    const w = world(), before = w.snapshot(), original = CrankNicolsonStepper.prototype.step;
    let completed = 0;
    const spy = vi.spyOn(CrankNicolsonStepper.prototype, 'step').mockImplementation(function (this: CrankNicolsonStepper, psi, v, dt) {
      original.call(this, psi, v, dt);
      if (dt !== 0 && ++completed === 2) throw new RangeError('Injected second-solver failure');
    });
    try { expect(() => w.step(terrain())).toThrow(/second-solver/); } finally { spy.mockRestore(); }
    expect(completed).toBe(2);
    expect(w.snapshot()).toEqual(before);
    const fresh = world(); fresh.step(terrain()); w.step(terrain());
    expect(w.snapshot()).toEqual(fresh.snapshot());
  });

  it('rejects mismatched grids/dt, invalid coupling, malformed terrain, and social overflow atomically', () => {
    for (const coupling of [NaN, Infinity, -Infinity]) expect(() => world(coupling)).toThrow(RangeError);
    for (const b of [options(0, { psi: packet(0, 0, 403) }), options(0, { psi: packet(0, 0, 401, 0.11) }),
      options(0, { psi: packet(0, 0, 401, 0.1, -19) }), options(0, { timeStep: 0.02 })]) {
      expect(() => new TwoCreatureWorld({ a: options(), b, coupling: 1 })).toThrow(RangeError);
    }
    const w = world(), before = w.snapshot();
    for (const v of [new Float64Array(2), terrain().fill(NaN), terrain().fill(Infinity)]) {
      expect(() => w.step(v)).toThrow(RangeError);
      expect(w.snapshot()).toEqual(before);
    }
    const psi = createPsiGrid(5, 0.1); psi.values[4] = Math.sqrt(10);
    const extreme = new TwoCreatureWorld({ a: options(0, { psi }), b: options(0, { psi }), coupling: Number.MAX_VALUE });
    const old = extreme.snapshot();
    expect(() => extreme.socialPotentials()).toThrow(RangeError);
    expect(() => extreme.step(new Float64Array(5))).toThrow(RangeError);
    expect(extreme.snapshot()).toEqual(old);
    const additionOverflow = new TwoCreatureWorld({ a: options(0, { psi }), b: options(0, { psi }), coupling: Number.MAX_VALUE / 32 });
    const beforeAddition = additionOverflow.snapshot(), external = new Float64Array(5).fill(Number.MAX_VALUE);
    expect(() => additionOverflow.step(external)).toThrow(RangeError);
    expect(additionOverflow.snapshot()).toEqual(beforeAddition);
    expect(external.every(value => value === Number.MAX_VALUE)).toBe(true);
  });

  it('refines the first-order nonlinear amplitude error and combined-energy drift on a fixed grid', () => {
    const coarse = run(2, 0.02), fine = run(2, 0.01), finer = run(2, 0.005), reference = run(2, 0.000625);
    const e1 = distance(coarse.state, reference.state), e2 = distance(fine.state, reference.state), e3 = distance(finer.state, reference.state);
    expect(e1).toBeGreaterThan(1e-5);
    expect(e1 / e2).toBeGreaterThan(1.7); expect(e1 / e2).toBeLessThan(2.5);
    expect(e2 / e3).toBeGreaterThan(1.7); expect(e2 / e3).toBeLessThan(2.5);
    // Frozen-density CN is not exactly energy-conserving; test decreasing drift.
    expect(coarse.maxEnergyDrift).toBeGreaterThan(1e-6);
    expect(fine.maxEnergyDrift).toBeLessThan(0.7 * coarse.maxEnergyDrift);
    expect(finer.maxEnergyDrift).toBeLessThan(0.7 * fine.maxEnergyDrift);
  });
});
