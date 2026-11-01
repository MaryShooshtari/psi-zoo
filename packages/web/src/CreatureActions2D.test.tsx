import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createPsiGrid2D } from '@psi-zoo/sim-core';
import { briefActionReceipt, CreatureActions2D, CreatureActionStatus2D } from './CreatureActions2D';
import { actionToken, armCanvasAction, editActionDraft, openAction, type CreatureActionState2D, type WorldUIResult2D } from './creatureActionState2d';
import { QuantumWorld2D } from './world/world2d';
import { createWorldPreset2D } from './world/worldPresets2d';
function fixture() { const g = createPsiGrid2D({ nx: 16, ny: 13 }); return new QuantumWorld2D(g, createWorldPreset2D(g, 'independent')); }
function markup(world: QuantumWorld2D, state: CreatureActionState2D, disabledReason: string | null = null) {
  return renderToStaticMarkup(<CreatureActions2D state={state} currentToken={actionToken(world, state.token.epoch, state.token.view)} snapshot={world.getSnapshot()} visibleIds={['a']}
    disabledReason={disabledReason} edit={vi.fn()} apply={vi.fn()} arm={vi.fn()} cancel={vi.fn()} />);
}
describe('unmounted presentational creature action forms', () => {
  it('starts with explicit empty targets and keeps Apply disabled, not Arm', () => {
    const w = fixture(), s = openAction(null, w, '2d', 'spatial'), html = markup(w, s);
    expect(html).toContain('aria-label="Position target"'); expect(html).toContain('value="" selected=""');
    expect(html).toContain('disabled="">Apply x/y position measurement'); expect(html).toContain('type="button">Arm on canvas');
    expect(html).toContain('min="0.2" max="2" step="0.1"'); expect(html).toContain('value="0.4"');
    expect(html).toContain('Creature B · density hidden'); expect(w.lastAction).toBeNull();
  });
  it('renders only x-only observable instructions in the marginal form', () => {
    const w = fixture(), html = markup(w, openAction(null, w, '1d', 'spatial'));
    expect(html).toContain('In 1D view only x is measured'); expect(html).toContain('the same full 2D state is updated');
    expect(html).toContain('correlated y marginal may change'); expect(html).not.toContain('Joint x/y detector');
    expect(html).toContain('Choose the creature, not the outcome');
  });
  it('requires ordered A/B choices without selected-creature or partner fallback', () => {
    const w = fixture(); w.select('b'); let s = openAction(null, w, '2d', 'entangle');
    expect((markup(w, s).match(/value="" selected=""/g) ?? []).length).toBe(2);
    s = editActionDraft(s, s.token, { kind: 'entangle', field: 'creatureAId', value: 'b' });
    expect(markup(w, s)).toContain('disabled="">Apply ordered Bell preparation');
    s = editActionDraft(s, s.token, { kind: 'entangle', field: 'creatureBId', value: 'a' });
    expect(markup(w, s)).toContain('type="submit">Apply ordered Bell preparation');
    expect(w.getSnapshot().pairs).toHaveLength(0);
  });
  it('keeps unavailable targets explicit instead of rendering a replacement choice', () => {
    const w = fixture(); let s = openAction(null, w, '2d', 'spatial');
    s = editActionDraft(s, s.token, { kind: 'spatial', field: 'targetId', value: 'b' }); w.remove('b');
    const html = markup(w, s); expect(html).toContain('value="b" disabled="" selected="">Creature B (unavailable)');
    expect(html).toContain('This draft is stale'); expect(html).toContain('disabled="">Apply x/y');
  });
  it('disables all action controls under external guards but leaves Cancel reachable', () => {
    const w = fixture(), html = markup(w, openAction(null, w, '2d', 'spatial'), 'Finish the guide first.');
    expect(html).toContain('<fieldset disabled=""'); expect(html).toContain('Finish the guide first.');
    expect(html).toContain('</fieldset>'); expect(html).toContain('type="button">Cancel action');
  });
  it('offers explicit registered mood pair, target and basis controls without execution', () => {
    const w = fixture(); w.prepareBellPair('chosen', 'b', 'a');
    const html = markup(w, openAction(null, w, '2d', 'mood'));
    for (const name of ['Mood action pair', 'Mood action target', 'Mood action basis']) expect(html).toContain(`aria-label="${name}"`);
    expect(html).toContain('A=Creature B, B=Creature A'); expect(html).toContain('disabled="">Apply mood measurement');
    expect(w.lastAction?.kind).toBe('mood-prepare');
  });
  it('keeps historical success separate from a failure, with draw disclosure and no fake success', () => {
    const w = fixture(); w.measureSpatial('a', 'x', .4);
    const state = openAction(null, w, '1d', 'inspect');
    const result: WorldUIResult2D = { status: 'failed', stage: 'posterior', message: 'Unrepresentable mass.', drawsConsumed: 2, spatialDrawCount: 3 };
    const html = renderToStaticMarkup(<CreatureActionStatus2D state={state} receipt={w.lastAction} result={result} cancel={vi.fn()} redraw={vi.fn()} />);
    expect(html).toContain('data-action-sequence="1"'); expect(html).toContain('x-only'); expect(html).toContain('(no measured y)');
    expect(html).not.toContain(', y='); expect(html).toContain('No spatial state update.'); expect(html).toContain('2 draw(s) consumed');
    expect(html).not.toContain('Redraw committed');
  });
  it('keeps full ordered receipt semantics for AT while offering a brief visual confirmation', () => {
    const w = fixture(); w.prepareBellPair('p','a','b');
    expect(briefActionReceipt(w.lastAction!)).toBe('Shared Bell mood prepared');
    const html = renderToStaticMarkup(<CreatureActionStatus2D state={openAction(null,w,'2d','inspect')} receipt={w.lastAction} result={null} cancel={vi.fn()} redraw={vi.fn()} />);
    expect(html).toContain('class="visually-hidden" role="status" aria-live="polite"');
    expect(html).toContain('Creature A then Creature B');
    expect(html).not.toContain('class="action-toast"'); // only mounted receipt effects show a timed notice
  });
  it('shows the redraw-only recovery and canvas instructions but not for an unarmed native draft', () => {
    const w = fixture(); w.measureSpatial('b', 'xy', .4); const draft = openAction(null, w, '2d', 'spatial');
    const result: WorldUIResult2D = { status: 'applied', receipt: w.lastAction, addedTargetId: null, publication: 'display-failed', message: 'Applied; refresh failed.' };
    const render = (state: CreatureActionState2D) => renderToStaticMarkup(<CreatureActionStatus2D state={state} receipt={w.lastAction} result={result} cancel={vi.fn()} redraw={vi.fn()} />);
    expect(render(draft)).not.toContain('detector armed');
    const html = render(armCanvasAction(draft, draft.token)); expect(html).toContain('detector armed'); expect(html).toContain('Redraw committed result — do not measure again');
    expect(html).toContain('recorded at t='); expect(html).toContain(', y=');
  });
});
