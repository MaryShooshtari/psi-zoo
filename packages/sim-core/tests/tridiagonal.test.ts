import { describe, expect, it } from 'vitest';
import { solveTridiagonal } from '../src';

const f = (values: number[]) => new Float64Array(values);

// Independent matrix-vector product, without using solver arithmetic helpers.
function multiply(d: Float64Array, l: Float64Array, u: Float64Array, x: Float64Array) {
  const rhs = new Float64Array(d.length);
  for (let i = 0; i < d.length / 2; i++) {
    for (const [a, entry, j] of [[d, i, i], [l, i - 1, i - 1], [u, i, i + 1]] as const) {
      if (j < 0 || j >= d.length / 2) continue;
      rhs[2 * i]! += a[2 * entry]! * x[2 * j]! - a[2 * entry + 1]! * x[2 * j + 1]!;
      rhs[2 * i + 1]! += a[2 * entry]! * x[2 * j + 1]! + a[2 * entry + 1]! * x[2 * j]!;
    }
  }
  return rhs;
}

function check(d: Float64Array, l: Float64Array, u: Float64Array, rhs: Float64Array, expected: Float64Array) {
  const inputs = [d, l, u, rhs];
  const copies = inputs.map(a => a.slice());
  const { x } = solveTridiagonal(d, l, u, rhs);
  expect(x).toBeInstanceOf(Float64Array);
  expect(x.length).toBe(expected.length);
  const scale = Math.max(...Array.from(expected, Math.abs));
  for (let i = 0; i < x.length; i++) {
    expect(Math.abs(x[i]! - expected[i]!)).toBeLessThanOrEqual(1e-12 * scale);
  }
  const ax = multiply(d, l, u, x);
  let matrixNorm = 0;
  let xNorm = 0;
  let rhsNorm = 0;
  let residual = 0;
  for (let i = 0; i < d.length / 2; i++) {
    const mag = (a: Float64Array, j: number) => Math.hypot(a[2 * j]!, a[2 * j + 1]!);
    matrixNorm = Math.max(matrixNorm, mag(d, i) + (i > 0 ? mag(l, i - 1) : 0) + (i < d.length / 2 - 1 ? mag(u, i) : 0));
    xNorm = Math.max(xNorm, mag(x, i));
    rhsNorm = Math.max(rhsNorm, mag(rhs, i));
    residual = Math.max(residual, Math.hypot(ax[2 * i]! - rhs[2 * i]!, ax[2 * i + 1]! - rhs[2 * i + 1]!));
  }
  expect(residual).toBeLessThanOrEqual(1e-13 * (matrixNorm * xNorm + rhsNorm));
  inputs.forEach((a, i) => expect(a).toEqual(copies[i]));
}

describe('complex tridiagonal Thomas solver', () => {
  it('solves a hand-calculated complex two-element system', () => {
    // A=[[2+i, 1-i], [i, 3-i]], x=[1+i, 2-i], rhs=[2, 4-4i].
    check(f([2, 1, 3, -1]), f([0, 1]), f([1, -1]), f([2, 0, 4, -4]), f([1, 1, 2, -1]));
  });
  it('solves a real three-element system', () => {
    check(f([2, 0, 2, 0, 2, 0]), f([-1, 0, -1, 0]), f([-1, 0, -1, 0]), f([1, 0, 0, 0, 1, 0]), f([1, 0, 1, 0, 1, 0]));
  });
  it('solves a complex diagonal system', () => {
    check(f([1, 1, 2, -2, 3, 3]), new Float64Array(4), new Float64Array(4), f([1, 1, 2, -2, 3, 3]), f([1, 0, 1, 0, 1, 0]));
  });
  it.each([1e-200, 1, 1e200])('solves a single element at scale %s without squared-modulus overflow/underflow', scale => {
    check(f([2 * scale, 3 * scale]), f([]), f([]), f([4 * scale, 6 * scale]), f([2, 0]));
  });
  it.each([1, 2, 64, 2048])('recovers a manufactured asymmetric complex solution for N=%s', n => {
    const d = new Float64Array(2 * n);
    const l = new Float64Array(2 * (n - 1));
    const u = new Float64Array(l.length);
    const x = new Float64Array(2 * n);
    for (let i = 0; i < n; i++) {
      d.set([4 + i / n, -0.7], 2 * i);
      x.set([Math.cos(i), Math.sin(2 * i)], 2 * i);
      if (i < n - 1) { l.set([-0.5, 0.2], 2 * i); u.set([0.3, -0.4], 2 * i); }
    }
    check(d, l, u, multiply(d, l, u, x), x);
  });
  it('solves a representative I+i*dt*H/2 interior matrix (not a time stepper)', () => {
    const n = 32, dx = 0.2, dt = 0.03;
    const d = new Float64Array(2 * n), l = new Float64Array(2 * (n - 1)), u = new Float64Array(l.length), x = new Float64Array(2 * n);
    for (let i = 0; i < n; i++) {
      d.set([1, dt / 2 * (1 / dx ** 2 + i / n)], 2 * i);
      x.set([Math.sin(i + 1), Math.cos(i + 1)], 2 * i);
      if (i < n - 1) { l[2 * i + 1] = -dt / (4 * dx ** 2); u[2 * i + 1] = l[2 * i + 1]!; }
    }
    check(d, l, u, multiply(d, l, u, x), x);
  });
  it.each([[0, 0, 0, 0], [3, 0, 0, 3], [4, 0, 2, 4], [4, 2, 0, 4], [4, 1, 2, 4], [4, 2, 3, 4], [4, 2, 2, 3]])('rejects invalid lengths %s,%s,%s,%s', (d, l, u, r) => {
    expect(() => solveTridiagonal(new Float64Array(d), new Float64Array(l), new Float64Array(u), new Float64Array(r))).toThrow(RangeError);
  });
  it.each([NaN, Infinity, -Infinity])('rejects nonfinite input %s in every array', bad => {
    for (let a = 0; a < 4; a++) {
      const arrays = [f([2, 0, 2, 0]), f([-1, 0]), f([-1, 0]), f([1, 0, 1, 0])] as const;
      arrays[a]![1] = bad;
      expect(() => solveTridiagonal(...arrays)).toThrow(RangeError);
    }
  });
  it.each([0, 1e-20])('rejects initial unsafe pivot %s even for a nonsingular matrix', pivot => {
    expect(() => solveTridiagonal(f([pivot, 0, 2, 0]), f([1, 0]), f([1, 0]), f([1, 0, 1, 0]))).toThrow(/pivot.*0/i);
  });
  it.each([1, 1 + Number.EPSILON])('rejects zero or cancellation-small eliminated pivot %s', last => {
    expect(() => solveTridiagonal(f([1, 0, last, 0]), f([1, 0]), f([1, 0]), f([1, 0, 1, 0]))).toThrow(/pivot.*1/i);
  });
  it('rejects a singular scalar', () => {
    expect(() => solveTridiagonal(f([0, 0]), f([]), f([]), f([0, 0]))).toThrow(RangeError);
  });
  it('throws rather than returning an overflowing solution', () => {
    expect(() => solveTridiagonal(f([1e-200, 0]), f([]), f([]), f([1e200, 0]))).toThrow(RangeError);
  });
});
