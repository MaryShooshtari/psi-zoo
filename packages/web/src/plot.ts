import type { PsiGrid } from '@psi-zoo/sim-core';
import { TERRAIN_MAX_HEIGHT } from './simulation';

/** Shared by rendering and hit testing, in logical CSS pixels, not backing pixels. */
export function plotBounds(width: number, height: number) {
  return { left: 58, right: width - 58, top: 60, bottom: height - 48 };
}

/** Fixed independent y scales: density [0,0.5] left, potential [0,5] right.
 * Direct array traversal; no copied density/potential buffers per draw.
 */
export function drawSimulation(
  context: CanvasRenderingContext2D, psi: PsiGrid, potential: Float64Array, width: number, height: number,
): void {
  const { left, right, top, bottom } = plotBounds(width, height);
  const plotWidth = right - left, plotHeight = bottom - top;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#0e1930'; context.fillRect(0, 0, width, height);
  if (plotWidth <= 0 || plotHeight <= 0) return;
  const px = (fraction: number) => left + fraction * plotWidth;
  const py = (fraction: number) => bottom - fraction * plotHeight;
  context.font = '12px system-ui'; context.textAlign = 'center';
  context.strokeStyle = '#374561'; context.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const x = px(i / 4);
    context.beginPath(); context.moveTo(x, top); context.lineTo(x, bottom); context.stroke();
    context.fillStyle = '#9ab0c8';
    context.fillText(String(psi.x0 + i / 4 * (psi.count - 1) * psi.dx), x, bottom + 20);
  }
  for (let i = 0; i <= 5; i++) {
    const y = py(i / 5);
    context.beginPath(); context.moveTo(left, y); context.lineTo(right, y); context.stroke();
    context.textAlign = 'right'; context.fillStyle = '#a8f9fc';
    context.fillText((i / 10).toFixed(1), left - 8, y + 4);
    context.textAlign = 'left'; context.fillStyle = '#ffc477';
    context.fillText(String(i / 5 * TERRAIN_MAX_HEIGHT), right + 8, y + 4);
  }
  context.textAlign = 'center'; context.fillStyle = '#9ab0c8';
  context.fillText('Position x', (left + right) / 2, height - 10);
  context.save(); context.translate(15, (top + bottom) / 2); context.rotate(-Math.PI / 2);
  context.fillStyle = '#a8f9fc'; context.fillText('|ψ|²', 0, 0); context.restore();
  context.save(); context.translate(width - 12, (top + bottom) / 2); context.rotate(Math.PI / 2);
  context.fillStyle = '#ffc477'; context.fillText('V(x)', 0, 0); context.restore();
  context.textAlign = 'left'; context.fillStyle = '#a8f9fc';
  context.fillText('Density |ψ(x,t)|² · left axis', left, 22);
  context.fillStyle = '#ffc477'; context.fillText('Potential V(x) · right axis', left, 42);

  context.save(); context.beginPath(); context.rect(left, top, plotWidth, plotHeight); context.clip();
  // Potential drawn first so density remains legible over the terrain.
  context.beginPath();
  for (let i = 0; i < psi.count; i++) {
    const x = px(i / (psi.count - 1)), y = py(potential[i]! / TERRAIN_MAX_HEIGHT);
    if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.strokeStyle = '#ffc477'; context.lineWidth = 2; context.setLineDash([6, 4]); context.stroke();
  context.setLineDash([]);
  context.lineTo(right, bottom); context.lineTo(left, bottom); context.closePath();
  context.fillStyle = 'rgba(255,180,90,0.12)'; context.fill();
  context.beginPath();
  for (let i = 0; i < psi.count; i++) {
    const density = psi.values[2 * i]! ** 2 + psi.values[2 * i + 1]! ** 2;
    const x = px(i / (psi.count - 1)), y = py(density / 0.5);
    if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.strokeStyle = '#a8f9fc'; context.lineWidth = 2; context.stroke();
  context.lineTo(right, bottom); context.lineTo(left, bottom); context.closePath();
  context.fillStyle = 'rgba(86,188,229,0.18)'; context.fill(); context.restore();
}
