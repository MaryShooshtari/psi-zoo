import type { MuseumScene, Topic } from './museumScience';
import type { SettingsSection } from './TerrariumShell';
export interface LearningStep {
  title: string; topic: Topic; seeing: string; tryThis: string;
  action: SettingsSection | 'playback'; actionLabel: string;
}
/** Read-only learning content. Navigation never prepares, measures or resets. */
export const LEARNING_STEPS: readonly LearningStep[] = [
  { title: 'Meet your quantum creature', topic: 'probability',
    seeing: 'The colored cloud shows where a quantum particle could be found if its position were measured. Brighter areas mean greater probability density. The wavefunction is the underlying quantum description; the cloud shows its probability density, not the whole wavefunction.',
    tryThis: 'Select a creature in Creatures, then compare its cloud in 2D and its hill in 1D. Looking or selecting does not measure it.',
    action: 'Creatures', actionLabel: 'Choose a creature' },
  { title: 'Why does it spread?', topic: 'spreading',
    seeing: 'The wavefunction changes with time according to the Schrödinger equation. A free localized packet generally spreads because it contains a range of momenta. Its total probability does not disappear as the glow becomes more diffuse.',
    tryThis: 'Press Play, watch the cloud, then Pause. Terrain, interactions and boundary reflections can also change its shape; this is your existing scene, not an automatically prepared free example.',
    action: 'playback', actionLabel: 'Find Play / Pause' },
  { title: 'What happens when you observe it?', topic: 'measurement',
    seeing: 'Measuring position reports a location and updates the wavefunction around that result. This detector has finite resolution: it applies a smooth Gaussian filter, not a perfect position eigenstate projection.',
    tryThis: 'Open Measure position, choose a creature and Apply. Then press Play to watch it evolve again. The result is sampled from its state, not from where you click; 1D view measures x only.',
    action: 'Measure position', actionLabel: 'Open position measurement' },
  { title: 'Can a quantum particle cross a barrier?', topic: 'scattering',
    seeing: 'A barrier is a region of higher potential energy, not a painted wall that directly moves the cloud. A wave meeting it can reflect back and transmit onward. Below-barrier transmission is called tunnelling; above-barrier transmission is not.',
    tryThis: 'Choose Barrier in Terrain, draw across part of the cloud’s path, then Play. Compare returning and outgoing density; a finite obstacle can also be bypassed in 2D.',
    action: 'Terrain', actionLabel: 'Choose a terrain tool' },
  { title: 'What happens with multiple creatures?', topic: 'mean-field',
    seeing: 'Each creature has its own spatial wavefunction. Their clouds do not interfere merely by overlapping. Optional interaction potentials approximate influences between them; this is not an exact interacting many-body Schrödinger simulation.',
    tryThis: 'Select another creature, or explicitly Add creature. Compare the colors; advanced interaction switches are under Creatures → Advanced simulation settings, if you want to explore them.',
    action: 'Creatures', actionLabel: 'Explore creatures' },
  { title: 'What is a quantum mood?', topic: 'qubits',
    seeing: 'A mood is a playful picture of a separate two-level quantum system, a qubit—not a literal emotion. A superposition combines quantum amplitudes for two alternatives, rather than just hiding an already chosen label. A measurement basis specifies which pair of alternatives you ask about.',
    tryThis: 'Open Measure mood and compare the basis choices: Z asks 0 or 1; X asks + or −, two different superpositions of those Z alternatives. This app’s mood detector acts on shared pairs; if none exists, prepare one in the next step.',
    action: 'Measure mood', actionLabel: 'Explore mood measurement' },
  { title: 'What does entanglement mean?', topic: 'entanglement',
    seeing: 'Two moods can share one joint quantum state that cannot be described as two independent pure states. A Bell state is one such preparation and can produce correlated measurement outcomes. This is mood entanglement, not spatial entanglement or a signal between creatures.',
    tryThis: 'Pause first. Choose two independent creatures in order and explicitly Apply Bell preparation; this replaces their moods, not their spatial clouds. Then measure each mood in the same basis. Compare records across new preparations—not repeated measurements of one already measured pair.',
    action: 'Entangle moods', actionLabel: 'Prepare a shared mood' },
];

/** Interpret published evidence, not the presumed success of a Try button.
 * Baselines contain diagnostics only, never amplitude buffers or RNG handles. */
export function learningObservation(step: number, scene: MuseumScene | null, baseline: MuseumScene | null): string {
  if (!scene) return 'Waiting for the playground to load. No experiment has been changed.';
  if (scene.kind !== '2d' || !scene.snapshot.world) return 'You are in a separate legacy demonstration. The seven-step path uses the main terrarium; switching with 2D view starts a fresh terrarium explicitly.';
  const n = scene.snapshot, w = n.world!, c = w.creatures.find(c => c.id === w.selected)!;
  const old = baseline?.kind === '2d' ? baseline.snapshot : null;
  const previous = old?.world?.creatures.find(x => x.id === c.id);
  const last = w.lastAction;
  const newAction = !!last && last.sequence > (old?.world?.lastAction?.sequence ?? 0) && n.time >= (old?.time ?? 0);
  if (step === 0) return `${w.creatures.length} creature${w.creatures.length === 1 ? '' : 's'} present; Creature ${c.id.toUpperCase()} is selected. Its face labels significant density, not a hidden particle position.`;
  if (step === 1) {
    if (!old || n.time <= old.time || !previous) return 'No later evolution of this selected creature has been observed in this step yet. Press Play when you are ready; Next is always available.';
    const grew = c.sigmaX > previous.sigmaX * 1.01 || c.sigmaY > previous.sigmaY * 1.01;
    return grew ? 'A computed width of this creature has increased since this step began. Terrain and feedback may also affect this scene, so width growth alone is not a test of free-packet dynamics.'
      : 'The simulation has evolved, but no width increase above 1% is recorded for this creature. Waves need not widen monotonically in a well, an interacting scene or after boundary reflections.';
  }
  if (step === 2) return newAction && last?.kind === 'spatial-measurement'
    ? `Creature ${last.targetId.toUpperCase()} has a new ${last.axes === 'x' ? 'x-only' : 'x/y'} Gaussian detector result. The conditional update favored amplitudes near that reported location; later evolution can change the cloud again. The recorded location is historical, not a tracked particle.`
    : 'No new position result is recorded for this step. Choosing a target is not measurement: Apply or explicitly Arm on canvas, then choose one unambiguous cloud.';
  if (step === 3) return n.potentialMax > 0
    ? 'Positive terrain is present. Transmission here is not automatically proof of tunnelling: the packet has an energy spread, may go around a finite barrier, and can reflect from the outer boundary.'
    : 'No positive barrier is currently painted. Drawing changes the potential for subsequent evolution, not the wavefunction immediately; no tunnelling result is assumed.';
  if (step === 4) return `${w.creatures.length} independent spatial state${w.creatures.length === 1 ? ' is' : 's are'} present. ${w.interactions.drives || w.interactions.social ? 'Approximate feedback is enabled; registered mood-pair members are excluded from it.' : 'Mood-drive and social feedback are both off.'} Sharing a mood never creates a joint spatial wavefunction.`;
  if (step === 5) return c.localMood.purity < .999
    ? `Creature ${c.id.toUpperCase()} has a mixed local mood: one pure qubit state alone cannot describe all its local measurement statistics. This is not sadness or missing probability; X and Z ask different quantum questions.`
    : `Creature ${c.id.toUpperCase()} currently has a pure local mood. This does not mean every measurement basis has a certain outcome; choosing a different basis changes the possible statistics.`;
  if (newAction && (last?.kind === 'mood-measure' || last?.kind === 'mood-measure-pair')) return 'A new mood measurement is recorded. Its outcome is a quantum result, not a message; compare the two records using ordinary information. A single pair of matching outcomes alone does not establish entanglement.';
  if (w.pairs.some(p => p.entropy > 1e-6)) return 'At least one registered joint mood is currently entangled according to its computed joint state. Individual outcomes remain random; correlations can be examined over repeated preparations and cannot be used to signal.';
  if (w.pairs.length) return 'A shared pair remains registered, but registration alone does not mean it is currently entangled. Measurement can leave a product state; a fresh explicit Bell preparation is a different experiment.';
  return 'No shared mood pair is registered yet. Choose two independent targets and explicitly Apply; opening this lesson or selecting the first target changes no physics.';
}
