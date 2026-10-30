// Real Chrome/CDP world acceptance + default-grid performance. No new dependencies.
// node scripts/world-2d-browser-check.mjs
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const profile = await mkdtemp(join(tmpdir(), 'psi-world-2d-'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'packages/web', '--host', '127.0.0.1', '--port', '5188', '--strictPort'], { stdio: 'pipe' });
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9228', `--user-data-dir=${profile}`, '--window-size=1280,1000', 'about:blank'], { stdio: 'ignore' });
let socket; const errors = []; let checks = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function retry(fn) { for (let k = 0; k < 250; k++) { try { const result = await fn(); if (result) return result; } catch {} await sleep(100); } throw Error('Timed out waiting for browser condition'); }
try {
  await retry(async () => (await fetch('http://127.0.0.1:5188')).ok);
  const pages = await retry(async () => (await (await fetch('http://127.0.0.1:9228/json/list')).json()).filter(p => p.type === 'page'));
  socket = new WebSocket(pages[0].webSocketDebuggerUrl); await new Promise(r => socket.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  socket.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.reject(Error(JSON.stringify(m.error))); else p.resolve(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const check = (name, condition) => { assert.ok(condition, name); checks++; console.log('PASS', name); };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__pending=new Set();
    const req=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window);
    window.requestAnimationFrame=cb=>{const id=req(t=>{__pending.delete(id);cb(t);});__pending.add(id);return id;};
    window.cancelAnimationFrame=id=>{__pending.delete(id);cancel(id);};` });
  await send('Page.navigate', { url: 'http://127.0.0.1:5188' });
  await retry(() => evaluate(`!!document.querySelector('.dimension-controls')`));
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='1D simulations').click()`);
  // The inspector can mount before the initial snapshot enables Play. Waiting
  // only for its DOM raced a disabled click on slow/headless startup.
  await retry(() => evaluate(`!!document.querySelector('.creature-inspector') && [...document.querySelectorAll('button')].some(b=>b.textContent==='Play' && !b.disabled)`));
  await evaluate(`window.button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith(t));
    window.value=t=>Number([...document.querySelectorAll('.diagnostics span')].find(s=>s.textContent.startsWith(t))?.textContent.split(':')[1]);
    window.inspect=()=>JSON.stringify(['Mean x','Mean y','Selected σx','Selected σy','Bloch x','Bloch y','Mood sz','Mood norm'].map(value));
    window.select=id=>document.querySelector('input[name="world-creature"][value="'+id+'"]').click();
    window.toggle=label=>document.querySelector('input[aria-label="'+label+'"]').click();
    window.hideDecor=()=>{const d=document.querySelector('input[aria-label="Show creature decorations"]');if(d?.checked)d.click();};
    window.point=(x,y)=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect(),w=c.clientWidth,h=c.clientHeight,side=Math.min(w,h);return{x:r.left+((w-side)/2+(x+10)/20*side)*r.width/w,y:r.top+((h-side)/2+(10-y)/20*side)*r.height/h};};
    button('Play').click();`);
  await retry(() => evaluate(`value('Physical time')>0.1`));
  check('Existing 1D mode evolves', await evaluate(`value('Physical time')>0`));
  await evaluate(`button('2D creature world').click()`); await retry(() => evaluate(`!!document.querySelector('.world-inspector')`));
  // Raw-density pixel regressions exclude optional faces/status/selection overlays.
  await evaluate(`hideDecor()`); await sleep(100);
  check('World loads two individually normalized creatures, with no stale animation loop', await evaluate(`document.querySelectorAll('input[name="world-creature"]').length===2 && Math.abs(value('Norm A')-1)<1e-10 && Math.abs(value('Norm B')-1)<1e-10 && __pending.size===0`));
  await evaluate(`window.initialA=inspect();window.image=document.querySelector('canvas').toDataURL();window.start=performance.now();button('Play').click()`);
  await retry(() => evaluate(`value('Physical time')>=0.6`)); await evaluate(`button('Pause').click()`); await retry(() => evaluate(`button('Pause').disabled`));
  await evaluate(`window.elapsed=(performance.now()-start)/1000;window.stopped=value('Physical time');window.after=inspect();window.imageAfter=document.querySelector('canvas').toDataURL()`); await sleep(200);
  check('Play advances density and mood; Pause freezes committed diagnostics', await evaluate(`inspect()!==initialA && value('Mood sz')<0.95 && image!==imageAfter && inspect()===after && value('Physical time')===stopped && __pending.size===0`));
  console.log('Actual two-creature playback', await evaluate(`({physicalTime:stopped,wallSeconds:elapsed})`));
  await evaluate(`button('Reset evolution').click()`); await retry(() => evaluate(`value('Physical time')===0`));
  check('Reset restores initial means, widths, moods and time', await evaluate(`inspect()===initialA && image===document.querySelector('canvas').toDataURL()`));
  await evaluate(`select('b')`); await retry(() => evaluate(`document.querySelector('.world-inspector h2').textContent.includes('B')`));
  check('Selection inspects B with its distinct mood/direction', await evaluate(`value('Mean x')===1.5 && value('Mood sz')===-1 && value('Drive force y')===-0.3`));
  await evaluate(`select('a')`); await sleep(100);
  await evaluate(`window.beforeToggle=inspect();toggle('Mood drives')`); await retry(() => evaluate(`value('Drive force x')===0`));
  check('Drive toggle changes force contribution without changing state', await evaluate(`value('Drive force x')===0 && inspect()===beforeToggle`));
  await evaluate(`toggle('Social interactions')`); await retry(() => evaluate(`value('Social V at mean')>0.5`));
  check('Social toggle changes opposite-mood potential without changing state', await evaluate(`value('Social V at mean')>0.5 && inspect()===beforeToggle`));
  await evaluate(`toggle('Social interactions');toggle('Mood drives');button('Add creature').click()`); await retry(() => evaluate(`document.querySelectorAll('input[name="world-creature"]').length===3`));
  await evaluate(`select('a')`); await sleep(100);
  check('Adding a template preserves A, and assigns a unique selectable ID', await evaluate(`inspect()===initialA && !!document.querySelector('input[value="c"][name="world-creature"]') && Math.abs(value('Norm C')-1)<1e-10`));
  await evaluate(`button('Add creature').click()`); await retry(() => evaluate(`document.querySelectorAll('input[name="world-creature"]').length===4`));
  check('Population is bounded at four', await evaluate(`button('Add creature').disabled && Math.abs(value('Norm D')-1)<1e-10`));
  await evaluate(`button('Remove selected creature').click()`); await retry(() => evaluate(`document.querySelectorAll('input[name="world-creature"]').length===3`));
  check('Removing selected D deterministically selects remaining A', await evaluate(`document.querySelector('input[value="a"][name="world-creature"]').checked && inspect()===initialA`));
  await evaluate(`toggle('Show selected creature only');window.soloImage=document.querySelector('canvas').toDataURL();window.beforePaint=inspect();window.paintTime=value('Physical time');document.querySelector('input[value="barrier"][name="terrain-tool"]').click();document.querySelector('canvas').scrollIntoView({block:'center'})`);
  const p = await evaluate(`point(0,0)`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 });
  await retry(() => evaluate(`value('V maximum')>1.9`));
  check('Shared terrain paints in the aligned overlay without instant state/time change', await evaluate(`value('Physical time')===paintTime && inspect()===beforePaint && soloImage!==document.querySelector('canvas').toDataURL()`));
  await evaluate(`toggle('Show potential overlay')`); await sleep(100);
  check('Hiding terrain reveals the unchanged selected density', await evaluate(`soloImage===document.querySelector('canvas').toDataURL() && inspect()===beforePaint`));
  await evaluate(`window.terrainMass=value('Terrain ∫|V|');button('Play').click()`); await retry(() => evaluate(`value('Physical time')>0.15`));
  await evaluate(`button('Pause').click();button('Reset evolution').click()`); await retry(() => evaluate(`value('Physical time')===0`));
  check('Reset restores all current-roster states/moods while preserving terrain', await evaluate(`inspect()===initialA && value('Terrain ∫|V|')===terrainMass && document.querySelectorAll('input[name="world-creature"]').length===3`));
  await evaluate(`window.beforeClear=inspect();button('Clear terrain').click()`); await retry(() => evaluate(`value('Terrain ∫|V|')===0`));
  check('Clear terrain preserves creature state/mood/time', await evaluate(`inspect()===beforeClear && value('Physical time')===0`));
  await evaluate(`button('Play').click()`); await retry(() => evaluate(`value('Physical time')>0.15`));
  await evaluate(`window.liveTime=value('Physical time');document.querySelector('canvas').scrollIntoView({block:'center'})`);
  const livePoint = await evaluate(`point(1,1)`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...livePoint, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...livePoint, button: 'left', clickCount: 1 });
  await retry(() => evaluate(`value('V maximum')>1.8 && value('Physical time')>=liveTime`));
  check('Native painting during world playback preserves advancing time and every norm', await evaluate(`!button('Pause').disabled && value('Physical time')>=liveTime && ['Norm A','Norm B','Norm C'].every(label=>Math.abs(value(label)-1)<1e-10)`));
  await evaluate(`button('Pause').click();button('Clear terrain').click();button('Reset evolution').click()`); await sleep(120);
  for (const [name, sign] of [['attraction',-1],['repulsion',1]]) {
    await evaluate(`button('World: ${name}').click()`); await retry(() => evaluate(`document.querySelectorAll('input[name="world-creature"]').length===2 && value('Social V at mean')*${sign}>0.5`));
    check(`${name} preset restores reproducible moods and signed interaction`, await evaluate(`value('Physical time')===0 && value('Drive force x')===0 && value('Social V at mean')*${sign}>0.5`));
  }
  await evaluate(`button('World: independent').click()`); await sleep(100);
  check('Independent preset disables both mechanisms', await evaluate(`!document.querySelector('input[aria-label="Mood drives"]').checked && !document.querySelector('input[aria-label="Social interactions"]').checked`));
  await evaluate(`button('Play').click();button('2D Gaussian demo').click()`); await retry(() => evaluate(`!document.querySelector('.world-inspector') && !!document.querySelector('.density-2d')`));
  check('Switching to existing Gaussian mode cancels the world loop and preserves terrain controls/presets', await evaluate(`__pending.size===0 && !!button('Load scattering barrier') && value('Physical time')===0 && Math.abs(value('Probability norm')-1)<1e-10`));
  await evaluate(`button('Load scattering barrier').click();button('Play').click()`); await retry(() => evaluate(`value('Physical time')>0.1`));
  await evaluate(`button('2D creature world').click()`); await retry(() => evaluate(`!!document.querySelector('.world-inspector')`));
  await evaluate(`hideDecor()`); await sleep(100);
  check('Returning to the world starts a fresh two-creature world without duplicate loops', await evaluate(`__pending.size===0 && document.querySelectorAll('input[name="world-creature"]').length===2 && value('Physical time')===0`));
  await evaluate(`button('Entangle moods').click()`); await retry(() => evaluate(`document.body.textContent.includes('Pair pair-1')`));
  check('Bell preparation displays shared identity, purity 0.5, entropy 1 and safe deletion', await evaluate(`document.body.textContent.includes('Local purity: 0.500000') && document.body.textContent.includes('Entanglement entropy: 1.000000 bits') && button('Remove selected creature').disabled`));
  await evaluate(`window.entangledImage=document.querySelector('canvas').toDataURL();window.entangledTime=value('Physical time');button('Measure A').click();button('Measure B').click()`); await sleep(150);
  check('Z outcomes are recorded, correlated, and leave rendered spatial state and time unchanged', await evaluate(`(()=>{const text=document.querySelector('[aria-label="Mood outcome history"]').textContent,m=[...text.matchAll(/measured Z → ([01])/g)].map(m=>m[1]);return m.length===2&&m[0]===m[1]&&value('Physical time')===entangledTime&&document.querySelector('canvas').toDataURL()===entangledImage&&document.body.textContent.includes('Entanglement entropy: 0.000000 bits')})()`));
  await evaluate(`button('Reset evolution').click()`); await sleep(120);
  check('Reset restores Bell pair, maximal mixedness and empty measurement history', await evaluate(`document.body.textContent.includes('Local purity: 0.500000') && !document.querySelector('[aria-label="Mood outcome history"]').textContent.includes('measured')`));
  await evaluate(`(()=>{const select=document.querySelector('[aria-label="Mood measurement basis"]');select.value='X';select.dispatchEvent(new Event('change',{bubbles:true}));})()`); await sleep(100);
  await evaluate(`button('Measure A').click();button('Measure B').click()`); await sleep(120);
  check('X measurements show plus/minus outcomes and correlated partner', await evaluate(`(()=>{const text=document.querySelector('[aria-label="Mood outcome history"]').textContent,m=[...text.matchAll(/measured X → ([+−])/g)].map(m=>m[1]);return m.length===2&&m[0]===m[1]})()`));
  await evaluate(`button('Measure & Release').click()`); await sleep(120);
  check('Global release restores independent pure ownership and removal eligibility', await evaluate(`document.body.textContent.includes('Independent pure state') && document.body.textContent.includes('Local purity: 1.000000') && !button('Remove selected creature').disabled && document.querySelector('canvas').toDataURL()===entangledImage`));
  await evaluate(`button('World: entangled friendship').click()`); await sleep(120);
  check('Friendship preset prepares exactly one named Bell pair without automatic measurement', await evaluate(`document.body.textContent.includes('Pair friendship') && document.body.textContent.includes('Local purity: 0.500000') && document.querySelectorAll('input[name="world-creature"]').length===2 && !document.querySelector('[aria-label="Mood outcome history"]').textContent.includes('measured')`));
  await evaluate(`select('b')`); await sleep(100);
  check('Partner inspector shares pair identity and purity 0.5', await evaluate(`document.body.textContent.includes('Pair friendship · subsystem B · partner a') && document.body.textContent.includes('Local purity: 0.500000')`));
  await evaluate(`document.querySelector('input[value="barrier"][name="terrain-tool"]').click();document.querySelector('canvas').scrollIntoView({block:'center'})`);
  const pairedPoint = await evaluate(`point(-1,1)`);
  await send('Input.dispatchMouseEvent', { type:'mousePressed', ...pairedPoint, button:'left', clickCount:1 }); await send('Input.dispatchMouseEvent', { type:'mouseReleased', ...pairedPoint, button:'left', clickCount:1 });
  await retry(() => evaluate(`value('V maximum')>1.8`));
  check('Terrain remains editable with paired creatures and no automatic measurement', await evaluate(`value('Physical time')===0 && Math.abs(value('Norm A')-1)<1e-10 && !document.querySelector('[aria-label="Mood outcome history"]').textContent.includes('measured')`));
  await evaluate(`button('World: independent').click()`); await sleep(100);
  check('Independent preset removes stale pair membership', await evaluate(`document.body.textContent.includes('Independent pure state') && !button('Remove selected creature').disabled`));
  const performanceReport = await evaluate(`(async()=>{
    const core=await import('/@fs/'+${JSON.stringify(process.cwd().replaceAll('\\','/')+'/packages/sim-core/src/index.ts')});
    const {QuantumWorld2D}=await import('/src/world/world2d.ts'),{createWorldPreset2D}=await import('/src/world/worldPresets2d.ts');
    const {createCreatureRenderer2D}=await import('/src/render/creatures2d.ts');const g=core.createPsiGrid2D(),terrain=core.verticalBarrier2D(g,6,-.4,.4,.22),dt=1/120;
    const make=(count,coupled)=>{const options=createWorldPreset2D(g,'mood');if(count===1)options.creatures=options.creatures.slice(0,1);const w=new QuantumWorld2D(g,options);while(w.ids.length<count)w.addTemplate();w.setInteractions({drives:coupled,social:coupled});return w;};
    const measure=(fn,warm=30,count=200)=>{for(let k=0;k<warm;k++)fn();const t=performance.now();for(let k=0;k<count;k++)fn();return(performance.now()-t)/count;};
    const one=make(1,false),two=make(2,false),coupled=make(2,true),four=make(4,true);
    const oneStepMs=measure(()=>one.step(terrain,dt)),twoIndependentStepMs=measure(()=>two.step(terrain,dt)),twoCoupledStepMs=measure(()=>coupled.step(terrain,dt)),fourCoupledStepMs=measure(()=>four.step(terrain,dt));
    const snapshotMs=measure(()=>coupled.getSnapshot()),prepareIncludingObservablesMs=measure(()=>coupled.preparePotentials(terrain));
    const snapshot=coupled.getSnapshot(),outputs=snapshot.creatures.map(()=>new Float64Array(g.nx*g.ny)),workspaces=snapshot.creatures.map(()=>core.createInteractionWorkspace2D(g));
    const potentialConstructionMs=measure(()=>snapshot.creatures.forEach((c,i)=>core.composeEffectivePotential2D(g,terrain,c,snapshot.creatures,snapshot.interactions,outputs[i],workspaces[i])));
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=520;const ctx=canvas.getContext('2d'),draw=createCreatureRenderer2D(g,coupled);
    const twoRenderMs=measure(()=>draw(ctx,1000,520,coupled.selected,false),10,100),drawFour=createCreatureRenderer2D(g,four),fourRenderMs=measure(()=>drawFour(ctx,1000,520,four.selected,false),10,100);
    const bell=make(2,true);bell.prepareBellPair('bench','a','b');
    const mixed=make(4,true);mixed.prepareBellPair('ab','a','b');
    const double=make(4,true);double.prepareBellPair('ab','a','b');double.prepareBellPair('cd','c','d');
    const bellPairStepMs=measure(()=>bell.step(terrain,dt)),pairPlusIndependentStepMs=measure(()=>mixed.step(terrain,dt)),twoPairsStepMs=measure(()=>double.step(terrain,dt));
    const bellInspectorMs=measure(()=>bell.getSnapshot()),bellDraw=createCreatureRenderer2D(g,bell),bellRenderMs=measure(()=>bellDraw(ctx,1000,520,bell.selected,false),10,100);
    const commands=make(2,false);let serial=0;
    const preparationMeasurementReleaseMs=measure(()=>{const id='trial-'+serial++;commands.prepareBellPair(id,'a','b');commands.measurePair(id,'X');commands.measureAndRelease(id,'X');},10,100);
    const operationWorld=make(2,false);let prepareTotal=0,measureTotal=0,releaseTotal=0;
    for(let i=0;i<220;i++){const id='op-'+i;let t=performance.now();operationWorld.prepareBellPair(id,'a','b');const t1=performance.now();operationWorld.measurePair(id,'Z');const t2=performance.now();operationWorld.measureAndRelease(id,'Z');const t3=performance.now();if(i>=20){prepareTotal+=t1-t;measureTotal+=t2-t1;releaseTotal+=t3-t2;}}
    const pairPreparationMs=prepareTotal/200,sequentialMeasurementMs=measureTotal/200,productReleaseMs=releaseTotal/200;
    const checkWorld=make(2,true);checkWorld.prepareBellPair('continuity','a','b');checkWorld.step(terrain,dt);const before=checkWorld.ids.map(id=>checkWorld.spatialState(id).values),time=checkWorld.time,terrainBefore=terrain.slice();checkWorld.measurePair('continuity','X');
    const measurementBitContinuity=checkWorld.ids.every((id,i)=>checkWorld.spatialState(id).values.every((x,k)=>Object.is(x,before[i][k])))&&checkWorld.time===time&&terrain.every((x,i)=>x===terrainBefore[i]);
    if(!measurementBitContinuity)throw Error('Mood measurement changed spatial arrays/time/terrain');
    return{oneStepMs,twoIndependentStepMs,twoCoupledStepMs,fourCoupledStepMs,potentialConstructionMs,prepareIncludingObservablesMs,snapshotMs,twoRenderMs,fourRenderMs,bellPairStepMs,pairPlusIndependentStepMs,twoPairsStepMs,bellInspectorMs,bellRenderMs,preparationMeasurementReleaseMs,pairPreparationMs,sequentialMeasurementMs,productReleaseMs,measurementBitContinuity,userAgent:navigator.userAgent};
  })()`);
  console.log('128x128 warmed Chrome world benchmark', performanceReport);
  check('No browser runtime/console errors', errors.length===0);
  console.log(JSON.stringify({checks,errors},null,2));
} catch (error) { console.error('Browser errors observed:', JSON.stringify(errors, null, 2)); throw error; }
finally { socket?.close();chrome.kill();server.kill(); }
