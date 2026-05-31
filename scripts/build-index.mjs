#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve('data');

async function listYearDirs() {
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && /^wwdc\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function describeYear(eventShort) {
  const dir = path.join(DATA_DIR, eventShort);
  const metadataPath = path.join(dir, 'raw_data.json');
  const raw = await readJson(metadataPath);
  const event = Object.values(raw.events ?? {})[0] ?? {};
  const eventId = event.id ?? `wwdc20${eventShort.slice(-2)}`;
  const year = `20${eventShort.slice(-2)}`;
  const transcriptDirs = (await fs.readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('transcripts-'))
    .map((entry) => entry.name);
  const locales = transcriptDirs.map((name) => name.slice('transcripts-'.length)).sort();
  let generatedAt = null;
  for (const localeDir of transcriptDirs) {
    const manifestPath = path.join(dir, localeDir, '_manifest.json');
    try {
      const manifest = await readJson(manifestPath);
      if (!generatedAt || manifest.generatedAt > generatedAt) generatedAt = manifest.generatedAt;
    } catch {
      // missing manifest is OK for years without transcripts yet
    }
  }
  return {
    year,
    eventId,
    eventShort,
    displayName: event.name ?? `WWDC${eventShort.slice(-2)}`,
    sessionCount: Object.keys(raw.videos ?? {}).length,
    topicCount: Object.keys(raw.topics ?? {}).length,
    locales,
    generatedAt,
    files: {
      metadata: `data/${eventShort}/raw_data.json`,
      transcriptsManifest: locales[0]
        ? `data/${eventShort}/transcripts-${locales[0]}/_manifest.json`
        : null,
      transcriptDir: locales[0] ? `data/${eventShort}/transcripts-${locales[0]}/` : null
    }
  };
}

async function main() {
  const eventShorts = await listYearDirs();
  const years = [];
  for (const eventShort of eventShorts) {
    years.push(await describeYear(eventShort));
  }
  const index = {
    schemaVersion: 1,
    generatedAt: years.map((y) => y.generatedAt).filter(Boolean).sort().at(-1) ?? null,
    years
  };
  const outputPath = path.join(DATA_DIR, 'index.json');
  await fs.writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outputPath} (${years.length} year(s))`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
