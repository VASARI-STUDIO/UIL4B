# UIL4B — Master Build Plan (2026-06-23)

**Single source of truth** for the "Linear × Coolors" rebuild. Supersedes
`docs/REDESIGN-PLAN.md` and `docs/BUILD-PLAN-2026-06-18.md` (kept for history,
headed as superseded). Work runs **page-by-page, feature-by-feature**.

> The founder's ~60-item operational list is sequenced below into phases, each
> line carrying its item number(s), the owner agent, and a status.
> Legend: **✅ shipped** (verify, don't rebuild) · **◐ partial** · **☐ todo** ·
> **⚠ collision/decision** (read the note) · **⚙ owner-action** (founder, not code).

---

## Locked decisions (2026-06-23 interview + clarifications)

1. **Sequence — theme *direction* first, then Colour Studio.** Lock the app-wide
   visual language (Linear × Coolors: dark + light tokens, type, spacing, radii,
   motion, primitives) as a **design spec only — no full homepage rebuild yet** —
   so Colour Studio (and every later page that says "match the new homepage theme")
   is born on-theme and never needs re-skinning. Then: **Colour Studio (first real
   page) → Homepage finalize + app shell + global nav/search → Monetisation & auth →
   Features → Analytics → Responsive/SEO/polish.**
2. **Theme — dark default, light opt-in. Does NOT auto-follow the OS.** Already
   shipped (`ThemeContext`, commit `2655224`). ⚠ The written item **#4** says
   "browser/device based" and the founder's later confirmation used the phrase
   "device-based" — but the founder's *focused* interview choice was explicitly
   "dark default + opt-in, no OS-follow," so that governs. **Light/dark is restored
   (reverses the earlier dark-only lock); OS auto-follow stays off.** Trivially
   reversible (~5 lines) if the founder wants device-follow back.
3. **Paywall — Free = save projects + share one live "preview" URL. Pro = ALL file
   exports.** No free export at all, **not even watermarked**. ⚠ Supersedes the
   "free watermarked export" idea in **CS#3.11**. The free tier's shareable artifact
   is the in-app preview URL. _#24's "second URL export type" sentence is cut off in
   the brief — needs the founder to finish it (see Pending)._
4. **Process — agent-driven, no separate plan-approval gate.** research → design
   spec → engineer → code-review + security-review → secret-scan → qa.
   **Build-green + lint clean before every commit.** Founder said **"just go"**:
   execute straight through, flag collisions as they surface, check in only at
   natural gates. One PR per section; **PM merges** via GitHub MCP.

## Insurances (always on)
- **Verify-first gate** — `npx vite build` + `npx eslint .` clean before every
  commit (engineer runs it; `docs/reference/build-and-verify.md`).
- **Anti-tamper (security)** — Pro overlays / paywalled content (CS#3.2, #24) must
  **not** ship to the client merely hidden. Gate **server-side** or **don't render**
  the locked artifact, so inspect-element can't bypass. `security-reviewer` signs off.
  - **Client `isPro` is a conversion/UX driver only, NEVER the sole guard once output
    gains server-honoured value.** Security review (Slice 1, L-2) confirmed: in the
    palette builder a flipped client `isPro` only reveals locally-computed colours (no
    real exposure). But the **export/save slice (#23/#24, CS#3.11) MUST re-verify
    entitlement server-side** — `verifyIdToken`-protected `/api` route reading the
    authoritative Firestore `users/{uid}` plan (Stripe-webhook-synced via
    `api/_lib/firebase-admin.js`), not a client-sent flag. **That slice is founder-gated.**
- **Human-Validation-Zones** — Payments (#20/21/23/24) + Auth (#30/31) are
  founder-gated: flag blast radius, never silently edit
  (`docs/reference/human-validation-zones.md`).
- **Human, personal wording** (#28, #29) — cross-cutting on every surface, not a phase.
- **Secrets** — `secret-scanner` before any commit touching API/config. Public-by-design
  values (Firebase web `apiKey`, Stripe `pk_`, Google client ID) are **not** secrets.
- **No model identifier** (`claude-opus-4-8`) in any committed artifact.

## Pending on founder (non-blocking)
- **3D animated hero graphic (#36)** — placeholder for now (#37).
- **Two reference screenshots not received** — the **Coolors Tools nav menu** (#3)
  and the **quick-export** image (CS#3.11). Building to the live Coolors URLs; flag
  for a look.
- **#24 second URL export type** — sentence incomplete in the brief.
- **#5 homepage** — already shipped (Linear pass 1+2); confirm iterate-further vs
  accept-as-base (Phase 2).
- **"More lists per section as we go."**

---

## ✅ Already shipped (reconciled against `main`, 2026-06-23) — verify, don't rebuild
- **#4 light/dark theme** — `ThemeContext` live; default flipped to dark / light
  opt-in (Phase 0, done).
- **#5 homepage** — Linear redesign pass 1 + 2 (#103, #107). Iterate, don't restart.
- **#7 emoji scroll lag** — fixed (31d99ac).
- **#11 help docs** — Information Centre (#96, 31d99ac). Keep expanding.
- **#15 Style Guide → Admin dashboard** — done (576a9f7).
- **#25 Future Plans page removed** — done (b2ae5fd).
- **#26 UI Builder → Alpha** — done (a4108c3).
- **#27 logged-out alpha → "coming soon"** + route-level alpha gating — done (b2ae5fd, #92).
- **#35 Font-of-the-Day click-through** — done (98a7050).
- **#19 Community Hub** — exists (browse/heart-save/submit, #94); not yet the
  standalone marketplace destination — Phase 4.
- **MISC #4 interview** — done (2026-06-23).

---

## Phases

### Phase 0 — Theme default  ·  engineer  ·  ✅ DONE (commit 2655224)
- **[#4]** Default everyone to dark, light opt-in, no OS-follow; toggle + persistence
  kept. Light-theme token coverage in `global.css` audited complete.

### Phase 0.5 — Theme DIRECTION spec  ·  design  ·  ✅ DONE (token pass committed `c30f0c2`)
- App-wide Linear × Coolors visual language as a written spec (no homepage rebuild):
  confirm/refine dark + light token palettes against live `global.css`; type scale;
  spacing rhythm; radii; elevation/surface + glass-morphism rules; motion principles;
  component primitives (buttons/pills/cards/popups); brand-colour application.
  **Spec ✅ persisted → [`docs/specs/theme-direction.md`](specs/theme-direction.md).**
  **Everything downstream references this.** Engineer's token/primitive pass (next):
  - **Dark palette: keep as-is.** **Light: 4 lifts** — `--bg-1:#FCFCFD`,
    `--border:rgba(0,0,0,.08)`, ADD light `--ring:inset 0 1px 0 rgba(255,255,255,.7)`,
    ADD `--scrim` (dark `rgba(8,9,11,.62)` / light `rgba(23,23,23,.32)`).
  - **ADD tokens:** `--info`/`--info-bg` (alias of brand), glass recipe
    (`--glass-bg`/`--glass-border`/`--glass-shadow`), `--t-fast:.12s cubic-bezier(.2,0,0,1)`.
  - **ADD primitives:** `.btn-ghost`, `.btn-l`, `.is-loading` spinner; `.glass` recipe;
    sliding-pill `.cs-seg`/`.cs-seg-btn`/`.cs-seg-thumb`; Pro-lock shell
    `.pro-lock`/`.pro-lock-veil`/`.pro-lock-cta`/`.pro-lock-badge`/`-title`/`-sub`;
    cards add `box-shadow:var(--shadow-s),var(--ring)`; H1 `line-height:1.15`.
  - **#13** — neutralise `.nav-pinned.drop-active` (no brand): `background:var(--hvr)`,
    `box-shadow:inset 0 0 0 1.5px var(--bh)`; empty-state border `--border`/`--bh`, label `--t3`.
  - Small, token-only — no component rebuilds. Verify-gate, commit.

### Phase 1 — Colour Studio (FIRST real page)  ·  research → design → engineer → security + qa
Ground-up rebuild. **Slice 1 design spec ✅ done → [`docs/specs/colour-studio.md`](specs/colour-studio.md)**
(page nav + Palette Builder core: HCT/Material-3 tonal "Auto", sliding-pill nav, gap-insert ×1–3,
built-in tonal tints, Pro-gates as real non-DOM gates). **✅ Slice 1 SHIPPED** — committed `1a81d74`
+ pushed to `claude/youthful-ride-dbre15` (NOT yet PR'd). Gate cleared: code-review + security-review
(CS#3.2 anti-tamper) + secret-scan + qa PASS, build green, lint at baseline (0 errors). Then
**browser-verified** in Chromium (Playwright smoke-test): no JS errors; pill-nav thumb measured
(84px desktop / 72px mobile); 5 tonal swatches with `cs-deal` replay on Randomise (CS-1 fix) +
`backwards` fill-mode (no flash); hidden-overlay `<input type=color>` picker (CS-5); non-Pro harmony
lock glyphs present (anti-tamper); `data-reduced-motion` suppresses `cs-deal` (0.32s→0.01ms).

**✅ Slice 2 SHIPPED** — committed `c379c99` + pushed to `claude/youthful-ride-dbre15` (NOT
yet PR'd). Per-swatch interaction layer (all three features **free**): swatch popup redesign +
context menu (CS#3.12), palette-wide colour-blindness variants (CS#3.9), manual per-swatch hex
(CS#3.16). Gate cleared: code-review (1 CRITICAL + 3 HIGH + folded MED/LOW fixed by engineer) +
security-review + secret-scan PASS, build green, lint at baseline (0 errors / 31 warnings).
Machado-2009 matrices numerically re-verified (canonical severity-1.0, physically-correct
linear-RGB pipeline). Then **browser-verified** in Chromium (Playwright): context menu portals
to `<body>` (escapes the rail's stacking/overflow); 4-tab popup (Values·Contrast·Shades·Edit);
shade-click replaces the swatch in place; invalid hex rejected with no mutation; CB overlay
recolours swatches while retaining the TRUE hex label; mobile bottom-sheet renders anchored;
zero JS errors. **Deferred tech-debt (logged, non-blocking):** M2 — extract a shared
`useSlidingThumb` hook (page-nav thumb + popup tab underline duplicate the measure/ResizeObserver
logic); L1 — `#000` literal in `.cs-pb-kbd` should use a design token; L2 — make the popup's
`matchMedia` breakpoint check reactive (re-evaluate on resize, not just on mount).

Full sub-sequence (Slice 1 & 2 items marked ✅; the rest = later slices):
- **Page nav** ✅ (Slice 1) — pill style + sliding/snapping inner pill (any label width), glass
  panel, pinned-to-top on load, **tints section removed** (folds into palette). (CS#1, 2, 2.1)
- **Palette Builder (Coolors-grade rebuild)** —
  - ✅ (Slice 1) **"Auto" default = HCT / Material-3 tonal, 5 colours, randomised on open** (CS#3.6,
    3.8); maths harmonies remain but **Pro-locked** (CS#3.7); **>6-colour randomize → Pro** (CS#3.17).
  - ✅ (Slice 1) **Space / button to randomize**, **insert exact midpoint between two swatches ×1–3**
    (CS#3.5). ◐ **lock + drag-reorder** swatches (CS#3.10 — toolbar markup in place, full DnD = next
    slice), **smooth add-colour transition** (CS#3.4).
  - ✅ (Slice 1) **Tints in the generator** (CS#3.3); global **hue/sat/tone/temperature** adjust
    (CS#3.15). ✅ (Slice 2) **colour-blindness variants view** (CS#3.9); **manual per-swatch set** (CS#3.16).
  - ✅ (Slice 2) **Swatch popup redesign** + **right-click/long-press menu**: contrast check,
    view shades (click → swatch becomes it), info popup, in-place Edit tab. (CS#3.12)
  - **"Colour System" popup** (renamed from "add colour") — keep From-brand-palette; house
    harmony picker + Auto default; **image extract keeps image on screen with movable
    eyedropper points**; **remove plain "pick colour" tab.** (CS#3.14)
  - **High-quality UI previews** (real UI, not tiny mockups); **1–3 blurred Pro previews with
    upgrade overlay + final upgrade CTA**; ⚠ **server-gated / not-rendered** so inspect-element
    can't unlock (CS#3.2).
  - **Quick-export** (reusable across tools). ⚠ Per decision #3, **export is Pro-only** — no
    free watermarked export (CS#3.11 reconciled).
- **Colour data** — names indexed from coolors.co/colors + color-hex.com (CS#4); pros/cons
  shows **brands using a colour with logos** ("similar brands" if no exact match) (CS#5).
- **Gradient tool** — UI rebuilt + **fix the flip button** (CS#7); **community gradients
  "view more"** at section end (CS#8).
- **UI-states tool** — gets **its own export** (CS#13).
- **Removals:** palette visualiser (CS#9), named-colour library (CS#6), add-to-project top
  panel — rework differently (CS#10), the "Colour" tagline at top — **and on all pages**
  (CS#11), "design systems" as a section (CS#14).
- **Re-theme** the whole page to the theme-direction spec (CS#12).

### Phase 2 — Homepage finalize + app shell + global nav & search  ·  design → engineer → review
- **[#5]** ✅ — finalize: confirm with founder, align to final tokens, add **[#37]**
  placeholder hero (right of text), swap **[#36]** 3D hero later; **[#5.5]** smooth scroll.
- **[#6]** app shell re-themed (sweep for drift).
- **[#1]** global search → **links to the in-page section** of a tool; **[#1.1]** help/docs
  searchable with a **distinct visual treatment** for tools vs help vs docs.
- **[#2]** nav parity — dashboard nav == `/home` nav; **[#3]** extra-tools button →
  **full-width Coolors-style mega-menu** _(needs screenshot)_.
- **[#13]** kill the **blue highlight** on pinned nav sections; **[#14]** move the **pin icon
  onto the page**, not the nav.

### Phase 3 — Monetisation & auth  ·  design → engineer (HVZ-gated) → security + qa
- **[#22]** remove **Buy-Me-A-Coffee** link (`src/pages/Landing.jsx`) — quick.
- **[#21]** pricing redesign → coolors.co/pricing register; **[#20]** every Pro-upgrade CTA → **popup**.
- **[#23]** export popup redesign — **block whole-system export until missing steps done**
  (button to open the right section); rename **"design system" → "Whole System."**
- **[#24]** ⚠ paywall: all exports Pro; **free = save + share preview URL**; URL opens the
  system in-app as a preview. _Second URL type TBD (founder)._ Server-gated.
- ⚙/HVZ **[#30]** sign-in → **popup** (keep Settings one; default popup, no redirects);
  **[#31]** remember previous Google sign-in for **one-click**. Founder-gated — flag blast radius.

### Phase 4 — Features & polish  ·  design → engineer (+ analytics where noted)
- **[#10/10.1/10.2]** post-onboarding **guided walkthrough** — friendly offer → exitable,
  quick, **Apple-style emoji** bubbles, highlight/animate the target control; tailored
  exit/finish messages pointing to the Help Centre.
- **[#11]** more SaaS-style help docs.
- ⚠ **[#12]** **compact / default density modes** in Settings → **reverses the current lock**
  (`AppearanceContext` hard-locks density to `cozy`). Re-enable density as a real choice.
- **[#19]** Community Hub → standalone **marketplace-style inspiration dashboard**, out of
  the Help tab (searchable sections).
- **[#34]** UI Preview: **remove Rounding control → Themes** (default = our style; others =
  Apple/iOS, Google/Material).
- **[#8]** Icon Library — real **filter by type/category** (not just swapping packs).
- **[#9]** colour-picker popup — restyle to theme + add an **eyedropper**.

### Phase 5 — Analytics  ·  analytics → engineer
- **[#17]** bounce-rate panel → **click-through drill-down** (page, section, in-tutorial?).
- **[#18]** add **time-on-page**, **unused tools/pages**, and other UX-decision data.

### Phase 6 — Responsive, SEO scrapability & MISC  ·  qa + seo + security + engineer
- **[#32]** dashboard **tablet breakpoint** fix; **[#33]** all-breakpoint bento sizing,
  **size per tool**, minimal breakpoints.
- **[#16]** make the site **safely scrapable by AI/SEO crawlers** (prerender/meta) **without**
  exposing anything that lets users steal data — `seo` specs, `security-reviewer` gates.
- **MISC [#1]** tidy the file system; **[#2]** READMEs current; **[#3]** full UX-quality pass
  every page.

---

## Agent routing (`docs/reference/project-manager.md`)
- **research** — Colour Studio + homepage teardowns (Coolors, Linear, Material-3).
- **design** — theme direction, Colour Studio, homepage finalize, pricing, walkthrough,
  export/paywall UX, mega-menu, community hub. **AAA specs before engineering.**
- **engineer** — all implementation; runs the build gate.
- **analytics** — Phase 5 instrumentation design.
- **seo** — #16 scrapability/indexability.
- **code-reviewer + security-reviewer + secret-scanner** — pre-ship gate every phase;
  security **mandatory** on paywall/anti-tamper (#24, CS#3.2) and auth (#30/31).
- **qa** — PASS/FAIL sign-off before merge.
- **release-captain** — gate + prep PR; **PM merges** via GitHub MCP (one PR per section).
