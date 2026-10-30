import type { Snapshot2D } from './simulation2d';
import type { SimulationSnapshot } from './simulation';
import type { TerrariumViewMode } from './terrariumView';
export type Topic = 'probability' | 'spreading' | 'marginals' | 'potentials' | 'scattering' | 'qubits' | 'mean-field' | 'entanglement' | 'measurement' | 'no-signalling';
export type MuseumScene = { kind: '2d'; snapshot: Snapshot2D; knownGaussian: boolean; uneditedPreset: boolean }
  | { kind: 'legacy'; snapshot: SimulationSnapshot };
export interface ScienceCard { topic: Topic; title: string; explanation: string }
/** Classify only published evidence/preset provenance, never a guessed terrain shape. */
export function contextualScience(scene: MuseumScene | null, view: TerrariumViewMode): ScienceCard[] {
  const cards: ScienceCard[] = [];
  const add = (topic: Topic, title: string, explanation: string) => cards.push({ topic, title, explanation });
  if (!scene) { add('probability', 'Position probability', 'The cloud shows probability density, not a little particle or a painted face moving through space. Wait for the experiment to load.'); return cards; }
  if (scene.kind === 'legacy') {
    if (scene.snapshot.mode === 'scattering') add('scattering', 'Standalone 1D scattering experiment', `This is the separate large-domain experiment, not a projection. Quantitative accounting status: ${scene.snapshot.scatteringStatus}. Painted or measured runs do not retain the calibrated interpretation.`);
    else add('probability', 'Standalone 1D experiment', 'This uses an actual complex 1D wavefunction and its own controller, not the main terrarium marginal. Its density axis is nonlinear: geometric screen area is not probability.');
    if (scene.snapshot.observation) add('measurement', 'Recorded finite-resolution position observation', 'The selected state has a recorded detector outcome. The positive-width Gaussian update is not an exact orthogonal projection; its marker records the past result, not a moving particle.');
    if (scene.snapshot.mode === 'creatures') add('mean-field', 'Two independent 1D creatures', 'These have independent spatial states and mood qubits with the retained mean-field controls. Overlap is not coherent interference or entanglement.');
    return cards;
  }
  const n = scene.snapshot;
  if (view === '1d') add('marginals', 'A quantum shadow, not a new 1D system', 'Each hill sums position probability along y from the same 2D state. The common linear scale preserves relative heights. Average terrain along y is an unweighted terrain average, not an exact effective 1D Hamiltonian.');
  const w = n.world, selected = w?.creatures.find(c => c.id === w.selected);
  const feedback = !!w && (w.interactions.drives || w.interactions.social);
  if (scene.knownGaussian && n.potentialL1 === 0 && !feedback && (!w || w.creatures.length === 1))
    add('spreading', 'Free Gaussian spreading', 'With no terrain or feedback, the initially Gaussian density can widen while its total probability remains one. Compare widths before boundary reflections. A lowering peak does not mean the creature is disappearing.');
  else add('probability', 'Position probability density', 'Brighter regions have more probability per unit area. Each creature has its own normalized spatial state; the face is only a density-anchored label, never a sampled position.');
  if (n.potentialMax > 0) add('potentials', 'Positive potential is present', 'Warm terrain marks positive potential energy. Its effect depends on the state, energy, width and later evolution. An arbitrary painted bump alone is not evidence of tunnelling.');
  if (n.potentialMin < 0) add('potentials', 'Negative potential is present', 'Blue terrain marks a negative potential well. It can attract or confine parts of a state, but drawing a well does not prepare a bound energy eigenstate. Editing terrain changes the Hamiltonian, not the current amplitudes.');
  if (scene.uneditedPreset && n.experiment.startsWith('Scattering:')) add('scattering', 'Known 2D scattering preset', 'A directed Gaussian approaches the full-height barrier. Outgoing density is not a calibrated tunnelling fraction: the packet contains an above-barrier energy tail. Use the separate validated 1D experiment for its qualified R/T accounting.');
  if (w && w.creatures.length > 1) add('probability', 'Multiple independent spatial clouds', 'The colored densities belong to separate single-particle spatial states. Adding their displayed intensities creates no coherent cross term. A joint entangled mood does not make their spatial states entangled.');
  if (feedback) add('mean-field', 'Expectation-driven mean-field controls', 'The enabled controls build effective potentials from mood expectations and other centroids. This is an approximate feedback model, not exact many-body quantum dynamics. Registered mood-pair members have all mood-dependent spatial feedback suspended.');
  if (selected) add('qubits', `Selected mood: ${selected.id.toUpperCase()}`, `A qubit is a two-level quantum state. Its Bloch vector summarizes three spin expectations, not sampled personality choices. Published local purity: ${selected.localMood.purity.toFixed(4)}. A short vector can be a mixed local state, not a broken normalization.`);
  if (selected?.localMood.kind === 'paired') add('entanglement', 'Registered joint mood pair', 'The pair owns one genuine four-amplitude joint state. Local states can be mixed. A product state after measurement remains registered until Measure & Release; the static line indicates ownership, not a signal or force.');
  const history = w?.moodHistory ?? [], last = history[history.length - 1];
  if (last?.type === 'measure') add('measurement', 'Last session action: mood measurement', `Recorded ${last.creatureId.toUpperCase()} in ${last.basis}: ${last.basis === 'X' ? (last.outcome === 0 ? '+' : '−') : last.outcome}, Born probability ${last.probability.toPrecision(4)}. This was an explicit sampled result, not a face animation. Subsequent evolution can change the state.`);
  if (last?.type === 'release') add('no-signalling', 'Last session action: Measurement & Release', 'The coordinated release restored independent mood ownership; if needed it measured first. This is a global model operation, not a message sent along the drawn connection. Current independent feedback may now resume.');
  if (w?.pairs.length) add('no-signalling', 'Correlations are not communication', 'An outcome-conditioned partner state can change after learning a result. If results are ignored, its reduced state is unchanged by the other local measurement. Outcome records need an ordinary classical channel.');
  return cards;
}
