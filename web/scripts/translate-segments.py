#!/usr/bin/env python3
"""Translate Chinese prose segments to EN or JA via googletrans."""
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from googletrans import Translator

dest = sys.argv[1]  # en or ja
segments = json.load(sys.stdin)
results = {}


def has_cjk(text):
    return any("\u4e00" <= c <= "\u9fff" for c in text)


def translate_one(key, text):
    if not text.strip() or not has_cjk(text):
        return key, text
    try:
        translator = Translator()
        return key, translator.translate(text, dest=dest).text
    except Exception as e:
        print(f"warn: {e}", file=sys.stderr)
        return key, text


with ThreadPoolExecutor(max_workers=8) as pool:
    futures = [pool.submit(translate_one, k, v) for k, v in segments.items()]
    for future in as_completed(futures):
        key, translated = future.result()
        results[key] = translated

print(json.dumps(results, ensure_ascii=False))
