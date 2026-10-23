import type { GaussianBrush, PotentialGrid } from '@psi-zoo/sim-core';
import { plotBounds } from './plot';

interface Viewport { width: number; height: number }
interface CanvasRect extends Viewport { left: number; top: number }

/** Map CSS client coordinates to the logical plot, never to DPR backing pixels.
 * Initial contact must be inside the plot. Captured motion clamps to its edges.
 * The canvas has no CSS border/padding, so its rect describes the drawing area.
 */
export function pointerToPosition(
  clientX: number, clientY: number, rect: CanvasRect, viewport: Viewport,
  grid: PotentialGrid, requireInside: boolean,
): number | null {
  if (![clientX, clientY, rect.left, rect.top, rect.width, rect.height, viewport.width, viewport.height].every(Number.isFinite)
    || rect.width <= 0 || rect.height <= 0) return null;
  const bounds = plotBounds(viewport.width, viewport.height);
  if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) return null;
  let x = (clientX - rect.left) / rect.width * viewport.width;
  const y = (clientY - rect.top) / rect.height * viewport.height;
  // CSS scaling can round an exact edge a few ulps outside. This tolerance is
  // far below a visible pixel and does not make plot margins interactive.
  const edgeTolerance = 1e-9;
  if (requireInside && (x < bounds.left - edgeTolerance || x > bounds.right + edgeTolerance
    || y < bounds.top - edgeTolerance || y > bounds.bottom + edgeTolerance)) return null;
  if (Math.abs(x - bounds.left) <= edgeTolerance) x = bounds.left;
  if (Math.abs(x - bounds.right) <= edgeTolerance) x = bounds.right;
  const fraction = Math.max(0, Math.min(1, (x - bounds.left) / (bounds.right - bounds.left)));
  return grid.x0 + fraction * (grid.count - 1) * grid.dx;
}

type PaintingCanvas = EventTarget & Pick<HTMLCanvasElement,
  'setPointerCapture' | 'releasePointerCapture' | 'hasPointerCapture'> & {
    getBoundingClientRect(): CanvasRect;
  };
interface PaintingOptions {
  grid(): PotentialGrid;
  viewport(): Viewport;
  settings(): { enabled: boolean; brush: GaussianBrush };
  stamp(center: number, brush: GaussianBrush): void;
  paint(from: number, to: number, brush: GaussianBrush): void;
  onError(error: unknown): void;
}
export interface PaintingBinding {
  cancelStroke(): void;
  dispose(): void;
}

/** One active primary pointer, with settings frozen per stroke. No React state
 * per pointer event. The returned cleanup releases capture and removes listeners.
 */
export function bindPotentialPainting(canvas: PaintingCanvas, options: PaintingOptions): PaintingBinding {
  let active: { id: number; x: number; brush: GaussianBrush } | null = null;
  let disposed = false;
  const cancelStroke = () => {
    const stroke = active;
    active = null; // Clear before release, which can trigger lostpointercapture.
    if (stroke && canvas.hasPointerCapture(stroke.id)) canvas.releasePointerCapture(stroke.id);
  };
  const position = (event: PointerEvent, inside: boolean) => pointerToPosition(
    event.clientX, event.clientY, canvas.getBoundingClientRect(), options.viewport(), options.grid(), inside,
  );
  const guard = (handler: (event: PointerEvent) => void): EventListener => event => {
    if (disposed) return;
    try { handler(event as PointerEvent); }
    catch (error) { cancelStroke(); options.onError(error); }
  };
  const down = guard(event => {
    const settings = options.settings();
    if (active || !settings.enabled || !event.isPrimary || event.button !== 0) return;
    const x = position(event, true);
    if (x === null) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    active = { id: event.pointerId, x, brush: { ...settings.brush } };
    options.stamp(x, active.brush);
  });
  const extend = (event: PointerEvent) => {
    if (!active || active.id !== event.pointerId) return;
    if (!options.settings().enabled) { cancelStroke(); return; }
    event.preventDefault();
    const x = position(event, false);
    if (x === null) return;
    options.paint(active.x, x, active.brush);
    active.x = x;
  };
  const move = guard(extend);
  const up = guard(event => {
    if (active?.id !== event.pointerId) return;
    extend(event); // Include the final position even without a preceding move.
    cancelStroke();
  });
  const cancel = guard(event => { if (active?.id === event.pointerId) cancelStroke(); });
  const listeners: ReadonlyArray<readonly [string, EventListener]> = [
    ['pointerdown', down], ['pointermove', move], ['pointerup', up],
    ['pointercancel', cancel], ['lostpointercapture', cancel],
  ];
  for (const [type, listener] of listeners) canvas.addEventListener(type, listener, { passive: false });
  return {
    cancelStroke,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const [type, listener] of listeners) canvas.removeEventListener(type, listener);
      cancelStroke();
    },
  };
}
