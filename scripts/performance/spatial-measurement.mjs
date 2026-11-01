// Production-bundled detector + actual shared UI executor audit. No dependency,
// shipped switch, replacement detector, grid/dt change or implicit sample reduction.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { cpus, release } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const stats = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: sorted.length, median: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1], maximum: sorted.at(-1), minimum: sorted[0] };
};

function heapCensus(text) {
  const heap = JSON.parse(text), meta = heap.snapshot.meta, fields = meta.node_fields, edgeFields = meta.edge_fields;
  const width = fields.length, edgeWidth = edgeFields.length, nodes = heap.nodes, edges = heap.edges, strings = heap.strings;
  const nameField = fields.indexOf('name'), sizeField = fields.indexOf('self_size'), countField = fields.indexOf('edge_count'), idField = fields.indexOf('id');
  const edgeType = edgeFields.indexOf('type'), edgeName = edgeFields.indexOf('name_or_index'), edgeTo = edgeFields.indexOf('to_node');
  const types = meta.edge_types[edgeType], floatNodes = new Map(), receipts = [], owners = new Map();
  let backingBytes = 0, candidateSizedBackingStores = 0, floatSelfBytes = 0, cursor = 0;
  for (let n = 0; n < nodes.length; n += width) {
    const name = strings[nodes[n + nameField]], size = nodes[n + sizeField];
    if (name === 'Float64Array' && meta.node_types[0][nodes[n]] === 'object') { floatNodes.set(n, { id: nodes[n + idField], retainedBy: [] }); floatSelfBytes += size; }
    if (name.includes('JSArrayBufferData')) { backingBytes += size; if (size === 128 * 128 * 2 * 8) candidateSizedBackingStores++; }
    for (let j = 0; j < nodes[n + countField]; j++, cursor += edgeWidth) {
      const type = types[edges[cursor + edgeType]], edge = type === 'element' || type === 'hidden' ? edges[cursor + edgeName] : strings[edges[cursor + edgeName]], target = edges[cursor + edgeTo];
      if (type === 'property' && edge === 'kind' && strings[nodes[target + nameField]] === 'spatial-measurement') receipts.push(nodes[n + idField]);
    }
  }
  cursor = 0;
  for (let n = 0; n < nodes.length; n += width) for (let j = 0; j < nodes[n + countField]; j++, cursor += edgeWidth) {
    const target = edges[cursor + edgeTo], float = floatNodes.get(target), type = types[edges[cursor + edgeType]];
    if (!float || type === 'weak') continue;
    const edge = type === 'element' || type === 'hidden' ? edges[cursor + edgeName] : strings[edges[cursor + edgeName]];
    if (float.retainedBy.length < 8) float.retainedBy.push({ ownerId: nodes[n + idField], owner: strings[nodes[n + nameField]], edge });
  }
  return { float64Count: floatNodes.size, floatSelfBytes, backingBytes, candidateSizedBackingStores, receiptCount: new Set(receipts).size, floats: [...floatNodes.values()] };
}

export async function measureSpatialActions({ evaluate, send, check, retry, sleep, out, onEvent }) {
  const environment = { date: new Date().toISOString(), node: process.version, browser: await send('Browser.getVersion'), os: release(), cpus: cpus(),
    grid: { nx: 128, ny: 128, bounds: [-10, 10], dx: 20 / 129, dy: 20 / 129, dt: 1 / 120, hbar: 1, mass: 1, boundaries: 'unstored zero Dirichlet' },
    cold: 'Five first detector calls in five newly navigated documents per condition. Shared browser/process/HTTP/code caches are not claimed cold.',
    warm: '20 unmeasured explicit warmup actions followed by 200 individual live-state actions per condition. No fixture restoration inside timed regions.',
    handler: 'Production run(request): request capture, ordered guards, detector, commit, synchronous snapshot/publication/draw and React update enqueue. React DOM/compositor completion is not included in synchronous time.',
    paint: 'Double-rAF result-to-render-opportunity proxy, NOT exact visible-pixel latency. Per-condition separate trace actions with user-timing markers are excluded from budget samples.',
    viewports: { width: 1366, height: 768, dpr: 1, actualBrowserZoom: 'not measured' }, budgets: { warmCoreP95Ms: 16.7, warmHandlerP95StrictlyBelowMs: 50 },
  };
  const sourceHashes = [];
  const hashTree = async path => { for (const entry of await readdir(path, { withFileTypes: true })) {
    if (['node_modules', 'dist'].includes(entry.name)) continue;
    const file = path + '/' + entry.name;
    if (entry.isDirectory()) await hashTree(file);
    else if (/\.(ts|tsx|css|md|json|html)$/.test(file)) sourceHashes.push({ path: file, sha256: createHash('sha256').update(await readFile(file)).digest('hex') });
  } };
  await hashTree('packages');
  for (const path of ['package.json', 'package-lock.json', 'scripts/projection-browser-check.mjs', 'scripts/performance/spatial-measurement.mjs']) sourceHashes.push({ path, sha256: createHash('sha256').update(await readFile(path)).digest('hex') });
  await writeFile(join(out, 'source-hashes.json'), JSON.stringify(sourceHashes, null, 2));
  await writeFile(join(out, 'latency-environment.json'), JSON.stringify(environment, null, 2));
  await send('Performance.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent===t);
    try{localStorage.setItem('psi-zoo-guide-v1','done');}catch{}
    window.__lastSpatialCore=null;window.__spatialCoreSample=ms=>{window.__lastSpatialCore=ms;};
    window.__spatialLongTasks=[];new PerformanceObserver(list=>{for(const e of list.getEntries())__spatialLongTasks.push({start:e.startTime,duration:e.duration,name:e.name});}).observe({type:'longtask',buffered:true});
    window.__reactionTimers=new Set();window.__maxReactionTimers=0;
    const originalSetTimeout=window.setTimeout.bind(window),originalClearTimeout=window.clearTimeout.bind(window);
    window.setTimeout=(fn,delay,...args)=>{let id;id=originalSetTimeout(()=>{__reactionTimers.delete(id);fn(...args);},delay);if(delay===600){__reactionTimers.add(id);__maxReactionTimers=Math.max(__maxReactionTimers,__reactionTimers.size);}return id;};
    window.clearTimeout=id=>{__reactionTimers.delete(id);originalClearTimeout(id);};
  ` });
  let navigation = 0;
  const fresh = async condition => {
    const nav = await send('Page.navigate', { url: `http://127.0.0.1:5191/?spatial-latency=${++navigation}` });
    await retry(() => evaluate(`!!window.__actions && !!document.querySelector('.world-inspector') && !button('Play').disabled`));
    await evaluate(`(()=>{const a=__actions;const run=command=>a.run(a.request(command));run({kind:'preset',preset:'independent'});${condition.roster === 1 ? "run({kind:'remove',targetId:'b'});" : condition.roster === 4 ? "run({kind:'add'});run({kind:'add'});" : ''}button('${condition.axes === 'x' ? '1D view' : '2D view'}').click();return null;})()`);
    await retry(() => evaluate(`document.querySelector('main').dataset.morphing==='false'&&__actions.owner.token.view==='${condition.axes === 'x' ? '1d' : '2d'}'`));
    if (condition.playing) { await evaluate(`button('Play').click()`); await retry(() => evaluate('__controller.world.time>0')); }
    await evaluate(`window.__sampleOrdinal=0;window.__spatialLongTasks=[];null`);
    const context = await evaluate(`({timeOrigin:performance.timeOrigin,roster:__controller.world.ids.length,playing:__controller.playing,draws:__controller.world.getSnapshot().spatialDrawCount,view:__actions.owner.token.view,canvas:(()=>{const c=document.querySelector('${condition.axes === 'x' ? '.projection-1d' : '.density-2d'}');return{width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight};})()})`);
    assert.equal(context.roster, condition.roster); assert.equal(context.playing, condition.playing); assert.equal(context.draws, 0);
    return { loaderId: nav.loaderId, ...context };
  };
  const sample = (condition, trace = false) => evaluate(`(async()=>{
    const a=__actions,c=__controller,ids=c.world.ids,id=ids[__sampleOrdinal++%ids.length],before=c.world.spatialDraws;
    const serial=__sampleOrdinal;${trace ? "performance.mark('spatial-sync-start-'+serial);" : ''}
    __lastSpatialCore=null;const start=performance.now();
    const result=a.run(a.request({kind:'spatial',targetId:id,axes:'${condition.axes}',resolution:${condition.sigma}}));
    const end=performance.now(),coreMs=__lastSpatialCore;
    ${trace ? "performance.mark('spatial-sync-end-'+serial);performance.measure('spatial-synchronous-action','spatial-sync-start-'+serial,'spatial-sync-end-'+serial);" : ''}
    if(result.status!=='applied'||result.publication!=='published'||!Number.isFinite(coreMs))throw Error('Invalid measured action: '+JSON.stringify(result));
    const draws=c.world.spatialDraws-before;if(draws!==${condition.axes === 'x' ? 1 : 2})throw Error('Wrong measured draw count');
    return await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({coreMs,handlerMs:end-start,paintOpportunityMs:performance.now()-end,start,end,draws,sequence:result.receipt.sequence,targetId:id,playing:c.playing}))));
  })()`);
  const trace = async (name, work) => {
    let complete; const ready = new Promise(resolve => { complete = resolve; }); onEvent('Tracing.tracingComplete', complete);
    await send('Tracing.start', { categories: 'toplevel,devtools.timeline,blink.user_timing,v8.execute,disabled-by-default-v8.cpu_profiler', options: 'sampling-frequency=1000', transferMode: 'ReturnAsStream' });
    await work(); await send('Tracing.end'); const { stream } = await ready; const chunks = [];
    while (true) { const chunk = await send('IO.read', { handle: stream }); chunks.push(chunk.data); if (chunk.eof) break; }
    await send('IO.close', { handle: stream }); const text = chunks.join(''); await writeFile(join(out, name), text);
    const events = JSON.parse(text).traceEvents;
    const starts = events.filter(e => e.name?.startsWith('spatial-sync-start-')), ends = events.filter(e => e.name?.startsWith('spatial-sync-end-'));
    const sync = starts.map(start => ({ start: start.ts, end: ends.find(end => end.name.replace('end', 'start') === start.name)?.ts })).filter(s => s.end !== undefined);
    const longTasks = events.filter(e => e.ph === 'X' && e.dur >= 50000 && /RunTask|ThreadControllerImpl::RunTask/.test(e.name) && (!starts.length || e.pid === starts[0].pid && e.tid === starts[0].tid));
    return { file: name, events: events.length, markedActions: sync.length, longTasks: longTasks.map(task => ({ name: task.name, durationMs: task.dur / 1000, overlapsSynchronousAction: sync.some(s => s.start < task.ts + task.dur && s.end > task.ts) })) };
  };
  const populations = [];
  for (const axes of ['x', 'xy']) for (const roster of [1, 2, 4]) for (const playing of [false, true]) for (const sigma of [.2, .4, 2]) {
    const condition = { axes, roster, playing, sigma }, label = `${axes}-${roster}-${playing ? 'running' : 'paused'}-sigma${sigma}`, cold = [];
    for (let i = 0; i < 5; i++) { const context = await fresh(condition); cold.push({ context, sample: await sample(condition) }); }
    for (let i = 0; i < 20; i++) await sample(condition);
    const warmed = []; for (let i = 0; i < 200; i++) warmed.push(await sample(condition));
    const longTasks = await evaluate('window.__spatialLongTasks'), traced = [];
    const traceEvidence = await trace(label + '-trace.json', async () => { for (let i = 0; i < 5; i++) traced.push(await sample(condition, true)); });
    const summary = { core: stats(warmed.map(s => s.coreMs)), handler: stats(warmed.map(s => s.handlerMs)), paintOpportunity: stats(warmed.map(s => s.paintOpportunityMs)),
      coldCore: stats(cold.map(s => s.sample.coreMs)), coldHandler: stats(cold.map(s => s.sample.handlerMs)), coldPaintOpportunity: stats(cold.map(s => s.sample.paintOpportunityMs)) };
    const passes = summary.core.p95 <= 16.7 && summary.handler.p95 < 50;
    const population = { condition, label, cold, warmups: 20, warmed, summary, passes, longTasks, traced, traceEvidence };
    populations.push(population); await writeFile(join(out, label + '.json'), JSON.stringify(population, null, 2));
    await writeFile(join(out, 'latency-populations.json'), JSON.stringify({ environment, populations }, null, 2));
    console.log('LATENCY', label, 'core p95', summary.core.p95.toFixed(3), 'handler p95', summary.handler.p95.toFixed(3), passes ? 'PASS' : 'FAIL');
  }
  assert.equal(populations.length, 36); assert.equal(new Set(populations.flatMap(p => p.cold.map(c => c.context.loaderId))).size, 180);
  assert.equal(populations.reduce((n, p) => n + p.warmed.length, 0), 7200);

  // Separate retention phase: realistic individual tasks/React commits, not 200
  // queued state updates retained in one artificial synchronous mega-task.
  const memoryCondition = { axes: 'xy', roster: 2, playing: false, sigma: .4 };
  await fresh(memoryCondition); for (let i = 0; i < 20; i++) await sample(memoryCondition);
  await send('HeapProfiler.enable'); const memory = [];
  const census = async label => {
    assert.equal(await evaluate('__actions.reaction()===null&&__reactionTimers.size===0'), true, 'Reduced-motion memory phase has no transient reaction');
    await send('HeapProfiler.collectGarbage');
    const chunks = []; onEvent('HeapProfiler.addHeapSnapshotChunk', part => chunks.push(part.chunk));
    await send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
    const text = chunks.join(''); await writeFile(join(out, label + '.heapsnapshot'), text);
    const summary = heapCensus(text), metrics = await send('Performance.getMetrics');
    const state = await evaluate(`({sequence:__controller.world.lastAction.sequence,draws:__controller.world.getSnapshot().spatialDrawCount,reaction:__actions.reaction(),pending600:__reactionTimers.size,heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null})`);
    const result = { label, ...summary, metrics, state }; memory.push(result); await writeFile(join(out, 'memory.json'), JSON.stringify(memory, null, 2)); console.log('MEMORY', label, summary.float64Count, summary.backingBytes, summary.receiptCount);
  };
  await census('memory-baseline');
  for (let batch = 1; batch <= 5; batch++) { for (let i = 0; i < 200; i++) await sample(memoryCondition); await census('memory-batch-' + batch); }
  const baseline = memory[0], memoryPass = memory.every(m => m.float64Count === baseline.float64Count && m.candidateSizedBackingStores === baseline.candidateSizedBackingStores && m.receiptCount <= baseline.receiptCount + 2 && m.state.reaction === null && m.state.pending600 === 0);
  await send('Emulation.setEmulatedMedia', { features: [] }); await sleep(50);
  await evaluate(`(()=>{for(let i=0;i<50;i++)__actions.run(__actions.request({kind:'spatial',targetId:'a',axes:'xy',resolution:.4}));return null;})()`);
  const reactionPeak = await evaluate('__maxReactionTimers'); await sleep(700);
  const reactionCleared = await evaluate('__reactionTimers.size===0&&__actions.reaction()===null');
  assert.ok(reactionPeak <= 1 && reactionCleared, 'At most one reaction timeout; paused expiry clears it');

  const noActionStart = await evaluate('__spatialCoreCalls||0');
  const noActionTrace = await trace('no-action-10s-trace.json', async () => {
    await evaluate(`button('Play').click()`);
    for (let i = 0; i < 20; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 650 + i % 2, y: 350 }); await sleep(500); }
    await evaluate(`button('Pause').click()`);
  });
  const noActionCalls = await evaluate(`(__spatialCoreCalls||0)-${noActionStart}`);
  const verdict = { populations: 36, freshColdDocuments: 180, warmedActions: 7200, warmups: 720, perConditionLatencyPassed: populations.every(p => p.passes),
    memoryPassed: memoryPass, memoryBatches: 5, actionsPerMemoryBatch: 200, reactionPeak, reactionCleared, noActionCalls, noActionTrace,
    traceInvestigations: populations.filter(p => p.traceEvidence.longTasks.some(t => t.overlapsSynchronousAction)).map(p => ({ condition: p.condition, trace: p.traceEvidence.file, longTasks: p.traceEvidence.longTasks })),
    limits: ['Heap counts and saved immediate strong retainers are bounded-run evidence, not a universal heap-byte threshold or proof against all leaks.', 'Matched throughput/sustained acceptance and real devices/AT/browser zoom remain separate.', 'Trace samples are separate from budget populations; overlap flags require CPU/source-map investigation, not automatic causal blame.'] };
  await writeFile(join(out, 'verdict.json'), JSON.stringify(verdict, null, 2));
  const lines = ['# Spatial action latency and retention', '', 'Every population is evaluated separately. Double-rAF is a render-opportunity proxy, not exact visible pixels.', '', '| Condition | Core warm p95 ms | Handler warm p95 ms | Proxy warm p95 ms | Cold handler max ms | Verdict |', '| --- | ---: | ---: | ---: | ---: | --- |',
    ...populations.map(p => `| ${p.label} | ${p.summary.core.p95.toFixed(3)} | ${p.summary.handler.p95.toFixed(3)} | ${p.summary.paintOpportunity.p95.toFixed(3)} | ${p.summary.coldHandler.maximum.toFixed(3)} | ${p.passes ? 'Pass' : 'FAIL'} |`), '', 'Raw cold/warm/trace samples, source maps and heap snapshots are adjacent. No pooled pass/fail. See verdict.json for retention/trace limits and further review.', '', JSON.stringify(verdict, null, 2)];
  await writeFile(join(out, 'LATENCY.md'), lines.join('\n'));
  check('All 36 warm latency populations independently meet both approved p95 budgets', verdict.perConditionLatencyPassed);
  check('Five retained-memory batches show no growing Float64/candidate-buffer or receipt collection', memoryPass);
  check('A ten-second no-action play/hover/draw trace invokes no detector', noActionCalls === 0);
  console.log('LATENCY EVIDENCE', out);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--out' || !args[1]) throw Error('Usage: node scripts/performance/spatial-measurement.mjs --out NEW_EXTERNAL_DIRECTORY');
  globalThis.__spatialMeasurementRunner = measureSpatialActions;
  process.argv.push('--spatial-latency');
  await import('../projection-browser-check.mjs');
}
