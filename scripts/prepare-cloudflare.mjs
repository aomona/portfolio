import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadAndParseConfig } from '@cloudflare/config';
import {
  cleanBuildOutputDir,
  readBuildOutput,
  writeAssets,
  writeRootConfig,
  writeWorkerConfig,
} from '@cloudflare/build-output-utils';

// Package the Astro static build using cf's Build Output Specification.
// No server adapter or Worker JavaScript is needed for this site.
const root = fileURLToPath(new URL('../', import.meta.url));
const context = { isPreview: false, mode: undefined };
await access(new URL('../dist/index.html', import.meta.url));
const { result } = await loadAndParseConfig(`${root}cloudflare.config.ts`, context);
if (!result.success) throw result.error;
const { worker, accountId, complianceRegion } = result.data;
const settings = { accountId, complianceRegion };
if (!worker || worker.entrypoint) throw new Error('Expected an assets-only Worker configuration.');
await cleanBuildOutputDir(root);
await writeRootConfig(root, settings, context);
await writeWorkerConfig({ root, config: worker });
await writeAssets({ root, sourceDirectory: `${root}dist` });
const output = await readBuildOutput(root);
if (!output.workers.default.assetsDir || output.workers.default.bundleDir) {
  throw new Error('Expected static assets without a Worker bundle.');
}
console.log(`Prepared static assets for ${output.workers.default.config.name}.`);
