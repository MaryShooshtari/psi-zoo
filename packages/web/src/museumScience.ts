import { actionReceiptText } from './creatureActionState2d';
import type { Snapshot2D } from './simulation2d';
import type { SimulationSnapshot } from './simulation';
import type { TerrariumViewMode } from './terrariumView';
export type Topic = 'probability' | 'spreading' | 'marginals' | 'potentials' | 'scattering' | 'qubits' | 'mean-field' | 'entanglement' | 'measurement' | 'no-signalling';
export type MuseumScene = { kind: '2d'; snapshot: Snapshot2D; knownGaussian: boolean; uneditedPreset: boolean; interaction?: 'inspect' | 'terrain' | 'spatial' | 'mood' | 'entangle' }
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
  if (scene.interaction === 'spatial') add('measurement', 'Position detector selected', `This action uses a finite-resolution Gaussian measurement of ${view === '1d' ? 'x on the full 2D state' : 'x and y'}. Choose a native target or explicitly arm the canvas; a click selects a creature, not the sampled outcome coordinate.`);
  if (scene.interaction === 'terrain') add('potentials', 'Shaping potential energy', 'The active brush changes external potential energy, not the current wavefunction. Barriers raise it and wells lower it; Clear terrain restores flat potential without resetting creatures or time.');
  if (scene.interaction === 'entangle') add('entanglement', 'Preparing a shared mood', 'Choose two ordered creature targets for coordinated Bell preparation. This creates a joint mood state, not spatial entanglement; it does not measure position.');
  if (scene.interaction === 'mood') add('qubits', 'Mood detector selected', 'Measure a mood qubit along X or Z using the selected basis and explicit target. Correlated mood outcomes are not spatial measurements or signals between creatures.');
  if (view === '1d') add('marginals', 'A quantum shadow, not a new 1D system', 'Each hill sums position probability along y from the same 2D state. The common linear scale preserves relative heights. Average terrain along y is an unweighted terrain average, not an exact effective 1D Hamiltonian.');
  const w = n.world, selected = w?.creatures.find(c => c.id === w.selected);
  const feedback = !!w && (w.interactions.drives || w.interactions.social);
  if (scene.knownGaussian && !w?.spatialMeasurementCount && n.potentialL1 === 0 && !feedback && (!w || w.creatures.length === 1))
    add('spreading', 'Free Gaussian spreading', 'With no terrain or feedback, the initially Gaussian density can widen while its total probability remains one. Compare widths before boundary reflections. A lowering peak does not mean the creature is disappearing.');
  else add('probability', 'Position probability density', 'Brighter regions have more probability per unit area. Each creature has its own normalized spatial state; the face is only a density-anchored label, never a sampled position.');
  if (n.potentialMax > 0) add('potentials', 'Positive potential is present', 'Warm terrain marks positive potential energy. Its effect depends on the state, energy, width and later evolution. An arbitrary painted bump alone is not evidence of tunnelling.');
  if (n.potentialMin < 0) add('potentials', 'Negative potential is present', 'Blue terrain marks a negative potential well. It can attract or confine parts of a state, but drawing a well does not prepare a bound energy eigenstate. Editing terrain changes the Hamiltonian, not the current amplitudes.');
  if (scene.uneditedPreset && n.experiment.startsWith('Scattering:')) add('scattering', 'Known 2D scattering preset', 'A directed Gaussian approaches the full-height barrier. Outgoing density is not a calibrated tunnelling fraction: the packet contains an above-barrier energy tail. Use the separate validated 1D experiment for its qualified R/T accounting.');
  if (w && w.creatures.length > 1) add('probability', 'Multiple independent spatial clouds', 'The colored densities belong to separate single-particle spatial states. Adding their displayed intensities creates no coherent cross term. A joint entangled mood does not make their spatial states entangled.');
  if (feedback) add('mean-field', 'Expectation-driven mean-field controls', 'The enabled controls build effective potentials from mood expectations and other centroids. This is an approximate feedback model, not exact many-body quantum dynamics. Registered mood-pair members have all mood-dependent spatial feedback suspended.');
  if (selected) add('qubits', `Selected mood: ${selected.id.toUpperCase()}`, `A qubit is a two-level quantum state. Its Bloch vector summarizes three spin expectations, not sampled personality choices. Published local purity: ${selected.localMood.purity.toFixed(4)}. A short vector can be a mixed local state, not a broken normalization.`);
  if (selected?.localMood.kind === 'paired') add('entanglement', 'Registered joint mood pair', 'The pair owns one genuine four-amplitude joint state. Local states can be mixed. A product state after measurement remains registered until Measure & Release; the static line indicates ownership, not a signal or force.');
  const last = w?.lastAction;
  if (last?.kind === 'spatial-measurement') add('measurement', `Last session action: ${last.axes === 'x' ? 'x-only' : 'x/y'} position measurement`,
    `${actionReceiptText(last)} This historical finite-resolution Gaussian detector result is not a current particle or face position, nor an exact orthogonal projection. ${last.axes === 'x' ? 'The x mask updates the full 2D state across every y. No y is measured; a correlated y marginal may change.' : 'Both coordinates were sampled before one full-state update.'} Subsequent evolution can change the state.`);
  else if (last?.kind === 'mood-prepare') add('entanglement', 'Last session action: Bell mood preparation', `${actionReceiptText(last)} This coordinated preparation sampled no measurement outcome and did not entangle spatial states.`);
  else if (last?.kind === 'mood-measure' || last?.kind === 'mood-measure-pair') add('measurement', 'Last session action: mood measurement', `${actionReceiptText(last)} These are actual recorded Born outcomes of the joint mood, not a face animation. Subsequent evolution can change the state.`);
  else if (last?.kind === 'mood-release') add('no-signalling', 'Last session action: Measurement & Release', `${actionReceiptText(last)} Coordinated release restored independent mood ownership; any required measurement is listed, not invented. This is a global model operation, not a message along the drawn connection.`);
  if (w?.pairs.length) add('no-signalling', 'Correlations are not communication', 'An outcome-conditioned partner state can change after learning a result. If results are ignored, its reduced state is unchanged by the other local measurement. Outcome records need an ordinary classical channel.');
  return cards;
}
