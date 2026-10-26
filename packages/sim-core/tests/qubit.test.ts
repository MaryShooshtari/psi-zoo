import { describe, expect, it } from 'vitest';
import {
  createQubitState, createBasisQubit, validateQubitState, qubitNormSquared,
  evolveQubit, blochVector, type QubitState, type QubitHamiltonian,
} from '../src';

const zero = { ax: 0, ay: 0, az: 0 };
const initial = () => createQubitState({ real: 0.3, imag: -0.4 }, { real: -0.2, imag: 0.7 });
// Absolute roundoff budgets: a few dozen double-precision operations per step.
const SINGLE_STEP = 3e-15;
const MANY_STEPS = 2e-11; // 10,000 steps; no normalization or coordinate clipping.

function close(actual: ArrayLike<number>, expected: ArrayLike<number>, tolerance = SINGLE_STEP) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < actual.length; i++) expect(Math.abs(actual[i]! - expected[i]!)).toBeLessThan(tolerance);
}

function coordinates(state: QubitState) {
  const { x, y, z } = blochVector(state);
  return [x, y, z];
}

// Independent SO(3) reference: right-handed rotation by +2|a|t about a.
function rodrigues(r: number[], field: QubitHamiltonian, t: number) {
  const magnitude = Math.hypot(field.ax, field.ay, field.az);
  const n = [field.ax / magnitude, field.ay / magnitude, field.az / magnitude];
  const angle = 2 * magnitude * t, c = Math.cos(angle), s = Math.sin(angle);
  const dot = n.reduce((sum, value, i) => sum + value * r[i]!, 0);
  const cross = [n[1]! * r[2]! - n[2]! * r[1]!, n[2]! * r[0]! - n[0]! * r[2]!, n[0]! * r[1]! - n[1]! * r[0]!];
  return r.map((value, i) => c * value + s * cross[i]! + (1 - c) * dot * n[i]!);
}

describe('pure qubit core, hbar=1 and H=a dot sigma (no factor 1/2)', () => {
  it('constructs normalized complex states, owns its storage, and creates both basis states', () => {
    const alpha = { real: 3, imag: 4 }, beta = { real: 0, imag: -12 };
    const state = createQubitState(alpha, beta);
    close(state.values, [3 / 13, 4 / 13, 0, -12 / 13]);
    alpha.real = 9; beta.imag = 9;
    close(state.values, [3 / 13, 4 / 13, 0, -12 / 13]);
    expect(state.values).toBeInstanceOf(Float64Array);
    expect(validateQubitState(state)).toBeUndefined();
    close(createBasisQubit(0).values, [1, 0, 0, 0]);
    close(createBasisQubit(1).values, [0, 0, 1, 0]);
    const other = createBasisQubit(0);
    other.values[0] = 0;
    expect(createBasisQubit(0).values[0]).toBe(1);
  });

  it.each([Number.MIN_VALUE, 1e-300, 1e300, Number.MAX_VALUE])('normalizes finite nonzero amplitudes at scale %s without overflow/underflow', scale => {
    const state = createQubitState({ real: scale, imag: scale }, { real: -scale, imag: scale });
    close(state.values, [0.5, 0.5, -0.5, 0.5]);
  });

  it('extracts all six signed Cartesian Bloch directions with the specified y convention', () => {
    close(coordinates(createBasisQubit(0)), [0, 0, 1]);
    close(coordinates(createBasisQubit(1)), [0, 0, -1]);
    for (const sign of [-1, 1]) {
      close(coordinates(createQubitState({ real: 1, imag: 0 }, { real: sign, imag: 0 })), [sign, 0, 0]);
      close(coordinates(createQubitState({ real: 1, imag: 0 }, { real: 0, imag: sign })), [0, sign, 0]);
    }
  });

  it.each([-1.3, 0.25, Math.PI / 4, Math.PI / 2])('matches analytic x/y/z precession, including sign and factor two, t=%s', t => {
    const north = createBasisQubit(0);
    const plus = createQubitState({ real: 1, imag: 0 }, { real: 1, imag: 0 });
    close(evolveQubit(north, { ...zero, ax: 1 }, t).values, [Math.cos(t), 0, 0, -Math.sin(t)]);
    close(coordinates(evolveQubit(north, { ...zero, ax: 1 }, t)), [0, -Math.sin(2 * t), Math.cos(2 * t)]);
    close(evolveQubit(north, { ...zero, ay: 1 }, t).values, [Math.cos(t), 0, Math.sin(t), 0]);
    close(coordinates(evolveQubit(north, { ...zero, ay: 1 }, t)), [Math.sin(2 * t), 0, Math.cos(2 * t)]);
    close(coordinates(evolveQubit(plus, { ...zero, az: 1 }, t)), [Math.cos(2 * t), Math.sin(2 * t), 0]);
    close(evolveQubit(north, { ...zero, az: 1 }, t).values, [Math.cos(t), -Math.sin(t), 0, 0]);
  });

  it.each([
    { ax: 0.7, ay: -1.1, az: 0.3 },
    { ax: -0.2, ay: 0.4, az: -1.3 },
  ])('matches independent general-axis Rodrigues rotation for %o', field => {
    const state = initial();
    for (const t of [-2, -0.01, 0.3, 1.7]) {
      close(coordinates(evolveQubit(state, field, t)), rodrigues(coordinates(state), field, t), 5e-15);
    }
  });

  it('preserves norm and unit Bloch radius throughout 10,000 steps without normalization', () => {
    for (const field of [{ ax: 0.7, ay: -1.1, az: 0.3 }, { ax: 0, ay: 0.9, az: 0 }]) {
      let state = initial();
      const start = state, n0 = qubitNormSquared(state);
      let maxNormDrift = 0, maxRadiusDrift = 0;
      for (let k = 0; k < 10000; k++) {
        state = evolveQubit(state, field, 0.013);
        maxNormDrift = Math.max(maxNormDrift, Math.abs(qubitNormSquared(state) - n0));
        maxRadiusDrift = Math.max(maxRadiusDrift, Math.abs(Math.hypot(...coordinates(state)) - 1));
      }
      expect(maxNormDrift).toBeLessThan(MANY_STEPS);
      expect(maxRadiusDrift).toBeLessThan(MANY_STEPS);
      close(coordinates(state), rodrigues(coordinates(start), field, 130), MANY_STEPS);
    }
  });

  it('does not silently renormalize accepted roundoff-sized norm deviations', () => {
    const state = createBasisQubit(0);
    state.values[0] = 1 + 1e-12;
    validateQubitState(state);
    const evolved = evolveQubit(state, { ...zero, ax: 0.7 }, 0.2);
    expect(qubitNormSquared(evolved)).toBeGreaterThan(1 + 1e-12);
    expect(Math.abs(qubitNormSquared(evolved) - qubitNormSquared(state))).toBeLessThan(SINGLE_STEP);
    expect(blochVector(state).z).toBe(qubitNormSquared(state));
  });

  it('zero field and zero time return exact independent copies without modifying inputs', () => {
    const state = initial(), before = state.values.slice();
    const field = { ax: 0.7, ay: -1.1, az: 0.3 }, fieldBefore = { ...field };
    for (const result of [evolveQubit(state, zero, 1e308), evolveQubit(state, field, 0)]) {
      expect(result.values).toEqual(before);
      expect(result.values.buffer).not.toBe(state.values.buffer);
      result.values[0] = 9;
    }
    evolveQubit(state, field, 0.3);
    expect(state.values).toEqual(before);
    expect(field).toEqual(fieldBefore);
  });

  it('handles tiny and huge fields without division by zero or overflowing the field norm', () => {
    const state = initial();
    for (const scale of [1e-300, 1e300, Number.MAX_VALUE]) {
      const dt = 0.5 / scale;
      close(evolveQubit(state, { ax: scale, ay: -scale, az: scale }, dt).values,
        evolveQubit(state, { ax: 1, ay: -1, az: 1 }, 0.5).values);
    }
    close(evolveQubit(state, { ...zero, ay: Number.MIN_VALUE }, 1).values, state.values);
  });

  it('reverses evolution with negative time and obeys composition for a static field', () => {
    const state = initial(), field = { ax: 0.7, ay: -1.1, az: 0.3 };
    let evolved = state;
    for (let k = 0; k < 100; k++) evolved = evolveQubit(evolved, field, 0.017);
    for (let k = 0; k < 100; k++) evolved = evolveQubit(evolved, field, -0.017);
    close(evolved.values, state.values, 1e-13);
    close(evolveQubit(evolveQubit(state, field, 0.2), field, 0.3).values,
      evolveQubit(state, field, 0.5).values);
  });

  it('Bloch coordinates are invariant under global phase before and after evolution', () => {
    const state = initial(), field = { ax: 0.7, ay: -1.1, az: 0.3 };
    for (const phase of [-Math.PI, -0.7, 0.2, 2.9]) {
      const c = Math.cos(phase), s = Math.sin(phase), v = state.values;
      const phased = createQubitState(
        { real: c * v[0]! - s * v[1]!, imag: s * v[0]! + c * v[1]! },
        { real: c * v[2]! - s * v[3]!, imag: s * v[2]! + c * v[3]! },
      );
      close(coordinates(phased), coordinates(state));
      close(coordinates(evolveQubit(phased, field, 0.8)), coordinates(evolveQubit(state, field, 0.8)));
    }
  });

  it('is bit-for-bit deterministic for repeated execution in this runtime', () => {
    const run = () => {
      let state = initial();
      for (let k = 0; k < 1000; k++) state = evolveQubit(state, { ax: Math.sin(k), ay: 0.2, az: -0.4 }, 0.01);
      return { state, bloch: blochVector(state) };
    };
    expect(run()).toEqual(run());
  });

  it('rejects zero/nonfinite initial amplitudes and invalid basis indices', () => {
    expect(() => createQubitState({ real: 0, imag: 0 }, { real: 0, imag: 0 })).toThrow(RangeError);
    for (const value of [NaN, Infinity, -Infinity]) {
      for (let i = 0; i < 4; i++) {
        const v = [1, 0, 0, 0]; v[i] = value;
        expect(() => createQubitState({ real: v[0]!, imag: v[1]! }, { real: v[2]!, imag: v[3]! })).toThrow(RangeError);
      }
    }
    for (const value of [-1, 2, 0.5, NaN]) expect(() => createBasisQubit(value as 0 | 1)).toThrow(RangeError);
  });

  it('validates malformed, nonfinite and nonnormalized state storage without mutation, even at dt=0', () => {
    const badValues = [[], [1, 0, 0], [1, 0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 0, 0],
      [1 + 1e-8, 0, 0, 0], [1e-300, 0, 0, 0], [1e300, 0, 0, 0]];
    for (const value of [NaN, Infinity, -Infinity]) {
      for (let i = 0; i < 4; i++) { const v = [1, 0, 0, 0]; v[i] = value; badValues.push(v); }
    }
    for (const values of badValues) {
      const state = { values: new Float64Array(values) }, before = state.values.slice();
      expect(() => validateQubitState(state)).toThrow(RangeError);
      expect(() => blochVector(state)).toThrow(RangeError);
      expect(() => evolveQubit(state, zero, 0)).toThrow(RangeError);
      expect(state.values).toEqual(before);
    }
    expect(() => qubitNormSquared({ values: new Float64Array(3) })).toThrow(RangeError);
  });

  it('rejects nonfinite fields/time and unrepresentable angles atomically, even for no-op inputs', () => {
    const state = initial(), before = state.values.slice();
    for (const value of [NaN, Infinity, -Infinity]) {
      for (const key of ['ax', 'ay', 'az'] as const) {
        expect(() => evolveQubit(state, { ...zero, [key]: value }, 0)).toThrow(RangeError);
      }
      expect(() => evolveQubit(state, zero, value)).toThrow(RangeError);
    }
    expect(() => evolveQubit(state, { ...zero, ax: 1e308 }, 1e308)).toThrow(RangeError);
    expect(state.values).toEqual(before);
  });
});
