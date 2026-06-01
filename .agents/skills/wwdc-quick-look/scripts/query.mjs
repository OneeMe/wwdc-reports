#!/usr/bin/env node
/**
 * WWDC Quick Look — query CLI for the jsDelivr-published dataset.
 *
 * Usage:
 *   node query.mjs list-years
 *   node query.mjs list-topics --year 2025
 *   node query.mjs list-sessions --year 2025
 *   node query.mjs filter-topic --year 2025 --topic "Swift"
 *   node query.mjs search --year 2025 --keyword "privacy"
 *   node query.mjs show-session --year 2025 --code 238
 *   node query.mjs resources --year 2025 --code 238
 *   node query.mjs code --year 2025 --code 238 [--limit 3]
 *   node query.mjs transcript --year 2025 --code 238 [--limit 20]
 */

const BASE = process.env.WWDC_QUICK_LOOK_BASE_URL ?? 'https://cdn.jsdelivr.net/gh/OneeMe/wwdc-reports@main/data';

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${url}`);
  return r.json();
}

async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${url}`);
  return r.text();
}

function eventShortFromYear(year) {
  return `wwdc${String(year).slice(-2)}`;
}

async function loadIndex() {
  return fetchJson(`${BASE}/index.json`);
}

async function loadYearData(year) {
  const short = eventShortFromYear(year);
  const raw = await fetchJson(`${BASE}/${short}/raw_data.json`);
  return raw;
}

function formatSessionTable(videos, topics, maxDesc = 120) {
  const rows = Object.values(videos)
    .sort((a, b) => Number(a.eventContentId) - Number(b.eventContentId));
  let out = '| Code | Title | Topic | Description |\n';
  out += '|------|-------|-------|-------------|\n';
  for (const v of rows) {
    const topic = topics[v.primaryTopicID]?.title ?? v.primaryTopicID ?? '';
    let desc = (v.description ?? '').replace(/\n/g, ' ');
    if (desc.length > maxDesc) desc = desc.slice(0, maxDesc - 1) + '…';
    out += `| ${v.eventContentId} | ${v.title} | ${topic} | ${desc} |\n`;
  }
  return out;
}

function escapeMd(text) {
  return String(text ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function videosArray(data) {
  return Object.values(data.videos ?? {});
}

function findVideo(data, code) {
  return videosArray(data).find((v) => v.eventContentId === String(code));
}

function sessionSearchText(video) {
  const resources = (video.resources ?? [])
    .flatMap((resource) => [resource.type, resource.title, resource.url]);
  const codeSnippets = (video.codeSnippets ?? [])
    .flatMap((snippet) => [snippet.title, snippet.code]);
  return [
    video.title,
    video.description,
    ...resources,
    ...codeSnippets
  ].join('\n').toLowerCase();
}

function codeLanguage(code) {
  const text = String(code ?? '');
  if (/\b(import\s+SwiftUI|import\s+UIKit|struct\s+\w+\s*:\s*View|func\s+\w+)/.test(text)) return 'swift';
  if (/^\s*(container|xcrun|swift|git|curl|npm|node)\b/m.test(text)) return 'sh';
  return '';
}

function formatResourceList(resources) {
  if (!resources || resources.length === 0) return 'No session resources available.\n';
  let out = '| Type | Title | URL |\n';
  out += '|------|-------|-----|\n';
  for (const resource of resources) {
    out += `| ${escapeMd(resource.type ?? '')} | ${escapeMd(resource.title ?? '')} | ${escapeMd(resource.url ?? '')} |\n`;
  }
  return out;
}

function formatCodeSnippets(snippets, limit) {
  const items = (snippets ?? []).slice(0, limit ? Number(limit) : undefined);
  if (items.length === 0) return 'No code snippets available.\n';

  let out = '';
  for (const snippet of items) {
    const title = [snippet.timestamp, snippet.title].filter(Boolean).join(' - ');
    out += `### ${title}\n\n`;
    if (snippet.url) out += `[Open at timestamp](${snippet.url})\n\n`;
    out += `\`\`\`${codeLanguage(snippet.code)}\n${snippet.code ?? ''}\n\`\`\`\n\n`;
  }
  if (limit && (snippets ?? []).length > Number(limit)) {
    out += `*...${snippets.length - Number(limit)} more snippet(s). Use without --limit for all snippets.*\n`;
  }
  return out;
}

// ---- commands ----

async function cmdListYears() {
  const index = await loadIndex();
  let out = '## Available years\n\n';
  for (const y of index.years) {
    out += `- **${y.displayName}** — ${y.sessionCount} sessions, ${y.topicCount} topics, locales: ${y.locales.join(', ')}\n`;
  }
  return out;
}

async function cmdListTopics({ year }) {
  const data = await loadYearData(year);
  const topics = Object.values(data.topics ?? {}).sort((a, b) => a.title.localeCompare(b.title));
  let out = `## WWDC${String(year).slice(-2)} Topics (${topics.length})\n\n`;
  for (const t of topics) {
    const count = Object.values(data.videos ?? {}).filter(
      (v) => v.primaryTopicID === t.id || (v.topicIds ?? []).includes(t.id)
    ).length;
    out += `- **${t.title}** — ${count} session(s)\n`;
  }
  return out;
}

async function cmdListSessions({ year }) {
  const data = await loadYearData(year);
  const videos = data.videos ?? {};
  const topics = data.topics ?? {};
  let out = `## WWDC${String(year).slice(-2)} Sessions (${Object.keys(videos).length})\n\n`;
  out += formatSessionTable(videos, topics);
  return out;
}

async function cmdFilterTopic({ year, topic }) {
  const data = await loadYearData(year);
  const topics = data.topics ?? {};
  const videos = Object.values(data.videos ?? {});

  // fuzzy match topic name
  const topicKey = Object.keys(topics).find(
    (k) => topics[k].title.toLowerCase() === topic.toLowerCase()
  ) ?? Object.keys(topics).find(
    (k) => topics[k].title.toLowerCase().includes(topic.toLowerCase())
  );

  if (!topicKey) {
    const available = Object.values(topics).map((t) => t.title).join(', ');
    return `Topic "${topic}" not found. Available: ${available}`;
  }

  const matched = videos.filter(
    (v) => v.primaryTopicID === topicKey || (v.topicIds ?? []).includes(topicKey)
  );

  let out = `## Sessions in "${topics[topicKey].title}" (${matched.length})\n\n`;
  out += formatSessionTable(matched, topics);
  return out;
}

async function cmdSearch({ year, keyword }) {
  const data = await loadYearData(year);
  const topics = data.topics ?? {};
  const videos = videosArray(data);
  const kw = keyword.toLowerCase();
  const matched = videos.filter((v) => sessionSearchText(v).includes(kw));

  let out = `## Sessions matching "${keyword}" (${matched.length})\n\n`;
  out += formatSessionTable(matched, topics);
  return out;
}

async function cmdShowSession({ year, code }) {
  const data = await loadYearData(year);
  const video = findVideo(data, code);
  if (!video) return `Session ${code} not found in WWDC${String(year).slice(-2)}.`;

  const topics = data.topics ?? {};
  const topicNames = (video.topicIds ?? []).map((id) => topics[id]?.title ?? id);
  const resources = video.resources ?? [];
  const codeSnippets = video.codeSnippets ?? [];

  let out = `## ${video.title}\n\n`;
  out += `- **Code:** ${video.eventContentId}\n`;
  out += `- **Topics:** ${topicNames.join(', ')}\n`;
  out += `- **Link:** ${video.webPermalink}\n`;
  out += `- **Resources:** ${resources.length}\n`;
  out += `- **Code snippets:** ${codeSnippets.length}\n`;
  out += `\n${video.description ?? ''}\n`;
  if (resources.length > 0) {
    out += `\n### Resources (${resources.length})\n\n`;
    out += formatResourceList(resources);
  }
  if (codeSnippets.length > 0) {
    out += `\n### Code snippets (${codeSnippets.length})\n\n`;
    for (const snippet of codeSnippets.slice(0, 5)) {
      out += `- ${snippet.timestamp ? `${snippet.timestamp} - ` : ''}${snippet.title ?? 'Untitled'}${snippet.url ? ` (${snippet.url})` : ''}\n`;
    }
    if (codeSnippets.length > 5) out += `- ...${codeSnippets.length - 5} more snippet(s)\n`;
  }
  return out;
}

async function cmdResources({ year, code }) {
  const data = await loadYearData(year);
  const video = findVideo(data, code);
  if (!video) return `Session ${code} not found in WWDC${String(year).slice(-2)}.`;

  const resources = video.resources ?? [];
  let out = `## Resources for ${code} (${resources.length})\n\n`;
  out += formatResourceList(resources);
  return out;
}

async function cmdCode({ year, code, limit }) {
  const data = await loadYearData(year);
  const video = findVideo(data, code);
  if (!video) return `Session ${code} not found in WWDC${String(year).slice(-2)}.`;

  const snippets = video.codeSnippets ?? [];
  const shown = limit ? Math.min(Number(limit), snippets.length) : snippets.length;
  let out = `## Code snippets for ${code} (${shown}/${snippets.length})\n\n`;
  out += formatCodeSnippets(snippets, limit);
  return out;
}

async function cmdTranscript({ year, code, limit }) {
  const short = eventShortFromYear(year);
  const url = `${BASE}/${short}/transcripts-en/${code}.txt`;
  let text;
  try {
    text = await fetchText(url);
  } catch (e) {
    return `Transcript for ${code} not available (${e.message}).`;
  }

  const lines = text.split('\n').filter((l) => l.trim());
  const total = lines.length;
  const shown = limit ? lines.slice(0, Number(limit)) : lines;

  let out = `## Transcript for ${code} (${shown.length}/${total} lines)\n\n`;
  out += '```\n' + shown.join('\n') + '\n```\n';
  if (limit && total > Number(limit)) {
    out += `\n*…${total - Number(limit)} more lines. Use without --limit for full text.*`;
  }
  return out;
}

// ---- main ----

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      args._.push(a);
      continue;
    }
    const [flag, val] = a.slice(2).split('=', 2);
    args[flag] = val ?? argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];

  let result;
  switch (cmd) {
    case 'list-years':
      result = await cmdListYears();
      break;
    case 'list-topics':
      result = await cmdListTopics({ year: args.year });
      break;
    case 'list-sessions':
      result = await cmdListSessions({ year: args.year });
      break;
    case 'filter-topic':
      result = await cmdFilterTopic({ year: args.year, topic: args.topic });
      break;
    case 'search':
      result = await cmdSearch({ year: args.year, keyword: args.keyword });
      break;
    case 'show-session':
      result = await cmdShowSession({ year: args.year, code: args.code });
      break;
    case 'resources':
    case 'session-resources':
      result = await cmdResources({ year: args.year, code: args.code });
      break;
    case 'code':
    case 'sample-code':
    case 'code-snippets':
      result = await cmdCode({ year: args.year, code: args.code, limit: args.limit });
      break;
    case 'transcript':
      result = await cmdTranscript({ year: args.year, code: args.code, limit: args.limit });
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.error('See SKILL.md for usage.');
      process.exit(1);
  }

  console.log(result);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
