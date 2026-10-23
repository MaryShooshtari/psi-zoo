/** Independent CONTINUUM test benchmark, not a second time-evolution solver.
 * Integrate f''=2(V-E)f backward from a pure right-going Jost solution using RK4.
 * Match f=a exp(ikx)+b exp(-ikx) on the left. Equal asymptotic k gives T=1/|a|².
 * This deliberately does NOT import the grid, CN, potential or tridiagonal code.
 */
export function stationaryGaussian(momentum: number, amplitude: number, step = 0.01) {
  const sigma = 0.6, extent = 8, energy = momentum * momentum / 2;
  const count = Math.round(2 * extent / step), h = -2 * extent / count;
  let re = 1, im = 0, dre = 0, dim = momentum;
  const q = (x: number) => 2 * (amplitude * Math.exp(-x * x / (2 * sigma * sigma)) - energy);
  function advance(f: number, g: number, q0: number, qm: number, q1: number): [number, number] {
    const a = g, b = q0 * f;
    const c = g + h * b / 2, d = qm * (f + h * a / 2);
    const e = g + h * d / 2, j = qm * (f + h * c / 2);
    const l = g + h * j, m = q1 * (f + h * e);
    return [f + h / 6 * (a + 2 * c + 2 * e + l), g + h / 6 * (b + 2 * d + 2 * j + m)];
  }
  for (let n = 0; n < count; n++) {
    const x = extent + n * h;
    const q0 = q(x), qm = q(x + h / 2), q1 = q(x + h);
    [re, dre] = advance(re, dre, q0, qm, q1);
    [im, dim] = advance(im, dim, q0, qm, q1);
  }
  // f'/(ik) = dim/k - i*dre/k; global asymptotic phase cancels in moduli.
  const incoming = (re + dim / momentum) ** 2 + (im - dre / momentum) ** 2;
  const reflected = (re - dim / momentum) ** 2 + (im + dre / momentum) ** 2;
  return { transmission: 4 / incoming, reflection: reflected / incoming };
}

/** Stationary probabilities averaged over the incident Gaussian MOMENTUM density,
 * not the monochromatic transmission at its mean energy. Negative-k weight is
 * <1.2e-19 for p0=1.5,sigma=3; the k>3.5 tail is smaller still.
 */
export function stationaryPacketTransmission(amplitude: number, bins = 320, odeStep = 0.01) {
  const p0 = 1.5, sigma = 3, dk = 3.5 / bins;
  let transmission = 0, weight = 0;
  for (let i = 0; i < bins; i++) {
    const k = (i + 0.5) * dk;
    const mass = sigma * Math.sqrt(2 / Math.PI) * Math.exp(-2 * sigma * sigma * (k - p0) ** 2) * dk;
    transmission += mass * stationaryGaussian(k, amplitude, odeStep).transmission;
    weight += mass;
  }
  return { transmission, weight };
}
