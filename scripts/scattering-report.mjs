// Development-only headless report. Uses the repository's existing Vite TS loader;
// sim-core itself remains dependency-free. Run: node scripts/scattering-report.mjs
import { createServer } from 'vite';
const server = await createServer({ configFile: false, server: { middlewareMode: true } });
try {
  const core = await server.ssrLoadModule('/packages/sim-core/src/index.ts');
  const benchmark = await server.ssrLoadModule('/packages/sim-core/tests/helpers/stationaryGaussian.ts');
  const config = core.SCATTERING_CONFIG, cache = new Map();
  function run(amplitude = 1.8, dx = 0.1, dt = 0.02, halfExtent = 120) {
    const key = [amplitude, dx, dt, halfExtent].join(',');
    if (!cache.has(key)) cache.set(key, core.runScatteringExperiment({ amplitude, dx, dt, halfExtent }));
    return cache.get(key);
  }
  function summary(result) {
    const window = result.samples.filter(s => s.time >= config.windowStart);
    const final = result.samples.at(-1), n0 = result.samples[0].norm;
    return { initialKineticEnergy: result.initialKineticEnergy,
      R: final.left / n0, T: final.right / n0, interaction: final.interaction / n0,
      maxNormDrift: result.maxNormDrift, maxEnergyDrift: result.maxEnergyDrift,
      maxAccountingError: result.maxAccountingError, maxBoundaryMass: result.maxBoundaryMass,
      windowMaxInteraction: Math.max(...window.map(s => s.interaction)),
      windowRangeR: Math.max(...window.map(s => s.left)) - Math.min(...window.map(s => s.left)),
      windowRangeT: Math.max(...window.map(s => s.right)) - Math.min(...window.map(s => s.right)) };
  }
  const cases = [0, 1.2, 1.8, 5].map(amplitude => ({ amplitude, ...summary(run(amplitude)) }));
  const spatial = [0.2, 0.1, 0.05].map(dx => ({ dx, ...summary(run(1.8, dx, 0.01)) }));
  const spatialRatio = (spatial[0].T - spatial[1].T) / (spatial[1].T - spatial[2].T);
  const extrapolatedT = (4 * spatial[2].T - spatial[1].T) / 3;
  const temporal = [0.04, 0.02, 0.01].map(dt => ({ dt, ...summary(run(1.8, 0.1, dt)) }));
  function distance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.psi.values.length; i++) sum += (a.psi.values[i] - b.psi.values[i]) ** 2;
    return Math.sqrt(a.psi.dx * sum);
  }
  const timeStateDifferences = [distance(run(1.8, 0.1, 0.04), run()), distance(run(), run(1.8, 0.1, 0.01))];
  const mills = z => Math.exp(-z * z / 2) / (Math.sqrt(2 * Math.PI) * z);
  const cutoff = Math.sqrt(2 * config.amplitude), sigmaP = 1 / (2 * config.sigma);
  const overBarrierBound = mills((cutoff - config.momentum) / sigmaP) + mills((cutoff + config.momentum) / sigmaP);
  const contrastRefinement = [1.2, 5].map(amplitude => ({ amplitude,
    fine: summary(run(amplitude, 0.05, 0.02)), stationaryT: benchmark.stationaryPacketTransmission(amplitude).transmission }));
  const stationary = benchmark.stationaryPacketTransmission(1.8);
  const stationaryRefined = benchmark.stationaryPacketTransmission(1.8, 640, 0.005);
  console.log(JSON.stringify({ config, cases, spatial, spatialRatio, extrapolatedT,
    temporal, timeStateDifferences, timeStateRatio: timeStateDifferences[0] / timeStateDifferences[1],
    enlargedDomain: summary(run(1.8, 0.1, 0.02, 160)),
    contrastRefinement, continuumMeanKineticEnergy: (config.momentum ** 2 + sigmaP ** 2) / 2,
    sigmaP, overBarrierBound, stationary, stationaryRefined,
    monochromaticT: benchmark.stationaryGaussian(config.momentum, config.amplitude).transmission }, null, 2));
} finally {
  await server.close();
}
