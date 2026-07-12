import type { LangCode } from "../../i18n/routing";
import { normalizeMetaDescription } from "../../seo";

export function cleanMarkdownText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getArticleExcerpt(body: string): string {
  const quote = body.match(/^>\s+(.+)$/m)?.[1];
  if (quote) return cleanMarkdownText(quote);

  const paragraph = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith("#") && !block.startsWith("```"));

  return paragraph ? cleanMarkdownText(paragraph) : "";
}

function getLocalizedDescription(description: string | undefined, lang: LangCode): string {
  const value = description?.trim() ?? "";
  if (!value) return "";
  if (lang === "zh") return /\p{Script=Han}/u.test(value) ? value : "";
  if (lang === "ja") {
    return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(value) ? value : "";
  }
  return value;
}

export function getArticleDescription(
  description: string | undefined,
  body: string,
  lang: LangCode,
  fallback = "",
): string {
  const localizedDescription = getLocalizedDescription(description, lang);
  const selected = localizedDescription || getArticleExcerpt(body) || fallback;
  return cleanMarkdownText(selected);
}

export function getArticleMetaDescription(
  description: string | undefined,
  body: string,
  lang: LangCode,
  fallback = "",
): string {
  return normalizeMetaDescription(getArticleDescription(description, body, lang, fallback));
}
