#!/usr/bin/env python3
"""Translate Chinese MDX articles to EN/JA while preserving structure."""

import re
import sys
import time
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parent.parent
ARTICLES_DIR = ROOT / "src/content/articles"

SECTION_MAP_EN = {
    "## Highlight": "## Highlight",
    "## 核心内容": "## Core Content",
    "## 详细内容": "## Detailed Content",
    "## 核心启发": "## Core Takeaways",
    "## 关联 Session": "## Related Sessions",
    "关键点：": "Key points:",
}

SECTION_MAP_JA = {
    "## Highlight": "## ハイライト",
    "## 核心内容": "## 主要内容",
    "## 详细内容": "## 詳細",
    "## 核心启发": "## 重要ポイント",
    "## 关联 Session": "## 関連セッション",
    "关键点：": "キーポイント:",
}

CACHE: dict[str, str] = {}
CJK_RE = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf]")


def has_cjk(text: str) -> bool:
    return bool(CJK_RE.search(text))


def get_translator(lang: str) -> GoogleTranslator:
    target = "en" if lang == "en" else "ja"
    return GoogleTranslator(source="zh-CN", target=target)


def split_chunks(text: str, max_len: int = 4500) -> list[str]:
    if len(text) <= max_len:
        return [text]
    chunks = []
    remaining = text
    while len(remaining) > max_len:
        split_at = remaining.rfind("\n\n", 0, max_len)
        if split_at < max_len // 2:
            split_at = remaining.rfind("\n", 0, max_len)
        if split_at < max_len // 2:
            split_at = remaining.rfind("。", 0, max_len)
        if split_at < max_len // 2:
            split_at = max_len
        chunks.append(remaining[:split_at])
        remaining = remaining[split_at:]
    if remaining:
        chunks.append(remaining)
    return chunks


def translate_text(text: str, lang: str) -> str:
    if not text.strip() or not has_cjk(text):
        return text

    cache_key = f"{lang}:{text.strip()}"
    if cache_key in CACHE:
        return CACHE[cache_key]

    translator = get_translator(lang)
    try:
        parts = split_chunks(text.strip())
        result = "".join(translator.translate(p) for p in parts)
        CACHE[cache_key] = result
        return result
    except Exception as e:
        print(f"  WARN: {text[:50]}... ({e})", file=sys.stderr)
        return text


def parse_frontmatter(content: str) -> tuple[str, str]:
    if not content.startswith("---"):
        return "", content
    end = content.find("\n---", 3)
    if end == -1:
        return "", content
    return content[: end + 4], content[end + 4 :].lstrip("\n")


def translate_frontmatter(fm: str, lang: str) -> str:
    lines = fm.split("\n")
    out = []
    in_related = False

    for line in lines:
        if line.startswith("relatedSessions:"):
            in_related = True
            out.append(line)
            continue

        if in_related:
            m = re.match(r'^(\s*description:\s*)"(.*)"\s*$', line)
            if m and has_cjk(m.group(2)):
                out.append(f'{m.group(1)}"{translate_text(m.group(2), lang)}"')
                continue
            if line and not line[0].isspace() and not line.startswith("  -"):
                in_related = False

        tags_m = re.match(r"^tags:\s*\[(.*)\]\s*$", line)
        if tags_m and has_cjk(tags_m.group(1)):
            tags = [t.strip().strip('"') for t in tags_m.group(1).split(",")]
            translated = [f'"{translate_text(t, lang) if has_cjk(t) else t}"' for t in tags]
            out.append(f"tags: [{', '.join(translated)}]")
            continue

        out.append(line)

    return "\n".join(out)


def premap_section_headers(body: str, lang: str) -> str:
    m = SECTION_MAP_EN if lang == "en" else SECTION_MAP_JA
    for zh, tr in m.items():
        body = body.replace(zh, tr)
    return body


def translate_prose_segment(seg: str, lang: str) -> str:
    """Translate a prose segment preserving inline code."""
    if not has_cjk(seg):
        return seg

    inline_parts = re.split(r"(`[^`\n]+`)", seg)
    if len(inline_parts) == 1:
        return translate_text(seg, lang)

    out = []
    for part in inline_parts:
        if part.startswith("`") and part.endswith("`"):
            out.append(part)
        elif has_cjk(part):
            out.append(translate_text(part, lang))
        else:
            out.append(part)
    return "".join(out)


def translate_body(body: str, lang: str) -> str:
    body = premap_section_headers(body, lang)
    parts = re.split(r"(```[\s\S]*?```)", body)
    translated = []

    for part in parts:
        if part.startswith("```"):
            translated.append(part)
            continue

        # Batch translate paragraphs (split by double newline)
        paragraphs = re.split(r"(\n\n+)", part)
        para_out = []
        batch = []
        batch_seps = []

        def flush_batch():
            nonlocal batch, batch_seps
            if not batch:
                return
            combined = "".join(batch)
            if has_cjk(combined):
                para_out.append(translate_prose_segment(combined, lang))
            else:
                para_out.append(combined)
            batch = []
            batch_seps = []

        for p in paragraphs:
            if re.match(r"^\n+$", p):
                if batch:
                    flush_batch()
                para_out.append(p)
            else:
                batch.append(p)

        flush_batch()
        translated.append("".join(para_out))

    return "".join(translated)


def translate_article(slug: str, lang: str) -> bool:
    slug = slug.removesuffix(".mdx")
    zh_path = ARTICLES_DIR / f"{slug}.mdx"
    out_path = ARTICLES_DIR / lang / f"{slug}.mdx"

    if not zh_path.exists():
        print(f"Missing source: {slug}", file=sys.stderr)
        return False

    print(f"Translating {lang}/{slug}...", flush=True)
    content = zh_path.read_text(encoding="utf-8")
    frontmatter, body = parse_frontmatter(content)

    tr_fm = translate_frontmatter(frontmatter, lang)
    tr_body = translate_body(body, lang)

    out_path.write_text(tr_fm + "\n" + tr_body, encoding="utf-8")
    print(f"  Done {lang}/{slug}", flush=True)
    return True


def main() -> None:
    args = sys.argv[1:]
    langs = ["en", "ja"]
    slugs = []

    i = 0
    while i < len(args):
        if args[i] == "--lang":
            langs = [args[i + 1]]
            i += 2
        else:
            slugs.append(args[i])
            i += 1

    if not slugs:
        print("Usage: translate-article-batch.py [--lang en|ja] slug1 slug2 ...", file=sys.stderr)
        sys.exit(1)

    for slug in slugs:
        for lang in langs:
            translate_article(slug, lang)


if __name__ == "__main__":
    main()
