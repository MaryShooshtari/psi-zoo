import { useEffect, useId, useState } from 'react';
import { actionReceiptText, nativeActionRequest, sameActionToken, validateWorldUICommand,
  type ActionToken2D, type CreatureActionState2D, type DraftEdit2D, type WorldUIRequest2D, type WorldUIResult2D } from './creatureActionState2d';
import type { WorldAction2D, WorldSnapshot2D } from './world/world2d';

const label = (id: string) => `Creature ${id.toUpperCase()}`;
/** Presentational, intentionally unmounted until the full activation gate.
 * No controller, target fallback, randomness or physics mutation lives here. */
export function CreatureActions2D({ state, currentToken, snapshot, visibleIds, disabledReason = null, edit, apply, arm, cancel }: {
  state: CreatureActionState2D; currentToken: ActionToken2D; snapshot: WorldSnapshot2D; visibleIds: readonly string[];
  disabledReason?: string | null; edit: (change: DraftEdit2D) => void; apply: (request: WorldUIRequest2D) => void;
  arm: () => void; cancel: () => void;
}) {
  const id = useId(), request = nativeActionRequest(state);
  if (!request) return null;
  const stale = !sameActionToken(state.token, currentToken) || currentToken.world.rosterRevision !== currentToken.rosterRevision;
  const refusal = validateWorldUICommand(request.command, snapshot);
  const blocked = disabledReason ?? (stale ? 'This draft is stale. Deliberately change a target or parameter, or reopen the action.' : null);
  const options = (ids: readonly string[], value: string) => <>
    <option value="">Choose explicitly…</option>
    {value && !ids.includes(value) && <option value={value} disabled>{label(value)} (unavailable)</option>}
    {ids.map(key => <option key={key} value={key}>{label(key)}{visibleIds.includes(key) ? '' : ' · density hidden'}</option>)}
  </>;
  const allIds = snapshot.creatures.map(c => c.id);
  const pair = state.mode === 'mood' ? snapshot.pairs.find(p => p.id === state.pairId) : undefined;
  return <form aria-label="Creature action targets" onSubmit={event => { event.preventDefault(); if (!blocked && !refusal) apply(request); }}>
    <fieldset disabled={disabledReason !== null} aria-describedby={`${id}-help`}>
      <legend>{state.mode === 'spatial' ? 'Measure position' : state.mode === 'entangle' ? 'Entangle moods' : 'Measure mood'}</legend>
      {state.mode === 'spatial' && <>
        <p id={`${id}-help`}>Measure where a creature is found, then update its cloud around that result. {state.axes === 'x' ? 'In 1D view only x is measured; the same full 2D state is updated.' : 'In 2D view the detector reports x and y.'} Choose the creature, not the outcome.</p>
        <label htmlFor={`${id}-target`}>Position target</label><select id={`${id}-target`} aria-label="Position target" value={state.targetId} onChange={e => edit({ kind: 'spatial', field: 'targetId', value: e.currentTarget.value })}>{options(allIds, state.targetId)}</select>
        <label htmlFor={`${id}-sigma`}>Detector width σ = {state.resolution}</label><input id={`${id}-sigma`} aria-label="Position detector width" type="range" min="0.2" max="2" step="0.1" value={state.resolution}
          onChange={e => edit({ kind: 'spatial', field: 'resolution', value: e.currentTarget.valueAsNumber })} />
        <details><summary>About this detector</summary><p>Finite-resolution Gaussian update, not an exact position projection. Width limits are controls, not a continuum-accuracy guarantee. A correlated y marginal may change even when only x is measured.</p></details>
      </>}
      {state.mode === 'entangle' && <>
        <p id={`${id}-help`}>Let two creatures share a quantum mood. Choose two independent targets in order, then Apply to replace their moods with a joint Bell state. Their spatial clouds stay independent.</p>
        <label htmlFor={`${id}-a`}>First creature · subsystem A</label><select id={`${id}-a`} aria-label="Entanglement first target" value={state.creatureAId} onChange={e => edit({ kind: 'entangle', field: 'creatureAId', value: e.currentTarget.value })}>{options(allIds, state.creatureAId)}</select>
        <label htmlFor={`${id}-b`}>Second creature · subsystem B</label><select id={`${id}-b`} aria-label="Entanglement second target" value={state.creatureBId} onChange={e => edit({ kind: 'entangle', field: 'creatureBId', value: e.currentTarget.value })}>{options(allIds, state.creatureBId)}</select>
        <p>The first canvas target changes no physics. An overlap never chooses one creature for you.</p>
      </>}
      {state.mode === 'mood' && <>
        <p id={`${id}-help`}>Ask a two-outcome question about one creature’s shared mood—not its position or a literal emotion. First choose a registered pair and creature; if there is no pair, use Entangle moods first. This cannot send a signal to its partner.</p>
        <label htmlFor={`${id}-pair`}>Registered pair</label><select id={`${id}-pair`} aria-label="Mood action pair" value={state.pairId} onChange={e => edit({ kind: 'mood', field: 'pairId', value: e.currentTarget.value })}>
          <option value="">Choose explicitly…</option>
          {state.pairId && !pair && <option value={state.pairId} disabled>{state.pairId} (unavailable)</option>}
          {snapshot.pairs.map(p => <option key={p.id} value={p.id}>{p.id} · A={label(p.creatureAId)}, B={label(p.creatureBId)}</option>)}
        </select>
        <label htmlFor={`${id}-mood-target`}>Mood target</label><select id={`${id}-mood-target`} aria-label="Mood action target" value={state.targetId} onChange={e => edit({ kind: 'mood', field: 'targetId', value: e.currentTarget.value })}>{options(pair ? [pair.creatureAId, pair.creatureBId] : [], state.targetId)}</select>
        <label htmlFor={`${id}-basis`}>Measurement basis</label><select id={`${id}-basis`} aria-label="Mood action basis" value={state.basis} onChange={e => edit({ kind: 'mood', field: 'basis', value: e.currentTarget.value as 'X' | 'Z' })}><option value="Z">Z · 0 or 1</option><option value="X">X · + or −</option></select>
        <p>Z asks about 0 versus 1; X asks about + versus −, two different superpositions of those Z alternatives. The basis changes which quantum question you ask.</p>
      </>}
      <button type="submit" disabled={!!blocked || !!refusal}>{state.mode === 'spatial' ? `Apply ${state.axes === 'x' ? 'x-only' : 'x/y'} position measurement` : state.mode === 'entangle' ? 'Apply ordered Bell preparation' : 'Apply mood measurement'}</button>
      <button type="button" onClick={arm} disabled={!!blocked || state.mode === 'mood' && !pair}>Arm on canvas</button>
    </fieldset>
    {(blocked || refusal) && <p className="action-feedback">{blocked ?? refusal?.message}</p>}
    <p>Native targets may name hidden densities. Canvas actions use only visible clouds. Choosing a target does not execute; Apply does.</p>
    <button type="button" onClick={cancel}>Cancel action</button>
  </form>;
}

export function briefActionReceipt(receipt: WorldAction2D): string {
  switch (receipt.kind) {
    case 'spatial-measurement': return `${label(receipt.targetId)} · position measured`;
    case 'mood-prepare': return 'Shared Bell mood prepared';
    case 'mood-measure': case 'mood-measure-pair': return 'Mood measured';
    case 'mood-release': return 'Mood pair released';
  }
}

/** Owner supplies the last successful receipt separately from transient feedback.
 * Stable text/sequence attributes let unchanged periodic snapshots stay silent. */
export function CreatureActionStatus2D({ state, receipt, result, cancel, redraw }: {
  state: CreatureActionState2D; receipt: WorldAction2D | null; result: WorldUIResult2D | null; cancel: () => void; redraw: () => void;
}) {
  const [noticeVisible, setNoticeVisible] = useState(false);
  useEffect(() => {
    setNoticeVisible(!!receipt);
    if (!receipt) return;
    const timer = setTimeout(() => setNoticeVisible(false), 3200);
    return () => clearTimeout(timer);
  }, [receipt]);
  const armed = (state.mode === 'spatial' || state.mode === 'mood' || state.mode === 'entangle') && state.route === 'canvas';
  const feedback = !result || result.status === 'applied' && result.publication === 'published' ? null
    : result.status === 'failed' ? `No spatial state update. ${result.message} ${result.drawsConsumed} draw(s) consumed; retry is a new attempt.` : result.message;
  return <section className="creature-action-status" aria-label="Creature action instructions and results" tabIndex={-1}>
    {noticeVisible && receipt && <p className="action-toast" aria-hidden="true">{briefActionReceipt(receipt)}</p>}
    {armed && <p className="armed-instructions">{state.mode === 'spatial' ? `Position detector armed · ${state.axes === 'x' ? 'x-only; no measured y' : 'x/y'} · σ=${state.resolution}. Choose one visible cloud.`
      : state.mode === 'entangle' ? state.firstTarget ? `${label(state.firstTarget.id)} confirmed first. Choose a different independent mood.` : 'Entanglement armed. Choose the first independent mood, then the second.'
        : `Mood ${state.basis} measurement armed for pair ${state.pairId}. Choose one member.`} Escape or Cancel leaves physics unchanged. <button type="button" onClick={cancel}>Cancel action</button></p>}
    <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true" data-action-sequence={receipt?.sequence ?? ''}>{receipt ? <><span className="visually-hidden">Action {receipt.sequence}. </span>{actionReceiptText(receipt)}</> : 'No recorded creature action.'}</p>
    <p role="status" aria-live="polite" className="action-feedback">{feedback}</p>
    {result?.status === 'applied' && result.publication === 'display-failed' && <button type="button" onClick={redraw}>Redraw committed result — do not measure again</button>}
  </section>;
}
