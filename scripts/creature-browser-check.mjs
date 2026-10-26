// Real Chrome integration checks, no dependencies or replacement physics state.
// node scripts/creature-browser-check.mjs [--screenshot]
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const profile = await mkdtemp(join(tmpdir(), 'psi-creatures-'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'packages/web', '--host', '127.0.0.1', '--port', '5186', '--strictPort'], { stdio: 'pipe' });
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9226',
  `--user-data-dir=${profile}`, '--window-size=1280,1000', 'about:blank',
], { stdio: 'ignore' });
let socket;
const errors = [], checks = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function retry(fn) {
  const end = Date.now() + 20000;
  while (Date.now() < end) { try { const result = await fn(); if (result) return result; } catch {} await sleep(100); }
  throw new Error('Timed out waiting for browser condition');
}
try {
  await retry(async () => (await fetch('http://127.0.0.1:5186')).ok);
  const pages = await retry(async () => (await (await fetch('http://127.0.0.1:9226/json/list')).json()).filter(p => p.type === 'page'));
  socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const m = JSON.parse(event.data);
    if (m.id) {
      const p = pending.get(m.id); pending.delete(m.id);
      if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result);
    } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const check = (name, condition) => { assert.ok(condition, name); checks.push(name); console.log(`PASS ${name}`); };
  await send('Page.enable'); await send('Runtime.enable');
  // Observe actual draw calls, with no controller handles or state mutation.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__paths = {};
    const p=CanvasRenderingContext2D.prototype, begin=p.beginPath, move=p.moveTo, line=p.lineTo, stroke=p.stroke;
    p.beginPath=function(...args){this.__path=[];return begin.apply(this,args);};
    p.moveTo=function(x,y){this.__path?.push([x,y]);return move.call(this,x,y);};
    p.lineTo=function(x,y){this.__path?.push([x,y]);return line.call(this,x,y);};
    p.stroke=function(...args){const key={'#a8f9fc':'a','#f49bdf':'b','#ffc477':'terrain'}[this.strokeStyle];
      if(key && this.__path?.length===401) __paths[key]=this.__path.slice();return stroke.apply(this,args);};
  ` });
  await send('Page.navigate', { url: 'http://127.0.0.1:5186' });
  await retry(() => evaluate(`window.__paths.a?.length===401 && window.__paths.b?.length===401 && !document.querySelector('button').disabled`));
  await evaluate(`
    window.button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith(text));
    window.diagnostic=label=>[...document.querySelectorAll('.diagnostics span')].find(e=>e.textContent.startsWith(label))?.textContent.split(':').slice(1).join(':').trim();
    window.stats=key=>{const bottom=document.querySelector('canvas').clientHeight-48,height=bottom-60;
      const samples=__paths[key].map(([x,y],i)=>({x:-20+i*0.1,w:10.5*((bottom-y)/height)**2*0.1}));
      const norm=samples.reduce((s,v)=>s+v.w,0),mean=samples.reduce((s,v)=>s+v.w*v.x,0)/norm;
      return {norm,mean,variance:samples.reduce((s,v)=>s+v.w*(v.x-mean)**2,0)/norm};};
    window.savedInitial=JSON.stringify([__paths.a,__paths.b]);
  `);
  check('Both plotted densities are independent normalized initial states', await evaluate(`Math.abs(stats('a').norm-1)<1e-12 && Math.abs(stats('b').norm-1)<1e-12 && Math.abs(stats('a').mean+1.5)<1e-10 && Math.abs(stats('b').mean-1.5)<1e-10`));
  await evaluate(`button('Play').click()`);
  await retry(() => evaluate(`Number(diagnostic('Physical time'))>=0.5`));
  await evaluate(`button('Pause').click()`);
  await retry(() => evaluate(`button('Pause').disabled`));
  await evaluate(`window.savedTime=diagnostic('Physical time');window.savedPaths=JSON.stringify([__paths.a,__paths.b]);`);
  await sleep(200);
  check('Play evolves both real densities; Pause stops time and both paths', await evaluate(`savedPaths!==savedInitial && savedTime===diagnostic('Physical time') && savedPaths===JSON.stringify([__paths.a,__paths.b])`));
  await evaluate(`document.querySelector('input[name="creature"][value="b"]').click()`);
  check('Selecting B changes inspection without replacing either physical state', await evaluate(`document.querySelector('.creature-inspector h2').textContent.startsWith('Creature B') && Math.abs(Number(diagnostic('Position expectation'))-stats('b').mean)<0.0001 && savedPaths===JSON.stringify([__paths.a,__paths.b]) && savedTime===diagnostic('Physical time')`));
  await evaluate(`(() => {const input=document.querySelector('input[aria-label="Social coupling"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'-3');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  check('React slider rerender changes only pending coupling, not active world/time', await evaluate(`document.body.innerText.includes('Pending g = -3.0') && document.body.innerText.includes('Active g = 1.5') && savedPaths===JSON.stringify([__paths.a,__paths.b]) && savedTime===diagnostic('Physical time')`));
  await evaluate(`button('Apply coupling').click()`);
  check('Applying coupling resets identical packets and changes active coupling', await evaluate(`diagnostic('Physical time')==='0.00' && document.body.innerText.includes('Active g = -3.0') && savedInitial===JSON.stringify([__paths.a,__paths.b])`));
  await evaluate(`document.querySelector('input[name="interaction"]').click();document.querySelector('canvas').scrollIntoView({block:'center'})`);
  const point = await evaluate(`(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+160};})()`);
  const paintBefore = await evaluate(`JSON.stringify(__paths.terrain)`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  check('Native pointer painting updates shared terrain without moving packets', paintBefore !== await evaluate(`JSON.stringify(__paths.terrain)`) && await evaluate(`savedInitial===JSON.stringify([__paths.a,__paths.b])`));
  await evaluate(`window.painted=JSON.stringify(__paths.terrain);button('Reset').click()`);
  check('Reset preserves terrain', await evaluate(`painted===JSON.stringify(__paths.terrain)`));
  await evaluate(`button('Clear Terrain').click();document.querySelectorAll('input[name="interaction"]')[1].click();window.partnerBefore=JSON.stringify(__paths.a);button('Observe particle').click()`);
  await retry(() => evaluate(`document.body.innerText.includes('observation #1')`));
  check('Selected B observation leaves A untouched, normalizes B, preserves time', await evaluate(`partnerBefore===JSON.stringify(__paths.a) && Math.abs(stats('b').norm-1)<1e-12 && diagnostic('Physical time')==='0.00' && __paths.b && document.body.innerText.includes('Observed x =')`));
  const variance = await evaluate(`stats('b').variance`);
  await evaluate(`window.sampled=JSON.stringify(__paths.b);window.sampleText=[...document.querySelectorAll('[role="status"]')].find(e=>e.textContent.startsWith('Observed x =')).textContent;button('Reset').click();button('Observe particle').click()`);
  check('Reset rewinds seeded observation deterministically', await evaluate(`sampled===JSON.stringify(__paths.b) && document.body.innerText.includes(sampleText)`));
  await evaluate(`button('Play').click()`);
  await retry(() => evaluate(`Number(diagnostic('Physical time'))>=1`));
  await evaluate(`button('Pause').click()`);
  check('Measured B re-spreads under real evolution', await evaluate(`stats('b').variance`) > variance * 2);
  await evaluate(`document.querySelector('input[name="creature"][value="a"]').click()`);
  check('Per-creature observation history follows selection', await evaluate(`document.body.innerText.includes('No position observed yet') && button('Observe particle').textContent.includes('Creature A')`));
  await evaluate(`button('Why did it jump?').click()`);
  await retry(() => evaluate(`document.querySelector('dialog')?.open`));
  check('Existing notebook opens and pauses', await evaluate(`!button('Play').disabled && document.querySelectorAll('dialog math').length===6`));
  await evaluate(`button('Close notebook').click();button('Load free exploration').click()`);
  check('Single-packet exploration retained', await evaluate(`!document.querySelector('.creature-inspector') && document.body.innerText.includes('Initial momentum') && document.body.innerText.includes('Energy drift since last update')`));
  await evaluate(`button('Load tunnelling demo').click()`);
  check('Validated tunnelling preset retained', await evaluate(`document.body.innerText.includes('2401 points') && document.body.innerText.includes('Provisional')`));
  await evaluate(`window.scatteringCanvas=document.querySelector('canvas').toDataURL();button('Play').click()`);
  await retry(() => evaluate(`Number(diagnostic('Physical time'))>=0.2`));
  await evaluate(`button('Pause').click()`);
  await retry(() => evaluate(`button('Pause').disabled`));
  check('Historical tunnelling preset really evolves with finite norm/energy and resets', await evaluate(`(() => {
    const valid=scatteringCanvas!==document.querySelector('canvas').toDataURL() && Math.abs(Number(diagnostic('Probability norm'))-1)<1e-9 && Number.isFinite(Number(diagnostic('Energy ⟨ψ|H|ψ⟩')));
    button('Reset').click();return valid;
  })()`));
  await retry(() => evaluate(`diagnostic('Physical time')==='0.00'`));
  await evaluate(`button('Load two-creature demo').click()`);
  check('Returning to two-creature mode resets both, without stale single-packet state', await evaluate(`document.querySelector('.creature-inspector') && savedInitial===JSON.stringify([__paths.a,__paths.b]) && diagnostic('Physical time')==='0.00'`));
  const comparisons = [];
  for (const g of [-3, 0, 3]) {
    await evaluate(`(() => {const input=document.querySelector('input[aria-label="Social coupling"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'${g}');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await retry(() => evaluate(`document.body.innerText.includes('Pending g = ${g.toFixed(1)}')`));
    await evaluate(`button('Apply coupling').click()`);
    assert.ok(await evaluate(`savedInitial===JSON.stringify([__paths.a,__paths.b]) && diagnostic('Physical time')==='0.00'`));
    await evaluate(`button('Play').click()`);
    await retry(() => evaluate(`Number(diagnostic('Physical time'))>=2`));
    await evaluate(`button('Pause').click()`);
    await retry(() => evaluate(`button('Pause').disabled`));
    comparisons.push(await evaluate(`({g:${g},time:Number(diagnostic('Physical time')),a:stats('a'),b:stats('b')})`));
  }
  check('Attraction / zero / repulsion evolve equivalent initial packets into ordered centroid contrasts',
    comparisons[0].a.mean > comparisons[1].a.mean + 0.25 && comparisons[1].a.mean > comparisons[2].a.mean + 0.25);
  console.log('Browser coupling comparisons:', JSON.stringify(comparisons));
  await evaluate(`button('Reset').click();document.querySelectorAll('input[name="interaction"]')[1].click();button('Play').click()`);
  await retry(() => evaluate(`Number(diagnostic('Physical time'))>=0.2`));
  check('Observation during pair playback preserves playing status and both normalized densities', await evaluate(`(() => {
    const before=JSON.stringify(__paths.b),time=diagnostic('Physical time');button('Observe particle').click();
    return before===JSON.stringify(__paths.b) && time===diagnostic('Physical time') && button('Play').disabled && Math.abs(stats('a').norm-1)<1e-12;
  })()`));
  await retry(() => evaluate(`Number(diagnostic('Physical time'))>=0.4`));
  await evaluate(`document.querySelector('input[name="interaction"]').click();document.querySelector('canvas').scrollIntoView({block:'center'})`);
  const runningPoint = await evaluate(`(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+160};})()`);
  const runningTerrain = await evaluate(`JSON.stringify(__paths.terrain)`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...runningPoint, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...runningPoint, button: 'left', clickCount: 1 });
  check('Native painting while playing edits shared terrain without stopping playback', runningTerrain !== await evaluate(`JSON.stringify(__paths.terrain)`) && await evaluate(`button('Play').disabled`));
  await evaluate(`button('Reset').click()`);
  check('Reset during playback pauses and restores both initial densities and moods while retaining terrain', await evaluate(`savedInitial===JSON.stringify([__paths.a,__paths.b]) && diagnostic('Physical time')==='0.00' && !button('Play').disabled && Number(diagnostic('Bloch rz'))===1`));
  // Device-scale resize and native keyboard/button actions are browser smoke checks,
  // not a claim of complete mouse/touch/pen or screen-reader acceptance.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(200);
  check('Narrow HiDPI canvas keeps both complete density paths', await evaluate(`__paths.a.length===401 && __paths.b.length===401 && document.querySelector('canvas').width===Math.round(document.querySelector('canvas').clientWidth*2)`));
  await send('Emulation.clearDeviceMetricsOverride');
  await evaluate(`window.scrollTo(0,0)`); await sleep(200);
  if (process.argv.includes('--screenshot')) {
    const layout = await send('Page.getLayoutMetrics');
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: 1280, height: Math.ceil(layout.cssContentSize.height), scale: 1 } });
    const path = join(profile, 'creatures.png');
    await writeFile(path, Buffer.from(shot.data, 'base64')); console.log(`Screenshot: ${path}`);
  }
  check('No runtime or console errors', errors.length === 0);
  console.log(JSON.stringify({ browser: (await send('Browser.getVersion')).product, checks: checks.length, errors }, null, 2));
  await send('Browser.close');
} finally { socket?.close(); chrome.kill(); server.kill(); }
