// Shared production-page extension for 5E.3. All hooks live in the temporary
// audit build from projection-browser-check.mjs, never the shipped application.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export async function checkCreatureDesign({ evaluate, send, check, retry, sleep, out }) {
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await evaluate(`button('2D view').click();button('World: independent').click();
    window.sameQuantum=s=>{const n=capture();return s.controller===n.controller&&s.world===n.world&&s.time===n.time&&s.playing===n.playing&&s.owners===n.owners&&s.spatial.every((a,i)=>bytesEqual(a,n.spatial[i]))&&s.pairs.length===n.pairs.length&&s.pairs.every(([id,a],i)=>id===n.pairs[i][0]&&bytesEqual(a,n.pairs[i][1]));};
    window.samePhysics=s=>sameQuantum(s)&&bytesEqual(s.terrain,__controller.potential);
    window.designRng=0;const designRandom=__controller.world.moods.random;__controller.world.moods.random=()=>{designRng++;return designRandom();};
    window.saved=capture();document.querySelector('input[aria-label="Show creature decorations"]').click();`);
  await retry(() => evaluate(`stable()`));
  check('Names, distinct swatches, compact mood and identity survive enabling decorative overlays', await evaluate(`samePhysics(saved)&&designRng===0&&document.querySelector('.creature-summary').textContent.includes('Mochi')&&document.querySelector('.creature-summary').textContent.includes('Independent mood')&&[...document.querySelectorAll('input[name="world-creature"]')].every(i=>i.parentElement.textContent.includes(i.value==='a'?'Mochi':'Pip'))`));
  const key = async (name, code = name, virtual = 13, modifiers = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code, windowsVirtualKeyCode: virtual, modifiers, ...(name === 'Enter' ? { text: '\r' } : {}) }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode: virtual }); };
  const click = async p => { await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 }); };
  const physical = async (x, y) => evaluate(`(()=>{const r=document.querySelector('.density-2d').getBoundingClientRect(),g=__controller.psi;return{x:r.x+(${x}-g.xmin)/(g.xmax-g.xmin)*r.width,y:r.y+(g.ymax-${y})/(g.ymax-g.ymin)*r.height}})()`);
  const page = async name => {
    await evaluate(`(()=>{if(document.querySelector('.settings-trigger').getAttribute('aria-expanded')!=='true')document.querySelector('.settings-trigger').click();const back=button('← Back to menu');if(back?.getClientRects().length)back.click();button(${JSON.stringify(name)}).click();})()`);
    await retry(() => evaluate(`document.querySelector('.settings-page-heading h3').textContent===${JSON.stringify(name)}`));
  };
  await evaluate(`document.querySelector('[name="terrain-tool"][value="view"]').click();window.saved=capture()`);
  await click(await physical(1.5, 0)); await sleep(60);
  check('Native cloud click selects Pip without measuring, sampling or changing any amplitude', await evaluate(`__controller.world.selected==='b'&&samePhysics(saved)&&designRng===0`));
  await click(await physical(-8, 8));
  check('Empty/diffuse tails do not steal selection', await evaluate(`__controller.world.selected==='b'&&samePhysics(saved)&&designRng===0`));
  const cloudA = await physical(-1.5, 0), outside = await evaluate(`(()=>{const r=document.querySelector('.density-2d').getBoundingClientRect();return{x:r.left-10,y:r.top+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...cloudA, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...outside, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...outside, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...outside, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...cloudA, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...cloudA, button: 'left', clickCount: 1 });
  check('Leaving/re-entering the canvas cannot turn an outside drag into a stale selection', await evaluate(`__controller.world.selected==='b'&&samePhysics(saved)&&designRng===0`));
  await evaluate(`document.querySelector('select[aria-label="Selected creature"]').focus()`); await key('ArrowUp', 'ArrowUp', 38); await sleep(80);
  check('Keyboard creature-list alternative selects Mochi without changing quantum state', await evaluate(`__controller.world.selected==='a'&&samePhysics(saved)&&designRng===0`));
  await evaluate(`button('1D view').click()`); await retry(() => evaluate(`stable()`));
  const hill = await evaluate(`(()=>{const c=document.querySelector('.projection-1d'),r=c.getBoundingClientRect(),v={left:Math.min(52,c.clientWidth/5),right:c.clientWidth-Math.min(28,c.clientWidth/8),baseline:c.clientHeight*.65};return{x:r.x+v.left+11.5/20*(v.right-v.left),y:r.y+v.baseline-8}})()`);
  await click(hill); await sleep(80);
  check('Native marginal hill click selects the same Pip ID without measurement', await evaluate(`__controller.world.selected==='b'&&samePhysics(saved)&&designRng===0&&document.querySelector('.creature-summary').textContent.includes('Pip')`));
  await evaluate(`button('2D view').click()`); await retry(() => evaluate(`stable()`));
  await evaluate(`window.image=document.querySelector('.density-2d').toDataURL();window.saved=capture();document.querySelector('input[aria-label="Animate creature faces"]').click()`); await sleep(100);
  check('Paused/reduced-motion face redraw is static and touches neither state nor RNG', await evaluate(`samePhysics(saved)&&designRng===0&&document.querySelector('.density-2d').toDataURL()===image`));
  await evaluate(`document.querySelector('.settings-trigger').click()`); await sleep(80);
  check('Exactly eight discoverable sections share one top-right popover', await evaluate(`document.querySelectorAll('.settings-navigation button').length===8&&[...document.querySelectorAll('.settings-navigation button')].every(b=>b.getClientRects().length>0)&&document.querySelectorAll('.settings-popover:not([hidden])').length===1`));
  await evaluate(`button('Creatures').focus()`); await key('Enter'); await sleep(80);
  check('Keyboard navigation focuses the section heading, with no competing settings pages', await evaluate(`document.activeElement===document.querySelector('.settings-page-heading h3')&&document.activeElement.textContent==='Creatures'&&!!document.querySelector('input[name="world-creature"]').getClientRects().length&&!document.querySelector('[aria-label="Mood drives"]').getClientRects().length`));
  await evaluate(`document.querySelector('[aria-label="Close settings"]').focus()`); await key('Tab', 'Tab', 9, 8);
  await evaluate(`window.designBackwardTrap=document.activeElement===button('Remove selected creature')`); await key('Tab', 'Tab', 9);
  check('Section-level Tab and Shift-Tab stay inside the single popover', await evaluate(`designBackwardTrap&&document.activeElement.getAttribute('aria-label')==='Close settings'`));
  await evaluate(`button('← Back to menu').focus()`); await key('Enter'); await sleep(80);
  check('Back restores focus to its originating navigation control', await evaluate(`document.activeElement===button('Creatures')`));
  await key('Escape', 'Escape', 27); await sleep(80);
  check('Escape closes the navigation popover and restores Menu focus', await evaluate(`document.querySelector('.settings-popover').hidden&&document.activeElement===document.querySelector('.settings-trigger')`));
  await page('Experiments'); await evaluate(`window.saved=capture();button('Create a barrier').focus()`); await key('Enter'); await sleep(80);
  check('Create a barrier chooses the existing tool and Terrain page, without stamping', await evaluate(`samePhysics(saved)&&document.querySelector('.settings-page-heading h3').textContent==='Terrain'&&document.querySelector('[name="terrain-tool"][value="barrier"]').checked`));
  await key('Escape', 'Escape', 27); await click(await physical(-3, 2)); await sleep(80);
  check('Native barrier painting preserves spatial/mood state and changes only shared terrain', await evaluate(`sameQuantum(saved)&&__controller.potential.some(v=>v>0)&&designRng===0`));
  await page('Experiments'); await evaluate(`button('Build a well').click()`); await sleep(80); await key('Escape', 'Escape', 27);
  await evaluate(`window.saved=capture()`); await click(await physical(3, 2)); await sleep(80);
  check('Friendly well action retains signed terrain editing and quantum continuity', await evaluate(`sameQuantum(saved)&&__controller.potential.some(v=>v<0)&&designRng===0`));
  await page('Terrain'); await evaluate(`document.querySelector('[name="terrain-tool"][value="view"]').click()`); await key('Escape', 'Escape', 27);
  await evaluate(`window.linkCount=()=>{const c=__controller,canvas=document.createElement('canvas');canvas.width=canvas.height=600;const ctx=canvas.getContext('2d'),body=__renderField(c.psi,c.world);body(ctx,600,600,c.world.selected,false);let links=0;const line=ctx.lineTo.bind(ctx);ctx.lineTo=(...args)=>{if(ctx.getLineDash().join(',')==='3,5')links++;line(...args);};__renderDecoration(c.psi)(ctx,600,600,body.layers,c.world.getSnapshot(),c.world.selected,false,true,0,false);return links;};window.saved=capture();`);
  check('Independent creatures have no friendship connection', await evaluate(`linkCount()===0`));
  await page('Moods & friendships'); await evaluate(`button('Entangle moods').focus()`); await key('Enter'); await sleep(80);
  check('Explicit friendship registers a real pair and static connection without spatial change', await evaluate(`__controller.world.getSnapshot().pairs.length===1&&linkCount()===1&&designRng===0&&saved.spatial.every((a,i)=>bytesEqual(a,capture().spatial[i]))&&document.querySelector('.creature-summary').textContent.includes('∞ Mood pair')&&button('Remove selected creature').disabled`));
  await evaluate(`button('Measure A').click()`); await sleep(80);
  check('Only explicit mood observation samples; product pairs stay registered and connected', await evaluate(`designRng===1&&linkCount()===1&&__controller.world.getSnapshot().pairs[0].entropy===0&&saved.spatial.every((a,i)=>bytesEqual(a,capture().spatial[i]))`));
  await evaluate(`button('Measure & Release').click()`); await sleep(80);
  check('Measure & Release removes pair indication/connection and restores safe deletion', await evaluate(`linkCount()===0&&__controller.world.getSnapshot().pairs.length===0&&!button('Remove selected creature').disabled&&document.querySelector('.creature-summary').textContent.includes('Independent mood')`));
  await page('Advanced');
  check('Advanced spatial/Bloch/purity/entropy/pair/outcome diagnostics remain visible and finite', await evaluate(`(()=>{const d=document.querySelector('[aria-label="Selected 2D creature diagnostics"]');return !!d.getClientRects().length&&['Mean x:','Selected σx:','Bloch x:','Selected local purity:','Selected entanglement entropy:','Selected pair identity:','Last recorded mood outcome:'].every(s=>d.textContent.includes(s))&&!d.textContent.includes('NaN')&&!!document.querySelector('[aria-label="2D simulation diagnostics"]').getClientRects().length;})()`));
  await page('Physics notebook');
  check('Existing model/projection notes and non-measurement/non-signalling overlay explanation are discoverable', await evaluate(`['not particles or sampled measurements','not force, transport or communication','not a standalone 1D wavefunction'].every(t=>document.querySelector('.settings-popover').textContent.includes(t))&&!!document.querySelector('#creature-display-help').getClientRects().length`));
  await page('Creatures'); await evaluate(`window.removedId=__controller.world.selected;button('Remove selected creature').click();button('Add creature').click()`); await sleep(80);
  check('Deletion/re-addition preserves deterministic identity and release safeguards', await evaluate(`__controller.world.ids.length===2&&__controller.world.selected===removedId&&document.querySelector('.creature-summary').textContent.includes(removedId==='a'?'Mochi':'Pip')&&linkCount()===0`));
  await key('Escape', 'Escape', 27);
  await send('Emulation.setEmulatedMedia', { features: [] });
  await evaluate(`(()=>{const input=document.querySelector('[aria-label="Animate creature faces"]');if(!input.checked)input.click();const c=__controller,w=c.world;window.designStartSteps=c.steps;window.designTerrain=c.potential;window.designReference=new w.constructor(c.psi,{creatures:w.ids.map(id=>w.state(id)),interactions:w.getSnapshot().interactions});designReference.select(w.selected);window.designRngBeforePlay=designRng;button('Play').click();})()`);
  await retry(() => evaluate(`__controller.world.time>.15`)); await evaluate(`button('1D view').click()`); await retry(() => evaluate(`stable()`));
  await evaluate(`button('2D view').click()`); await retry(() => evaluate(`stable()`)); await evaluate(`button('Pause').click()`);
  check('Animated overlays and both live views preserve exact committed-step evolution and RNG', await evaluate(`(()=>{const c=__controller;for(let k=0;k<c.steps-designStartSteps;k++)designReference.step(designTerrain,c.dt);return designReference.time===c.world.time&&designRng===designRngBeforePlay&&c.world.ids.every(id=>bytesEqual(designReference.spatialState(id).values,c.world.spatialState(id).values)&&bytesEqual(designReference.state(id).mood.values,c.world.state(id).mood.values));})()`));
  // Bounded isolated synchronous Canvas draw cost, not simulation throughput or
  // a claim about compositor/FPS. Identical density/terrain work in both arms.
  const probe = async () => evaluate(`(()=>{const c=__controller,canvas=document.createElement('canvas');canvas.width=canvas.height=600;const ctx=canvas.getContext('2d'),body=__renderField(c.psi,c.world),terrain=__renderTerrain(c.psi,c),decorate=__renderDecoration(c.psi),snapshot=c.world.getSnapshot(),state=capture(),off=[],on=[];
    const draw=show=>{body(ctx,600,600,c.world.selected,false);terrain.draw(ctx,600,600,true,.6);if(show)decorate(ctx,600,600,body.layers,snapshot,c.world.selected,false,false,performance.now(),true);};
    for(let i=0;i<20;i++)draw(i%2===0);
    for(let i=0;i<100;i++){const show=i%4===0||i%4===3,t=performance.now();draw(show);(show?on:off).push(performance.now()-t);}
    const stats=a=>{a.sort((x,y)=>x-y);return{samples:a.length,medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)]};};return{creatures:c.world.ids.length,without:stats(off),with:stats(on),samePhysics:samePhysics(state),rngDraws:designRng};})()`);
  const two = await probe();
  await page('Creatures'); await evaluate(`button('Add creature').click();button('Add creature').click()`); await sleep(80);
  check('All four names/colors are stable and the roster remains bounded', await evaluate(`__controller.world.ids.length===4&&button('Add creature').disabled&&['Mochi','Pip','Lumi','Nori'].every(n=>document.querySelector('.world-inspector').textContent.includes(n))&&new Set([...document.querySelectorAll('.world-inspector .creature-swatch')].map(s=>s.style.backgroundColor)).size===4`));
  await key('Escape', 'Escape', 27);
  const four = await probe();
  check('Two/four-creature rendering probes preserve every state component and sample no outcomes', two.samePhysics && four.samePhysics && two.rngDraws === four.rngDraws);
  check('Decoration median draw overhead stays below the bounded 2 ms four-creature budget', two.with.medianMs - two.without.medianMs < 2 && four.with.medianMs - four.without.medianMs < 2);
  const performance = { note: 'Isolated synchronous Canvas2D rendering at 600x600; not physical/wall throughput, compositor time or sustained FPS.', two, four };
  await writeFile(join(out, 'creature-design-results.json'), JSON.stringify(performance, null, 2)); console.log('CREATURE RENDER COST', JSON.stringify(performance));
  // Exercise the friendly action as a real separate legacy experiment, then
  // return before the shared legacy lifecycle assertions below.
  await page('Experiments'); await evaluate(`window.beforeWatchRegistrations=__registrations;button('Watch scattering').click()`); await retry(() => evaluate(`!__controller.world&&__controller.terrainRevision>0`));
  check('Watch scattering opens the actual paused standalone scattering experiment', await evaluate(`!__controller.playing&&__controller.snapshot().experiment.toLowerCase().includes('scattering')&&__controller.potential.some(v=>v>0)&&__registrations===beforeWatchRegistrations+1`));
  await evaluate(`button('2D view').click()`); await retry(() => evaluate(`!!__controller.world`));
  check('Returning from an explicit experiment starts exactly one fresh terrarium', await evaluate(`__registrations===beforeWatchRegistrations+2&&__controller.world.time===0`));
  return performance;
}
