const MAX_META_DESCRIPTION_LENGTH = 200;

export function normalizeMetaDescription(value: string, fallback = ""): string {
  const normalized = (value || fallback).replace(/\s+/g, " ").trim() || fallback;
  if (normalized.length <= MAX_META_DESCRIPTION_LENGTH) return normalized;

  const shortened = normalized.slice(0, MAX_META_DESCRIPTION_LENGTH - 1);
  const naturalBreak = shortened.lastIndexOf(" ");
  const candidate = naturalBreak >= MAX_META_DESCRIPTION_LENGTH * 0.75
    ? shortened.slice(0, naturalBreak)
    : shortened;

  return `${candidate.trimEnd()}…`;
}
