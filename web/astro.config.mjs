import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

const localizedCacheDir = process.env.WWDC_ASTRO_CACHE_DIR;

export default defineConfig({
  ...(localizedCacheDir ? { cacheDir: localizedCacheDir } : {}),
  integrations: [mdx()],
  build: {
    concurrency: 1,
  },
  markdown: {
    syntaxHighlight: "shiki",
  },
  site: 'https://wwdc-quick-look.swiftgg.team',
});
