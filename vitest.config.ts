import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Test the same public workspace entry that Vite and TypeScript consume.
export default defineConfig({
  resolve: { alias: { '@psi-zoo/sim-core': fileURLToPath(new URL('./packages/sim-core/src/index.ts', import.meta.url)) } },
});
