import { expect, it } from 'vitest';
import { bellMoodState, createTwoQubitState, copyTwoQubit, twoQubitNormSquared, validateTwoQubitState, productMoodState, createQubitState, createBasisQubit, reducedMoodDensity, pureMoodDensity, densityBloch, moodPurity, entanglementEntropy, evolveLocalMood, projectLocalMood, measureLocalMood, factorProductMood, commonBasisProbabilities } from '../src';
const close = (a: ArrayLike<number>, b: ArrayLike<number>, tol=3e-14) => { expect(a.length).toBe(b.length); for(let i=0;i<a.length;i++) expect(Math.abs(a[i]!-b[i]!)).toBeLessThan(tol); };
const complex = () => createQubitState({real:.3,imag:-.4},{real:.2,imag:.7});
it('validates, normalizes with scaled arithmetic and copies storage',()=>{
  for (const v of [[], [1,0], Array(8).fill(0), [Infinity,0,0,0,0,0,0,0], [NaN,0,0,0,0,0,0,0]]) expect(()=>createTwoQubitState(v)).toThrow();
  for(const scale of [1e-300,1e300]) close(createTwoQubitState([scale,0,0,scale,0,0,0,0]).amplitudes,[Math.SQRT1_2,0,0,Math.SQRT1_2,0,0,0,0]);
  expect(()=>validateTwoQubitState({amplitudes:new Float64Array(8)})).toThrow();
  const b=bellMoodState(), c=copyTwoQubit(b); c.amplitudes[0]=9; expect(b.amplitudes[0]).toBe(Math.SQRT1_2);
});
it('uses tensor basis ordering and independent complex density reference',()=>{
 for(const a of [0,1] as const) for(const b of [0,1] as const){const expected=Array(8).fill(0);expected[2*(2*a+b)]=1;close(productMoodState(createBasisQubit(a),createBasisQubit(b)).amplitudes,expected);}
 const q=createQubitState({real:1,imag:0},{real:0,imag:1}), d=pureMoodDensity(q);close(d.entries,[.5,0,0,-.5,0,.5,.5,0]);expect(densityBloch(d)).toEqual({x:0,y:d.entries[5]!-d.entries[3]!,z:0});
 const state=bellMoodState(), before=state.amplitudes.slice();expect(()=>measureLocalMood(state,'A','bad' as 'Z',()=>{throw Error('must not draw');})).toThrow(/basis/);expect(state.amplitudes).toEqual(before);
 expect(()=>measureLocalMood(state,'A','Z',()=>1)).toThrow(/sample/);expect(state.amplitudes).toEqual(before);
});
it('prepares all complex Bell entries and correct mixed marginals',()=>{
  const s=bellMoodState(); close(s.amplitudes,[Math.SQRT1_2,0,0,0,0,0,Math.SQRT1_2,0]);
  expect(twoQubitNormSquared(s)).toBeCloseTo(1,14);
  for(const sub of ['A','B'] as const){ const d=reducedMoodDensity(s,sub); close(d.entries,[.5,0,0,0,0,0,.5,0]); expect(moodPurity(d)).toBeCloseTo(.5,14); }
  expect(entanglementEntropy(s)).toBe(1);
  for(const basis of ['Z','X'] as const) close(commonBasisProbabilities(s,basis),[.5,0,0,.5]);
});
it('product marginals, complex signs, positivity, purity and factorization',()=>{
  const a=complex(), b=createQubitState({real:1,imag:2},{real:-3,imag:1}), s=productMoodState(a,b);
  close(reducedMoodDensity(s,'A').entries,pureMoodDensity(a).entries); close(reducedMoodDensity(s,'B').entries,pureMoodDensity(b).entries);
  expect(moodPurity(reducedMoodDensity(s,'A'))).toBeCloseTo(1,14); expect(entanglementEntropy(s)).toBeLessThan(1e-13);
  const [fa,fb]=factorProductMood(s); close(productMoodState(fa,fb).amplitudes,s.amplitudes); expect(()=>factorProductMood(bellMoodState())).toThrow();
  for(const state of [s,bellMoodState(),createTwoQubitState([1,2,3,-1,.5,2,1,4])]) for(const sub of ['A','B'] as const){const d=reducedMoodDensity(state,sub).entries; expect(d[0]!+d[6]!).toBeCloseTo(1,14); close([d[2]!,d[3]!],[d[4]!,-d[5]!]); expect(d[0]!*d[6]!-d[2]!**2-d[3]!**2).toBeGreaterThan(-1e-14);}
});
it('indexes local rotations correctly; identity, analytic phases and reversal',()=>{
  const s=productMoodState(createBasisQubit(0),createBasisQubit(1)), t=.37;
  close(evolveLocalMood(s,'A',0,t).amplitudes,s.amplitudes);
  close(evolveLocalMood(s,'A',2,t).amplitudes,[0,0,Math.cos(t),0,0,0,0,-Math.sin(t)]);
  close(evolveLocalMood(s,'B',2,t).amplitudes,[0,-Math.sin(t),Math.cos(t),0,0,0,0,0]);
  close(evolveLocalMood(evolveLocalMood(s,'B',1.7,t),'B',1.7,-t).amplitudes,s.amplitudes);
});
it('preserves norm, entropy and maximal mixedness for 10000 unequal local rotations',()=>{
  let s=bellMoodState(), maxNorm=0,maxEntropy=0,maxBloch=0;
  for(let k=0;k<10000;k++){ s=evolveLocalMood(evolveLocalMood(s,'A',.7,.013),'B',-1.1,.013); maxNorm=Math.max(maxNorm,Math.abs(twoQubitNormSquared(s)-1)); maxEntropy=Math.max(maxEntropy,Math.abs(entanglementEntropy(s)-1)); const b=densityBloch(reducedMoodDensity(s,'B')); maxBloch=Math.max(maxBloch,Math.hypot(b.x,b.y,b.z)); }
  // @ts-expect-error Test runner provides console; core intentionally has no DOM/Node globals.
  console.log('5D 10000-step invariants',{maxNorm,maxEntropy,maxBloch}); expect(maxNorm).toBeLessThan(2e-11); expect(maxEntropy).toBeLessThan(2e-11); expect(maxBloch).toBeLessThan(2e-11);
  const p=createTwoQubitState([1,2,3,4,5,6,7,8]); expect(entanglementEntropy(evolveLocalMood(p,'A',2,4))).toBeCloseTo(entanglementEntropy(p),13);
});
for(const basis of ['Z','X'] as const) for(const outcome of [0,1] as const) it(`${basis} Bell branch ${outcome} uses Born projection, correlated sequential measurement, idempotence`,()=>{
  let draws=0; const first=measureLocalMood(bellMoodState(),'A',basis,()=>{draws++; return outcome===0?.1:.9;});
  expect(draws).toBe(1); expect(first.outcome).toBe(outcome); expect(first.probability).toBeCloseTo(.5,14); expect(twoQubitNormSquared(first.state)).toBeCloseTo(1,14);
  const second=measureLocalMood(first.state,'B',basis,()=>{throw Error('unnecessary draw');}); expect(second.outcome).toBe(outcome); expect(second.probability).toBeCloseTo(1,14);
  close(second.state.amplitudes,first.state.amplitudes);
  expect(projectLocalMood(first.state,'B',basis=== 'Z'?'X':'Z',0).probability).toBeCloseTo(.5,14);
  if(basis==='Z') close(first.state.amplitudes,outcome===0?[1,0,0,0,0,0,0,0]:[0,0,0,0,0,0,1,0]);
});
for(const basis of ['X','Z'] as const) it(`algebraic non-selective ${basis} channel and conditional Born averaging preserve remote density`,()=>{
  for(const s of [bellMoodState(),createTwoQubitState([1,2,-3,1,2,-1,.5,4]),productMoodState(complex(),complex())]) for(const measured of ['A','B'] as const){
    const remote=measured==='A'?'B':'A', before=reducedMoodDensity(s,remote).entries, average=Array(8).fill(0), channel=Array(32).fill(0);
    for(const o of [0,1] as const){const branch=projectLocalMood(s,measured,basis,o); if(!branch.state)continue; const d=reducedMoodDensity(branch.state,remote).entries,v=branch.state.amplitudes;
      d.forEach((x,i)=>average[i]+=branch.probability*x);
      // Explicit non-selective 4x4 density = sum p |conditional><conditional|.
      for(let r=0;r<4;r++)for(let c=0;c<4;c++){ const k=2*(4*r+c); channel[k]+=branch.probability*(v[2*r]!*v[2*c]!+v[2*r+1]!*v[2*c+1]!); channel[k+1]+=branch.probability*(v[2*r+1]!*v[2*c]!-v[2*r]!*v[2*c+1]!); }
    }
    const trace=Array(8).fill(0), stride=remote==='A'?2:1,other=3-stride;
    for(let r=0;r<2;r++)for(let c=0;c<2;c++)for(let j=0;j<2;j++){const k=2*(4*(r*stride+j*other)+c*stride+j*other),p=2*(2*r+c);trace[p]+=channel[k];trace[p+1]+=channel[k+1];}
    close(average,before); close(trace,before);
  }
});
