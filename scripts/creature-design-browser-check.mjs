// Reuse the production/UI/physics continuity harness and extend it with 5E.3
// native selection, navigation, friendship, terrain and rendering-cost cases.
process.argv.push('--creature-design');
await import('./projection-browser-check.mjs');
