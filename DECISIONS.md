# DECISIONS.md — Repo4all

## 1. Why this approach instead of the obvious alternative?

**Pure HTML + Vanilla JS instead of React/Next.js**

The obvious choice for a "modern" frontend assignment is React. I chose vanilla JS because:

- Every line of code is immediately readable and explainable in an interview — no build step, no virtual DOM, no hooks to explain
- The product's core value is _decision quality_, not component architecture; vanilla JS is more than sufficient
- Zero bundle overhead means fast initial load (direct HTML parse → interactive in < 1s on good connection)
- The interviewer can open DevTools and read `app.js` directly — no transpiled noise

**Node.js + Express backend instead of client-side GitHub fetch**

The GitHub API blocks CORS for unauthenticated browser requests. A thin Express proxy also lets me:
- Inject `Authorization` headers server-side (protecting the token from client exposure)
- Run the ranking/scoring engine server-side where it belongs — not in the browser
- Return pre-ranked, enriched results in a single response instead of multiple browser fetches

**Best-fit ranking (composite score) instead of GitHub's default star sort**

A 100K-star repository that hasn't been updated in 3 years ranks below a 5K-star repository that was pushed to last week and matches the query precisely. The PRD is explicit: best fit > most stars. The six-signal scoring model (relevance 40%, activity 20%, docs 15%, popularity 10%, health 10%, other 5%) is deterministic, explainable, and computable entirely from GitHub API response data.

---

## 2. What trade-off was made under the time limit?

**What was built:** Search → ranked results → health scores → match explanations → side-by-side comparison → save to workspace → authentication → collections → recently viewed → dark/light mode → responsive (390px–1440px) → Easter egg.

**What was intentionally left out:**

- _Persistent backend database_: Auth and workspace use localStorage. A real product needs a database (PostgreSQL + sessions). The architecture (Express API → DB) is already in place; swapping localStorage for real storage is a one-afternoon task.
- _GitHub token OAuth flow_: Users would ideally authenticate via GitHub OAuth so their token raises the rate limit automatically. Currently the server uses a single env-variable token.
- _README preview_: The GitHub API can return README content; I chose not to fetch it per-card to avoid burning API quota on every search.
- _Advanced query AI_: The query expansion uses a deterministic synonym dictionary. An LLM call could expand queries more generically, but it would add latency, cost, and unpredictability. The dictionary covers the PRD's specified examples precisely.

---

## 3. Where did AI tools help?

**Used:** Antigravity (Google DeepMind agentic coding assistant) to scaffold all files and generate the full initial implementation from the PRD specification.

**What AI generated:** The initial code for all six files — `server.js`, `app.js`, `styles.css`, `index.html`, `package.json`, plus this document.

**What was verified:** Every scoring formula was cross-checked against the PRD weighting (§16). The GitHub API field names were verified against the actual API response structure (`pushed_at`, `stargazers_count`, `license.spdx_id`, etc.). The CSS design tokens were chosen by running the `ui-ux-pro-max` design-system skill against the product category to get appropriate recommendations (dark editorial, Inter, green accent).

**What was changed:** The initial ranking function weighted popularity at 20%; this was reduced to 10% and relevance raised from 35% to 40% to better match the PRD's "best fit > most stars" principle. The auth modal's "Continue exploring" button was added after review — the PRD explicitly requires the product to work without forcing account creation.

**What was rejected:** An AI-suggested glassmorphism hero with floating repo cards and a pulsing gradient blob background was rejected. The PRD explicitly forbids generic AI UI patterns (§28–§29). The final design uses a grid-line ambient background, restrained orb glows at 6% opacity, and editorial typography — intentional, not decorative.
