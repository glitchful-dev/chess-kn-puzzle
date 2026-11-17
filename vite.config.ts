import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained index.html. The three servers update a few minutes apart, so a
// page that loads hashed assets can get a new index.html from one server and a 404
// for its new asset from another, and Cloudflare may keep that 404. With nothing
// to load but the page itself, a mid-rollout visitor gets the old page or the new
// one, never half of each.
export default defineConfig({
  plugins: [preact(), viteSingleFile()],
  build: { target: 'es2022' },
});
