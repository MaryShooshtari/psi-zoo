import { SCATTERING_CONFIG, type PsiGrid } from '@psi-zoo/sim-core';
import { TERRAIN_MAX_HEIGHT } from './simulation';

/** Shared by rendering and hit testing, in logical CSS pixels, not backing pixels. */
export function plotBounds(width: number, height: number) {
  return { left: 58, right: width - 58, top: 60, bottom: height - 48 };
}

/** A normalized grid state has |psi_i|² <= 1/dx. Use that fixed bound
 * with 5% headroom for roundoff and stroke thickness. Square-root spacing
 * keeps broad packets legible without autoscaling; labels remain densities.
 * Geometric screen area is NOT probability on this nonlinear axis.
 */
export function densityScaleMaximum(dx: number): number { return 1.05 / dx; }
export function densityPlotFraction(density: number, dx: number): number {
  return Math.sqrt(density / densityScaleMaximum(dx));
}

/** Independent fixed y scales: sqrt-spaced density left, linear V=[0,5] right.
 * Direct array traversal; no copied density/potential buffers per draw.
 * Optional secondPsi shares the grid (enforced by the world coordinator).
 * Colours/patterns identify creatures, never relative phase or interference.
 */
export function drawSimulation(
  context: CanvasRenderingContext2D, psi: PsiGrid, potential: Float64Array, width: number, height: number,
  observedPosition: number | null = null, secondPsi: PsiGrid | null = null,
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
    context.fillText((densityScaleMaximum(psi.dx) * (i / 5) ** 2).toFixed(2), left - 8, y + 4);
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
  context.fillText(secondPsi ? 'A: cyan solid · B: rose dashed'
    : `Density |ψ|² · sqrt-spaced axis · 0–${densityScaleMaximum(psi.dx).toFixed(1)}`, left, 22);
  context.fillStyle = '#ffc477'; context.fillText(secondPsi ? 'Shared terrain only · right axis' : 'Potential V(x) · right axis', left, 42);

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
  // Independent density traversal: never add complex amplitudes or stack curves.
  const drawDensity = (state: PsiGrid, colour: string, fill: string, dash: number[]) => {
    context.beginPath();
    for (let i = 0; i < state.count; i++) {
      const density = state.values[2 * i]! ** 2 + state.values[2 * i + 1]! ** 2;
      const x = px(i / (state.count - 1)), y = py(densityPlotFraction(density, state.dx));
      if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.setLineDash(dash); context.strokeStyle = colour; context.lineWidth = 2; context.stroke();
    context.lineTo(right, bottom); context.lineTo(left, bottom); context.closePath();
    context.fillStyle = fill; context.fill();
  };
  drawDensity(psi, '#a8f9fc', 'rgba(86,188,229,0.18)', []);
  if (secondPsi) drawDensity(secondPsi, '#f49bdf', 'rgba(244,155,223,0.12)', [3, 3]);
  context.strokeStyle = '#8394ae'; context.lineWidth = 1; context.setLineDash([2, 4]);
  for (const cut of [SCATTERING_CONFIG.leftEdge, SCATTERING_CONFIG.rightEdge]) {
    const x = px((cut - psi.x0) / ((psi.count - 1) * psi.dx));
    context.beginPath(); context.moveTo(x, top); context.lineTo(x, bottom); context.stroke();
  }
  if (observedPosition !== null) {
    const x = px((observedPosition - psi.x0) / ((psi.count - 1) * psi.dx));
    // White in pair mode (distinct from rose B), magenta in single-state mode:
    // the solid line/diamond records an outcome, never a tracked trajectory.
    context.setLineDash([]); context.strokeStyle = secondPsi ? '#ffffff' : '#f49bdf'; context.lineWidth = 2;
    context.beginPath(); context.moveTo(x, top); context.lineTo(x, bottom); context.stroke();
    context.fillStyle = secondPsi ? '#ffffff' : '#f49bdf'; context.beginPath();
    context.moveTo(x, top + 2); context.lineTo(x + 6, top + 9);
    context.lineTo(x, top + 16); context.lineTo(x - 6, top + 9); context.closePath(); context.fill();
  }
  context.restore();
}
