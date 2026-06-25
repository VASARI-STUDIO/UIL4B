# UIL4B — Build Plan & Backlog (2026-06-18)

> ⚠️ **SUPERSEDED (2026-06-23) by [`docs/BUILD-PLAN-2026-06-23.md`](BUILD-PLAN-2026-06-23.md).**
> Kept for history. Note the **Q-THEME "Dark only"** decision below was *reversed* on
> 2026-06-23 (light/dark restored, dark default + opt-in). See the new plan.

Captured from the founder's task brief. This is the **planning artifact** — nothing in
"Phase 1+" is built yet; execution starts after the open questions (§OPEN) are answered.
Sequencing follows the founder's rule: **fix/polish existing modules before new alpha tools.**

Status legend: ☐ todo · ◐ needs decision (see §OPEN) · 🔒 admin-only/alpha · ⚙ owner-action

---

## ✅ Already shipped this session (for completeness)
Full audit + roadmap, P0/P1 reliability fixes, accessibility pass, ESLint 101→0, Color
Studio undo, converters consolidated, community→Storage, cross-device project sync,
server analytics, theme overhaul (near-black + blue accent + depth), feedback popup
modal, docs subcategories, AI self-diagnostics + admin-init hardening, SEO sitemap/robots/
llms.txt, 10-agent roster (design, seo, research, engineer, code-reviewer, security-reviewer,
secret-scanner, qa, release-captain, analytics). See `docs/PRODUCT-AUDIT-2026-06-16.md` §9.

---

## Phase 1 — Diagnostics (run first; informs everything)
- ☐ **API correctness audit** — verify every `/api/*` call (client + server): fonts, icons (Iconify), generate-prompt, scan-photo, alt-text, support, Stripe, get-prices. (engineer + qa)
- ☐ **Performance/weight audit** — "are we using too many APIs?" Measure: bundle (index 430KB + firebase 380KB), runtime API calls per page, Iconify fetch strategy, lazy-loading. (analytics + qa)
- ☐ **UX audit** — laggy features, broken features, missing-feature gaps. Founder examples: icon filtering, UI preview clipping, FOUC load jank. (qa)
- ☐ **Security review** — can users reach sensitive code / work around gates with basic dev tools? Confirm: alpha-hiding is UI-only (real protection is server-side); admin routes are server-gated; no secrets in bundle. (security-reviewer + secret-scanner) ◐ see Q-SEC

## Phase 2 — Information architecture & navigation
- ☐ **Logo → dashboard**; remove the "Dashboard" nav item (logo is the home link).
- ☐ **Projects** — remove from left nav; nest it (under the user/profile menu or dashboard).
- ☐ **External Resources** → its own top-level nav **category** (currently a doc tool; its link text renders blue — fix the link colour).
- ☐ **Imagery tab** = File Converter + AI Image Prompt Generator + (Alt Text? ◐ Q-ALT).
- ☐ **Icons + Emoji** → their own tab (split out of Imagery).
- ☐ **Documentation Hub** — collapse the 7 doc pages out of the cluttered nav into one hub (see Phase 5).
- 🔒 **"Future Plans" tab (admin-only)** — holds everything not user-ready: all UI-Builder tools (Component Designer, Box Shadow, UI Auto-Builder), AI Landing Page Prompts, and any other alpha not yet functional.
- 🔒 **Alpha gating** — anything `alpha: true` is hidden from non-admins app-wide (nav + routes + dashboards). UI Builder gets marked alpha. **For now, move ALL alpha → Future Plans.**

## Phase 3 — Fixed theme & brand UI (remove customisation)
- ☐ **Remove UI customisation** — drop the Appearance settings (rounding/density/reduced-motion) so the brand look is fixed. ◐ Q-THEME: does this include the **dark/light toggle**?
- ☐ **Rounding** — **medium (default)**; buttons + small cards/CTAs = **full rounding**.
- ☐ **Button padding** — allow asymmetric top/bottom where the style calls for it (not forced-equal).
- ☐ **Admin dashboard** — restyle to match the app's UI (currently off-style).
- ☐ **Style Guide** → move into the Admin dashboard.
- ☐ **FOUC fix** — kill the load "jank" where defaults render then styles/variables apply (worst on fonts + specific text). (font preload + inline critical tokens + avoid post-mount style swaps)

## Phase 4 — Category dashboards (assume nav may collapse by default)
- ☐ Redesign each category dashboard to work like the **main dashboard**: include **mini/live versions of the tools** + make the page genuinely useful (many users may browse only via these).

## Phase 5 — UI Preview overhaul
- ☐ **Resizable preview** — user can drag-resize; it **flexes/wraps** to the box size (desktop → tablet → mobile responsively as it shrinks).
- ☐ Small screens that can't expand: **"view desktop / tablet" buttons** that scale-to-fit.
- ☐ **Clipping fix** on small screens.
- ☐ Rounding buttons: **Medium = 8px**, **Subtle = 4px**.
- ☐ Clicking a new nav page while the preview is open → **close the preview popup**.

## Phase 6 — Responsive / popups sweep
- ☐ Audit **all popups/modals** for clipping on small screens; use flexbox; verify mobile + tablet + uncommon desktop sizes/ratios.

## Phase 7 — Documentation → "Information Centre"
- ☐ **Single hub page** (indexable) — subcategories (e.g. "Marketing & SEO") are the nav entries; each is an indexable page that **inlines its sub-pages as sections**.
- ☐ **Rename** to "Information Centre"; **problem-oriented titles** for findability.
- ☐ **Less verbose**, faster to grok; **more visuals** (diagrams, examples).
- ☐ **Interactive blocks** — e.g. *Platform Dimensions reference*: dropdown 1 = platform (Instagram/Facebook/LinkedIn…), dropdown 2 = post type (feed/cover/banner…) → show recommended size + **PPI** + a **resize/crop tool** (image-converter-style) to fit that frame. Apply interaction to other similar docs.
- ☐ **Screen-usage stats** per category (e.g. "Ecommerce → 67% mobile") to guide who to design for.
- ☐ **Intro popup** on entry ("hey, here's what this does") with **emojis** for a friendlier feel.

## Phase 8 — Community Hub & Prompt Library
- ☐ **Community Hub** — build the real page (currently a stub) + intro popup.
- ☐ **Break up Prompt Library** — image prompts → AI Image Prompt Generator + Community Hub (stop it blending unrelated things).

## Phase 9 — Homepage redesign
- ◐ **Homepage redesign** — proceed with the `design` agent's brief? (Q-HOME) Then **rename `/welcome` → `/home`**, and **apply the new style across the app**.

## Phase 10 — New tools
- ☐ **Ratio Calculator** — compute aspect ratios from a single dimension; **live shape visualiser**. (ref: calculateaspectratio.com) — small, can ship early.
- 🔒◐ **SEO Specialist (new alpha section)** — houses Alt Text (◐ Q-ALT) + an **SEO Spider** (analyse a user URL → analytics + improvement suggestions, like our seo agent) + other SEO tools. Must show **"avg SEO improvement vs other tools"** + "why ours is more powerful/worth it." ◐ Q-SEO: real measured data vs illustrative? And spider = client-side fetch (CORS limits) vs a serverless crawler (12-fn limit)?

---

## DECISIONS (locked 2026-06-18)
- **Q-THEME → Dark only.** Remove the light theme AND all appearance customisation; one fixed dark brand theme, medium rounding default, full rounding on buttons/CTAs; asymmetric button padding allowed.
- **Q-ALT → SEO Specialist.** Alt Text anchors the new (admin-only/alpha) SEO Specialist section. Imagery = File Converter + AI Image Prompt Generator.
- **Q-SEO → Illustrative now, real later.** Ship SEO tools with clearly-framed illustrative examples; build a real before/after scoring engine later.
- **Q-HOME → Design brief, anchored on LINEAR.** Founder loves Linear (linear.app) — its product UI AND sales page — as the primary reference for both the homepage and the app-wide style. Build the Living-Specimen/gallery homepage in that register; then rename `/welcome` → `/home` and roll the style across the app.
- **Community Hub → real prompt/design sharing**, reusing the Prompt Library submit/moderate/upvote pipeline + an intro popup.
- **SEO Spider → admin-only Future-Plan placeholder now** (empty/coming-soon); founder builds the crawler later. (Alt Text in the SEO Specialist section is functional now.)
- **Category dashboards → functional mini-tools where they shine**, falling back to rich interactive preview cards when a mini-tool isn't sensible/clean.
- **Doc interactive tools → reuse the File Converter engine** (platform-dimensions resize/crop via the existing client-side image pipeline).

## DEFAULTS (not specified — using these; flag to change)
- **Q-SEQ** — use the 10-phase order above.
- **Q-SEC** — full security pass: confirm admin features are SERVER-gated (not just UI-hidden), no secrets in the client bundle, alpha-hiding understood as UI-only; harden real gaps.
- **Q-PLAN** — interpret "plan tab" as the Admin **Board** (`moduleBoard.js`); populate its Planned/Idea columns from this backlog.
- **Q-FP** — "Future Plans" = admin-only staging, no public routes.
- **Projects** — nest under the profile/avatar menu (top-right).
- **Intro popups** — one reusable component; apply to Information Centre + Community Hub first, easy to add to any tool later.
- **Doc screen-stats** — well-known, clearly-cited industry figures.
