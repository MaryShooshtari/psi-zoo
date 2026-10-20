import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@psi-zoo/sim-core': decodeURIComponent(new URL('../sim-core/src/index.ts', import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:\/)/, '') } },
});
