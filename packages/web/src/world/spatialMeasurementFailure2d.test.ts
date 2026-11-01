import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPsiGrid2D, measurePosition2D, type PositionMeasurement2DStage, type PsiGrid2D } from '@psi-zoo/sim-core';
import { QuantumWorld2D } from './world2d';
import { createWorldPreset2D } from './worldPresets2d';
import { createSeededRandom } from '../random';
import { SimulationPlayback2D } from '../simulation2d';

// Isolated test module: only the new detector export is replaced. No shipped
// fault hooks, RNG injection or edits to the registry/controller/core solver.
const fault = vi.hoisted(() => ({
  mode: 'normal' as 'normal' | 'staged' | 'unexpected', draws: 0,
  stage: 'posterior' as PositionMeasurement2DStage,
  error: new Error('unexpected detector bug'), seen: [] as number[], inputs: [] as PsiGrid2D[],
}));
vi.mock('@psi-zoo/sim-core', async importOriginal => {
  const actual = await importOriginal<typeof import('@psi-zoo/sim-core')>();
  return { ...actual, measurePosition2D: vi.fn((...args: Parameters<typeof actual.measurePosition2D>) => {
    fault.inputs.push(args[0]);
    if (fault.mode === 'normal') return actual.measurePosition2D(...args);
    for (let k = 0; k < fault.draws; k++) fault.seen.push(args[3]());
    if (fault.mode === 'unexpected') throw fault.error;
    throw new actual.PositionMeasurement2DError(fault.stage, 'injected precommit numerical failure');
  }) };
});
beforeEach(() => {
  fault.mode = 'normal'; fault.draws = 0; fault.stage = 'posterior';
  fault.seen.length = 0; fault.inputs.length = 0; vi.clearAllMocks();
});
const geometry = () => createPsiGrid2D({ nx: 20, ny: 17 });
function make() {
  const g = geometry();
  return new QuantumWorld2D(g, { ...createWorldPreset2D(g, 'mood'), spatialMeasurementSeed: 42 });
}
function spatial(w: QuantumWorld2D) { return w.ids.map(id => w.spatialState(id).values); }

// Real numerical underflow fixtures live in sim-core's measurement2d.test.ts.
// These mocks test world bookkeeping at every staged draw boundary, not physics.
describe('precommit world failure isolation and retained generator advancement', () => {
  it.each([0, 1, 2])('retains %s draws, all committed data/cache identities and previous receipt', async draws => {
    const w = make(), initial = spatial(w), terrain = new Float64Array(20 * 17);
    const first = w.measureSpatial('a', 'x', 0.4);
    if (first.status !== 'committed') throw new Error('Expected initial success');
    w.effectivePotential('a', terrain); const before = w.getSnapshot(), values = spatial(w), last = w.lastAction;
    // Identity checks supplement the public freshness checks in integration tests.
    const caches = w as unknown as { spatialMeans: Map<string, unknown>; spatialDiagnostics: Map<string, unknown> };
    const mean = caches.spatialMeans.get('a'), diagnostic = caches.spatialDiagnostics.get('a');
    const owned = fault.inputs[0]!, buffer = owned.values;
    fault.mode = 'staged'; fault.draws = draws;
    fault.stage = draws === 0 ? 'input' : draws === 1 ? 'y-distribution' : 'posterior';
    const result = w.measureSpatial('a', 'xy', 0.4);
    expect(result).toEqual({ status: 'failed', stage: fault.stage, message: 'injected precommit numerical failure', drawsConsumed: draws, spatialDrawCount: 1 + draws });
    expect(Object.isFrozen(result)).toBe(true);
    expect(spatial(w)).toEqual(values); expect(w.lastAction).toBe(last);
    expect({ ...w.getSnapshot(), spatialDrawCount: before.spatialDrawCount }).toEqual(before);
    expect(caches.spatialMeans.get('a')).toBe(mean); expect(caches.spatialDiagnostics.get('a')).toBe(diagnostic);
    expect(fault.inputs[1]).toBe(owned); expect(owned.values).toBe(buffer);
    const rng = createSeededRandom(42); rng(); // initial successful x draw
    expect(fault.seen).toEqual(Array.from({ length: draws }, () => rng()));
    fault.mode = 'normal';
    const actual = await vi.importActual<typeof import('@psi-zoo/sim-core')>('@psi-zoo/sim-core');
    const expected = actual.measurePosition2D(w.spatialState('a'), 0.4, 'x', rng);
    const retry = w.measureSpatial('a', 'x', 0.4);
    expect(retry).toMatchObject({ status: 'committed', drawsConsumed: 1, spatialDrawCount: draws + 2, receipt: { sequence: 2, spatialSequence: 2 } });
    expect(w.spatialState('a').values).toEqual(expected.state.values);
    expect(owned.values).toBe(buffer); expect(buffer).toEqual(expected.state.values); // copy into committed buffer, no replacement
    w.resetEvolution(); expect(spatial(w)).toEqual(initial);
    expect(w.getSnapshot()).toMatchObject({ lastAction: null, spatialDrawCount: 0, spatialMeasurementCount: 0 });
    expect(w.measureSpatial('a', 'x', 0.4)).toEqual(first);
  });

  it('preserves a previous mood receipt and the chronological sequence on spatial failure', () => {
    const w = make(); w.prepareBellPair('p', 'a', 'b'); w.measureMood('p', 'a', 'Z');
    const before = w.getSnapshot(), values = spatial(w), receipt = w.lastAction;
    fault.mode = 'staged'; fault.draws = 2; fault.stage = 'posterior';
    expect(w.measureSpatial('a', 'xy', 0.4)).toMatchObject({ status: 'failed', drawsConsumed: 2, spatialDrawCount: 2 });
    expect(w.lastAction).toBe(receipt); expect(spatial(w)).toEqual(values);
    expect({ ...w.getSnapshot(), spatialDrawCount: 0 }).toEqual(before);
    fault.mode = 'normal'; w.measureSpatial('a', 'x', 0.4);
    expect(w.lastAction).toMatchObject({ kind: 'spatial-measurement', sequence: 3, spatialSequence: 1, spatialDrawCount: 3 });
  });

  it('wraps only recognized staged errors; unexpected exceptions propagate without fabricated success', () => {
    const w = make(); w.measureSpatial('a', 'x', 0.4);
    const values = spatial(w), receipt = w.lastAction;
    fault.mode = 'unexpected'; fault.draws = 1;
    for (const error of [new Error('unexpected detector bug'), Object.assign(new RangeError('not a recognized numerical error'), { stage: 'posterior' })]) {
      fault.error = error;
      expect(() => w.measureSpatial('a', 'xy', 0.4)).toThrow(error);
      expect(w.lastAction).toBe(receipt); expect(spatial(w)).toEqual(values);
    }
    expect(w.getSnapshot()).toMatchObject({ spatialDrawCount: 3, spatialMeasurementCount: 1 });
  });

  it('rejects predictable command errors before invoking the detector or its callback', () => {
    const w = make(); fault.mode = 'unexpected';
    w.measureSpatial('missing', 'x', 0.4); w.measureSpatial('a', 'x', NaN);
    w.measureSpatial('a', 'bad' as 'x', 0.4);
    expect(measurePosition2D).not.toHaveBeenCalled(); expect(w.getSnapshot().spatialDrawCount).toBe(0);
  });

  it.each([1, 2])('prepares frozen receipt/result before amplitude commit (allocation failure %s is not a numerical failure)', allocation => {
    const w = make(), before = spatial(w), error = new Error('receipt allocation failure');
    const originalFreeze = Object.freeze, freeze = vi.spyOn(Object, 'freeze');
    if (allocation === 2) freeze.mockImplementationOnce(originalFreeze);
    freeze.mockImplementationOnce(() => { throw error; });
    try { expect(() => w.measureSpatial('a', 'xy', 0.4)).toThrow(error); }
    finally { freeze.mockRestore(); }
    expect(spatial(w)).toEqual(before); expect(w.lastAction).toBeNull();
    expect(w.getSnapshot()).toMatchObject({ spatialMeasurementCount: 0, spatialDrawCount: 2 });
  });
});

describe('scheduler preservation for an injected precommit numerical refusal', () => {
  it.each([false, true])('keeps pending callbacks and time remainder intact, playing=%s', playing => {
    let requests = 0, cancels = 0;
    const pending = new Map<number, (now: number) => void>();
    const c = new SimulationPlayback2D({ request: cb => { pending.set(++requests, cb); return requests; }, cancel: id => { cancels++; pending.delete(id); } }, () => {}, { grid: geometry(), worldPreset: 'mood' });
    const tick = (now: number) => { const callbacks = [...pending.values()]; pending.clear(); for (const cb of callbacks) cb(now); };
    const w = c.world!, same = c.world, values = spatial(w), reference = new QuantumWorld2D(c.psi, createWorldPreset2D(c.psi, 'mood'));
    if (playing) { c.play(); tick(0); tick(1000 / 240); }
    const callbacks = [...pending.entries()], requested = requests, cancelled = cancels;
    fault.mode = 'staged'; fault.draws = 2; fault.stage = 'posterior';
    expect(w.measureSpatial('a', 'xy', 0.4)).toMatchObject({ status: 'failed', drawsConsumed: 2 });
    expect(c.world).toBe(same); expect(spatial(w)).toEqual(values);
    expect([...pending.entries()]).toEqual(callbacks); expect(requests).toBe(requested); expect(cancels).toBe(cancelled);
    expect(c.snapshot()).toMatchObject({ playing, error: null, time: 0 });
    if (!playing) { c.play(); tick(0); tick(1000 / 240); }
    tick(1000 / 120); reference.step(c.potential, c.dt);
    expect(w.time).toBe(c.dt); expect(spatial(w)).toEqual(spatial(reference));
    c.dispose();
  });
});
