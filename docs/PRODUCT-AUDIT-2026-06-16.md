# UIL4B — Full Product Audit & Execution Roadmap

**Date:** 2026-06-16
**Method:** Static code audit of the entire `src/` and `api/` tree (6 parallel slice audits), authoritative production build (`npx vite build` → passes clean, 395ms), cross-cutting greps (console/TODO), and route/asset verification.
**Build status:** ✅ Green. Largest chunks: `index` 429 KB, `firebase` 357 KB, `ColorStudio` 101 KB.
**Scope:** 40 page components, 11 shared components, 8 contexts, 16 serverless API routes.

> This document is the source of truth for what is actually done vs. claimed. It verifies the 4-day master to-do list against real code, scores every page, registers every concrete defect with `file:line` evidence, and gives an impact/dependency-ordered roadmap.

---

## 1. Executive Summary

The application is **substantially built and the production build is healthy** — code-splitting, ErrorBoundary, SEO meta, sitemap/robots, keyboard shortcuts, and command palette are all genuinely shipped. The console is clean and there are no stray TODO/FIXMEs. Most "completed" to-do items are real.

However, **quality control has slipped in five concrete ways** that are not visible from a passing build:

1. **Silent failures that lie to users.** Feedback submission shows "Thanks!" even when the API errors (`Feedback.jsx:34`, `HelpCentre.jsx:182`), and the Help Centre writes a corrupt local record via a wrong function signature (`HelpCentre.jsx:176`). Project saves report "Saved" even when `localStorage` is full.
2. **A broken auth return-path.** Login never reads `location.state.from`, so users sent to login from a protected route are dumped on `/` instead of where they were going (`Login.jsx`).
3. **A deceptive billing flow.** The Settings cancel-retention "Apply 50% discount / Pause plan / Free month" buttons claim an offer was applied but do nothing (`Settings.jsx:411-428`).
4. **A misleading analytics dashboard.** Admin charts read from per-browser `localStorage`, not a server, so the "industry-standard dashboard" shows one device's data as if it were aggregate traffic.
5. **An uncapped paid AI endpoint.** `api/scan-photo.js` calls Gemini Vision with auth but **no rate limit**, unlike the other two AI endpoints.

Plus a long tail of missing empty/error states, dead code, accessibility gaps (clickable `<div>`s, unlabeled inputs, non-ARIA tabs), and one broken social-preview image (`og-image.png` referenced but absent).

**Overall product completion: ~82%.** Strong feature surface; the gap to "production-grade" is reliability/honesty of states, accessibility, and the data foundation under Admin — not missing features.

### Completion scoreboard (per area)

| Area | Score | Status |
|---|---:|---|
| Onboarding | 90 | 🟢 Near-complete |
| TypeScale | 92 | 🟢 Near-complete |
| Dashboard | 88 | 🟢 Near-complete |
| Landing | 88 | 🟢 Near-complete (missing sections) |
| FontGallery / IconLibrary / BoxShadow | 90 | 🟢 Near-complete |
| EmojiLibrary | 88 | 🟢 Near-complete |
| Documentation (7 pages) | 88 | 🟢 Near-complete |
| FileConverter | 88 | 🟡 Alpha (gaps block GA) |
| Projects | 85 | 🟡 In progress |
| FontMatcher | 85 | 🟡 Loading-state bug |
| AI Tools suite | 82 | 🟡 Alpha |
| Color Studio | 82 | 🟡 In progress |
| Settings | 82 | 🟡 Deceptive retention flow |
| Navigation | 82 | 🟡 In progress |
| HelpCentre | 80 | 🟡 saveFeedback bug |
| Admin | 70 | 🔴 Misleading data foundation |
| Login / Auth flow | 70 | 🔴 Broken return-path |
| Feedback | 70 | 🔴 Silent failure |
| Community (`/community`) | 60 | 🔴 Stub (3 links) |

---

## 2. Page Inventory

| # | Page | Route(s) | Auth | Score | Status | Headline issue |
|---|---|---|:--:|---:|---|---|
| 1 | Landing | `/`, `/welcome` | — | 88 | 🟢 | Dead video/CSS; no social-proof/comparison sections |
| 2 | Dashboard | `/dashboard` | — | 88 | 🟢 | Dead checklist CSS only |
| 3 | CategoryDashboard | `/typography`,`/imagery`,`/ai-tools`,`/ui-builder-cat`,`/docs` | — | 85 | 🟢 | Legacy purple accent in spots |
| 4 | Login | `/login` | — | 70 | 🔴 | `location.state.from` ignored |
| 5 | Onboarding | `/onboarding` | — | 90 | 🟢 | Decorative emoji not `aria-hidden` |
| 6 | Color Studio | `/color` (+5 redirects) | — | 82 | 🟡 | Undo covers 1/6 destructive actions; silent extract errors; a11y |
| 7 | TypeScale | `/typescale` | — | 92 | 🟢 | Uncapped numeric inputs |
| 8 | FontMatcher | `/fontpairs` | — | 85 | 🟡 | No `.catch` on fetchFonts → stuck loading; dead `searchTimer` |
| 9 | FontGallery | `/fontgallery` | — | 90 | 🟢 | No empty/error state on fetch fail |
| 10 | IconLibrary | `/icons` | — | 90 | 🟢 | Offline-empty has no message |
| 11 | ImageConverter | `/imgconvert` | — | 85 | 🟠 Legacy | Slated for retirement (still pinned/linked) |
| 12 | FileConverter | `/file-converter` | — | 88 | 🟡 Alpha | Missing AVIF, live-savings, frame quality, dashboard hand-off |
| 13 | AltTextGenerator | `/alt-text` | gate | 82 | 🟡 Alpha | Strong; part of AI suite |
| 14 | AiPromptGenerator | `/ai-prompt` | gate | 82 | 🟡 Alpha | "popup w/ title" is inline, not modal |
| 15 | LandingPromptGenerator | `/landing-prompts` | gate | 82 | 🟡 Alpha | Solid |
| 16 | PromptLibrary | `/prompts` | — | 80 | 🟡 | Media >900 KB silently dropped on public submit |
| 17 | EmojiLibrary | `/emoji` | — | 88 | 🟢 | No empty-search state; skin-tone mojibake on non-person |
| 18-24 | Docs (Design/Social/Themes/Brand/SEO/Marketing/AI) | `/docs-*` | — | 88 | 🟢 | DocsMarketing TOC layout broken; DocsAI other-agents shallow |
| 25 | VideoToFrames | `/video-frames` | — | 85 | 🟠 Legacy | Slated for retirement |
| 26 | BoxShadowGenerator | `/box-shadow` | — | 90 | 🟢 | Uncapped inputs |
| 27 | UIBuilder | `/ui-builder` | — | 85 | 🟡 | Unguarded `navigator.clipboard` calls |
| 28 | AutoBuilder | `/auto-builder` | — | 80 | 🟡 Alpha | **Not actually AI** (deterministic); unhandled extract rejection |
| 29 | ExternalResources | `/resources` | — | 88 | 🟢 | 47 curated links, CRUD |
| 30 | Projects | `/projects` | ✅ | 85 | 🟡 | Silent quota failure; dead empty state; local-only (no real sync) |
| 31 | Checkout | `/checkout` | ✅ | — | ⚪ | **Validation zone — not modified** |
| 32 | CheckoutReturn | `/checkout/return` | ✅ | — | ⚪ | **Validation zone — not modified** |
| 33 | Settings | `/settings` | — | 82 | 🟡 | Fake retention-offer buttons (deceptive) |
| 34 | Community | `/community` | — | 60 | 🔴 | Stub: 3 GitHub links; real community = PromptLibrary |
| 35 | Feedback | `/feedback` | — | 70 | 🔴 | Silent submit failure → always "success" |
| 36 | Privacy | `/privacy` | — | — | 🟢 | Static legal |
| 37 | Terms | `/terms` | — | — | 🟢 | Static legal |
| 38 | HelpCentre | `/help` | — | 80 | 🟡 | `saveFeedback` wrong signature → corrupt record |
| 39 | Admin | `/admin` | ✅ | 70 | 🔴 | Analytics are per-browser localStorage, not aggregate |
| 40 | StyleGuide | `/style-guide` | ✅ | — | ⚪ | Admin-only reference; light audit |

**Redirect-only routes:** `/color-studio`, `/palette`, `/tints`, `/gradients`, `/contrast`, `/export` → `/color`; `/design-reference` → `/docs`; `/about` → `/help#about`; `/faq` → `/help#faq`; `*` → `/`.

---

## 3. Feature Inventory

**Color system:** palette generation (harmony modes), per-index overrides, locks + spacebar regen + drag reorder, tint scales, UI state colours, OKLCH/CVD/contrast info popup (tabbed), k-means image extraction, named-colour libraries (CSS/Japanese/Material/Tailwind) + closest match, gradient builder (stops, flip, bento presets), 4-up UI mockup visualizer, exports (CSS/HTML in-page; PNG/SVG/Tailwind via TopBar).

**Typography:** type scale builder (CSS/Tailwind/SCSS export), font pairing (discover/pairings/compare/specimen), 1,200+ Google Fonts gallery with lazy verified loading + ad-blocker fallback.

**Imagery:** icon library (200k icons, 3-host fallback, offline embed), emoji library, image converter (legacy), video→frames (legacy), **File Converter** (image + video→GIF + video→frames merged; 3D coming-soon).

**AI tools** (DeepSeek primary → Gemini fallback, Firebase-auth gated): structured image-prompt JSON builder (+ photo scan via Gemini Vision), landing-page prompt builder, WCAG alt-text generator (batch), UI Auto-Builder (deterministic, not AI).

**UI Builder:** guided design-system builder, box-shadow generator.

**Platform:** auth (Google popup + One Tap/FedCM + email), onboarding, projects (local, per-email), Stripe subscription (Pro), settings (theme/appearance/language/account/data), community prompt submit→moderate pipeline, help centre (4-way contact routing), feedback, admin dashboard (charts/kanban/filters), 7 documentation pages, external resources directory.

**Cross-cutting:** dark/light theme (pre-paint), appearance (rounding/density/reduced-motion), i18n scaffold (en/es/fr/ja/ko), command palette (⌘K), keyboard-shortcut overlay (`?`), analytics (localStorage), SEO (per-route title/description, OG/Twitter, JSON-LD, sitemap, robots).

---

## 4. Component Inventory

| Component | Role | Health |
|---|---|---|
| `Sidebar` | Category nav (single-tier nesting, all-expanded default, alpha badges, admin group) | 🟢 |
| `TopBar` | Search, export (PNG/SVG/Tailwind), preview, projects, profile, pin | 🟢 |
| `CommandPalette` | ⌘K fuzzy nav | 🟢 keyboard-accessible |
| `AppFooter` | Global footer | 🟢 |
| `FeedbackButton` | Floating feedback CTA (every page but `/feedback`) | 🟢 has aria-label |
| `GoogleOneTap` | FedCM/One Tap auto sign-in | ⚪ Validation zone |
| `AuthGate` | Inline (no-redirect) sign-in for AI tools | ⚪ Validation zone |
| `Toast` | Transient notifications | 🟢 |
| `UIPreviewModal` | Universal UI preview | 🟢 |
| `DocsTOC` | Scroll-spy table of contents | 🟡 misaligned in DocsMarketing |
| `UIKitGuide` | UI Builder helper | 🟢 |

**Contexts:** `AuthContext` ⚪, `SubscriptionContext` ⚪ (validation zones), `ProjectContext` 🟡 (silent quota failures, local-only), `ThemeContext` 🟢, `AppearanceContext` 🟢, `WorkspaceContext` 🟢 (pins), `ExportContext` 🟢, `I18nContext` 🟡 (5 locales, partially wired — 3 docs hardcode English).

**Notable duplication:** `Article`/`Callout`/`Stat` are re-defined in ~7 doc files (DRY candidate → `components/docs/`).

---

## 5. User Flow Map

```
Visitor (logged out)
  └─ "/" Landing ──(Sign in)──► /login ──► Google popup / One Tap / email
        │                                      │
        │                              new user ► /onboarding ► /dashboard
        │                              returning ► [BUG: always "/" — should be `from`]
        └─(browse tools freely; AI tools show inline AuthGate)

Logged-in user
  "/" ──► /dashboard ──► tool pages (color, type, icons, converters…)
     ├─ AI tool ► AuthGate passes ► generate (DeepSeek→Gemini)
     ├─ Save work ► ProjectContext (localStorage, per-email)  [BUG: silent on quota fail]
     ├─ Upgrade ► Settings/Checkout ► Stripe ► /checkout/return  [Validation zone]
     └─ Community ► /prompts submit ► Firestore pending ► Admin moderates ► public list

Support
  Any page ► FeedbackButton ► /feedback ──► /api/support ► Firestore + Sheets + email
                                              [BUG: errors swallowed, always shows success]
  /help ► 4-way contact (feature/bug/feedback/help)  [BUG: saveFeedback wrong signature]

Admin
  /admin ► Overview (charts from LOCAL analytics) · Submissions · Prompts · Module board · Stripe · Setup
           [ISSUE: traffic/user metrics are per-browser, not aggregate]
```

**Broken/leaky flows:** (a) protected-route → login → wrong landing page; (b) feedback/help → false success on failure; (c) Settings retention → fake offer; (d) project save → false success on quota fail; (e) community video upload → silently dropped >900 KB.

---

## 6. To-Do List Verification (4-day list)

**Legend:** ✅ done to standard · 🟡 done with caveats · 🔴 broken/false claim.

**Color Studio** — drag-spam fix ✅, per-index overrides ✅, reset ✅, default UI states ✅, info popup (tabs/OKLCH/CVD/shades) ✅, brand horizontal scroll 🟡 (scrolls on wheel, not auto-on-hover), gradient flip moved + auto-removed ✅, bento + step% ✅, **undo toast 🔴 (only wired to 1 of ~6 destructive actions)**, image k-means ✅ (🟡 silent errors), visualizer ✅, named libraries+closest ✅ (🟡 no empty state), export PNG/SVG/Tailwind 🟡 (in TopBar, not on page), lock/space/reorder ✅, TDZ crash fix ✅ (build verified).

**AI Image Prompt Generator** — rename ✅, JSON builder ✅, presets ✅, categories ✅, photo→prompt (Gemini) ✅, checkbox→JSON ✅, media+title 🟡 (inline, not popup), ALPHA badge ✅, inline auth gate ✅.

**AI Landing / grouping** — new page ✅, grouped under AI section ✅.

**Alt Text** — end-to-end ✅, WCAG prompt ✅ (strong).

**AI Backend** — DeepSeek+Gemini fallback ✅ (real try/catch), CoT + tuned sampling ✅ (prompt-level).

**UI Auto-Builder** — business→UI 🔴 (**deterministic, not AI**, despite "AI Tools" placement), brand-asset extract ✅ (font is manual).

**Navigation** — submenus 🟡 (single tier, "subcategories" overstated), all expanded ✅, Style Guide under Admin ✅, AI alpha badges ✅, categories nested ✅, more blue 🟡 (uses `--brand`, not a global `--accent` swap; some legacy purple remains).

**Dashboard** — clipping fix ✅, greeting shrunk ✅, AI section/uncollapsed 🟡 (maps to nav default; dead checklist CSS remains).

**Admin** — rebuilt w/ charts ✅, filters ✅, module board ✅, **statuses "live" 🔴 (hardcoded in `moduleBoard.js`)**; and overall **data is per-browser localStorage, not aggregate**.

**Community Hub** — admin media upload ✅, WebP 🟡 (**quality 0.8 + 1200px downscale, not "high quality"**), media+title at top ✅ (in PromptLibrary submit), engagement plan / review 🟡 (`/community` itself is a 3-link stub).

**Projects/Help/Landing/Auth** — Projects redesign ✅ (bespoke; 🟡 inline styles vs convention), Help overhaul ✅, 4-way differentiation ✅, feedback access ✅, Landing sticky-scroll ✅, clinical redesign ✅, hero redesign ✅, **auth return-to-page 🔴 (broken)**, popup/new-page login ✅, skip onboarding ✅ (🟡 email path asymmetric).

**Global theme** — rounder UI ✅ (data-rounding), more blue 🟡, glow/shadow buttons ✅, UI builder UI ✅.

**File Converter** — merged tool ✅, 3D coming-soon ✅, mobile/keyboard/progress ✅; **GA-blockers remain** (AVIF, live savings, frame quality/format, dashboard hand-off).

**Docs** — all topics ✅, update dates ✅ (8/8 present), 🟡 DocsMarketing layout, 🟡 other-agents shallow + no Gemini.

**Infra/Perf** — branches merged ✅, code-split ✅, ErrorBoundary ✅, console clean ✅, robots/sitemap ✅, OG/Twitter meta ✅ (🔴 **og-image.png missing**), aria-labels 🟡 (partial), semantic landing ✅, shortcuts overlay ✅, CLAUDE.md ✅, validation zones ✅.

**Open items** — homepage redesign on branch (not merged; current is feature-led, not pain-led), blue-accent pass (deferred), alpha→GA (pending validation), og-image (missing), prod `/color` (✅ TDZ fixed).

---

## 7. Issue Register

### P0 — Correctness / trust / cost (fix immediately)
| ID | Issue | Location | Type |
|---|---|---|---|
| P0-1 | Login ignores `location.state.from` → wrong post-login page | `Login.jsx` | Broken flow |
| P0-2 | Feedback submit swallows errors, always shows success | `Feedback.jsx:34`, `HelpCentre.jsx:182` | Silent failure |
| P0-3 | `saveFeedback` called with 4 positional args (expects object) → corrupt record | `HelpCentre.jsx:176` | Bug |
| P0-4 | `scan-photo.js` has no per-user rate limit (paid Gemini Vision) | `api/scan-photo.js` | Cost/abuse |
| P0-5 | Settings retention offers claim success, do nothing | `Settings.jsx:411-428` | Deceptive (billing) — **FLAG to founder** |
| P0-6 | Admin analytics are per-browser localStorage, not aggregate | `Admin.jsx` + `analytics.js` | Misleading data — **needs backend** |

### P1 — Missing states / data loss
| ID | Issue | Location |
|---|---|---|
| P1-1 | Color Studio undo covers only `resetPalette` (not removeExtra/grad/apply/extract) | `ColorStudio.jsx` |
| P1-2 | Image extract fails silently (`catch {}`) | `ColorStudio.jsx:1005` |
| P1-3 | Named-colour search has no "no results" state | `ColorStudio.jsx:1536` |
| P1-4 | FontMatcher has no `.catch` on fetchFonts → stuck loading | `FontMatcher.jsx:229` |
| P1-5 | Project save shows "Saved" on `localStorage` quota failure | `ProjectContext.jsx:62` |
| P1-6 | Community media >900 KB silently dropped on public submit | `PromptLibrary.jsx:350` |
| P1-7 | AutoBuilder logo extract: unhandled rejection → stuck "Extracting…" | `AutoBuilder.jsx:330` |
| P1-8 | EmojiLibrary / FontGallery: no empty-search state | respective files |

### P2 — Accessibility
Clickable `<div>`s without role/tabindex/keyboard (ColorStudio named-colour & brand/design cards, `StateShade`/`TintSwatch`; `Projects.jsx:70`); unlabeled `<input type=color>` (`ColorStudio.jsx:1269`); Color Info tabs not a real ARIA tablist; Admin chart `<svg>` missing `role=img`/`aria-label` + ModuleBoard search unlabeled; Onboarding emoji not `aria-hidden`; DocsThemes `BrandLink` mouse-only hover; heading-level skips (h2→h4) in docs.

### P3 — Dead code / convention
Unused: `ContrastBadge` + `searchNamedColors` import + no-op ternary (`ColorStudio.jsx`); `useAuth`/`user` (`AutoBuilder.jsx:248`); `searchTimer` ref (`FontMatcher.jsx:97`); `onCopy` prop (`App.jsx:325` → FileConverter); `t`/`useI18n` (`DocsSEO`,`DocsMarketing`,`DocsAI`); `HERO_LOOP_SOURCES` + dead `<video>` (`Landing.jsx:11,762`); dead CSS (`.landing-cats`,`.landing-feature*`,`.bento-hero-completion`). Inline-style convention breach in `Projects.jsx`/`HelpCentre.jsx`/`Feedback.jsx`. Doc component duplication. Likely stale link `cron.com` (`DocsThemes`).

### P4 — Assets / infra
`og-image.png` referenced (`index.html:14,19`) but absent from `public/previews/`. `firebase` bundle 357 KB (consider modular trims). Module board / setup checklist hardcoded (will drift).

---

## 8. Recommended Execution Roadmap (impact × dependency)

**Sprint 1 — Trust & correctness (P0, no new design needed)**
1. Fix Login `from` redirect (P0-1).
2. Make feedback fail loudly + fix `saveFeedback` signature (P0-2, P0-3).
3. Add rate limit to `scan-photo.js` mirroring the other AI endpoints (P0-4).
4. **Decision required (founder):** retention offers (P0-5) — real Stripe coupons or honest removal? *(Flagged; not auto-fixed — billing semantics.)*
5. **Decision required (founder):** Admin analytics backend (P0-6) — Firestore aggregate collection or 3rd-party analytics? *(Architectural; needs direction.)*

**Sprint 2 — Reliability of states (P1)**
6. Broaden Color Studio undo to all destructive actions; surface extract errors; named-colour empty state.
7. FontMatcher fetch error state; project-save quota error; community media-too-large warning; AutoBuilder extract guard; emoji/font empty-search states.

**Sprint 3 — Accessibility pass (P2)** — make interactive `<div>`s keyboard-operable, label inputs, ARIA tablist on Color Info, chart/search labels.

**Sprint 4 — Cleanup (P3) + assets (P4)** — remove dead code/CSS, generate `og-image.png`, fix DocsMarketing TOC layout, de-dupe doc components.

**Sprint 5 — Alpha → GA (needs validation/decisions)**
- File Converter: port AVIF + live-savings + frame quality + dashboard hand-off, then retire `/imgconvert` + `/video-frames`.
- AI generators: validate output quality, drop alpha badges.
- UI Auto-Builder: either wire a real AI mode or stop placing a deterministic tool under "AI Tools".
- Homepage redesign branch: review pain-led version, decide merge.
- Blue-accent theme pass: execute the `--accent`→blue swap (deferred by request).

**Backlog / forward-looking** — "build your first design system in 5 min" onboarding reframe; one-click connected brand-kit export; social proof/testimonials; real project sync (currently local-only); community media backend.

---

*Audit generated by automated multi-agent review. Every claim above is backed by `file:line` evidence in the source. Validation-zone files (Auth core, Stripe, `api/support.js`) were read but not modified.*
