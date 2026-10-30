import { expect, it } from 'vitest';
import { SimulationPlayback2D, type Snapshot2D } from './simulation2d';
import { createPsiGrid2D, positionMoments2D } from '@psi-zoo/sim-core';
import { QuantumWorld2D } from './world/world2d';
import { createWorldPreset2D } from './world/worldPresets2d';
import { fillCreatureDensityPixels2D, creatureColor2D } from './render/creatures2d';
import { densityBrightness2D } from './render/density2d';
it('presentation cadence avoids intermediate snapshots without skipping physics or drawing',()=>{
 const callbacks=new Map<number,(t:number)=>void>(), snapshots:Snapshot2D[]=[];let id=0,draws=0;
 const c=new SimulationPlayback2D({request:fn=>{callbacks.set(++id,fn);return id;},cancel:id=>{callbacks.delete(id);}},s=>snapshots.push(s),{grid:{nx:16,ny:13},worldPreset:'bell',presentation:{intervalMs:100,draw:()=>{draws++;}}});
 const reference=new SimulationPlayback2D({request:()=>0,cancel:()=>{}},()=>{},{grid:{nx:16,ny:13},worldPreset:'bell'});
 c.play();for(let k=0;k<=60;k++){const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(k*1000/60));}
 for(let k=0;k<120;k++)reference.world!.step(new Float64Array(16*13),1/120);
 expect(c.world!.time).toBe(reference.world!.time);expect(c.world!.spatialState('a').values).toEqual(reference.world!.spatialState('a').values);
 expect(draws).toBe(62);expect(snapshots.length).toBeLessThanOrEqual(12);expect(snapshots.at(-1)!.time).toBeLessThanOrEqual(c.world!.time);
 c.reset();expect(snapshots.at(-1)!.time).toBe(0);expect(snapshots.at(-1)!.world!.pairs[0]!.entropy).toBe(1);c.dispose();expect(callbacks.size).toBe(0);
 for(const intervalMs of [-1,NaN,Infinity])expect(()=>new SimulationPlayback2D({request:()=>0,cancel:()=>{}},()=>{},{presentation:{draw:()=>{},intervalMs}})).toThrow();
});
it('cached spatial diagnostics remain current through commit/reset/selection/preparation/removal and copies remain defensive',()=>{
 const g=createPsiGrid2D({nx:24,ny:21}),w=new QuantumWorld2D(g,createWorldPreset2D(g,'mood')),v=new Float64Array(g.nx*g.ny);
 const check=()=>{for(const c of w.getSnapshot().creatures){const m=positionMoments2D(w.spatialState(c.id));expect([c.x,c.y,c.norm,c.sigmaX,c.sigmaY]).toEqual([m.x,m.y,m.norm,m.sigmaX,m.sigmaY]);}};
 check();const before=w.getSnapshot();expect(w.getSnapshot()).toEqual(before);const copy=w.state('a');copy.psi.values.fill(0);check();
 for(let k=0;k<20;k++){w.step(v,1/120);check();}w.select('b');w.setInteractions({social:true});check();w.prepareBellPair('ab','a','b');check();w.measureMood('ab','a','X');check();w.measureAndRelease('ab','Z');check();w.addTemplate();check();w.remove('c');check();w.resetEvolution();check();
 const saved=w.spatialState('a').values;v[0]=NaN;expect(()=>w.step(v,.01)).toThrow();expect(w.spatialState('a').values).toEqual(saved);check();
});
it('layer-major mapping matches the original scalar pixel formula bit for bit, without per-layer clipping',()=>{
 const g=createPsiGrid2D({nx:31,ny:27}),cells=g.nx*g.ny,rgb=new Float64Array(3*cells),pixels=new Uint8ClampedArray(4*cells);let seed=42;
 for(let count=0;count<=4;count++){
  const layers=Array.from({length:count},(_,n)=>({density:Float64Array.from({length:cells},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32*.8;}),color:creatureColor2D('abcd'[n]!)}));
  const expected=new Uint8ClampedArray(4*cells);for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){const k=j*g.nx+i,p=4*((g.ny-j-1)*g.nx+i);let r=8,green=14,b=25;for(const layer of layers){const f=densityBrightness2D(layer.density[k]!);r+=(layer.color[0]!-8)*f;green+=(layer.color[1]!-14)*f;b+=(layer.color[2]!-25)*f;}expected[p]=r;expected[p+1]=green;expected[p+2]=b;expected[p+3]=255;}
  fillCreatureDensityPixels2D(g,layers,pixels,rgb);expect(pixels).toEqual(expected);
 }
 expect(()=>fillCreatureDensityPixels2D(g,[],pixels,new Float64Array(1))).toThrow();
});
