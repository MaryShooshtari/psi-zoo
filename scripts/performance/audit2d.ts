/** Audit-only entry, bundled identically for Node and Chrome. No live app hooks. */
import * as core from '../../packages/sim-core/src/index';
import { QuantumWorld2D } from '../../packages/web/src/world/world2d';
import { createWorldPreset2D } from '../../packages/web/src/world/worldPresets2d';
import { MoodRegistry2D } from '../../packages/web/src/world/moodRegistry2d';
import { SimulationPlayback2D } from '../../packages/web/src/simulation2d';
import { createCreatureRenderer2D, fillCreatureDensityPixels2D, creatureColor2D } from '../../packages/web/src/render/creatures2d';
import { createPotentialRenderer2D, fillPotentialPixels2D } from '../../packages/web/src/render/potential2d';
export const dt = 1/120;
export const scenarios = ['two-independent','two-interacting','bell','four-independent','two-pairs'] as const;
export function makeWorld(name: string) {
  const g=core.createPsiGrid2D(), options=createWorldPreset2D(g,'mood');
  const w=new QuantumWorld2D(g,options);
  if(name.includes('four')||name==='two-pairs'||name==='pair-plus-two') {w.addTemplate();w.addTemplate();}
  w.setInteractions({drives:name==='two-interacting'||name==='pair-plus-two',social:name==='two-interacting'||name==='pair-plus-two'});
  if(name==='bell'||name==='two-pairs'||name==='pair-plus-two')w.prepareBellPair('ab','a','b');
  if(name==='two-pairs')w.prepareBellPair('cd','c','d');
  return w;
}
export function summary(samples: number[]) {
  const sorted=[...samples].sort((a,b)=>a-b), at=(p:number)=>sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)]!;
  return {median:at(.5),p95:at(.95),min:sorted[0],max:sorted[sorted.length-1]};
}
const yieldTask=()=>new Promise(r=>setTimeout(r,0));
type Case = {name:string; factory:()=>()=>void; inner?:number};
/** Five batches; every batch starts from fresh deterministic fixtures. Per-operation
 * samples use one call except tiny operations, which use 20/100-call groups. */
export async function benchmarks(browser=false, only='', batchCount=5) {
  const g=core.createPsiGrid2D(), options=createWorldPreset2D(g,'mood'), initial=options.creatures[0]!.psi;
  const terrain=core.verticalBarrier2D(g,6,-.4,.4,.22), zero=new Float64Array(g.nx*g.ny);
  const grid=()=>({...initial,values:initial.values.slice()});
  const cases:Case[]=[
    {name:'cayley.nonzero',factory:()=>{const s=new core.CayleyStepper2D(g),p=grid();return()=>s.step(p,terrain,dt);}},
    {name:'cayley.zero',factory:()=>{const s=new core.CayleyStepper2D(g),p=grid();return()=>s.step(p,zero,dt);}},
    {name:'potential.phase.half',factory:()=>{const s=new core.CayleyStepper2D(g),p=grid();return()=> (s as unknown as {phase:(a:Float64Array,v:Float64Array,t:number)=>void}).phase(p.values,terrain,dt/2);}},
    {name:'observables.moments',factory:()=>{const p=grid();return()=>{core.positionMoments2D(p);};}},
    {name:'observables.norm',factory:()=>{const p=grid();return()=>{core.normSquared2D(p);};}},
    {name:'density.extract',factory:()=>{const p=grid(),out=new Float64Array(g.nx*g.ny);return()=>{core.probabilityDensity2D(p,out);};}},
    {name:'state.copy.256KiB',factory:()=>{const p=grid();return()=>{p.values.slice();};}},
    {name:'candidate.copy.256KiB',factory:()=>{const p=grid(),out=p.values.slice();return()=>{out.set(p.values);};},inner:20},
    {name:'mood.independent',factory:()=>{let q=core.createBasisQubit(0);return()=>{q=core.evolveQubit(q,{ax:.4,ay:0,az:0},dt);};},inner:100},
    {name:'mood.pair',factory:()=>{let q=core.bellMoodState();return()=>{q=core.evolveLocalMood(core.evolveLocalMood(q,'A',.8,dt),'B',.8,dt);};},inner:100},
    {name:'pair.diagnostics',factory:()=>{const r=new MoodRegistry2D();options.creatures.forEach(c=>r.add(c.id,c.mood));r.prepareBell('ab','a','b');return()=>{r.inspectPairs();};},inner:20},
    {name:'creature.inspector',factory:()=>{const r=new MoodRegistry2D();options.creatures.forEach(c=>r.add(c.id,c.mood));return()=>{r.local('a');};},inner:100},
    {name:'potential.compose.two',factory:()=>{const w=makeWorld('two-interacting'),s=w.getSnapshot(),out=s.creatures.map(()=>new Float64Array(g.nx*g.ny)),work=s.creatures.map(()=>core.createInteractionWorkspace2D(g));return()=>s.creatures.forEach((c,i)=>core.composeEffectivePotential2D(g,terrain,c,s.creatures,s.interactions,out[i]!,work[i]!));}},
    ...['two-independent','two-interacting','bell','four-independent','two-pairs','pair-plus-two'].flatMap(name=>[
      {name:`world.${name}`,factory:()=>{const w=makeWorld(name);return()=>w.step(terrain,dt);}},
      {name:`snapshot.${name}`,factory:()=>{const w=makeWorld(name);w.step(terrain,dt);return()=>{w.getSnapshot();};}},
    ]),
    {name:'potential.prepare.interacting',factory:()=>{const w=makeWorld('two-interacting');return()=>w.preparePotentials(terrain);}},
    {name:'potential.prepare.bell',factory:()=>{const w=makeWorld('bell');return()=>w.preparePotentials(terrain);}},
    {name:'pixels.two',factory:()=>{const layers=options.creatures.map(c=>({density:core.probabilityDensity2D(c.psi),color:creatureColor2D(c.id)})),pixels=new Uint8ClampedArray(4*g.nx*g.ny),rgb=new Float64Array(3*g.nx*g.ny);return()=>fillCreatureDensityPixels2D(g,layers,pixels,rgb);}},
    {name:'pixels.four',factory:()=>{const w=makeWorld('four-independent'),layers=w.ids.map(id=>({density:core.probabilityDensity2D(w.spatialState(id)),color:creatureColor2D(id)})),pixels=new Uint8ClampedArray(4*g.nx*g.ny),rgb=new Float64Array(3*g.nx*g.ny);return()=>fillCreatureDensityPixels2D(g,layers,pixels,rgb);}},
    {name:'overlay.pixels',factory:()=>{const pixels=new Uint8ClampedArray(4*g.nx*g.ny);return()=>fillPotentialPixels2D(g,terrain,pixels,20);}},
  ];
  if(browser){
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=520;const ctx=canvas.getContext('2d')!;
    for(const name of ['two-interacting','bell','four-independent','two-pairs'])cases.push({name:`render.${name}`,factory:()=>{const w=makeWorld(name),draw=createCreatureRenderer2D(g,w);return()=>draw(ctx,1000,520,'a',false);}});
    cases.push({name:'canvas.putImageData',factory:()=>{const image=ctx.createImageData(128,128);return()=>ctx.putImageData(image,0,0);}});
    cases.push({name:'canvas.drawImage',factory:()=>{const source=document.createElement('canvas');source.width=128;source.height=128;return()=>ctx.drawImage(source,0,0,520,520);}});
    for(const changed of [false,true])cases.push({name:`overlay.${changed?'changed':'cached'}`,factory:()=>{let rev=0;const draw=createPotentialRenderer2D(g,{get terrainRevision(){return rev;},potentialLimit:20,copyPotential:out=>out.set(terrain)});return()=>{if(changed)rev++;draw.draw(ctx,1000,520,true,.5);};}});
  }
  if(only==='list')return cases.map(c=>c.name);
  const results:Record<string,unknown>={};
  for(const c of cases.filter(c=>!only||c.name===only)){
    const batches:number[][]=[],cold:number[]=[],inner=c.inner??1;
    for(let batch=0;batch<batchCount;batch++){
      const fn=c.factory();let t=performance.now();fn();cold.push(performance.now()-t);
      for(let k=0;k<100;k++)fn();
      const samples:number[]=[];
      for(let k=0;k<40;k++){t=performance.now();for(let j=0;j<inner;j++)fn();samples.push((performance.now()-t)/inner);}
      batches.push(samples);await yieldTask();
    }
    results[c.name]={...summary(batches.flat()),samples:batches.flat(),coldMs:cold,batches:batches.map(summary),samplesPerBatch:40,inner,warmupsPerBatch:100,batchCount};
  }
  return results;
}
/** Controller, render and snapshot counts/times without React. Uses the real
 * production controller and real rAF. Private accumulator read is audit-only. */
export async function playback(name:string, seconds:number) {
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=520;document.body.append(canvas);
  const ctx=canvas.getContext('2d')!;
  let steps=0,frames=0,snapshots=0,densities=0,started=0,finished=0,frameTimes:number[]=[],stepTimes:number[]=[],snapshotTimes:number[]=[],drawTimes:number[]=[],backlogs:number[]=[],discarded=0,lastStamp:number|undefined;
  const render=()=>{
    const t=performance.now();draw(ctx,1000,520,w.selected,false);drawTimes.push(performance.now()-t);frames++;
    if(started)frameTimes.push(performance.now()-started);backlogs.push((controller as unknown as {accumulator:number}).accumulator);
  };
  const controller=new SimulationPlayback2D({request:cb=>requestAnimationFrame(now=>{if(lastStamp!==undefined)discarded+=Math.max(0,(now-lastStamp)/1000-8*dt);lastStamp=now;cb(now);}),cancel:id=>cancelAnimationFrame(id)},()=>{
    // Old captured controller ignores the optional cadence; render here only in
    // that version. Updated controller invokes the same render callback itself.
    if(!(controller as unknown as {presentation?:unknown}).presentation)render();
  },{worldPreset:'mood',presentation:{draw:render,intervalMs:100}});
  const w=controller.world!;if(name.includes('four')||name==='two-pairs'){w.addTemplate();w.addTemplate();}
  w.setInteractions({drives:name==='two-interacting',social:name==='two-interacting'});
  if(name==='bell'||name==='two-pairs')w.prepareBellPair('ab','a','b');if(name==='two-pairs')w.prepareBellPair('cd','c','d');
  // Free terrain, matching the actual default UI; components use a fixed barrier.
  const step=w.step.bind(w);w.step=(v,dt)=>{const t=performance.now();step(v,dt);stepTimes.push(performance.now()-t);steps++;};
  const snapshot=w.getSnapshot.bind(w);w.getSnapshot=()=>{const t=performance.now(),s=snapshot();snapshotTimes.push(performance.now()-t);snapshots++;return s;};
  const density=w.copyDensity.bind(w);w.copyDensity=(id,out)=>{densities++;density(id,out);};
  const draw=createCreatureRenderer2D(controller.psi,w);
  controller.play();await new Promise(r=>setTimeout(r,5000)); // excluded warmup
  const time0=w.time;steps=frames=snapshots=densities=0;frameTimes=[];stepTimes=[];snapshotTimes=[];drawTimes=[];backlogs=[];discarded=0;started=performance.now();
  await new Promise(r=>setTimeout(r,seconds*1000));finished=performance.now();controller.pause();canvas.remove();
  const wall=(finished-started)/1000,physical=w.time-time0,intervals=frameTimes.slice(1).map((x,i)=>x-frameTimes[i]!);
  return {name,wallSeconds:wall,physicalSeconds:physical,ratio:physical/wall,steps,stepsPerSecond:steps/wall,frames,fps:frames/wall,snapshots,densities,stepMs:summary(stepTimes),snapshotMs:summary(snapshotTimes),drawMs:summary(drawTimes),frameIntervalMs:summary(intervals),longFrames50ms:intervals.filter(x=>x>50).length,maxAccumulatorSeconds:Math.max(...backlogs),discardedWallSeconds:discarded,visibility:document.visibilityState};
}
export function phaseBreakdown(name: string) {
  const w=makeWorld(name),g=core.createPsiGrid2D(),v=core.verticalBarrier2D(g,6,-.4,.4,.22);
  const samples:Record<string,number[]>={total:[],potential:[],spatial:[],mood:[]};
  let phase={potential:0,spatial:0,mood:0},counts={potential:0,spatial:0,mood:0};
  const time=(key:keyof typeof phase,fn:()=>void)=>{const t=performance.now();fn();phase[key]+=performance.now()-t;counts[key]++;};
  const prepare=w.preparePotentials.bind(w);w.preparePotentials=t=>time('potential',()=>prepare(t));
  // Audit-only access: wraps methods, never exports or edits amplitude buffers.
  const owned=w as unknown as {members:{stepper:core.CayleyStepper2D}[];moods:MoodRegistry2D};
  for(const c of owned.members){const step=c.stepper.step.bind(c.stepper);c.stepper.step=(p,v,dt)=>time('spatial',()=>step(p,v,dt));}
  const advance=owned.moods.advance.bind(owned.moods);owned.moods.advance=(f,dt)=>time('mood',()=>advance(f,dt));
  for(let k=0;k<100;k++)w.step(v,dt);counts={potential:0,spatial:0,mood:0};
  for(let k=0;k<200;k++){phase={potential:0,spatial:0,mood:0};const t=performance.now();w.step(v,dt);samples.total!.push(performance.now()-t);for(const key of ['potential','spatial','mood'] as const)samples[key]!.push(phase[key]);}
  return {name,steps:200,counts,latencies:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,{...summary(v),batches:Array.from({length:5},(_,i)=>summary(v.slice(40*i,40*i+40)))}]))};
}
export function profileWork() {
  const w=makeWorld('two-interacting'),g=core.createPsiGrid2D(),v=core.verticalBarrier2D(g,6,-.4,.4,.22);
  for(let k=0;k<300;k++){w.step(v,dt);if(k%2===0)w.getSnapshot();}
}
export { core, QuantumWorld2D, createWorldPreset2D, SimulationPlayback2D, fillCreatureDensityPixels2D, creatureColor2D };
