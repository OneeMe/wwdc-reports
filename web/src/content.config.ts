import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articleBuildLang = process.env.WWDC_ARTICLE_BUILD_LANG;
const articlePatternsByLang: Record<string, string> = {
  zh: '*.{md,mdx}',
  en: 'en/*.{md,mdx}',
  ja: 'ja/*.{md,mdx}',
};
const articlePattern = articleBuildLang ? articlePatternsByLang[articleBuildLang] : undefined;

const articles = defineCollection({
  loader: glob({
    pattern: articlePattern ?? '**/*.{md,mdx}',
    base: './src/content/articles',
    generateId: ({ entry, base }) => {
      return entry.replace(/\.mdx?$/, '');
    },
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()),
    thumbnail: z.string().optional(),
    videoUrl: z.string().optional(),
    sessionId: z.string().optional(),
    year: z.string().optional(),
    relatedSessions: z.array(
      z.object({
        title: z.string(),
        code: z.string(),
        year: z.string().optional(),
        description: z.string(),
      })
    ).optional().default([]),
  }),
});

export const collections = { articles };
