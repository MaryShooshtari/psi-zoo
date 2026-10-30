import { validatePotential2D, validateState2D, type PsiGrid2D } from './grid2d';

/** Specialized Thomas factorization for I+i*tau*T/2. Unlike the general 1D
 * solver this reuses all buffers and factors across rows, columns and steps.
 * Strict diagonal dominance ensures nonzero pivots; no pivoting is needed.
 */
class CayleyLine {
  private readonly c: Float64Array;
  private readonly inverse: Float64Array;
  private readonly d: Float64Array;
  private coefficient = NaN;
  constructor(private readonly n: number) {
    this.c = new Float64Array(2 * n); this.inverse = new Float64Array(2 * n); this.d = new Float64Array(2 * n);
  }
  prepare(a: number): void {
    if (a === this.coefficient) return;
    // a=tau/(4*h²); main=1+2ia, off=-ia. Restrict extreme scales before overflow.
    if (!Number.isFinite(a) || Math.abs(a) > 1e100) throw new RangeError('Cayley coefficient outside supported finite arithmetic range');
    for (let i = 0; i < this.n; i++) {
      const k = 2 * i;
      const pr = 1 - (i ? a * this.c[k - 1]! : 0);
      const pi = 2 * a + (i ? a * this.c[k - 2]! : 0);
      const denominator = pr * pr + pi * pi;
      const ir = pr / denominator, ii = -pi / denominator;
      this.inverse[k] = ir; this.inverse[k + 1] = ii;
      this.c[k] = a * ii; this.c[k + 1] = -a * ir;
    }
    this.coefficient = a;
  }
  apply(values: Float64Array, start: number, stride: number): void {
    const a = this.coefficient, n = this.n, d = this.d, c = this.c;
    // Read the complete old line into RHS workspace before changing the state.
    for (let i = 0; i < n; i++) {
      const k = start + i * stride, q = 2 * i;
      const nr = (i ? values[k - stride]! : 0) + (i + 1 < n ? values[k + stride]! : 0);
      const ni = (i ? values[k - stride + 1]! : 0) + (i + 1 < n ? values[k + stride + 1]! : 0);
      d[q] = values[k]! + 2 * a * values[k + 1]! - a * ni;
      d[q + 1] = values[k + 1]! - 2 * a * values[k]! + a * nr;
    }
    for (let i = 0; i < n; i++) {
      const q = 2 * i;
      const rr = d[q]! - (i ? a * d[q - 1]! : 0);
      const ri = d[q + 1]! + (i ? a * d[q - 2]! : 0);
      const ir = this.inverse[q]!, ii = this.inverse[q + 1]!;
      d[q] = rr * ir - ri * ii; d[q + 1] = rr * ii + ri * ir;
    }
    for (let i = n - 1; i >= 0; i--) {
      const q = 2 * i, k = start + i * stride;
      if (i + 1 < n) {
        d[q]! -= c[q]! * d[q + 2]! - c[q + 1]! * d[q + 3]!;
        d[q + 1]! -= c[q]! * d[q + 3]! + c[q + 1]! * d[q + 2]!;
      }
      values[k] = d[q]!; values[k + 1] = d[q + 1]!;
    }
  }
}

/** Symmetric Cayley splitting (NOT unsplit 2D Crank–Nicolson).
 * P_V(dt/2) C_x(dt/2) C_y(dt) C_x(dt/2) P_V(dt/2).
 * O(nx*ny) time, 6*(nx+ny) Float64 scratch entries; no per-step grid copies.
 * Mutates amplitudes, never renormalizes; V is frozen for each entire step.
 * Finite negative dt supported. Invalid inputs fail before writing; extreme
 * numerical overflow can fail after writing (the caller must reset that state).
 */
export class CayleyStepper2D {
  private readonly x: CayleyLine;
  private readonly y: CayleyLine;
  constructor(private readonly grid: PsiGrid2D) {
    this.x = new CayleyLine(grid.nx); this.y = new CayleyLine(grid.ny);
  }
  step(g: PsiGrid2D, potential: Float64Array, dt: number): void {
    if (g.nx !== this.grid.nx || g.ny !== this.grid.ny || g.dx !== this.grid.dx || g.dy !== this.grid.dy) throw new RangeError('Stepper grid dimensions/spacings mismatch');
    if (!Number.isFinite(dt)) throw new RangeError('dt must be finite');
    validateState2D(g); validatePotential2D(g, potential);
    if (dt === 0) return;
    this.x.prepare(dt / (8 * g.dx * g.dx)); this.y.prepare(dt / (4 * g.dy * g.dy));
    for (const v of potential) if (!Number.isFinite(v * (dt / 2))) throw new RangeError('Potential phase overflow');
    this.phase(g.values, potential, dt / 2);
    for (let j = 0; j < g.ny; j++) this.x.apply(g.values, 2 * j * g.nx, 2);
    for (let i = 0; i < g.nx; i++) this.y.apply(g.values, 2 * i, 2 * g.nx);
    for (let j = 0; j < g.ny; j++) this.x.apply(g.values, 2 * j * g.nx, 2);
    this.phase(g.values, potential, dt / 2);
    validateState2D(g);
  }
  private phase(values: Float64Array, potential: Float64Array, tau: number): void {
    for (let k = 0; k < potential.length; k++) {
      const angle = potential[k]! * tau;
      if (angle === 0) continue;
      const c = Math.cos(angle), s = Math.sin(angle), r = values[2 * k]!, im = values[2 * k + 1]!;
      values[2 * k] = c * r + s * im; values[2 * k + 1] = c * im - s * r;
    }
  }
}
