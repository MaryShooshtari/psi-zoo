import { useEffect, useRef, useState } from 'react';
import { SimulationPlayback, type SimulationSnapshot } from './simulation';
import type { PsiGrid } from '@psi-zoo/sim-core';

/** Fixed axes: x in [-20,20], density in [0,0.5]. No analytic animation. */
function drawDensity(context: CanvasRenderingContext2D, psi: PsiGrid, width: number, height: number) {
  const left = 58, right = width - 20, top = 38, bottom = height - 48;
  const plotWidth = Math.max(1, right - left), plotHeight = Math.max(1, bottom - top);
  const px = (x: number) => left + (x + 20) / 40 * plotWidth;
  const py = (density: number) => bottom - density / 0.5 * plotHeight;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#0e1930'; context.fillRect(0, 0, width, height);
  context.font = '12px system-ui'; context.textAlign = 'center';
  context.strokeStyle = '#374561'; context.lineWidth = 1;
  for (const x of [-20, -10, 0, 10, 20]) {
    context.beginPath(); context.moveTo(px(x), top); context.lineTo(px(x), bottom); context.stroke();
    context.fillStyle = '#9ab0c8'; context.fillText(String(x), px(x), bottom + 20);
  }
  for (const density of [0, 0.1, 0.2, 0.3, 0.4, 0.5]) {
    context.beginPath(); context.moveTo(left, py(density)); context.lineTo(right, py(density)); context.stroke();
    context.textAlign = 'right'; context.fillText(density.toFixed(1), left - 8, py(density) + 4);
  }
  context.textAlign = 'center'; context.fillText('Position x', (left + right) / 2, height - 10);
  context.save(); context.translate(15, (top + bottom) / 2); context.rotate(-Math.PI / 2);
  context.fillText('|ψ|²', 0, 0); context.restore();
  context.textAlign = 'left'; context.fillStyle = '#a8f9fc';
  context.fillText('Probability density |ψ(x,t)|²', left, 22);
  context.save(); context.beginPath(); context.rect(left, top, plotWidth, plotHeight); context.clip();
  context.beginPath();
  for (let i = 0; i < psi.count; i++) {
    const density = psi.values[2 * i]! ** 2 + psi.values[2 * i + 1]! ** 2;
    const x = px(psi.x0 + i * psi.dx), y = py(density);
    if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.strokeStyle = '#a8f9fc'; context.lineWidth = 2; context.stroke();
  context.lineTo(right, bottom); context.lineTo(left, bottom); context.closePath();
  context.fillStyle = 'rgba(86,188,229,0.18)'; context.fill(); context.restore();
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackRef = useRef<SimulationPlayback | null>(null);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) { setSetupError('Canvas2D is unavailable in this browser.'); return; }
    let width = 1, height = 1, lastPublish = -Infinity;
    const controller = new SimulationPlayback({
      request: callback => requestAnimationFrame(callback),
      cancel: id => cancelAnimationFrame(id),
    }, next => {
      if (!next.error) drawDensity(context, controller.psi, width, height);
      // Draw each frame, but refresh React diagnostics at most ten times/sec.
      const now = performance.now();
      if (next.error || now - lastPublish >= 100) {
        setSnapshot(next); lastPublish = now;
      }
    });
    playbackRef.current = controller;
    const resize = () => {
      const box = canvas.getBoundingClientRect();
      width = Math.max(1, box.width); height = Math.max(1, box.height);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawDensity(context, controller.psi, width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    setSnapshot(controller.snapshot());
    // Background tabs pause instead of accumulating a wall-time backlog.
    const visibility = () => {
      if (document.hidden) { controller.pause(); setSnapshot(controller.snapshot()); }
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      controller.dispose(); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      if (playbackRef.current === controller) playbackRef.current = null;
    };
  }, []);

  const control = (action: 'play' | 'pause' | 'reset') => {
    const controller = playbackRef.current;
    if (!controller) return;
    try {
      controller[action]();
      setSnapshot(controller.snapshot());
      // Reset redraws immediately even when there is no active animation loop.
      if (action === 'reset') {
        const canvas = canvasRef.current, context = canvas?.getContext('2d');
        if (canvas && context) {
          const box = canvas.getBoundingClientRect();
          drawDensity(context, controller.psi, box.width, box.height);
        }
      }
    } catch (error) {
      controller.pause(); setSetupError(error instanceof Error ? error.message : String(error));
    }
  };
  const error = setupError ?? snapshot?.error;
  const number = (value: number | undefined, digits: number) => value !== undefined && Number.isFinite(value) ? value.toFixed(digits) : '—';

  return (
    <main>
      <div className="heading">
        <div className="eyebrow">PSI ZOO · SLICE 1</div>
        <h1>A little world for wavefunctions.</h1>
        <p>A free Gaussian wavepacket evolving under Schrödinger dynamics. Watch its probability density move and spread — no per-step normalization.</p>
      </div>
      <canvas className="terrarium" ref={canvasRef} role="img" aria-label="Numerically evolved probability density versus position, x from −20 to 20, density from 0 to 0.5" />
      <div className="controls" aria-label="Simulation controls">
        <button onClick={() => control('play')} disabled={!snapshot || snapshot.playing || !!error}>Play</button>
        <button onClick={() => control('pause')} disabled={!snapshot?.playing}>Pause</button>
        <button onClick={() => control('reset')} disabled={!snapshot || !!setupError}>Reset</button>
        <span role="status">{error ? 'Stopped — numerical or rendering error' : snapshot?.playing ? 'Playing' : 'Paused'}</span>
      </div>
      {error && <p className="error" role="alert">{error} {snapshot?.error && 'Reset to restore the initial state.'}</p>}
      <div className="diagnostics" aria-label="Simulation diagnostics">
        <span><strong>Physical time:</strong> {number(snapshot?.time, 2)}</span>
        <span><strong>Probability norm:</strong> {number(snapshot?.norm, 10)}</span>
        <span><strong>Energy ⟨ψ|H|ψ⟩:</strong> {number(snapshot?.energy, 8)}</span>
      </div>
      <footer>
        <span><strong>Evolution:</strong> Crank–Nicolson · Δt = 0.01 · ℏ = m = 1</span>
        <span><strong>Grid:</strong> 401 points · Δx = 0.1 · fixed zero endpoints</span>
      </footer>
      <p className="plot-note">Free particle, V = 0. Fixed plot axes for comparison. At long times the wavepacket reflects from the Dirichlet walls. Playback pauses in background tabs; long frame stalls slow simulated time rather than skipping physics steps.</p>
    </main>
  );
}
