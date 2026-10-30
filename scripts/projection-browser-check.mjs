// 5E.2 actual production UI acceptance. Audit-only registration never enters
// shipped source. Explicit full-state copies happen only at test checkpoints.
import { build } from 'vite';
import MagicString from 'magic-string';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const out = await mkdtemp(join(tmpdir(), 'psi-projection-check-'));
await build({ root: resolve('packages/web'), configFile: resolve('packages/web/vite.config.ts'), plugins: [{ name: 'projection-check-only', enforce: 'pre', transform(code, id) {
  const edit = new MagicString(code);
  if (id.replaceAll('\\', '/').endsWith('/src/simulation2d.ts')) {
    const needle = 'if (options.worldPreset) this.worldModel = new QuantumWorld2D(this.psi, createWorldPreset2D(this.psi, options.worldPreset));';
    assert.ok(code.includes(needle)); edit.appendLeft(code.indexOf(needle) + needle.length, ' globalThis.__projectionCheck?.register(this);');
  } else if (id.replaceAll('\\', '/').endsWith('/src/Gaussian2DDemo.tsx')) {
    const needle = 'const render = createDensityRenderer2D(controller.psi), overlay = createPotentialRenderer2D(controller.psi, controller);';
    assert.ok(code.includes(needle)); edit.appendLeft(code.indexOf(needle) + needle.length, ' globalThis.__projectionCheck?.renderer(createProjectionRenderer, createCreatureRenderer2D, createPotentialRenderer2D, createCreatureDecoration);');
  } else return;
  return { code: edit.toString(), map: edit.generateMap({ hires: true }) };
} }], build: { outDir: join(out, 'ui'), emptyOutDir: true } });
const server = createServer(async (req, res) => {
  try { const path = join(out, 'ui', req.url === '/' ? 'index.html' : req.url.split('?')[0]); res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[extname(path)] || 'application/octet-stream'); res.end(await readFile(path)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(5191, '127.0.0.1', r));
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9231', `--user-data-dir=${join(out, 'profile')}`, '--window-size=1366,768', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function retry(fn) { for (let i = 0; i < 250; i++) { try { const r = await fn(); if (r) return r; } catch {} await sleep(100); } throw Error('Projection browser readiness timeout'); }
let socket; let checks = 0; const errors = [];
try {
  const page = await retry(async () => (await (await fetch('http://127.0.0.1:9231/json/list')).json()).find(p => p.type === 'page'));
  socket = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => socket.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  socket.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params); });
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const check = (name, result) => { assert.ok(result, name); checks++; console.log('PASS', name); };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__registrations=0;window.__projectionCheck={register(c){window.__controller=c;__registrations++;},renderer(f,creatures,potential,decoration){window.__renderProjection=f;window.__renderField=creatures;window.__renderTerrain=potential;window.__renderDecoration=decoration;}};` });
  await send('Page.navigate', { url: 'http://127.0.0.1:5191' });
  await retry(() => evaluate(`!!document.querySelector('.world-inspector') && !!__controller?.world`));
  await evaluate(`window.button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent===t);
    window.bytesEqual=(a,b)=>a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
    window.capture=()=>{const c=__controller,w=c.world;return {controller:c,world:w,spatial:w.ids.map(id=>w.spatialState(id).values),terrain:c.potential,time:w.time,playing:c.playing,snapshot:JSON.stringify(w.getSnapshot()),owners:JSON.stringify([...w.moods.owners].map(([id,o])=>[id,o.kind,o.kind==='independent'?[...o.state.values]:[o.pairId,o.subsystem]])),pairs:[...w.moods.pairs].map(([id,p])=>[id,p.state.amplitudes.slice()])};};
    window.same=s=>{const n=capture();return s.controller===n.controller&&s.world===n.world&&s.time===n.time&&s.playing===n.playing&&s.snapshot===n.snapshot&&s.owners===n.owners&&s.spatial.every((a,i)=>bytesEqual(a,n.spatial[i]))&&bytesEqual(s.terrain,n.terrain)&&s.pairs.length===n.pairs.length&&s.pairs.every(([id,a],i)=>id===n.pairs[i][0]&&bytesEqual(a,n.pairs[i][1]));};
    window.stable=()=>document.querySelector('main').dataset.morphing==='false';
    window.fieldCurrent=()=>{const actual=document.querySelector('.density-2d'),expected=document.createElement('canvas');expected.width=actual.width;expected.height=actual.height;const ctx=expected.getContext('2d');ctx.setTransform(actual.width/actual.clientWidth,0,0,actual.height/actual.clientHeight,0,0);__renderField(__controller.psi,__controller.world)(ctx,actual.clientWidth,actual.clientHeight,__controller.world.selected,false);__renderTerrain(__controller.psi,__controller).draw(ctx,actual.clientWidth,actual.clientHeight,true,.6);return actual.toDataURL()===expected.toDataURL();};
    window.projectionCurrent=()=>{const actual=document.querySelector('.projection-1d'), expected=document.createElement('canvas');expected.width=actual.width;expected.height=actual.height;const ctx=expected.getContext('2d');ctx.setTransform(actual.width/actual.clientWidth,0,0,actual.height/actual.clientHeight,0,0);__renderProjection(__controller.psi,__controller.world,__controller)(ctx,actual.clientWidth,actual.clientHeight,__controller.world.selected,false,true,.6);return actual.toDataURL()===expected.toDataURL();};`);
  // Raw-density pixel regressions intentionally hide optional UI overlays.
  // The 5E.3 extension below re-enables and validates them independently.
  await evaluate(`document.querySelector('input[aria-label="Show creature decorations"]')?.click()`);
  check('Default owns one controller/world and exposes projected view buttons', await evaluate(`__registrations===1&&button('2D view').getAttribute('aria-pressed')==='true'&&button('1D view').getAttribute('aria-pressed')==='false'`));
  await evaluate(`window.saved=capture();button('1D view').click()`); await sleep(120);
  check('Mirror tilt is active while paused, without touching physics', await evaluate(`document.querySelector('main').dataset.morphing==='true'&&getComputedStyle(document.querySelector('.terrain-canvas-wrap')).transform!=='none'&&same(saved)`));
  await retry(() => evaluate(`stable()`));
  check('Paused projection preserves every spatial/mood/terrain byte and time', await evaluate(`same(saved)&&__registrations===1&&document.querySelector('.terrain-canvas-wrap').getAttribute('aria-hidden')==='true'&&button('1D view').getAttribute('aria-pressed')==='true'`));
  check('Destination renders latest world and labels the marginal/terrain distinction', await evaluate(`projectionCurrent()&&document.querySelector('.view-explanation').textContent.includes('still 2D')&&document.querySelector('.projection-1d').getAttribute('aria-label').includes('Average terrain along y')`));
  for (const [width, height] of [[1920,1080],[1440,900],[1366,768],[1280,720],[1024,600]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); await sleep(100);
    check(`${width}x${height}: wide projected field fits stationary document`, await evaluate(`document.scrollingElement.scrollHeight===innerHeight&&document.scrollingElement.scrollWidth===innerWidth&&document.querySelector('.projection-1d').clientWidth>document.querySelector('.projection-1d').clientHeight&&projectionCurrent()&&same(saved)`));
  }
  for (let i = 0; i < 9; i++) { await evaluate(`button('${i % 2 ? '1D view' : '2D view'}').click()`); await sleep(45); }
  await evaluate(`button('1D view').click()`); await retry(() => evaluate(`stable()`));
  check('Rapid reversals settle to latest requested live view with one controller', await evaluate(`same(saved)&&projectionCurrent()&&__registrations===1&&button('1D view').getAttribute('aria-pressed')==='true'`));
  await evaluate(`button('2D view').click()`); await retry(() => evaluate(`stable()`));
  // Paint off center, then compare canonical terrain projected from that same world.
  await evaluate(`document.querySelector('[name="terrain-tool"][value="well"]').click()`);
  const point = await evaluate(`(()=>{const r=document.querySelector('.density-2d').getBoundingClientRect();return{x:r.x+r.width*.6,y:r.y+r.height*.4}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  await retry(() => evaluate(`__controller.terrainRevision>0`));
  await evaluate(`window.saved=capture();button('1D view').click()`); await retry(() => evaluate(`stable()`));
  check('Edited signed terrain projects from canonical shared V with unchanged psi/time', await evaluate(`same(saved)&&projectionCurrent()&&__controller.potential.some(v=>v<0)`));
  const projectedPoint = await evaluate(`(()=>{const r=document.querySelector('.projection-1d').getBoundingClientRect();return{x:r.x+r.width*.5,y:r.y+r.height*.5}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...projectedPoint, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...projectedPoint, button: 'left', clickCount: 1 });
  check('Projected canvas click only selects, neither paints nor measures', await evaluate(`(()=>{const expected=JSON.parse(saved.snapshot);expected.selected=__controller.world.selected;saved.snapshot=JSON.stringify(expected);return same(saved);})()`));
  await evaluate(`button('World: entangled friendship').click()`); await sleep(100);
  await evaluate(`window.saved=capture();window.rngDraws=0;const random=__controller.world.moods.random;__controller.world.moods.random=()=>{rngDraws++;return random();};button('2D view').click()`); await retry(() => evaluate(`stable()`));
  await evaluate(`button('1D view').click()`); await retry(() => evaluate(`stable()`));
  check('Bell-pair ownership, global mood amplitudes and seeded RNG survive switching exactly', await evaluate(`same(saved)&&rngDraws===0&&projectionCurrent()&&__controller.world.getSnapshot().pairs[0].entropy===1`));
  await evaluate(`button('Measure A').click()`); await sleep(100);
  check('Only explicit mood observation consumes a quantum random sample', await evaluate(`rngDraws===1`));
  // A reference world takes exactly the committed number of steps, never rAF time.
  await evaluate(`button('World: independent').click()`); await sleep(100);
  await evaluate(`__controller.world.setInteractions({drives:true,social:true});window.refTerrain=__controller.potential;const w=__controller.world;window.reference=new w.constructor(__controller.psi,{creatures:w.ids.map(id=>w.state(id)),interactions:w.getSnapshot().interactions});window.startSteps=__controller.steps;window.startTime=w.time;button('Play').click()`);
  await retry(() => evaluate(`__controller.world.time>startTime+.15`));
  await evaluate(`button('2D view').click()`); await retry(() => evaluate(`stable()`));
  check('Reverse destination shows the current 2D field, not frozen outgoing pixels', await evaluate(`fieldCurrent()&&__controller.playing`));
  await evaluate(`button('1D view').click()`); await sleep(550);
  check('World keeps playing throughout forward and reversed transitions', await evaluate(`__controller.playing&&__controller.world.time>startTime+.3`));
  await evaluate(`button('Pause').click()`); await retry(() => evaluate(`stable()`));
  check('Playing destination is current, not a transition snapshot', await evaluate(`projectionCurrent()`));
  check('Switching during playback neither skips nor adds physical steps', await evaluate(`(()=>{const c=__controller;for(let k=0;k<c.steps-startSteps;k++)reference.step(refTerrain,c.dt);return reference.ids.every(id=>bytesEqual(reference.spatialState(id).values,c.world.spatialState(id).values))&&JSON.stringify(reference.getSnapshot())===JSON.stringify(c.world.getSnapshot());})()`));
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await evaluate(`window.saved=capture();button('2D view').focus()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await sleep(80);
  check('Reduced motion: keyboard switch is immediate, preserves state and avoids tilt animation', await evaluate(`stable()&&same(saved)&&button('2D view').getAttribute('aria-pressed')==='true'&&getComputedStyle(document.querySelector('.terrain-canvas-wrap')).transitionDuration==='0s'`));
  await send('Emulation.setEmulatedMedia', { features: [] });
  await evaluate(`button('1D view').click()`); await sleep(80);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await sleep(80);
  check('Changing reduced-motion preference during a morph cancels its pending transition', await evaluate(`stable()&&same(saved)&&projectionCurrent()`));
  if (process.argv.includes('--creature-design')) {
    const { checkCreatureDesign } = await import('./creature-design-browser-cases.mjs');
    await checkCreatureDesign({ evaluate, send, check, retry, sleep, out });
  }
  if (process.argv.includes('--museum')) {
    const { checkMuseum } = await import('./museum-browser-cases.mjs');
    await checkMuseum({ evaluate, send, check, retry, sleep, out });
  }
  if (process.argv.includes('--screenshot')) {
    await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false }); await sleep(120);
    const shot = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(out, 'projection.png'), Buffer.from(shot.data, 'base64')); console.log('Screenshot:', join(out, 'projection.png'));
  }
  await evaluate(`window.__legacyStartRegistrations=__registrations;button('Menu ☰')?.click();button('1D simulations').click()`); await retry(() => evaluate(`!!document.querySelector('.creature-inspector')`));
  check('Legacy entry opens the original standalone 1D Observer, not the marginal', await evaluate(`!document.querySelector('.projection-1d')&&!!button('Observe particle · Creature A')&&document.querySelector('.heading').textContent.includes('Standalone 1D')`));
  await evaluate(`button('2D view').click()`); await retry(() => evaluate(`!!document.querySelector('.world-inspector')`));
  check('Leaving a legacy demo explicitly starts a new terrarium, unlike view switching', await evaluate(`__registrations===__legacyStartRegistrations+1&&__controller.world.time===0&&button('2D view').getAttribute('aria-pressed')==='true'`));
  check('No runtime or console errors', errors.length === 0);
  console.log(`${checks} production ${process.argv.includes('--museum') ? 'museum and projection' : process.argv.includes('--creature-design') ? 'creature-design and projection' : 'projection'} browser checks passed`);
} finally { socket?.close(); chrome.kill(); await new Promise(r => server.close(r)); }
