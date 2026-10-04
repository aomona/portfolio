import { defineConfig } from 'cf/config';

export default defineConfig({
  worker: {
    name: 'aomona-portfolio',
    compatibilityDate: '2026-10-04',
    workersDev: true,
    assets: {
      htmlHandling: 'auto-trailing-slash',
      notFoundHandling: '404-page',
    },
  },
});
