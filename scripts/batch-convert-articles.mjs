import fs from 'fs';
import path from 'path';

const REF_REPO = '/Users/onee/Code/onee-workspace/projects/learning/wwdc/src/content';
const OUTPUT_DIR = '/Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look/web/src/content/articles';
const DATA_DIR = '/Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look/data';

const WWDC26_THUMB_BASE = 'https://wwdc.zhangferry.com/images/sessions/2026';

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const fm = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      let val = rest.join(':').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      }
      fm[key.trim()] = val;
    }
  });
  return { frontmatter: fm, body: match[2].trim() };
}

function getSessionData(year, id) {
  const dataPath = path.join(DATA_DIR, `wwdc${year.slice(2)}`, 'raw_data.json');
  if (!fs.existsSync(dataPath)) return null;
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  return data.videos[`wwdc${year}-${id}`] || null;
}

function getRelatedSessions(year, topicId, excludeId) {
  const dataPath = path.join(DATA_DIR, `wwdc${year.slice(2)}`, 'raw_data.json');
  if (!fs.existsSync(dataPath)) return [];
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  return Object.values(data.videos)
    .filter(v => v.primaryTopicID === topicId && v.eventContentId !== excludeId)
    .slice(0, 4)
    .map(v => ({
      title: v.title,
      code: v.eventContentId,
      description: (v.description || '').substring(0, 80)
    }));
}

function escapeYaml(str) {
  if (!str) return '';
  return str.replace(/"/g, '\\"').replace(/\n/g, ' ');
}

function convertToMdx(refArticle, year, sessionData) {
  const { frontmatter: fm, body } = refArticle;
  const id = fm.id;

  // Use reference repo's thumbnail URL directly
  let thumbnail = fm.thumbnail || '';
  // For WWDC2026, reference repo uses local paths - map to full URL
  if (thumbnail.startsWith('/images/sessions/2026/')) {
    thumbnail = `https://wwdc.zhangferry.com${thumbnail}`;
  } else if (thumbnail.startsWith('/images/sessions/')) {
    // Handle other years if they use local paths
    thumbnail = `https://wwdc.zhangferry.com${thumbnail}`;
  }
  // Otherwise keep the Apple CDN URL as-is from reference repo

  const sections = {};
  const sectionMatches = body.match(/## (.+)\n\n([\s\S]*?)(?=\n## |$)/g);
  if (sectionMatches) {
    sectionMatches.forEach(match => {
      const titleMatch = match.match(/## (.+)\n\n([\s\S]*)/);
      if (titleMatch) {
        sections[titleMatch[1].trim()] = titleMatch[2].trim();
      }
    });
  }

  const related = getRelatedSessions(year, sessionData?.primaryTopicID, id);
  const title = sessionData?.title || fm.title;
  const description = sessionData?.description || '';
  const track = fm.track || sessionData?.primaryTopicID || 'Essentials';

  const keyContent = sections['这场 Session 讲了什么'] || sections['一句话判断'] || body.substring(0, 300);
  const highlight = extractHighlight(keyContent, title);
  const coreContent = buildCoreContent(sections, title);

  const relatedYaml = related.length > 0
    ? related.map(r => `  - title: "${escapeYaml(r.title)}"\n    code: "${r.code}"\n    description: "${escapeYaml(r.description)}"`).join('\n')
    : '  []';

  const mdx = `---
title: "${escapeYaml(title)}"
description: "${escapeYaml(description.substring(0, 200))}"
date: ${new Date().toISOString().split('T')[0]}
tags: [${(fm.tags || [track]).map(t => `"${escapeYaml(t)}"`).join(', ')}]
thumbnail: "${thumbnail || ''}"
videoUrl: "${fm.videoUrl || `https://developer.apple.com/videos/play/wwdc${year.slice(2)}/${id}/`}"
sessionId: "wwdc${year}-${id}"
year: "${year}"
relatedSessions:
${relatedYaml}
---

# ${title}

---

## Highlight

> ${highlight}

---

## 核心内容

${coreContent}

---

## 相关 Session

${related.length > 0 ? related.map(r => `- [${r.title}](/articles?year=${year}&topic=all&search=${r.code}) — ${r.description}`).join('\n') : '- 暂无相关 Session'}
`;

  return mdx;
}

function extractHighlight(content, title) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length > 0) {
    const first = lines[0].trim();
    if (first.length < 200) return first;
  }
  return `深入了解 ${title} 的技术细节和最佳实践。`;
}

function buildCoreContent(sections, title) {
  const contentParts = [];

  if (sections['这场 Session 讲了什么']) {
    contentParts.push(sections['这场 Session 讲了什么']);
  }

  const extraSections = ['最佳实践', '新 API 与用法', '底层原理', '代码示例'];
  for (const key of extraSections) {
    if (sections[key]) {
      contentParts.push(`\n### ${key}\n\n${sections[key]}`);
    }
  }

  if (contentParts.length === 0) {
    return `这篇文章介绍了 ${title} 的核心内容。请查看 Apple 官方视频页面获取完整信息。`;
  }

  return contentParts.join('\n\n');
}

function processYear(year) {
  const refDir = path.join(REF_REPO, `wwdc${year}`);

  if (!fs.existsSync(refDir)) {
    console.log(`No reference data for ${year}`);
    return 0;
  }

  const files = fs.readdirSync(refDir).filter(f => f.endsWith('.md'));
  let count = 0;

  for (const file of files) {
    const id = file.replace('.md', '');
    const refPath = path.join(refDir, file);
    const refContent = fs.readFileSync(refPath, 'utf8');

    const parsed = parseFrontmatter(refContent);
    if (!parsed) {
      console.warn(`Failed to parse ${file}`);
      continue;
    }

    const sessionData = getSessionData(year, id);
    const mdx = convertToMdx(parsed, year, sessionData);

    const outputPath = path.join(OUTPUT_DIR, `wwdc${year}-${id}.mdx`);
    fs.writeFileSync(outputPath, mdx);
    count++;
  }

  return count;
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];
let total = 0;

for (const year of years) {
  console.log(`Processing WWDC${year}...`);
  const count = processYear(year);
  console.log(`  Generated ${count} articles`);
  total += count;
}

console.log(`\nTotal: ${total} MDX files in ${OUTPUT_DIR}`);
