import type { CollectionEntry } from "astro:content";
import type { LangCode } from "../../i18n/routing";

export type ArticleEntry = CollectionEntry<"articles">;

const localizedArticleLangs = new Set<LangCode>(["en", "ja"]);

export function isLocalizedArticleId(id: string): boolean {
  const [prefix] = id.split("/");
  return localizedArticleLangs.has(prefix as LangCode);
}

export function getArticleSlugFromId(id: string): string {
  return id.split("/").at(-1) ?? id;
}

export function getDefaultArticleEntries(entries: ArticleEntry[]): ArticleEntry[] {
  return entries.filter((entry) => !isLocalizedArticleId(entry.id));
}

export function getLocalizedArticleEntry(
  entries: ArticleEntry[],
  slug: string,
  lang: LangCode,
): ArticleEntry | undefined {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  if (lang === "zh") return byId.get(slug);
  return byId.get(`${lang}/${slug}`) ?? byId.get(slug);
}
