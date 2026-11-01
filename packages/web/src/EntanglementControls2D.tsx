import { useState } from 'react';
import { creatureLabel } from './creatureIdentity';
import type { MoodBasis } from '@psi-zoo/sim-core';
import type { WorldSnapshot2D } from './world/world2d';
import { captureWorldUIRequest, type ActionToken2D, type WorldUICommand2D, type WorldUIRequest2D, type WorldUIResult2D } from './creatureActionState2d';
import { useSettingsNavigation } from './TerrariumShell';

/** Pair diagnostics and explicit coordinated actions. Bell preparation lives in
 * the ordered A/B form; a disappearing partner never selects its replacement. */
export function EntanglementControls2D({ snapshot: s, token, execute, focus, disabled }: {
  snapshot: WorldSnapshot2D; token: ActionToken2D | null; disabled: boolean;
  execute: (request: WorldUIRequest2D) => WorldUIResult2D | undefined; focus: () => HTMLElement | null;
}) {
  const [basis, setBasis] = useState<MoodBasis>('Z');
  const navigation = useSettingsNavigation();
  const c = s.creatures.find(c => c.id === s.selected)!;
  const pair = s.pairs.find(p => p.id === c.localMood.pairId);
  // The render-captured token is retained in the activation closure. Never ask
  // the executor for a replacement token if ownership changes before delivery.
  const run = (command: WorldUICommand2D) => {
    if (!token) return;
    const result = execute(captureWorldUIRequest(token, 'native', command));
    if (result?.status === 'applied') navigation?.closeAndHandoff(focus);
  };
  return <fieldset disabled={disabled || !token} aria-label="Mood entanglement controls">
    <legend>Shared mood pairs · advanced</legend>
    <p><strong>Mood ownership:</strong> {pair ? `Pair ${pair.id} · subsystem ${c.localMood.subsystem} · partner ${creatureLabel(pair.creatureAId === c.id ? pair.creatureBId : pair.creatureAId)}` : 'Independent pure state'}</p>
    <details><summary>Local mood diagnostics</summary><p><strong>Local purity:</strong> {c.localMood.purity.toFixed(6)} · Reduced Bloch vector may have length zero: a valid maximally mixed state.</p></details>
    {!pair && <p>No shared pair for this creature. Use Experiments → Entangle moods to choose two creatures; preparation changes their moods, not their spatial clouds.</p>}
    {pair && <>
      <details><summary>Pair state diagnostics</summary><p><strong>Entanglement entropy:</strong> {pair.entropy.toFixed(6)} bits · <strong>Joint norm:</strong> {pair.norm.toFixed(12)}</p></details>
      <p>Shared pair: {pair.id} · A={creatureLabel(pair.creatureAId)}, B={creatureLabel(pair.creatureBId)}. Mood drive and all social terms involving these members are suspended, even after measurement.</p>
      <h3>Coordinated pair actions</h3><p>For one creature, use Experiments → Measure mood. These advanced actions measure both members or release their shared ownership.</p>
      <label>Measurement basis <select aria-label="Mood measurement basis" value={basis} onChange={e => setBasis(e.currentTarget.value as MoodBasis)}><option>Z</option><option>X</option></select></label>
      <button onClick={() => run({ kind: 'mood-pair', pairId: pair.id, basis })}>Measure both sequentially</button>
      <button onClick={() => run({ kind: 'mood-release', pairId: pair.id, basis })}>Measure &amp; Release</button>
      <p>Measure &amp; Release is a deliberate global transition: factor a product state or measure first, then restore ordinary spatial feedback next step. Reset restores saved Bell preparation.</p>
      <p><strong>Current theoretical {basis}/{basis} probabilities:</strong> {(basis === 'Z' ? ['00', '01', '10', '11'] : ['++', '+−', '−+', '−−']).map((label, i) => `${label}: ${((basis === 'Z' ? pair.zProbabilities : pair.xProbabilities)[i]! * 100).toFixed(2)}%`).join(' · ')}</p>
      <p>Bell preparation gives 00/11 or ++/−− each 50%. Local evolution may change correlations, not entanglement. Repeated measurements on one collapsed pair are not independent Bell trials.</p>
    </>}
    <details><summary>Measurement outcomes &amp; session events</summary><div aria-label="Mood outcome history"><strong>Session mood events</strong><ul>{s.moodHistory.slice(-8).map((e, i) => <li key={i}>{e.type === 'measure' ? `${e.pairId}: ${creatureLabel(e.creatureId)} measured ${e.basis} → ${e.basis === 'X' ? e.outcome === 0 ? '+' : '−' : e.outcome}, probability ${(100 * e.probability).toFixed(2)}%` : e.type === 'prepare' ? `${e.pairId}: global Bell preparation (${creatureLabel(e.creatureAId)}, ${creatureLabel(e.creatureBId)})` : `${e.pairId}: global Measure & Release (${e.basis})`}</li>)}</ul></div></details>
    <p>Conditional partner moods can change after a recorded outcome; ignoring outcomes leaves the remote density unchanged. This pedagogical quantum–classical interface is not an exact coupled many-body theory or a signalling mechanism.</p>
  </fieldset>;
}
