import { describe, expect, it, vi } from 'vitest';
import { createPsiGrid } from '@psi-zoo/sim-core';
import { bindPotentialPainting, pointerToPosition } from './painting';
import { plotBounds } from './plot';
import { SimulationPlayback } from './simulation';

const grid = createPsiGrid(401, 0.1, -20);
const viewport = { width: 800, height: 340 };
// CSS-scaled display of a logical 800x340 canvas; backing-store DPR is irrelevant.
const rect = { left: 100, top: 50, width: 400, height: 170 };
const bounds = plotBounds(viewport.width, viewport.height);
const clientX = (x: number) => rect.left + x / viewport.width * rect.width;
const clientY = (y: number) => rect.top + y / viewport.height * rect.height;
const middleY = clientY((bounds.top + bounds.bottom) / 2);

class FakeCanvas extends EventTarget {
  readonly captured = new Set<number>();
  readonly setPointerCapture = vi.fn((id: number) => { this.captured.add(id); });
  readonly releasePointerCapture = vi.fn((id: number) => { this.captured.delete(id); });
  hasPointerCapture(id: number) { return this.captured.has(id); }
  getBoundingClientRect() { return rect; }
}
function harness() {
  const canvas = new FakeCanvas();
  const stamp = vi.fn(), paint = vi.fn(), onError = vi.fn();
  let enabled = true;
  let brush = { amplitude: 1, sigma: 0.6 };
  const binding = bindPotentialPainting(canvas, {
    grid: () => grid, viewport: () => viewport,
    settings: () => ({ enabled, brush }), stamp, paint, onError,
  });
  function send(type: string, x = 400, id = 1, extra: Record<string, unknown> = {}) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: id, isPrimary: true, button: 0,
      clientX: clientX(x), clientY: middleY, ...extra });
    canvas.dispatchEvent(event);
    return event;
  }
  return { canvas, binding, stamp, paint, onError, send,
    disable: () => { enabled = false; binding.cancelStroke(); },
    changeBrush: () => { brush = { amplitude: 2, sigma: 1 }; },
  };
}

describe('pointer to physical position', () => {
  it('maps plot edges and center using CSS geometry, independent of backing pixels', () => {
    for (const [logical, expected] of [[bounds.left, -20], [400, 0], [bounds.right, 20]]) {
      expect(pointerToPosition(clientX(logical!), middleY, rect, viewport, grid, true)).toBeCloseTo(expected!, 12);
    }
  });
  it('rejects initial downs in margins, and clamps captured motion to domain edges', () => {
    expect(pointerToPosition(clientX(0), middleY, rect, viewport, grid, true)).toBeNull();
    expect(pointerToPosition(clientX(400), clientY(bounds.top - 1), rect, viewport, grid, true)).toBeNull();
    expect(pointerToPosition(clientX(bounds.left), clientY(bounds.top), rect, viewport, grid, true)).toBe(-20);
    expect(pointerToPosition(clientX(bounds.right), clientY(bounds.bottom), rect, viewport, grid, true)).toBe(20);
    expect(pointerToPosition(-1000, -1000, rect, viewport, grid, false)).toBe(-20);
    expect(pointerToPosition(10000, 10000, rect, viewport, grid, false)).toBe(20);
    expect(pointerToPosition(NaN, middleY, rect, viewport, grid, false)).toBeNull();
    expect(pointerToPosition(0, 0, { ...rect, width: 0 }, viewport, grid, false)).toBeNull();
  });
  it('uses supplied grid geometry rather than hardcoded domain coordinates', () => {
    const other = createPsiGrid(11, 0.5, 2);
    expect(pointerToPosition(clientX(400), middleY, rect, viewport, other, true)).toBe(4.5);
  });
});

describe('pointer stroke listeners', () => {
  it.each(['mouse', 'touch', 'pen'])('captures, stamps, extends and finishes %s strokes', pointerType => {
    const h = harness();
    const down = h.send('pointerdown', 400, 1, { pointerType });
    expect(down.defaultPrevented).toBe(true);
    expect(h.canvas.setPointerCapture).toHaveBeenCalledWith(1);
    expect(h.stamp).toHaveBeenCalledWith(0, { amplitude: 1, sigma: 0.6 });
    h.send('pointermove', bounds.right);
    expect(h.paint).toHaveBeenLastCalledWith(0, 20, { amplitude: 1, sigma: 0.6 });
    h.send('pointerup', bounds.left);
    expect(h.paint).toHaveBeenLastCalledWith(20, -20, { amplitude: 1, sigma: 0.6 });
    expect(h.canvas.releasePointerCapture).toHaveBeenCalledWith(1);
    h.send('pointermove'); expect(h.paint).toHaveBeenCalledTimes(2);
    h.binding.dispose();
  });
  it('ignores margins, disabled mode, nonprimary input, extra pointers and right clicks', () => {
    const h = harness();
    h.send('pointerdown', 0);
    h.send('pointerdown', 400, 1, { isPrimary: false });
    h.send('pointerdown', 400, 1, { button: 2 });
    expect(h.stamp).not.toHaveBeenCalled();
    h.send('pointerdown'); h.send('pointerdown', 500, 2);
    h.send('pointermove', 500, 2); h.send('pointerup', 500, 2);
    expect(h.stamp).toHaveBeenCalledTimes(1); expect(h.paint).not.toHaveBeenCalled();
    h.disable(); h.send('pointerdown'); expect(h.stamp).toHaveBeenCalledTimes(1);
    expect(h.canvas.captured.size).toBe(0);
    h.binding.dispose();
  });
  it.each(['pointercancel', 'lostpointercapture'])('ends on %s without painting a phantom final segment', type => {
    const h = harness(); h.send('pointerdown');
    if (type === 'lostpointercapture') h.canvas.captured.clear();
    h.send(type, 500); h.send('pointermove', 600); h.send('pointerup', 600);
    expect(h.paint).not.toHaveBeenCalled();
    expect(h.canvas.captured.size).toBe(0);
    h.send('pointerdown'); expect(h.stamp).toHaveBeenCalledTimes(2);
    h.binding.dispose();
  });
  it('freezes brush per stroke and clamps outside movement', () => {
    const h = harness(); h.send('pointerdown'); h.changeBrush();
    h.send('pointermove', -1000);
    expect(h.paint).toHaveBeenLastCalledWith(0, -20, { amplitude: 1, sigma: 0.6 });
    h.send('pointerup', -1000); h.send('pointerdown');
    expect(h.stamp).toHaveBeenLastCalledWith(0, { amplitude: 2, sigma: 1 });
    h.binding.dispose();
  });
  it('releases capture and removes all listeners on disposal; replacement has no stale listeners', () => {
    const h = harness(); h.send('pointerdown'); h.binding.dispose(); h.binding.dispose();
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) h.send(type);
    expect(h.stamp).toHaveBeenCalledTimes(1); expect(h.paint).not.toHaveBeenCalled();
    expect(h.canvas.captured.size).toBe(0);
    const stamp = vi.fn();
    const next = bindPotentialPainting(h.canvas, {
      grid: () => grid, viewport: () => viewport,
      settings: () => ({ enabled: true, brush: { amplitude: 1, sigma: 0.6 } }),
      stamp, paint: vi.fn(), onError: vi.fn(),
    });
    h.send('pointerdown'); expect(stamp).toHaveBeenCalledTimes(1);
    expect(h.stamp).toHaveBeenCalledTimes(1); next.dispose();
  });
  it('routes actual strokes to playback while paused and playing, never directly to psi', () => {
    const h = harness(); h.binding.dispose();
    let callback: ((now: number) => void) | undefined;
    const published = vi.fn();
    const c = new SimulationPlayback({
      request: next => { callback = next; return 1; },
      cancel: () => { callback = undefined; },
    }, published);
    const binding = bindPotentialPainting(h.canvas, {
      grid: () => c.psi, viewport: () => viewport,
      settings: () => ({ enabled: true, brush: { amplitude: 1, sigma: 0.6 } }),
      stamp: (x, brush) => c.stamp(x, brush),
      paint: (from, to, brush) => c.paint(from, to, brush), onError: error => { throw error; },
    });
    const initial = c.psi.values.slice(), terrain = c.potential;
    h.send('pointerdown', bounds.left); h.send('pointermove', 400); h.send('pointerup', 400);
    expect(c.potential[100]).toBe(1); expect(c.psi.values).toEqual(initial);
    expect(c.snapshot()).toMatchObject({ time: 0, playing: false });
    expect(published).toHaveBeenCalled();
    c.play(); callback!(0);
    h.send('pointerdown', 400); h.send('pointermove', bounds.right);
    const beforeStep = c.psi.values.slice();
    callback!(10); expect(c.psi.values).not.toEqual(beforeStep);
    expect(c.snapshot().playing).toBe(true);
    expect(Math.abs(c.snapshot().norm - 1)).toBeLessThan(1e-12);
    h.send('pointercancel');
    const painted = terrain.slice(); h.send('pointermove', 200);
    expect(c.potential).toEqual(painted); expect(c.potential).toBe(terrain);
    binding.dispose(); c.dispose(); expect(callback).toBeUndefined();
  });
  it('reports capture/painting failures and does not leave a live stroke', () => {
    const h = harness();
    h.canvas.setPointerCapture.mockImplementationOnce(() => { throw new Error('capture failed'); });
    h.send('pointerdown'); expect(h.stamp).not.toHaveBeenCalled();
    expect(h.onError).toHaveBeenCalledOnce();
    h.stamp.mockImplementationOnce(() => { throw new Error('paint failed'); });
    h.send('pointerdown'); expect(h.canvas.captured.size).toBe(0);
    h.send('pointermove'); expect(h.paint).not.toHaveBeenCalled(); h.binding.dispose();
  });
});
