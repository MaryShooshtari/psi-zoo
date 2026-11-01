import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
/** Bounded 5G acceptance through actual visible mouse/keyboard controls.
 * Only checkpoints/RNG instrumentation use audit hooks. No scripted physics. */
export async function checkLearning({ evaluate, send, check, retry, sleep, out }) {
  const key = async (key, virtual) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, windowsVirtualKeyCode: virtual, ...(key === 'Enter' ? { text: '\r' } : {}) });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode: virtual });
  };
  const click = async (selector, text = null) => {
    const p = await evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.checkVisibility()&&!e.disabled&&(${JSON.stringify(text)}===null||e.textContent.trim()===${JSON.stringify(text)}));if(!el)throw Error('Missing visible control '+${JSON.stringify(selector)}+' '+${JSON.stringify(text)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 }); await sleep(40);
  };
  const text = label => click('button', label);
  const lessonButton = label => click('.learning-panel button', label);
  const choose = async (label, value) => { await evaluate(`const e=document.querySelector('select[aria-label=${JSON.stringify(label)}]');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));`); await sleep(30); };
  const menuPage = async name => {
    if (await evaluate(`document.querySelector('.settings-popover').hidden`)) await click('.settings-trigger');
    if (await evaluate(`!document.querySelector('.settings-page-heading').hidden`)) await text('← Back to menu');
    await click(`[data-settings-link="${name}"]`);
  };
  const shot = async name => { const image = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(out, name), Buffer.from(image.data, 'base64')); };
  const step = async number => retry(() => evaluate(`document.querySelector('.learning-panel')?.dataset.step==='${number}'`));
  const returnLesson = async () => { await lessonButton('Return to lesson'); await sleep(520); };
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await evaluate(`button('Not now')?.click();const f=document.querySelector('input[aria-label="Show creature decorations"]');if(!f.checked)f.click();
    window.moodDraws=0;const random=__controller.world.moods.random;__controller.world.moods.random=()=>{moodDraws++;return random();};`);
  await click('.settings-trigger');
  check('Popover header and body share one opaque pastel surface and aligned content edge', await evaluate(`(()=>{const p=document.querySelector('.settings-popover'),h=document.querySelector('.popover-heading'),title=h.querySelector('h2').getBoundingClientRect(),nav=document.querySelector('.settings-navigation').getBoundingClientRect();return getComputedStyle(p).backgroundColor===getComputedStyle(h).backgroundColor&&Math.abs(title.left-nav.left)<1&&title.width>0&&p.scrollWidth<=p.clientWidth;})()`));
  await shot('learning-menu-desktop.png');
  await menuPage('Experiments');
  check('Experiments has exactly three primary quantum actions and collapsed secondary receipt', await evaluate(`JSON.stringify([...document.querySelectorAll('.settings-home-actions button')].filter(b=>b.getClientRects().length).map(b=>b.dataset.settingsLink))===JSON.stringify(['Measure position','Entangle moods','Measure mood'])&&!document.querySelector('.action-details').open&&!button('Watch scattering').getClientRects().length&&!document.querySelector('[data-settings-link="Draw terrain"]')&&!button('Paint on canvas')`));
  await shot('learning-experiments-desktop.png');
  await menuPage('Creatures');
  await shot('learning-creatures-desktop.png');
  check('Advanced model switches and world replacements are collapsed under Creatures', await evaluate(`!document.querySelector('.advanced-simulation').open&&!document.querySelector('input[aria-label="Mood drives"]').checkVisibility()&&!button('World: independent').checkVisibility()&&button('Add creature').getClientRects().length>0`));
  await evaluate(`const a=document.querySelector('.advanced-simulation > summary');a.focus();`); await key('Tab', 9);
  check('Menu Tab wraps past collapsed settings without focusing their hidden descendants', await evaluate(`document.activeElement===document.querySelector('button[aria-label="Close settings"]')`));
  await menuPage('Terrain'); await evaluate(`window.toolBefore=capture()`);
  for (const [tool, instruction] of [['barrier','draw a barrier'],['well','draw a well'],['erase','erase terrain']]) {
    await click(`[name="terrain-tool"][value="${tool}"]`);
    check(`${tool}: direct selection closes menu, arms only terrain and names the gesture`, await evaluate(`document.querySelector('.settings-popover').hidden&&__actions.owner.state.mode==='terrain'&&__actions.owner.state.tool==='${tool}'&&document.querySelector('.terrain-notice').textContent.includes('${instruction}')&&document.querySelector('[name="terrain-tool"][value="${tool}"]').checked&&same(toolBefore)&&moodDraws===0`));
    await menuPage('Terrain');
  }
  await shot('learning-terrain-desktop.png');
  await click('[name="terrain-tool"][value="view"]');
  check('Inspect selection cancels the drawing mode without editing or sampling', await evaluate(`document.querySelector('.settings-popover').hidden&&__actions.owner.state.mode==='inspect'&&same(toolBefore)&&moodDraws===0`));
  await evaluate(`window.beforeLearning=capture();window.beforeCore=window.__spatialCoreCalls||0`);
  await text('What am I seeing?');
  await evaluate(`const d=[...document.querySelectorAll('dialog[open] details')].at(-1);d.querySelector('summary').focus();`); await key('Tab', 9);
  check('Science modal Tab ignores collapsed legacy demonstration controls', await evaluate(`document.activeElement===button('Close science help')`));
  await text('Start learning path'); await step(1);
  check('Learning entry preserves world identity, every amplitude, terrain, time, moods, receipts and RNG', await evaluate(`same(beforeLearning)&&__registrations===1&&moodDraws===0&&(window.__spatialCoreCalls||0)===beforeCore&&document.activeElement===document.querySelector('#learning-title')`));
  const ax = await send('Accessibility.getFullAXTree');
  check('Learning region and progress have accessible names', ax.nodes.some(n => n.role?.value === 'complementary' && n.name?.value === 'Meet your quantum creature') && ax.nodes.some(n => n.role?.value === 'progressbar' && n.name?.value === 'Learning path progress'));
  await shot('learning-step-1-desktop.png');
  await lessonButton('Minimize');
  check('Minimize exposes the playground without changing the scene and focuses resume', await evaluate(`same(beforeLearning)&&document.querySelector('.learning-panel').dataset.collapsed==='true'&&document.activeElement.textContent==='Return to lesson'`));
  await shot('learning-minimized-desktop.png'); await lessonButton('Return to lesson');
  await lessonButton('Next'); await step(2);
  check('Next advances content, not physics; Play is a separate explicit action', await evaluate(`same(beforeLearning)&&moodDraws===0&&!__controller.playing`));
  await lessonButton('Find Play / Pause');
  check('Playback Try only focuses the existing Play control', await evaluate(`document.activeElement===button('Play')&&!__controller.playing&&same(beforeLearning)`));
  await key('Enter', 13); await retry(() => evaluate('__controller.world.time>.2')); await text('Pause'); await returnLesson();
  check('Spreading feedback uses actual later computed state and qualifies the current scene', await evaluate(`__controller.world.time>0&&/width|evolved/.test(document.querySelector('[data-learning-observation]').textContent)&&document.querySelector('.learning-panel').textContent.includes('not an automatically prepared free example')&&__registrations===1`));
  await evaluate(`window.afterPlay=capture()`); await lessonButton('Back'); await step(1); await lessonButton('Next'); await step(2);
  check('Back and Next preserve the evolved current scene exactly', await evaluate('same(afterPlay)'));
  await lessonButton('Next'); await step(3); await lessonButton('Open position measurement');
  await retry(() => evaluate(`!document.querySelector('.settings-popover').hidden&&!!document.querySelector('select[aria-label="Position target"]')`));
  check('Position Try opens an unexecuted native draft with no target fallback', await evaluate(`same(afterPlay)&&document.querySelector('select[aria-label="Position target"]').value===''&&button('Apply x/y position measurement').disabled&&moodDraws===0`));
  await choose('Position target', 'a'); await text('Apply x/y position measurement'); await returnLesson();
  check('Position lesson observes one real finite-resolution measurement through the shared executor', await evaluate(`__controller.world.lastAction.kind==='spatial-measurement'&&__controller.world.lastAction.targetId==='a'&&window.__spatialCoreCalls===beforeCore+1&&moodDraws===0&&document.querySelector('[data-learning-observation]').textContent.includes('new x/y Gaussian detector result')&&Math.abs(__controller.world.getSnapshot().creatures[0].norm-1)<1e-12`));
  await shot('learning-position-result.png');
  await evaluate(`window.beforeContinue=capture()`); await text('What am I seeing?'); await text('Continue learning path');
  check('Contextual help can resume the same step and evidence without restarting the path', await evaluate(`document.querySelector('.learning-panel').dataset.step==='3'&&document.querySelector('[data-learning-observation]').textContent.includes('new x/y Gaussian detector result')&&same(beforeContinue)`));
  await evaluate(`window.beforeArm=capture()`); await lessonButton('Open position measurement');
  await retry(() => evaluate(`!document.querySelector('.settings-popover').hidden`)); await text('Arm on canvas');
  check('Explicit canvas arming still leaves physics unchanged', await evaluate(`same(beforeArm)&&__actions.owner.state.route==='canvas'&&!!document.querySelector('.armed-instructions')`));
  await click('.armed-instructions button'); await returnLesson(); await lessonButton('Next'); await step(4);
  await lessonButton('Choose a terrain tool'); await retry(() => evaluate(`!document.querySelector('.settings-popover').hidden`));
  await click('[name="terrain-tool"][value="barrier"]'); await evaluate(`window.beforePaint=capture()`);
  const p = await evaluate(`(()=>{const r=document.querySelector('.density-2d').getBoundingClientRect();return{x:r.x+r.width*.6,y:r.y+r.height*.5};})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x + 20, y: p.y + 20, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x + 20, y: p.y + 20, button: 'left', clickCount: 1 });
  await retry(() => evaluate('__controller.snapshot().potentialMax>0')); await returnLesson();
  check('Terrain lesson paints real potential without moving amplitudes or claiming tunnelling', await evaluate(`(()=>{const n=capture();return n.spatial.every((a,i)=>bytesEqual(a,beforePaint.spatial[i]))&&n.time===beforePaint.time&&n.owners===beforePaint.owners&&moodDraws===0&&document.querySelector('[data-learning-observation]').textContent.includes('not automatically proof of tunnelling');})()`));
  await shot('learning-barrier-lesson.png');
  await lessonButton('Next'); await step(5); await lessonButton('Explore creatures'); await retry(() => evaluate(`!document.querySelector('.settings-popover').hidden`));
  await text('Add creature');
  check('Multiple-creature Try adds only on the explicit guarded Add action', await evaluate(`__controller.world.ids.length===3&&__controller.world.ids.slice(0,2).every((id,i)=>bytesEqual(__controller.world.spatialState(id).values,beforePaint.spatial[i]))&&moodDraws===0`));
  await text('Remove selected creature'); await click('button[aria-label="Close settings"]'); await returnLesson();
  check('Multiple-creature explanation keeps independent spatial states and approximate feedback distinct', await evaluate(`document.querySelector('[data-learning-observation]').textContent.includes('independent spatial states')&&document.querySelector('.learning-panel').textContent.includes('not an exact interacting many-body')`));
  await lessonButton('Next'); await step(6); await evaluate(`window.beforeMoodExplore=capture()`); await lessonButton('Explore mood measurement'); await retry(() => evaluate(`!document.querySelector('.settings-popover').hidden`));
  check('Mood lesson explains pair prerequisites and non-emotional qubit bases without sampling', await evaluate(`same(beforeMoodExplore)&&moodDraws===0&&document.querySelector('select[aria-label="Mood action pair"]').options.length===1&&button('Apply mood measurement').disabled&&document.querySelector('select[aria-label="Mood action basis"]').textContent.includes('X · + or −')&&document.querySelector('form').textContent.includes('Entangle moods first')`));
  await click('button[aria-label="Close settings"]'); await returnLesson(); await lessonButton('Learn more →');
  check('Each lesson opens its deeper notebook, with native mathematics and no scene replacement', await evaluate(`document.querySelector('dialog[open] #museum-title').textContent==='Qubits and Bloch vectors'&&!!document.querySelector('dialog[open] math')&&same(beforeMoodExplore)`));
  await key('Escape', 27); await retry(() => evaluate(`document.activeElement?.className==='learning-chapter'`));
  await lessonButton('Next'); await step(7); await lessonButton('Prepare a shared mood'); await retry(() => evaluate(`!document.querySelector('.settings-popover').hidden`));
  await choose('Entanglement first target', 'a');
  check('First ordered entanglement target still changes no physics', await evaluate(`same(beforeMoodExplore)&&moodDraws===0&&button('Apply ordered Bell preparation').disabled`));
  await choose('Entanglement second target', 'b'); await text('Apply ordered Bell preparation'); await returnLesson();
  check('Bell lesson prepares a real joint mood only after Apply, leaving spatial states and RNG unchanged', await evaluate(`__controller.world.lastAction.kind==='mood-prepare'&&__controller.world.getSnapshot().pairs[0].entropy>.999999&&__controller.world.ids.every((id,i)=>bytesEqual(__controller.world.spatialState(id).values,beforeMoodExplore.spatial[i]))&&moodDraws===0&&document.querySelector('[data-learning-observation]').textContent.includes('currently entangled')`));
  await shot('learning-entanglement-desktop.png');
  for (const target of ['a','b']) {
    await lessonButton('Measure a mood'); await retry(() => evaluate(`!document.querySelector('.settings-popover').hidden`));
    const pairId = await evaluate('__controller.world.getSnapshot().pairs[0].id');
    await choose('Mood action pair', pairId); await choose('Mood action target', target); await choose('Mood action basis', 'Z'); await text('Apply mood measurement');
    if (target === 'a') await evaluate(`window.firstMoodResult=__controller.world.lastAction.events[0].outcome`);
    await returnLesson();
  }
  check('Paired Z observations preserve RNG semantics: one random first result, no draw for a certain second result', await evaluate(`moodDraws===1&&Math.abs(__controller.world.lastAction.events[0].probability-1)<1e-12&&__controller.world.lastAction.events[0].outcome===firstMoodResult&&__controller.world.ids.every((id,i)=>bytesEqual(__controller.world.spatialState(id).values,beforeMoodExplore.spatial[i]))&&document.querySelector('[data-learning-observation]').textContent.includes('not a message')&&window.__spatialCoreCalls===beforeCore+1`));
  await evaluate(`window.beforeFinish=capture()`); await lessonButton('Finish');
  check('Finish stores completion only and restores help focus without resetting the played scene', await evaluate(`!document.querySelector('.learning-panel')&&same(beforeFinish)&&document.activeElement===document.querySelector('.museum-trigger')&&__registrations===1&&moodDraws===1`));
  await text('What am I seeing?'); await text('Start learning path'); await step(1); await lessonButton('Next'); await step(2); await lessonButton('Exit');
  check('Re-entry and early Exit also preserve every state and record', await evaluate(`same(beforeFinish)&&moodDraws===1&&!document.querySelector('.learning-panel')`));
  // Fresh mounts for responsive visual inspection; these reloads are test setup,
  // not resizing/resampling behavior or learning-path operations.
  for (const [width, height] of [[390,844],[512,300]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); await send('Page.reload');
    await retry(() => evaluate(`!!window.__actions&&!!document.querySelector('.world-inspector')`));
    await evaluate(`window.button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent===t);button('Not now')?.click();window.responsiveStart=__controller.world;`);
    await click('.settings-trigger'); await shot(`learning-menu-${width}x${height}.png`);
    check(`${width}x${height}: cohesive menu fits without horizontal overflow`, await evaluate(`(()=>{const p=document.querySelector('.settings-popover'),r=p.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&p.scrollWidth<=p.clientWidth;})()`));
    await menuPage('Terrain'); await shot(`learning-terrain-${width}x${height}.png`);
    await menuPage('Experiments'); await shot(`learning-experiments-${width}x${height}.png`);
    await click('button[aria-label="Close settings"]'); await text('What am I seeing?'); await text('Start learning path'); await step(1);
    await shot(`learning-path-${width}x${height}.png`);
    check(`${width}x${height}: scrollable learning card and persistent controls stay within the viewport`, await evaluate(`(()=>{const p=document.querySelector('.learning-panel'),r=p.getBoundingClientRect(),h=document.querySelector('.museum-trigger').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&p.scrollWidth<=p.clientWidth&&getComputedStyle(p).overflowY==='auto'&&h.bottom<=innerHeight&&document.scrollingElement.scrollHeight===innerHeight&&document.scrollingElement.scrollWidth===innerWidth&&__controller.world===responsiveStart;})()`));
    await lessonButton('Choose a creature'); await retry(() => evaluate(`!document.querySelector('.settings-popover').hidden`));
    await key('Escape', 27); await lessonButton('Return to lesson'); await lessonButton('Exit');
    check(`${width}x${height}: Try, Escape, resume and Exit remain usable without resetting`, await evaluate(`__controller.world===responsiveStart&&__controller.world.time===0&&__controller.world.lastAction===null&&!document.querySelector('.learning-panel')`));
  }
}
