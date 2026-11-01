import { validateInteractionSettings2D, type InteractionSettings2D, type MoodBasis, type PositionMeasurement2DAxes, type PositionMeasurement2DStage } from '@psi-zoo/sim-core';
import type { QuantumWorld2D, WorldAction2D, WorldSnapshot2D } from './world/world2d';
import type { WorldPreset2D } from './world/worldPresets2d';
import type { TerrariumViewMode } from './terrariumView';

/** Local UI intent only. World identity is a reference, never a snapshot clone. */
export interface ActionToken2D {
  readonly world: QuantumWorld2D; readonly rosterRevision: number; readonly epoch: number; readonly view: TerrariumViewMode;
}
export type WorldUICommand2D =
  | { readonly kind: 'spatial'; readonly targetId: string; readonly axes: PositionMeasurement2DAxes; readonly resolution: number }
  | { readonly kind: 'entangle'; readonly creatureAId: string; readonly creatureBId: string }
  | { readonly kind: 'mood-single'; readonly pairId: string; readonly targetId: string; readonly basis: MoodBasis }
  | { readonly kind: 'mood-pair' | 'mood-release'; readonly pairId: string; readonly basis: MoodBasis }
  | { readonly kind: 'select' | 'remove'; readonly targetId: string }
  | { readonly kind: 'add' }
  | { readonly kind: 'interactions'; readonly settings: Readonly<Partial<InteractionSettings2D>> }
  | { readonly kind: 'preset'; readonly preset: WorldPreset2D };
export interface WorldUIRequest2D {
  readonly token: ActionToken2D; readonly source: 'canvas' | 'native'; readonly command: WorldUICommand2D;
}
export type WorldUIRejectionReason2D = 'no-world' | 'stale-intent' | 'guide-forbidden' | 'morphing' | 'solver-stopped' | 'busy'
  | 'invalid-parameters' | 'target-missing' | 'pair-mismatch' | 'requires-independent' | 'same-target' | 'roster-limit' | 'release-required';
export type WorldUIResult2D =
  | Readonly<{ status: 'applied'; receipt: WorldAction2D | null; addedTargetId: string | null; publication: 'published' | 'display-failed'; message: string | null }>
  | Readonly<{ status: 'rejected'; reason: WorldUIRejectionReason2D; message: string; drawsConsumed: 0 }>
  | Readonly<{ status: 'failed'; stage: PositionMeasurement2DStage; message: string; drawsConsumed: number; spatialDrawCount: number }>
  | Readonly<{ status: 'command-error'; message: string }>;
export type UIRejection2D = Extract<WorldUIResult2D, { status: 'rejected' }>;
export function rejectAction(reason: WorldUIRejectionReason2D, message: string): UIRejection2D {
  return Object.freeze({ status: 'rejected', reason, message, drawsConsumed: 0 });
}
export function actionToken(world: QuantumWorld2D, epoch: number, view: TerrariumViewMode): ActionToken2D {
  return Object.freeze({ world, rosterRevision: world.rosterRevision, epoch, view });
}
export function sameActionToken(a: ActionToken2D, b: ActionToken2D): boolean {
  return a.world === b.world && a.rosterRevision === b.rosterRevision && a.epoch === b.epoch && a.view === b.view;
}
/** Freeze a copy, including nested payloads; never freeze the referenced world. */
export function captureWorldUIRequest(token: ActionToken2D, source: WorldUIRequest2D['source'], command: WorldUICommand2D): WorldUIRequest2D {
  const copy = command.kind === 'interactions' ? { ...command, settings: Object.freeze({ ...command.settings }) } : { ...command };
  return Object.freeze({ token: Object.freeze({ ...token }), source, command: Object.freeze(copy) });
}
export interface ActionGuards2D {
  readonly mounted: boolean; readonly world: QuantumWorld2D | null; readonly token: ActionToken2D | null; readonly solverStopped: boolean;
  readonly guideActive: boolean; readonly morphing: boolean; readonly executing: boolean;
}
/** Order is intentional: no physics, diagnostic snapshot or random callback. */
export function guardWorldUIRequest(request: WorldUIRequest2D, current: ActionGuards2D): UIRejection2D | null {
  if (!current.mounted || !current.world || !current.token) return rejectAction('no-world', 'No active creature world.');
  if (!sameActionToken(request.token, current.token) || request.token.world !== current.world || current.world.rosterRevision !== current.token.rosterRevision)
    return rejectAction('stale-intent', 'This draft belongs to an earlier tool, view or roster. Reopen it or deliberately change a target.');
  if (current.solverStopped) return rejectAction('solver-stopped', 'The solver is stopped. Reset before acting.');
  if (current.guideActive) return rejectAction('guide-forbidden', 'Finish or skip the guide before using creature actions.');
  if (current.morphing) return rejectAction('morphing', 'Wait for the view transition to finish.');
  if (current.executing) return rejectAction('busy', 'An action is already executing.');
  return null;
}
export function validSpatialResolution(value: number): boolean { return Number.isFinite(value) && value >= .2 && value <= 2; }
export function axesForView(view: TerrariumViewMode): PositionMeasurement2DAxes { return view === '1d' ? 'x' : 'xy'; }
/** Pure eligibility against current scalar metadata. Never prefilter canvas hits
 * by this policy: an ineligible visible foreground cloud must not be clicked through. */
export function validateWorldUICommand(command: WorldUICommand2D, world: WorldSnapshot2D): UIRejection2D | null {
  const invalid = () => rejectAction('invalid-parameters', 'Invalid action parameters.');
  const missing = () => rejectAction('target-missing', 'Choose an explicit creature that is still present.');
  const member = (id: string) => world.creatures.find(c => c.id === id);
  switch (command.kind) {
    case 'spatial':
      if ((command.axes !== 'x' && command.axes !== 'xy') || !validSpatialResolution(command.resolution)) return invalid();
      return member(command.targetId) ? null : missing();
    case 'select': return member(command.targetId) ? null : missing();
    case 'remove': {
      const c = member(command.targetId); if (!c) return missing();
      if (c.localMood.kind === 'paired') return rejectAction('release-required', 'Measure & Release before removing a registered pair member.');
      return world.creatures.length > 1 ? null : rejectAction('roster-limit', 'At least one creature must remain.');
    }
    case 'add': return world.creatures.length < world.maxPopulation ? null : rejectAction('roster-limit', 'The creature limit has been reached.');
    case 'entangle': {
      const a = member(command.creatureAId), b = member(command.creatureBId);
      if (!a || !b) return missing();
      if (a.id === b.id) return rejectAction('same-target', 'Choose two distinct creatures, in A then B order.');
      return a.localMood.kind === 'independent' && b.localMood.kind === 'independent' ? null
        : rejectAction('requires-independent', 'Bell preparation requires two independent moods. Release the registered pair first.');
    }
    case 'mood-single': case 'mood-pair': case 'mood-release': {
      if (command.basis !== 'X' && command.basis !== 'Z') return invalid();
      if (command.kind === 'mood-single' && !member(command.targetId)) return missing();
      const pair = world.pairs.find(p => p.id === command.pairId);
      if (!pair || command.kind === 'mood-single' && command.targetId !== pair.creatureAId && command.targetId !== pair.creatureBId)
        return rejectAction('pair-mismatch', 'Choose a current registered mood pair and one of its members.');
      return null;
    }
    case 'interactions':
      if (!command.settings || Object.keys(command.settings).some(k => !['drives', 'social', 'strength', 'range'].includes(k))) return invalid();
      try { validateInteractionSettings2D({ ...world.interactions, ...command.settings }); } catch { return invalid(); }
      return null;
    case 'preset': return ['independent', 'mood', 'attraction', 'repulsion', 'bell'].includes(command.preset) ? null : invalid();
    default: return invalid();
  }
}

type InteractionIntent2D =
  | { readonly mode: 'inspect' }
  | { readonly mode: 'terrain'; readonly tool: 'barrier' | 'well' | 'erase' }
  | { readonly mode: 'spatial'; readonly route: 'native' | 'canvas'; readonly axes: PositionMeasurement2DAxes; readonly resolution: number; readonly targetId: string }
  | { readonly mode: 'mood'; readonly route: 'native' | 'canvas'; readonly basis: MoodBasis; readonly pairId: string; readonly targetId: string }
  | { readonly mode: 'entangle'; readonly route: 'native' | 'canvas'; readonly firstTarget: Readonly<{ id: string; token: ActionToken2D }> | null; readonly creatureAId: string; readonly creatureBId: string };
export type CreatureActionState2D = InteractionIntent2D & { readonly token: ActionToken2D };
export type OpenAction2D = 'inspect' | 'terrain' | 'spatial' | 'mood' | 'entangle';
/** Opening/changing tools invalidates the old epoch. Native targets start empty.
 * Cancellation/lifetime changes use this same transition with mode=inspect. */
export function openAction(state: CreatureActionState2D | null, world: QuantumWorld2D, view: TerrariumViewMode, mode: OpenAction2D,
  preference: { resolution?: number; basis?: MoodBasis; tool?: 'barrier' | 'well' | 'erase' } = {}): CreatureActionState2D {
  const token = actionToken(world, (state?.token.epoch ?? 0) + 1, view);
  switch (mode) {
    case 'spatial': return Object.freeze({ mode, route: 'native', token, axes: axesForView(view), resolution: validSpatialResolution(preference.resolution ?? .4) ? preference.resolution ?? .4 : .4, targetId: '' });
    case 'entangle': return Object.freeze({ mode, route: 'native', token, firstTarget: null, creatureAId: '', creatureBId: '' });
    case 'mood': return Object.freeze({ mode, route: 'native', token, basis: preference.basis ?? 'Z', pairId: '', targetId: '' });
    case 'terrain': return Object.freeze({ mode, token, tool: preference.tool ?? 'barrier' });
    case 'inspect': return Object.freeze({ mode, token });
  }
}
export type DraftEdit2D =
  | { readonly kind: 'spatial'; readonly field: 'targetId'; readonly value: string }
  | { readonly kind: 'spatial'; readonly field: 'resolution'; readonly value: number }
  | { readonly kind: 'entangle'; readonly field: 'creatureAId' | 'creatureBId'; readonly value: string }
  | { readonly kind: 'mood'; readonly field: 'targetId' | 'pairId'; readonly value: string }
  | { readonly kind: 'mood'; readonly field: 'basis'; readonly value: MoodBasis };
/** Called only for a deliberate edit, never from Apply or periodic publication.
 * A stale edit clears other targets rather than silently retaining their identity. */
export function editActionDraft(state: CreatureActionState2D, current: ActionToken2D, edit: DraftEdit2D): CreatureActionState2D {
  const token = actionToken(current.world, current.epoch + 1, current.view);
  const fresh = sameActionToken(state.token, current);
  if (state.mode === 'spatial' && edit.kind === 'spatial') return Object.freeze({ mode: 'spatial', route: 'native', token, axes: axesForView(current.view), resolution: state.resolution, targetId: fresh ? state.targetId : '', [edit.field]: edit.value });
  if (state.mode === 'mood' && edit.kind === 'mood') return Object.freeze({ mode: 'mood', route: 'native', token, basis: state.basis,
    targetId: fresh && edit.field !== 'pairId' ? state.targetId : '', pairId: fresh ? state.pairId : '', [edit.field]: edit.value });
  if (state.mode === 'entangle' && edit.kind === 'entangle') return Object.freeze({ mode: 'entangle', route: 'native', token, firstTarget: null,
    creatureAId: fresh ? state.creatureAId : '', creatureBId: fresh ? state.creatureBId : '', [edit.field]: edit.value });
  return state;
}
export function armCanvasAction(state: CreatureActionState2D, current: ActionToken2D): CreatureActionState2D {
  if (state.mode === 'inspect' || state.mode === 'terrain' || !sameActionToken(state.token, current)
    || current.world.rosterRevision !== current.rosterRevision) return state;
  const token = actionToken(current.world, current.epoch + 1, current.view);
  return Object.freeze(state.mode === 'entangle' ? { ...state, route: 'canvas', token, firstTarget: null } : { ...state, route: 'canvas', token });
}
export function nativeActionRequest(state: CreatureActionState2D): WorldUIRequest2D | null {
  switch (state.mode) {
    case 'spatial': return captureWorldUIRequest(state.token, 'native', { kind: 'spatial', targetId: state.targetId, axes: state.axes, resolution: state.resolution });
    case 'mood': return captureWorldUIRequest(state.token, 'native', { kind: 'mood-single', targetId: state.targetId, pairId: state.pairId, basis: state.basis });
    case 'entangle': return captureWorldUIRequest(state.token, 'native', { kind: 'entangle', creatureAId: state.creatureAId, creatureBId: state.creatureBId });
    default: return null;
  }
}
export type CanvasTargetTransition2D = Readonly<{ state: CreatureActionState2D; request: WorldUIRequest2D | null; message: string | null }>;
/** Miss/ambiguity keep the exact armed record; first entangle hit is intent only. */
export function canvasActionTarget(state: CreatureActionState2D, token: ActionToken2D, candidates: readonly string[], world: WorldSnapshot2D): CanvasTargetTransition2D {
  const stay = (message: string | null): CanvasTargetTransition2D => ({ state, request: null, message });
  if (!sameActionToken(state.token, token) || token.world.rosterRevision !== token.rosterRevision) return stay('Stale gesture. Reopen the action.');
  if (state.mode === 'inspect' || state.mode === 'terrain' || state.route !== 'canvas') return stay(null);
  if (!candidates.length) return stay('No visible cloud here. Try again or choose a native target.');
  if (candidates.length > 1) return stay('Overlapping clouds are ambiguous. Choose explicit native targets.');
  const id = candidates[0]!;
  if (state.mode === 'entangle' && !state.firstTarget) {
    const c = world.creatures.find(c => c.id === id);
    if (!c) return stay('That creature is no longer present.');
    if (c.localMood.kind !== 'independent') return stay('Choose an independent mood; no click-through to another cloud.');
    return { state: Object.freeze({ ...state, firstTarget: Object.freeze({ id, token: Object.freeze({ ...token }) }) }), request: null, message: `First target: Creature ${id.toUpperCase()}. Choose a different independent creature.` };
  }
  const command: WorldUICommand2D = state.mode === 'spatial' ? { kind: 'spatial', targetId: id, axes: state.axes, resolution: state.resolution }
    : state.mode === 'mood' ? { kind: 'mood-single', pairId: state.pairId, targetId: id, basis: state.basis }
    : { kind: 'entangle', creatureAId: state.firstTarget!.id, creatureBId: id };
  if (state.mode === 'entangle' && !sameActionToken(state.firstTarget!.token, token)) return stay('The first target is stale. Reopen entanglement.');
  const refusal = validateWorldUICommand(command, world);
  return refusal ? stay(refusal.message) : { state, request: captureWorldUIRequest(token, 'canvas', command), message: null };
}
/** Canvas identity is an opaque reference: no DOM dependency in the helper. */
export interface ActionGesture2D {
  readonly pointerId: number; readonly canvas: object; readonly x: number; readonly y: number; readonly token: ActionToken2D;
}
export function beginActionGesture(active: ActionGesture2D | null, event: {
  pointerId: number; canvas: object; x: number; y: number; primary: boolean; button: number;
}, token: ActionToken2D, blocked: boolean): ActionGesture2D | null {
  if (active || blocked || !event.primary || event.button !== 0 || !Number.isFinite(event.x) || !Number.isFinite(event.y)) return active;
  return Object.freeze({ pointerId: event.pointerId, canvas: event.canvas, x: event.x, y: event.y, token: Object.freeze({ ...token }) });
}
export function qualifiesActionGesture(down: ActionGesture2D | null, event: {
  pointerId: number; canvas: object; x: number; y: number; primary: boolean; button: number;
}, current: ActionToken2D, blocked: boolean): boolean {
  return !!down && !blocked && event.primary && event.button === 0 && event.pointerId === down.pointerId && event.canvas === down.canvas
    && sameActionToken(down.token, current) && current.world.rosterRevision === current.rosterRevision
    && Number.isFinite(event.x) && Number.isFinite(event.y) && Math.hypot(event.x - down.x, event.y - down.y) <= 6;
}

/** One UI-owned record. Native drafts and canvas gestures share its epoch;
 * reading a current token never repairs a captured draft or changes selection. */
export function createCreatureInteractionOwner2D(current: () => { world: QuantumWorld2D; view: TerrariumViewMode }, changed: (state: CreatureActionState2D) => void) {
  let state = openAction(null, current().world, current().view, 'inspect');
  let gesture: ActionGesture2D | null = null, disposed = false;
  const token = () => actionToken(current().world, state.token.epoch, current().view);
  const install = (next: CreatureActionState2D) => { gesture = null; state = next; if (!disposed) changed(state); return state; };
  return {
    get state() { return state; },
    get token() { return token(); },
    open(mode: OpenAction2D, preference: Parameters<typeof openAction>[4] = {}) {
      return install(openAction(state, current().world, current().view, mode, preference));
    },
    edit(edit: DraftEdit2D) { return install(editActionDraft(state, token(), edit)); },
    arm() { return install(armCanvasAction(state, token())); },
    cancel() { return install(openAction(state, current().world, current().view, 'inspect')); },
    cancelGesture() { gesture = null; },
    down(event: Parameters<typeof beginActionGesture>[1], blocked: boolean) {
      if (!disposed) gesture = beginActionGesture(gesture, event, token(), blocked);
    },
    move(event: Parameters<typeof qualifiesActionGesture>[1]) {
      if (gesture && gesture.pointerId === event.pointerId && (!Number.isFinite(event.x) || !Number.isFinite(event.y)
        || Math.hypot(event.x - gesture.x, event.y - gesture.y) > 6)) gesture = null;
    },
    up(event: Parameters<typeof qualifiesActionGesture>[1], blocked: boolean): ActionToken2D | null {
      // An unrelated pointer-up cannot steal the primary gesture.
      if (!gesture || event.pointerId !== gesture.pointerId) return null;
      const down = gesture; gesture = null;
      return !disposed && qualifiesActionGesture(down, event, token(), blocked) ? down.token : null;
    },
    target(candidates: readonly string[], snapshot: WorldSnapshot2D, captured: ActionToken2D) {
      const next = canvasActionTarget(state, captured, candidates, snapshot);
      if (next.state !== state) { state = next.state; if (!disposed) changed(state); }
      return next;
    },
    dispose() { disposed = true; gesture = null; },
  };
}

/** Historical result, never a current particle location. No diagnostic mass/norm clutter. */
export function actionReceiptText(receipt: WorldAction2D): string {
  const time = receipt.time.toFixed(3), label = (id: string) => `Creature ${id.toUpperCase()}`;
  if (receipt.kind === 'spatial-measurement') return `${label(receipt.targetId)} · ${receipt.axes === 'x' ? 'x-only' : 'x/y'} detector: x=${receipt.x.toFixed(3)}${receipt.axes === 'xy' ? `, y=${receipt.y.toFixed(3)}` : ' (no measured y)'} · σ=${receipt.resolution} · recorded at t=${time}.`;
  if (receipt.kind === 'mood-prepare') return `Prepared a joint Bell mood: ${label(receipt.creatureAId)} then ${label(receipt.creatureBId)} · t=${time}.`;
  const measured = receipt.events.flatMap(e => e.type === 'measure' ? [`${label(e.creatureId)} ${e.basis}→${e.basis === 'X' ? e.outcome === 0 ? '+' : '−' : e.outcome}`] : []);
  return `${receipt.kind === 'mood-release' ? 'Coordinated release' : 'Mood measurement'}: ${measured.join('; ') || 'product factorization, no sampled outcome'} · t=${time}.`;
}
