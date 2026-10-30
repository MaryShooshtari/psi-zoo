import { describe, expect, it } from 'vitest';
import { createPsiGrid2D, validateState2D, validatePotential2D } from '../src/grid2d';

describe('complete indexed 2D finite-value validation', () => {
  it('rejects nonfinite entries at every position without changing buffers', () => {
    const g = createPsiGrid2D({ nx: 3, ny: 2 });
    for (const kind of ['state', 'potential'] as const) {
      const values = kind === 'state' ? g.values : new Float64Array(g.nx * g.ny);
      const validate = () => kind === 'state' ? validateState2D(g) : validatePotential2D(g, values);
      for (let k = 0; k < values.length; k++) for (const invalid of [NaN, Infinity, -Infinity]) {
        values.fill(0); values[k] = invalid;
        const before = values.slice();
        expect(validate).toThrow(RangeError);
        expect(values).toEqual(before);
      }
    }
  });
  it('accepts finite extremes and signed zero without writes; retains size errors', () => {
    const g = createPsiGrid2D({ nx: 3, ny: 2 });
    const entries = [-0, 0, Number.MIN_VALUE, -Number.MIN_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE];
    g.values.set([...entries, ...entries]);
    const potential = new Float64Array(entries), before = g.values.slice();
    expect(() => validateState2D(g)).not.toThrow();
    expect(() => validatePotential2D(g, potential)).not.toThrow();
    expect(g.values).toEqual(before); expect(potential).toEqual(new Float64Array(entries));
    expect(() => validateState2D({ ...g, values: new Float64Array(11) })).toThrow('2D state size must equal 2*nx*ny');
    expect(() => validatePotential2D(g, new Float64Array(5))).toThrow('2D potential size must equal nx*ny');
  });
});
