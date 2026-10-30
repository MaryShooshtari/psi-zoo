import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SimulationPlayback2D, type Snapshot2D } from './simulation2d';
import { createDensityRenderer2D, densityViewport2D, physicalToCanvas2D, canvasToPhysical2D } from './render/density2d';
import { createPotentialRenderer2D } from './render/potential2d';
import { bindTerrainPainting2D, type Point2D } from './terrainBrush';
import { TerrainControls, DEFAULT_TERRAIN_SETTINGS, type TerrainDisplaySettings } from './TerrainControls';
import type { TerrainPreset2D } from './terrainPresets';
import { createCreatureRenderer2D } from './render/creatures2d';
import { EntanglementControls2D } from './EntanglementControls2D';
import { WorldControls2D } from './WorldControls2D';
import type { QuantumWorld2D } from './world/world2d';
import { PlaybackBar, SettingsPopover, SettingsPage, useSettingsNavigation } from './TerrariumShell';
import { createCreatureDecoration, pickCreature } from './render/creatureDecoration';
import { projectionViewport } from './render/projection1d';
import { creatureLabel } from './creatureIdentity';
import { CreatureSummary2D } from './CreatureSummary2D';
import { TerrainShortcuts } from './TerrainShortcuts';
import { createProjectionRenderer } from './render/projection1d';
import { TerrariumViewTransition, type TerrariumViewMode } from './terrariumView';
import { GuideCard, NotebookLauncher } from './Museum';
import { hasObservedSpreading, prepareMuseumScene, paintGuideBarrier, qualifyingBarrierStroke } from './museumGuide';
import type { MuseumScene, Topic } from './museumScience';

export function Simulation2D({ worldMode = false, viewMode = '2d', demonstrations, experiments, initialPreset, guideSession = 0, guideActive = false, finishGuide, onScene, openChapter }: { worldMode?: boolean; viewMode?: TerrariumViewMode; demonstrations?: ReactNode; experiments?: ReactNode; initialPreset?: TerrainPreset2D; guideSession?: number; guideActive?: boolean; finishGuide?: () => void; onScene?: (scene: MuseumScene) => void; openChapter?: (topic: Topic) => void }) {
  const [guideStep, setGuideStep] = useState(1), [guidePlayed, setGuidePlayed] = useState(false), [guidePainted, setGuidePainted] = useState(false);
  const guideRuntime = useRef({ active: guideActive, step: guideStep }); guideRuntime.current = { active: guideActive, step: guideStep };
  const initialGuideWidth = useRef<Snapshot2D | null>(null), pristineGaussian = useRef(true), presetRevision = useRef<number | null>(null);
  const displayRef = useRef({ visible: true, animate: true, reduced: true });
  const [decorations, setDecorations] = useState(true), [animateFaces, setAnimateFaces] = useState(true);
  const projectionRef = useRef<HTMLCanvasElement>(null);
  const transition = useRef<TerrariumViewTransition | null>(null);
  const [morphing, setMorphing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null), cursorRef = useRef<HTMLDivElement>(null);
  const playback = useRef<SimulationPlayback2D | null>(null);
  const bindingRef = useRef<ReturnType<typeof bindTerrainPainting2D> | null>(null);
  const refreshRef = useRef<(() => void) | null>(null);
  const settingsRef = useRef(DEFAULT_TERRAIN_SETTINGS);
  const [settings, setSettings] = useState(DEFAULT_TERRAIN_SETTINGS);
  const [snapshot, setSnapshot] = useState<Snapshot2D | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const selectedOnlyRef = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current, projectionCanvas = projectionRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d'), projectionContext = projectionCanvas?.getContext('2d');
    if (!context || (worldMode && !projectionContext)) { setError('Canvas2D unavailable'); return; }
    let lastPublish = -Infinity, timer: ReturnType<typeof setTimeout> | undefined;
    let latest: Snapshot2D;
    let selectionPointer: { id: number; x: number; y: number; target: HTMLCanvasElement } | null = null;
    let guideStroke: { id: number; x: number; y: number; revision: number } | null = null;
    const publish = () => {
      if (timer !== undefined) clearTimeout(timer); timer = undefined; lastPublish = performance.now(); setSnapshot(latest);
      if (guideSession && !initialGuideWidth.current) initialGuideWidth.current = latest;
      if (latest.time > 0 && (latest.potentialL1 > 0 || latest.world?.interactions.drives || latest.world?.interactions.social)) pristineGaussian.current = false;
      onScene?.({ kind: '2d', snapshot: latest, knownGaussian: pristineGaussian.current, uneditedPreset: presetRevision.current === latest.terrainRevision });
    };
    // Rebind this UI-owned callback only on view changes. The steady 2D frame
    // keeps its original draw path, with no projection branch or second pass.
    const presentation = { draw: () => drawCurrent(), intervalMs: 100 };
    const controller = new SimulationPlayback2D({ request: cb => requestAnimationFrame(cb), cancel: id => cancelAnimationFrame(id) }, next => {
      if (next.error) bindingRef.current?.cancel();
      else if (!worldMode) drawField();
      latest = next;
      const delay = 100 - (performance.now() - lastPublish);
      if (!next.playing || next.error || delay <= 0) publish();
      else if (timer === undefined) timer = setTimeout(publish, delay);
    }, worldMode ? { worldPreset: guideSession ? 'independent' : 'mood', presentation } : {});
    if (worldMode && guideSession) prepareMuseumScene(controller);
    const creatures = worldMode ? createCreatureRenderer2D(controller.psi, {
      get ids() { return controller.world!.ids; }, copyDensity: (id, out) => controller.world!.copyDensity(id, out),
    }) : null;
    const render = createDensityRenderer2D(controller.psi), overlay = createPotentialRenderer2D(controller.psi, controller);
    const decorate = worldMode ? createCreatureDecoration(controller.psi) : null;
    const projection = worldMode ? createProjectionRenderer(controller.psi, {
      get ids() { return controller.world!.ids; }, copyProjectedDensityX: (id, out) => controller.world!.copyProjectedDensityX(id, out),
    }, controller) : null;
    const preview = (p: Point2D | null) => {
      const cursor = cursorRef.current; if (!cursor) return;
      cursor.hidden = !p || settingsRef.current.tool === 'view' || transition.current?.mode === '1d' || transition.current?.transitioning === true;
      if (!p) return;
      const width = canvas.clientWidth, height = canvas.clientHeight;
      const q = physicalToCanvas2D(controller.psi, p.x, p.y, width, height);
      const r = settingsRef.current.sigma / (controller.psi.xmax - controller.psi.xmin) * densityViewport2D(controller.psi, width, height).width;
      cursor.style.left = `${q.x - r}px`; cursor.style.top = `${q.y - r}px`; cursor.style.width = `${2 * r}px`; cursor.style.height = `${2 * r}px`;
    };
    const drawField = () => {
      const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight), dpr = window.devicePixelRatio || 1;
      const w = Math.round(width * dpr), h = Math.round(height * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; preview(null); }
      context.setTransform(w / width, 0, 0, h / height, 0, 0);
      if (creatures) creatures(context, width, height, controller.world!.selected, selectedOnlyRef.current);
      else render(context, width, height);
      overlay.draw(context, width, height, settingsRef.current.overlay, settingsRef.current.opacity);
      if (decorate && creatures && displayRef.current.visible) decorate(context, width, height, creatures.layers, latest?.world, controller.world!.selected, false, displayRef.current.reduced, performance.now(), displayRef.current.animate && latest?.playing === true);
    };
    const drawProjection = () => {
      if (projection && projectionCanvas && projectionContext) {
        const width = Math.max(1, projectionCanvas.clientWidth), height = Math.max(1, projectionCanvas.clientHeight), dpr = window.devicePixelRatio || 1;
        const w = Math.round(width * dpr), h = Math.round(height * dpr);
        if (projectionCanvas.width !== w || projectionCanvas.height !== h) { projectionCanvas.width = w; projectionCanvas.height = h; }
        projectionContext.setTransform(w / width, 0, 0, h / height, 0, 0);
        projection(projectionContext, width, height, controller.world!.selected, selectedOnlyRef.current, settingsRef.current.overlay, settingsRef.current.opacity);
        if (decorate && displayRef.current.visible) decorate(projectionContext, width, height, projection.layers, latest?.world, controller.world!.selected, true, displayRef.current.reduced, performance.now(), displayRef.current.animate && latest?.playing === true, projection.scale);
      }
    };
    // Outgoing canvas pixels remain a visual-only snapshot. The destination
    // callback always reads live data, including on completion while paused.
    let drawCurrent = worldMode && viewMode === '1d' ? drawProjection : drawField;
    // View transitions only draw and cancel unfinished pointer strokes. They do
    // not call playback, snapshots, measurements, presets, or world commands.
    const view = new TerrariumViewTransition(worldMode ? viewMode : '2d', () => {
      drawCurrent = view.mode === '1d' ? drawProjection : drawField;
      selectionPointer = null; guideStroke = null;
      setMorphing(view.transitioning); bindingRef.current?.cancel(); preview(null); drawCurrent();
    });
    transition.current = view;
    playback.current = controller;
    const refresh = () => { latest = controller.snapshot(); drawCurrent(); publish(); };
    refreshRef.current = refresh;
    const binding = bindTerrainPainting2D(canvas, { grid: controller.psi, settings: () => guideRuntime.current.active && guideRuntime.current.step !== 3 || transition.current?.mode === '1d' || transition.current?.transitioning ? { ...settingsRef.current, tool: 'view' } : settingsRef.current,
      stamp: (p, brush) => controller.stamp(p.x, p.y, brush),
      changed: () => { drawCurrent(); latest = controller.snapshot(); if (performance.now() - lastPublish >= 100) publish(); else if (timer === undefined) timer = setTimeout(publish, 100); },
      preview, onError: e => { controller.pause(); setError(e instanceof Error ? e.message : String(e)); settingsRef.current = { ...settingsRef.current, tool: 'view' }; setSettings(settingsRef.current); refresh(); },
    });
    bindingRef.current = binding;
    const selectDown = (event: PointerEvent) => {
      if (!worldMode || event.button !== 0 || !event.isPrimary || view.mode !== '1d' && settingsRef.current.tool !== 'view' || view.transitioning) return;
      selectionPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, target: event.currentTarget as HTMLCanvasElement };
    };
    const selectUp = (event: PointerEvent) => {
      const down = selectionPointer; selectionPointer = null;
      if (!down || event.button !== 0 || !event.isPrimary || event.pointerId !== down.id || event.currentTarget !== down.target || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6 || view.transitioning || view.mode !== '1d' && settingsRef.current.tool !== 'view') return;
      const target = down.target, rect = target.getBoundingClientRect(), width = target.clientWidth, height = target.clientHeight;
      const x = (event.clientX - rect.left) * width / rect.width, y = (event.clientY - rect.top) * height / rect.height;
      let id: string | null = null;
      if (view.mode === '1d' && target === projectionCanvas && projection) {
        const v = projectionViewport(width, height), i = Math.round((x - v.left) / (v.right - v.left) * (controller.psi.xmax - controller.psi.xmin) / controller.psi.dx) - 1;
        if (i >= 0 && i < controller.psi.nx && y <= v.baseline && y >= v.top) id = pickCreature(projection.layers.filter(l => y >= v.baseline - l.density[i]! / projection.scale * (v.baseline - v.top)), i, controller.world!.selected);
      } else if (view.mode === '2d' && target === canvas && creatures) {
        const point = canvasToPhysical2D(controller.psi, x, y, width, height);
        if (point) {
          const i = Math.round((point.x - controller.psi.xmin) / controller.psi.dx) - 1, j = Math.round((point.y - controller.psi.ymin) / controller.psi.dy) - 1;
          if (i >= 0 && i < controller.psi.nx && j >= 0 && j < controller.psi.ny) id = pickCreature(creatures.layers, j * controller.psi.nx + i, controller.world!.selected);
        }
      }
      if (id && controller.world!.ids.includes(id)) { controller.world!.select(id); refresh(); }
    };
    const guideDown = (event: PointerEvent) => {
      if (guideRuntime.current.active && guideRuntime.current.step === 3 && event.isPrimary && event.button === 0 && settingsRef.current.tool === 'barrier' && view.mode === '2d' && !view.transitioning) guideStroke = { id: event.pointerId, x: event.clientX, y: event.clientY, revision: controller.terrainRevision };
    };
    const guideUp = (event: PointerEvent) => {
      const start = guideStroke; guideStroke = null;
      if (start && start.id === event.pointerId && guideRuntime.current.active && guideRuntime.current.step === 3 && event.isPrimary && event.button === 0 && settingsRef.current.tool === 'barrier' && view.mode === '2d' && !view.transitioning && qualifyingBarrierStroke(Math.hypot(event.clientX-start.x, event.clientY-start.y), start.revision, controller.terrainRevision, controller.snapshot().potentialMax)) setGuidePainted(true);
    };
    canvas.addEventListener('pointerdown', guideDown); canvas.addEventListener('pointerup', guideUp);
    const cancelSelection = () => { selectionPointer = null; guideStroke = null; };
    for (const target of [canvas, projectionCanvas]) if (target && worldMode) {
      target.addEventListener('pointerdown', selectDown); target.addEventListener('pointerup', selectUp); target.addEventListener('pointercancel', cancelSelection); target.addEventListener('pointerleave', cancelSelection);
    }
    const visibility = () => { if (document.hidden) { cancelSelection(); binding.cancel(); controller.pause(); refresh(); } };
    const observer = new ResizeObserver(() => drawCurrent()); observer.observe(canvas); if (projectionCanvas) observer.observe(projectionCanvas);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', binding.cancel); window.addEventListener('blur', cancelSelection);
    if (!worldMode && initialPreset) { controller.loadPreset(initialPreset); presetRevision.current = controller.terrainRevision; }
    refresh();
    return () => {
      view.dispose(); transition.current = null;
      canvas.removeEventListener('pointerdown', guideDown); canvas.removeEventListener('pointerup', guideUp);
      for (const target of [canvas, projectionCanvas]) if (target && worldMode) {
        target.removeEventListener('pointerdown', selectDown); target.removeEventListener('pointerup', selectUp); target.removeEventListener('pointercancel', cancelSelection); target.removeEventListener('pointerleave', cancelSelection);
      }
      binding.dispose(); controller.dispose(); observer.disconnect(); if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', binding.cancel); window.removeEventListener('blur', cancelSelection);
      playback.current = null; bindingRef.current = null; refreshRef.current = null;
    };
  }, [worldMode, initialPreset]); // Intentionally not viewMode: changing projection never remounts the world.
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    displayRef.current.reduced = media.matches;
    transition.current?.setMode(worldMode ? viewMode : '2d', media.matches);
    const changed = () => { displayRef.current.reduced = media.matches; if (media.matches) transition.current?.finish(); refreshRef.current?.(); };
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, [viewMode, worldMode]);
  useEffect(() => {
    if (snapshot && worldMode && guideSession > 0 && !guideActive) canvasRef.current?.closest('main')?.querySelector<HTMLButtonElement>('.playback-bar button:not(:disabled)')?.focus();
    // Focus only after the fresh scene's first DOM publication, never every tick.
  }, [snapshot !== null, guideSession, guideActive, worldMode]);
  const control = (action: 'play' | 'pause' | 'reset' | 'clearTerrain' | TerrainPreset2D) => {
    const controller = playback.current; if (!controller) return;
    bindingRef.current?.cancel();
    try {
      if (action === 'reset') pristineGaussian.current = true;
      if (action === 'free' || action === 'barrier' || action === 'well') { controller.loadPreset(action); presetRevision.current = controller.terrainRevision; pristineGaussian.current = true; }
      else controller[action]();
      if (guideActive && guideStep === 1 && viewMode === '2d' && action === 'play' && controller.snapshot().playing) setGuidePlayed(true);
      refreshRef.current?.();
    } catch (e) { controller.pause(); setError(e instanceof Error ? e.message : String(e)); }
  };
  const change = (s: TerrainDisplaySettings) => {
    bindingRef.current?.cancel(); settingsRef.current = s; setSettings(s); refreshRef.current?.();
  };
  const worldAction = (action: (world: QuantumWorld2D, controller: SimulationPlayback2D) => void) => {
    const controller = playback.current; if (!controller?.world) return;
    bindingRef.current?.cancel();
    try { action(controller.world, controller); if (controller.world.time === 0) pristineGaussian.current = true; refreshRef.current?.(); }
    catch (e) { controller.pause(); setError(e instanceof Error ? e.message : String(e)); }
  };
  const number = (v: number | undefined, digits: number) => v !== undefined && Number.isFinite(v) ? v.toFixed(digits) : '—';
  const displayedView = worldMode ? viewMode : '2d';
  return <main className="simulation-stage" data-view={displayedView} data-morphing={morphing}>
    <div className={`playground ${worldMode ? 'unified-playground' : ''}`}>
      {worldMode && <p className="view-explanation" id="view-explanation" aria-live="polite">{viewMode === '1d'
        ? 'Quantum shadow: position probability summed along y. The world is still 2D. Click a hill to select.'
        : 'Click a cloud to select a creature—not measure. One 2D world.'}</p>}
      <div className="terrain-canvas-wrap" aria-hidden={displayedView === '1d'}>
      <canvas className={`density-2d ${settings.tool === 'view' ? '' : 'terrain-editing'}`} ref={canvasRef} role="img"
        aria-label="2D probability density with optional signed potential overlay; x increases right, y increases up; both from minus 10 to 10" aria-describedby={worldMode ? 'creature-display-help terrain-help' : 'terrain-help'} />
      <div ref={cursorRef} className="terrain-cursor" hidden aria-hidden="true" />
    </div>
    {worldMode && <div className="projection-layer" aria-hidden={viewMode !== '1d'}>
      <canvas ref={projectionRef} className="projection-1d" role="img" aria-label="Marginal position probability density along x for the same 2D creatures; shared linear density scale. Average terrain along y is a separate signed energy profile, not an effective 1D Hamiltonian." aria-describedby="view-explanation projection-help" />
    </div>}
    </div>
    <PlaybackBar><div className="controls" aria-label="2D simulation controls">
      <button onClick={() => control('play')} disabled={!snapshot || snapshot.playing || !!snapshot.error || !!error}>Play</button>
      <button onClick={() => control('pause')} disabled={!snapshot?.playing}>Pause</button>
      <button onClick={() => control('reset')} disabled={!snapshot}>Reset evolution</button>
      <span role="status">{snapshot?.error || error ? 'Stopped — error' : snapshot?.playing ? 'Playing' : 'Paused'}</span>
    </div>
      <span className="time-readout">Time {number(snapshot?.time, 2)}</span>
      {snapshot?.world ? <label className="selected-creature">Creature <select aria-label="Selected creature" value={snapshot.world.selected} onChange={e => worldAction(w => w.select(e.currentTarget.value))}>
        {snapshot.world.creatures.map(c => <option key={c.id} value={c.id}>{creatureLabel(c.id)}</option>)}
      </select></label> : <span className="selected-creature">Single Gaussian</span>}
      {snapshot?.world && <CreatureSummary2D snapshot={snapshot.world} />}
      {(error || snapshot?.error) && <span role="alert" className="error">{error ?? snapshot?.error}</span>}
    </PlaybackBar>
    <SettingsPopover navigation>
    <SettingsPage section="Simulation"><div className="heading"><h2>{worldMode ? 'Independent spaces, entangled moods.' : 'A landscape for a wavefunction.'}</h2>
      <p>{worldMode ? 'One spatial wavefunction per creature; independent or shared paired mood qubits. Forces act through explicit effective potentials, never scripted motion.' : 'Paint potential energy, not probability. The single complex wavefunction responds through genuine Schrödinger evolution.'}</p>
      <p>{worldMode ? 'The main 1D/2D switch changes only the view of this world. Advanced/Legacy demonstrations below are separate experiments.' : 'This is a standalone 2D Gaussian demonstration. The main view switch leaves it and starts a fresh terrarium.'}</p></div><p>Use the persistent Play, Pause and Reset evolution controls below the playground. Reset preserves terrain; changing view never resets.</p></SettingsPage>
    <SettingsPage section="Physics notebook">{openChapter && <NotebookLauncher open={openChapter} />}{worldMode && <p id="projection-help" className="plot-note">The 1D hills show ρx(x) = Δy Σy |ψ(x,y)|², not a standalone 1D wavefunction. Integrating each curve with Δx gives that creature’s spatial norm (normally 1). The common linear density axis expands to include the largest peak of any creature with 15% headroom (minimum 0.5); relative heights are preserved. The baseline is a plotting zero, not a quantum boundary. Average terrain along y is an unweighted vertical average of editable terrain only, not an equivalent 1D Hamiltonian. Switch to 2D to paint; switching views never measures or resets anything.</p>}
    </SettingsPage>
    <SettingsPage section="Experiments"><TerrainShortcuts barrier={() => change({ ...settingsRef.current, tool: 'barrier' })} well={() => change({ ...settingsRef.current, tool: 'well' })} />
      <p>Watch scattering opens the separate Gaussian experiment with its validated scattering terrain and packet, paused at t=0. It replaces the current experiment, unlike changing view.</p>{experiments}</SettingsPage>
    <TerrainControls settings={settings} disabled={guideActive && guideStep !== 3 || !snapshot || !!error || !!snapshot.error} change={change} clear={() => control('clearTerrain')} preset={worldMode ? undefined : p => control(p)} />
    <SettingsPage section="Creatures">{!worldMode && <p>This standalone experiment has one Gaussian state. Return to the terrarium for creature identities and selection.</p>}</SettingsPage>
    {snapshot?.world && <WorldControls2D snapshot={snapshot.world} selectedOnly={selectedOnly} disabled={guideActive || !!error || !!snapshot.error}
      changeView={value => { selectedOnlyRef.current = value; setSelectedOnly(value); refreshRef.current?.(); }}
      select={id => worldAction(w => w.select(id))} add={() => worldAction(w => { w.addTemplate(); })} remove={() => worldAction(w => w.remove())}
      interactions={s => worldAction(w => w.setInteractions(s))} preset={p => worldAction((_w, c) => c.loadWorldPreset(p))} />}
    <SettingsPage section="Moods & friendships">{snapshot?.world ? <EntanglementControls2D snapshot={snapshot.world} action={fn => worldAction(fn)} disabled={guideActive || !!error || !!snapshot.error} /> : <p>Mood friendships belong to the creature world, not this standalone Gaussian experiment.</p>}</SettingsPage>
    <SettingsPage section="Display">{worldMode && <fieldset className="brush-controls"><legend>Creature overlays · presentation only</legend>
      <label className="painting-toggle"><input type="checkbox" aria-label="Show creature decorations" checked={decorations} onChange={e => { displayRef.current.visible = e.currentTarget.checked; setDecorations(e.currentTarget.checked); refreshRef.current?.(); }} /> Show names, faces, mood badges, selection halos and pair connections</label>
      <label className="painting-toggle"><input type="checkbox" aria-label="Animate creature faces" checked={animateFaces} onChange={e => { displayRef.current.animate = e.currentTarget.checked; setAnimateFaces(e.currentTarget.checked); refreshRef.current?.(); }} /> Gentle blinking while playing (off with reduced motion)</label>
    </fieldset>}</SettingsPage>
    {(error || snapshot?.error) && <p role="alert" className="error">{error ?? snapshot?.error}</p>}
    <SettingsPage section="Advanced"><h3>Advanced diagnostics & model notes</h3>
    <div className="diagnostics" aria-label="2D simulation diagnostics">
      <span><strong>Physical time:</strong> {number(snapshot?.time, 3)}</span>
      <span><strong>{worldMode ? 'Selected norm:' : 'Probability norm:'}</strong> {number(snapshot?.norm, 10)}</span>
      <span><strong>σx:</strong> {number(snapshot?.sigmaX, 5)}</span>
      <span><strong>σy:</strong> {number(snapshot?.sigmaY, 5)}</span>
      {!worldMode && <span><strong>Energy:</strong> {number(snapshot?.energy, 8)}</span>}
      <span><strong>Terrain revision:</strong> {snapshot?.terrainRevision ?? '—'}</span>
      <span><strong>V minimum:</strong> {number(snapshot?.potentialMin, 5)}</span>
      <span><strong>V maximum:</strong> {number(snapshot?.potentialMax, 5)}</span>
      <span><strong>Terrain ∫|V|:</strong> {number(snapshot?.potentialL1, 8)}</span>
    </div>
    <p className="plot-note">{snapshot?.experiment}</p></SettingsPage>
    <SettingsPage section="Terrain"><p id="terrain-help" className="plot-note">View / inspect never paints. Select Barrier (+), Well (−), or Eraser, then click or drag with mouse, pen, or touch. Brush radius is Gaussian σ; its finite support ends at 3σ. Stamps add ±A, clamped to [−20,20]; repeated passes accumulate. Eraser smoothly reduces either sign toward zero. The ring shows σ, not the full cutoff. Switch to 2D to paint; the 1D marginal does not retain y coordinates.</p></SettingsPage>
    <SettingsPage section="Physics notebook"><p id="creature-display-help" className="plot-note">Faces and halos are decorative overlays anchored to significant probability density, not particles or sampled measurements. Split clouds use a significant density maximum when the mean is low-density. Click a cloud to select, never measure: the largest visible local density contribution wins, ties keep the selection then use ID order; tails below 1% of the visible peak are ignored. Use the creature list for diffuse or hidden clouds. Dotted friendship links mark registered mood-pair identity only, not force, transport or communication; nothing travels along them. Mixed moods are valid quantum states, not unhappy creatures.</p>
    <p className="plot-note">{worldMode ? 'Reset evolution restores the current roster’s saved initial spatial states and moods, preserving terrain and current interaction settings. Added creatures keep their template initial conditions; removed creatures stay removed. World presets replace the roster, moods and interaction settings at t=0, preserving terrain. Clear terrain preserves all states, moods and time.' : 'Reset evolution restores this experiment’s initial packet and time, preserving terrain. Clear terrain preserves the live packet and time. Load preset replaces packet and terrain and pauses at t=0.'} Painting works while playing, between complete fixed steps. Editing changes H and can change energy immediately; it does not measure, collapse, renormalize, or move the wavefunction directly. Even with fixed H, splitting introduces numerical energy drift. Norm remains the conservation diagnostic.</p>
    <footer><span>128 × 128 interior points · x,y ∈ [−10,10] · Δx = Δy = 20/129</span>
      <span>ℏ = m = 1 · Δt = 1/120 · zero Dirichlet boundaries</span></footer>
    <p className="plot-note">Density: fixed brightness 1 − exp(−ρ/0.08), independent of signed terrain colors. Hide the overlay to inspect density alone. The frozen-potential Cayley solver is second-order, not full 2D Crank–Nicolson; world feedback is generally first-order. Finite walls eventually reflect packets. Mood measurement is available only in the creature world; no spatial measurement or spatial entanglement. Background tabs pause; stalls never enlarge physics Δt.</p>
    </SettingsPage><SettingsPage section="Advanced">{demonstrations}</SettingsPage>
    </SettingsPopover>
    {guideActive && worldMode && <GuideCard step={guideStep} setStep={setGuideStep} view={viewMode} finish={() => finishGuide?.()}
      ready={!morphing && (guideStep === 1 ? viewMode === '2d' && hasObservedSpreading(guidePlayed, initialGuideWidth.current, snapshot) : guideStep === 2 ? viewMode === '1d' : viewMode === '2d' && guidePainted && (snapshot?.potentialMax ?? 0) > 0)}
      canPaint={guideStep === 3 && viewMode === '2d' && !morphing && settings.tool === 'barrier'}
      paint={() => { const c = playback.current; if (!c || viewMode !== '2d' || morphing || settingsRef.current.tool !== 'barrier') return; try { const before = c.terrainRevision; paintGuideBarrier(c, settingsRef.current); if (qualifyingBarrierStroke(12, before, c.terrainRevision, c.snapshot().potentialMax)) setGuidePainted(true); refreshRef.current?.(); } catch (e) { c.pause(); setError(String(e)); } }} />}
  </main>;
}
