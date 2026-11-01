import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SimulationPlayback2D, type Snapshot2D } from './simulation2d';
import { playgroundGrid2D } from './playgroundDomain2d';
import { createDensityRenderer2D, densityViewport2D, physicalToCanvas2D, canvasToPhysical2D } from './render/density2d';
import { createPotentialRenderer2D } from './render/potential2d';
import { bindTerrainPainting2D, type Point2D } from './terrainBrush';
import { TerrainControls, DEFAULT_TERRAIN_SETTINGS, terrainInstruction, type TerrainDisplaySettings } from './TerrainControls';
import type { TerrainPreset2D } from './terrainPresets';
import { createCreatureRenderer2D } from './render/creatures2d';
import { EntanglementControls2D } from './EntanglementControls2D';
import { WorldControls2D } from './WorldControls2D';
import type { QuantumWorld2D } from './world/world2d';
import { PlaybackBar, SettingsPopover, SettingsPage, SettingsHomeActions, useSettingsNavigation, type SettingsSection } from './TerrariumShell';
import { createCreatureDecoration, pickCreature, actionCandidates, projectedActionCandidates, measurementReactionTargets } from './render/creatureDecoration';
import { projectionViewport } from './render/projection1d';
import { creatureLabel } from './creatureIdentity';
import { CreatureSummary2D } from './CreatureSummary2D';
import { createProjectionRenderer } from './render/projection1d';
import { TerrariumViewTransition, type TerrariumViewMode } from './terrariumView';
import { GuideCard, NotebookLauncher } from './Museum';
import { hasObservedSpreading, prepareMuseumScene, paintGuideBarrier, qualifyingBarrierStroke } from './museumGuide';
import type { MuseumScene, Topic } from './museumScience';
import { CreatureActions2D, CreatureActionStatus2D } from './CreatureActions2D';
import { actionReceiptText, createCreatureInteractionOwner2D, captureWorldUIRequest, axesForView, guardWorldUIRequest, rejectAction, sameActionToken, validateWorldUICommand,
  type CreatureActionState2D, type DraftEdit2D, type OpenAction2D,
  type ActionToken2D, type WorldUICommand2D, type WorldUIRequest2D, type WorldUIResult2D } from './creatureActionState2d';
import type { WorldAction2D } from './world/world2d';

/** Prepared for the isolated integration fixture; not mounted in the normal UI
 * until provenance, science, instructions and complete browser checks are ready.
 * No callback command bus: only the closed, copied request envelope is executed. */
export function createWorldUIExecutor2D(context: {
  current: () => { controller: SimulationPlayback2D | null; token: ActionToken2D | null; solverStopped: boolean; guideActive: boolean; morphing: boolean };
  consumeIntent: () => void;
  committed: (command: WorldUICommand2D, receipt: WorldAction2D | null, addedTargetId: string | null) => void;
  cancelPendingPublication: () => void;
  publish: () => void;
}) {
  let executing = false, consumed: ActionToken2D | null = null;
  let retainedError: unknown = null;
  let lastApplied: Extract<WorldUIResult2D, { status: 'applied' }> | null = null;
  let lastAppliedWorld: QuantumWorld2D | null = null;
  const message = (error: unknown) => error instanceof Error ? error.message : String(error);
  const commandError = (error: unknown): WorldUIResult2D => {
    retainedError = error;
    return Object.freeze({ status: 'command-error', message: message(error) });
  };
  const publish = (result: Extract<WorldUIResult2D, { status: 'applied' }>, before?: () => void): WorldUIResult2D => {
    try {
      let failed = false, failure: unknown;
      try { context.cancelPendingPublication(); } catch (error) { failed = true; failure = error; }
      try { before?.(); } catch (error) { if (!failed) { failed = true; failure = error; } }
      if (failed) throw failure;
      context.publish();
      lastApplied = Object.freeze({ ...result, publication: 'published', message: null });
    } catch (error) {
      retainedError = error;
      lastApplied = Object.freeze({ ...result, publication: 'display-failed', message: `Applied, but the display could not refresh: ${message(error)}. Redraw does not repeat the command.` });
    }
    return lastApplied;
  };
  const execute = (request: WorldUIRequest2D): WorldUIResult2D => {
    let current: ReturnType<typeof context.current>;
    try { current = context.current(); } catch (error) { return commandError(error); }
    const controller = current.controller, world = controller?.world ?? null;
    const refusal = guardWorldUIRequest(request, { ...current, mounted: !!controller, world, executing });
    if (refusal) return refusal;
    if (consumed && sameActionToken(consumed, request.token)) return rejectAction('stale-intent', 'This creature-action intent has already been consumed. Reopen it for a new attempt.');
    executing = true;
    try {
      let receipt: WorldAction2D | null = null, addedTargetId: string | null = null;
      const command = request.command;
      let replacementDisplayError: unknown = null, replacementDisplayFailed = false;
      try {
        const invalid = validateWorldUICommand(command, world!.getSnapshot());
        if (invalid) return invalid;
        if (command.kind === 'spatial' && command.axes !== axesForView(current.token!.view))
          return rejectAction('invalid-parameters', 'The detector axes must match the view in which it was armed.');
        switch (command.kind) {
          case 'spatial': {
            const result = world!.measureSpatial(command.targetId, command.axes, command.resolution);
            if (result.status === 'rejected') return rejectAction(result.reason === 'target-missing' ? 'target-missing' : 'invalid-parameters', result.message);
            if (result.status === 'failed') {
              consumed = request.token;
              // Failure feedback is not a solver error. Even a UI callback fault
              // must not fabricate success, rewind draws or pause playback.
              try { context.consumeIntent(); } catch (error) { retainedError = error; }
              return Object.freeze({ status: 'failed', stage: result.stage, message: result.message, drawsConsumed: result.drawsConsumed, spatialDrawCount: result.spatialDrawCount });
            }
            receipt = result.receipt; break;
          }
          case 'entangle': {
            let index = 1;
            const pairs = world!.getSnapshot().pairs;
            while (pairs.some(pair => pair.id === `pair-${index}`)) index++;
            world!.prepareBellPair(`pair-${index}`, command.creatureAId, command.creatureBId); receipt = world!.lastAction; break;
          }
          case 'mood-single': world!.measureMood(command.pairId, command.targetId, command.basis); receipt = world!.lastAction; break;
          case 'mood-pair': world!.measurePair(command.pairId, command.basis); receipt = world!.lastAction; break;
          case 'mood-release': world!.measureAndRelease(command.pairId, command.basis); receipt = world!.lastAction; break;
          case 'select': world!.select(command.targetId); break;
          case 'add': addedTargetId = world!.addTemplate(); break;
          case 'remove': world!.remove(command.targetId); break;
          case 'interactions': world!.setInteractions(command.settings); break;
          case 'preset': controller!.loadWorldPreset(command.preset); break;
        }
      } catch (error) {
        // loadWorldPreset intentionally replaces/pauses, then calls its existing
        // publication callback. If that callback throws, replacement still applied.
        if (command.kind === 'preset' && controller!.world !== world) { replacementDisplayError = error; replacementDisplayFailed = true; }
        else {
          consumed = request.token;
          try { context.consumeIntent(); } catch (displayError) { retainedError = displayError; }
          return commandError(error);
        }
      }
      const consumes = command.kind !== 'select' && command.kind !== 'interactions';
      if (consumes) consumed = request.token; // No fallible UI work before this.
      const applied: Extract<WorldUIResult2D, { status: 'applied' }> = Object.freeze({ status: 'applied', receipt, addedTargetId, publication: 'published', message: null });
      lastApplied = applied; lastAppliedWorld = controller!.world;
      // Every postcommand UI operation belongs to the separate display boundary.
      return publish(applied, () => {
        let failed = false, failure: unknown;
        try { if (consumes) context.consumeIntent(); } catch (error) { failed = true; failure = error; }
        try { context.committed(command, receipt, addedTargetId); } catch (error) { if (!failed) { failed = true; failure = error; } }
        if (failed) throw failure;
        if (replacementDisplayFailed) throw replacementDisplayError;
      });
    } finally { executing = false; }
  };
  return {
    execute,
    /** The interaction owner's reset/replacement/unmount routine clears recovery
     * alongside drafts/reactions; redraw must not resurrect a prior experiment. */
    invalidate(): void { lastApplied = null; lastAppliedWorld = null; consumed = null; retainedError = null; },
    redraw(): WorldUIResult2D {
      if (!lastApplied) return rejectAction('no-world', 'There is no committed result to redraw.');
      if (executing) return rejectAction('busy', 'An action is already executing.');
      let current: ReturnType<typeof context.current>;
      try { current = context.current(); } catch (error) { return commandError(error); }
      if (current.controller?.world !== lastAppliedWorld) return rejectAction('stale-intent', 'The committed result belongs to a replaced world.');
      executing = true;
      try { return publish(lastApplied); } finally { executing = false; }
    },
    get diagnosticError(): unknown { return retainedError; },
  };
}

/** Only explicit known preparation/reset restores provenance. An ordinary t=0
 * command is not evidence that the state is still an initial Gaussian. */
export function gaussianProvenanceAfterCommand(known: boolean, command: WorldUICommand2D): boolean {
  return command.kind === 'spatial' ? false : command.kind === 'preset' ? true : known;
}

type InteractionBridge2D = {
  owner: ReturnType<typeof createCreatureInteractionOwner2D>; executor: ReturnType<typeof createWorldUIExecutor2D>;
  execute: (request: WorldUIRequest2D) => WorldUIResult2D; open: (mode: OpenAction2D) => void;
  clearReaction: () => void; invalidate: () => void;
};
function ActionTargetsPage({ state, token, snapshot, visibleIds, disabledReason, edit, execute, arm, cancel, focus }: {
  state: CreatureActionState2D; token: ActionToken2D; snapshot: NonNullable<Snapshot2D['world']>; visibleIds: readonly string[];
  disabledReason: string | null; edit: (edit: DraftEdit2D) => void; execute: (request: WorldUIRequest2D) => WorldUIResult2D | undefined;
  arm: () => void; cancel: () => void; focus: () => HTMLElement | null;
}) {
  const navigation = useSettingsNavigation();
  return <SettingsPage section={state.mode === 'spatial' ? 'Measure position' : state.mode === 'entangle' ? 'Entangle moods' : 'Measure mood'}>
    <CreatureActions2D state={state} currentToken={token} snapshot={snapshot} visibleIds={visibleIds} disabledReason={disabledReason} edit={edit}
      apply={request => { const result = execute(request); if (result && result.status !== 'rejected') navigation?.closeAndHandoff(focus); }}
      arm={() => { arm(); navigation?.closeAndHandoff(focus); }} cancel={() => { cancel(); navigation?.closeAndHandoff(focus); }} />
  </SettingsPage>;
}
export function Simulation2D({ worldMode = false, viewMode = '2d', demonstrations, requestedPage, initialPreset, guideSession = 0, guideActive = false, finishGuide, onScene, openChapter, helpControl }: { worldMode?: boolean; viewMode?: TerrariumViewMode; demonstrations?: ReactNode; requestedPage?: { sequence: number; page: SettingsSection } | null; initialPreset?: TerrainPreset2D; guideSession?: number; guideActive?: boolean; finishGuide?: () => void; onScene?: (scene: MuseumScene) => void; openChapter?: (topic: Topic) => void; helpControl?: ReactNode }) {
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
  const [actionState, setActionState] = useState<CreatureActionState2D | null>(null);
  const [actionResult, setActionResult] = useState<WorldUIResult2D | null>(null);
  const [lastReceipt, setLastReceipt] = useState<WorldAction2D | null>(null);
  const interaction = useRef<InteractionBridge2D | null>(null), resultRegion = useRef<HTMLDivElement>(null);
  const guardRef = useRef({ guideActive, error }); guardRef.current = { guideActive, error };
  const resolutionPreference = useRef(.4);
  useEffect(() => {
    if (snapshot) onScene?.({ kind: '2d', snapshot, knownGaussian: pristineGaussian.current,
      uneditedPreset: presetRevision.current === snapshot.terrainRevision, interaction: actionState?.mode ?? 'inspect' });
  }, [snapshot, actionState, onScene]);
  const focusResult = () => resultRegion.current;
  const execute = (request: WorldUIRequest2D) => interaction.current?.execute(request);
  const direct = (command: WorldUICommand2D) => { const bridge = interaction.current; if (bridge) return bridge.execute(captureWorldUIRequest(bridge.owner.token, 'native', command)); };
  const cancelAction = () => { interaction.current?.owner.cancel(); bindingRef.current?.cancel(); settingsRef.current = { ...settingsRef.current, tool: 'view' }; setSettings(settingsRef.current); setActionResult(null); };
  useEffect(() => {
    const canvas = canvasRef.current, projectionCanvas = projectionRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d'), projectionContext = projectionCanvas?.getContext('2d');
    if (!context || (worldMode && !projectionContext)) { setError('Canvas2D unavailable'); return; }
    let lastPublish = -Infinity, timer: ReturnType<typeof setTimeout> | undefined;
    let latest: Snapshot2D;
    let owner: ReturnType<typeof createCreatureInteractionOwner2D> | null = null;
    let executor: ReturnType<typeof createWorldUIExecutor2D> | null = null;
    let reaction: { world: QuantumWorld2D; sequence: number; targets: readonly string[] } | null = null;
    let reactionTimer: ReturnType<typeof setTimeout> | undefined;
    const cancelPendingPublication = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
    const clearReaction = () => { if (reactionTimer !== undefined) clearTimeout(reactionTimer); reactionTimer = undefined; reaction = null; };
    const invalidate = () => { owner?.cancel(); executor?.invalidate(); clearReaction(); setActionResult(null); bindingRef.current?.cancel(); settingsRef.current = { ...settingsRef.current, tool: 'view' }; setSettings(settingsRef.current); };
    let guideStroke: { id: number; x: number; y: number; revision: number } | null = null;
    const publish = () => {
      if (timer !== undefined) clearTimeout(timer); timer = undefined; lastPublish = performance.now(); setSnapshot(latest);
      setLastReceipt(latest.world?.lastAction ?? null);
      if (guideSession && !initialGuideWidth.current) initialGuideWidth.current = latest;
      if (latest.time > 0 && (latest.potentialL1 > 0 || latest.world?.interactions.drives || latest.world?.interactions.social)) pristineGaussian.current = false;
      onScene?.({ kind: '2d', snapshot: latest, knownGaussian: pristineGaussian.current, uneditedPreset: presetRevision.current === latest.terrainRevision });
    };
    // Rebind this UI-owned callback only on view changes. The steady 2D frame
    // keeps its original draw path, with no projection branch or second pass.
    const presentation = { draw: () => drawCurrent(), intervalMs: 100 };
    const controller = new SimulationPlayback2D({ request: cb => requestAnimationFrame(cb), cancel: id => cancelAnimationFrame(id) }, next => {
      if (next.error) { bindingRef.current?.cancel(); owner?.cancelGesture(); }
      if (owner && controller.world && (owner.state.token.world !== controller.world || owner.state.token.rosterRevision !== controller.world.rosterRevision)) invalidate();
      else if (!worldMode) drawField();
      latest = next;
      const delay = 100 - (performance.now() - lastPublish);
      if (!next.playing || next.error || delay <= 0) publish();
      else if (timer === undefined) timer = setTimeout(publish, delay);
    }, worldMode ? { worldPreset: guideSession ? 'independent' : 'mood', presentation,
      grid: playgroundGrid2D(canvas.clientWidth, canvas.clientHeight) } : {});
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
      if (decorate && creatures && displayRef.current.visible) decorate(context, width, height, creatures.layers, latest?.world, controller.world!.selected, false, displayRef.current.reduced, performance.now(), displayRef.current.animate && latest?.playing === true, undefined, controller.world!, reaction?.world === controller.world ? reaction.targets : []);
    };
    const drawProjection = () => {
      if (projection && projectionCanvas && projectionContext) {
        const width = Math.max(1, projectionCanvas.clientWidth), height = Math.max(1, projectionCanvas.clientHeight), dpr = window.devicePixelRatio || 1;
        const w = Math.round(width * dpr), h = Math.round(height * dpr);
        if (projectionCanvas.width !== w || projectionCanvas.height !== h) { projectionCanvas.width = w; projectionCanvas.height = h; }
        projectionContext.setTransform(w / width, 0, 0, h / height, 0, 0);
        projection(projectionContext, width, height, controller.world!.selected, selectedOnlyRef.current, settingsRef.current.overlay, settingsRef.current.opacity);
        if (decorate && displayRef.current.visible) decorate(projectionContext, width, height, projection.layers, latest?.world, controller.world!.selected, true, displayRef.current.reduced, performance.now(), displayRef.current.animate && latest?.playing === true, projection.scale, controller.world!, reaction?.world === controller.world ? reaction.targets : []);
      }
    };
    // Outgoing canvas pixels remain a visual-only snapshot. The destination
    // callback always reads live data, including on completion while paused.
    let drawCurrent = worldMode && viewMode === '1d' ? drawProjection : drawField;
    // View transitions only draw and cancel unfinished pointer strokes. They do
    // not call playback, snapshots, measurements, presets, or world commands.
    const view = new TerrariumViewTransition(worldMode ? viewMode : '2d', () => {
      drawCurrent = view.mode === '1d' ? drawProjection : drawField;
      invalidate(); guideStroke = null;
      setMorphing(view.transitioning); bindingRef.current?.cancel(); preview(null); drawCurrent();
    });
    transition.current = view;
    playback.current = controller;
    const refresh = () => { latest = controller.snapshot(); drawCurrent(); publish(); };
    refreshRef.current = refresh;
    if (controller.world) {
      owner = createCreatureInteractionOwner2D(() => ({ world: controller.world!, view: view.mode }), setActionState);
      executor = createWorldUIExecutor2D({
        current: () => ({ controller: playback.current, token: owner!.token, solverStopped: !!guardRef.current.error || !!latest?.error, guideActive: guideRuntime.current.active, morphing: view.transitioning }),
        consumeIntent: () => { owner!.cancel(); bindingRef.current?.cancel(); settingsRef.current = { ...settingsRef.current, tool: 'view' }; setSettings(settingsRef.current); },
        committed: (command, receipt) => {
          if (receipt) setLastReceipt(receipt);
          pristineGaussian.current = gaussianProvenanceAfterCommand(pristineGaussian.current, command);
          if (['add', 'remove', 'preset', 'entangle', 'mood-release'].includes(command.kind)) clearReaction();
          const targets = receipt ? measurementReactionTargets(receipt) : [];
          if (targets.length) {
            clearReaction();
            if (displayRef.current.visible && displayRef.current.animate && !displayRef.current.reduced) {
              reaction = { world: controller.world!, sequence: receipt!.sequence, targets };
              reactionTimer = setTimeout(() => { clearReaction(); drawCurrent(); }, 600);
            }
          }
          if (command.kind === 'spatial') decorate?.invalidate();
        }, cancelPendingPublication, publish: refresh,
      });
      const run = (request: WorldUIRequest2D) => { const result = executor!.execute(request); setActionResult(result); return result; };
      interaction.current = { owner, executor, execute: run, clearReaction, invalidate,
        open: mode => { bindingRef.current?.cancel(); settingsRef.current = { ...settingsRef.current, tool: 'view' }; setSettings(settingsRef.current); owner!.open(mode, { resolution: resolutionPreference.current }); setActionResult(null); } };
      setActionState(owner.state);
    }
    const binding = bindTerrainPainting2D(canvas, { grid: controller.psi, settings: () => (guideRuntime.current.active ? guideRuntime.current.step !== 3 : worldMode && owner?.state.mode !== 'terrain') || transition.current?.mode === '1d' || transition.current?.transitioning ? { ...settingsRef.current, tool: 'view' } : settingsRef.current,
      stamp: (p, brush) => controller.stamp(p.x, p.y, brush),
      changed: () => { drawCurrent(); latest = controller.snapshot(); if (performance.now() - lastPublish >= 100) publish(); else if (timer === undefined) timer = setTimeout(publish, 100); },
      preview, onError: e => { controller.pause(); setError(e instanceof Error ? e.message : String(e)); settingsRef.current = { ...settingsRef.current, tool: 'view' }; setSettings(settingsRef.current); refresh(); },
    });
    bindingRef.current = binding;
    const gestureEvent = (event: PointerEvent) => ({ pointerId: event.pointerId, canvas: event.currentTarget as HTMLCanvasElement, x: event.clientX, y: event.clientY, primary: event.isPrimary, button: event.button });
    const blockedGesture = () => !worldMode || view.transitioning || guideRuntime.current.active || owner?.state.mode === 'terrain' || !!document.querySelector('.settings-popover:not([hidden]), dialog[open]');
    const selectDown = (event: PointerEvent) => { owner?.down(gestureEvent(event), blockedGesture()); };
    const selectMove = (event: PointerEvent) => { owner?.move(gestureEvent(event)); };
    const selectUp = (event: PointerEvent) => {
      const captured = owner?.up(gestureEvent(event), blockedGesture());
      if (!captured || !owner || !interaction.current) return;
      const target = event.currentTarget as HTMLCanvasElement, rect = target.getBoundingClientRect(), width = target.clientWidth, height = target.clientHeight;
      const x = (event.clientX - rect.left) * width / rect.width, y = (event.clientY - rect.top) * height / rect.height;
      let id: string | null = null, candidates: readonly string[] = [];
      if (view.mode === '1d' && target === projectionCanvas && projection) {
        const v = projectionViewport(width, height), i = Math.round((x - v.left) / (v.right - v.left) * (controller.psi.xmax - controller.psi.xmin) / controller.psi.dx) - 1;
        candidates = projectedActionCandidates(projection.layers, controller.psi, x, y, width, height, projection.scale);
        if (i >= 0 && i < controller.psi.nx && y <= v.baseline && y >= v.top) id = pickCreature(projection.layers.filter(l => y >= v.baseline - l.density[i]! / projection.scale * (v.baseline - v.top)), i, controller.world!.selected);
      } else if (view.mode === '2d' && target === canvas && creatures) {
        const point = canvasToPhysical2D(controller.psi, x, y, width, height);
        if (point) {
          const i = Math.round((point.x - controller.psi.xmin) / controller.psi.dx) - 1, j = Math.round((point.y - controller.psi.ymin) / controller.psi.dy) - 1;
          if (i >= 0 && i < controller.psi.nx && j >= 0 && j < controller.psi.ny) { const index = j * controller.psi.nx + i; candidates = actionCandidates(creatures.layers, index); id = pickCreature(creatures.layers, index, controller.world!.selected); }
        }
      }
      if (owner.state.mode === 'inspect') {
        if (id) interaction.current.execute(captureWorldUIRequest(captured, 'canvas', { kind: 'select', targetId: id }));
      } else {
        const next = owner.target(candidates, controller.world!.getSnapshot(), captured);
        if (next.request) interaction.current.execute(next.request);
        else if (next.message) setActionResult(rejectAction('invalid-parameters', next.message));
      }
    };
    const guideDown = (event: PointerEvent) => {
      if (guideRuntime.current.active && guideRuntime.current.step === 3 && event.isPrimary && event.button === 0 && settingsRef.current.tool === 'barrier' && view.mode === '2d' && !view.transitioning) guideStroke = { id: event.pointerId, x: event.clientX, y: event.clientY, revision: controller.terrainRevision };
    };
    const guideUp = (event: PointerEvent) => {
      const start = guideStroke; guideStroke = null;
      if (start && start.id === event.pointerId && guideRuntime.current.active && guideRuntime.current.step === 3 && event.isPrimary && event.button === 0 && settingsRef.current.tool === 'barrier' && view.mode === '2d' && !view.transitioning && qualifyingBarrierStroke(Math.hypot(event.clientX-start.x, event.clientY-start.y), start.revision, controller.terrainRevision, controller.snapshot().potentialMax)) setGuidePainted(true);
    };
    canvas.addEventListener('pointerdown', guideDown); canvas.addEventListener('pointerup', guideUp);
    const cancelSelection = () => { owner?.cancelGesture(); guideStroke = null; };
    const blur = () => { cancelSelection(); if (owner && owner.state.mode !== 'inspect' && owner.state.mode !== 'terrain') { owner.cancel(); setActionResult(null); } };
    const escape = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector('dialog[open], .settings-popover:not([hidden])') || event.key !== 'Escape' || !owner || owner.state.mode === 'inspect') return;
      event.preventDefault(); owner.cancel(); binding.cancel(); settingsRef.current = { ...settingsRef.current, tool: 'view' }; setSettings(settingsRef.current); setActionResult(null);
    };
    for (const target of [canvas, projectionCanvas]) if (target && worldMode) {
      target.addEventListener('pointerdown', selectDown); target.addEventListener('pointermove', selectMove); target.addEventListener('pointerup', selectUp); target.addEventListener('pointercancel', cancelSelection); target.addEventListener('pointerleave', cancelSelection); target.addEventListener('lostpointercapture', cancelSelection);
    }
    const visibility = () => { if (document.hidden) { cancelSelection(); binding.cancel(); controller.pause(); refresh(); } };
    const observer = new ResizeObserver(() => drawCurrent()); observer.observe(canvas); if (projectionCanvas) observer.observe(projectionCanvas);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', binding.cancel); window.addEventListener('blur', blur); document.addEventListener('keydown', escape);
    if (!worldMode && initialPreset) { controller.loadPreset(initialPreset); presetRevision.current = controller.terrainRevision; }
    refresh();
    return () => {
      invalidate(); owner?.dispose(); interaction.current = null;
      view.dispose(); transition.current = null;
      canvas.removeEventListener('pointerdown', guideDown); canvas.removeEventListener('pointerup', guideUp);
      for (const target of [canvas, projectionCanvas]) if (target && worldMode) {
        target.removeEventListener('pointerdown', selectDown); target.removeEventListener('pointermove', selectMove); target.removeEventListener('pointerup', selectUp); target.removeEventListener('pointercancel', cancelSelection); target.removeEventListener('pointerleave', cancelSelection); target.removeEventListener('lostpointercapture', cancelSelection);
      }
      binding.dispose(); controller.dispose(); observer.disconnect(); if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', binding.cancel); window.removeEventListener('blur', blur); document.removeEventListener('keydown', escape);
      playback.current = null; bindingRef.current = null; refreshRef.current = null;
    };
  }, [worldMode, initialPreset]); // Intentionally not viewMode: changing projection never remounts the world.
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    displayRef.current.reduced = media.matches;
    transition.current?.setMode(worldMode ? viewMode : '2d', media.matches);
    const changed = () => { displayRef.current.reduced = media.matches; if (media.matches) { interaction.current?.clearReaction(); transition.current?.finish(); } refreshRef.current?.(); };
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
      if (action === 'reset') { interaction.current?.invalidate(); pristineGaussian.current = true; setError(null); }
      if (action === 'free' || action === 'barrier' || action === 'well') { controller.loadPreset(action); presetRevision.current = controller.terrainRevision; pristineGaussian.current = true; }
      else controller[action]();
      if (guideActive && guideStep === 1 && viewMode === '2d' && action === 'play' && controller.snapshot().playing) setGuidePlayed(true);
      refreshRef.current?.();
    } catch (e) { controller.pause(); setError(e instanceof Error ? e.message : String(e)); }
  };
  const change = (s: TerrainDisplaySettings) => {
    bindingRef.current?.cancel();
    if (s.tool !== settingsRef.current.tool) {
      if (s.tool === 'view') interaction.current?.owner.cancel();
      else interaction.current?.owner.open('terrain', { tool: s.tool });
      setActionResult(null);
    }
    settingsRef.current = s; setSettings(s); refreshRef.current?.();
  };
  const navigateAction = (page: SettingsSection) => {
    if (page === 'Terrain' && interaction.current?.owner.state.mode === 'terrain') { interaction.current.owner.cancelGesture(); return; }
    const mode = page === 'Measure position' ? 'spatial' : page === 'Entangle moods' ? 'entangle' : page === 'Measure mood' || page === 'Measure mood — X/Z' ? 'mood' : 'inspect';
    interaction.current?.open(mode);
  };
  const disabledReason = guideActive ? 'Finish or skip the guide before using creature actions.' : morphing ? 'Wait for the view transition.' : error || snapshot?.error ? 'The solver is stopped. Reset before acting.' : null;
  const number = (v: number | undefined, digits: number) => v !== undefined && Number.isFinite(v) ? v.toFixed(digits) : '—';
  const displayedView = worldMode ? viewMode : '2d';
  return <main className="simulation-stage" data-view={displayedView} data-morphing={morphing}>
    <div className={`playground ${worldMode ? 'unified-playground' : ''}`}><div className={worldMode ? 'shared-world-square' : 'standalone-square'}>
      <div className="terrain-canvas-wrap" aria-hidden={displayedView === '1d'}>
      <canvas className={`density-2d ${settings.tool === 'view' ? '' : 'terrain-editing'}`} ref={canvasRef} role="img"
        aria-label={`2D probability density with optional signed potential overlay; x increases right, y increases up; x from ${playback.current?.psi.xmin ?? '…'} to ${playback.current?.psi.xmax ?? '…'}, y from ${playback.current?.psi.ymin ?? '…'} to ${playback.current?.psi.ymax ?? '…'}`}  aria-describedby={worldMode ? 'creature-display-help terrain-help' : 'terrain-help'} />
      <div ref={cursorRef} className="terrain-cursor" hidden aria-hidden="true" />
    </div>
    {worldMode && <div className="projection-layer" aria-hidden={viewMode !== '1d'}>
      <canvas ref={projectionRef} className="projection-1d" role="img" aria-label="Marginal position probability density along x for the same 2D creatures; shared linear density scale. Average terrain along y is a separate signed energy profile, not an effective 1D Hamiltonian." aria-describedby="projection-help" />
    </div>}
    </div>
    {worldMode && <div ref={resultRegion} tabIndex={-1} className="action-result-region">
      {actionState && <CreatureActionStatus2D state={actionState} receipt={lastReceipt} result={actionResult} cancel={cancelAction}
        redraw={() => { const bridge = interaction.current; if (bridge) setActionResult(bridge.executor.redraw()); }} />}
      {actionState?.mode === 'terrain' && <p className="terrain-notice">{terrainInstruction(settings.tool)} <button onClick={cancelAction}>Cancel terrain tool</button></p>}
    </div>}
    </div>
    <PlaybackBar><div className="controls" aria-label="2D simulation controls">
      <button onClick={() => control('play')} disabled={!snapshot || snapshot.playing || !!snapshot.error || !!error}>Play</button>
      <button onClick={() => control('pause')} disabled={!snapshot?.playing}>Pause</button>
      <button onClick={() => control('reset')} disabled={!snapshot}>Reset evolution</button>
      <span role="status">{snapshot?.error || error ? 'Stopped — error' : snapshot?.playing ? 'Playing' : 'Paused'}</span>
    </div>
      <span className="time-readout">Time {number(snapshot?.time, 2)}</span>
      {worldMode ? <button disabled={!snapshot} onClick={() => control('clearTerrain')}>Clear terrain</button> : <span className="selected-creature">Single Gaussian</span>}
      {snapshot?.world ? <CreatureSummary2D snapshot={snapshot.world} /> : worldMode && <div className="creature-summary" aria-hidden="true" />}
      {helpControl}
      {(error || snapshot?.error) && <span role="alert" className="error">{error ?? snapshot?.error}</span>}
    </PlaybackBar>
    <SettingsPopover navigation requestedPage={requestedPage} homeActions={worldMode ? <SettingsHomeActions disabled={!!disabledReason} /> : undefined} onNavigate={navigateAction}>
    {worldMode && actionState && snapshot?.world && interaction.current && <ActionTargetsPage state={actionState} token={interaction.current.owner.token} snapshot={snapshot.world}
      visibleIds={selectedOnly ? [snapshot.world.selected] : snapshot.world.creatures.map(c => c.id)} disabledReason={disabledReason}
      edit={edit => { if (edit.kind === 'spatial' && edit.field === 'resolution') resolutionPreference.current = edit.value; interaction.current?.owner.edit(edit); }} execute={execute}
      arm={() => interaction.current?.owner.arm()} cancel={cancelAction} focus={focusResult} />}
    <SettingsPage section="Simulation"><div className="heading"><h2>{worldMode ? 'Independent spaces, entangled moods.' : 'A landscape for a wavefunction.'}</h2>
      <p>{worldMode ? 'One spatial wavefunction per creature; independent or shared paired mood qubits. Forces act through explicit effective potentials, never scripted motion.' : 'Paint potential energy, not probability. The single complex wavefunction responds through genuine Schrödinger evolution.'}</p>
      <p>{worldMode ? 'The main 1D/2D switch changes only the view of this world. Advanced/Legacy demonstrations below are separate experiments.' : 'This is a standalone 2D Gaussian demonstration. The main view switch leaves it and starts a fresh terrarium.'}</p></div><p>Use the persistent Play, Pause and Reset evolution controls below the playground. Reset preserves terrain; changing view never resets.</p></SettingsPage>
    <SettingsPage section="Physics notebook">{openChapter && <NotebookLauncher open={openChapter} />}{worldMode && <p id="projection-help" className="plot-note">The 1D hills show ρx(x) = Δy Σy |ψ(x,y)|², not a standalone 1D wavefunction. Integrating each curve with Δx gives that creature’s spatial norm (normally 1). The common linear density axis expands to include the largest peak of any creature with 15% headroom (minimum 0.5); relative heights are preserved. The baseline is a plotting zero, not a quantum boundary. Average terrain along y is an unweighted vertical average of editable terrain only, not an equivalent 1D Hamiltonian. Switch to 2D to paint; switching views never measures or resets anything.</p>}
    </SettingsPage>
    <SettingsPage section="Experiments"><p className="section-intro">Ask a quantum question, or prepare a shared mood. Opening an action never applies it.</p><details className="action-details"><summary>Latest action details</summary><p>{lastReceipt ? actionReceiptText(lastReceipt) : 'No recorded creature action in this experiment.'}</p></details></SettingsPage>
    <TerrainControls settings={settings} disabled={guideActive && guideStep !== 3 || !snapshot || !!error || !!snapshot.error || morphing} canPaint={displayedView === '2d'} focusCanvas={worldMode ? focusResult : () => canvasRef.current} change={change} clear={() => control('clearTerrain')} preset={worldMode ? undefined : p => control(p)} />
    <SettingsPage section="Creatures">{!worldMode && <p>This standalone experiment has one Gaussian state. Return to the terrarium for creature identities and selection.</p>}</SettingsPage>
    {snapshot?.world && <WorldControls2D snapshot={snapshot.world} selectedOnly={selectedOnly} disabled={guideActive || !!error || !!snapshot.error}
      changeView={value => { interaction.current?.owner.cancelGesture(); selectedOnlyRef.current = value; setSelectedOnly(value); refreshRef.current?.(); }}
      select={id => direct({ kind: 'select', targetId: id })} add={() => direct({ kind: 'add' })} remove={() => direct({ kind: 'remove', targetId: snapshot.world!.selected })}
      interactions={settings => direct({ kind: 'interactions', settings })} preset={preset => direct({ kind: 'preset', preset })}
      advancedChildren={<EntanglementControls2D snapshot={snapshot.world} token={actionState?.token ?? null} execute={execute} focus={focusResult} disabled={!!disabledReason} />} />}
    <SettingsPage section="Display">{worldMode && <fieldset className="brush-controls"><legend>Creature overlays · presentation only</legend>
      <label className="painting-toggle"><input type="checkbox" aria-label="Show creature decorations" checked={decorations} onChange={e => { displayRef.current.visible = e.currentTarget.checked; if (!e.currentTarget.checked) interaction.current?.clearReaction(); setDecorations(e.currentTarget.checked); refreshRef.current?.(); }} /> Show expressive faces, selected identifier, selection brackets and mood-pair connections</label>
      <label className="painting-toggle"><input type="checkbox" aria-label="Animate creature faces" checked={animateFaces} onChange={e => { displayRef.current.animate = e.currentTarget.checked; if (!e.currentTarget.checked) interaction.current?.clearReaction(); setAnimateFaces(e.currentTarget.checked); refreshRef.current?.(); }} /> Gentle blinking while playing (off with reduced motion)</label>
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
    <SettingsPage section="Physics notebook"><p id="terrain-help" className="plot-note">Inspect never paints. In Menu → Terrain select Barrier, Well, or Eraser; the menu closes so you can drag with mouse, pen, or touch. Brush radius is Gaussian σ; its finite support ends at 3σ. Stamps add ±A, clamped to [−20,20]; repeated passes accumulate. Eraser smoothly reduces either sign toward zero. The ring shows σ, not the full cutoff. Switch to 2D to paint; the 1D marginal does not retain y coordinates.</p></SettingsPage>
    <SettingsPage section="Physics notebook"><p id="creature-display-help" className="plot-note">Faces and selection brackets are decorative overlays anchored to significant probability density, not particles or sampled measurements. Split clouds use a significant density maximum when the mean is low-density. In Inspect, clicks only select: the largest visible local density contribution wins, ties keep the selection then use ID order; tails below 1% of the visible peak are ignored. An explicitly armed action instead requires exactly one visible candidate; overlaps and misses never pick a target for you. Position clicks identify a creature, not the sampled coordinate. In 1D only x is measured on the full 2D state; no y is reported, although a correlated y marginal may change. Use the creature list for diffuse or hidden clouds. Dotted friendship links mark registered mood-pair identity only, not force, transport or communication; nothing travels along them. Mixed moods are valid quantum states, not unhappy creatures.</p>
    <p className="plot-note">{worldMode ? 'Reset evolution restores the current roster’s saved initial spatial states and moods, preserving terrain and current interaction settings. Added creatures keep their template initial conditions; removed creatures stay removed. World presets replace the roster, moods and interaction settings at t=0, preserving terrain. Clear terrain preserves all states, moods and time.' : 'Reset evolution restores this experiment’s initial packet and time, preserving terrain. Clear terrain preserves the live packet and time. Load preset replaces packet and terrain and pauses at t=0.'} Painting works while playing, between complete fixed steps. Editing changes H and can change energy immediately; it does not measure, collapse, renormalize, or move the wavefunction directly. Even with fixed H, splitting introduces numerical energy drift. Norm remains the conservation diagnostic.</p>
    <footer><span>{playback.current?.psi.nx} × {playback.current?.psi.ny} interior points · x ∈ [{number(playback.current?.psi.xmin, 2)}, {number(playback.current?.psi.xmax, 2)}] · y ∈ [{number(playback.current?.psi.ymin, 2)}, {number(playback.current?.psi.ymax, 2)}] · Δx = {number(playback.current?.psi.dx, 5)}, Δy = {number(playback.current?.psi.dy, 5)}</span>
      <span>ℏ = m = 1 · Δt = 1/120 · zero Dirichlet boundaries</span></footer>
    <p className="plot-note">Density: fixed brightness √(ρ/(ρ + 0.012)), not a linear probability scale or frame-normalized image, independent of signed terrain colors. Hide the overlay to inspect density alone. The frozen-potential Cayley solver is second-order, not full 2D Crank–Nicolson; world feedback is generally first-order. Finite walls eventually reflect packets. Mood and finite-resolution position measurement are available only in the creature world. Position uses x/y in 2D and x-only in the marginal view; the latter reports no y. Spatial states remain independent; no spatial entanglement is claimed. Background tabs pause; stalls never enlarge physics Δt.</p>
    </SettingsPage><SettingsPage section="Advanced">{demonstrations}</SettingsPage>
    </SettingsPopover>
    {guideActive && worldMode && <GuideCard step={guideStep} setStep={setGuideStep} view={viewMode} finish={() => finishGuide?.()}
      ready={!morphing && (guideStep === 1 ? viewMode === '2d' && hasObservedSpreading(guidePlayed, initialGuideWidth.current, snapshot) : guideStep === 2 ? viewMode === '1d' : viewMode === '2d' && guidePainted && (snapshot?.potentialMax ?? 0) > 0)}
      canPaint={guideStep === 3 && viewMode === '2d' && !morphing && settings.tool === 'barrier'}
      paint={() => { const c = playback.current; if (!c || viewMode !== '2d' || morphing || settingsRef.current.tool !== 'barrier') return; try { const before = c.terrainRevision; paintGuideBarrier(c, settingsRef.current); if (qualifyingBarrierStroke(12, before, c.terrainRevision, c.snapshot().potentialMax)) setGuidePainted(true); refreshRef.current?.(); } catch (e) { c.pause(); setError(String(e)); } }} />}
  </main>;
}
