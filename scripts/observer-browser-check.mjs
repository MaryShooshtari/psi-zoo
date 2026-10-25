// Dependency-free Chrome DevTools acceptance check. Requires a local Chrome.
// Run from the repo root: node scripts/observer-browser-check.mjs
// Captures genuine app screenshots; does not modify or replace simulation state.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = await mkdtemp(join(tmpdir(), 'psi-observer-'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'packages/web', '--host', '127.0.0.1', '--port', '5174', '--strictPort'], { stdio: 'pipe' });
const chrome = spawn(chromePath, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=9223', `--user-data-dir=${profile}`, '--window-size=1280,1000', 'about:blank'], { stdio: 'ignore' });
let socket;
const errors = [];
const results = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function retry(fn, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { const result = await fn(); if (result) return result; } catch {}
    await sleep(100);
  }
  throw new Error('Timed out waiting for browser condition');
}
try {
  await retry(async () => (await fetch('http://127.0.0.1:5174')).ok);
  const pages = await retry(async () => (await (await fetch('http://127.0.0.1:9223/json/list')).json()).filter(p => p.type === 'page'));
  socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const callbacks = pending.get(message.id); pending.delete(message.id);
      if (message.error) callbacks.reject(new Error(JSON.stringify(message.error)));
      else callbacks.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args);
    else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const check = (name, condition) => { assert.ok(condition, name); results.push(name); console.log(`PASS ${name}`); };
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  // Observe actual renderer output without exposing controller state or changing physics.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__plot = {};
    const proto = CanvasRenderingContext2D.prototype;
    const begin = proto.beginPath, move = proto.moveTo, line = proto.lineTo, stroke = proto.stroke;
    proto.beginPath = function(...args) { this.__path = []; return begin.apply(this,args); };
    proto.moveTo = function(x,y) { this.__path?.push([x,y]); return move.call(this,x,y); };
    proto.lineTo = function(x,y) { this.__path?.push([x,y]); return line.call(this,x,y); };
    proto.stroke = function(...args) {
      const key = {'#a8f9fc':'density','#ffc477':'potential','#f49bdf':'marker'}[this.strokeStyle];
      if (key) window.__plot[key] = this.__path?.slice();
      return stroke.apply(this,args);
    };
  ` });
  await send('Page.navigate', { url: 'http://127.0.0.1:5174' });
  await retry(() => evaluate(`document.querySelector('button') && !document.querySelector('button').disabled && window.__plot.density?.length === 401`));
  await evaluate(`window.button = text => [...document.querySelectorAll('button')].find(b => b.textContent === text);
    window.diagnostic = label => [...document.querySelectorAll('.diagnostics span')].find(e => e.textContent.startsWith(label))?.textContent.split(':').slice(1).join(':').trim();
    window.variance = () => { const p = __plot.density.map(([x,y],i) => ({x:-20+i*0.1,w:10.5*((292-y)/232)**2*0.1})); const norm=p.reduce((s,v)=>s+v.w,0);const mean=p.reduce((s,v)=>s+v.x*v.w,0)/norm;return p.reduce((s,v)=>s+(v.x-mean)**2*v.w,0)/norm; };
    window.count = () => Number(document.body.innerText.match(/observation #(\\d+)/)?.[1] || 0);`);
  check('1. Initial free density and diagnostics', await evaluate(`Math.abs(Number(diagnostic('Probability norm'))-1)<1e-9 && Math.abs(variance()-1)<1e-8`));
  const initialPotential = await evaluate('JSON.stringify(__plot.potential)');
  const point = await evaluate(`(() => {const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.left+58+0.375*(r.width-116),y:r.top+160};})()`);
  const clickPlot = async (x = point.x, y = point.y) => {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };
  await clickPlot();
  check('2. Paint edits terrain while paused', initialPotential !== await evaluate('JSON.stringify(__plot.potential)'));
  await evaluate(`button('Load free exploration').click()`);
  await sleep(150);
  await evaluate(`document.querySelectorAll('input[name="interaction"]')[1].click()`);
  // Input coordinates must be recomputed after any scroll performed for controls.
  await evaluate(`document.querySelector('canvas').scrollIntoView({block:'center'})`);
  const plotPoint = await evaluate(`(() => {const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.left+r.width*0.8,y:r.top+160};})()`);
  await clickPlot(plotPoint.x, plotPoint.y);
  await retry(() => evaluate('count() === 1'));
  check('3. One Observe click produces one measurement while paused', await evaluate(`count()===1 && button('Play').disabled===false && diagnostic('Physical time')==='0.00'`));
  check('4. Marker uses sampled position, not click', await evaluate(`(() => {const x=Number(document.body.innerText.match(/Observed x = ([\\d.-]+)/)[1]); const width=document.querySelector('canvas').clientWidth; return Math.abs(__plot.marker[0][0]-(58+(x+20)/40*(width-116)))<1e-6 && Math.abs(x-12)>1;})()`));
  check('5. Localized density peak above 0.5 is inside fixed plot bounds', await evaluate(`(() => {const ys=__plot.density.map(p=>p[1]); return Math.min(...ys)>60 && Math.max(...ys)<=292 && 10.5*((292-Math.min(...ys))/232)**2>0.5;})()`));
  const localizedVariance = await evaluate('variance()');
  await evaluate(`button('Play').click()`);
  await retry(() => evaluate(`Number(diagnostic('Physical time')) >= 1.5`));
  await evaluate(`button('Pause').click()`);
  check('6. Real free evolution re-spreads after observation', await evaluate('variance()') > 4 * localizedVariance);
  await evaluate(`button('Play').click(); button('Observe particle').click()`);
  await retry(() => evaluate('count() === 2'));
  check('7. Measurement while playing leaves playback running', await evaluate(`button('Play').disabled && !button('Pause').disabled`));
  await evaluate(`button('Pause').click()`);
  check('8. Norm and energy diagnostics are finite; norm is one', await evaluate(`Math.abs(Number(diagnostic('Probability norm'))-1)<1e-9 && Number.isFinite(Number(diagnostic('Energy ⟨ψ|H|ψ⟩'))) && Math.abs(Number(diagnostic('Energy drift since last update')))<1e-8`));
  await evaluate(`button('Reset').click()`);
  check('9. Reset clears result, pauses and restores initial packet/time', await evaluate(`count()===0 && diagnostic('Physical time')==='0.00' && Math.abs(variance()-1)<1e-8 && !button('Play').disabled && document.body.innerText.includes('No position observed yet')`));
  // A keyboard Space on the native observation button must produce only one action.
  await evaluate(`button('Observe particle').focus()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await retry(() => evaluate('count()===1'));
  check('11a. Keyboard Space observes exactly once', await evaluate('count()===1'));
  // Capture the genuine paused measurement, including diagnostics, in one full-page screenshot.
  await evaluate('window.scrollTo(0,0)');
  await mkdir('docs/media', { recursive: true });
  const layout = await send('Page.getLayoutMetrics');
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 1280, height: Math.ceil(layout.cssContentSize.height), scale: 1 } });
  await writeFile('docs/media/observer.png', Buffer.from(screenshot.data, 'base64'));
  await evaluate(`button('Why did it jump?').click()`);
  await retry(() => evaluate(`document.querySelector('dialog')?.open`));
  await evaluate(`document.querySelectorAll('dialog details').forEach(e=>e.open=true)`);
  check('10a. Notebook opens, pauses, and renders valid native MathML and current example', await evaluate(`(() => { const math=[...document.querySelectorAll('dialog math')]; return math.length===6 && math.every(m=>m.namespaceURI==='http://www.w3.org/1998/Math/MathML' && m.getBoundingClientRect().height>15 && !new DOMParser().parseFromString(m.outerHTML,'application/xml').querySelector('parsererror')) && document.querySelector('.notebook-example').textContent.includes('P(j)') && !button('Play').disabled; })()`));
  await evaluate(`document.querySelector('dialog details').scrollIntoView({block:'start'})`);
  const notebookShot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('docs/media/observer-notebook.png', Buffer.from(notebookShot.data, 'base64'));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await retry(() => evaluate(`!document.querySelector('dialog')`));
  check('10b / 11b. Escape closes notebook and returns focus to its trigger', await evaluate(`document.activeElement.textContent==='Why did it jump?'`));
  await evaluate(`button('Why did it jump?').click()`);
  await retry(() => evaluate(`document.querySelector('dialog')?.open`));
  await evaluate(`button('Close notebook').click()`);
  await retry(() => evaluate(`!document.querySelector('dialog')`));
  await evaluate(`button('Play').click()`);
  await retry(() => evaluate(`Number(diagnostic('Physical time'))>0.1`));
  await evaluate(`button('Pause').click()`);
  check('10c. Close button permits continued playback', await evaluate(`!document.querySelector('dialog') && Number(diagnostic('Physical time'))>0.1`));
  if (errors.length) console.error('Browser errors:', JSON.stringify(errors));
  check('12. No browser console/runtime errors', errors.length === 0);
  console.log(JSON.stringify({ browser: (await send('Browser.getVersion')).product, checks: results, errors, screenshots: ['docs/media/observer.png', 'docs/media/observer-notebook.png'] }, null, 2));
  await send('Browser.close');
} finally {
  socket?.close(); chrome.kill(); server.kill();
}
