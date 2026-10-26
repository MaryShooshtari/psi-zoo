import { expect, it } from 'vitest';
import { createPsiGrid, createBasisQubit, normalize, normSquared } from '@psi-zoo/sim-core';
import { TwoCreatureWorld } from './twoCreatureWorld';

it('observes only the chosen owned spatial state, transactionally at the same world time', () => {
  const psi = createPsiGrid(7, 0.5, -1.5); psi.values[4] = 1; psi.values[8] = 1; normalize(psi);
  const initial = { psi, mood: createBasisQubit(0), moodHamiltonian: { ax: 0.7, ay: 0, az: 0 }, drive: { forceScale: 0 } };
  const w = new TwoCreatureWorld({ a: initial, b: initial, coupling: 2 }); w.step(new Float64Array(7));
  const before = w.snapshot();
  for (const resolution of [0, NaN]) {
    expect(() => w.observePosition('a', resolution, () => 0.5)).toThrow(RangeError);
    expect(w.snapshot()).toEqual(before);
  }
  expect(() => w.observePosition('z' as 'a', 0.2, () => 0.5)).toThrow(RangeError);
  expect(() => w.observePosition('b', 0.2, () => 1)).toThrow(RangeError);
  expect(w.snapshot()).toEqual(before);
  const result = w.observePosition('b', 0.2, () => 0.5), after = w.snapshot();
  expect(after.a).toEqual(before.a); expect(after.b.mood).toEqual(before.b.mood);
  expect(after.time).toBe(before.time); expect(after.a.time).toBe(after.b.time);
  expect(Math.abs(normSquared(after.b.psi) - 1)).toBeLessThan(2e-15);
  expect(after.b.psi.values).toEqual(result.state.values);
  result.state.values.fill(0); expect(w.snapshot()).toEqual(after);
});
