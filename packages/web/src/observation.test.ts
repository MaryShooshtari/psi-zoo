import { describe, expect, it, vi } from 'vitest';
import { bindObservation } from './observation';
import { bindPotentialPainting } from './painting';
import { SimulationPlayback } from './simulation';
import { createSeededRandom } from './random';

const viewport = { width: 800, height: 340 };
const rect = { left: 100, top: 50, width: 400, height: 170 };
class Canvas extends EventTarget {
  getBoundingClientRect() { return rect as DOMRect; }
  setPointerCapture() {}
  releasePointerCapture() {}
  hasPointerCapture() { return false; }
}
function harness() {
  const canvas = new Canvas();
  const c = new SimulationPlayback({ request: () => 1, cancel: () => {} }, () => {});
  let mode: 'paint' | 'observe' = 'observe';
  const observe = vi.fn(() => c.observe()), onError = vi.fn();
  const stamp = vi.fn((x, brush) => c.stamp(x, brush));
  const painting = bindPotentialPainting(canvas, {
    grid: () => c.psi, viewport: () => viewport,
    settings: () => ({ enabled: mode === 'paint', brush: { amplitude: 1, sigma: 0.6 } }),
    stamp, paint: (from, to, brush) => c.paint(from, to, brush), onError,
  });
  const observation = bindObservation(canvas, {
    enabled: () => mode === 'observe', grid: () => c.psi, viewport: () => viewport,
    observe, onError,
  });
  const send = (type: string, x = 400, y = 150, extra = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { button: 0, isPrimary: true, pointerId: 1,
      clientX: rect.left + x / 2, clientY: rect.top + y / 2, ...extra });
    canvas.dispatchEvent(event);
    return event;
  };
  return { c, send, observe, stamp, onError, observation, painting,
    mode(next: typeof mode) { painting.cancelStroke(); mode = next; },
    dispose() { observation.dispose(); painting.dispose(); c.dispose(); },
  };
}

describe('observation interaction', () => {
  it.each(['mouse', 'touch', 'pen'])('measures exactly once for a %s click, never on down/move/up or compatibility events', pointerType => {
    const h = harness();
    const terrain = h.c.potential.slice();
    for (const type of ['pointerdown', 'mousedown', 'pointermove', 'pointerup', 'mouseup']) {
      h.send(type, 400, 150, { pointerType });
    }
    expect(h.observe).not.toHaveBeenCalled();
    expect(h.send('click', 400, 150, { pointerType }).defaultPrevented).toBe(true);
    h.send('dblclick');
    expect(h.observe).toHaveBeenCalledOnce();
    expect(h.c.snapshot().measurementCount).toBe(1);
    expect(h.stamp).not.toHaveBeenCalled(); expect(h.c.potential).toEqual(terrain);
    h.dispose();
  });
  it('click coordinates only gate the plot: different trigger positions sample the same seeded outcome', () => {
    const a = harness(), b = harness();
    a.send('click', 60, 62); b.send('click', 740, 290);
    expect(a.c.lastObservation).not.toBeNull();
    expect(a.c.lastObservation).toEqual(b.c.lastObservation);
    expect(a.c.psi.values).toEqual(b.c.psi.values);
    a.dispose(); b.dispose();
  });
  it('accepts real-browser click events whose PointerEvent isPrimary field is false', () => {
    const h = harness();
    h.send('click', 400, 150, { isPrimary: false });
    expect(h.observe).toHaveBeenCalledOnce();
    expect(h.c.snapshot().measurementCount).toBe(1);
    h.dispose();
  });
  it('excludes margins, secondary buttons, and Paint mode', () => {
    const h = harness();
    h.send('click', 20); h.send('click', 400, 20);
    h.send('click', 400, 150, { button: 2 });
    expect(h.observe).not.toHaveBeenCalled();
    h.mode('paint'); h.send('pointerdown'); h.send('pointerup'); h.send('click');
    expect(h.stamp).toHaveBeenCalledOnce(); expect(h.observe).not.toHaveBeenCalled();
    const terrain = h.c.potential.slice();
    h.mode('observe'); h.send('pointerdown'); h.send('pointerup'); h.send('click');
    expect(h.observe).toHaveBeenCalledOnce(); expect(h.c.potential).toEqual(terrain);
    h.dispose();
  });
  it('cleans listeners on disposal and permits replacement without duplicate measurement', () => {
    const h = harness();
    h.observation.dispose(); h.observation.dispose(); h.send('click');
    expect(h.observe).not.toHaveBeenCalled();
    h.dispose();
  });
  it('routes measurement failures to the existing error handler', () => {
    const h = harness(); h.observe.mockImplementationOnce(() => { throw new Error('measurement failed'); });
    h.send('click'); expect(h.onError).toHaveBeenCalledOnce();
    h.dispose();
  });
});

describe('seeded browser RNG', () => {
  it('has a fixed reference sequence and reproducible streams in [0,1)', () => {
    const rng = createSeededRandom(0);
    expect([rng(), rng(), rng()]).toEqual([1013904223 / 2 ** 32, 1196435762 / 2 ** 32, 3519870697 / 2 ** 32]);
    const a = createSeededRandom(0xffffffff), b = createSeededRandom(0xffffffff);
    for (let i = 0; i < 1000; i++) {
      const value = a(); expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThan(1);
    }
  });
  it('rejects invalid seeds', () => {
    for (const seed of [NaN, Infinity, -1, 0.5, 2 ** 32]) expect(() => createSeededRandom(seed)).toThrow(RangeError);
  });
});
