// Dependency-free real Chrome/CDP acceptance and performance checks.
// node scripts/two-dimensional-browser-check.mjs
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const profile = await mkdtemp(join(tmpdir(), 'psi-2d-'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'packages/web', '--host', '127.0.0.1', '--port', '5187', '--strictPort'], { stdio: 'pipe' });
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9227', `--user-data-dir=${profile}`, '--window-size=1280,1000', 'about:blank'], { stdio: 'ignore' });
let socket;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function retry(fn) {
  for (let k = 0; k < 200; k++) { try { const v = await fn(); if (v) return v; } catch {} await sleep(100); }
  throw new Error('Browser condition timed out');
}
const errors = [];
try {
  await retry(async () => (await fetch('http://127.0.0.1:5187')).ok);
  const pages = await retry(async () => (await (await fetch('http://127.0.0.1:9227/json/list')).json()).filter(p => p.type === 'page'));
  socket = new WebSocket(pages[0].webSocketDebuggerUrl); await new Promise(r => socket.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  socket.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.reject(Error(JSON.stringify(m.error))); else p.resolve(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const check = (name, value) => { assert.ok(value, name); console.log('PASS', name); };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__timings=[];window.__pending=new Set();
    const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame=cb=>{const id=request(t=>{__pending.delete(id);cb(t);});__pending.add(id);return id;};
    window.cancelAnimationFrame=id=>{__pending.delete(id);cancel(id);};
    const p=CanvasRenderingContext2D.prototype,put=p.putImageData,draw=p.drawImage;
    p.putImageData=function(...args){const t=performance.now();const r=put.apply(this,args);__timings.push(performance.now()-t);return r;};
    p.drawImage=function(...args){window.__draws=(window.__draws||0)+1;return draw.apply(this,args);};
  ` });
  await send('Page.navigate', { url: 'http://127.0.0.1:5187' });
  await retry(() => evaluate(`!!document.querySelector('.dimension-controls')`));
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='1D simulations').click()`);
  await retry(() => evaluate(`document.querySelector('.creature-inspector') && !document.querySelector('main button').disabled`));
  await evaluate(`window.button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith(t));window.value=t=>Number([...document.querySelectorAll('.diagnostics span')].find(s=>s.textContent.startsWith(t))?.textContent.split(':')[1]);button('Play').click();`);
  await retry(() => evaluate(`value('Physical time')>=0.1`));
  await evaluate(`button('2D Gaussian').click()`);
  await retry(() => evaluate(`!!document.querySelector('.density-2d') && value('Probability norm')===1`));
  check('Switching while 1D plays cancels all 1D animation frames', await evaluate(`__pending.size===0`));
  await evaluate(`window.initial=document.querySelector('canvas').toDataURL();window.initialSigma=value('σx');`);
  check('Initial 2D heatmap is nonempty and sigma=0.8', await evaluate(`initial.length>1000 && Math.abs(initialSigma-0.8)<1e-5 && !document.querySelector('.creature-inspector')`));
  await evaluate(`window.start=performance.now();button('Play').click()`);
  await retry(() => evaluate(`value('Physical time')>=2`));
  await evaluate(`button('Pause').click();window.elapsed=(performance.now()-start)/1000;`);
  await retry(() => evaluate(`button('Pause').disabled`));
  await evaluate(`window.paused=value('Physical time');window.draws=__draws;`);
  await sleep(200);
  check('2D play spreads the cloud and Pause stops physics/drawing', await evaluate(`value('σx')>initialSigma*1.7 && initial!==document.querySelector('canvas').toDataURL() && paused===value('Physical time') && draws===__draws && __pending.size===0 && Math.abs(value('Probability norm')-1)<1e-9`));
  console.log('Actual browser playback', await evaluate(`({physicalTime:paused,wallSeconds:elapsed,draws,meanPutImageDataMs:__timings.reduce((a,b)=>a+b,0)/__timings.length})`));
  await evaluate(`button('Reset').click()`);
  await retry(() => evaluate(`value('Physical time')===0`));
  check('Reset restores identical heatmap, width, time and paused state', await evaluate(`initial===document.querySelector('canvas').toDataURL() && value('Physical time')===0 && value('σx')===initialSigma && __pending.size===0`));
  // Slice 5B native pointer interactions. Inspect read-only UI diagnostics, not a
  // mutable controller/global quantum-state escape hatch.
  await evaluate(`
    window.tool=t=>document.querySelector('input[name="terrain-tool"][value="'+t+'"]').click();
    window.toggle=()=>document.querySelector('input[aria-label="Show potential overlay"]').click();
    window.state=()=>JSON.stringify(['Physical time','Probability norm','σx','σy','Energy','Terrain revision','V minimum','V maximum','Terrain ∫|V|'].map(value));
    window.point=(x,y)=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect(),w=c.clientWidth,h=c.clientHeight,side=Math.min(w,h);
      return {x:r.left+((w-side)/2+(x+10)/20*side)*r.width/w,y:r.top+((h-side)/2+(10-y)/20*side)*r.height/h};};
  `);
  const clickCanvas = async (x, y) => {
    await evaluate(`document.querySelector('canvas').scrollIntoView({block:'center'})`);
    const p = await evaluate(`point(${x},${y})`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 });
  };
  check('2D terrain starts zero in nonpainting View mode', await evaluate(`value('V minimum')===0 && value('V maximum')===0 && document.querySelector('input[value="view"]').checked`));
  await clickCanvas(0, 0); check('View mode does not paint', await evaluate(`value('Terrain revision')===0`));
  await evaluate(`tool('barrier');window.beforeOverlay=document.querySelector('canvas').toDataURL()`); await clickCanvas(0, 0);
  await retry(() => evaluate(`value('V maximum')>1.9`));
  check('Barrier click adds positive energy without advancing time; overlay changes', await evaluate(`value('V minimum')===0 && value('Physical time')===0 && beforeOverlay!==document.querySelector('canvas').toDataURL()`));
  await evaluate(`window.clickMass=value('Terrain ∫|V|')`);
  const startStroke = await evaluate(`point(-3,2)`), endStroke = await evaluate(`point(3,2)`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...startStroke, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...endStroke, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...endStroke, button: 'left', clickCount: 1 });
  await retry(() => evaluate(`value('Terrain ∫|V|')>clickMass*3`));
  check('Sparse native drag creates an extended additive feature', await evaluate(`value('Terrain ∫|V|')>clickMass*3 && value('V maximum')<=20`));
  await evaluate(`button('Clear terrain').click();tool('well')`); await retry(() => evaluate(`value('V maximum')===0`)); await clickCanvas(-2,-2);
  await retry(() => evaluate(`value('V minimum') < -1.8`));
  check('Well brush adds negative energy', await evaluate(`value('V maximum')===0 && value('V minimum')<0`));
  await evaluate(`window.wellMass=value('Terrain ∫|V|');tool('erase')`); await clickCanvas(-2,-2);
  await retry(() => evaluate(`value('Terrain ∫|V|')<wellMass`));
  check('Eraser reduces negative magnitude without reversing sign', await evaluate(`value('Terrain ∫|V|')<wellMass && value('V maximum')===0`));
  await evaluate(`window.beforeToggle=state();toggle()`); await sleep(120);
  check('Overlay toggle preserves all numerical diagnostics and reveals unchanged density', await evaluate(`beforeToggle===state() && initial===document.querySelector('canvas').toDataURL()`));
  await evaluate(`toggle();button('Play').click()`); await retry(() => evaluate(`value('Physical time')>=0.3`));
  await evaluate(`window.preEditTime=value('Physical time');tool('barrier')`); await clickCanvas(2,2);
  await retry(() => evaluate(`value('V maximum')>1.8 && value('Physical time')>=preEditTime`));
  check('Native painting during playback preserves time progression and norm', await evaluate(`!button('Pause').disabled && value('Physical time')>=preEditTime && Math.abs(value('Probability norm')-1)<1e-9`));
  await evaluate(`button('Pause').click()`); await retry(() => evaluate(`button('Pause').disabled`));
  await evaluate(`toggle();window.beforeClear=document.querySelector('canvas').toDataURL();window.clearTime=value('Physical time');button('Clear terrain').click()`);
  await retry(() => evaluate(`value('Terrain ∫|V|')===0`));
  check('Clear terrain removes both signs but preserves density and time', await evaluate(`beforeClear===document.querySelector('canvas').toDataURL() && value('Physical time')===clearTime && value('V minimum')===0 && value('V maximum')===0`));
  await clickCanvas(2,2); await retry(() => evaluate(`value('V maximum')>1.8`));
  await evaluate(`window.resetMass=value('Terrain ∫|V|');button('Reset evolution').click()`); await retry(() => evaluate(`value('Physical time')===0`));
  check('Reset evolution preserves terrain and restores the initial density', await evaluate(`value('Terrain ∫|V|')===resetMass && initial===document.querySelector('canvas').toDataURL() && button('Pause').disabled`));
  for (const [label, sign] of [['Load scattering barrier',1],['Load attractive well',-1]]) {
    await evaluate(`button('${label}').click()`); await retry(() => evaluate(`value('Physical time')===0 && value('${sign>0?'V maximum':'V minimum'}')*${sign}>4`));
    await evaluate(`window.presetImage=document.querySelector('canvas').toDataURL();window.presetState=state();`);
    await clickCanvas(2,2); await evaluate(`button('${label}').click()`); await sleep(120);
    check(`${label} replaces and reproduces packet and potential at t=0`, await evaluate(`presetImage===document.querySelector('canvas').toDataURL() && value('Physical time')===0 && button('Pause').disabled`));
  }
  await evaluate(`button('Load free space').click()`); await retry(() => evaluate(`value('Terrain ∫|V|')===0`));
  check('Free preset restores zero terrain and reproducible initial state', await evaluate(`initial===document.querySelector('canvas').toDataURL()`));
  await send('Emulation.setDeviceMetricsOverride', { width: 520, height: 900, deviceScaleFactor: 2, mobile: false });
  await evaluate(`document.querySelector('canvas').style.transformOrigin='top left';document.querySelector('canvas').style.transform='scale(0.85)';tool('barrier')`);
  await sleep(150); await clickCanvas(0,0); await retry(() => evaluate(`value('V maximum')>1.9`));
  check('Resized CSS-scaled HiDPI canvas paints the physical center', await evaluate(`value('V maximum')>1.9 && value('V maximum')<2.01 && document.querySelector('canvas').width===Math.round(document.querySelector('canvas').clientWidth*2)`));
  await send('Emulation.clearDeviceMetricsOverride'); await evaluate(`document.querySelector('canvas').style.transform='';button('Load free space').click()`); await sleep(150);
  // Measure actual compiled physics and complete renderer, without modifying the displayed simulation.
  const performanceReport = await evaluate(`(async()=>{
    const core=await import('/@fs/' + ${JSON.stringify(process.cwd().replaceAll('\\', '/') + '/packages/sim-core/src/index.ts')});
    const {createDensityRenderer2D}=await import('/src/render/density2d.ts');
    const g=core.createPsiGrid2D();core.initializeGaussian2D(g);const v=new Float64Array(g.nx*g.ny),s=new core.CayleyStepper2D(g);
    for(let k=0;k<30;k++)s.step(g,v,1/120);let t=performance.now();for(let k=0;k<300;k++)s.step(g,v,1/120);const physicsMs=(performance.now()-t)/300;
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=520;const ctx=canvas.getContext('2d'),render=createDensityRenderer2D(g);
    for(let k=0;k<10;k++)render(ctx,1000,520);t=performance.now();for(let k=0;k<100;k++)render(ctx,1000,520);const renderMs=(performance.now()-t)/100;
    const {createPotentialRenderer2D}=await import('/src/render/potential2d.ts');
    const {createTerrainPreset2D}=await import('/src/terrainPresets.ts');
    const terrain=createTerrainPreset2D(g,'barrier').potential;
    for(let k=0;k<30;k++)s.step(g,terrain,1/120);t=performance.now();for(let k=0;k<300;k++)s.step(g,terrain,1/120);const terrainPhysicsMs=(performance.now()-t)/300;
    const source={terrainRevision:0,potentialLimit:20,copyPotential:out=>out.set(terrain)},overlay=createPotentialRenderer2D(g,source);
    const full=()=>{render(ctx,1000,520);overlay.draw(ctx,1000,520,true,.6);};
    for(let k=0;k<10;k++)full();t=performance.now();for(let k=0;k<100;k++)full();const cachedTerrainDrawMs=(performance.now()-t)/100;
    const cachedRebuilds=overlay.rebuilds;
    t=performance.now();for(let k=0;k<100;k++){source.terrainRevision++;full();}const changedTerrainDrawMs=(performance.now()-t)/100;
    t=performance.now();for(let k=0;k<1000;k++)core.stampPotential2D(g,terrain,Math.sin(k)*4,Math.cos(k)*4,{tool:'barrier',sigma:.7,amplitude:2},20);const localStampMs=(performance.now()-t)/1000;
    return {physicsMs,renderMs,terrainPhysicsMs,cachedTerrainDrawMs,changedTerrainDrawMs,localStampMs,cachedRebuilds,userAgent:navigator.userAgent};
  })()`);
  console.log('Chrome warmed 128x128 benchmark', performanceReport);
  await evaluate(`button('Play').click();button('1D simulations').click()`);
  await retry(() => evaluate(`!!document.querySelector('.creature-inspector')`));
  check('Switching while 2D plays cleans up and restores functional 1D', await evaluate(`__pending.size===0 && value('Physical time')===0`));
  await evaluate(`button('Play').click()`); await retry(() => evaluate(`value('Physical time')>=0.1`)); await evaluate(`button('Pause').click();button('2D Gaussian').click()`);
  await retry(() => evaluate(`!!document.querySelector('.density-2d')`));
  check('Returning to 2D starts the deterministic initial state', await evaluate(`initial===document.querySelector('canvas').toDataURL() && value('Physical time')===0`));
  check('No browser errors', errors.length === 0);
} finally { socket?.close(); chrome.kill(); server.kill(); }
