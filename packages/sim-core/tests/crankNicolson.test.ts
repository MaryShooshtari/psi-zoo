import { describe, expect, it } from 'vitest';
import { CrankNicolsonStepper, createPsiGrid, normSquared, energyExpectation, normalize, type Stepper } from '../src';

const stepper: Stepper = new CrankNicolsonStepper();
function state(count = 33) {
  const psi = createPsiGrid(count, 0.2, -3);
  for (let i = 1; i < count - 1; i++) {
    psi.values[2 * i] = Math.sin(i * 0.31);
    psi.values[2 * i + 1] = Math.cos(i * 0.17);
  }
  return psi;
}

describe('Crank–Nicolson evolution', () => {
  it('dt=0 is an exact no-op, including for an unnormalized state', () => {
    const psi = state(), before = psi.values.slice();
    stepper.step(psi, new Float64Array(psi.count), 0);
    expect(psi.values).toEqual(before);
  });
  it('agrees with an independent two-by-two calculation', () => {
    // dx=1, V=0: H=[[1,-1/2],[-1/2,1]]. dt=2 and psi=[1,0].
    // A=[[1+i,-i/2],[-i/2,1+i]], rhs=[1-i,i/2].
    // Cramer's rule gives x=[(7-56i)/65,(32+4i)/65].
    const psi = createPsiGrid(4, 1);
    psi.values[2] = 1;
    stepper.step(psi, new Float64Array(4), 2);
    const expected = [0, 0, 7 / 65, -56 / 65, 32 / 65, 4 / 65, 0, 0];
    expected.forEach((value, i) => expect(Math.abs(psi.values[i]! - value)).toBeLessThan(2e-15));
  });
  it('preserves norm and static-H energy over 1000 steps without normalization', () => {
    const psi = state(65);
    normalize(psi);
    // A nonuniform real static potential, not a new application preset.
    const potential = Float64Array.from({ length: psi.count }, (_, i) => 0.02 * i + Math.sin(i * 0.2));
    const beforeV = potential.slice();
    const n0 = normSquared(psi), e0 = energyExpectation(psi, potential).real;
    let normDrift = 0, energyDrift = 0;
    for (let k = 0; k < 1000; k++) {
      stepper.step(psi, potential, 0.01);
      normDrift = Math.max(normDrift, Math.abs(normSquared(psi) - n0));
      energyDrift = Math.max(energyDrift, Math.abs(energyExpectation(psi, potential).real - e0));
      expect([psi.values[0], psi.values[1], psi.values.at(-2), psi.values.at(-1)]).toEqual([0, 0, 0, 0]);
    }
    // Conservative accumulated roundoff budgets, not discretization tolerances.
    expect(normDrift).toBeLessThan(2e-12 * n0);
    expect(energyDrift).toBeLessThan(2e-12 * Math.max(1, Math.abs(e0)));
    expect(potential).toEqual(beforeV);
  });
  it.each([1, 7, 30])('has the exact Cayley phase and stationary eigenstate density for mode %s', mode => {
    const psi = createPsiGrid(33, 0.3, -2);
    for (let i = 1; i < psi.count - 1; i++) {
      const s = Math.sin(mode * Math.PI * i / (psi.count - 1));
      psi.values[2 * i] = s;
      psi.values[2 * i + 1] = 0.4 * s;
    }
    const initial = psi.values.slice();
    const e = (1 - Math.cos(mode * Math.PI / (psi.count - 1))) / psi.dx ** 2;
    const a = 0.03 * e / 2;
    const gr = (1 - a * a) / (1 + a * a), gi = -2 * a / (1 + a * a);
    let pr = 1, pi = 0;
    for (let k = 0; k < 100; k++) {
      stepper.step(psi, new Float64Array(psi.count), 0.03);
      [pr, pi] = [pr * gr - pi * gi, pr * gi + pi * gr];
      for (let i = 0; i < psi.count; i++) {
        const r = initial[2 * i]!, s = initial[2 * i + 1]!;
        expect(Math.abs(psi.values[2 * i]! - (pr * r - pi * s))).toBeLessThan(2e-12);
        expect(Math.abs(psi.values[2 * i + 1]! - (pr * s + pi * r))).toBeLessThan(2e-12);
        expect(Math.abs(psi.values[2 * i]! ** 2 + psi.values[2 * i + 1]! ** 2 - r * r - s * s)).toBeLessThan(2e-12);
      }
    }
  });
  it('reverses forward evolution with negative dt', () => {
    const psi = state(), original = psi.values.slice(), v = new Float64Array(psi.count).fill(0.7);
    for (let k = 0; k < 100; k++) stepper.step(psi, v, 0.02);
    for (let k = 0; k < 100; k++) stepper.step(psi, v, -0.02);
    original.forEach((value, i) => expect(Math.abs(psi.values[i]! - value)).toBeLessThan(2e-12));
  });
  it('works on a three-point grid without normalizing', () => {
    const psi = createPsiGrid(3, 1);
    psi.values[2] = 2;
    // E=1, dt=2, g=-i.
    stepper.step(psi, new Float64Array(3), 2);
    expect(psi.values).toEqual(new Float64Array([0, 0, 0, -2, 0, 0]));
  });
  it.each([NaN, Infinity, -Infinity])('rejects invalid dt %s atomically', dt => {
    const psi = state(), before = psi.values.slice();
    expect(() => stepper.step(psi, new Float64Array(psi.count), dt)).toThrow(/dt/);
    expect(psi.values).toEqual(before);
  });
  it('rejects malformed grids, potentials, states and endpoints even at dt=0', () => {
    const valid = state();
    const cases = [
      { psi: { ...valid, count: 2 }, v: new Float64Array(2), error: /count/ },
      { psi: { ...valid, dx: 0 }, v: new Float64Array(valid.count), error: /dx/ },
      { psi: { ...valid, x0: NaN }, v: new Float64Array(valid.count), error: /x0/ },
      { psi: { ...valid, values: new Float64Array(3) }, v: new Float64Array(valid.count), error: /length/ },
      { psi: state(), v: new Float64Array(2), error: /potential/ },
    ];
    for (const { psi, v, error } of cases) {
      const before = psi.values.slice();
      expect(() => stepper.step(psi, v, 0)).toThrow(error);
      expect(psi.values).toEqual(before);
    }
    for (const index of [0, 1, valid.values.length - 2, valid.values.length - 1, 4]) {
      const psi = state(); psi.values[index] = index === 4 ? NaN : 1e-30;
      const before = psi.values.slice();
      expect(() => stepper.step(psi, new Float64Array(psi.count), 0)).toThrow(index === 4 ? /finite/ : /Dirichlet/);
      expect(psi.values).toEqual(before);
    }
    const v = new Float64Array(valid.count); v[3] = Infinity;
    expect(() => stepper.step(valid, v, 0)).toThrow(/potential/);
  });
  it('does not partially update the state on arithmetic overflow', () => {
    const psi = state(), before = psi.values.slice();
    expect(() => stepper.step(psi, new Float64Array(psi.count).fill(1e308), 1e308)).toThrow(RangeError);
    expect(psi.values).toEqual(before);
  });
});
