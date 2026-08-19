/* ═══════════════════════════════════════════════════════════════════════════
   Repo4all — Client Application
   Pure vanilla JS, no framework. Every function is readable & explainable.
   ══════════════════════════════════════════════════════════════════════════ */

'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : '/api';

const SEARCH_SUGGESTIONS = [
  'react authentication',
  'free APIs',
  'python machine learning',
  'docker deployment',
  'weather app',
  'MERN stack',
  'payment integration',
  'node.js REST API',
  'vue dashboard',
  'open source chat',
];

const LANG_COLORS = {
  JavaScript: '#F7DF1E', TypeScript: '#3178C6', Python: '#3776AB',
  Java: '#B07219', Rust: '#DEA584', Go: '#00ADD8', 'C++': '#F34B7D',
  C: '#555555', Ruby: '#701516', PHP: '#4F5D95', Swift: '#FA7343',
  Kotlin: '#A97BFF', HTML: '#E34C26', CSS: '#563D7C', Shell: '#89E051',
  Dart: '#00B4AB', Vue: '#41B883', Svelte: '#FF3E00', Elixir: '#6E4A7E',
  Scala: '#DC322F', R: '#276DC3', Haskell: '#5D4F85',
};

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  results: [],
  selectedForCompare: [],   // max 3 repo ids
  currentQuery: '',
  isSearching: false,
  currentModal: null,       // repo object currently in detail modal
  compareModalOpen: false,
  theme: localStorage.getItem('r4a-theme') || 'dark',
  auth: JSON.parse(localStorage.getItem('r4a-auth') || 'null'),
  workspace: JSON.parse(localStorage.getItem('r4a-workspace') || JSON.stringify({
    saved: [],
    collections: [],
    recent: [],
  })),
  pendingSave: null,  // repo to save after auth
  activeWorkspaceTab: 'saved',
};

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  initNav();
  initSearch();
  initAuthUI();
  initWorkspacePanel();
  initScrollReveal();
  initKonamiCode();
  renderWorkspace();

  // Update nav auth state
  updateNavAuth();
});

// ─── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('r4a-theme', theme);
  const toggle = $('theme-toggle');
  if (!toggle) return;
  toggle.innerHTML = theme === 'dark'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function initNav() {
  // Scroll effect
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('.nav');
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Mobile menu
  const toggle = $('nav-mobile-toggle');
  const menu   = $('nav-mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', menu.classList.contains('open'));
    });
    // Close on outside click
    document.addEventListener('click', e => {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    });
  }

  // Theme toggle
  const themeBtn = $('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
}

function updateNavAuth() {
  const signInBtn  = $('nav-signin');
  const workspaceBtn = $('nav-workspace');
  const userDisplay = $('nav-user-display');

  if (state.auth) {
    if (signInBtn)    signInBtn.style.display = 'none';
    if (workspaceBtn) workspaceBtn.style.display = 'flex';
    if (userDisplay)  userDisplay.textContent = state.auth.name || state.auth.email.split('@')[0];
  } else {
    if (signInBtn)    signInBtn.style.display = '';
    if (workspaceBtn) workspaceBtn.style.display = 'none';
    if (userDisplay)  userDisplay.textContent = '';
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────
function initSearch() {
  // Cycling placeholder
  const input = $('search-input');
  if (!input) return;

  let tipIdx = 0;
  const tip = $('search-tip');
  if (tip) {
    function cycleTip() {
      tip.style.opacity = 0;
      setTimeout(() => {
        tipIdx = (tipIdx + 1) % SEARCH_SUGGESTIONS.length;
        tip.textContent = `Try: "${SEARCH_SUGGESTIONS[tipIdx]}"`;
        tip.style.opacity = 1;
      }, 400);
    }
    setInterval(cycleTip, 3000);
  }

  // Suggestion chips
  $$('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.query;
      input.focus();
      doSearch(chip.dataset.query);
    });
  });

  // Form submit
  const form = $('search-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const q = input.value.trim();
      if (q.length > 0) doSearch(q);
    });
  }

  // Also handle the hero search CTA button
  const heroCTA = $('hero-discover-btn');
  if (heroCTA) {
    heroCTA.addEventListener('click', () => {
      $('search-input').focus();
      $('search-input').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

async function doSearch(query) {
  if (state.isSearching) return;
  state.isSearching = true;
  state.currentQuery = query;
  state.selectedForCompare = [];

  // Scroll to search area
  const resultsEl = $('results-section');
  const heroEl = document.querySelector('.hero');

  // Show loading UI
  showSearchLoading(query);

  try {
    const url = `${API_BASE}/search?q=${encodeURIComponent(query)}&limit=10`;
    const res = await fetch(url);

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Search failed');
    }

    const data = await res.json();
    state.results = data.results || [];

    // Simulate brief evaluation steps for UX clarity
    // (Not artificial delay — just sequencing what actually happened)
    await completeLoadingSteps();

    renderResults(data);

  } catch (err) {
    await completeLoadingSteps(true);
    showSearchError(err.message);
  } finally {
    state.isSearching = false;
  }
}

// ─── Loading Steps ─────────────────────────────────────────────────────────
const LOADING_STEPS = [
  { id: 'step-understand', label: 'Understanding your search' },
  { id: 'step-find',       label: 'Finding repositories' },
  { id: 'step-evaluate',   label: 'Evaluating matches' },
  { id: 'step-rank',       label: 'Ranking candidates' },
];

function showSearchLoading(query) {
  // Show loading section
  const loading = $('search-loading');
  const results  = $('results-section');
  const error    = $('search-error');

  if (loading) loading.classList.add('active');
  if (results) results.classList.remove('active');
  if (error)   error.classList.remove('active');

  // Reset all steps
  LOADING_STEPS.forEach(step => {
    const el = $(step.id);
    if (!el) return;
    el.classList.remove('done', 'active');
  });

  // Scroll loading into view
  if (loading) loading.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Activate step 1 immediately
  const step1 = $(LOADING_STEPS[0].id);
  if (step1) step1.classList.add('active');
}

async function completeLoadingSteps(hasError = false) {
  const steps = LOADING_STEPS;
  const delay = ms => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < steps.length; i++) {
    const el = $(steps[i].id);
    if (!el) continue;

    el.classList.remove('active');
    el.classList.add('done');

    if (i < steps.length - 1) {
      const next = $(steps[i + 1].id);
      if (next) next.classList.add('active');
      await delay(120);
    }
  }
  await delay(200);

  const loading = $('search-loading');
  if (loading) loading.classList.remove('active');
}

// ─── Render Results ────────────────────────────────────────────────────────
function renderResults(data) {
  const section  = $('results-section');
  const grid     = $('results-grid');
  const metaEl   = $('results-meta');
  const errorEl  = $('search-error');

  if (!section || !grid) return;

  errorEl?.classList.remove('active');

  if (!data.results || data.results.length === 0) {
    showNoResults(data.query);
    return;
  }

  // Meta line
  if (metaEl) {
    metaEl.innerHTML = `Found <strong>${data.results.length} repositories</strong> for <strong>"${escHtml(data.query)}"</strong>`;
  }

  // Clear and render
  grid.innerHTML = '';
  data.results.forEach((repo, idx) => {
    const card = buildRepoCard(repo, idx);
    grid.appendChild(card);
  });

  section.classList.add('active');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Stagger card animation
  const cards = grid.querySelectorAll('.repo-card');
  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = `opacity 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms, transform 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`;
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 50);
  });

  // Add to recent
  data.results.slice(0, 3).forEach(repo => addToRecent(repo));
}

function buildRepoCard(repo, idx) {
  const card = document.createElement('article');
  card.className = `repo-card${repo.isBestMatch ? ' best-match' : ''}`;
  card.setAttribute('data-repo-id', repo.id);
  card.setAttribute('aria-label', `${repo.name} repository`);

  const scoreCircumference = 2 * Math.PI * 22; // r=22
  const scoreOffset = scoreCircumference - (repo.score / 100) * scoreCircumference;
  const langColor = LANG_COLORS[repo.language] || '#8B93A8';
  const daysSince = repo.daysSincePush;
  const activityLabel = daysSince === null ? '—'
    : daysSince <= 7  ? 'This week'
    : daysSince <= 30 ? 'This month'
    : daysSince <= 90 ? '< 3 months ago'
    : daysSince <= 365 ? '< 1 year ago'
    : 'Over a year ago';

  const topicsHtml = repo.topics.slice(0, 4).map(t =>
    `<span class="topic-tag">${escHtml(t)}</span>`
  ).join('');

  const reasonsHtml = repo.matchReasons.slice(0, 3).map(r =>
    `<span class="match-reason">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      ${escHtml(r)}
    </span>`
  ).join('');

  const warningsHtml = repo.matchWarnings.slice(0, 1).map(w =>
    `<span class="match-warning">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      ${escHtml(w)}
    </span>`
  ).join('');

  card.innerHTML = `
    ${repo.isBestMatch ? `
      <div class="best-match-badge">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        Best Match
      </div>` : ''}

    <div class="card-header">
      <div class="card-title-group">
        <div class="card-owner">${escHtml(repo.owner)}</div>
        <h3 class="card-name">${escHtml(repo.name)}</h3>
        <p class="card-description">${escHtml(repo.description || 'No description provided.')}</p>
      </div>
      <div class="card-score" aria-label="Match score: ${repo.score}%">
        <div class="score-ring">
          <svg viewBox="0 0 50 50">
            <circle class="score-ring-bg"  cx="25" cy="25" r="22"/>
            <circle class="score-ring-fill" cx="25" cy="25" r="22"
              stroke-dasharray="${scoreCircumference.toFixed(2)}"
              stroke-dashoffset="${scoreOffset.toFixed(2)}"/>
          </svg>
          <span class="score-value">${repo.score}</span>
        </div>
        <span class="score-label">Match</span>
      </div>
    </div>

    <div class="card-stats">
      <span class="stat-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        ${formatNum(repo.stars)}
      </span>
      <span class="stat-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 01-9 9"/></svg>
        ${formatNum(repo.forks)}
      </span>
      ${repo.language ? `
      <span class="stat-item">
        <span class="lang-dot" style="background:${langColor}" aria-hidden="true"></span>
        ${escHtml(repo.language)}
      </span>` : ''}
      <span class="stat-item" title="Last updated: ${repo.pushedAt ? new Date(repo.pushedAt).toLocaleDateString() : 'Unknown'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${activityLabel}
      </span>
      ${repo.license ? `
      <span class="stat-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        ${escHtml(repo.license)}
      </span>` : ''}
    </div>

    ${topicsHtml ? `<div class="card-topics">${topicsHtml}</div>` : ''}

    <div class="match-reasons">
      ${reasonsHtml}${warningsHtml}
    </div>

    <div class="card-actions">
      <button class="btn btn-ghost btn-sm" onclick="openRepoModal('${repo.id}')" aria-label="View analysis for ${escHtml(repo.name)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        View Analysis
      </button>
      <a href="${repo.url}" target="_blank" rel="noopener noreferrer"
         class="btn btn-ghost btn-sm" aria-label="Open ${escHtml(repo.name)} on GitHub">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
        GitHub
      </a>
      <button class="btn btn-ghost btn-sm" onclick="saveRepo('${repo.id}')" id="save-btn-${repo.id}" aria-label="Save ${escHtml(repo.name)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        <span>${isRepoSaved(repo.id) ? 'Saved' : 'Save'}</span>
      </button>
      <label class="compare-checkbox" title="Add to comparison">
        <input type="checkbox" id="compare-${repo.id}"
          onchange="toggleCompare('${repo.id}')"
          aria-label="Add ${escHtml(repo.name)} to comparison"
          ${state.selectedForCompare.includes(repo.id) ? 'checked' : ''}>
        Compare
      </label>
    </div>
  `;

  return card;
}

// ─── Repo Detail Modal ─────────────────────────────────────────────────────
function openRepoModal(repoId) {
  const repo = state.results.find(r => String(r.id) === String(repoId));
  if (!repo) return;

  state.currentModal = repo;
  addToRecent(repo);

  const overlay = $('repo-modal-overlay');
  const title   = $('modal-repo-title');
  const sub     = $('modal-repo-subtitle');
  const body    = $('modal-body-content');
  const footer  = $('modal-footer-content');

  if (!overlay) return;

  if (title) title.textContent = repo.name;
  if (sub)   sub.textContent   = `${repo.owner} · ${repo.language || 'Unknown language'}`;

  if (body) {
    const scoreCirc = 2 * Math.PI * 22;
    const healthPct = Math.round(
      (repo.scoreBreakdown.activity * 0.35 +
       repo.scoreBreakdown.docs     * 0.30 +
       repo.scoreBreakdown.health   * 0.35)
    );

    body.innerHTML = `
      <!-- Scores -->
      <div class="modal-scores">
        <div class="modal-score-item">
          <div class="modal-score-label">Match Score</div>
          <div class="modal-score-number">${repo.score}<span>/100</span></div>
          <div class="health-bar">
            <div class="health-bar-fill ${healthClass(repo.score)}"
                 style="width:${repo.score}%"></div>
          </div>
        </div>
        <div class="modal-score-item">
          <div class="modal-score-label">Repository Health</div>
          <div class="modal-score-number">${healthPct}<span>/100</span></div>
          <div class="health-bar">
            <div class="health-bar-fill ${healthClass(healthPct)}"
                 style="width:${healthPct}%"></div>
          </div>
        </div>
      </div>

      <!-- Why it matches -->
      <div class="modal-section">
        <div class="modal-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Why This Matches
        </div>
        <div class="modal-reason-list">
          ${repo.matchReasons.map(r => `
            <div class="modal-reason positive">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              ${escHtml(r)}
            </div>`).join('')}
          ${repo.matchWarnings.map(w => `
            <div class="modal-reason warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
              ${escHtml(w)}
            </div>`).join('')}
          ${repo.matchReasons.length === 0 && repo.matchWarnings.length === 0
            ? '<div class="modal-reason"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>This repository was found based on keyword relevance.</div>'
            : ''}
        </div>
      </div>

      <!-- Health breakdown -->
      <div class="modal-section">
        <div class="modal-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Health Breakdown
        </div>
        <div class="health-breakdown">
          ${[
            { label: 'Relevance',   score: repo.scoreBreakdown.relevance,   tip: 'How well it matches your search terms and intent' },
            { label: 'Activity',    score: repo.scoreBreakdown.activity,     tip: 'Recency of commits and updates' },
            { label: 'Docs',        score: repo.scoreBreakdown.docs,         tip: 'Description, README, homepage, topics' },
            { label: 'Popularity',  score: repo.scoreBreakdown.popularity,   tip: 'Log-scaled star count (quality, not just size)' },
            { label: 'Health',      score: repo.scoreBreakdown.health,       tip: 'License, activity, issues, forks' },
          ].map(d => `
            <div class="health-row" title="${d.tip}">
              <span class="health-row-label">${d.label}</span>
              <div class="health-row-bar">
                <div class="health-row-fill" style="width:${d.score}%; background:${scoreColor(d.score)}"></div>
              </div>
              <span class="health-row-score">${d.score}</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- Repo metadata -->
      <div class="modal-section">
        <div class="modal-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          Repository Details
        </div>
        <div class="repo-meta-grid">
          <div class="repo-meta-item">
            <div class="repo-meta-key">Stars</div>
            <div class="repo-meta-value">★ ${formatNum(repo.stars)}</div>
          </div>
          <div class="repo-meta-item">
            <div class="repo-meta-key">Forks</div>
            <div class="repo-meta-value">${formatNum(repo.forks)}</div>
          </div>
          <div class="repo-meta-item">
            <div class="repo-meta-key">Language</div>
            <div class="repo-meta-value">${escHtml(repo.language || 'Not specified')}</div>
          </div>
          <div class="repo-meta-item">
            <div class="repo-meta-key">License</div>
            <div class="repo-meta-value">${escHtml(repo.license || 'None')}</div>
          </div>
          <div class="repo-meta-item">
            <div class="repo-meta-key">Open Issues</div>
            <div class="repo-meta-value">${formatNum(repo.openIssues)}</div>
          </div>
          <div class="repo-meta-item">
            <div class="repo-meta-key">Last Push</div>
            <div class="repo-meta-value">${repo.pushedAt ? formatDate(repo.pushedAt) : 'Unknown'}</div>
          </div>
          <div class="repo-meta-item">
            <div class="repo-meta-key">Created</div>
            <div class="repo-meta-value">${repo.createdAt ? formatDate(repo.createdAt) : 'Unknown'}</div>
          </div>
          <div class="repo-meta-item">
            <div class="repo-meta-key">Status</div>
            <div class="repo-meta-value">${repo.archived ? '⚠ Archived' : '✓ Active'}</div>
          </div>
        </div>
        ${repo.topics.length > 0 ? `
          <div class="card-topics" style="margin-top:var(--space-3)">
            ${repo.topics.map(t => `<span class="topic-tag">${escHtml(t)}</span>`).join('')}
          </div>` : ''}
      </div>
    `;
  }

  if (footer) {
    footer.innerHTML = `
      <a href="${repo.url}" target="_blank" rel="noopener noreferrer"
         class="btn btn-ghost" style="gap:var(--space-2)">
        <svg viewBox="0 0 24 24" fill="currentColor" style="width:15px;height:15px"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
        Open on GitHub ↗
      </a>
      <button class="btn btn-surface" onclick="saveRepo('${repo.id}'); closeModal()" id="modal-save-btn-${repo.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        ${isRepoSaved(repo.id) ? 'Saved to Workspace' : 'Save Repository'}
      </button>
      <button class="btn btn-ghost btn-sm" onclick="addToCompareFromModal('${repo.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Compare
      </button>
    `;
  }

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = $('repo-modal-overlay');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
  state.currentModal = null;
}

function addToCompareFromModal(repoId) {
  toggleCompare(String(repoId));
  closeModal();
  showToast('Added to comparison', 'success');
}

// ─── Compare System ────────────────────────────────────────────────────────
function toggleCompare(repoId) {
  repoId = String(repoId);
  const idx = state.selectedForCompare.indexOf(repoId);

  if (idx >= 0) {
    state.selectedForCompare.splice(idx, 1);
    const cb = $(`compare-${repoId}`);
    if (cb) cb.checked = false;
  } else {
    if (state.selectedForCompare.length >= 3) {
      showToast('Maximum 3 repositories for comparison', 'info');
      const cb = $(`compare-${repoId}`);
      if (cb) cb.checked = false;
      return;
    }
    state.selectedForCompare.push(repoId);
  }

  updateCompareBar();
}

function updateCompareBar() {
  const bar = $('compare-bar');
  if (!bar) return;

  const slots = bar.querySelectorAll('.compare-slot');
  const count = state.selectedForCompare.length;

  if (count >= 2) {
    bar.classList.add('visible');
  } else {
    bar.classList.remove('visible');
  }

  slots.forEach((slot, i) => {
    const repoId = state.selectedForCompare[i];
    if (repoId) {
      const repo = state.results.find(r => String(r.id) === repoId);
      slot.classList.add('filled');
      slot.innerHTML = `
        <span>${escHtml(repo ? repo.name : repoId)}</span>
        <button class="compare-slot-remove" onclick="toggleCompare('${repoId}')" aria-label="Remove ${repo ? repo.name : repoId} from comparison">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
    } else {
      slot.classList.remove('filled');
      slot.innerHTML = `<span>Add repo</span>`;
    }
  });
}

function openCompareModal() {
  if (state.selectedForCompare.length < 2) return;

  const repos = state.selectedForCompare
    .map(id => state.results.find(r => String(r.id) === id))
    .filter(Boolean);

  const overlay = $('compare-modal-overlay');
  const body    = $('compare-modal-body');

  if (!overlay || !body) return;

  // Find best by score
  const bestRepo = repos.reduce((a, b) => a.score > b.score ? a : b);

  const rows = [
    { label: 'Match Score',  key: r => `${r.score}%`,                             isBest: r => r.id === bestRepo.id },
    { label: 'Stars',        key: r => formatNum(r.stars),                         isBest: r => r.stars === Math.max(...repos.map(x => x.stars)) },
    { label: 'Forks',        key: r => formatNum(r.forks),                         isBest: r => r.forks === Math.max(...repos.map(x => x.forks)) },
    { label: 'Activity',     key: r => activityLabel(r.daysSincePush),             isBest: r => (r.daysSincePush || 999) === Math.min(...repos.map(x => x.daysSincePush || 999)) },
    { label: 'Language',     key: r => r.language || '—',                          isBest: () => false },
    { label: 'License',      key: r => r.license || 'None',                        isBest: () => false },
    { label: 'Issues',       key: r => formatNum(r.openIssues),                    isBest: r => r.openIssues === Math.min(...repos.map(x => x.openIssues || 0)) },
    { label: 'Relevance',    key: r => `${r.scoreBreakdown.relevance}/100`,        isBest: r => r.scoreBreakdown.relevance === Math.max(...repos.map(x => x.scoreBreakdown.relevance)) },
    { label: 'Health',       key: r => `${r.scoreBreakdown.health}/100`,           isBest: r => r.scoreBreakdown.health === Math.max(...repos.map(x => x.scoreBreakdown.health)) },
    { label: 'Docs',         key: r => `${r.scoreBreakdown.docs}/100`,             isBest: r => r.scoreBreakdown.docs === Math.max(...repos.map(x => x.scoreBreakdown.docs)) },
    { label: 'Status',       key: r => r.archived ? '⚠ Archived' : '✓ Active',    isBest: r => !r.archived },
  ];

  body.innerHTML = `
    <div style="overflow-x:auto">
      <table class="compare-table">
        <thead>
          <tr>
            <th style="min-width:110px">Metric</th>
            ${repos.map(r => `
              <th>
                <div style="font-weight:800;color:var(--text-primary)">${escHtml(r.name)}</div>
                <div style="font-weight:400;color:var(--text-muted);font-size:10px;text-transform:none;letter-spacing:0">${escHtml(r.owner)}</div>
              </th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td style="color:var(--text-muted);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">${row.label}</td>
              ${repos.map(r => `
                <td class="${row.isBest(r) ? 'compare-winner' : ''}">
                  ${row.key(r)}
                  ${row.isBest(r) ? `<span class="compare-best-badge">✓ Best</span>` : ''}
                </td>`).join('')}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div style="margin-top:var(--space-6);padding:var(--space-5);background:var(--surface);border-radius:var(--radius-lg);border:1.5px solid var(--border-accent)">
      <div style="font-size:var(--text-xs);font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:var(--space-2)">
        ★ Recommendation
      </div>
      <div style="font-size:var(--text-base);font-weight:700;color:var(--text-primary);margin-bottom:var(--space-1)">
        ${escHtml(bestRepo.name)} is the best fit
      </div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary)">
        Scores highest overall with a match score of ${bestRepo.score}/100, based on relevance, activity, documentation, and health signals from real GitHub data.
      </div>
    </div>
  `;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  state.compareModalOpen = true;
}

function closeCompareModal() {
  const overlay = $('compare-modal-overlay');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
  state.compareModalOpen = false;
}

// ─── Save / Workspace ──────────────────────────────────────────────────────
function isRepoSaved(repoId) {
  return state.workspace.saved.some(r => String(r.id) === String(repoId));
}

function saveRepo(repoId) {
  repoId = String(repoId);
  const repo = state.results.find(r => String(r.id) === repoId);
  if (!repo) return;

  if (!state.auth) {
    // Trigger auth with a save prompt
    state.pendingSave = repo;
    openAuthModal('signup', repo);
    return;
  }

  if (isRepoSaved(repoId)) {
    // Unsave
    state.workspace.saved = state.workspace.saved.filter(r => String(r.id) !== repoId);
    persistWorkspace();
    updateSaveButtons(repoId, false);
    showToast('Removed from workspace', 'info');
  } else {
    // Save
    state.workspace.saved.unshift({
      id: repo.id,
      name: repo.name,
      owner: repo.owner,
      description: repo.description,
      stars: repo.stars,
      language: repo.language,
      url: repo.url,
      savedAt: new Date().toISOString(),
    });
    persistWorkspace();
    updateSaveButtons(repoId, true);
    showToast(`"${repo.name}" saved to workspace`, 'success');
    renderWorkspace();
  }
}

function updateSaveButtons(repoId, isSaved) {
  const btns = document.querySelectorAll(`#save-btn-${repoId}`);
  btns.forEach(btn => {
    const span = btn.querySelector('span');
    if (span) span.textContent = isSaved ? 'Saved' : 'Save';
  });
  const modalBtn = $(`modal-save-btn-${repoId}`);
  if (modalBtn) modalBtn.querySelector('span') && (modalBtn.textContent = isSaved ? '✓ Saved to Workspace' : 'Save Repository');
}

function addToRecent(repo) {
  const recent = state.workspace.recent;
  const exists = recent.findIndex(r => String(r.id) === String(repo.id));
  if (exists >= 0) recent.splice(exists, 1);
  recent.unshift({
    id: repo.id,
    name: repo.name,
    owner: repo.owner,
    description: repo.description,
    stars: repo.stars,
    language: repo.language,
    url: repo.url,
    viewedAt: new Date().toISOString(),
  });
  // Keep last 20
  if (recent.length > 20) recent.pop();
  persistWorkspace();
}

function persistWorkspace() {
  localStorage.setItem('r4a-workspace', JSON.stringify(state.workspace));
}

// ─── Auth ──────────────────────────────────────────────────────────────────
function initAuthUI() {
  const overlay = $('auth-modal-overlay');

  // Close on overlay click
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeAuthModal();
    });
  }

  // Close on escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeAuthModal();
      closeCompareModal();
      closeWorkspace();
    }
  });

  // Auth tabs
  $$('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.mode;
      const loginForm   = $('login-form');
      const signupForm  = $('signup-form');
      if (loginForm)  loginForm.style.display  = mode === 'login'  ? 'block' : 'none';
      if (signupForm) signupForm.style.display  = mode === 'signup' ? 'block' : 'none';
    });
  });

  // Signup form
  const signupForm = $('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', e => {
      e.preventDefault();
      const name  = $('signup-name').value.trim();
      const email = $('signup-email').value.trim();
      const pass  = $('signup-pass').value;

      if (!name || !email || !pass) {
        showFormError('signup-error', 'Please fill in all fields');
        return;
      }
      if (pass.length < 6) {
        showFormError('signup-error', 'Password must be at least 6 characters');
        return;
      }

      // Simulate account creation (localStorage-based)
      const user = { name, email, createdAt: new Date().toISOString() };
      state.auth = user;
      localStorage.setItem('r4a-auth', JSON.stringify(user));

      updateNavAuth();
      closeAuthModal();
      showToast(`Welcome, ${name}! Your workspace is ready.`, 'success');

      // Complete pending save
      if (state.pendingSave) {
        const repo = state.pendingSave;
        state.pendingSave = null;
        setTimeout(() => saveRepo(repo.id), 300);
      }

      renderWorkspace();
    });
  }

  // Login form
  const loginForm = $('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = $('login-email').value.trim();
      const pass  = $('login-pass').value;

      if (!email || !pass) {
        showFormError('login-error', 'Please fill in all fields');
        return;
      }

      // Simple local auth check
      const stored = JSON.parse(localStorage.getItem('r4a-auth') || 'null');
      if (stored && stored.email === email) {
        state.auth = stored;
        updateNavAuth();
        closeAuthModal();
        showToast(`Welcome back, ${stored.name}!`, 'success');
        renderWorkspace();
      } else {
        showFormError('login-error', 'Account not found. Try signing up first.');
      }
    });
  }
}

function openAuthModal(mode = 'signup', repoContext = null) {
  const overlay = $('auth-modal-overlay');
  const prompt  = $('save-prompt');
  if (!overlay) return;

  // Show/hide tabs
  $$('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  const loginForm  = $('login-form');
  const signupForm = $('signup-form');
  if (loginForm)  loginForm.style.display  = mode === 'login'  ? 'block' : 'none';
  if (signupForm) signupForm.style.display  = mode === 'signup' ? 'block' : 'none';

  // Context prompt
  if (prompt) {
    if (repoContext) {
      prompt.style.display = 'flex';
      const strong = prompt.querySelector('strong');
      const text   = prompt.querySelector('span');
      if (strong) strong.textContent = `Save "${repoContext.name}" to your workspace`;
      if (text)   text.textContent   = 'Create a free account to save repositories, build collections, and track your discoveries.';
    } else {
      prompt.style.display = 'none';
    }
  }

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  const overlay = $('auth-modal-overlay');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function signOut() {
  state.auth = null;
  localStorage.removeItem('r4a-auth');
  updateNavAuth();
  closeWorkspace();
  showToast('Signed out', 'info');
}

function showFormError(id, msg) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 4000);
}

// ─── Workspace Panel ────────────────────────────────────────────────────────
function initWorkspacePanel() {
  $$('.workspace-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.workspace-tab').forEach(t => t.classList.remove('active'));
      $$('.workspace-tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      state.activeWorkspaceTab = tab.dataset.tab;
      const panel = $(`workspace-panel-${tab.dataset.tab}`);
      if (panel) panel.classList.add('active');
    });
  });

  // Collection creation
  const addCollBtn = $('add-collection-btn');
  const collInput  = $('new-collection-input');
  if (addCollBtn && collInput) {
    addCollBtn.addEventListener('click', () => {
      const name = collInput.value.trim();
      if (!name) return;
      state.workspace.collections.push({
        id: Date.now().toString(),
        name,
        repos: [],
        createdAt: new Date().toISOString(),
      });
      persistWorkspace();
      collInput.value = '';
      renderWorkspace();
      showToast(`Collection "${name}" created`, 'success');
    });
    collInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') addCollBtn.click();
    });
  }

  // Close overlay
  const overlay = $('workspace-overlay');
  if (overlay) overlay.addEventListener('click', closeWorkspace);
}

function openWorkspace() {
  if (!state.auth) {
    openAuthModal('signup');
    return;
  }
  const panel = $('workspace-panel');
  const overlay = $('workspace-overlay');
  if (panel) panel.classList.add('open');
  if (overlay) overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
  renderWorkspace();
}

function closeWorkspace() {
  const panel = $('workspace-panel');
  const overlay = $('workspace-overlay');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function renderWorkspace() {
  renderSaved();
  renderCollections();
  renderRecent();
}

function renderSaved() {
  const container = $('saved-repos-list');
  if (!container) return;

  const saved = state.workspace.saved;
  if (saved.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        </div>
        <div class="empty-state-title">No saved repositories yet</div>
        <div class="empty-state-text">Save repositories while exploring and they'll appear here.</div>
        <button class="btn btn-primary btn-sm" onclick="closeWorkspace()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Discover Repositories
        </button>
      </div>`;
    return;
  }

  container.innerHTML = saved.map(r => `
    <div class="saved-repo-card">
      <div class="saved-repo-info">
        <div class="saved-repo-name">${escHtml(r.name)}</div>
        <div class="saved-repo-desc">${escHtml(r.description || r.owner)}</div>
        <div class="saved-repo-meta">
          <span class="saved-repo-star">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width:10px;height:10px;color:#F59E0B"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${formatNum(r.stars)}
          </span>
          ${r.language ? `<span style="font-size:10px;color:var(--text-muted)">${escHtml(r.language)}</span>` : ''}
        </div>
      </div>
      <div class="saved-repo-actions">
        <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="btn btn-icon btn-surface" title="Open on GitHub" aria-label="Open ${escHtml(r.name)} on GitHub">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
        <button class="btn btn-icon btn-danger" onclick="removeSaved('${r.id}')" title="Remove" aria-label="Remove ${escHtml(r.name)} from saved">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </div>
    </div>`).join('');
}

function removeSaved(repoId) {
  state.workspace.saved = state.workspace.saved.filter(r => String(r.id) !== String(repoId));
  persistWorkspace();
  renderSaved();
  showToast('Removed from workspace', 'info');
}

function renderCollections() {
  const container = $('collections-list');
  if (!container) return;

  const cols = state.workspace.collections;
  if (cols.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:var(--space-8) var(--space-4)">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        </div>
        <div class="empty-state-title">No collections yet</div>
        <div class="empty-state-text">Organise saved repositories into collections like "AI Tools" or "College Project".</div>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="collection-list">
    ${cols.map(c => `
      <div class="collection-item">
        <div class="collection-item-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        </div>
        <div>
          <div class="collection-item-name">${escHtml(c.name)}</div>
          <div class="collection-item-count">${c.repos.length} repositories</div>
        </div>
        <div class="collection-item-actions">
          <button class="btn btn-icon btn-danger btn-sm" onclick="deleteCollection('${c.id}')" title="Delete collection" aria-label="Delete ${escHtml(c.name)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
      </div>`).join('')}
  </div>`;
}

function deleteCollection(id) {
  state.workspace.collections = state.workspace.collections.filter(c => c.id !== id);
  persistWorkspace();
  renderCollections();
  showToast('Collection deleted', 'info');
}

function renderRecent() {
  const container = $('recent-repos-list');
  if (!container) return;

  const recent = state.workspace.recent;
  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:var(--space-8) var(--space-4)">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="empty-state-title">Nothing here yet</div>
        <div class="empty-state-text">Repositories you view will appear here.</div>
      </div>`;
    return;
  }

  container.innerHTML = recent.map(r => `
    <div class="saved-repo-card">
      <div class="saved-repo-info">
        <div class="saved-repo-name">${escHtml(r.name)}</div>
        <div class="saved-repo-desc">${escHtml(r.description || r.owner)}</div>
        <div class="saved-repo-meta">
          <span class="saved-repo-star">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width:10px;height:10px;color:#F59E0B"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${formatNum(r.stars)}
          </span>
          <span style="font-size:10px;color:var(--text-muted)">${timeSince(r.viewedAt)}</span>
        </div>
      </div>
      <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="btn btn-icon btn-surface" title="Open on GitHub" aria-label="Open ${escHtml(r.name)} on GitHub">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
    </div>`).join('');
}

// ─── No Results / Error States ─────────────────────────────────────────────
function showNoResults(query) {
  const error = $('search-error');
  const results = $('results-section');
  if (results) results.classList.remove('active');
  if (!error) return;

  const suggestions = ['react auth', 'python ai', 'free apis', 'docker', 'node.js'];
  error.innerHTML = `
    <div class="search-error-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    </div>
    <div class="search-error-title">No strong matches found</div>
    <div class="search-error-text">We couldn't find repositories that strongly match "${escHtml(query)}". Try a different search.</div>
    <div class="search-error-suggestions">
      ${suggestions.map(s => `<button class="suggestion-chip" data-query="${s}" onclick="document.getElementById('search-input').value='${s}';doSearch('${s}')">${s}</button>`).join('')}
    </div>`;
  error.classList.add('active');
  error.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showSearchError(message) {
  const error = $('search-error');
  const results = $('results-section');
  if (results) results.classList.remove('active');
  if (!error) return;

  const isRateLimit = message && (message.toLowerCase().includes('rate') || message.includes('403'));

  error.innerHTML = `
    <div class="search-error-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    </div>
    <div class="search-error-title">${isRateLimit ? 'Rate limit reached' : 'Search unavailable'}</div>
    <div class="search-error-text">
      ${isRateLimit
        ? 'GitHub API rate limit reached. Please wait a moment and try again. Adding a GitHub token to the server increases the limit from 60 to 5000 requests/hour.'
        : `Something went wrong: ${escHtml(message || 'Unable to reach the server.')} Please try again.`}
    </div>
    <button class="btn btn-primary btn-sm" onclick="doSearch('${escHtml(state.currentQuery)}')">
      Try Again
    </button>`;
  error.classList.add('active');
  error.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ─── Scroll Reveal ──────────────────────────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  $$('.reveal').forEach(el => observer.observe(el));
}

// ─── Easter Egg — Konami Code ──────────────────────────────────────────────
function initKonamiCode() {
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let pos = 0;

  document.addEventListener('keydown', e => {
    if (e.key === KONAMI[pos]) {
      pos++;
      if (pos === KONAMI.length) {
        pos = 0;
        triggerEasterEgg();
      }
    } else {
      pos = 0;
    }
  });

  // Also: triple-click the logo
  let logoClicks = 0;
  const logo = document.querySelector('.nav-logo');
  if (logo) {
    logo.addEventListener('click', () => {
      logoClicks++;
      if (logoClicks >= 3) { logoClicks = 0; triggerEasterEgg(); }
      setTimeout(() => { logoClicks = 0; }, 800);
    });
  }

  // Close easter egg
  const overlay = $('easter-egg-overlay');
  if (overlay) overlay.addEventListener('click', closeEasterEgg);
}

function triggerEasterEgg() {
  const overlay = $('easter-egg-overlay');
  if (!overlay) return;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Close after 8 seconds
  setTimeout(closeEasterEgg, 8000);
}

function closeEasterEgg() {
  const overlay = $('easter-egg-overlay');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ─── Toast Notifications ────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = $('toast-container');
  if (!container) return;

  const icons = {
    success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icons[type] || icons.info}${escHtml(message)}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// ─── Utility Helpers ─────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNum(n) {
  if (n === undefined || n === null) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return iso; }
}

function timeSince(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function activityLabel(days) {
  if (days === null || days === undefined) return '—';
  if (days <= 7)   return 'This week';
  if (days <= 30)  return 'This month';
  if (days <= 90)  return '< 3 months';
  if (days <= 365) return '< 1 year';
  return '> 1 year';
}

function healthClass(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function scoreColor(score) {
  if (score >= 70) return 'var(--accent)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--error)';
}

// ─── Expose globals (for inline onclick attributes) ────────────────────────
window.doSearch         = doSearch;
window.openRepoModal    = openRepoModal;
window.closeModal       = closeModal;
window.toggleCompare    = toggleCompare;
window.openCompareModal = openCompareModal;
window.closeCompareModal = closeCompareModal;
window.saveRepo         = saveRepo;
window.removeSaved      = removeSaved;
window.deleteCollection = deleteCollection;
window.openAuthModal    = openAuthModal;
window.closeAuthModal   = closeAuthModal;
window.signOut          = signOut;
window.openWorkspace    = openWorkspace;
window.closeWorkspace   = closeWorkspace;
window.addToCompareFromModal = addToCompareFromModal;
window.closeEasterEgg   = closeEasterEgg;
