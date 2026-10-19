import { describe, expect, it } from 'vitest';
import { createPsiGrid, normSquared } from '../src';

describe('PsiGrid smoke tests', () => {
  it('uses a double-precision, interleaved grid', () => {
    const grid = createPsiGrid(8, 0.25, -1);
    expect(grid.values).toBeInstanceOf(Float64Array);
    expect(grid.values.length).toBe(16);
    expect(grid.x0).toBe(-1);
  });

  it('includes dx in the discrete norm', () => {
    const grid = createPsiGrid(4, 0.5);
    grid.values[0] = 1;
    grid.values[2] = 1;
    expect(normSquared(grid)).toBe(1);
  });

  it('rejects invalid spacings', () => {
    expect(() => createPsiGrid(4, 0)).toThrow(RangeError);
  });
});
