import { useEffect, useRef, useState } from 'react';
import {
  SimulationPlayback, BRUSH_LIMITS, DEFAULT_BRUSH, TERRAIN_MAX_HEIGHT,
  DEFAULT_INITIAL_MOMENTUM, INITIAL_MOMENTUM_LIMIT, type SimulationSnapshot,
} from './simulation';
import { bindPotentialPainting, type PaintingBinding } from './painting';
import { drawSimulation } from './plot';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackRef = useRef<SimulationPlayback | null>(null);
  const paintingRef = useRef<PaintingBinding | null>(null);
  const refreshRef = useRef<(() => void) | null>(null);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [painting, setPainting] = useState(false);
  const [brush, setBrush] = useState(DEFAULT_BRUSH);
  const [initialMomentum, setInitialMomentum] = useState(DEFAULT_INITIAL_MOMENTUM);
  const initialMomentumRef = useRef(DEFAULT_INITIAL_MOMENTUM);
  // Native pointer listeners read current controls without effect reattachment.
  const settingsRef = useRef({ enabled: false, brush: DEFAULT_BRUSH });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) { setSetupError('Canvas2D is unavailable in this browser.'); return; }
    let width = 1, height = 1, lastPublish = -Infinity;
    let publishTimer: ReturnType<typeof setTimeout> | undefined;
    let latest: SimulationSnapshot;
    const publish = () => {
      if (publishTimer !== undefined) clearTimeout(publishTimer);
      publishTimer = undefined;
      setSnapshot(latest); lastPublish = performance.now();
    };
    const draw = () => {
      // Logical canvas size is independent of CSS transforms and DPR. The canvas
      // has no border/padding; pointer mapping uses its scaled bounding rect.
      width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
      const dpr = window.devicePixelRatio || 1;
      const backingWidth = Math.round(width * dpr), backingHeight = Math.round(height * dpr);
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth; canvas.height = backingHeight;
      }
      context.setTransform(backingWidth / width, 0, 0, backingHeight / height, 0, 0);
      drawSimulation(context, controller.psi, controller.potential, width, height);
    };
    const controller = new SimulationPlayback({
      request: callback => requestAnimationFrame(callback),
      cancel: id => cancelAnimationFrame(id),
    }, next => {
      if (next.error) paintingRef.current?.cancelStroke();
      else draw();
      latest = next;
      // Draw immediately, including paused terrain edits. Throttle React to 10Hz
      // with a trailing update so the final paused edit cannot leave stale energy.
      const delay = 100 - (performance.now() - lastPublish);
      if (next.error || delay <= 0) publish();
      else if (publishTimer === undefined) publishTimer = setTimeout(publish, delay);
    });
    // Preserve the selected initial condition if a development effect remounts.
    controller.setInitialMomentum(initialMomentumRef.current);
    if (controller.initialMomentum !== DEFAULT_INITIAL_MOMENTUM) controller.reset();
    playbackRef.current = controller;
    const refresh = () => { draw(); latest = controller.snapshot(); publish(); };
    refreshRef.current = refresh;
    const fail = (error: unknown) => {
      controller.pause(); settingsRef.current.enabled = false;
      setPainting(false); setSetupError(error instanceof Error ? error.message : String(error));
      latest = controller.snapshot(); publish();
    };
    const binding = bindPotentialPainting(canvas, {
      grid: () => controller.psi, viewport: () => ({ width, height }),
      settings: () => ({ ...settingsRef.current, enabled: settingsRef.current.enabled && !latest.error }),
      stamp: (x, currentBrush) => controller.stamp(x, currentBrush),
      paint: (from, to, currentBrush) => controller.paint(from, to, currentBrush),
      onError: fail,
    });
    paintingRef.current = binding;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas); refresh();
    const cancelStroke = () => binding.cancelStroke();
    // Background tabs pause, and focus loss must not leave a stroke alive.
    const visibility = () => {
      if (document.hidden) { binding.cancelStroke(); controller.pause(); refresh(); }
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('resize', draw);
    window.addEventListener('blur', cancelStroke);
    return () => {
      binding.dispose(); controller.dispose(); observer.disconnect();
      if (publishTimer !== undefined) clearTimeout(publishTimer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', draw);
      window.removeEventListener('blur', cancelStroke);
      if (playbackRef.current === controller) {
        playbackRef.current = null; paintingRef.current = null; refreshRef.current = null;
      }
    };
  }, []);

  const control = (action: 'play' | 'pause' | 'reset' | 'clearTerrain') => {
    const controller = playbackRef.current;
    if (!controller) return;
    try {
      if (action === 'reset' || action === 'clearTerrain') paintingRef.current?.cancelStroke();
      controller[action]();
      refreshRef.current?.();
    } catch (error) {
      paintingRef.current?.cancelStroke(); controller.pause();
      settingsRef.current.enabled = false; setPainting(false);
      setSetupError(error instanceof Error ? error.message : String(error));
    }
  };
  const changeInitialMomentum = (p0: number) => {
    const controller = playbackRef.current;
    if (!controller || !Number.isFinite(p0) || Math.abs(p0) > INITIAL_MOMENTUM_LIMIT) return;
    controller.setInitialMomentum(p0);
    initialMomentumRef.current = p0; setInitialMomentum(p0);
  };
  const togglePainting = (enabled: boolean) => {
    settingsRef.current.enabled = enabled; setPainting(enabled);
    if (!enabled) paintingRef.current?.cancelStroke();
  };
  const changeBrush = (key: 'sigma' | 'amplitude', value: number) => {
    const min = key === 'sigma' ? BRUSH_LIMITS.minSigma : BRUSH_LIMITS.minAmplitude;
    const max = key === 'sigma' ? BRUSH_LIMITS.maxSigma : TERRAIN_MAX_HEIGHT;
    if (!Number.isFinite(value) || value < min || value > max) return;
    const next = { ...settingsRef.current.brush, [key]: value };
    settingsRef.current.brush = next; setBrush(next);
  };
  const error = setupError ?? snapshot?.error;
  const number = (value: number | undefined, digits: number) => value !== undefined && Number.isFinite(value) ? value.toFixed(digits) : '—';

  return (
    <main>
      <div className="heading">
        <div className="eyebrow">PSI ZOO · SLICE 2</div>
        <h1>A little world for wavefunctions.</h1>
        <p>Paint a potential landscape and watch a Gaussian wavepacket evolve under Schrödinger dynamics — no scripted motion or per-step normalization.</p>
      </div>
      <canvas className={`terrarium${painting ? ' painting' : ''}`} ref={canvasRef} role="img"
        aria-label="Numerically evolved probability density and painted potential versus position, x from −20 to 20. Density left axis 0 to 0.5; potential right axis 0 to 5."
        aria-describedby="painting-help" />
      <div className="controls" aria-label="Simulation controls">
        <button onClick={() => control('play')} disabled={!snapshot || snapshot.playing || !!error}>Play</button>
        <button onClick={() => control('pause')} disabled={!snapshot?.playing}>Pause</button>
        <button onClick={() => control('reset')} disabled={!snapshot || !!setupError}>Reset</button>
        <button onClick={() => control('clearTerrain')} disabled={!snapshot || !!setupError}>Clear Terrain</button>
        <span role="status">{error ? 'Stopped — numerical or rendering error' : snapshot?.playing ? 'Playing' : 'Paused'}</span>
      </div>
      <fieldset className="brush-controls" disabled={!snapshot || !!setupError}>
        <legend>Initial wave packet · applies on Reset</legend>
        <label>Initial momentum p₀ = {initialMomentum.toFixed(2)} (ℏ = m = 1)
          <input type="range" min={-INITIAL_MOMENTUM_LIMIT} max={INITIAL_MOMENTUM_LIMIT} step="0.25"
            value={initialMomentum} aria-describedby="momentum-help"
            onChange={event => changeInitialMomentum(event.currentTarget.valueAsNumber)} />
        </label>
        <span id="momentum-help" className="plot-note">Negative: left · zero: spreading without drift · positive: right (free motion). Select, then Reset to apply. Selection does not change the live packet or terrain. Default p₀ = 0.75; |p₀Δx| ≤ 0.15.</span>
      </fieldset>
      <fieldset className="brush-controls" disabled={!snapshot || !!error}>
        <legend>Potential painting</legend>
        <label className="painting-toggle"><input type="checkbox" checked={painting}
          onChange={event => togglePainting(event.currentTarget.checked)} /> Painting mode</label>
        <label>Brush width σ = {brush.sigma.toFixed(1)} (x units)
          <input type="range" min={BRUSH_LIMITS.minSigma} max={BRUSH_LIMITS.maxSigma} step="0.1" value={brush.sigma}
            onChange={event => changeBrush('sigma', event.currentTarget.valueAsNumber)} />
        </label>
        <label>Barrier height A = {brush.amplitude.toFixed(1)} (energy units)
          <input type="range" min={BRUSH_LIMITS.minAmplitude} max={TERRAIN_MAX_HEIGHT} step="0.1" value={brush.amplitude}
            onChange={event => changeBrush('amplitude', event.currentTarget.valueAsNumber)} />
        </label>
      </fieldset>
      <p id="painting-help" className="plot-note">Enable Painting mode, then press and drag inside the plot with mouse, touch, or pen. Horizontal position sets the barrier location; vertical position does not set its height. Painting raises terrain, never adds repeatedly. Brush changes apply to the next stroke. Reset pauses and restores the packet/time using the selected initial momentum, preserving terrain. Clear Terrain removes only the barriers.</p>
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
      <p className="plot-note">Cyan: probability density, left scale 0–0.5. Dashed amber: V(x), right scale 0–5. These are different quantities with independent fixed scales; density peaks above 0.5 are clipped. Norm is conserved up to roundoff; energy is conserved only while V is unchanged, not during painting or clearing. At long times the packet reflects from the Dirichlet walls. Playback pauses in background tabs; long frame stalls slow simulated time rather than skipping physics steps.</p>
    </main>
  );
}
