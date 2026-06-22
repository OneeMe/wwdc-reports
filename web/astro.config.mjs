import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  build: {
    concurrency: 1,
  },
  markdown: {
    syntaxHighlight: "shiki",
  },
  site: 'https://wwdc-quick-look.swiftgg.team',
});
