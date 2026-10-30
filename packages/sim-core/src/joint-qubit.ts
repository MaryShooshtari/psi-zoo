/** Two mood qubits only. Computational order 00,01,10,11; hbar=1.
 * Constructors own storage. Registry callers must keep their live state private. */
import { createQubitState, validateQubitState, type QubitState, type BlochVector } from './qubit';
export interface TwoQubitState { readonly amplitudes: Float64Array }
export type Subsystem = 'A' | 'B';
export type MoodBasis = 'Z' | 'X';
/** Row-major interleaved complex 2x2 matrix, including both off-diagonal entries. */
export interface MoodDensity { readonly entries: readonly number[] }
export function twoQubitNormSquared(s: TwoQubitState): number {
  if (s.amplitudes.length !== 8 || !s.amplitudes.every(Number.isFinite)) throw new RangeError('Joint state requires eight finite components');
  return s.amplitudes.reduce((n, x) => n + x * x, 0);
}
export function validateTwoQubitState(s: TwoQubitState): void {
  if (Math.abs(twoQubitNormSquared(s) - 1) > 1e-10) throw new RangeError('Joint norm must be within 1e-10 of one');
}
export function createTwoQubitState(values: ArrayLike<number>): TwoQubitState {
  const amplitudes = Float64Array.from(values), s = { amplitudes };
  twoQubitNormSquared(s);
  const scale = Math.max(...amplitudes.map(Math.abs));
  if (scale === 0) throw new RangeError('Zero joint state');
  for (let i = 0; i < 8; i++) amplitudes[i]! /= scale;
  const n = Math.hypot(...amplitudes);
  for (let i = 0; i < 8; i++) amplitudes[i]! /= n;
  return s;
}
export function copyTwoQubit(s: TwoQubitState): TwoQubitState { validateTwoQubitState(s); return { amplitudes: s.amplitudes.slice() }; }
export function bellMoodState(): TwoQubitState { return { amplitudes: new Float64Array([Math.SQRT1_2, 0, 0, 0, 0, 0, Math.SQRT1_2, 0]) }; }
export function productMoodState(a: QubitState, b: QubitState): TwoQubitState {
  validateQubitState(a); validateQubitState(b);
  const v = new Float64Array(8);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const ar = a.values[2*i]!, ai = a.values[2*i+1]!, br = b.values[2*j]!, bi = b.values[2*j+1]!;
    v[2*(2*i+j)] = ar*br-ai*bi; v[2*(2*i+j)+1] = ar*bi+ai*br;
  }
  return { amplitudes: v };
}
function checkSubsystem(sub: Subsystem): number { if (sub !== 'A' && sub !== 'B') throw new RangeError('Invalid subsystem'); return sub === 'A' ? 2 : 1; }
function checkBasis(basis: MoodBasis): void { if (basis !== 'X' && basis !== 'Z') throw new RangeError('Invalid measurement basis'); }
/** Apply a complex 2x2 matrix to one tensor index, not to reconstructed marginals. */
function localMatrix(s: TwoQubitState, sub: Subsystem, m: readonly number[]): TwoQubitState {
  const stride = checkSubsystem(sub), v = s.amplitudes, out = new Float64Array(8);
  for (let k = 0; k < 4; k++) {
    const row = (k & stride) ? 1 : 0, base = k & ~stride;
    for (let col = 0; col < 2; col++) {
      const j = 2*(base+col*stride), p = 2*(2*row+col);
      out[2*k]! += m[p]!*v[j]!-m[p+1]!*v[j+1]!;
      out[2*k+1]! += m[p]!*v[j+1]!+m[p+1]!*v[j]!;
    }
  }
  return { amplitudes: out };
}
export function evolveLocalMood(s: TwoQubitState, sub: Subsystem, omega: number, dt: number): TwoQubitState {
  validateTwoQubitState(s); checkSubsystem(sub);
  const angle = omega / 2 * dt;
  if (![omega, dt, angle].every(Number.isFinite)) throw new RangeError('Invalid local mood phase');
  if (angle === 0) return copyTwoQubit(s);
  const c = Math.cos(angle), t = Math.sin(angle);
  return localMatrix(s, sub, [c,0,0,-t,0,-t,c,0]);
}
export function reducedMoodDensity(s: TwoQubitState, sub: Subsystem): MoodDensity {
  validateTwoQubitState(s); const stride = checkSubsystem(sub), other = 3-stride, v = s.amplitudes, d = new Array<number>(8).fill(0);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) for (let j = 0; j < 2; j++) {
    const a = 2*(r*stride+j*other), b = 2*(c*stride+j*other), p = 2*(2*r+c);
    d[p]! += v[a]!*v[b]!+v[a+1]!*v[b+1]!;
    d[p+1]! += v[a+1]!*v[b]!-v[a]!*v[b+1]!;
  }
  return Object.freeze({ entries: Object.freeze(d) });
}
export function pureMoodDensity(s: QubitState): MoodDensity {
  validateQubitState(s); return reducedMoodDensity(productMoodState(s, { values: new Float64Array([1,0,0,0]) }), 'A');
}
export function densityBloch(d: MoodDensity): BlochVector {
  const v = d.entries;
  return Object.freeze({ x: v[2]!+v[4]!, y: v[5]!-v[3]!, z: v[0]!-v[6]! });
}
export function moodPurity(d: MoodDensity): number {
  const v = d.entries;
  return v[0]!**2 + v[6]!**2 + 2*(v[2]!**2+v[3]!**2);
}
export function entanglementEntropy(s: TwoQubitState): number {
  const b = densityBloch(reducedMoodDensity(s, 'A'));
  // Normalize diagnostic eigenvalues by trace to remove <=1e-10 accepted norm drift.
  const radius = Math.min(1, Math.hypot(b.x,b.y,b.z)/twoQubitNormSquared(s));
  const p = (1-radius)/2;
  return p === 0 ? 0 : -p*Math.log2(p)-(1-p)*Math.log2(1-p);
}
/** Unnormalized projection and its Born weight. Zero branches have no state. */
export function projectLocalMood(s: TwoQubitState, sub: Subsystem, basis: MoodBasis, outcome: 0 | 1): { probability: number; state: TwoQubitState | null } {
  validateTwoQubitState(s); checkSubsystem(sub); checkBasis(basis);
  if (outcome !== 0 && outcome !== 1) throw new RangeError('Invalid outcome');
  const sign = outcome === 0 ? 1 : -1;
  const projected = localMatrix(s, sub, basis === 'Z' ? (outcome === 0 ? [1,0,0,0,0,0,0,0] : [0,0,0,0,0,0,1,0]) : [.5,0,sign*.5,0,sign*.5,0,.5,0]);
  const weight = twoQubitNormSquared(projected), probability = weight/twoQubitNormSquared(s);
  if (weight === 0) return { probability: 0, state: null };
  for (let i = 0; i < 8; i++) projected.amplitudes[i]! /= Math.sqrt(weight);
  return { probability, state: projected };
}
/** Exactly one draw for a genuinely stochastic command; deterministic branches draw none. */
export function measureLocalMood(s: TwoQubitState, sub: Subsystem, basis: MoodBasis, random: () => number) {
  const branches = [projectLocalMood(s,sub,basis,0), projectLocalMood(s,sub,basis,1)] as const;
  let outcome: 0 | 1;
  if (branches[0].probability === 0) outcome = 1;
  else if (branches[1].probability === 0) outcome = 0;
  else { const r = random(); if (!Number.isFinite(r) || r < 0 || r >= 1) throw new RangeError('Random sample must be in [0,1)'); outcome = r < branches[0].probability ? 0 : 1; }
  return { outcome, probability: branches[outcome].probability, state: branches[outcome].state! };
}
/** Rank-one factorization via the largest matrix row. Residual is phase-sensitive.
 * 1e-10 amplitude budget matches state validation and accumulated roundoff. */
export function factorProductMood(s: TwoQubitState): readonly [QubitState, QubitState] {
  validateTwoQubitState(s); const v = s.amplitudes;
  const row = Math.hypot(v[0]!,v[1]!,v[2]!,v[3]!) >= Math.hypot(v[4]!,v[5]!,v[6]!,v[7]!) ? 0 : 1;
  const b = createQubitState({real:v[4*row]!,imag:v[4*row+1]!},{real:v[4*row+2]!,imag:v[4*row+3]!});
  const av = new Float64Array(4);
  for (let i=0;i<2;i++) for(let j=0;j<2;j++) {
    const k=2*(2*i+j), p=2*j;
    av[2*i]! += v[k]!*b.values[p]!+v[k+1]!*b.values[p+1]!;
    av[2*i+1]! += v[k+1]!*b.values[p]!-v[k]!*b.values[p+1]!;
  }
  const a = createQubitState({real:av[0]!,imag:av[1]!},{real:av[2]!,imag:av[3]!});
  const reconstructed = productMoodState(a,b).amplitudes;
  if (Math.hypot(...v.map((x,i)=>x-reconstructed[i]!)) > 1e-10) throw new RangeError('Joint state is not separable within 1e-10 amplitude tolerance');
  return [a,b];
}
export function commonBasisProbabilities(s: TwoQubitState, basis: MoodBasis): readonly number[] {
  return Object.freeze([0,1].flatMap(a => {
    const p = projectLocalMood(s,'A',basis,a as 0|1);
    return [0,1].map(b=>p.state ? p.probability*projectLocalMood(p.state,'B',basis,b as 0|1).probability : 0);
  }));
}
