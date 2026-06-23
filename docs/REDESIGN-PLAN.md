# UIL4B — Redesign Plan (Phase: "Linear/Coolors rebuild")

_Created 2026-06-20. **Amended 2026-06-23** after a fresh founder interview + a status
reconciliation against `main`. The authoritative tracking doc for the big redesign
list. Work runs **page-by-page, feature-by-feature**; **Colour Studio first**._

> **How to read this:** every line carries the founder's item number(s), an owner
> agent, and a status. Status legend: **✅ shipped** (verify visually) · **◐ partial**
> (some shipped, more to do) · **☐ todo** · **⚠ collision/decision** (read the note) ·
> **⚙ owner-action** (founder, not code).

---

## Locked decisions — current (2026-06-23 interview)

1. **Build order:** **Theme tweak → Colour Studio (first big page) → Homepage finalize +
   app shell + global nav/search → Monetisation & auth → Features → Analytics →
   Responsive/SEO/polish.** (Colour Studio jumps ahead of the homepage per the founder's
   "do this page first," and because the theme + homepage foundations are largely already
   built.)
2. **Theme:** **Dark is the default for everyone; light is opt-in** via the existing
   toggle. Do **not** auto-follow the OS preference. ⚠ **This supersedes written item #4**
   ("browser/device based"), which is also what's *currently live*. Flagged to founder —
   trivially reversible if you'd rather keep device-based.
3. **Paywall:** **Free = save projects + share a live "preview" URL only. Pro = ALL file
   exports** (no free export at all — not even watermarked). ⚠ **This supersedes the
   "free watermarked export" idea** in CS#3.11. Exports are Pro-only; the free tier's
   shareable artifact is the in-app preview URL. _#24's "second URL export type" sentence
   is cut off in the brief — needs the founder to finish it (see Pending)._
4. **Process:** agent-driven (research → design spec → engineer → code-review + security →
   secret-scan → qa), **build-green + lint before every commit**, founder reviews per phase.
   Founder said **"just start building"** — no separate plan-approval gate; execute straight
   through, flagging collisions as they surface.

## Insurances (always)
- **Verify-first gate:** `npx vite build` + `npx eslint .` clean before every commit
  (engineer runs it; see `docs/reference/build-and-verify.md`).
- **Anti-tamper (security):** Pro overlays / paywalled content (CS#3.2, global #24) must
  **not** ship to the client and be merely hidden — gate **server-side** or **don't render**,
  so inspect-element can't bypass. (`security-reviewer` signs this off.)
- **Human-Validation-Zones:** Payments (#20/21/23/24) and Auth (#30/31) are founder-gated —
  flag blast radius, never silently edit (`docs/reference/human-validation-zones.md`).
- **Human, personal wording** throughout (#28, #29) — a cross-cutting requirement on every
  surface, not a phase.
- **Secrets:** `secret-scanner` before any commit that touches API/config.

## Pending on founder (non-blocking)
- **3D animated hero graphic (#36)** — placeholder for now (#37).
- **Two reference screenshots still not received:** the **Coolors Tools nav menu** (#3) and
  the **quick-export** image (CS#3.11). The brief references "attached" images but none are
  attached — the Coolors URLs cover most of it; I'll build to those and flag for a look.
- **#24 second URL export type** — sentence is incomplete in the brief.
- **#5 homepage** — already shipped (Linear pass 1+2); confirm whether to iterate further or
  accept as the base (see Phase 2).
- **"More lists per section as we go."**

---

## ✅ Already shipped since this plan was written (reconciled against `main`, 2026-06-23)

Do **not** rebuild these — **verify** and iterate only:

- **#4 light/dark theme** — `ThemeContext` is live: device-default + toggle + persistence +
  live-OS-follow-until-explicit. (Only change needed: flip default to dark / opt-in light per
  decision #2 — Phase 0.)
- **#5 homepage** — Linear redesign pass 1 + 2 (#103, #107). Iterate to final tokens + hero
  placeholder, don't rebuild from scratch.
- **#7 emoji scroll lag** — fixed (commit 31d99ac).
- **#11 help docs** — Information Centre + more docs (#96, 31d99ac). Keep expanding.
- **#15 Style Guide → Admin dashboard, off the sidebar** — done (576a9f7).
- **#25 Future Plans page removed** — done (b2ae5fd).
- **#26 UI Builder → Alpha** — done (a4108c3).
- **#27 logged-out alpha → friendly "coming soon"** + route-level alpha gating — done
  (b2ae5fd, #92).
- **#35 Font-of-the-Day click-through** — done (98a7050).
- **#19 Community Hub** — exists (browse / heart-save / submit, #94) but **not yet** the
  standalone Framer-marketplace inspiration destination — see Phase 4.
- **MISC #4 interview** — done (2026-06-23).

---

## Phases (item #s from the founder's list)

### Phase 0 — Theme default  ·  engineer  ·  ☐ NEXT (small)
- ⚠ **[#4]** Theme system already exists. Change only: **default everyone to dark**, make
  **light opt-in** (stop auto-following OS); keep the toggle + persistence. Static-audit
  `global.css` light-theme token coverage; flag any obviously theme-broken surfaces.

### Phase 1 — Colour Studio (FIRST big page)  ·  research → design → engineer → security + qa
The full ground-up rebuild. Sub-sequence:
- **Page nav** — pill style + sliding/snapping inner pill (fits any label width), glass
  morphism panel, pinned to top on load, **tints section removed** (folds into palette).
  (CS#1, 2, 2.1)
- **Palette Builder (ground-up rebuild, Coolors-grade)** —
  - **"Auto" default = HCT / Material-3 tonal system, 5 colours, randomised on open.**
    (CS#3.6, 3.8) · maths harmonies (analogous/complementary/etc.) remain but **Pro-locked**
    (CS#3.7) · **>6-colour randomize → Pro** (CS#3.17).
  - Interactions: **space / on-screen button to randomize**, **lock + drag-reorder** swatches
    (CS#3.10), **smooth add-colour transition** (CS#3.4), **insert exact midpoint between two
    swatches, ×1–3** (CS#3.5).
  - **Tints built into the generator** (Coolors-style) (CS#3.3) · **colour-blindness variants
    view** (CS#3.9) · global **hue/sat/bright/temperature** adjust (CS#3.15) · **manual
    per-swatch colour set** (CS#3.16).
  - **Swatch popup redesign** (less rushed) + **right-click / hover menu**: check contrast,
    view shades (click a shade → swatch becomes it), info popup. (CS#3.12)
  - **"Colour System" popup** (renamed from "add colour") — keep **From-brand-palette**;
    house the harmony picker + **Auto default here**; **image extract keeps the image on
    screen with movable eyedropper points** (coolors.co/image-picker style); **remove the
    plain "pick colour" tab.** (CS#3.14)
  - **High-quality UI previews** (not tiny mockups) showing the palette in real UI; **1–3
    blurred Pro previews with an upgrade button overlaid + a final upgrade CTA**; ⚠
    **server-gated / not-rendered so inspect-element can't unlock them** (CS#3.2).
  - **Quick-export** (reusable across tools; image/other of the just-made artifact). ⚠ Per
    decision #3, **export is Pro-only** — no free watermarked export. (CS#3.11 reconciled.)
- **Colour data** — names indexed from coolors.co/colors + color-hex.com (CS#4) · pros/cons
  shows **brands using a colour with their logo** ("similar brands" if no exact match) (CS#5).
- **Gradient tool** — UI rebuilt ground-up + **fix the flip button** (currently doesn't flip
  the preview) (CS#7) · **community gradients "view more"** at section end (CS#8).
- **UI-states tool** — gets **its own export** features (CS#13).
- **Removals on the page:** palette visualiser (CS#9), named-colour library (CS#6),
  add-to-project top panel — rework into the page differently (CS#10), the "Colour" tagline
  at the very top — **and on all pages** (CS#11), "design systems" as a section (CS#14).
- **Re-theme** the whole page to the homepage theme (CS#12).

### Phase 2 — Homepage finalize + app shell + global nav & search  ·  design → engineer → review
- **[#5]** ✅ shipped — **finalize**: confirm with founder, align to final tokens, add **[#37]**
  placeholder hero (right of text), swap **[#36]** 3D hero in later · **[#5.5]** smooth scroll.
- **[#6]** app shell re-themed to match (largely there — sweep for drift).
- **[#1]** global search → **links to the in-page section** of a tool (e.g. "gradient tool")
  · **[#1.1]** help & docs indexable in search with a **distinct visual treatment** for
  tools vs help vs docs.
- **[#2]** nav parity — dashboard nav == `/home` nav · **[#3]** extra-tools button → **full-width
  Coolors-style mega-menu** (no long scroll) _(needs the screenshot)_.
- **[#13]** stop the **blue highlight** on pinned nav sections · **[#14]** move the **pin icon
  onto the page** (not the nav — it reads like pinning the nav).

### Phase 3 — Monetisation & auth  ·  design → engineer (HVZ-gated) → security + qa
- **[#22]** remove the **Buy-Me-A-Coffee** link (in `src/pages/Landing.jsx`) — quick.
- **[#21]** pricing redesign → coolors.co/pricing register · **[#20]** every Pro-upgrade CTA
  becomes a **popup**.
- **[#23]** export popup redesign — **block whole-system export until missing steps done**
  (button to open the right section) + rename **"design system" → "Whole System."**
- **[#24]** ⚠ **paywall:** all exports Pro; **free = save + share preview URL**; the URL opens
  the system in-app as a preview screen. _Second URL type TBD (founder)._ Server-gated.
- ⚙/HVZ **[#30]** sign-in becomes a **popup** (keep the Settings one; default to popup — no
  redirects) · **[#31]** remember a previous Google sign-in for **one-click**. Auth zone —
  flag blast radius, founder-gated.

### Phase 4 — Features & polish  ·  design → engineer (+ analytics where noted)
- **[#10/10.1/10.2]** post-onboarding **guided walkthrough** — friendly popup offer →
  exitable, quick, **Apple-style emoji** bubbles, highlight/animate the target control
  (export, UI Preview, search, …); tailored exit/finish messages pointing to the Help Centre.
- **[#11]** more SaaS-style help docs (how-to-use-the-app, etc.).
- ⚠ **[#12]** **compact / default density modes** in Settings → **reverses the current lock**
  (`AppearanceContext` hard-locks density to `cozy`). Re-enable density as a real choice.
- **[#19]** Community Hub → standalone **Framer-marketplace-style inspiration dashboard**,
  out of the Help tab (searchable sections).
- **[#34]** UI Preview: **remove Rounding control → Themes** instead (default = our style;
  others = Apple/iOS, Google/Material).
- **[#8]** Icon Library — real **filter by type/category** (not just swapping packs).
- **[#9]** colour-picker popup — restyle to the theme + add an **eyedropper** tool.

### Phase 5 — Analytics  ·  analytics → engineer
- **[#17]** bounce-rate panel → **click-through drill-down** (page, section, in-tutorial?).
- **[#18]** add **time-on-page**, **unused tools/pages**, and any other UX-decision data.

### Phase 6 — Responsive, SEO scrapability & MISC  ·  qa + seo + security + engineer
- **[#32]** dashboard **tablet breakpoint** — fix rendering + whitespace · **[#33]**
  all-breakpoint bento sizing, **size per tool**, minimal breakpoints.
- **[#16]** make the site **safely scrapable by AI/SEO crawlers** (prerender/meta) **without**
  exposing anything that lets users steal data — `seo` specs, `security-reviewer` gates.
- **MISC [#1]** tidy the file system · **[#2]** READMEs current · **[#3]** full UX-quality pass
  on every page.

---

## Agent routing (per `docs/reference/project-manager.md`)
- **research** — Colour Studio + homepage competitor teardowns (Coolors, Linear, Material-3).
- **design** — Colour Studio, homepage finalize, pricing, walkthrough, export/paywall UX,
  mega-menu, community hub. **AAA specs before engineering.**
- **engineer** — all implementation; runs the build gate.
- **analytics** — Phase 5 (#17/#18) instrumentation design.
- **seo** — #16 scrapability/indexability.
- **code-reviewer + security-reviewer + secret-scanner** — pre-ship gate every phase;
  security is mandatory on paywall/anti-tamper (#24, CS#3.2) and auth (#30/31).
- **qa** — PASS/FAIL sign-off before merge.
- **release-captain** — gate + prep PR; **PM merges** via GitHub MCP (one PR per section).
