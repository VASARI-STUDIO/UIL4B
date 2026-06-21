# UIL4B — Backlog Status

_Last updated: 2026-06-20. Single source of truth for what's shipped, what needs you, and what's left._

**Health check (this session):** Build green (62 chunks). ESLint: **0 errors**, 34 advisory warnings (all one React `set-state-in-effect` perf hint — non-breaking). All 30 tool paths routed, all 37 lazy pages + 5 static pages resolve, no duplicate routes, no stray markers. 18 PRs merged to `main` (#92–#109).

---

## ✅ Shipped & live on `main` — ready for your feedback

### Design system
- Dark-only theme lock + FOUC fix (#92)
- Full-round pill buttons / CTAs (#92)
- **Homepage Linear redesign** — pass 1 hero/pricing/serif (#103) + bento showcase pass 2 (#107)
- Dead-CSS cleanup (#95) · stale-copy fixes for removed features (#109)

### Navigation & structure
- Route-level **alpha gating** — alpha tools unreachable by URL/search (#92)
- Nav restructure — Imagery / Icons & Emoji split, Resources + Future Plans categories, Projects → profile menu (#92)
- `/welcome` → `/home` with redirect (#93)

### Features / tools
- File Converter: original → converted size + % saved (#92)
- Future Plans admin roadmap board (#92)
- UI Preview: responsive Desktop/Tablet/Mobile selector (#93)
- **Community Hub** — browse / heart-save / submit (#94)
- **Information Centre** — indexable docs + live screen-stats widget (#96)
- **SEO Specialist** — Meta & SERP Inspector + Structured Data (JSON-LD) + Content Analyzer (#98–#100, #106)
- Category-dashboard functional mini-tools (#102)

### Engineering / quality
- Prompt Library split into 6 focused modules (#97)
- AI key sanitisation + on-screen diagnostics + health-check endpoint (#104)
- Small-screen popup edge-hardening (#96)
- Code-review pass: fixed 2 critical + 7 high (quota leak, keyword-count bug, accordion/dialog/tab a11y) (#108)

---

## 🔴 BLOCKING — needs YOU (owner actions, can't be done in code)

1. **AI keys (CRITICAL — all AI tools are dead until fixed).** Live diagnostic confirmed: `FIREBASE_SERVICE_ACCOUNT_KEY` is set but **not valid service-account JSON**; `DEEPSEEK_API_KEY` is **missing**. Re-paste the downloaded `.json`, add the DeepSeek key, **redeploy**, verify at `/api/generate-prompt?diag=uil4b-dev-2026`.
2. Stripe `RETAIN50` retention coupon + customer-portal config.
3. Enable Firebase Storage + publish `storage.rules` & `firestore.rules` (both exist in repo, reviewed, least-privilege).
4. `og-image.png` → `/public/previews/`.
5. SEO prerender decision (SPA vs prerender for crawlers).

→ Full step-by-step in **`docs/OWNER-ACTIONS.md`**.

---

## 🔍 Needs your review (visual — no browser in my sandbox to self-verify)

- **Homepage redesign** (pass 1 + 2): does the Linear direction land? Any spacing/copy/colour to tune?
- Optional: the spec's **framed hero product window** (held back from pass 2) — say the word and I'll add it.

---

## 🛠️ Still on my plate (I can do without you)

- **Admin dashboard restyle** + move Style Guide into the Admin page.
- Fuller **security hardening** pass (rules reviewed OK; remaining: client-side admin-code exposure only reveals UI, server stays token-gated — worth tightening).
- Optional: clean the 34 advisory `set-state-in-effect` warnings (low value, some refactor risk — many are legitimate mount-time patterns).

---

## 🔮 Deferred / needs your input

- **ainews.tech/skills** agents — paste the list when ready and I'll wire useful ones.
- Multi-page **SEO crawler** ("SEO Spider") — currently a Future Plans item.
- **Team collaboration / white-label** — Future Plans item.
