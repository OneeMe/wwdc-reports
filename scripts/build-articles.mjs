import fs from 'fs';
import path from 'path';

const __dirname = process.cwd();

// ── Configuration ──
const YEAR_UUID_MAP = {
  '2020': '49', '2021': '119', '2022': '124',
  '2023': 'D35E0E85-CCB6-41A1-B227-7995ECD83ED5',
  '2024': '125294AE-836B-4513-B7B0-0BC5666246B0',
  '2025': '3055294D-836B-4513-B7B0-0BC5666246B0',
  '2026': '9B2E82C5-4DDF-4B9A-9459-328D8E297696',
};

const TOPIC_COLORS = {
  'essentials': ['#FF6B35', '#F7931E'],
  'app-services': ['#00D4AA', '#00A896'],
  'ai-machine-learning': ['#A855F7', '#7C3AED'],
  'graphics-games': ['#F43F5E', '#E11D48'],
  'audio-video': ['#EC4899', '#DB2777'],
  'photos-camera': ['#8B5CF6', '#6366F1'],
  'spatial-computing': ['#06B6D4', '#0891B2'],
  'developer-tools': ['#10B981', '#059669'],
  'swift': ['#F97316', '#EA580C'],
  'system-services': ['#3B82F6', '#2563EB'],
  'swiftui-ui-frameworks': ['#14B8A6', '#0D9488'],
  'design': ['#EAB308', '#CA8A04'],
  'app-store-distribution-marketing': ['#EF4444', '#DC2626'],
  'safari-web': ['#6366F1', '#4F46E5'],
  'health-fitness': ['#22C55E', '#16A34A'],
  'accessibility-inclusion': ['#F59E0B', '#D97706'],
  'business-education': ['#64748B', '#475569'],
  'privacy-security': ['#84CC16', '#65A30D'],
  'maps-location': ['#3B82F6', '#1E40AF'],
  'default': ['#3B82F6', '#1E40AF'],
};

// ── Load and process data ──
const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];
const allSessions = [];
const allTopics = {};
const yearCounts = {};

for (const year of years) {
  const dataPath = path.join(__dirname, 'data', `wwdc${year.slice(2)}`, 'raw_data.json');
  if (!fs.existsSync(dataPath)) continue;
  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const videos = Object.values(raw.videos || {});
  const topics = raw.topics || {};

  for (const [tid, tinfo] of Object.entries(topics)) {
    if (!allTopics[tid]) {
      allTopics[tid] = {
        id: tid,
        title: tinfo.title || tid,
        color: TOPIC_COLORS[tid] || TOPIC_COLORS.default,
      };
    }
  }

  yearCounts[year] = 0;
  for (const video of videos) {
    allSessions.push([
      year, video.eventContentId, video.title,
      (video.description || '').substring(0, 200),
      video.primaryTopicID, video.webPermalink,
      (video.resources || []).length,
      (video.codeSnippets || []).length,
    ]);
    yearCounts[year]++;
  }
}

allSessions.sort((a, b) => {
  if (a[0] !== b[0]) return b[0].localeCompare(a[0]);
  const aN = parseInt(a[1], 10), bN = parseInt(b[1], 10);
  if (!isNaN(aN) && !isNaN(bN)) return aN - bN;
  return a[1].localeCompare(b[1]);
});

const DATA_JSON = JSON.stringify({
  y: years.reverse(), c: yearCounts,
  t: Object.values(allTopics), s: allSessions, u: YEAR_UUID_MAP,
});

// ── i18n strings ──
const I18N = {
  zh: {
    documentTitle: 'WWDC Quick Look · Session 浏览器',
    brandLabel: 'WWDC Quick Look',
    navArticles: 'Articles',
    navSkill: 'Skill',
    searchPlaceholder: '搜索 Session...',
    filterYear: '年份',
    filterTopic: '主题',
    filterAll: '全部',
    filterAllTopics: '全部主题',
    contentTitleAll: '全部 Session',
    contentTitleSearch: '搜索',
    contentTitleYearTopic: (y, t) => `WWDC${y.slice(2)} · ${t}`,
    contentTitleYear: (y) => `WWDC${y.slice(2)}`,
    contentTitleTopic: (t) => t,
    sessionCount: (n) => `${n} 个 Session`,
    emptyTitle: '未找到 Session',
    emptyDesc: '尝试调整筛选条件或搜索关键词。',
    footer: '数据来源于 Apple Developer · 由 SwiftGG Team 构建',
    mobileFilters: '筛选',
    cardResources: '资源',
    cardCode: '代码',
  },
  en: {
    documentTitle: 'WWDC Quick Look · Session Browser',
    brandLabel: 'WWDC Quick Look',
    navArticles: 'Articles',
    navSkill: 'Skill',
    searchPlaceholder: 'Search sessions...',
    filterYear: 'Year',
    filterTopic: 'Topic',
    filterAll: 'All',
    filterAllTopics: 'All Topics',
    contentTitleAll: 'All Sessions',
    contentTitleSearch: (q) => `Search: "${q}"`,
    contentTitleYearTopic: (y, t) => `WWDC${y.slice(2)} · ${t}`,
    contentTitleYear: (y) => `WWDC${y.slice(2)}`,
    contentTitleTopic: (t) => t,
    sessionCount: (n) => `${n} session${n !== 1 ? 's' : ''}`,
    emptyTitle: 'No sessions found',
    emptyDesc: 'Try adjusting your filters or search query.',
    footer: 'Data from Apple Developer · Built by SwiftGG Team',
    mobileFilters: 'Filters',
    cardResources: 'resources',
    cardCode: 'code snippets',
  },
  ja: {
    documentTitle: 'WWDC Quick Look · セッションブラウザ',
    brandLabel: 'WWDC Quick Look',
    navArticles: 'Articles',
    navSkill: 'Skill',
    searchPlaceholder: 'セッションを検索...',
    filterYear: '年',
    filterTopic: 'トピック',
    filterAll: 'すべて',
    filterAllTopics: 'すべてのトピック',
    contentTitleAll: 'すべてのセッション',
    contentTitleSearch: (q) => `検索: "${q}"`,
    contentTitleYearTopic: (y, t) => `WWDC${y.slice(2)} · ${t}`,
    contentTitleYear: (y) => `WWDC${y.slice(2)}`,
    contentTitleTopic: (t) => t,
    sessionCount: (n) => `${n} セッション`,
    emptyTitle: 'セッションが見つかりません',
    emptyDesc: 'フィルターや検索キーワードを調整してみてください。',
    footer: 'データ提供: Apple Developer · 構築: SwiftGG Team',
    mobileFilters: 'フィルター',
    cardResources: 'リソース',
    cardCode: 'コード',
  },
};

const I18N_JSON = JSON.stringify(I18N);

// ── Build HTML ──
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title data-i18n="documentTitle">WWDC Quick Look · Session 浏览器</title>
<link rel="icon" href="assets/swiftgg-mark-color.svg" type="image/svg+xml">
<style>
:root {
  --bg: #f5f6f8; --surface: #ffffff; --text: #1a1a2e;
  --text-secondary: #6b7280; --text-muted: #9ca3af;
  --border: #e5e7eb; --border-light: #f3f4f6;
  --accent: #007aff; --accent-hover: #0051d5;
  --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05);
  --shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
  --radius-sm: 6px; --radius: 10px; --radius-lg: 14px;
  --sidebar-width: 220px;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif;
  background: var(--bg); color: var(--text); line-height: 1.5; min-height: 100vh;
}

/* ── Navbar ── */
.navbar {
  position: sticky; top: 0; z-index: 100;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(16px) saturate(1.8);
  -webkit-backdrop-filter: blur(16px) saturate(1.8);
  border-bottom: 1px solid var(--border-light);
}
.navbar-inner {
  max-width: 1400px; margin: 0 auto; padding: 0 24px;
  height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.nav-brand {
  display: flex; align-items: center; gap: 10px;
  font-size: 1.1rem; font-weight: 700; color: var(--text); text-decoration: none; letter-spacing: -0.01em;
}
.nav-brand svg { width: 28px; height: 28px; flex-shrink: 0; }
.nav-links {
  display: flex; align-items: center; gap: 4px;
}
.nav-links a {
  padding: 6px 14px; border-radius: 10px;
  font-size: 0.88rem; font-weight: 640; color: var(--text-secondary); text-decoration: none;
  transition: color .15s, background .15s;
}
.nav-links a:hover { color: var(--text); background: rgba(0,0,0,0.04); }
.nav-links a.active { color: var(--accent); background: rgba(0,122,255,0.08); font-weight: 600; }

.lang-switcher {
  display: flex; gap: 2px; padding: 3px;
  border: 1px solid var(--border); border-radius: 10px; background: var(--surface);
}
.lang-btn {
  min-height: 30px; border: 0; border-radius: 7px;
  padding: 0 11px; color: var(--text-muted); background: transparent;
  cursor: pointer; font: inherit; font-size: 0.82rem; font-weight: 600;
  transition: all .15s;
}
.lang-btn.active { color: var(--text); background: var(--bg); }

.search-box { position: relative; width: 240px; }
.search-box input {
  width: 100%; height: 36px; padding: 0 36px 0 14px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--surface); font-size: 0.875rem; color: var(--text);
  outline: none; transition: border-color .2s, box-shadow .2s;
}
.search-box input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,122,255,0.1); }
.search-box input::placeholder { color: var(--text-muted); }
.search-box svg {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  width: 16px; height: 16px; color: var(--text-muted); pointer-events: none;
}

.mobile-filter-toggle {
  display: none; background: none; border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 6px 12px;
  font-size: 0.875rem; color: var(--text-secondary); cursor: pointer;
}

/* ── Layout ── */
.layout {
  max-width: 1400px; margin: 0 auto; padding: 24px;
  display: flex; gap: 28px;
}

/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-width); flex-shrink: 0;
  position: sticky; top: 80px; height: calc(100vh - 104px);
  overflow-y: auto; scrollbar-width: thin;
}
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

.filter-section { margin-bottom: 28px; }
.filter-title {
  font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 12px; padding-left: 4px;
}
.filter-group { display: flex; flex-direction: column; gap: 2px; }
.filter-item {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 10px; border-radius: var(--radius-sm); cursor: pointer;
  transition: background .15s; font-size: 0.875rem; color: var(--text-secondary);
  user-select: none;
}
.filter-item:hover { background: var(--border-light); color: var(--text); }
.filter-item.active { background: rgba(0,122,255,0.08); color: var(--accent); font-weight: 500; }
.filter-item input { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; flex-shrink: 0; }
.filter-item .filter-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.filter-item .filter-count { font-size: 0.75rem; color: var(--text-muted); flex-shrink: 0; }
.filter-item.active .filter-count { color: var(--accent); }

/* ── Content ── */
.content { flex: 1; min-width: 0; }
.content-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-light);
}
.content-title { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }
.content-count { font-size: 0.875rem; color: var(--text-muted); font-weight: 400; }

/* ── Session Grid ── */
.session-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.session-card {
  display: block; background: var(--surface); border-radius: var(--radius-lg);
  overflow: hidden; box-shadow: var(--shadow-sm); border: 1px solid var(--border-light);
  text-decoration: none; color: inherit;
  transition: transform .2s ease, box-shadow .2s ease;
  cursor: pointer;
}
.session-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }

.card-cover {
  position: relative; width: 100%; aspect-ratio: 16 / 9;
  overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.card-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card-cover .cover-fallback {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.9); font-size: 3rem; font-weight: 800;
  letter-spacing: -0.03em; text-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.card-topic-badge {
  position: absolute; bottom: 10px; left: 10px;
  padding: 3px 10px; border-radius: 20px;
  font-size: 0.7rem; font-weight: 600; color: #fff;
  background: rgba(0,0,0,0.45); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  letter-spacing: 0.02em;
}
.card-year-badge {
  position: absolute; top: 10px; right: 10px;
  padding: 3px 10px; border-radius: 20px;
  font-size: 0.7rem; font-weight: 600; color: #fff;
  background: rgba(0,0,0,0.35); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}

.card-body { padding: 14px 16px 16px; }
.card-title {
  font-size: 0.9375rem; font-weight: 600; line-height: 1.4; color: var(--text);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; margin-bottom: 6px; letter-spacing: -0.01em;
}
.card-desc {
  font-size: 0.8125rem; line-height: 1.5; color: var(--text-secondary);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-meta {
  display: flex; align-items: center; gap: 12px;
  margin-top: 10px; padding-top: 10px;
  border-top: 1px solid var(--border-light);
  font-size: 0.75rem; color: var(--text-muted);
}
.card-meta span { display: flex; align-items: center; gap: 4px; }

/* ── Empty State ── */
.empty-state {
  text-align: center; padding: 80px 20px; color: var(--text-muted);
  grid-column: 1 / -1;
}
.empty-state svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; }
.empty-state h3 { font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 8px; }
.empty-state p { font-size: 0.875rem; }

/* ── Loading ── */
.loading { text-align: center; padding: 60px; color: var(--text-muted); }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Sidebar Overlay ── */
.sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 150; backdrop-filter: blur(4px); }
.sidebar-overlay.open { display: block; }
.sidebar.mobile-open {
  position: fixed; top: 0; left: 0; height: 100vh; z-index: 200;
  background: var(--surface); padding: 20px; box-shadow: var(--shadow-lg);
}

/* ── Footer ── */
.site-footer {
  max-width: 1400px; margin: 40px auto 0; padding: 24px;
  text-align: center; color: var(--text-muted); font-size: 0.8125rem;
  border-top: 1px solid var(--border-light);
}
.site-footer a { color: var(--text-secondary); text-decoration: none; }
.site-footer a:hover { color: var(--accent); }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .search-box { width: 200px; }
}
@media (max-width: 768px) {
  .navbar-inner { padding: 0 16px; }
  .nav-links { display: none; }
  .search-box { width: 160px; }
  .mobile-filter-toggle { display: block; }
  .layout { flex-direction: column; padding: 16px; gap: 16px; }
  .sidebar { display: none; width: 280px; position: fixed; top: 0; left: 0; height: 100vh; z-index: 200; background: var(--surface); padding: 20px; box-shadow: var(--shadow-lg); }
  .sidebar.mobile-open { display: block; }
  .session-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
}
@media (max-width: 480px) {
  .session-grid { grid-template-columns: 1fr; }
  .search-box { width: 140px; }
}
</style>
</head>
<body>
<nav class="navbar">
  <div class="navbar-inner">
    <a href="index.html" class="nav-brand">
      <svg viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#FF6B35"/><path d="M10 16C10 12.6863 12.6863 10 16 10C19.3137 10 22 12.6863 22 16C22 19.3137 19.3137 22 16 22" stroke="white" stroke-width="2.5" stroke-linecap="round"/><path d="M16 22C13.7909 22 12 20.2091 12 18C12 15.7909 13.7909 14 16 14C18.2091 14 20 15.7909 20 18" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>
      <span data-i18n="brandLabel">WWDC Quick Look</span>
    </a>
    <div style="display:flex;align-items:center;gap:12px;">
      <nav class="nav-links">
        <a href="articles.html" class="active" data-i18n="navArticles">Articles</a>
      </nav>
      <div class="lang-switcher" aria-label="Language">
        <button class="lang-btn active" data-lang="zh" type="button">中文</button>
        <button class="lang-btn" data-lang="en" type="button">EN</button>
        <button class="lang-btn" data-lang="ja" type="button">日本語</button>
      </div>
      <div class="search-box">
        <input type="text" id="searchInput" data-i18n-placeholder="searchPlaceholder" placeholder="搜索 Session..." autocomplete="off">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </div>
      <button class="mobile-filter-toggle" id="mobileFilterToggle" data-i18n="mobileFilters">筛选</button>
    </div>
  </div>
</nav>

<div class="sidebar-overlay" id="sidebarOverlay"></div>

<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="filter-section">
      <div class="filter-title" data-i18n="filterYear">年份</div>
      <div class="filter-group" id="yearFilters"></div>
    </div>
    <div class="filter-section">
      <div class="filter-title" data-i18n="filterTopic">主题</div>
      <div class="filter-group" id="topicFilters"></div>
    </div>
  </aside>

  <main class="content">
    <div class="content-header">
      <h1 class="content-title" id="contentTitle" data-i18n="contentTitleAll">全部 Session</h1>
      <span class="content-count" id="contentCount">...</span>
    </div>
    <div class="session-grid" id="sessionGrid">
      <div class="loading"><div class="spinner"></div>Loading...</div>
    </div>
  </main>
</div>

<footer class="site-footer">
  <p data-i18n="footer">数据来源于 Apple Developer · 由 SwiftGG Team 构建</p>
</footer>

<script>
const DATA = ${DATA_JSON};
const I18N = ${I18N_JSON};

const years = DATA.y;
const yearCounts = DATA.c;
const topics = DATA.t;
const sessions = DATA.s.map(s => ({
  year: s[0], contentId: s[1], title: s[2], description: s[3],
  primaryTopic: s[4], permalink: s[5], resources: s[6], codeSnippets: s[7],
}));

const topicColorMap = {};
topics.forEach(t => { topicColorMap[t.id] = t.color; });

let activeYear = 'all', activeTopic = 'all', searchQuery = '';
let currentLang = 'zh';

function t(key, ...args) {
  const str = I18N[currentLang]?.[key];
  if (!str) return key;
  return typeof str === 'function' ? str(...args) : str;
}

function getGradient(topicId) {
  const c = topicColorMap[topicId] || topicColorMap.default || ['#667eea', '#764ba2'];
  return \`linear-gradient(135deg, \${c[0]} 0%, \${c[1]} 100%)\`;
}

function getThumbnailUrl(session) {
  return \`/images/sessions/\${session.year}/\${session.contentId}.jpg\`;
}

function esc(str) {
  const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
}

function updateI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = I18N[currentLang]?.[key];
    if (val && typeof val === 'string') el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const val = I18N[currentLang]?.[key];
    if (val && typeof val === 'string') el.placeholder = val;
  });
  document.title = I18N[currentLang]?.documentTitle || 'WWDC Quick Look';
}

function renderFilters() {
  const yc = document.getElementById('yearFilters');
  let yh = \`
    <label class="filter-item active" data-year="all">
      <input type="radio" name="year" value="all" checked>
      <span class="filter-label">\${esc(t('filterAll'))}</span>
      <span class="filter-count">\${sessions.length}</span>
    </label>
  \`;
  years.forEach(year => {
    yh += \`
      <label class="filter-item" data-year="\${year}">
        <input type="radio" name="year" value="\${year}">
        <span class="filter-label">WWDC\${year.slice(2)}</span>
        <span class="filter-count">\${yearCounts[year] || 0}</span>
      </label>
    \`;
  });
  yc.innerHTML = yh;

  const tc = document.getElementById('topicFilters');
  let th = \`
    <label class="filter-item active" data-topic="all">
      <input type="radio" name="topic" value="all" checked>
      <span class="filter-label">\${esc(t('filterAllTopics'))}</span>
      <span class="filter-count">\${sessions.length}</span>
    </label>
  \`;
  topics.forEach(topic => {
    const count = sessions.filter(s => s.primaryTopic === topic.id).length;
    th += \`
      <label class="filter-item" data-topic="\${topic.id}">
        <input type="radio" name="topic" value="\${topic.id}">
        <span class="filter-label">\${esc(topic.title)}</span>
        <span class="filter-count">\${count}</span>
      </label>
    \`;
  });
  tc.innerHTML = th;

  document.querySelectorAll('#yearFilters .filter-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      activeYear = item.dataset.year;
      document.querySelectorAll('#yearFilters .filter-item').forEach(el =>
        el.classList.toggle('active', el.dataset.year === activeYear));
      document.querySelectorAll('#yearFilters input').forEach(el => el.checked = el.value === activeYear);
      updateResults();
    });
  });

  document.querySelectorAll('#topicFilters .filter-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      activeTopic = item.dataset.topic;
      document.querySelectorAll('#topicFilters .filter-item').forEach(el =>
        el.classList.toggle('active', el.dataset.topic === activeTopic));
      document.querySelectorAll('#topicFilters input').forEach(el => el.checked = el.value === activeTopic);
      updateResults();
    });
  });
}

function renderCards(filtered) {
  const grid = document.getElementById('sessionGrid');
  if (filtered.length === 0) {
    grid.innerHTML = \`
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <h3>\${esc(t('emptyTitle'))}</h3>
        <p>\${esc(t('emptyDesc'))}</p>
      </div>
    \`;
    return;
  }

  grid.innerHTML = filtered.map(s => {
    const topic = topics.find(t => t.id === s.primaryTopic);
    const topicTitle = topic ? topic.title : s.primaryTopic;
    const gradient = getGradient(s.primaryTopic);
    const thumbUrl = getThumbnailUrl(s);
    const yearShort = s.year.slice(2);
    const resLabel = s.resources > 0
      ? \`<span>📄 \${s.resources} \${esc(t('cardResources'))}</span>\` : '';
    const codeLabel = s.codeSnippets > 0
      ? \`<span>💻 \${s.codeSnippets} \${esc(t('cardCode'))}</span>\` : '';

    return \`
      <a class="session-card" href="\${esc(s.permalink)}" target="_blank" rel="noopener noreferrer">
        <div class="card-cover" style="background:\${gradient}">
          \${thumbUrl ? \`<img src="\${thumbUrl}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">\` : ''}
          <span class="cover-fallback" style="\${thumbUrl ? 'display:none' : ''}">\${s.contentId}</span>
          <span class="card-year-badge">WWDC\${yearShort}</span>
          <span class="card-topic-badge">\${esc(topicTitle)}</span>
        </div>
        <div class="card-body">
          <div class="card-title">\${esc(s.title)}</div>
          <div class="card-desc">\${esc(s.description)}</div>
          <div class="card-meta">\${resLabel}\${codeLabel}</div>
        </div>
      </a>
    \`;
  }).join('');
}

function updateResults() {
  let filtered = sessions;
  if (activeYear !== 'all') filtered = filtered.filter(s => s.year === activeYear);
  if (activeTopic !== 'all') filtered = filtered.filter(s => s.primaryTopic === activeTopic);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.contentId.includes(q)
    );
  }

  const titleEl = document.getElementById('contentTitle');
  if (activeYear === 'all' && activeTopic === 'all' && !searchQuery) {
    titleEl.textContent = t('contentTitleAll');
  } else if (searchQuery) {
    const fn = I18N[currentLang]?.contentTitleSearch;
    titleEl.textContent = typeof fn === 'function' ? fn(searchQuery) : \`Search: "\${searchQuery}"\`;
  } else if (activeYear !== 'all' && activeTopic !== 'all') {
    const tName = topics.find(t => t.id === activeTopic)?.title || activeTopic;
    const fn = I18N[currentLang]?.contentTitleYearTopic;
    titleEl.textContent = typeof fn === 'function' ? fn(activeYear, tName) : \`WWDC\${activeYear.slice(2)} · \${tName}\`;
  } else if (activeYear !== 'all') {
    const fn = I18N[currentLang]?.contentTitleYear;
    titleEl.textContent = typeof fn === 'function' ? fn(activeYear) : \`WWDC\${activeYear.slice(2)}\`;
  } else {
    const tName = topics.find(t => t.id === activeTopic)?.title || activeTopic;
    const fn = I18N[currentLang]?.contentTitleTopic;
    titleEl.textContent = typeof fn === 'function' ? fn(tName) : tName;
  }

  const countFn = I18N[currentLang]?.sessionCount;
  document.getElementById('contentCount').textContent =
    typeof countFn === 'function' ? countFn(filtered.length) : \`\${filtered.length} sessions\`;

  renderCards(filtered);
}

// Search
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  updateResults();
});

// Language switcher
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentLang = btn.dataset.lang;
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === currentLang));
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : currentLang;
    updateI18n();
    renderFilters();
    updateResults();
  });
});

// Mobile sidebar
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
document.getElementById('mobileFilterToggle').addEventListener('click', () => {
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('open');
});
overlay.addEventListener('click', () => {
  sidebar.classList.remove('mobile-open');
  overlay.classList.remove('open');
});

// Init
updateI18n();
renderFilters();
updateResults();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'web', 'articles.html'), html);
const size = fs.statSync(path.join(__dirname, 'web', 'articles.html')).size;
console.log(`Generated web/articles.html (${(size/1024).toFixed(1)} KB)`);
