import { bellMoodState, copyTwoQubit, validateQubitState, evolveQubit, evolveLocalMood, pureMoodDensity, reducedMoodDensity, densityBloch, moodPurity, entanglementEntropy, twoQubitNormSquared, measureLocalMood, factorProductMood, commonBasisProbabilities, type QubitState, type TwoQubitState, type MoodBasis, type Subsystem } from '@psi-zoo/sim-core';
import { createSeededRandom } from '../random';
type Ownership = { kind: 'independent'; state: QubitState } | { kind: 'paired'; pairId: string; subsystem: Subsystem };
interface Pair { id: string; creatureAId: string; creatureBId: string; state: TwoQubitState }
export type MoodEvent2D = Readonly<{ type: 'prepare'; pairId: string; creatureAId: string; creatureBId: string } | { type: 'measure'; pairId: string; creatureId: string; basis: MoodBasis; outcome: 0|1; probability: number } | { type: 'release'; pairId: string; basis: MoodBasis }>;
/** Authoritative state owner; neither pair nor independent live buffers escape.
 * Explicit commands are replayable at the same step boundaries with the same seed.
 * Preparing Bell is a global replacement, never a consequence of centroid forces. */
export class MoodRegistry2D {
  private owners = new Map<string, Ownership>();
  private pairs = new Map<string, Pair>();
  private initials = new Map<string, QubitState>();
  private initialPairs = new Map<string, Pair>();
  private events: MoodEvent2D[] = [];
  private random: () => number;
  constructor(private readonly seed = 0x5d2026) { this.random = createSeededRandom(seed); }
  get history(): readonly MoodEvent2D[] { return Object.freeze([...this.events]); }
  add(id: string, state: QubitState): void {
    if(this.owners.has(id)) throw new RangeError('Duplicate mood owner'); validateQubitState(state);
    this.initials.set(id,{values:state.values.slice()}); this.owners.set(id,{kind:'independent',state:{values:state.values.slice()}});
  }
  paired(id: string): boolean { return this.owner(id).kind === 'paired'; }
  private owner(id: string): Ownership { const o=this.owners.get(id); if(!o)throw new RangeError(`Unknown mood owner: ${id}`); return o; }
  private pair(id: string): Pair { const p=this.pairs.get(id); if(!p)throw new RangeError(`Unknown mood pair: ${id}`); return p; }
  independentState(id: string): QubitState { const o=this.owner(id); if(o.kind!=='independent')throw new RangeError('Paired creature has no independent pure mood; use local density'); return {values:o.state.values.slice()}; }
  remove(id: string): void {
    if(this.paired(id)) throw new RangeError('Measure & Release the pair before removing either member');
    this.owners.delete(id); this.initials.delete(id);
    for(const [key,p] of this.initialPairs)if(p.creatureAId===id||p.creatureBId===id)this.initialPairs.delete(key);
  }
  prepareBell(id: string, a: string, b: string): void {
    if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)||this.pairs.has(id))throw new RangeError('Pair ID must be unique and contain letters, numbers, underscores or hyphens');
    if(a===b||this.paired(a)||this.paired(b))throw new RangeError('Bell preparation requires two distinct independent creatures');
    // Argument order defines A/B permanently; never inferred from collection order.
    const p={id,creatureAId:a,creatureBId:b,state:bellMoodState()};
    for(const [key,old] of this.initialPairs)if([old.creatureAId,old.creatureBId].some(x=>x===a||x===b))this.initialPairs.delete(key);
    this.initialPairs.set(id,{...p,state:copyTwoQubit(p.state)}); this.pairs.set(id,p);
    this.owners.set(a,{kind:'paired',pairId:id,subsystem:'A'}); this.owners.set(b,{kind:'paired',pairId:id,subsystem:'B'});
    this.record({type:'prepare',pairId:id,creatureAId:a,creatureBId:b});
  }
  local(id: string) {
    const o=this.owner(id), d=o.kind==='independent'?pureMoodDensity(o.state):reducedMoodDensity(this.pair(o.pairId).state,o.subsystem);
    return Object.freeze({kind:o.kind, pairId:o.kind==='paired'?o.pairId:null, subsystem:o.kind==='paired'?o.subsystem:null, density:d, bloch:densityBloch(d), purity:moodPurity(d)});
  }
  inspectPairs() {
    return Object.freeze([...this.pairs.values()].map(p=>Object.freeze({id:p.id,creatureAId:p.creatureAId,creatureBId:p.creatureBId,norm:twoQubitNormSquared(p.state),entropy:entanglementEntropy(p.state),zProbabilities:commonBasisProbabilities(p.state,'Z'),xProbabilities:commonBasisProbabilities(p.state,'X')})));
  }
  measure(pairId: string, creatureId: string, basis: MoodBasis) {
    const p=this.pair(pairId), o=this.owner(creatureId);
    if(o.kind!=='paired'||o.pairId!==pairId)throw new RangeError('Creature is not a member of that pair');
    const r=measureLocalMood(p.state,o.subsystem,basis,this.random);
    p.state=r.state;
    const event=Object.freeze({type:'measure' as const,pairId,creatureId,basis,outcome:r.outcome,probability:r.probability}); this.record(event); return event;
  }
  measureBoth(pairId: string, basis: MoodBasis) { const p=this.pair(pairId); return [this.measure(pairId,p.creatureAId,basis),this.measure(pairId,p.creatureBId,basis)] as const; }
  release(pairId: string, basis: MoodBasis): void {
    const p=this.pair(pairId); if(basis!=='Z'&&basis!=='X')throw new RangeError('Invalid basis');
    let factors: readonly [QubitState,QubitState];
    try { factors=factorProductMood(p.state); }
    catch { this.measure(pairId,p.creatureAId,basis); factors=factorProductMood(p.state); }
    this.owners.set(p.creatureAId,{kind:'independent',state:factors[0]});this.owners.set(p.creatureBId,{kind:'independent',state:factors[1]});this.pairs.delete(pairId);
    this.record({type:'release',pairId,basis});
  }
  /** Build all candidates first. Commit together; no RNG used by stepping. */
  advance(frequencies: ReadonlyMap<string,number>, dt: number): void {
    const independent = new Map<string,Ownership>(), pairs = new Map<string,Pair>();
    for(const [id,o] of this.owners) independent.set(id,o.kind==='independent'?{kind:'independent',state:evolveQubit(o.state,{ax:frequencies.get(id)!/2,ay:0,az:0},dt)}:o);
    for(const [id,p] of this.pairs) pairs.set(id,{...p,state:evolveLocalMood(evolveLocalMood(p.state,'A',frequencies.get(p.creatureAId)!,dt),'B',frequencies.get(p.creatureBId)!,dt)});
    this.owners=independent; this.pairs=pairs;
  }
  reset(): void {
    this.owners=new Map([...this.initials].map(([id,s])=>[id,{kind:'independent' as const,state:{values:s.values.slice()}}])); this.pairs.clear();
    for(const [id,p]of this.initialPairs){this.pairs.set(id,{...p,state:copyTwoQubit(p.state)});this.owners.set(p.creatureAId,{kind:'paired',pairId:id,subsystem:'A'});this.owners.set(p.creatureBId,{kind:'paired',pairId:id,subsystem:'B'});}
    this.random=createSeededRandom(this.seed);this.events=[];
  }
  replay(event: MoodEvent2D): void {
    if(event.type==='prepare')this.prepareBell(event.pairId,event.creatureAId,event.creatureBId);
    else if(event.type==='release')this.release(event.pairId,event.basis);
    else {const r=this.measure(event.pairId,event.creatureId,event.basis);if(r.outcome!==event.outcome||r.probability!==event.probability)throw new Error('Measurement replay diverged');}
  }
  private record(e: MoodEvent2D): void {this.events.push(Object.freeze(e));}
}
