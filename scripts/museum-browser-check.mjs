import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['scripts/projection-browser-check.mjs', '--museum', ...process.argv.slice(2)], { stdio: 'inherit' });
child.on('exit', code => { process.exitCode = code ?? 1; });
