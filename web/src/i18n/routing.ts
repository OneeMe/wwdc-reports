export const supportedLangs = ["zh", "en", "ja"] as const;
export type LangCode = (typeof supportedLangs)[number];

export const defaultLang: LangCode = "zh";
export const nonDefaultLangs = supportedLangs.filter((lang) => lang !== defaultLang);

export const langLabels: Record<LangCode, string> = {
  zh: "中文",
  en: "EN",
  ja: "日本語",
};

const htmlLangs: Record<LangCode, string> = {
  zh: "zh-CN",
  en: "en",
  ja: "ja",
};

export function isLangCode(value: string | null | undefined): value is LangCode {
  return supportedLangs.includes(value as LangCode);
}

export function getHtmlLang(lang: LangCode): string {
  return htmlLangs[lang];
}

export function normalizePath(pathname: string): string {
  const withSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withSlash.replace(/\/+$/, "") || "/";
}

export function getLangFromPath(pathname: string): LangCode {
  const firstSegment = normalizePath(pathname).split("/").filter(Boolean)[0];
  return isLangCode(firstSegment) ? firstSegment : defaultLang;
}

export function stripLangPrefix(pathname: string): string {
  const normalized = normalizePath(pathname);
  const segments = normalized.split("/").filter(Boolean);

  if (segments.length > 0 && isLangCode(segments[0])) {
    return normalizePath(`/${segments.slice(1).join("/")}`);
  }

  return normalized;
}

export function getLocalizedPath(pathname: string, lang: LangCode): string {
  const basePath = stripLangPrefix(pathname);

  if (lang === defaultLang) {
    return basePath;
  }

  return basePath === "/" ? `/${lang}` : `/${lang}${basePath}`;
}

export function getStaticLangPaths() {
  return nonDefaultLangs.map((lang) => ({
    params: { lang },
    props: { lang },
  }));
}
