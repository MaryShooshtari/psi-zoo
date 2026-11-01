// Isolated production audit runner; --candidate EXTERNAL_TREE stages the full
// integration without changing the normal app. No audit hook is shipped.
process.argv.push('--spatial-actions');
await import('./projection-browser-check.mjs');
