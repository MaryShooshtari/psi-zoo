import { validateTerrainBrush2D, type TerrainBrush2D, type PsiGrid2D } from '@psi-zoo/sim-core';
import { canvasToPhysical2D } from './render/density2d';
export interface Point2D { x: number; y: number }
/** Fixed arc-length stamps, no extra endpoint stamp. Residual distance survives
 * event boundaries. Subdividing the same polyline changes only floating roundoff.
 * Settings are frozen per stroke. Click-only means exactly the down stamp.
 */
export class DistanceStroke2D {
  private previous: Point2D;
  private remaining: number;
  private active = true;
  constructor(start: Point2D, readonly spacing: number, private readonly stamp: (p: Point2D) => void) {
    this.validate(start);
    if (!Number.isFinite(spacing) || spacing <= 0) throw new RangeError('Stroke spacing must be finite and positive');
    this.previous = { ...start }; this.remaining = spacing; stamp(start);
  }
  move(end: Point2D): void {
    if (!this.active) return;
    this.validate(end);
    const dx = end.x - this.previous.x, dy = end.y - this.previous.y, length = Math.hypot(dx, dy);
    if (!Number.isFinite(length) || length / this.spacing > 100000) throw new RangeError('Stroke segment too long for synchronous stamping');
    if (length === 0) return;
    let traveled = 0;
    while (length - traveled + 1e-12 * this.spacing >= this.remaining) {
      traveled += this.remaining;
      const fraction = Math.min(1, traveled / length);
      this.stamp({ x: this.previous.x + dx * fraction, y: this.previous.y + dy * fraction });
      this.remaining = this.spacing;
    }
    this.remaining -= Math.max(0, length - traveled); this.previous = { ...end };
  }
  finish(end?: Point2D): void { if (end) this.move(end); this.active = false; }
  cancel(): void { this.active = false; }
  private validate(p: Point2D): void { if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new RangeError('Stroke points must be finite'); }
}
export interface TerrainPointerSettings { tool: 'view' | TerrainBrush2D['tool']; sigma: number; amplitude: number }
export function bindTerrainPainting2D(canvas: HTMLCanvasElement, options: {
  grid: PsiGrid2D; settings: () => TerrainPointerSettings;
  stamp: (p: Point2D, brush: TerrainBrush2D) => void; changed: () => void;
  preview: (p: Point2D | null) => void; onError: (e: unknown) => void;
}) {
  let pointer: number | null = null, stroke: DistanceStroke2D | null = null;
  const point = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    // rect accounts for CSS transforms, client size for logical drawing units.
    if (rect.width <= 0 || rect.height <= 0) return null;
    return canvasToPhysical2D(options.grid, (e.clientX - rect.left) * canvas.clientWidth / rect.width,
      (e.clientY - rect.top) * canvas.clientHeight / rect.height, canvas.clientWidth, canvas.clientHeight);
  };
  const cancel = () => {
    stroke?.cancel(); stroke = null;
    const id = pointer; pointer = null;
    if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    options.preview(null);
  };
  const guard = (fn: () => void) => { try { fn(); } catch (e) { cancel(); options.onError(e); } };
  const down = (e: PointerEvent) => guard(() => {
    const settings = options.settings(), p = point(e);
    if (pointer !== null || e.button !== 0 || !e.isPrimary || settings.tool === 'view' || !p) return;
    const brush: TerrainBrush2D = { tool: settings.tool, sigma: settings.sigma, amplitude: settings.amplitude };
    validateTerrainBrush2D(brush); e.preventDefault(); canvas.setPointerCapture(e.pointerId); pointer = e.pointerId;
    stroke = new DistanceStroke2D(p, Math.min(brush.sigma / 2, options.grid.dx, options.grid.dy), q => options.stamp(q, brush));
    options.preview(p); options.changed();
  });
  const move = (e: PointerEvent) => guard(() => {
    if (pointer !== null && e.pointerId !== pointer) return;
    const p = point(e); options.preview(options.settings().tool === 'view' ? null : p);
    if (pointer === e.pointerId && p) { e.preventDefault(); stroke?.move(p); options.changed(); }
    // Outside domain/letterbox ends this segment. Do not bridge the outside path.
    if (pointer === e.pointerId && !p) cancel();
  });
  const up = (e: PointerEvent) => guard(() => {
    if (pointer !== e.pointerId) return;
    const p = point(e); stroke?.finish(p ?? undefined); options.changed(); cancel();
  });
  const canceled = (e: PointerEvent) => { if (pointer === e.pointerId) cancel(); };
  const leave = () => { if (pointer === null) options.preview(null); };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', canceled); canvas.addEventListener('lostpointercapture', canceled); canvas.addEventListener('pointerleave', leave);
  return { cancel, dispose: () => {
    cancel(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', canceled); canvas.removeEventListener('lostpointercapture', canceled); canvas.removeEventListener('pointerleave', leave);
  } };
}
