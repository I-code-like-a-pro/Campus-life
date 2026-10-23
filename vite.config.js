import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  // shown in the feedback report and the start screen
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // hosting platforms serve `vite preview` on their own domains (Railway, tunnels), so don't block unknown hosts
  preview: { allowedHosts: true }
});
