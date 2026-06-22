import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  markdown: {
    syntaxHighlight: false,
  },
  site: 'https://wwdc-quick-look.swiftgg.team',
});
