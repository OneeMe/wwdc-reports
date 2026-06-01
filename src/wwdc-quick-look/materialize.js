import fs from 'node:fs/promises';
import path from 'node:path';

import { formatDuration, formatTimestamp, sanitizeFilename, sessionCodeFromId } from './format.js';
import { listJsonFiles, readJson } from './fs-utils.js';
import { readTranscriptFile, renderTranscriptLines } from './transcript.js';
import { topicsAndVideos } from './topics.js';
import { timestampUrl, videoUrl } from './event-config.js';

export function sessionFilename(session) {
  const code = sessionCodeFromId(session?.id ?? session?.eventContentId ?? 'session');
  const title = sanitizeFilename(session?.title, code);
  return `${code}-${title}.md`;
}

function renderChapters(session) {
  const baseUrl = session.webPermalink ?? '';
  const chapters = session?.media?.chapters ?? [];
  if (chapters.length === 0) return '- No chapter metadata available.';
  return chapters.map((chapter) => {
    const start = chapter.start ?? chapter.startTimeSeconds ?? 0;
    const seconds = Math.max(0, Math.floor(Number(start) || 0));
    const title = chapter.title ?? 'Untitled chapter';
    const summary = String(chapter.summary ?? '').replace(/\s+/g, ' ').trim();
    const prefix = baseUrl ? `[${formatTimestamp(seconds)}](${timestampUrl(baseUrl, seconds)})` : formatTimestamp(seconds);
    return `- ${prefix} **${title}**${summary ? `: ${summary}` : ''}`;
  }).join('\n');
}

function renderCodeSnippets(session) {
  const snippets = session.codeSnippets ?? session?.media?.codeSnippets ?? [];
  if (snippets.length === 0) return 'No code snippets available.';
  return snippets.map((snippet) => {
    const title = snippet.title ?? 'Code snippet';
    const language = String(snippet.language ?? '').toLowerCase();
    const code = snippet.unstyledCode ?? snippet.code ?? '';
    return `### ${title}\n\n\`\`\`${language}\n${code}\n\`\`\``;
  }).join('\n\n');
}

function renderRelated(session, sessionLookup) {
  const related = session?.related?.activities ?? [];
  if (related.length === 0) return '- No related sessions listed.';
  return related.map((id) => {
    const key = String(id);
    const relatedSession = sessionLookup.get(key);
    if (relatedSession) return `- [${relatedSession.title ?? key}](${relatedSession.webPermalink ?? ''})`;
    return `- ${key}`;
  }).join('\n');
}

export function renderSessionMarkdown(session, options = {}) {
  const sessionLookup = options.sessionLookup ?? new Map();
  const transcriptLines = options.transcriptLines ?? [];
  const includeTranscript = Boolean(options.includeTranscript);
  const url = session.webPermalink || videoUrl(options.config, sessionCodeFromId(session.id));
  const duration = formatDuration(session.duration ?? session?.media?.duration);
  const lines = [
    `# ${session.title ?? session.id}`,
    '',
    `- Session: ${session.id ?? ''}`,
    `- URL: ${url}`,
    duration ? `- Duration: ${duration}` : null,
    session.primaryTopicID !== undefined ? `- Primary topic ID: ${session.primaryTopicID}` : null,
    '',
    '## Description',
    '',
    session.description || 'No description available.',
    '',
    '## Outline',
    '',
    renderChapters(session),
    '',
    '## Code snippets',
    '',
    renderCodeSnippets(session),
    '',
    '## Related sessions',
    '',
    renderRelated(session, sessionLookup),
    '',
    '## Transcript',
    '',
    includeTranscript
      ? (renderTranscriptLines(transcriptLines, url) || 'Transcript file was not found.')
      : 'Transcript is intentionally not embedded by default. Run materialize with --include-transcript for local/private notes.',
    ''
  ];
  return lines.filter((line) => line !== null).join('\n');
}

export async function loadSessions(videoJsonDir) {
  const files = await listJsonFiles(videoJsonDir);
  const sessions = [];
  for (const file of files) sessions.push(await readJson(file));
  return sessions.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
}

export async function materializeSessions(config, options = {}) {
  const sessions = await loadSessions(config.videoJsonDir);
  const sessionLookup = new Map(sessions.map((session) => [String(session.id), session]));
  await fs.mkdir(config.sessionsOutputDir, { recursive: true });

  const written = [];
  for (const session of sessions) {
    const code = sessionCodeFromId(session.id);
    const transcript = await readTranscriptFile(path.join(config.transcriptsDir, `${code}.txt`));
    const markdown = renderSessionMarkdown(session, {
      config,
      sessionLookup,
      transcriptLines: transcript,
      includeTranscript: options.includeTranscript
    });
    const outputPath = path.join(config.sessionsOutputDir, sessionFilename(session));
    await fs.writeFile(outputPath, markdown, 'utf8');
    written.push(outputPath);
  }

  return written;
}

export function renderIndex(rawData, sessions, config) {
  const filenameById = new Map(sessions.map((session) => [String(session.id), sessionFilename(session)]));
  const topics = topicsAndVideos(rawData);
  const lines = [`# ${config.displayName} Sessions by Topic`, ''];
  for (const topic of topics) {
    lines.push(`## ${topic.name}`, '');
    if (topic.videos.length === 0) {
      lines.push('- No sessions listed.', '');
      continue;
    }
    for (const video of topic.videos) {
      const file = filenameById.get(String(video.session_id));
      lines.push(file ? `- [${video.title}](./sessions/${file})` : `- ${video.title}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export async function materializeIndex(config, rawData) {
  const sessions = await loadSessions(config.videoJsonDir);
  await fs.mkdir(path.dirname(config.indexPath), { recursive: true });
  await fs.writeFile(config.indexPath, renderIndex(rawData, sessions, config), 'utf8');
  return config.indexPath;
}
