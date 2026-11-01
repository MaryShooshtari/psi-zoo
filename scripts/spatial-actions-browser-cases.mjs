import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Real mounted React/native/Canvas path. Scene replacement and rare failures
 * explicitly use audit-only access; hand-prepared scenes are not evolved physics. */
export async function checkSpatialActions({ evaluate: rawEvaluate, send, check, retry, sleep, out }) {
  // Setup assignments retain full checkpoints in the browser. Do not return a
  // controller/world/typed-array graph through CDP merely as an unused result.
  // Only primitives, bounded receipts and {x,y} pointer locations cross back.
  const evaluate = expression => rawEvaluate(`(()=>{const value=eval(${JSON.stringify(expression)});return value&&typeof value==='object'&&!('kind' in value)&&!('x' in value&&'y' in value)?null:value;})()`);
  await retry(() => evaluate('!!window.__actions'));
  const key = async (key, code = key, virtual = 27, modifiers = 0) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtual, modifiers, ...(key === 'Enter' ? { text: '\r' } : {}) });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtual, modifiers });
  };
  const press = p => send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 });
  const release = p => send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 });
  const click = async p => { await press(p); await release(p); await sleep(30); };
  const visibleClick = async selector => {
    const p = await evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.getClientRects().length&&!e.disabled);if(!el)throw Error('No visible enabled '+${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await click(p);
  };
  const textClick = async text => {
    const p = await evaluate(`(()=>{const el=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)}&&e.getClientRects().length&&!e.disabled);if(!el)throw Error('No visible enabled button '+${JSON.stringify(text)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await click(p);
  };
  const closeMenu = async () => { if (await evaluate(`!document.querySelector('.settings-popover').hidden`)) await key('Escape'); await sleep(20); };
  const page = async name => {
    if (await evaluate(`document.querySelector('.settings-popover').hidden`)) await textClick('Menu ☰');
    if (await evaluate(`!document.querySelector('.settings-page-heading').hidden`)) await textClick('← Back to menu');
    const pairSettings = name === 'Moods & friendships';
    name = ({ Display: 'Appearance', 'Moods & friendships': 'Creatures', 'Physics notebook': 'Science notebook', Advanced: 'Science notebook' })[name] ?? name;
    if (['Measure position','Entangle moods','Measure mood'].includes(name)) await visibleClick('[data-settings-link="Experiments"]');
    if (name === 'Draw terrain') await visibleClick('[data-settings-link="Terrain"]');
    await visibleClick(`[data-settings-link="${name}"]`);
    if (pairSettings) await evaluate(`document.querySelector('.advanced-simulation').open=true`);
  };
  const choose = async (label, value) => { await evaluate(`(()=>{const e=document.querySelector('select[aria-label=${JSON.stringify(label)}]');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`); await sleep(20); };
  const fresh = async (view = '2d') => {
    await closeMenu(); await evaluate(`button('World: independent').click();button('Clear terrain').click();button('${view === '1d' ? '1D view' : '2D view'}').click()`);
    await retry(() => evaluate('stable()')); await sleep(40);
  };
  const arm = async mode => { await page(mode); await textClick('Arm on canvas'); await retry(() => evaluate(`document.querySelector('.settings-popover').hidden`)); };
  const xyPoint = async (x = -1.5, y = 0) => evaluate(`(()=>{const r=document.querySelector('.density-2d').getBoundingClientRect(),g=__controller.psi;const scale=Math.min(r.width/(g.xmax-g.xmin),r.height/(g.ymax-g.ymin));return{x:r.x+(r.width-(g.xmax-g.xmin)*scale)/2+(${x}-g.xmin)*scale,y:r.y+(r.height-(g.ymax-g.ymin)*scale)/2+(g.ymax-${y})*scale};})()`);
  const hillPoint = async (physicalX = -1.5) => evaluate(`(()=>{const c=document.querySelector('.projection-1d'),r=c.getBoundingClientRect(),left=Math.min(52,c.clientWidth/5),right=c.clientWidth-Math.min(28,c.clientWidth/8);const g=__controller.psi;return{x:r.x+left+(${physicalX}-g.xmin)/(g.xmax-g.xmin)*(right-left),y:r.y+c.clientHeight*.65-6};})()`);
  const receipt = () => evaluate('__controller.world.lastAction');
  const draws = () => evaluate('__controller.world.getSnapshot().spatialDrawCount');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await evaluate(`window.actionProtected=()=>{const c=__controller,w=c.world;return{world:w,controller:c,time:w.time,playing:c.playing,spatial:w.ids.map(id=>w.spatialState(id).values),terrain:c.potential,owners:JSON.stringify([...w.moods.owners].map(([id,o])=>[id,o.kind,o.kind==='independent'?[...o.state.values]:[o.pairId,o.subsystem]])),pairs:[...w.moods.pairs].map(([id,p])=>[id,p.state.amplitudes.slice()]),receipt:w.lastAction,draws:w.getSnapshot().spatialDrawCount};};
    window.protectedSame=(s,exceptSpatial=false)=>{const n=actionProtected();return s.world===n.world&&s.controller===n.controller&&s.time===n.time&&s.playing===n.playing&&bytesEqual(s.terrain,n.terrain)&&s.owners===n.owners&&s.pairs.length===n.pairs.length&&s.pairs.every(([id,a],i)=>id===n.pairs[i][0]&&bytesEqual(a,n.pairs[i][1]))&&(exceptSpatial||s.spatial.every((a,i)=>bytesEqual(a,n.spatial[i])));};
    window.actionRequest=command=>({token:__actions.owner.token,source:'native',command});`);
  await fresh();
  check('Action-first home, single persistent science trigger and no main bottom picker', await evaluate(`(()=>{const links=[...document.querySelectorAll('.settings-home-actions button')].map(b=>b.dataset.settingsLink);return document.querySelectorAll('.settings-navigation > button').length===5&&links.includes('Measure position')&&document.querySelectorAll('.museum-trigger').length===1&&!document.querySelector('.context-help')&&!document.querySelector('select[aria-label="Selected creature"]')&&!!button('Clear terrain');})()`));
  await page('Measure position');
  check('Opening native position form has empty target, correct axes/width and no canvas arming', await evaluate(`__actions.owner.state.mode==='spatial'&&__actions.owner.state.route==='native'&&document.querySelector('select[aria-label="Position target"]').value===''&&document.querySelector('input[aria-label="Position detector width"]').value==='0.4'&&document.querySelector('form button[type="submit"]').disabled&&__controller.world.lastAction===null`));
  await choose('Position target', 'a'); await closeMenu();
  const p = await xyPoint(); await click(p);
  check('Closing native draft does not implicitly arm a cloud click', await evaluate('__controller.world.lastAction===null&&__controller.world.getSnapshot().spatialDrawCount===0'));
  await page('Measure position'); await choose('Position target', 'a');
  await evaluate('window.savedAction=actionProtected()');
  await textClick('Apply x/y position measurement');
  check('Native x/y commits once, consumes two draws and preserves clock/terrain/moods/controller', await evaluate(`__controller.world.lastAction.axes==='xy'&&__controller.world.lastAction.targetId==='a'&&__controller.world.getSnapshot().spatialDrawCount===2&&protectedSame(savedAction,true)&&bytesEqual(savedAction.spatial[1],__controller.world.spatialState('b').values)&&__actions.owner.state.mode==='inspect'`));
  check('Native success closes menu, hands focus to stable result and retains historical text', await evaluate(`document.querySelector('.settings-popover').hidden&&document.activeElement===document.querySelector('.action-result-region')&&document.querySelector('[data-action-sequence]').textContent.includes('x/y detector')&&document.querySelector('[data-action-sequence]').textContent.includes('recorded at t=0.000')`));
  await evaluate(`window.nativeState=__controller.world.spatialState('a').values;window.nativeReceipt=__controller.world.lastAction`);
  await fresh(); await arm('Measure position');
  check('Explicit arming closes trap before focusing instructions', await evaluate(`document.activeElement===document.querySelector('.action-result-region')&&__actions.owner.state.route==='canvas'`));
  await click(await xyPoint());
  check('Clear canvas and native target produce identical seeded posterior/receipt', await evaluate(`bytesEqual(nativeState,__controller.world.spatialState('a').values)&&JSON.stringify(nativeReceipt)===JSON.stringify(__controller.world.lastAction)`));
  const before = await draws(); await click(await xyPoint());
  check('Success disarms; a second ordinary click cannot repeat the detector', await draws() === before);
  await fresh(); await page('Measure position');
  await evaluate(`document.querySelector('select[aria-label="Position target"]').focus()`); await key('ArrowDown', 'ArrowDown', 40); await sleep(30);
  await evaluate(`document.querySelector('form button[type="submit"]').focus()`); await key('Enter', 'Enter', 13); await sleep(40);
  check('Native target selection and Apply work by keyboard, once and without fallback', await evaluate(`__controller.world.lastAction?.targetId==='a'&&__controller.world.getSnapshot().spatialDrawCount===2&&document.querySelector('.settings-popover').hidden`));
  await arm('Measure position'); await textClick('Menu ☰'); await key('Escape');
  check('First Escape closes only the menu; second Escape cancels the active draft', await evaluate(`document.querySelector('.settings-popover').hidden&&__actions.owner.state.mode==='spatial'&&__actions.owner.state.route==='canvas'`));
  await key('Escape'); check('Escape cancellation never measures', await evaluate(`__controller.world.getSnapshot().spatialDrawCount===2&&__actions.owner.state.mode==='inspect'`));
  await fresh('1d'); await page('Measure position'); await choose('Position target', 'a');
  await textClick('Apply x-only position measurement');
  check('Marginal action consumes one draw, updates full state and reports no measured y', await evaluate(`__controller.world.lastAction.axes==='x'&&!('y' in __controller.world.lastAction)&&__controller.world.getSnapshot().spatialDrawCount===1&&document.querySelector('[data-action-sequence]').textContent.includes('no measured y')&&!document.querySelector('[data-action-sequence]').textContent.includes(', y=')`));
  await evaluate('window.xOnly=__controller.world.spatialState("a").values;button("2D view").click()'); await retry(() => evaluate('stable()'));
  check('Return to 2D preserves the same full x-conditioned state', await evaluate('bytesEqual(xOnly,__controller.world.spatialState("a").values)'));
  await fresh('1d'); await arm('Measure position'); await click(await hillPoint());
  check('An unambiguous plotted hill uses the same full-state x detector', await evaluate(`bytesEqual(xOnly,__controller.world.spatialState('a').values)&&__controller.world.getSnapshot().spatialDrawCount===1`));
  await fresh(); await arm('Measure position'); const armed = await evaluate('__actions.owner.state.token.epoch');
  await click(await xyPoint(-8, 4));
  check('Empty canvas miss keeps the exact armed epoch and consumes nothing', await evaluate(`__actions.owner.state.route==='canvas'&&__actions.owner.state.token.epoch===${armed}&&__controller.world.getSnapshot().spatialDrawCount===0&&document.querySelector('.action-feedback').textContent.includes('No visible cloud')`));
  const drag = await xyPoint(); await press(drag); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: drag.x + 30, y: drag.y, button: 'left', buttons: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...drag, button: 'left', buttons: 1 }); await release(drag);
  check('Drag out and back is not a click or a measurement', await draws() === 0);
  for (const cancellation of ['pointercancel', 'pointerleave', 'lostpointercapture', 'blur', 'reset', 'view', 'tool', 'roster', 'world']) {
    await fresh(); await arm('Measure position'); const at = await xyPoint(); await press(at);
    await evaluate(`(()=>{const canvas=document.querySelector('.density-2d');${({ pointercancel: `canvas.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1}));`, pointerleave: `canvas.dispatchEvent(new PointerEvent('pointerleave',{pointerId:1}));`, lostpointercapture: `canvas.dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:1}));`, blur: `window.dispatchEvent(new Event('blur'));`, reset: `button('Reset evolution').click();`, view: `button('1D view').click();`, tool: `__actions.owner.open('inspect');`, roster: `button('Add creature').click();`, world: `button('World: independent').click();` })[cancellation]}})()`);
    await release(at); await sleep(30);
    check(`Pending down/up invalidated by ${cancellation}, without sampling`, await draws() === 0);
  }
  await fresh(); await arm('Measure position');
  const at = await xyPoint(); await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at, button: 'right', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at, button: 'right', clickCount: 1 });
  check('Wrong mouse button cannot execute', await draws() === 0);
  await evaluate(`(()=>{const c=document.querySelector('.density-2d'),r=c.getBoundingClientRect();c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:70,isPrimary:false,button:0,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));c.dispatchEvent(new PointerEvent('pointerup',{pointerId:70,isPrimary:false,button:0,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));})()`);
  check('Non-primary pointer cannot execute', await draws() === 0);
  // Hand-prepared identical independent densities; no evolution/interference claim.
  await fresh(); await evaluate(`(()=>{const c=__controller,w=c.world,a=w.state('a'),b=w.state('b');b.psi.values.set(a.psi.values);c.worldModel=new w.constructor(c.psi,{creatures:[a,b],interactions:w.getSnapshot().interactions});c.publish();__actions.refresh();})()`);
  await arm('Measure position'); await click(await xyPoint());
  check('Overlapping visible clouds never pick the selected/largest/lexical target', await evaluate(`__controller.world.getSnapshot().spatialDrawCount===0&&__actions.owner.state.route==='canvas'&&document.querySelector('.action-feedback').textContent.includes('ambiguous')`));
  await page('Display'); await visibleClick('input[aria-label="Show selected creature only"]'); await closeMenu();
  await arm('Measure position'); await click(await xyPoint());
  check('Selected-only visibility affects canvas candidates, not native eligibility', await evaluate(`__controller.world.getSnapshot().spatialDrawCount===2&&__controller.world.lastAction.targetId==='a'`));
  await page('Measure position'); await choose('Position target', 'b');
  check('Hidden native density is explicitly named, not silently substituted', await evaluate(`document.querySelector('select[aria-label="Position target"] option[value="b"]').textContent.includes('density hidden')`));
  await textClick('Apply x/y position measurement'); check('Hidden native target executes only the explicitly named creature', (await receipt()).targetId === 'b');
  await page('Display'); await visibleClick('input[aria-label="Show selected creature only"]'); await closeMenu();
  await fresh(); await evaluate(`(()=>{const c=__controller,w=c.world,a=w.state('a'),b=w.state('b');b.psi.values.set(a.psi.values);c.worldModel=new w.constructor(c.psi,{creatures:[a,b],interactions:w.getSnapshot().interactions});c.publish();__actions.refresh();})()`);
  await evaluate(`button('1D view').click()`); await retry(() => evaluate('stable()')); await arm('Measure position'); await click(await hillPoint());
  check('Identical overlapping hills remain ambiguous; no selected-ID fallback', await draws() === 0);
  await evaluate(`button('2D view').click()`); await retry(() => evaluate('stable()'));
  await evaluate(`__controller.world.addTemplate();__controller.world.prepareBellPair('foreground','a','c');__actions.refresh()`);
  await arm('Entangle moods'); await click(await xyPoint());
  check('Mood eligibility never clicks through an ineligible overlapping foreground cloud', await evaluate(`__actions.owner.state.firstTarget===null&&__controller.world.getSnapshot().pairs.length===1&&__controller.world.getSnapshot().spatialDrawCount===0`));
  await fresh(); await arm('Entangle moods'); await evaluate('window.beforeFirst=actionProtected()'); await click(await xyPoint());
  check('First entangle canvas target changes no physics/ownership/RNG', await evaluate(`__actions.owner.state.firstTarget.id==='a'&&protectedSame(beforeFirst)&&__controller.world.lastAction===null`));
  await click(await xyPoint(1.5));
  check('Second explicit entangle target prepares one ordered joint Bell state without draws', await evaluate(`__controller.world.lastAction.kind==='mood-prepare'&&__controller.world.lastAction.creatureAId==='a'&&__controller.world.lastAction.creatureBId==='b'&&__controller.world.getSnapshot().spatialDrawCount===0&&__controller.world.getSnapshot().pairs[0].entropy===1`));
  await evaluate(`window.canvasBell=JSON.stringify(__controller.world.lastAction);window.bellSpatial=__controller.world.ids.map(id=>__controller.world.spatialState(id).values)`);
  await fresh(); await page('Entangle moods'); await choose('Entanglement first target', 'a');
  check('Native preparation refuses until both explicit ordered targets exist', await evaluate(`document.querySelector('form button[type="submit"]').disabled&&__controller.world.getSnapshot().pairs.length===0`));
  await choose('Entanglement second target', 'b'); await textClick('Apply ordered Bell preparation');
  check('Native and canvas ordered Bell preparation agree exactly', await evaluate(`JSON.stringify(__controller.world.lastAction)===canvasBell&&bellSpatial.every((v,i)=>bytesEqual(v,__controller.world.spatialState(__controller.world.ids[i]).values))`));
  await page('Measure mood'); await choose('Mood action pair', 'pair-1'); await choose('Mood action target', 'b'); await choose('Mood action basis', 'X');
  await evaluate('window.pairedBefore=actionProtected()'); await textClick('Apply mood measurement');
  check('Explicit paired mood action records actual target/basis and preserves every spatial byte', await evaluate(`__controller.world.lastAction.kind==='mood-measure'&&__controller.world.lastAction.targetId==='b'&&__controller.world.lastAction.basis==='X'&&pairedBefore.spatial.every((v,i)=>bytesEqual(v,__controller.world.spatialState(__controller.world.ids[i]).values))&&__controller.world.getSnapshot().spatialDrawCount===0`));
  await page('Measure mood'); await choose('Mood action pair', 'pair-1'); await choose('Mood action basis', 'X'); await textClick('Arm on canvas');
  await click(await xyPoint());
  check('Armed mood canvas action uses the explicitly named registered pair and actual hit target', await evaluate(`__controller.world.lastAction.kind==='mood-measure'&&__controller.world.lastAction.targetId==='a'&&__controller.world.lastAction.basis==='X'&&__controller.world.getSnapshot().spatialDrawCount===0`));
  await page('Measure position'); await choose('Position target', 'b'); await evaluate('window.pairedState=actionProtected()'); await textClick('Apply x/y position measurement');
  check('A paired spatial target preserves its joint mood amplitudes/ownership exactly', await evaluate(`protectedSame(pairedState,true)&&__controller.world.lastAction.targetId==='b'`));
  await page('Moods & friendships'); await textClick('Measure both sequentially');
  check('Sequential pair action produces one receipt with two actual outcomes', await evaluate(`__controller.world.lastAction.kind==='mood-measure-pair'&&__controller.world.lastAction.events.filter(e=>e.type==='measure').length===2`));
  await page('Moods & friendships'); await textClick('Measure & Release');
  check('Product release invents no measurement; restores ownership and records the coordinated action', await evaluate(`__controller.world.lastAction.kind==='mood-release'&&__controller.world.lastAction.events.filter(e=>e.type==='measure').length===0&&__controller.world.getSnapshot().pairs.length===0`));
  // Guard and failure injections are audit-only. Real underflow and scheduler
  // fixtures also run independently in the unchanged core/world unit suites.
  await fresh(); await evaluate(`window.staleRequest=actionRequest({kind:'spatial',targetId:'a',axes:'xy',resolution:.4});__actions.owner.open('inspect');window.guardBefore=actionProtected();window.guardCore=window.__spatialCoreCalls||0;window.staleResult=__actions.run(staleRequest)`);
  check('Stale epoch rejects before core execution and preserves state/playback/draws', await evaluate(`staleResult.reason==='stale-intent'&&protectedSame(guardBefore)&&__controller.world.getSnapshot().spatialDrawCount===0&&(__spatialCoreCalls||0)===guardCore`));
  await evaluate(`window.oldNative=actionRequest({kind:'spatial',targetId:'b',axes:'xy',resolution:.4});__actions.run(actionRequest({kind:'remove',targetId:'b'}));__actions.run(actionRequest({kind:'add'}));window.reused=__actions.run(oldNative)`);
  check('Delete/re-add same ID does not repair a captured native token', await evaluate(`reused.reason==='stale-intent'&&__controller.world.ids.includes('b')&&__controller.world.getSnapshot().spatialDrawCount===0`));
  await fresh(); await evaluate(`window.badResults=[{kind:'spatial',targetId:'a',axes:'xy',resolution:.19},{kind:'spatial',targetId:'missing',axes:'xy',resolution:.4},{kind:'entangle',creatureAId:'a',creatureBId:'a'},{kind:'mood-single',pairId:'missing',targetId:'a',basis:'Z'}].map(command=>__actions.run(actionRequest(command)))`);
  check('Invalid width, missing target, same-target and wrong-pair guards consume no draws', await evaluate(`badResults.every(r=>r.status==='rejected'&&r.drawsConsumed===0)&&__controller.world.getSnapshot().spatialDrawCount===0`));
  await fresh(); await evaluate(`__actions.run(actionRequest({kind:'spatial',targetId:'a',axes:'xy',resolution:.4}));window.previousReceipt=__controller.world.lastAction`);
  for (const consumed of [0, 1, 2]) {
    await evaluate(`window.failureBefore=actionProtected();window.__spatialFault=${consumed};window.failed=__actions.run(actionRequest({kind:'spatial',targetId:'a',axes:'xy',resolution:.4}))`);
    check(`Handled posterior failure retains ${consumed} actual draws, prior receipt and committed state`, await evaluate(`failed.status==='failed'&&failed.drawsConsumed===${consumed}&&protectedSame(failureBefore)&&__controller.world.lastAction===previousReceipt&&__controller.world.getSnapshot().spatialDrawCount===failureBefore.draws+${consumed}&&__actions.owner.state.mode==='inspect'`));
  }
  await fresh(); await evaluate(`window.beforeDisplay=actionProtected();window.originalSnapshot=__controller.snapshot;__controller.snapshot=function(){throw Error('Audit publication fault');};window.displayFailed=__actions.run(actionRequest({kind:'spatial',targetId:'a',axes:'xy',resolution:.4}));__controller.snapshot=originalSnapshot;window.appliedReceipt=__controller.world.lastAction;window.appliedState=__controller.world.spatialState('a').values;window.drawsBeforeRedraw=__controller.world.getSnapshot().spatialDrawCount`);
  await sleep(30);
  check('Postcommit publication failure stays applied, retains result line and does not pause', await evaluate(`displayFailed.status==='applied'&&displayFailed.publication==='display-failed'&&protectedSame(beforeDisplay,true)&&document.querySelector('[data-action-sequence]').getAttribute('data-action-sequence')===String(appliedReceipt.sequence)&&!!button('Redraw committed result — do not measure again')`));
  await textClick('Redraw committed result — do not measure again');
  check('Redraw retries publication only, never detector/RNG/receipt/committed state', await evaluate(`__controller.world.lastAction===appliedReceipt&&bytesEqual(appliedState,__controller.world.spatialState('a').values)&&__controller.world.getSnapshot().spatialDrawCount===drawsBeforeRedraw`));
  await fresh(); await evaluate(`button('Play').click()`); await retry(() => evaluate('__controller.world.time>0'));
  await evaluate(`window.scheduleBefore={frame:__controller.frameId,accumulator:__controller.accumulator,generation:__controller.generation,previous:__controller.previous};window.running=__actions.run(actionRequest({kind:'spatial',targetId:'a',axes:'xy',resolution:.4}));window.scheduleAfter={frame:__controller.frameId,accumulator:__controller.accumulator,generation:__controller.generation,previous:__controller.previous};window.runningPreserved=__controller.playing&&JSON.stringify(scheduleBefore)===JSON.stringify(scheduleAfter)`);
  check('Running action preserves actual pending rAF, accumulator, generation and previous timestamp', await evaluate(`running.status==='applied'&&runningPreserved`));
  await evaluate(`window.runningSnapshot=__controller.snapshot;__controller.snapshot=function(){throw Error('Audit running publication fault');};window.runningFault=__actions.run(actionRequest({kind:'spatial',targetId:'a',axes:'xy',resolution:.4}));__controller.snapshot=runningSnapshot;window.noPauseAfterFault=__controller.playing;window.drawCountRunning=__controller.world.getSnapshot().spatialDrawCount;__actions.executor.redraw();window.noReplayRunning=__controller.world.getSnapshot().spatialDrawCount===drawCountRunning`);
  check('Publication failure and redraw while running neither pause nor replay', await evaluate(`runningFault.status==='applied'&&runningFault.publication==='display-failed'&&noPauseAfterFault&&noReplayRunning`));
  await evaluate(`button('Pause').click()`);
  await fresh('1d'); await evaluate(`button('Play').click()`); await retry(() => evaluate('__controller.world.time>0'));
  await evaluate(`window.runningX=__actions.run(actionRequest({kind:'spatial',targetId:'a',axes:'x',resolution:.4}));window.runningXDraws=__controller.world.getSnapshot().spatialDrawCount;button('Pause').click()`);
  check('Running x-only measurement consumes one draw and preserves playback until explicit Pause', await evaluate(`runningX.status==='applied'&&runningX.receipt.axes==='x'&&runningXDraws===1`));
  await fresh(); await evaluate(`__actions.run(actionRequest({kind:'remove',targetId:'b'}));window.gaussianBefore=__actions.knownGaussian();__actions.run(actionRequest({kind:'spatial',targetId:'a',axes:'xy',resolution:.4}));__actions.run(actionRequest({kind:'select',targetId:'a'}));button('Clear terrain').click();window.gaussianAfter=__actions.knownGaussian()`);
  check('Time-zero position update invalidates Gaussian provenance permanently until explicit reset/setup', await evaluate(`gaussianBefore===true&&gaussianAfter===false&&__controller.world.time===0`));
  await textClick('What am I seeing?');
  check('Science shows chronological spatial result, not free-Gaussian or old mood explanation', await evaluate(`document.querySelector('dialog[open]').textContent.includes('Last session action: x/y position measurement')&&!document.querySelector('dialog[open]').textContent.includes('Free Gaussian spreading')`));
  await key('Escape'); await evaluate(`button('Reset evolution').click()`);
  check('Explicit known reset restores provenance and clears the bounded receipt/recovery', await evaluate(`__actions.knownGaussian()&&__controller.world.lastAction===null&&__actions.executor.redraw().reason==='no-world'`));
  await fresh(); await send('Emulation.setEmulatedMedia', { features: [] });
  await evaluate(`button('1D view').click()`);
  await retry(() => evaluate(`document.querySelector('main').dataset.morphing==='true'`));
  await evaluate(`window.duringMorph=__actions.run(actionRequest({kind:'spatial',targetId:'a',axes:'x',resolution:.4}))`);
  check('Morph guard rejects before sampling without pausing', await evaluate(`duringMorph.reason==='morphing'&&__controller.world.getSnapshot().spatialDrawCount===0&&!__controller.playing`));
  await retry(() => evaluate('stable()')); await evaluate(`button('2D view').click()`); await retry(() => evaluate('stable()'));
  // Real timeout, paused redraw and reduced-motion/visibility cleanup.
  await evaluate(`document.querySelector('input[aria-label="Show creature decorations"]').checked||document.querySelector('input[aria-label="Show creature decorations"]').click();__actions.run(actionRequest({kind:'spatial',targetId:'a',axes:'xy',resolution:.4}));window.surprisedImage=document.querySelector('.density-2d').toDataURL()`);
  check('Committed spatial action creates one bounded reaction while paused', await evaluate(`__actions.reaction()?.targets[0]==='a'&&!__controller.playing`));
  await sleep(700);
  check('Reaction expires after 600 ms and redraws the paused canvas without replay', await evaluate(`__actions.reaction()===null&&document.querySelector('.density-2d').toDataURL()!==surprisedImage&&__controller.world.getSnapshot().spatialMeasurementCount===1`));
  await evaluate(`__actions.run(actionRequest({kind:'spatial',targetId:'a',axes:'xy',resolution:.4}));document.querySelector('input[aria-label="Animate creature faces"]').click()`);
  check('Disabling animation clears the pending reaction', await evaluate('__actions.reaction()===null'));
  await evaluate(`document.querySelector('input[aria-label="Animate creature faces"]').click()`);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await evaluate(`__actions.run(actionRequest({kind:'spatial',targetId:'a',axes:'xy',resolution:.4}))`);
  check('Reduced motion keeps ordinary static faces and text, without reaction timeout', await evaluate('__actions.reaction()===null'));
  // Live-region content stays stable over ordinary publications/reopening.
  await evaluate(`window.liveMutations=0;window.live=document.querySelector('[data-action-sequence]');window.liveObserver=new MutationObserver(m=>{liveMutations+=m.length;});liveObserver.observe(live,{subtree:true,childList:true,characterData:true});__actions.refresh();__actions.refresh()`);
  await page('Advanced'); await closeMenu(); await sleep(150);
  check('Unchanged receipt publications and menu reopening do not rewrite successful live text', await evaluate('liveMutations===0'));
  await evaluate(`liveObserver.disconnect()`);
  // Both canvases share a full-size viewport, with true DPR backing sizes.
  for (const [width, height] of [[1920,1080],[1440,900],[1366,768],[1280,720],[1024,600]]) for (const dpr of [1, 2]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
    for (const view of ['2d', '1d']) {
      await evaluate(`button('${view === '1d' ? '1D view' : '2D view'}').click()`); await sleep(60);
      check(`${width}x${height} DPR${dpr} ${view}: equal full-size viewports, backing sizes and no document overflow`, await evaluate(`(()=>{const a=document.querySelector('.density-2d'),b=document.querySelector('.projection-1d'),p=document.querySelector('.unified-playground'),side=Math.min(p.clientWidth,p.clientHeight);return a.clientWidth>0&&a.clientHeight===b.clientHeight&&a.clientWidth===b.clientWidth&&Math.abs(a.clientWidth-p.clientWidth)<=1&&Math.abs(a.clientHeight-p.clientHeight)<=1&&Math.abs((('${view}'==='1d'?b:a).width)-Math.round(a.clientWidth*devicePixelRatio))<=1&&Math.abs((('${view}'==='1d'?b:a).height)-Math.round(a.clientHeight*devicePixelRatio))<=1&&document.scrollingElement.scrollWidth===innerWidth&&document.scrollingElement.scrollHeight===innerHeight;})()`));
      const shot = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(out, `actions-${width}x${height}-dpr${dpr}-${view}.png`), Buffer.from(shot.data, 'base64'));
    }
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 512, height: 300, deviceScaleFactor: 1, mobile: false });
  await page('Measure position');
  check('512x300 action menu internally scrolls; native controls and Apply remain reachable', await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Position target"]');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.scrollingElement.scrollHeight===innerHeight;})()`));
  await closeMenu(); await textClick('What am I seeing?');
  check('512x300 science opens its real modal and keeps keyboard Escape local', await evaluate(`!!document.querySelector('dialog[open]')`));
  await key('Escape'); await retry(() => evaluate(`document.activeElement===document.querySelector('.museum-trigger')`));
  check('Science focus returns to the one persistent science trigger', await evaluate(`document.activeElement===document.querySelector('.museum-trigger')`));
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  // Explicit guide replacement and forbidden stale/native bypass.
  await textClick('What am I seeing?');
  const replay = await evaluate(`(()=>{const b=[...document.querySelectorAll('dialog[open] button')].find(b=>/Replay|three-step guide/.test(b.textContent));b.closest('details').open=true;return b.textContent;})()`);
  assert.ok(replay, 'Guide replay trigger is discoverable'); await textClick(replay.trim());
  await evaluate(`window.beforeCancel=actionProtected();window.originalActions=__actions`);
  await textClick('Cancel — keep my scene');
  check('Cancelling replay preserves state, both streams, receipt and active scene', await evaluate('protectedSame(beforeCancel)&&__controller.world.lastAction===beforeCancel.receipt&&__controller.world.getSnapshot().spatialDrawCount===beforeCancel.draws&&__actions===originalActions'));
  await textClick('What am I seeing?'); await evaluate(`button(${JSON.stringify(replay.trim())}).closest('details').open=true`); await textClick(replay.trim());
  // Confirmation text is deliberately asserted, not silently guessed.
  const start = await evaluate(`[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent==='Replace scene and start guide')?.textContent`);
  assert.ok(start, 'Confirmed guide-start action exists'); await textClick(start.trim());
  await retry(() => evaluate(`!!document.querySelector('.guide-panel')`));
  await evaluate(`window.guideBefore=actionProtected();window.forbidden=__actions.run(actionRequest({kind:'spatial',targetId:'a',axes:'xy',resolution:.4}))`);
  check('Active guide rejects bypassed shared requests without physics/RNG change', await evaluate(`forbidden.reason==='guide-forbidden'&&protectedSame(guideBefore)&&__controller.world.getSnapshot().spatialDrawCount===0`));
  await textClick('Skip guide'); await retry(() => evaluate(`!document.querySelector('.guide-panel')&&__controller.world.ids.length===1`));
  check('Skip disposes guide/drafts/reactions and restores one clean paused deterministic creature', await evaluate(`__controller.world.time===0&&!__controller.playing&&__controller.snapshot().potentialL1===0&&__controller.world.lastAction===null&&__actions.owner.state.mode==='inspect'&&__actions.reaction()===null`));
  await writeFile(join(out, 'spatial-actions-results.json'), JSON.stringify({ candidate: process.argv.includes('--candidate'), browserZoom: 'Not measured; emulated viewport/DPR is not real-device or zoom evidence.', rareFailurePolicy: 'Audit-only injected posterior faults; real numerical underflows covered separately by core/world tests.', coreCalls: await evaluate('window.__spatialCoreCalls||0') }, null, 2));
}
