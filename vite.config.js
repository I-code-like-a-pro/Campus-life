import { defineConfig, loadEnv } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/** Fills {{VERSION}}, {{DATE}} and {{CONTACT}} in the legal pages. Set VITE_CONTACT_EMAIL to show your address. */
function legalTokens(env) {
  const contact = env.VITE_CONTACT_EMAIL
    ? `<a href="mailto:${env.VITE_CONTACT_EMAIL}">${env.VITE_CONTACT_EMAIL}</a>`
    : 'please contact the person who shared this game with you';
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return {
    name: 'legal-tokens',
    transformIndexHtml(html) {
      return html.replaceAll('{{VERSION}}', pkg.version).replaceAll('{{DATE}}', date).replaceAll('{{CONTACT}}', contact);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    // shown in the feedback report, the start screen and the legal pages
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    plugins: [legalTokens(env)],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          landing: resolve(__dirname, 'landing.html'),
          about: resolve(__dirname, 'about.html'),
          privacy: resolve(__dirname, 'privacy.html'),
          terms: resolve(__dirname, 'terms.html')
        }
      }
    },
    // hosting platforms serve `vite preview` on their own domains (Railway, tunnels), so don't block unknown hosts
    preview: { allowedHosts: true }
  };
});
