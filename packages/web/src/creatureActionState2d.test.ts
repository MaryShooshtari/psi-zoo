import { describe, expect, it, vi } from 'vitest';
import { createPsiGrid2D } from '@psi-zoo/sim-core';
import { QuantumWorld2D } from './world/world2d';
import { createWorldPreset2D } from './world/worldPresets2d';
import { SimulationPlayback2D } from './simulation2d';
import { createWorldUIExecutor2D } from './Gaussian2DDemo';
import { createCreatureInteractionOwner2D, actionReceiptText, actionToken, armCanvasAction, beginActionGesture, canvasActionTarget, captureWorldUIRequest, editActionDraft,
  guardWorldUIRequest, nativeActionRequest, openAction, qualifiesActionGesture, sameActionToken, validateWorldUICommand, validSpatialResolution,
  type ActionGuards2D, type ActionToken2D, type WorldUICommand2D, type WorldUIResult2D } from './creatureActionState2d';
function world() { const g = createPsiGrid2D({ nx: 16, ny: 13 }); return new QuantumWorld2D(g, createWorldPreset2D(g, 'independent')); }
function guards(w: QuantumWorld2D): ActionGuards2D { return { mounted: true, world: w, token: actionToken(w, 1, '2d'), solverStopped: false, guideActive: false, morphing: false, executing: false }; }
function executorFixture() {
  const requests = new Map<number, (t: number) => void>(); let next = 0;
  const scheduler = { request: vi.fn((cb: (t: number) => void) => { requests.set(++next, cb); return next; }), cancel: vi.fn((id: number) => { requests.delete(id); }) };
  const controller = new SimulationPlayback2D(scheduler, vi.fn(), { worldPreset: 'independent', grid: { nx: 16, ny: 13 } });
  const current = { controller: controller as SimulationPlayback2D | null, token: actionToken(controller.world!, 1, '2d') as ActionToken2D | null, solverStopped: false, guideActive: false, morphing: false };
  const consumeIntent = vi.fn(() => { current.token = actionToken(controller.world!, current.token!.epoch + 1, current.token!.view); });
  const committed = vi.fn(), cancelPendingPublication = vi.fn(), publish = vi.fn(() => { controller.snapshot(); });
  const executor = createWorldUIExecutor2D({ current: () => current, consumeIntent, committed, cancelPendingPublication, publish });
  const request = (command: WorldUICommand2D) => captureWorldUIRequest(current.token!, 'native', command);
  const execute = (command: WorldUICommand2D) => executor.execute(request(command));
  const tick = (time: number) => { const [id, cb] = requests.entries().next().value!; requests.delete(id); cb(time); };
  return { controller, current, consumeIntent, committed, cancelPendingPublication, publish, executor, request, execute, scheduler, requests, tick };
}
describe('one interaction owner', () => {
  const event = (canvas: object, pointerId = 1) => ({ canvas, pointerId, x: 20, y: 30, primary: true, button: 0 });
  it('publishes the same immutable record used by listeners and never executes a draft', () => {
    const w = world(), changed = vi.fn(), owner = createCreatureInteractionOwner2D(() => ({ world: w, view: '2d' }), changed);
    owner.open('spatial'); owner.edit({ kind: 'spatial', field: 'targetId', value: 'b' });
    expect(changed.mock.lastCall![0]).toBe(owner.state); expect(owner.state).toMatchObject({ targetId: 'b', route: 'native' });
    expect(w.getSnapshot().spatialDrawCount).toBe(0); expect(w.lastAction).toBeNull(); expect(w.selected).toBe('a');
  });
  it('keeps a primary gesture through secondary events, then consumes it exactly once', () => {
    const w = world(), owner = createCreatureInteractionOwner2D(() => ({ world: w, view: '2d' }), vi.fn()), canvas = {};
    owner.open('spatial'); owner.arm(); owner.down(event(canvas), false);
    owner.down({ ...event(canvas, 2), primary: false }, false); expect(owner.up(event(canvas, 2), false)).toBeNull();
    expect(owner.up(event(canvas), false)).toEqual(owner.token); expect(owner.up(event(canvas), false)).toBeNull();
  });
  it('cannot turn a drag out and back into a click', () => {
    const w = world(), owner = createCreatureInteractionOwner2D(() => ({ world: w, view: '2d' }), vi.fn()), canvas = {};
    owner.open('spatial'); owner.arm(); owner.down(event(canvas), false);
    owner.move({ ...event(canvas, 2), x: 100 }); expect(owner.up(event(canvas, 2), false)).toBeNull();
    owner.move({ ...event(canvas), x: 40 }); expect(owner.up(event(canvas), false)).toBeNull();
  });
  it.each(['reset', 'view', 'roster', 'world', 'blur', 'dispose'] as const)('rejects pending gestures after %s invalidation', kind => {
    let w = world(), view: '1d' | '2d' = '2d'; const owner = createCreatureInteractionOwner2D(() => ({ world: w, view }), vi.fn()), canvas = {};
    owner.open('spatial'); owner.arm(); owner.down(event(canvas), false);
    if (kind === 'reset') { w.resetEvolution(); owner.cancel(); }
    if (kind === 'view') view = '1d';
    if (kind === 'roster') w.addTemplate();
    if (kind === 'world') w = world();
    if (kind === 'blur') owner.cancelGesture();
    if (kind === 'dispose') owner.dispose();
    expect(owner.up(event(canvas), false)).toBeNull(); expect(w.getSnapshot().spatialDrawCount).toBe(0);
  });
  it('does not silently repair an old native target after a roster edit', () => {
    const w = world(), owner = createCreatureInteractionOwner2D(() => ({ world: w, view: '2d' }), vi.fn());
    owner.open('entangle'); owner.edit({ kind: 'entangle', field: 'creatureAId', value: 'a' }); w.addTemplate();
    expect(sameActionToken(owner.state.token, owner.token)).toBe(false);
    owner.edit({ kind: 'entangle', field: 'creatureBId', value: 'b' });
    expect(owner.state).toMatchObject({ creatureAId: '', creatureBId: 'b' });
  });
});
describe('interaction tokens, drafts and pointer ownership', () => {
  it('captures immutable request data without freezing its actual world', () => {
    const w = world(), token = actionToken(w, 3, '2d'), settings = { strength: 2 }, command = { kind: 'interactions' as const, settings };
    const r = captureWorldUIRequest(token, 'native', command); settings.strength = 6;
    expect(r.command).toEqual({ kind: 'interactions', settings: { strength: 2 } });
    expect(r.token).not.toBe(token); expect(r.token.world).toBe(w); expect(Object.isFrozen(w)).toBe(false);
    expect(Object.isFrozen(r)).toBe(true); expect(Object.isFrozen(r.token)).toBe(true); expect(Object.isFrozen(r.command)).toBe(true);
    if (r.command.kind === 'interactions') expect(Object.isFrozen(r.command.settings)).toBe(true);
  });
  it('opens native drafts empty and cancels every tool with an increased epoch', () => {
    const w = world(); let s = openAction(null, w, '2d', 'inspect');
    for (const mode of ['spatial', 'entangle', 'mood', 'terrain'] as const) {
      const before = s.token.epoch; s = openAction(s, w, '2d', mode); expect(s.token.epoch).toBe(before + 1);
      const request = nativeActionRequest(s);
      if (request) expect(request.command).not.toHaveProperty('targetId', w.selected);
      else expect(s.mode).toBe('terrain');
      if (s.mode === 'entangle') expect([s.creatureAId, s.creatureBId, s.firstTarget]).toEqual(['', '', null]);
      s = openAction(s, w, '2d', 'inspect'); expect(s.token.epoch).toBe(before + 2);
    }
    expect(w.lastAction).toBeNull();
  });
  it('captures native tokens on edits, never repairs stale Apply, and clears stale other targets', () => {
    const w = world(); let s = openAction(null, w, '2d', 'entangle');
    s = editActionDraft(s, s.token, { kind: 'entangle', field: 'creatureAId', value: 'a' });
    s = editActionDraft(s, s.token, { kind: 'entangle', field: 'creatureBId', value: 'b' });
    const request = nativeActionRequest(s)!; expect(request.command).toEqual({ kind: 'entangle', creatureAId: 'a', creatureBId: 'b' });
    w.remove('b'); w.addTemplate(); const current = actionToken(w, s.token.epoch + 1, '2d');
    const again = nativeActionRequest(s)!; expect(again.token).toEqual(request.token);
    expect(guardWorldUIRequest(again, { ...guards(w), token: current })?.reason).toBe('stale-intent');
    s = editActionDraft(s, current, { kind: 'entangle', field: 'creatureBId', value: 'b' });
    expect(nativeActionRequest(s)?.command).toEqual({ kind: 'entangle', creatureAId: '', creatureBId: 'b' });
    expect(s.token.epoch).toBe(current.epoch + 1);
  });
  it('view/reset/world lifetimes cancel prior axes, target and first-target drafts', () => {
    const w = world(); let s = openAction(null, w, '2d', 'spatial', { resolution: .7 });
    s = editActionDraft(s, s.token, { kind: 'spatial', field: 'targetId', value: 'a' }); const before = s.token;
    s = openAction(s, w, '1d', 'inspect'); expect(sameActionToken(before, s.token)).toBe(false);
    s = openAction(s, w, '1d', 'spatial', { resolution: .7 });
    expect(s).toMatchObject({ axes: 'x', resolution: .7, targetId: '', route: 'native' });
    const epoch = s.token.epoch; w.resetEvolution(); s = openAction(s, w, '1d', 'inspect'); expect(s.token.epoch).toBe(epoch + 1);
    expect(sameActionToken(s.token, actionToken(world(), s.token.epoch, '1d'))).toBe(false);
  });
  it('keeps native forms unarmed until handoff and refuses to arm stale data', () => {
    const w = world(), s = openAction(null, w, '2d', 'spatial');
    expect(canvasActionTarget(s, s.token, ['a'], w.getSnapshot()).request).toBeNull();
    const armed = armCanvasAction(s, s.token); expect(armed).toMatchObject({ route: 'canvas' }); expect(armed.token.epoch).toBe(s.token.epoch + 1);
    expect(armCanvasAction(s, actionToken(w, 999, '2d'))).toBe(s);
    expect(canvasActionTarget(armed, s.token, ['a'], w.getSnapshot()).request).toBeNull();
  });
  it('leaves misses and ambiguous overlaps armed without selection fallback', () => {
    const w = world(), draft = openAction(null, w, '2d', 'spatial'), s = armCanvasAction(draft, draft.token);
    for (const ids of [[], ['a', 'b']]) {
      const next = canvasActionTarget(s, s.token, ids, w.getSnapshot()); expect(next.state).toBe(s); expect(next.request).toBeNull(); expect(next.message).toBeTruthy();
    }
    expect(canvasActionTarget(s, s.token, ['b'], w.getSnapshot()).request?.command).toEqual({ kind: 'spatial', targetId: 'b', axes: 'xy', resolution: .4 });
    expect(w.lastAction).toBeNull();
  });
  it('stores first entangle hit with no world mutation, then preserves ordered targets', () => {
    const w = world(), draft = openAction(null, w, '2d', 'entangle'), armed = armCanvasAction(draft, draft.token), before = w.getSnapshot();
    const first = canvasActionTarget(armed, armed.token, ['b'], before); expect(first.request).toBeNull(); expect(w.getSnapshot()).toEqual(before);
    const same = canvasActionTarget(first.state, armed.token, ['b'], before); expect(same.request).toBeNull(); expect(same.message).toContain('distinct');
    expect(canvasActionTarget(first.state, armed.token, ['a'], before).request?.command).toEqual({ kind: 'entangle', creatureAId: 'b', creatureBId: 'a' });
    w.prepareBellPair('p', 'a', 'b');
    expect(canvasActionTarget(armed, armed.token, ['a'], w.getSnapshot()).message).toContain('no click-through');
  });
  it('requires current named mood ownership instead of clicking through a member', () => {
    const w = world(); w.addTemplate(); w.prepareBellPair('p', 'b', 'a'); let s = openAction(null, w, '1d', 'mood');
    s = editActionDraft(s, s.token, { kind: 'mood', field: 'pairId', value: 'p' });
    s = armCanvasAction(s, s.token);
    expect(canvasActionTarget(s, s.token, ['c'], w.getSnapshot()).request).toBeNull();
    expect(canvasActionTarget(s, s.token, ['a'], w.getSnapshot()).request?.command).toEqual({ kind: 'mood-single', pairId: 'p', targetId: 'a', basis: 'Z' });
  });
  it('owns one primary gesture and rejects drags, wrong pointers/canvases and changed lifetimes', () => {
    const w = world(), token = actionToken(w, 1, '2d'), canvas = {}, event = { pointerId: 1, canvas, x: 20, y: 30, primary: true, button: 0 };
    const down = beginActionGesture(null, event, token, false)!;
    expect(beginActionGesture(down, { ...event, pointerId: 2 }, token, false)).toBe(down);
    expect(beginActionGesture(null, { ...event, primary: false }, token, false)).toBeNull();
    expect(beginActionGesture(null, event, token, true)).toBeNull();
    expect(qualifiesActionGesture(down, { ...event, x: 26 }, token, false)).toBe(true);
    for (const changed of [{ x: 26.001 }, { pointerId: 2 }, { canvas: {} }, { primary: false }, { button: 2 }, { x: NaN }])
      expect(qualifiesActionGesture(down, { ...event, ...changed }, token, false)).toBe(false);
    expect(qualifiesActionGesture(down, event, actionToken(w, 2, '2d'), false)).toBe(false);
    expect(qualifiesActionGesture(down, event, actionToken(w, 1, '1d'), false)).toBe(false);
    expect(qualifiesActionGesture(down, event, token, true)).toBe(false);
    expect(qualifiesActionGesture(null, event, token, false)).toBe(false);
    w.addTemplate(); expect(qualifiesActionGesture(down, event, token, false)).toBe(false);
  });
});
describe('ordered guards and command eligibility', () => {
  it('validates mounted world, lifetime, solver, guide, morph and reentry in order', () => {
    const w = world(), g = guards(w), request = captureWorldUIRequest(g.token!, 'native', { kind: 'spatial', targetId: 'missing', axes: 'xy', resolution: 99 });
    const all = { ...g, mounted: false, token: actionToken(w, 99, '1d'), solverStopped: true, guideActive: true, morphing: true, executing: true };
    expect(guardWorldUIRequest(request, all)?.reason).toBe('no-world');
    expect(guardWorldUIRequest(request, { ...all, mounted: true })?.reason).toBe('stale-intent');
    const fresh = { ...all, mounted: true, token: g.token };
    expect(guardWorldUIRequest(request, fresh)?.reason).toBe('solver-stopped');
    expect(guardWorldUIRequest(request, { ...fresh, solverStopped: false })?.reason).toBe('guide-forbidden');
    expect(guardWorldUIRequest(request, { ...fresh, solverStopped: false, guideActive: false })?.reason).toBe('morphing');
    expect(guardWorldUIRequest(request, { ...fresh, solverStopped: false, guideActive: false, morphing: false })?.reason).toBe('busy');
    expect(guardWorldUIRequest(request, g)).toBeNull();
    expect(guardWorldUIRequest(request, { ...g, world: world() })?.reason).toBe('stale-intent');
  });
  it('uses inclusive UI widths with no modulo or rounding, before target lookup', () => {
    const w = world(), s = w.getSnapshot();
    for (const value of [.2, .4, .2 + .1, 1.23456789, 2]) expect(validSpatialResolution(value)).toBe(true);
    for (const value of [.199999, 2.00001, NaN, Infinity, 0]) {
      expect(validSpatialResolution(value)).toBe(false);
      expect(validateWorldUICommand({ kind: 'spatial', axes: 'xy', resolution: value, targetId: 'missing' }, s)?.reason).toBe('invalid-parameters');
    }
    expect(validateWorldUICommand({ kind: 'spatial', axes: 'xy', resolution: .4, targetId: '' }, s)?.reason).toBe('target-missing');
  });
  it('checks every roster, pair, ownership, settings and preset refusal without RNG', () => {
    const w = world(); w.prepareBellPair('p', 'a', 'b'); w.addTemplate(); const s = w.getSnapshot();
    const cases: [WorldUICommand2D, string][] = [
      [{ kind: 'select', targetId: '' }, 'target-missing'], [{ kind: 'remove', targetId: 'a' }, 'release-required'],
      [{ kind: 'entangle', creatureAId: 'c', creatureBId: 'c' }, 'same-target'], [{ kind: 'entangle', creatureAId: 'a', creatureBId: 'c' }, 'requires-independent'],
      [{ kind: 'entangle', creatureAId: '', creatureBId: 'c' }, 'target-missing'],
      [{ kind: 'mood-single', pairId: 'p', targetId: 'c', basis: 'X' }, 'pair-mismatch'], [{ kind: 'mood-pair', pairId: 'absent', basis: 'Z' }, 'pair-mismatch'],
      [{ kind: 'mood-release', pairId: '', basis: 'X' }, 'pair-mismatch'], [{ kind: 'interactions', settings: { strength: 11 } }, 'invalid-parameters'],
      [{ kind: 'interactions', settings: { range: NaN } }, 'invalid-parameters'], [{ kind: 'interactions', settings: { drives: 'yes' } } as unknown as WorldUICommand2D, 'invalid-parameters'],
      [{ kind: 'preset', preset: 'made-up' } as unknown as WorldUICommand2D, 'invalid-parameters'],
    ];
    for (const [command, reason] of cases) expect(validateWorldUICommand(command, s)?.reason).toBe(reason);
    for (const command of [{ kind: 'spatial', targetId: 'a', axes: 'xy', resolution: .4 }, { kind: 'mood-pair', pairId: 'p', basis: 'X' }, { kind: 'interactions', settings: { range: 1 } }, { kind: 'preset', preset: 'bell' }] as WorldUICommand2D[])
      expect(validateWorldUICommand(command, s)).toBeNull();
    w.addTemplate(); expect(validateWorldUICommand({ kind: 'add' }, w.getSnapshot())?.reason).toBe('roster-limit');
    const single = world(); single.remove('b'); expect(validateWorldUICommand({ kind: 'remove', targetId: 'a' }, single.getSnapshot())?.reason).toBe('roster-limit');
    expect(w.getSnapshot().spatialDrawCount).toBe(0); expect(w.getSnapshot().moodHistory).toHaveLength(1);
  });
});
describe('prepared shared executor (not mounted application acceptance)', () => {
  it.each(['2d', '1d'] as const)('executes %s spatial axes with one/two draws and captures the actual receipt before publication', view => {
    const f = executorFixture(), w = f.controller.world!; f.current.token = actionToken(w, 1, view);
    const before = f.controller.psi.values.slice(), command = { kind: 'spatial' as const, targetId: 'b', axes: view === '1d' ? 'x' as const : 'xy' as const, resolution: .2 + .1 };
    const result = f.execute(command); expect(result.status).toBe('applied');
    if (result.status !== 'applied') throw Error('Expected applied');
    expect(result.receipt).toBe(w.lastAction); expect(result.publication).toBe('published'); expect(result.addedTargetId).toBeNull();
    expect(w.getSnapshot().spatialDrawCount).toBe(view === '1d' ? 1 : 2); expect(w.lastAction).toMatchObject({ resolution: .2 + .1 });
    expect(f.controller.psi.values).toEqual(before); expect(f.consumeIntent).toHaveBeenCalledOnce(); expect(f.publish).toHaveBeenCalledOnce();
    expect(f.consumeIntent.mock.invocationCallOrder[0]).toBeLessThan(f.publish.mock.invocationCallOrder[0]!);
    expect(f.committed.mock.invocationCallOrder[0]).toBeLessThan(f.publish.mock.invocationCallOrder[0]!);
    expect(f.cancelPendingPublication.mock.invocationCallOrder[0]).toBeLessThan(f.publish.mock.invocationCallOrder[0]!);
  });
  it('rejects every guarded request before even requesting a diagnostic snapshot', () => {
    const f = executorFixture(), w = f.controller.world!, snapshot = vi.spyOn(w, 'getSnapshot'), command = { kind: 'add' as const };
    for (const guard of ['solverStopped', 'guideActive', 'morphing'] as const) {
      f.current[guard] = true; expect(f.execute(command).status).toBe('rejected'); f.current[guard] = false;
    }
    const old = f.request(command); f.current.token = actionToken(w, 2, '2d'); expect(f.executor.execute(old).status).toBe('rejected');
    f.current.controller = null; expect(f.executor.execute(old).status).toBe('rejected');
    expect(snapshot).not.toHaveBeenCalled(); expect(f.publish).not.toHaveBeenCalled();
  });
  it('refuses mismatched axes and out-of-range/native missing targets without consuming a draw or pausing', () => {
    const f = executorFixture(); f.controller.play(); const pending = [...f.requests]; const cancels = f.scheduler.cancel.mock.calls.length;
    for (const command of [{ kind: 'spatial', targetId: 'a', axes: 'x', resolution: .4 }, { kind: 'spatial', targetId: 'a', axes: 'xy', resolution: 3 }, { kind: 'spatial', targetId: '', axes: 'xy', resolution: .4 }] as WorldUICommand2D[])
      expect(f.execute(command).status).toBe('rejected');
    expect([...f.requests]).toEqual(pending); expect(f.scheduler.cancel.mock.calls.length).toBe(cancels);
    expect(f.controller.snapshot().playing).toBe(true); expect(f.controller.world!.getSnapshot().spatialDrawCount).toBe(0); f.controller.dispose();
  });
  it('executes ordered preparation, both single targets, sequential measurement and release as one receipt each', () => {
    const f = executorFixture(), w = f.controller.world!;
    const prepare = f.execute({ kind: 'entangle', creatureAId: 'b', creatureBId: 'a' });
    expect(prepare).toMatchObject({ status: 'applied', receipt: { kind: 'mood-prepare', creatureAId: 'b', creatureBId: 'a' } });
    const pairId = w.getSnapshot().pairs[0]!.id;
    for (const id of ['b', 'a']) expect(f.execute({ kind: 'mood-single', pairId, targetId: id, basis: 'X' })).toMatchObject({ status: 'applied', receipt: { kind: 'mood-measure', targetId: id } });
    expect(f.execute({ kind: 'mood-pair', pairId, basis: 'Z' })).toMatchObject({ status: 'applied', receipt: { kind: 'mood-measure-pair', events: [expect.objectContaining({ creatureId: 'b' }), expect.objectContaining({ creatureId: 'a' })] } });
    const release = f.execute({ kind: 'mood-release', pairId, basis: 'Z' }); expect(release).toMatchObject({ status: 'applied', receipt: { kind: 'mood-release', sequence: 5 } });
    expect(w.getSnapshot().spatialDrawCount).toBe(0); expect(w.time).toBe(0); expect(w.getSnapshot().pairs).toHaveLength(0);
  });
  it('returns an added ID only for add and no receipt for inspection/settings/roster/preset', () => {
    const f = executorFixture(); expect(f.execute({ kind: 'select', targetId: 'b' })).toMatchObject({ status: 'applied', receipt: null, addedTargetId: null });
    expect(f.execute({ kind: 'interactions', settings: { strength: 2 } })).toMatchObject({ status: 'applied', receipt: null, addedTargetId: null });
    expect(f.execute({ kind: 'add' })).toMatchObject({ status: 'applied', receipt: null, addedTargetId: 'c' });
    expect(f.execute({ kind: 'remove', targetId: 'a' })).toMatchObject({ status: 'applied', receipt: null, addedTargetId: null });
    expect(f.controller.world!.ids).toEqual(['b', 'c']);
    const before = f.controller.world; expect(f.execute({ kind: 'preset', preset: 'bell' })).toMatchObject({ status: 'applied', receipt: null, addedTargetId: null });
    expect(f.controller.world).not.toBe(before);
  });
  it('reports applied/display-failed when a preset replacement throws from its internal publication', () => {
    const f = executorFixture(), original = f.controller.loadWorldPreset.bind(f.controller), before = f.controller.world;
    vi.spyOn(f.controller, 'loadWorldPreset').mockImplementation(preset => { original(preset); throw Error('Existing preset publication failed'); });
    const result = f.execute({ kind: 'preset', preset: 'bell' });
    expect(f.controller.world).not.toBe(before); expect(result).toMatchObject({ status: 'applied', publication: 'display-failed', receipt: null });
    expect(f.executor.redraw()).toMatchObject({ status: 'applied', publication: 'published' });
    expect(f.controller.loadWorldPreset).toHaveBeenCalledOnce();
  });
  it.each([0, 1, 2])('disarms a synthetic handled spatial failure with %i retained draws but preserves prior success', drawsConsumed => {
    const f = executorFixture(), w = f.controller.world!; w.measureSpatial('a', 'xy', .4); const prior = w.lastAction, before = w.spatialState('a').values;
    vi.spyOn(w, 'measureSpatial').mockReturnValue({ status: 'failed', stage: 'posterior', message: 'Injected handled failure', drawsConsumed, spatialDrawCount: 2 + drawsConsumed });
    const result = f.execute({ kind: 'spatial', targetId: 'a', axes: 'xy', resolution: .4 });
    expect(result).toEqual({ status: 'failed', stage: 'posterior', message: 'Injected handled failure', drawsConsumed, spatialDrawCount: 2 + drawsConsumed });
    expect(w.lastAction).toBe(prior); expect(w.spatialState('a').values).toEqual(before); expect(f.consumeIntent).toHaveBeenCalledOnce(); expect(f.publish).not.toHaveBeenCalled();
  });
  it('contains unexpected command exceptions without treating them as solver or handled numerical failures', () => {
    const f = executorFixture(), w = f.controller.world!, error = new RangeError('Unexpected command defect');
    vi.spyOn(w, 'measureSpatial').mockImplementation(() => { throw error; }); f.controller.play(); const pending = [...f.requests];
    expect(f.execute({ kind: 'spatial', targetId: 'a', axes: 'xy', resolution: .4 })).toEqual({ status: 'command-error', message: error.message });
    expect(f.executor.diagnosticError).toBe(error); expect([...f.requests]).toEqual(pending); expect(f.controller.snapshot().playing).toBe(true); f.controller.dispose();
  });
  it('retains a successful receipt through publication failure and redraws without rerunning or reannouncing a command', () => {
    const f = executorFixture(), w = f.controller.world!, measure = vi.spyOn(w, 'measureSpatial'), snapshot = vi.spyOn(f.controller, 'snapshot');
    f.publish.mockImplementationOnce(() => { throw Error('Injected display fault'); });
    const request = f.request({ kind: 'spatial', targetId: 'a', axes: 'xy', resolution: .4 });
    const result = f.executor.execute(request); expect(result).toMatchObject({ status: 'applied', publication: 'display-failed', receipt: w.lastAction });
    expect(snapshot).not.toHaveBeenCalled(); expect(w.getSnapshot().spatialDrawCount).toBe(2);
    expect(f.executor.execute(request)).toMatchObject({ status: 'rejected', reason: 'stale-intent' });
    expect(f.executor.redraw()).toMatchObject({ status: 'applied', publication: 'published', receipt: w.lastAction });
    expect(measure).toHaveBeenCalledOnce(); expect(f.committed).toHaveBeenCalledOnce(); expect(f.consumeIntent).toHaveBeenCalledOnce();
    expect(f.publish).toHaveBeenCalledTimes(2); expect(w.getSnapshot().spatialDrawCount).toBe(2);
  });
  it('disarms and cancels old publication even when committed UI metadata throws', () => {
    const f = executorFixture(), request = f.request({ kind: 'spatial', targetId: 'a', axes: 'xy', resolution: .4 });
    f.committed.mockImplementation(() => { throw Error('Committed UI metadata fault'); });
    expect(f.executor.execute(request)).toMatchObject({ status: 'applied', publication: 'display-failed' });
    expect(f.consumeIntent).toHaveBeenCalledOnce(); expect(f.cancelPendingPublication).toHaveBeenCalledOnce();
    expect(f.current.token!.epoch).toBe(request.token.epoch + 1); expect(f.executor.execute(request)).toMatchObject({ reason: 'stale-intent' });
    expect(f.executor.diagnosticError).toEqual(Error('Committed UI metadata fault'));
  });
  it('still records provenance/receipt metadata if disarming publication throws', () => {
    const f = executorFixture(); f.consumeIntent.mockImplementation(() => { throw Error('Disarm publication fault'); });
    expect(f.execute({ kind: 'spatial', targetId: 'a', axes: 'xy', resolution: .4 })).toMatchObject({ status: 'applied', publication: 'display-failed' });
    expect(f.committed).toHaveBeenCalledOnce(); expect(f.cancelPendingPublication).toHaveBeenCalledOnce();
  });
  it('consumes a successful epoch even when the intent-publication callback itself fails', () => {
    const f = executorFixture(), w = f.controller.world!; f.consumeIntent.mockImplementation(() => { throw Error('UI state fault'); });
    const r = f.request({ kind: 'spatial', targetId: 'a', axes: 'xy', resolution: .4 });
    expect(f.executor.execute(r)).toMatchObject({ status: 'applied', publication: 'display-failed' });
    expect(f.executor.execute(r)).toMatchObject({ status: 'rejected', reason: 'stale-intent' });
    expect(w.getSnapshot().spatialMeasurementCount).toBe(1); expect(f.committed).toHaveBeenCalledOnce();
  });
  it('rejects synchronous reentry while committing/publication is in progress', () => {
    const f = executorFixture(); let nested: WorldUIResult2D | null = null;
    f.committed.mockImplementation(() => { nested = f.execute({ kind: 'add' }); });
    expect(f.execute({ kind: 'select', targetId: 'b' }).status).toBe('applied');
    expect(nested).toMatchObject({ status: 'rejected', reason: 'busy' }); expect(f.controller.world!.ids).toHaveLength(2);
  });
  it('clears recovery explicitly with the reset lifetime even when world identity is unchanged', () => {
    const f = executorFixture(); f.publish.mockImplementationOnce(() => { throw Error('Display fault'); });
    f.execute({ kind: 'spatial', targetId: 'a', axes: 'xy', resolution: .4 });
    f.controller.reset(); f.current.token = actionToken(f.controller.world!, f.current.token!.epoch + 1, '2d'); f.executor.invalidate();
    expect(f.executor.redraw()).toMatchObject({ status: 'rejected', reason: 'no-world' });
    expect(f.controller.world!.lastAction).toBeNull(); expect(f.executor.diagnosticError).toBeNull();
  });
  it('does not replay redraw after a world replacement', () => {
    const f = executorFixture(); f.execute({ kind: 'select', targetId: 'b' }); f.controller.loadWorldPreset('bell');
    expect(f.executor.redraw()).toMatchObject({ status: 'rejected', reason: 'stale-intent' });
  });
  it('preserves the actual pending callback and fractional accumulator across execution and redraw failure', () => {
    const f = executorFixture(); f.controller.play(); f.tick(0); f.tick(1000 / 240);
    const pending = [...f.requests], calls = f.scheduler.request.mock.calls.length, cancels = f.scheduler.cancel.mock.calls.length;
    f.publish.mockImplementationOnce(() => { throw Error('Display fault while playing'); });
    expect(f.execute({ kind: 'spatial', targetId: 'b', axes: 'xy', resolution: .4 })).toMatchObject({ status: 'applied', publication: 'display-failed' });
    expect([...f.requests]).toEqual(pending); expect(f.scheduler.request.mock.calls.length).toBe(calls); expect(f.scheduler.cancel.mock.calls.length).toBe(cancels);
    expect(f.executor.redraw()).toMatchObject({ status: 'applied', publication: 'published' });
    const w = f.controller.world!, reference = new QuantumWorld2D(w.geometry, { creatures: w.ids.map(id => w.state(id)), interactions: w.getSnapshot().interactions });
    reference.step(f.controller.potential, f.controller.dt); f.tick(1000 / 120);
    expect(w.time).toBe(f.controller.dt); w.ids.forEach(id => expect(w.spatialState(id).values).toEqual(reference.spatialState(id).values)); f.controller.dispose();
  });
  it('formats chronological x-only, joint, preparation and actual release outcomes without inventing coordinates or draws', () => {
    const w = world(); w.measureSpatial('a', 'x', .4); const x = actionReceiptText(w.lastAction!);
    expect(x).toContain('no measured y'); expect(x).not.toContain(', y=');
    w.measureSpatial('a', 'xy', .4); expect(actionReceiptText(w.lastAction!)).toContain(', y=');
    w.prepareBellPair('p', 'b', 'a'); expect(actionReceiptText(w.lastAction!)).toContain('Creature B then Creature A');
    w.measurePair('p', 'X'); expect(actionReceiptText(w.lastAction!)).toContain('Creature B X→');
    w.measureAndRelease('p', 'X'); expect(actionReceiptText(w.lastAction!)).toContain('product factorization, no sampled outcome');
  });
});
