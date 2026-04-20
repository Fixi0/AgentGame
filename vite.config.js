import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
          if (id.includes('/src/game/') || id.includes('/src/systems/')) return 'core';
          if (id.includes('/src/components/modals/')) return 'modals';
          if (id.includes('/src/components/')) return 'components';
          if (id.includes('/src/data/')) return 'core';
          if (id.includes('/src/utils/')) return 'utils';
          return undefined;
        },
      },
    },
  },
});
