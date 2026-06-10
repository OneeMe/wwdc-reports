import fs from 'fs';
import path from 'path';

const __dirname = process.cwd();

// Read the compact JSON data
const jsonData = fs.readFileSync(path.join(__dirname, 'web', 'sessions.json'), 'utf8');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WWDC Quick Look · Session Browser</title>
  <link rel="icon" href="assets/swiftgg-mark-color.svg" type="image/svg+xml">
  <meta name="description" content="Browse all WWDC sessions from 2020-2026. Search by year, topic, and keywords.">
  <style>
    :root {
      --bg: #f5f6f8;
      --surface: #ffffff;
      --text: #1a1a2e;
      --text-secondary: #6b7280;
      --text-muted: #9ca3af;
      --border: #e5e7eb;
      --border-light: #f3f4f6;
      --accent: #007aff;
      --accent-hover: #0051d5;
      --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05);
      --shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1);
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
      --radius-sm: 6px;
      --radius: 10px;
      --radius-lg: 14px;
      --sidebar-width: 220px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html { scroll-behavior: smooth; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      min-height: 100vh;
    }

    /* ── Navigation ── */
    .navbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(16px) saturate(1.8);
      -webkit-backdrop-filter: blur(16px) saturate(1.8);
      border-bottom: 1px solid var(--border-light);
    }

    .navbar-inner {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 24px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text);
      text-decoration: none;
      letter-spacing: -0.01em;
    }

    .nav-brand svg {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }

    .nav-brand span {
      white-space: nowrap;
    }

    .nav-meta {
      display: flex;
      align-items: center;
      gap: 20px;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .nav-meta a {
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.2s;
    }

    .nav-meta a:hover {
      color: var(--accent);
    }

    .search-box {
      position: relative;
      width: 260px;
    }

    .search-box input {
      width: 100%;
      height: 36px;
      padding: 0 36px 0 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      font-size: 0.875rem;
      color: var(--text);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .search-box input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(0,122,255,0.1);
    }

    .search-box input::placeholder {
      color: var(--text-muted);
    }

    .search-box svg {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .mobile-filter-toggle {
      display: none;
      background: none;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      font-size: 0.875rem;
      color: var(--text-secondary);
      cursor: pointer;
    }

    /* ── Layout ── */
    .layout {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      display: flex;
      gap: 28px;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: var(--sidebar-width);
      flex-shrink: 0;
      position: sticky;
      top: 80px;
      height: calc(100vh - 104px);
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .sidebar::-webkit-scrollbar {
      width: 4px;
    }

    .sidebar::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 4px;
    }

    .filter-section {
      margin-bottom: 28px;
    }

    .filter-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 12px;
      padding-left: 4px;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .filter-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background 0.15s;
      font-size: 0.875rem;
      color: var(--text-secondary);
      user-select: none;
    }

    .filter-item:hover {
      background: var(--border-light);
      color: var(--text);
    }

    .filter-item.active {
      background: rgba(0,122,255,0.08);
      color: var(--accent);
      font-weight: 500;
    }

    .filter-item input {
      width: 16px;
      height: 16px;
      accent-color: var(--accent);
      cursor: pointer;
      flex-shrink: 0;
    }

    .filter-item .filter-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .filter-item .filter-count {
      font-size: 0.75rem;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .filter-item.active .filter-count {
      color: var(--accent);
    }

    /* ── Content ── */
    .content {
      flex: 1;
      min-width: 0;
    }

    .content-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-light);
    }

    .content-title {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .content-count {
      font-size: 0.875rem;
      color: var(--text-muted);
      font-weight: 400;
    }

    /* ── Session Grid ── */
    .session-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .session-card {
      display: block;
      background: var(--surface);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border-light);
      text-decoration: none;
      color: inherit;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      cursor: pointer;
    }

    .session-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }

    .card-cover {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .card-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .card-cover .cover-fallback {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.9);
      font-size: 3rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      text-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .card-topic-badge {
      position: absolute;
      bottom: 10px;
      left: 10px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 600;
      color: #fff;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      letter-spacing: 0.02em;
    }

    .card-year-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 600;
      color: #fff;
      background: rgba(0,0,0,0.35);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .card-body {
      padding: 14px 16px 16px;
    }

    .card-title {
      font-size: 0.9375rem;
      font-weight: 600;
      line-height: 1.4;
      color: var(--text);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 6px;
      letter-spacing: -0.01em;
    }

    .card-desc {
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--text-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border-light);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .card-meta span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* ── Empty State ── */
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: var(--text-muted);
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 1.1rem;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .empty-state p {
      font-size: 0.875rem;
    }

    /* ── Loading ── */
    .loading {
      text-align: center;
      padding: 60px;
      color: var(--text-muted);
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Mobile Sidebar ── */
    .sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.3);
      z-index: 150;
      backdrop-filter: blur(4px);
    }

    .sidebar-overlay.open {
      display: block;
    }

    .sidebar.mobile-open {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      z-index: 200;
      background: var(--surface);
      padding: 20px;
      box-shadow: var(--shadow-lg);
      transform: translateX(0);
    }

    /* ── Footer ── */
    .site-footer {
      max-width: 1400px;
      margin: 40px auto 0;
      padding: 24px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8125rem;
      border-top: 1px solid var(--border-light);
    }

    .site-footer a {
      color: var(--text-secondary);
      text-decoration: none;
    }

    .site-footer a:hover {
      color: var(--accent);
    }

    /* ── Responsive ── */
    @media (max-width: 1024px) {
      .search-box {
        width: 200px;
      }
    }

    @media (max-width: 768px) {
      .navbar-inner {
        padding: 0 16px;
      }

      .nav-meta {
        display: none;
      }

      .search-box {
        width: 160px;
      }

      .mobile-filter-toggle {
        display: block;
      }

      .layout {
        flex-direction: column;
        padding: 16px;
        gap: 16px;
      }

      .sidebar {
        display: none;
        width: 280px;
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        z-index: 200;
        background: var(--surface);
        padding: 20px;
        box-shadow: var(--shadow-lg);
      }

      .sidebar.mobile-open {
        display: block;
      }

      .session-grid {
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 16px;
      }
    }

    @media (max-width: 480px) {
      .session-grid {
        grid-template-columns: 1fr;
      }

      .search-box {
        width: 140px;
      }
    }
  </style>
</head>
<body>
  <nav class="navbar">
    <div class="navbar-inner">
      <a href="/" class="nav-brand">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#FF6B35"/>
          <path d="M10 16C10 12.6863 12.6863 10 16 10C19.3137 10 22 12.6863 22 16C22 19.3137 19.3137 22 16 22" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M16 22C13.7909 22 12 20.2091 12 18C12 15.7909 13.7909 14 16 14C18.2091 14 20 15.7909 20 18" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <span>WWDC Quick Look</span>
      </a>
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="Search sessions..." autocomplete="off">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <button class="mobile-filter-toggle" id="mobileFilterToggle">Filters</button>
      </div>
      <div class="nav-meta">
        <a href="https://github.com/SwiftGGTeam/wwdc-quick-look" target="_blank" rel="noopener">GitHub</a>
        <span>·</span>
        <span>1,421 sessions</span>
      </div>
    </div>
  </nav>

  <div class="sidebar-overlay" id="sidebarOverlay"></div>

  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="filter-section">
        <div class="filter-title">Year</div>
        <div class="filter-group" id="yearFilters"></div>
      </div>
      <div class="filter-section">
        <div class="filter-title">Topic</div>
        <div class="filter-group" id="topicFilters"></div>
      </div>
    </aside>

    <main class="content">
      <div class="content-header">
        <h1 class="content-title" id="contentTitle">All Sessions</h1>
        <span class="content-count" id="contentCount">Loading...</span>
      </div>
      <div class="session-grid" id="sessionGrid">
        <div class="loading"><div class="spinner"></div>Loading sessions...</div>
      </div>
    </main>
  </div>

  <footer class="site-footer">
    <p>Data from Apple Developer · Built by <a href="https://swiftgg.team/" target="_blank" rel="noopener">SwiftGG Team</a></p>
  </footer>

  <script>
    // ── Data ──
    const DATA = ${jsonData};

    // Decode compact data
    const years = DATA.y;
    const yearCounts = DATA.c;
    const topics = DATA.t;
    const sessions = DATA.s.map(s => ({
      year: s[0],
      contentId: s[1],
      title: s[2],
      description: s[3],
      primaryTopic: s[4],
      permalink: s[5],
      resources: s[6],
      codeSnippets: s[7],
    }));
    const thumbnailUuids = DATA.u;

    // Topic color map
    const topicColorMap = {};
    topics.forEach(t => { topicColorMap[t.id] = t.color; });

    // State
    let activeYear = 'all';
    let activeTopic = 'all';
    let searchQuery = '';

    // ── Helpers ──
    function getGradient(topicId) {
      const colors = topicColorMap[topicId] || topicColorMap.default || ['#667eea', '#764ba2'];
      return \`linear-gradient(135deg, \${colors[0]} 0%, \${colors[1]} 100%)\`;
    }

    function getThumbnailUrl(session) {
      const uuid = thumbnailUuids[session.year];
      if (!uuid) return null;
      return \`https://devimages-cdn.apple.com/wwdc-services/images/\${uuid}/\${session.contentId}/\${session.contentId}_wide_900x506_2x.jpg\`;
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // ── Render Filters ──
    function renderFilters() {
      // Year filters
      const yearContainer = document.getElementById('yearFilters');
      let yearHtml = \`
        <label class="filter-item active" data-year="all">
          <input type="radio" name="year" value="all" checked>
          <span class="filter-label">All</span>
          <span class="filter-count">\${sessions.length}</span>
        </label>
      \`;
      years.forEach(year => {
        yearHtml += \`
          <label class="filter-item" data-year="\${year}">
            <input type="radio" name="year" value="\${year}">
            <span class="filter-label">WWDC\${year.slice(2)}</span>
            <span class="filter-count">\${yearCounts[year] || 0}</span>
          </label>
        \`;
      });
      yearContainer.innerHTML = yearHtml;

      // Topic filters
      const topicContainer = document.getElementById('topicFilters');
      let topicHtml = \`
        <label class="filter-item active" data-topic="all">
          <input type="radio" name="topic" value="all" checked>
          <span class="filter-label">All Topics</span>
          <span class="filter-count">\${sessions.length}</span>
        </label>
      \`;
      topics.forEach(topic => {
        const count = sessions.filter(s => s.primaryTopic === topic.id).length;
        topicHtml += \`
          <label class="filter-item" data-topic="\${topic.id}">
            <input type="radio" name="topic" value="\${topic.id}">
            <span class="filter-label">\${escapeHtml(topic.title)}</span>
            <span class="filter-count">\${count}</span>
          </label>
        \`;
      });
      topicContainer.innerHTML = topicHtml;

      // Bind events
      document.querySelectorAll('#yearFilters .filter-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const val = item.dataset.year;
          activeYear = val;
          document.querySelectorAll('#yearFilters .filter-item').forEach(el => el.classList.toggle('active', el.dataset.year === val));
          document.querySelectorAll('#yearFilters input').forEach(el => el.checked = el.value === val);
          updateResults();
        });
      });

      document.querySelectorAll('#topicFilters .filter-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const val = item.dataset.topic;
          activeTopic = val;
          document.querySelectorAll('#topicFilters .filter-item').forEach(el => el.classList.toggle('active', el.dataset.topic === val));
          document.querySelectorAll('#topicFilters input').forEach(el => el.checked = el.value === val);
          updateResults();
        });
      });
    }

    // ── Render Cards ──
    function renderCards(filteredSessions) {
      const grid = document.getElementById('sessionGrid');

      if (filteredSessions.length === 0) {
        grid.innerHTML = \`
          <div class="empty-state" style="grid-column: 1 / -1;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <h3>No sessions found</h3>
            <p>Try adjusting your filters or search query.</p>
          </div>
        \`;
        return;
      }

      grid.innerHTML = filteredSessions.map(session => {
        const topic = topics.find(t => t.id === session.primaryTopic);
        const topicTitle = topic ? topic.title : session.primaryTopic;
        const gradient = getGradient(session.primaryTopic);
        const thumbUrl = getThumbnailUrl(session);
        const yearShort = session.year.slice(2);

        return \`
          <a class="session-card" href="\${escapeHtml(session.permalink)}" target="_blank" rel="noopener noreferrer">
            <div class="card-cover" style="background: \${gradient}">
              \${thumbUrl ? \`<img src="\${thumbUrl}" alt="" loading="lazy" onerror="this.style.display='none'">\` : ''}
              <span class="cover-fallback" style="\${thumbUrl ? 'display:none;' : ''}">\${session.contentId}</span>
              <span class="card-year-badge">WWDC\${yearShort}</span>
              <span class="card-topic-badge">\${escapeHtml(topicTitle)}</span>
            </div>
            <div class="card-body">
              <div class="card-title">\${escapeHtml(session.title)}</div>
              <div class="card-desc">\${escapeHtml(session.description)}</div>
              <div class="card-meta">
                \${session.resources > 0 ? \`<span>📄 \${session.resources} resource\${session.resources > 1 ? 's' : ''}</span>\` : ''}
                \${session.codeSnippets > 0 ? \`<span>💻 \${session.codeSnippets} code snippet\${session.codeSnippets > 1 ? 's' : ''}</span>\` : ''}
              </div>
            </div>
          </a>
        \`;
      }).join('');
    }

    // ── Update Results ──
    function updateResults() {
      let filtered = sessions;

      if (activeYear !== 'all') {
        filtered = filtered.filter(s => s.year === activeYear);
      }

      if (activeTopic !== 'all') {
        filtered = filtered.filter(s => s.primaryTopic === activeTopic);
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(s =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.contentId.includes(q)
        );
      }

      // Update title
      const titleEl = document.getElementById('contentTitle');
      if (activeYear === 'all' && activeTopic === 'all' && !searchQuery) {
        titleEl.textContent = 'All Sessions';
      } else if (searchQuery) {
        titleEl.textContent = \`Search: "\${searchQuery}"\`;
      } else if (activeYear !== 'all' && activeTopic !== 'all') {
        const topicName = topics.find(t => t.id === activeTopic)?.title || activeTopic;
        titleEl.textContent = \`WWDC\${activeYear.slice(2)} · \${topicName}\`;
      } else if (activeYear !== 'all') {
        titleEl.textContent = \`WWDC\${activeYear.slice(2)}\`;
      } else {
        const topicName = topics.find(t => t.id === activeTopic)?.title || activeTopic;
        titleEl.textContent = topicName;
      }

      document.getElementById('contentCount').textContent = \`\${filtered.length} session\${filtered.length !== 1 ? 's' : ''}\`;

      renderCards(filtered);
    }

    // ── Search ──
    document.getElementById('searchInput').addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      updateResults();
    });

    // ── Mobile sidebar toggle ──
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

    // ── Init ──
    renderFilters();
    updateResults();
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'web', 'index.html'), html);

const size = fs.statSync(path.join(__dirname, 'web', 'index.html')).size;
console.log(`Generated web/index.html (${(size/1024).toFixed(1)} KB)`);
