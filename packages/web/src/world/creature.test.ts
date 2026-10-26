import { describe, expect, it, vi } from 'vitest';
import {
  CrankNicolsonStepper, createPsiGrid, createBasisQubit, initializeGaussian,
  normalize, normSquared, qubitNormSquared, blochVector, evolveQubit,
  positionExpectation, momentumExpectation, energyExpectation,
  type PsiGrid,
} from '@psi-zoo/sim-core';
import { Creature, type CreatureOptions } from './creature';

const stationary = { ax: 0, ay: 0, az: 0 };
function packet(): PsiGrid {
  const psi = createPsiGrid(401, 0.1, -20);
  initializeGaussian(psi, 0, 1, 0, false);
  psi.values[0] = psi.values[1] = psi.values[800] = psi.values[801] = 0;
  normalize(psi);
  return psi;
}
function options(overrides: Partial<CreatureOptions> = {}): CreatureOptions {
  return { psi: packet(), mood: createBasisQubit(0), moodHamiltonian: { ...stationary },
    drive: { forceScale: 0.4 }, ...overrides };
}
const terrain = () => new Float64Array(401);
function advance(c: Creature, steps: number, external = terrain()) {
  for (let k = 0; k < steps; k++) c.step(external);
  return c.snapshot();
}
function error(a: Float64Array, b: Float64Array) {
  return Math.max(...a.map((v, i) => Math.abs(v - b[i]!)));
}

describe('single Creature midpoint mood drive, hbar=m=1', () => {
  it('owns initial states/configuration and returns independent snapshots with an explicit fixed-step lifecycle', () => {
    const input = options(), a = new Creature(input), b = new Creature(input);
    const before = a.snapshot();
    input.psi.values.fill(0); input.mood.values.fill(0);
    (input.moodHamiltonian as { ax: number }).ax = 9;
    (input.drive as { forceScale: number }).forceScale = 9;
    expect(a.snapshot()).toEqual(before);
    const view = a.snapshot(); view.psi.values.fill(0); view.mood.values.fill(0);
    expect(a.snapshot()).toEqual(before);
    a.step(terrain());
    expect(b.snapshot()).toEqual(before);
    expect(a.snapshot().time).toBe(0.01);
    expect(a.timeStep).toBe(0.01);
    expect(a.xRef).toBe(0);
    expect(a.snapshot().psi.values).not.toEqual(before.psi.values);
  });

  it.each([false, true])('zero drive exactly reproduces the existing solver, external=%s', external => {
    const input = options({ drive: { forceScale: 0 }, moodHamiltonian: { ax: 0.7, ay: -0.2, az: 0.3 } });
    const c = new Creature(input), psi = { ...input.psi, values: input.psi.values.slice() };
    const v = Float64Array.from({ length: 401 }, (_, i) => external ? 0.03 * (i - 200) ** 2 : 0);
    const before = v.slice(), stepper = new CrankNicolsonStepper();
    for (let k = 0; k < 200; k++) { c.step(v); stepper.step(psi, v, 0.01); }
    expect(c.snapshot().psi.values).toEqual(psi.values);
    expect(c.snapshot().time).toBe(2);
    expect(v).toEqual(before);
    expect(c.snapshot().mood.values).not.toEqual(input.mood.values);
  });

  it('samples a real linear drive on a shifted grid, adds signed terrain, and never aliases terrain', () => {
    const psi = createPsiGrid(5, 0.5, 7); psi.values[4] = Math.sqrt(2);
    const c = new Creature(options({ psi, drive: { forceScale: 2 } }));
    expect(c.xRef).toBe(8);
    const v = new Float64Array([-1, 0.2, 3, -0.4, 5]), before = v.slice();
    expect(c.potential(v)).toEqual(new Float64Array([1, 1.2, 3, -1.4, 3]));
    const potential = c.potential(v); potential.fill(9);
    c.step(v);
    expect(v).toEqual(before);
    expect(c.potential(v).every(Number.isFinite)).toBe(true);
  });

  it('opposite rz produces opposite force, momentum and centroid motion, measurably different from zero drive', () => {
    const results = [0, 1].map(index => advance(new Creature(options({ mood: createBasisQubit(index as 0 | 1) })), 200));
    const free = advance(new Creature(options({ drive: { forceScale: 0 } })), 200);
    expect(Math.abs(positionExpectation(free.psi))).toBeLessThan(1e-12);
    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? 1 : -1;
      const mean = positionExpectation(results[i]!.psi), momentum = momentumExpectation(results[i]!.psi);
      expect(sign * mean).toBeGreaterThan(0.75);
      expect(sign * momentum).toBeGreaterThan(0.75);
      // Continuum references x=F*t^2/2, p=F*t, with O(dx^2) lattice/CN allowance.
      expect(Math.abs(mean - sign * 0.8)).toBeLessThan(0.005);
      expect(Math.abs(momentum - sign * 0.8)).toBeLessThan(0.005);
    }
    expect(Math.abs(positionExpectation(results[0]!.psi) + positionExpectation(results[1]!.psi))).toBeLessThan(1e-12);
  });

  it('uses the analytic MIDPOINT force F0*cos(2*w*(t+dt/2)), not the start or endpoint mood', () => {
    const w = 0.8, dt = 0.1, input = options({ timeStep: dt, moodHamiltonian: { ax: w, ay: 0, az: 0 } });
    const c = new Creature(input), psi = { ...input.psi, values: input.psi.values.slice() };
    const v = terrain(), stepper = new CrankNicolsonStepper();
    const spy = vi.spyOn(CrankNicolsonStepper.prototype, 'step');
    try {
      for (let k = 0; k < 25; k++) {
        spy.mockClear(); c.step(v);
        const force = 0.4 * Math.cos(2 * w * (k + 0.5) * dt);
        const expected = Float64Array.from({ length: 401 }, (_, i) => -force * (-20 + i * 0.1));
        const used = spy.mock.calls.at(-1)![1];
        expect(error(used, expected)).toBeLessThan(8e-14);
        stepper.step(psi, expected, dt);
        const current = c.snapshot();
        expect(error(current.psi.values, psi.values)).toBeLessThan(2e-14);
        expect(Math.abs(blochVector(current.mood).z - Math.cos(2 * w * (k + 1) * dt))).toBeLessThan(8e-15);
      }
      expect(c.potential(v)[0]).toBeLessThan(0); // Force has changed sign.
    } finally { spy.mockRestore(); }
    expect(error(c.snapshot().mood.values, evolveQubit(input.mood, input.moodHamiltonian, 2.5).values)).toBeLessThan(5e-15);
  });

  it('matches the precessing-force continuum trajectory before wall effects', () => {
    const w = 0.8, t = 2;
    const state = advance(new Creature(options({ moodHamiltonian: { ax: w, ay: 0, az: 0 } })), 200);
    const p = 0.4 * Math.sin(2 * w * t) / (2 * w);
    const x = 0.4 * (1 - Math.cos(2 * w * t)) / (4 * w * w);
    // Finite-difference dispersion and temporal approximation, not roundoff.
    expect(Math.abs(positionExpectation(state.psi) - x)).toBeLessThan(0.002);
    expect(Math.abs(momentumExpectation(state.psi) - p)).toBeLessThan(0.002);
    expect(positionExpectation(state.psi)).toBeGreaterThan(0.3);
  });

  it('has second-order temporal convergence against a fine-step full-state reference on the same grid', () => {
    const run = (dt: number) => advance(new Creature(options({ timeStep: dt,
      moodHamiltonian: { ax: 0.8, ay: 0, az: 0 } })), Math.round(1 / dt)).psi.values;
    const coarse = run(0.04), fine = run(0.02), reference = run(0.0025);
    const coarseError = error(coarse, reference), fineError = error(fine, reference);
    expect(coarseError).toBeGreaterThan(1e-6);
    expect(coarseError / fineError).toBeGreaterThan(3.8);
    expect(coarseError / fineError).toBeLessThan(4.3);
  });

  it('preserves spatial/qubit norms and unit Bloch radius through 1000 time-dependent steps', () => {
    const c = new Creature(options({ moodHamiltonian: { ax: 0.7, ay: -0.3, az: 0.2 } }));
    const v = terrain(), before = v.slice();
    let spatial = 0, qubit = 0, radius = 0;
    for (let k = 0; k < 1000; k++) {
      c.step(v); const state = c.snapshot(), r = blochVector(state.mood);
      spatial = Math.max(spatial, Math.abs(normSquared(state.psi) - 1));
      qubit = Math.max(qubit, Math.abs(qubitNormSquared(state.mood) - 1));
      radius = Math.max(radius, Math.abs(Math.hypot(r.x, r.y, r.z) - 1));
      expect([state.psi.values[0], state.psi.values[1], state.psi.values[800], state.psi.values[801]]).toEqual([0, 0, 0, 0]);
    }
    // Conservative accumulated double-precision roundoff budgets, no normalization.
    expect(spatial).toBeLessThan(5e-12);
    expect(qubit).toBeLessThan(2e-12);
    expect(radius).toBeLessThan(2e-12);
    expect(v).toEqual(before);
  });

  it('conserves energy for static total H, but not generally when precession makes V time-dependent', () => {
    const fixed = new Creature(options()), varying = new Creature(options({ moodHamiltonian: { ax: 0.8, ay: 0, az: 0 } }));
    const v = terrain();
    const e0 = energyExpectation(fixed.snapshot().psi, fixed.potential(v)).real;
    const changingE0 = energyExpectation(varying.snapshot().psi, varying.potential(v)).real;
    advance(fixed, 200, v); advance(varying, 200, v);
    expect(Math.abs(energyExpectation(fixed.snapshot().psi, fixed.potential(v)).real - e0)).toBeLessThan(2e-12);
    expect(Math.abs(energyExpectation(varying.snapshot().psi, varying.potential(v)).real - changingE0)).toBeGreaterThan(0.05);
  });

  it('is deterministic for repeated fixed-step inputs', () => {
    const run = () => {
      const c = new Creature(options({ moodHamiltonian: { ax: 0.7, ay: 0.2, az: -0.1 } }));
      for (let k = 0; k < 100; k++) c.step(terrain().fill(k < 50 ? 0.1 : -0.2));
      return c.snapshot();
    };
    expect(run()).toEqual(run());
  });

  it('rejects invalid configuration, spatial states and moods without repairing inputs', () => {
    for (const timeStep of [0, -1, NaN, Infinity, Number.MIN_VALUE]) expect(() => new Creature(options({ timeStep }))).toThrow(RangeError);
    for (const forceScale of [-1, NaN, Infinity]) expect(() => new Creature(options({ drive: { forceScale } }))).toThrow(RangeError);
    for (const key of ['ax', 'ay', 'az'] as const) expect(() => new Creature(options({ moodHamiltonian: { ...stationary, [key]: NaN } }))).toThrow(RangeError);
    expect(() => new Creature(options({ mood: { values: new Float64Array(4) } }))).toThrow(RangeError);
    const psi = packet();
    for (const bad of [{ ...psi, count: 2 }, { ...psi, dx: 0 }, { ...psi, x0: NaN },
      { ...psi, dx: 1e308 }, { ...psi, values: new Float64Array(2) }]) {
      expect(() => new Creature(options({ psi: bad }))).toThrow(RangeError);
    }
    for (const value of [NaN, Infinity, 0, 2]) {
      const bad = packet(); bad.values.fill(0); bad.values[400] = value;
      const before = bad.values.slice();
      expect(() => new Creature(options({ psi: bad }))).toThrow(RangeError);
      expect(bad.values).toEqual(before);
    }
    const endpoint = packet(); endpoint.values[0] = 1e-30;
    expect(() => new Creature(options({ psi: endpoint }))).toThrow(/Dirichlet/);
  });

  it('rejects malformed terrain and composition/solver overflow without advancing either state or time', () => {
    const c = new Creature(options());
    const before = c.snapshot();
    for (const v of [new Float64Array(3), terrain().fill(NaN), terrain().fill(Infinity)]) {
      expect(() => c.potential(v)).toThrow(RangeError);
      expect(() => c.step(v)).toThrow(RangeError);
      expect(c.snapshot()).toEqual(before);
    }
    const overflow = new Creature(options({ drive: { forceScale: Number.MAX_VALUE } }));
    const original = overflow.snapshot();
    expect(() => overflow.step(terrain())).toThrow(RangeError);
    expect(overflow.snapshot()).toEqual(original);
    const solverOverflow = new Creature(options({ timeStep: 1e308, drive: { forceScale: 0 } }));
    const originalSolver = solverOverflow.snapshot();
    expect(() => solverOverflow.step(terrain().fill(1e308))).toThrow(RangeError);
    expect(solverOverflow.snapshot()).toEqual(originalSolver);
  });
});
