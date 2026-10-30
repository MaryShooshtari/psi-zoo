import { useState } from 'react';
import { creatureLabel } from './creatureIdentity';
import type { MoodBasis } from '@psi-zoo/sim-core';
import type { QuantumWorld2D, WorldSnapshot2D } from './world/world2d';
export function EntanglementControls2D({snapshot:s, action, disabled}:{snapshot:WorldSnapshot2D; action:(fn:(w:QuantumWorld2D)=>void)=>void; disabled:boolean}) {
  const [partner,setPartner]=useState(''), [basis,setBasis]=useState<MoodBasis>('Z');
  const c=s.creatures.find(c=>c.id===s.selected)!, available=s.creatures.filter(x=>x.id!==c.id&&x.localMood.kind==='independent');
  const target=available.some(x=>x.id===partner)?partner:available[0]?.id;
  const pair=s.pairs.find(p=>p.id===c.localMood.pairId);
  return <fieldset disabled={disabled} aria-label="Mood entanglement controls">
    <legend>Mood qubits · spatial states remain independent</legend>
    <p><strong>Mood ownership:</strong> {pair?`Pair ${pair.id} · subsystem ${c.localMood.subsystem} · partner ${pair.creatureAId===c.id?pair.creatureBId:pair.creatureAId}`:'Independent pure state'}</p>
    <details><summary>Local mood diagnostics</summary><p><strong>Local purity:</strong> {c.localMood.purity.toFixed(6)} · Reduced Bloch vector may have length zero: a valid maximally mixed state.</p></details>
    {!pair && <><label>Partner <select aria-label="Entanglement partner" value={target??''} onChange={e=>setPartner(e.target.value)}>{available.map(x=><option key={x.id} value={x.id}>{creatureLabel(x.id)}</option>)}</select></label>
      <h3>Make an entangled friendship</h3>
      <button aria-label="Make an entangled friendship (Entangle moods)" disabled={!target} onClick={()=>action(w=>{let i=1;while(s.pairs.some(p=>p.id===`pair-${i}`))i++;w.prepareBellPair(`pair-${i}`,c.id,target!);})}>Entangle moods</button>
      <p>Explicit global Bell-state preparation replaces both independent moods, not their spatial states.</p></>}
    {pair && <>
      <details><summary>Pair state diagnostics</summary><p><strong>Entanglement entropy:</strong> {pair.entropy.toFixed(6)} bits · <strong>Joint norm:</strong> {pair.norm.toFixed(12)}</p></details>
      <p>Shared pair: {pair.id} · A={pair.creatureAId}, B={pair.creatureBId}. Mood drive and all social terms involving these members are suspended, even after measurement.</p>
      <h3>Observe a mood</h3><p>Only these explicit measurement buttons sample an outcome. Cloud clicks only select.</p>
      <label>Measurement basis <select aria-label="Mood measurement basis" value={basis} onChange={e=>setBasis(e.target.value as MoodBasis)}><option>Z</option><option>X</option></select></label>
      <button onClick={()=>action(w=>{w.measureMood(pair.id,pair.creatureAId,basis);})}>Measure A</button>
      <button onClick={()=>action(w=>{w.measureMood(pair.id,pair.creatureBId,basis);})}>Measure B</button>
      <button onClick={()=>action(w=>{w.measurePair(pair.id,basis);})}>Measure both sequentially</button>
      <button onClick={()=>action(w=>w.measureAndRelease(pair.id,basis))}>Measure &amp; Release</button>
      <p>Measure &amp; Release is a deliberate global transition: factor a product state or measure first, then restore ordinary spatial feedback next step. Reset restores saved Bell preparation.</p>
      <p><strong>Current theoretical {basis}/{basis} probabilities:</strong> {(basis==='Z'?['00','01','10','11']:['++','+−','−+','−−']).map((label,i)=>`${label}: ${((basis==='Z'?pair.zProbabilities:pair.xProbabilities)[i]!*100).toFixed(2)}%`).join(' · ')}</p>
      <p>Bell preparation gives 00/11 or ++/−− each 50%. Local evolution may change correlations, not entanglement. Repeated measurements on one collapsed pair are not independent Bell trials.</p>
    </>}
    <details><summary>Measurement outcomes &amp; session events</summary><div role="status" aria-label="Mood outcome history"><strong>Session mood events</strong><ul>{s.moodHistory.slice(-8).map((e,i)=><li key={i}>{e.type==='measure'?`${e.pairId}: ${e.creatureId} measured ${e.basis} → ${e.basis==='X'?(e.outcome===0?'+':'−'):e.outcome}, probability ${(100*e.probability).toFixed(2)}%`:e.type==='prepare'?`${e.pairId}: global Bell preparation (${e.creatureAId}, ${e.creatureBId})`:`${e.pairId}: global Measure & Release (${e.basis})`}</li>)}</ul></div></details>
    <p>Conditional partner moods can change after a recorded outcome; ignoring outcomes leaves the remote density unchanged. This pedagogical quantum–classical interface is not an exact coupled many-body theory or a signalling mechanism.</p>
  </fieldset>;
}
