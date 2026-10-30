// Bounded sequential production matrix. Run apart from builds/tests.
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const root = resolve(process.argv[2] ?? 'D:/Temp/psi-5e4-matrix');
await mkdir(root, { recursive: true });
const plan = [
  ['2d', ['--scene','two-interacting']],
  ['1d', ['--scene','two-interacting','--view','1d']],
  ['morph', ['--scene','two-interacting','--view','alternating']],
  ['faces', ['--scene','two-interacting','--decorations','alternating','--serial']],
  ['popover', ['--scene','two-interacting','--panel','alternating']],
  ['inspector', ['--scene','two-interacting','--panel','advanced']],
  ['bell', ['--scene','bell']],
  ['four', ['--scene','four-interacting']],
];
function run(args) { return new Promise((done, fail) => { const p = spawn(process.execPath, args, { stdio: 'inherit' }); p.on('error', fail); p.on('exit', code => code === 0 ? done() : fail(Error('Performance process exit '+code))); }); }
const datasets = [];
for (const [name, options] of plan) {
  const out = join(root, name);
  await run(['scripts/performance/runtime-2d.mjs','--out',out,'--mode','plain','--seconds','10','--batches',name === 'faces' ? '4' : '1',...options]);
  const { sessions, errors } = JSON.parse(await readFile(join(out,'sessions.json')));
  datasets.push({ name, directory: out, errors, ratios: sessions.map(s => ({ decorations: s.decorations, ratio: (s.end.time-s.start.time)/((s.end.wall-s.start.wall)/1000), steps: s.end.steps-s.start.steps, viewSwitches: s.viewSwitches, panelActions: s.panelActions })) });
  await writeFile(join(root,'matrix.json'),JSON.stringify(datasets,null,2)+'\n');
}
console.log('Performance matrix:',root);
