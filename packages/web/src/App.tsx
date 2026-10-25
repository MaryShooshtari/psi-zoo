import { useEffect, useRef, useState } from 'react';
import {
  SimulationPlayback, BRUSH_LIMITS, DEFAULT_BRUSH, TERRAIN_MAX_HEIGHT,
  DEFAULT_INITIAL_MOMENTUM, INITIAL_MOMENTUM_LIMIT, MEASUREMENT_LIMITS,
  type SimulationSnapshot, type SimulationMode,
} from './simulation';
import { bindPotentialPainting, type PaintingBinding } from './painting';
import { drawSimulation } from './plot';
import { bindObservation } from './observation';
import { SCATTERING_CONFIG } from '@psi-zoo/sim-core';
import { Notebook } from './Notebook';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackRef = useRef<SimulationPlayback | null>(null);
  const paintingRef = useRef<PaintingBinding | null>(null);
  const refreshRef = useRef<(() => void) | null>(null);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const notebookTrigger = useRef<HTMLButtonElement | null>(null);
  const [interactionMode, setInteractionMode] = useState<'paint' | 'observe'>('paint');
  const [resolution, setResolution] = useState<number>(MEASUREMENT_LIMITS.default);
  const resolutionRef = useRef<number>(MEASUREMENT_LIMITS.default);
  const [brush, setBrush] = useState(DEFAULT_BRUSH);
  const [initialMomentum, setInitialMomentum] = useState(DEFAULT_INITIAL_MOMENTUM);
  const initialMomentumRef = useRef(DEFAULT_INITIAL_MOMENTUM);
  const modeRef = useRef<SimulationMode>('exploration');
  // Native pointer listeners read current controls without effect reattachment.
  const settingsRef = useRef({ enabled: true, observing: false, brush: DEFAULT_BRUSH });

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
      drawSimulation(context, controller.psi, controller.potential, width, height, controller.lastObservation?.position ?? null);
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
    if (modeRef.current === 'scattering') controller.loadScatteringDemo();
    controller.setInitialMomentum(initialMomentumRef.current);
    controller.setMeasurementResolution(resolutionRef.current);
    if (controller.initialMomentum !== DEFAULT_INITIAL_MOMENTUM || modeRef.current === 'scattering') controller.reset();
    playbackRef.current = controller;
    const refresh = () => { draw(); latest = controller.snapshot(); publish(); };
    refreshRef.current = refresh;
    const fail = (error: unknown) => {
      controller.pause(); settingsRef.current.enabled = false; settingsRef.current.observing = false;
      setSetupError(error instanceof Error ? error.message : String(error));
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
    const observationBinding = bindObservation(canvas, {
      enabled: () => settingsRef.current.observing && !latest.error,
      grid: () => controller.psi, viewport: () => ({ width, height }),
      observe: () => controller.observe(), onError: fail,
    });
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
      observationBinding.dispose(); binding.dispose(); controller.dispose(); observer.disconnect();
      if (publishTimer !== undefined) clearTimeout(publishTimer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', draw);
      window.removeEventListener('blur', cancelStroke);
      if (playbackRef.current === controller) {
        playbackRef.current = null; paintingRef.current = null; refreshRef.current = null;
      }
    };
  }, []);

  const control = (action: 'play' | 'pause' | 'reset' | 'clearTerrain' | 'loadScatteringDemo' | 'loadFreeExploration' | 'observe') => {
    const controller = playbackRef.current;
    if (!controller) return;
    try {
      if (action !== 'play' && action !== 'pause') paintingRef.current?.cancelStroke();
      controller[action]();
      if (action === 'loadScatteringDemo' || action === 'loadFreeExploration') {
        settingsRef.current.enabled = true; settingsRef.current.observing = false; setInteractionMode('paint');
        modeRef.current = controller.snapshot().mode;
        initialMomentumRef.current = controller.initialMomentum; setInitialMomentum(controller.initialMomentum);
      }
      refreshRef.current?.();
    } catch (error) {
      paintingRef.current?.cancelStroke(); controller.pause();
      settingsRef.current.enabled = false; settingsRef.current.observing = false;
      setSetupError(error instanceof Error ? error.message : String(error));
    }
  };
  const openNotebook = () => {
    paintingRef.current?.cancelStroke();
    control('pause');
    setNotebookOpen(true);
  };
  const closeNotebook = () => {
    setNotebookOpen(false);
    notebookTrigger.current?.focus();
  };
  const changeInitialMomentum = (p0: number) => {
    const controller = playbackRef.current;
    if (!controller || !Number.isFinite(p0) || Math.abs(p0) > INITIAL_MOMENTUM_LIMIT) return;
    controller.setInitialMomentum(p0);
    initialMomentumRef.current = p0; setInitialMomentum(p0);
  };
  const changeInteractionMode = (mode: 'paint' | 'observe') => {
    paintingRef.current?.cancelStroke();
    settingsRef.current.enabled = mode === 'paint';
    settingsRef.current.observing = mode === 'observe';
    setInteractionMode(mode);
  };
  const changeResolution = (value: number) => {
    if (!Number.isFinite(value) || value < MEASUREMENT_LIMITS.min || value > MEASUREMENT_LIMITS.max) return;
    playbackRef.current?.setMeasurementResolution(value);
    resolutionRef.current = value; setResolution(value);
  };
  const changeBrush = (key: 'sigma' | 'amplitude', value: number) => {
    const min = key === 'sigma' ? BRUSH_LIMITS.minSigma : BRUSH_LIMITS.minAmplitude;
    const max = key === 'sigma' ? BRUSH_LIMITS.maxSigma : TERRAIN_MAX_HEIGHT;
    if (!Number.isFinite(value) || value < min || value > max) return;
    const next = { ...settingsRef.current.brush, [key]: value };
    settingsRef.current.brush = next; setBrush(next);
  };
  const error = setupError ?? snapshot?.error;
  const demo = snapshot?.mode === 'scattering';
  const extent = demo ? SCATTERING_CONFIG.halfExtent : 20;
  const status = snapshot?.scatteringStatus;
  const scatteringMessage = status === 'separated'
    ? 'Separated packets — R/T estimates in the validated window (absolute numerical budget about 0.0015).'
    : status === 'modified'
      ? 'Provisional — observation, edited terrain or changed reset momentum invalidates R/T. Reset clears observation history; reload the demo to restore the full validated experiment.'
      : status === 'outside-window'
        ? 'Outside the validated t=40–44 window; R/T interpretation is withheld. Later wall reflections can contaminate regions.'
        : status === 'unavailable' ? 'Region diagnostics unavailable.'
          : demo ? 'Provisional — incident/interaction masses are not R/T. Wait for separated packets at t=40–44, then Pause.'
            : 'Provisional — reference-region masses only. Arbitrary painted terrain is not a validated R/T experiment.';
  const number = (value: number | undefined, digits: number) => value !== undefined && Number.isFinite(value) ? value.toFixed(digits) : '—';

  return (
    <main>
      <div className="heading">
        <div className="eyebrow">PSI ZOO · SLICE 3</div>
        <h1>A little world for wavefunctions.</h1>
        <p>Paint a potential landscape or observe the wave packet, then watch it evolve under Schrödinger dynamics — no scripted motion or per-step normalization.</p>
      </div>
      <canvas className={`terrarium ${interactionMode === 'paint' ? 'painting' : 'observing'}`} ref={canvasRef} role="img"
        aria-label={`Numerically evolved density and potential, x from −${extent} to ${extent}. Density left axis 0 to 10.5, square-root spaced; potential right axis 0 to 5, linear. Region cuts at −4 and 4.`}
        aria-describedby="painting-help observation-help" />
      <div className="controls" aria-label="Simulation controls">
        <button onClick={() => control('play')} disabled={!snapshot || snapshot.playing || !!error}>Play</button>
        <button onClick={() => control('pause')} disabled={!snapshot?.playing}>Pause</button>
        <button onClick={() => control('reset')} disabled={!snapshot || !!setupError}>Reset</button>
        <button onClick={() => control('clearTerrain')} disabled={!snapshot || !!setupError}>Clear Terrain</button>
        <span role="status">{error ? 'Stopped — numerical or rendering error' : snapshot?.playing ? 'Playing' : 'Paused'}</span>
      </div>
      <div className="controls" aria-label="Reproducible experiment selection">
        <button onClick={() => control('loadScatteringDemo')} disabled={!snapshot || !!setupError}>Load tunnelling demo</button>
        <button onClick={() => control('loadFreeExploration')} disabled={!snapshot || !!setupError}>Load free exploration</button>
      </div>
      <p className="plot-note">Loading a preset pauses and replaces packet, terrain, time and momentum selection; interaction returns to Paint and the observation RNG rewinds. {demo
        ? 'Validated preset reference: x ∈ [−120,120], packet xc=−24, σ=3, p₀=1.5; Gaussian barrier A=1.8, width=0.6, center=0. Initial mean kinetic energy ≈1.137, momentum spread Δp=1/6; its incident over-barrier tail is less than 1% but is not zero. Keep the loaded preset unchanged for quantitative R/T. Reset uses selected momentum and preserves terrain rather than reloading the barrier.'
        : 'Free exploration: x ∈ [−20,20], packet xc=−5, σ=1, initial p₀=0.75 and no terrain.'}</p>
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
        <legend>Interaction mode</legend>
        <label className="painting-toggle"><input type="radio" name="interaction" checked={interactionMode === 'paint'}
          onChange={() => changeInteractionMode('paint')} /> Paint</label>
        <label className="painting-toggle"><input type="radio" name="interaction" checked={interactionMode === 'observe'}
          onChange={() => changeInteractionMode('observe')} /> Observe</label>
      </fieldset>
      <fieldset className="brush-controls" disabled={!snapshot || !!error}>
        <legend>Position observation</legend>
        <label>Measurement resolution σ = {resolution.toFixed(1)} (x units)
          <input type="range" min={MEASUREMENT_LIMITS.min} max={MEASUREMENT_LIMITS.max} step="0.1"
            value={resolution} aria-describedby="observation-help"
            onChange={event => changeResolution(event.currentTarget.valueAsNumber)} />
        </label>
        <button onClick={() => control('observe')} disabled={interactionMode !== 'observe'}>Observe particle</button>
        <button ref={notebookTrigger} onClick={openNotebook} aria-haspopup="dialog"
          aria-controls="observer-notebook" aria-expanded={notebookOpen}>Why did it jump?</button>
        <span role="status">{snapshot?.observation
          ? `Observed x = ${snapshot.observation.position.toFixed(2)} at t = ${snapshot.observation.time.toFixed(2)} (σ = ${snapshot.observation.resolution.toFixed(1)}); observation #${snapshot.measurementCount}`
          : 'No position observed yet.'}</span>
      </fieldset>
      {notebookOpen && <Notebook observation={snapshot?.observation ?? null} onClose={closeNotebook} />}
      <p id="observation-help" className="plot-note">In Observe mode, click anywhere inside the plot or activate Observe particle with the keyboard. The click only triggers measurement: the Born distribution samples the outcome, not the click location. Lower resolution σ means a sharper finite-resolution Gaussian measurement, not exact coordinate projection. The magenta line and diamond mark the last sampled position, not a tracked particle. Observe while paused or playing; Play continues evolution and re-spreading. Reset clears the result and rewinds the seeded random sequence; the selected resolution is retained.</p>
      <fieldset className="brush-controls" disabled={!snapshot || !!error}>
        <legend>Potential painting</legend>
        <label>Brush width σ = {brush.sigma.toFixed(1)} (x units)
          <input type="range" min={BRUSH_LIMITS.minSigma} max={BRUSH_LIMITS.maxSigma} step="0.1" value={brush.sigma}
            onChange={event => changeBrush('sigma', event.currentTarget.valueAsNumber)} />
        </label>
        <label>Barrier height A = {brush.amplitude.toFixed(1)} (energy units)
          <input type="range" min={BRUSH_LIMITS.minAmplitude} max={TERRAIN_MAX_HEIGHT} step="0.1" value={brush.amplitude}
            onChange={event => changeBrush('amplitude', event.currentTarget.valueAsNumber)} />
        </label>
      </fieldset>
      <p id="painting-help" className="plot-note">Select Paint mode, then press and drag inside the plot with mouse, touch, or pen. Horizontal position sets the barrier location; vertical position does not set its height. Painting raises terrain, never adds repeatedly. Brush changes apply to the next stroke. Reset pauses and restores the packet/time using the selected initial momentum, preserving terrain. Clear Terrain removes only the barriers.</p>
      {error && <p className="error" role="alert">{error} {snapshot?.error && 'Reset to restore the initial state.'}</p>}
      <div className="diagnostics" aria-label="Simulation diagnostics">
        <span><strong>Physical time:</strong> {number(snapshot?.time, 2)}</span>
        <span><strong>Probability norm:</strong> {number(snapshot?.norm, 10)}</span>
        <span><strong>Energy ⟨ψ|H|ψ⟩:</strong> {number(snapshot?.energy, 8)}</span>
        <span><strong>Energy drift since last update:</strong> {number(snapshot?.energyDrift, 10)}</span>
      </div>
      <section className="scattering-readout" aria-label="Scattering probability regions">
        <h2>Probability regions · cuts at x = −4 and +4</h2>
        <div className="diagnostics">
          <span><strong>P_left (x &lt; −4):</strong> {number(snapshot?.regions?.left, 6)}</span>
          <span><strong>P_interaction (−4 ≤ x ≤ 4):</strong> {number(snapshot?.regions?.interaction, 6)}</span>
          <span><strong>P_right (x &gt; 4):</strong> {number(snapshot?.regions?.right, 6)}</span>
          <span><strong>Region sum:</strong> {number(snapshot?.regions?.total, 10)}</span>
        </div>
        <p className="plot-note" role="status">{scatteringMessage}</p>
        <div className="diagnostics">
          <span><strong>R estimate:</strong> {number(snapshot?.reflection ?? undefined, 4)}</span>
          <span><strong>T estimate:</strong> {number(snapshot?.transmission ?? undefined, 4)}</span>
        </div>
        <p className="plot-note">All masses come from the actual wavefunction, with disjoint dx-weighted samples. P_left includes the incident packet before collision; it is not then reflection. Only the unchanged left-incident demo, after separation and before wall returns, supplies R/T estimates. Gray dotted lines mark the reference cuts, not hard walls. The demo's transmitted mass exceeds a conservative incident over-barrier-tail bound; a below-peak mean energy alone would not establish tunnelling.</p>
      </section>
      <footer>
        <span><strong>Evolution:</strong> Crank–Nicolson · Δt = {demo ? SCATTERING_CONFIG.dt : 0.01} · ℏ = m = 1</span>
        <span><strong>Grid:</strong> {demo ? 2401 : 401} points · Δx = 0.1 · fixed zero endpoints</span>
      </footer>
      <p className="plot-note">Cyan: probability density, fixed square-root-spaced left scale 0–10.5 (not linear). Dashed amber: V(x), independent linear right scale 0–5. Density ticks are actual |ψ|² values; screen area under this nonlinear curve is not probability. The fixed density range includes the normalized-grid maximum 1/Δx = 10 with headroom, so sharp measurement peaks remain visible without autoscaling. Norm is conserved up to roundoff; energy is conserved during evolution with fixed V, not during measurement, painting or clearing. The energy-drift reference resets after these updates and Reset. At long times the packet reflects from the Dirichlet walls. Playback pauses in background tabs; long frame stalls slow simulated time rather than skipping physics steps.</p>
    </main>
  );
}
