import { describe, expect, it } from 'vitest';
import { createPsiGrid2D, composeEffectivePotential2D, createInteractionWorkspace2D, creatureParameters2D, drivePotentialAt2D, socialPotentialAt2D,
  createBasisQubit, createQubitState, evolveQubit, blochVector, qubitNormSquared,
  type InteractionSettings2D, type InteractionSource2D } from '../src';
declare const console: { log(...args: unknown[]): void };
const settings: InteractionSettings2D = { drives: true, social: true, strength: 3, range: 2 };
const source = (id: string, x = 0, sz = 1): InteractionSource2D => ({ id, x, y: 0, sz,
  parameters: creatureParameters2D({ driveStrength: 0.3, preferredDirection: { x: 2, y: 0 }, moodFrequency: 0.8 }) });

describe('reused qubit engine with Hm=(omega/2) sigma_x', () => {
  it('matches analytic amplitudes/Bloch precession, zero frequency and deterministic replay', () => {
    const omega = 0.8, t = 1.3, initial = createBasisQubit(0), field = { ax: omega / 2, ay: 0, az: 0 };
    const m = evolveQubit(initial, field, t), b = blochVector(m);
    expect(m.values[0]).toBeCloseTo(Math.cos(omega * t / 2), 14); expect(m.values[3]).toBeCloseTo(-Math.sin(omega * t / 2), 14);
    expect(b.y).toBeCloseTo(-Math.sin(omega * t), 14); expect(b.z).toBeCloseTo(Math.cos(omega * t), 14);
    expect(evolveQubit(initial, field, t).values).toEqual(m.values);
    expect(evolveQubit(initial, { ax: 0, ay: 0, az: 0 }, 100).values).toEqual(initial.values);
    expect(Math.hypot(b.x, b.y, b.z)).toBeCloseTo(1, 14);
    const complex = createQubitState({ real: 1, imag: 1 }, { real: -2, imag: 0.5 }); expect(qubitNormSquared(complex)).toBeCloseTo(1, 14);
  });
  it('preserves norm/radius for 10,000 steps without renormalization', () => {
    let mood = createBasisQubit(0), max = 0;
    for (let k = 0; k < 10000; k++) { mood = evolveQubit(mood, { ax: 0.4, ay: 0, az: 0 }, 1 / 120); const b = blochVector(mood); max = Math.max(max, Math.abs(qubitNormSquared(mood) - 1), Math.abs(Math.hypot(b.x, b.y, b.z) - 1)); }
    console.log('5C mood norm/radius max drift', max); expect(max).toBeLessThan(1e-10);
  });
  it('rejects invalid frequency/strength/direction and nonfinite/nonunit moods', () => {
    for (const moodFrequency of [NaN, Infinity]) expect(() => creatureParameters2D({ ...source('a').parameters, moodFrequency })).toThrow();
    for (const driveStrength of [-1, 2, Infinity]) expect(() => creatureParameters2D({ ...source('a').parameters, driveStrength })).toThrow();
    expect(() => creatureParameters2D({ ...source('a').parameters, preferredDirection: { x: NaN, y: 0 } })).toThrow();
    expect(() => creatureParameters2D({ ...source('a').parameters, preferredDirection: { x: 0, y: 0 } })).toThrow();
    expect(() => evolveQubit({ values: new Float64Array([NaN, 0, 0, 0]) }, { ax: 1, ay: 0, az: 0 }, 0.1)).toThrow();
    expect(() => evolveQubit({ values: new Float64Array([2, 0, 0, 0]) }, { ax: 1, ay: 0, az: 0 }, 0.1)).toThrow();
  });
});
describe('2D drive and centroid mean-field potentials', () => {
  it('gradient gives +F sz d; reversing mood or direction reverses force; zero drive is exact', () => {
    const g = createPsiGrid2D(), a = source('a'), h = 0.01;
    const force = (s: InteractionSource2D) => -(drivePotentialAt2D(g, s, settings, h, 0) - drivePotentialAt2D(g, s, settings, -h, 0)) / (2 * h);
    expect(force(a)).toBeCloseTo(0.3, 14); expect(force({ ...a, sz: -1 })).toBeCloseTo(-0.3, 14);
    expect(force({ ...a, parameters: { ...a.parameters, preferredDirection: { x: -1, y: 0 } } })).toBeCloseTo(-0.3, 14);
    expect(Math.abs(force({ ...a, parameters: { ...a.parameters, driveStrength: 0 } }))).toBe(0);
  });
  it('social sign, center, no self-interaction, zero strength and physical force direction', () => {
    const a = source('a', -1.5), b = source('b', 1.5), sources = [a, b];
    expect(socialPotentialAt2D(a, [a], settings, a.x, a.y)).toBe(0);
    expect(socialPotentialAt2D(a, sources, settings, b.x, b.y)).toBe(-3);
    expect(socialPotentialAt2D(a, [a, { ...b, sz: -1 }], settings, b.x, b.y)).toBe(3);
    expect(socialPotentialAt2D(a, sources, { ...settings, strength: 0 }, 0, 0)).toBe(0);
    expect(socialPotentialAt2D(a, sources, settings, b.x - 0.2, b.y)).toBeCloseTo(socialPotentialAt2D(a, sources, settings, b.x + 0.2, b.y), 14);
    const h = 0.01;
    const force = -(socialPotentialAt2D(a, sources, settings, a.x + h, 0) - socialPotentialAt2D(a, sources, settings, a.x - h, 0)) / (2 * h);
    expect(force).toBeGreaterThan(0); // A is left of B: same-sign attraction points right.
    expect(-(socialPotentialAt2D(a, [a, { ...b, sz: -1 }], settings, a.x + h, 0) - socialPotentialAt2D(a, [a, { ...b, sz: -1 }], settings, a.x - h, 0)) / (2 * h)).toBeLessThan(0);
  });
  it('adds signed terrain without changing it, never clamps total H, independent of source order', () => {
    const g = createPsiGrid2D({ nx: 23, ny: 17 }), terrain = Float64Array.from({ length: 391 }, (_, k) => k % 2 ? 20 : -20), original = terrain.slice();
    const a = source('a', -1), b = source('b', 1, -1), c = source('c', 2), out = new Float64Array(391), reverse = new Float64Array(391);
    composeEffectivePotential2D(g, terrain, a, [a, b, c], settings, out); composeEffectivePotential2D(g, terrain, a, [c, b, a], settings, reverse);
    expect(out).toEqual(reverse);
    // Independent direct exp(-(X²+Y²)/2) reference checks the separable optimization.
    for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
      const k = j * g.nx + i, x = g.xmin + (i + 1) * g.dx, y = g.ymin + (j + 1) * g.dy;
      const expected = terrain[k]! + drivePotentialAt2D(g, a, settings, x, y) + socialPotentialAt2D(a, [a, b, c], settings, x, y);
      expect(Math.abs(out[k]! - expected)).toBeLessThan(2e-14);
    }
    expect(terrain).toEqual(original); expect(out.every(Number.isFinite)).toBe(true); expect(out.some(v => Math.abs(v) > 20)).toBe(true);
    const zero = new Float64Array(391); composeEffectivePotential2D(g, terrain, a, [a, b], { ...settings, drives: false, social: false }, zero); expect(zero).toEqual(terrain);
    expect(() => composeEffectivePotential2D(g, terrain, a, [a, b], { ...settings, range: 0 }, out)).toThrow();
    expect(() => composeEffectivePotential2D(g, terrain, a, [a, a], settings, out)).toThrow();
    expect(() => composeEffectivePotential2D(g, terrain, a, [a, b], settings, terrain)).toThrow();
    expect(() => composeEffectivePotential2D(g, terrain, a, [a, b], { ...settings, strength: Infinity }, out)).toThrow();
    expect(() => composeEffectivePotential2D(g, terrain, a, [a, { ...b, sz: 2 }], settings, out)).toThrow();
    const workspace = createInteractionWorkspace2D(g);
    expect(() => composeEffectivePotential2D(g, terrain, a, [a, b], settings, out, { ...workspace, x: out.subarray(0, g.nx) })).toThrow(/disjoint/);
    expect(() => composeEffectivePotential2D(g, terrain, a, [a, b], settings, out, { ...workspace, y: new Float64Array(1) })).toThrow(/sized/);
  });
});
