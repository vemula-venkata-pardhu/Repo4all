require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ─── Query Expansion Dictionary ─────────────────────────────────────────────
// Maps short/ambiguous terms to richer GitHub search topics
const QUERY_EXPANSIONS = {
  'free apis': ['public-api', 'free-api', 'api-list', 'rest-api', 'developer-tools'],
  'free api':  ['public-api', 'free-api', 'api-list', 'rest-api'],
  'apis':      ['api', 'rest-api', 'public-api', 'api-list'],
  'react auth': ['react-authentication', 'react-auth', 'authentication', 'jwt', 'react'],
  'react authentication': ['react', 'authentication', 'jwt', 'auth0', 'nextjs'],
  'mern auth': ['mern', 'mern-stack', 'authentication', 'nodejs', 'mongodb'],
  'python ai': ['python', 'machine-learning', 'artificial-intelligence', 'deep-learning', 'nlp'],
  'weather':   ['weather-api', 'weather-app', 'weather-data', 'openweathermap'],
  'weather api': ['weather-api', 'weather-data', 'meteorology', 'forecast'],
  'college project': ['beginner', 'learning', 'student-project', 'educational'],
  'payment integration': ['payment', 'stripe', 'payment-gateway', 'checkout'],
  'docker deployment': ['docker', 'deployment', 'devops', 'docker-compose'],
  'react dashboard': ['react', 'dashboard', 'admin-panel', 'data-visualization'],
  'node api': ['nodejs', 'rest-api', 'express', 'backend'],
  'python web': ['python', 'flask', 'django', 'fastapi', 'web-framework'],
  'machine learning': ['machine-learning', 'deep-learning', 'tensorflow', 'pytorch', 'scikit-learn'],
  'blockchain': ['blockchain', 'ethereum', 'solidity', 'web3', 'defi'],
  'chat app': ['websocket', 'real-time', 'chat', 'messaging', 'socket.io'],
  'ecommerce': ['ecommerce', 'shopping-cart', 'online-store', 'stripe'],
  'portfolio': ['portfolio', 'personal-website', 'resume', 'showcase'],
};

// ─── Synonym Normalization ───────────────────────────────────────────────────
function normalizeQuery(q) {
  return q.trim().toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Build GitHub Search Query ───────────────────────────────────────────────
function buildGitHubQuery(userQuery) {
  const normalized = normalizeQuery(userQuery);
  
  // Check for exact expansion match first
  if (QUERY_EXPANSIONS[normalized]) {
    const topics = QUERY_EXPANSIONS[normalized];
    const topicQuery = topics.slice(0, 3).map(t => `topic:${t}`).join(' ');
    return `${normalized} ${topicQuery}`;
  }
  
  // Check for partial matches
  for (const [key, topics] of Object.entries(QUERY_EXPANSIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      const topicQuery = topics.slice(0, 2).map(t => `topic:${t}`).join(' ');
      return `${normalized} ${topicQuery}`;
    }
  }
  
  // Default: use the query as-is
  return normalized;
}

// ─── Scoring Engine ──────────────────────────────────────────────────────────
// All weights based on PRD §16
function scoreRepository(repo, queryTerms, originalQuery) {
  const scores = {};

  // 1. Relevance Score (40%) ────────────────────────────────────────────────
  // Check title, description, and topics for query term matches
  const searchableText = [
    (repo.name || '').toLowerCase().replace(/-/g, ' '),
    (repo.description || '').toLowerCase(),
    (repo.topics || []).join(' ').toLowerCase(),
    (repo.language || '').toLowerCase(),
  ].join(' ');

  const normalizedQuery = normalizeQuery(originalQuery);
  const terms = normalizedQuery.split(' ').filter(t => t.length > 2);
  const expansions = QUERY_EXPANSIONS[normalizedQuery] || [];
  
  let termMatches = 0;
  let totalTerms = terms.length + expansions.length * 0.5;
  
  terms.forEach(term => {
    if (searchableText.includes(term)) termMatches++;
  });
  expansions.forEach(expansion => {
    const exp = expansion.replace(/-/g, ' ');
    if (searchableText.includes(exp)) termMatches += 0.5;
  });

  scores.relevance = totalTerms > 0 ? Math.min(termMatches / totalTerms, 1) : 0.5;
  
  // Boost: exact name match
  const repoName = (repo.name || '').toLowerCase().replace(/-/g, ' ');
  if (terms.some(t => repoName.includes(t))) scores.relevance = Math.min(scores.relevance + 0.2, 1);
  
  // Boost: topic match
  const topics = (repo.topics || []).map(t => t.toLowerCase().replace(/-/g, ' '));
  if (terms.some(t => topics.some(topic => topic.includes(t)))) {
    scores.relevance = Math.min(scores.relevance + 0.15, 1);
  }

  // 2. Activity Score (20%) ─────────────────────────────────────────────────
  const daysSincePush = repo.pushed_at
    ? Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24))
    : 365;
  
  let activityScore = 0;
  if (daysSincePush <= 7)   activityScore = 1.0;
  else if (daysSincePush <= 30)  activityScore = 0.9;
  else if (daysSincePush <= 90)  activityScore = 0.75;
  else if (daysSincePush <= 180) activityScore = 0.55;
  else if (daysSincePush <= 365) activityScore = 0.35;
  else activityScore = 0.1;
  
  scores.activity = activityScore;

  // 3. Documentation Score (15%) ─────────────────────────────────────────────
  let docsScore = 0.2; // baseline
  if (repo.description && repo.description.length > 20) docsScore += 0.3;
  if (repo.description && repo.description.length > 80) docsScore += 0.1;
  if (repo.homepage)       docsScore += 0.15;
  if (repo.has_wiki)       docsScore += 0.1;
  if (repo.has_pages)      docsScore += 0.1;
  if ((repo.topics || []).length > 3) docsScore += 0.05;
  scores.docs = Math.min(docsScore, 1);

  // 4. Popularity Score (10%) ─────────────────────────────────────────────────
  // Log-normalize stars to avoid mega-repos dominating
  const stars = repo.stargazers_count || 0;
  scores.popularity = stars > 0 ? Math.min(Math.log10(stars + 1) / 5, 1) : 0;

  // 5. Health Score (10%) ─────────────────────────────────────────────────────
  let healthScore = 0;
  if (repo.license)        healthScore += 0.25;
  if (!repo.archived)      healthScore += 0.25;
  if (repo.open_issues_count !== undefined) {
    // A reasonable issue count is a sign of active community
    const issues = repo.open_issues_count;
    healthScore += issues > 0 && issues < 500 ? 0.25 : issues === 0 ? 0.15 : 0.1;
  }
  if (repo.forks_count > 10) healthScore += 0.25;
  scores.health = Math.min(healthScore, 1);

  // 6. Other Signals (5%) ─────────────────────────────────────────────────────
  let other = 0;
  if ((repo.topics || []).length > 0) other += 0.4;
  if (repo.homepage) other += 0.3;
  if (repo.language) other += 0.3;
  scores.other = Math.min(other, 1);

  // ─── Weighted Total ──────────────────────────────────────────────────────
  const total =
    scores.relevance   * 0.40 +
    scores.activity    * 0.20 +
    scores.docs        * 0.15 +
    scores.popularity  * 0.10 +
    scores.health      * 0.10 +
    scores.other       * 0.05;

  return {
    total: Math.round(total * 100),
    breakdown: {
      relevance:  Math.round(scores.relevance  * 100),
      activity:   Math.round(scores.activity   * 100),
      docs:       Math.round(scores.docs       * 100),
      popularity: Math.round(scores.popularity * 100),
      health:     Math.round(scores.health     * 100),
    },
  };
}

// ─── Generate Match Reasons ──────────────────────────────────────────────────
function generateMatchReasons(repo, score, queryTerms) {
  const reasons = [];
  const warnings = [];

  if (score.breakdown.relevance >= 70) reasons.push('Directly matches your search intent');
  else if (score.breakdown.relevance >= 45) reasons.push('Relevant to your search terms');

  const daysSince = repo.pushed_at
    ? Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (daysSince !== null) {
    if (daysSince <= 14)  reasons.push('Very recently updated');
    else if (daysSince <= 60) reasons.push('Actively maintained');
    else if (daysSince > 365) warnings.push('No recent activity in over a year');
  }

  if (score.breakdown.docs >= 70) reasons.push('Well documented');
  else if (score.breakdown.docs < 40) warnings.push('Documentation may be limited');

  if (repo.stargazers_count >= 10000) reasons.push('Strong community signal');
  else if (repo.stargazers_count >= 1000) reasons.push('Established community');

  if (repo.license) reasons.push(`Open license (${repo.license.spdx_id || repo.license.name})`);
  else warnings.push('No license specified');

  if (repo.archived) warnings.push('Repository is archived — no longer maintained');

  if ((repo.topics || []).length > 3) reasons.push('Well-tagged with relevant topics');

  if (repo.forks_count > 500) reasons.push('Widely forked by the community');

  return { reasons, warnings };
}

// ─── GitHub API Helper ────────────────────────────────────────────────────────
const GITHUB_HEADERS = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'Repo4all/1.0',
  ...(process.env.GITHUB_TOKEN && {
    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
  }),
};

async function githubFetch(url) {
  const res = await fetch(url, { headers: GITHUB_HEADERS });
  if (res.status === 403) {
    const data = await res.json();
    throw { status: 403, message: data.message || 'GitHub API rate limit exceeded' };
  }
  if (!res.ok) {
    throw { status: res.status, message: `GitHub API error: ${res.status}` };
  }
  return res.json();
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Search repositories
app.get('/api/search', async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const ghQuery = buildGitHubQuery(q);
    const maxResults = Math.min(parseInt(limit) || 10, 20);
    
    // GitHub search API
    const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(ghQuery)}&sort=stars&order=desc&per_page=${maxResults}`;
    const searchData = await githubFetch(searchUrl);

    if (!searchData.items || searchData.items.length === 0) {
      return res.json({ results: [], query: q, expandedQuery: ghQuery, totalCount: 0 });
    }

    // Score and rank all results
    const queryTerms = normalizeQuery(q).split(' ').filter(t => t.length > 2);
    
    const scored = searchData.items.map(repo => {
      const score = scoreRepository(repo, queryTerms, q);
      const { reasons, warnings } = generateMatchReasons(repo, score, queryTerms);
      
      const daysSince = repo.pushed_at
        ? Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        ownerAvatar: repo.owner.avatar_url,
        description: repo.description,
        url: repo.html_url,
        homepage: repo.homepage,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        language: repo.language,
        topics: repo.topics || [],
        license: repo.license ? (repo.license.spdx_id || repo.license.name) : null,
        archived: repo.archived,
        hasWiki: repo.has_wiki,
        hasPages: repo.has_pages,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
        daysSincePush: daysSince,
        score: score.total,
        scoreBreakdown: score.breakdown,
        matchReasons: reasons,
        matchWarnings: warnings,
      };
    });

    // Sort by our composite score (best fit, not just stars)
    scored.sort((a, b) => b.score - a.score);

    // Return top results (quality > quantity per PRD §54)
    const topResults = scored.slice(0, 5);

    // Tag the top result as "Best Match"
    if (topResults.length > 0) topResults[0].isBestMatch = true;

    res.json({
      results: topResults,
      query: q,
      expandedQuery: ghQuery,
      totalCount: searchData.total_count,
      rateLimit: {
        hasToken: !!process.env.GITHUB_TOKEN,
      },
    });
  } catch (err) {
    console.error('Search error:', err);
    if (err.status === 403) {
      return res.status(429).json({
        error: 'rate_limit',
        message: 'GitHub API rate limit reached. Try again in a moment.',
      });
    }
    res.status(500).json({ error: 'search_failed', message: err.message || 'Search failed' });
  }
});

// Get single repository details
app.get('/api/repo/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  try {
    const data = await githubFetch(`https://api.github.com/repos/${owner}/${repo}`);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGithubToken: !!process.env.GITHUB_TOKEN,
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n  Repo4all server running at http://localhost:${PORT}`);
  console.log(`  GitHub token: ${process.env.GITHUB_TOKEN ? '✓ Configured (5000 req/hr)' : '✗ Not set (60 req/hr)'}\n`);
});
