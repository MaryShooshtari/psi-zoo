import { expect, it } from 'vitest';
import { createPsiGrid2D, gaussianWell2D, bellMoodState, evolveLocalMood, reducedMoodDensity } from '@psi-zoo/sim-core';
import { QuantumWorld2D } from './world2d';
import { createWorldPreset2D } from './worldPresets2d';
import { MoodRegistry2D } from './moodRegistry2d';
const g=createPsiGrid2D({nx:24,ny:21});
const make=(preset:'bell'|'mood'='mood')=>new QuantumWorld2D(g,createWorldPreset2D(g,preset));
const spatial=(w:QuantumWorld2D)=>w.ids.map(id=>w.spatialState(id).values);

it('chronological frozen receipts copy actual mood events while preserving all existing method returns', () => {
 const w=make(); expect(w.lastAction).toBeNull();
 expect(w.prepareBellPair('p','b','a')).toBeUndefined();
 const prepared=w.lastAction!;
 expect(prepared).toMatchObject({kind:'mood-prepare',sequence:1,time:0,pairId:'p',creatureAId:'b',creatureBId:'a',events:[{type:'prepare',pairId:'p',creatureAId:'b',creatureBId:'a'}]});
 const event=w.measureMood('p','a','Z'), single=w.lastAction!;
 expect(single).toMatchObject({kind:'mood-measure',sequence:2,targetId:'a',basis:'Z',events:[event]});
 if(single.kind!=='mood-measure')throw new Error('Expected mood receipt');
 expect(single.events[0]).not.toBe(event);
 w.measureSpatial('b','x',.4);expect(w.lastAction).toMatchObject({kind:'spatial-measurement',sequence:3,spatialSequence:1});
 const pair=w.measurePair('p','X'), both=w.lastAction!;
 expect(pair).toHaveLength(2);expect(pair.map(e=>e.creatureId)).toEqual(['b','a']);
 expect(both).toMatchObject({kind:'mood-measure-pair',sequence:4,events:pair,basis:'X'});
 const beforeRelease=w.getSnapshot().moodHistory.length;
 expect(w.measureAndRelease('p','Z')).toBeUndefined();const released=w.lastAction!;
 expect(released).toMatchObject({kind:'mood-release',sequence:5,events:w.getSnapshot().moodHistory.slice(beforeRelease)});
 if(released.kind!=='mood-release')throw new Error('Expected release receipt');
 expect(released.events.map(e=>e.type)).toEqual(['release']); // product factorization, no invented measurement
 for(const receipt of [prepared,single,both,released]) {
  expect(Object.isFrozen(receipt)).toBe(true);
  if(receipt.kind==='spatial-measurement')throw new Error('Expected mood receipt');
  expect(Object.isFrozen(receipt.events)).toBe(true);expect(receipt.events.every(Object.isFrozen)).toBe(true);
 }
 expect(()=>{(released as unknown as {sequence:number}).sequence=99;}).toThrow();
 const retained=w.lastAction;expect(()=>w.measureMood('p','a','Z')).toThrow();expect(w.lastAction).toBe(retained);
 expect(w.getSnapshot()).toMatchObject({spatialMeasurementCount:1,spatialDrawCount:1});
});

it('initial Bell preparation is not a visitor action, and entangled release includes its actual measurement', () => {
 const w=make('bell');expect(w.lastAction).toBeNull();expect(w.getSnapshot().moodHistory).toHaveLength(1);
 w.step(new Float64Array(g.nx*g.ny),.03);w.measureAndRelease('friendship','X');
 expect(w.lastAction).toMatchObject({kind:'mood-release',sequence:1,time:.03,pairId:'friendship',creatureAId:'a',creatureBId:'b',basis:'X',events:[{type:'measure',creatureId:'a'},{type:'release'}]});
 const release=w.lastAction!;w.step(new Float64Array(g.nx*g.ny),.01);expect(w.lastAction).toBe(release);expect(w.lastAction!.time).toBe(.03);
 w.resetEvolution();expect(w.lastAction).toBeNull();expect(w.getSnapshot().moodHistory).toHaveLength(0);
 w.measureMood('friendship','b','Z');expect(w.lastAction).toMatchObject({kind:'mood-measure',sequence:1,time:0});
});

it('mood draws do not advance spatial RNG, and spatial draws do not advance mood RNG', () => {
 const a=make('bell'),b=make('bell');
 a.measureSpatial('b','xy',.4);a.measureSpatial('a','x',.2);
 expect(a.measureMood('friendship','a','X')).toEqual(b.measureMood('friendship','a','X'));
 expect(a.measurePair('friendship','Z')).toEqual(b.measurePair('friendship','Z'));
 for(const w of [a,b])w.measureAndRelease('friendship','Z');
 const c=make('bell'),d=make('bell');
 c.measureMood('friendship','a','Z');c.measurePair('friendship','X');c.measureAndRelease('friendship','Z');
 const x=c.measureSpatial('b','xy',.4),y=d.measureSpatial('b','xy',.4);
 expect(x.status).toBe('committed');expect(y.status).toBe('committed');expect(spatial(c)).toEqual(spatial(d));
 if(x.status!=='committed'||y.status!=='committed')throw new Error('Expected spatial success');
 expect({...x.receipt,sequence:0}).toEqual({...y.receipt,sequence:0});
 expect(c.getSnapshot().spatialDrawCount).toBe(2);
});
it('rejected mood commands preserve the chronological receipt, physics and both streams', () => {
 const a=make('bell'),b=make('bell');
 a.measureSpatial('a','x',.4);b.measureSpatial('a','x',.4);
 const before=a.getSnapshot(),values=spatial(a),receipt=a.lastAction;
 for(const command of [()=>a.prepareBellPair('q','a','b'),()=>a.measureMood('friendship','missing','Z'),()=>a.measurePair('friendship','bad' as 'Z'),()=>a.measureAndRelease('friendship','bad' as 'Z'),()=>a.measureMood('missing','a','Z')]) {
  expect(command).toThrow();expect(a.lastAction).toBe(receipt);expect(a.getSnapshot()).toEqual(before);expect(spatial(a)).toEqual(values);
 }
 expect(a.measureMood('friendship','b','X')).toEqual(b.measureMood('friendship','b','X'));
 expect(a.measureSpatial('b','xy',.4)).toEqual(b.measureSpatial('b','xy',.4));
});

it('global preparation changes ownership only, validates IDs and prevents overlap',()=>{
 const w=make(), before=spatial(w); w.prepareBellPair('p','b','a'); expect(spatial(w)).toEqual(before); expect(w.time).toBe(0);
 expect(w.getSnapshot().pairs[0]).toMatchObject({id:'p',creatureAId:'b',creatureBId:'a',entropy:1});
 expect(w.getSnapshot().creatures.every(c=>c.localMood.kind==='paired'&&Math.abs(c.localMood.purity-.5)<1e-14)).toBe(true);
 expect(()=>w.state('a')).toThrow(/no independent/);
 for(const args of [['q','a','b'],['q','a','a'],['q','bad','b'],['','a','b']] as const)expect(()=>w.prepareBellPair(args[0],args[1],args[2])).toThrow();
 w.addTemplate();w.addTemplate();w.prepareBellPair('second','d','c');expect(w.getSnapshot().pairs).toHaveLength(2);expect(()=>w.addTemplate()).toThrow();
});
it('pair evolves exactly once with correct named frequencies independently of storage order',()=>{
 const opts=createWorldPreset2D(g,'bell'), creatures=opts.creatures.map((c,i)=>({...c,parameters:{...c.parameters,moodFrequency:i===0?.7:-1.3}}));
 const a=new QuantumWorld2D(g,{...opts,creatures}), b=new QuantumWorld2D(g,{...opts,creatures:[...creatures].reverse()}), v=gaussianWell2D(g,2,0,0,2);
 let expected=bellMoodState(), maxNorm=0;
 for(let k=0;k<400;k++){a.step(v,.01);b.step(v,.01);expected=evolveLocalMood(evolveLocalMood(expected,'A',.7,.01),'B',-1.3,.01);maxNorm=Math.max(maxNorm,...a.getSnapshot().creatures.map(c=>Math.abs(c.norm-1)));}
 expect(spatial(a)).toEqual(spatial(b));expect(a.getSnapshot()).toEqual(b.getSnapshot());expect(a.getSnapshot().pairs[0]!.entropy).toBeCloseTo(1,13);
 expect(a.getSnapshot().creatures[0]!.localMood.density.entries).toEqual(reducedMoodDensity(expected,'A').entries);
 // Correlations, unlike Bell marginals, detect double evolution.
 const p=a.getSnapshot().pairs[0]!;expect(p.zProbabilities[0]).toBeCloseTo(.5*Math.cos((.7-1.3)*4/2)**2,12);
 console.log('5D paired-world 400-step max spatial norm drift',maxNorm);expect(maxNorm).toBeLessThan(1e-10);
});
for(const basis of ['Z','X'] as const)it(`${basis} measurement and release preserve spatial arrays, terrain, time; seeded reset reproduces`,()=>{
 const w=make('bell'), v=gaussianWell2D(g,2,0,0,2);w.step(v,.03);const before=spatial(w), terrain=v.slice(), time=w.time,potential=w.ids.map(id=>w.effectivePotential(id,v));
 const event=w.measureMood('friendship','a',basis);w.measureMood('friendship','b',basis);expect(spatial(w)).toEqual(before);expect(v).toEqual(terrain);expect(w.time).toBe(time);expect(w.ids.map(id=>w.effectivePotential(id,v))).toEqual(potential);
 w.measureAndRelease('friendship',basis);expect(spatial(w)).toEqual(before);expect(w.getSnapshot().pairs).toHaveLength(0);expect(w.getSnapshot().creatures.every(c=>Math.abs(c.localMood.purity-1)<1e-13)).toBe(true);
 w.resetEvolution();expect(w.getSnapshot().pairs[0]!.entropy).toBe(1);expect(w.getSnapshot().moodHistory).toHaveLength(0);w.step(v,.03);expect(w.measureMood('friendship','a',basis)).toEqual(event);
});
it('feedback suspension excludes paired targets and sources, and release restores eligibility next step',()=>{
 const w=make();w.addTemplate();w.addTemplate();w.setInteractions({drives:true,social:true});w.prepareBellPair('p','a','b');const v=gaussianWell2D(g,2,0,0,2);
 expect(w.effectivePotential('a',v)).toEqual(v);expect(w.effectivePotential('b',v)).toEqual(v);
 const independent=new QuantumWorld2D(g,{creatures:['c','d'].map(id=>w.state(id)),interactions:w.getSnapshot().interactions});
 expect(w.effectivePotential('c',v)).toEqual(independent.effectivePotential('c',v));
 const cBefore=w.effectivePotential('c',v); w.measureMood('p','a','Z');expect(w.effectivePotential('a',v)).toEqual(v);expect(w.effectivePotential('c',v)).toEqual(cBefore);
 const before=spatial(w);w.measureAndRelease('p','Z');expect(spatial(w)).toEqual(before);expect(w.effectivePotential('a',v)).not.toEqual(v);expect(w.effectivePotential('c',v)).not.toEqual(cBefore);
});
it('safe removal, reset, preset replacement and two-disjoint-pair lifecycle',()=>{
 const w=make('bell');expect(()=>w.remove('a')).toThrow(/Release/);w.measureAndRelease('friendship','Z');w.remove('a');w.resetEvolution();expect(w.ids).toEqual(['b']);expect(w.getSnapshot().pairs).toHaveLength(0);
 const fresh=make('bell');fresh.addTemplate();fresh.addTemplate();fresh.prepareBellPair('cd','c','d');fresh.measurePair('cd','X');fresh.resetEvolution();expect(fresh.getSnapshot().pairs.map(p=>p.entropy)).toEqual([1,1]);
 expect(make().getSnapshot().pairs).toHaveLength(0);
});
it('seeded commands replay, deterministic branches consume no samples, invalid commands do not advance stream',()=>{
 const initial=createWorldPreset2D(g,'mood').creatures;
 const registry=()=>{const r=new MoodRegistry2D(42);initial.forEach(c=>r.add(c.id,c.mood));return r;};
 const a=registry(),b=registry();a.prepareBell('p','a','b');expect(()=>a.measure('p','missing','Z')).toThrow();expect(()=>a.measure('p','a','bad' as 'Z')).toThrow();a.measure('p','a','X');a.measure('p','b','X');a.release('p','Z');
 a.prepareBell('q','a','b');a.measure('q','a','Z');for(const event of a.history)b.replay(event);expect(b.history).toEqual(a.history);expect(b.inspectPairs()).toEqual(a.inspectPairs());
 const c=registry(),d=registry();for(const r of [c,d]){r.prepareBell('p','a','b');r.measure('p','a','Z');}c.measure('p','b','Z');for(const r of [c,d]){r.release('p','Z');r.prepareBell('q','a','b');}expect(c.measure('q','a','Z')).toEqual(d.measure('q','a','Z'));
 // No additional sample when release factors an existing product state.
 const e=registry();e.prepareBell('p','a','b');e.measure('p','a','Z');e.release('p','X');expect(e.history.filter(e=>e.type==='measure')).toHaveLength(1);
});
it('release of an entangled pair measures explicitly then factors; inspectors cannot mutate live state',()=>{
 const w=make('bell'), before=spatial(w);w.measureAndRelease('friendship','X');expect(spatial(w)).toEqual(before);expect(w.getSnapshot().moodHistory.filter(e=>e.type==='measure')).toHaveLength(1);expect(w.getSnapshot().creatures.every(c=>c.localMood.kind==='independent')).toBe(true);
 w.resetEvolution();const snapshot=w.getSnapshot();expect(()=>{(snapshot.creatures[0]!.localMood.density.entries as number[])[0]=9;}).toThrow();expect(w.getSnapshot().pairs[0]!.entropy).toBe(1);
});
