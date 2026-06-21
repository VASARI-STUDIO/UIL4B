# UIL4B — Redesign Plan (Phase: "Linear/Coolors rebuild")

_Created 2026-06-20. The authoritative tracking doc for the big redesign list. Work runs page-by-page, feature-by-feature._

## Locked decisions (from the interview)
1. **Start: Foundation first** — restore light/dark theme → rebuild homepage (Linear theme + Coolors structure) → re-theme app shell → then Colour Studio → other pages.
2. **Theme: restore light/dark**, device/browser-based default + manual toggle; build the whole redesign **theme-aware for both** from the start.
3. **Paywall model: Free = save projects + share a live "preview" URL only. Pro = all file exports** (CSS/Tailwind/PNG/SVG/whole-system) + advanced colour previews.
4. **Process: agent-driven** (research → design spec → engineer → code-review + security → qa), **one PR per section**, founder reviews per phase.

## Insurances (always)
- Build-green + lint before every commit; signed commits; PR per section.
- **Anti-tamper:** Pro overlays / paywalled content (Colour Studio #3.2, global #24) must NOT be shipped to the client and merely hidden — gate server-side or don't render, so inspect-element can't bypass.
- Human-Validation-Zones: Payments (#20/21/24) and Auth (#30/31) — flag blast radius before touching.
- Human wording throughout (#28, #29).

## Pending on founder (non-blocking)
- 3D animated hero graphic (#36) — placeholder for now (#37).
- Two reference screenshots not yet received: **Coolors Tools nav menu** (#3) and the **quick-export** image (#3.11). (Only the current Export-Palette popup was provided.)
- "More lists per section as we go."

---

## Phases (item #s from the founder's list)

### Phase 0 — Theme foundation  ·  engineer  ·  ⏳ IN PROGRESS
- [#4] Restore light/dark, device-based default + toggle, theme-aware everywhere.

### Phase 1 — Homepage rebuild  ·  research → design → engineer
- [#5] Ground-up redesign — Linear theme + Coolors structure · [#5.5] smooth scroll · [#37] placeholder hero (right of text) · [#36] swap in 3D hero later.

### Phase 2 — App shell to match  ·  design → engineer → security/code-review
- [#6] Re-theme app UI · [#1/#1.1] global search w/ in-page section links + help/docs indexed & visually distinct · [#2] nav parity home↔dashboard · [#3] full-width Tools mega-menu (Coolors-style) · [#13] de-blue pinned nav state · [#14] move pin icon onto the page (not nav) · [#30] sign-in popup · [#31] Google one-click remember · [#26/#27] UI Builder→alpha + logged-out "coming soon" page for alpha URLs · [#28/#29] human wording · [#25] remove Future Plans · [#22] remove Buy-Me-A-Coffee · [#15] Style Guide → Admin dashboard, off the nav.

### Phase 3 — Colour Studio (first page)  ·  research → design → engineer → security + qa
- Page nav: pill + sliding glass morphism, pinned, tints removed (CS#1, 2, 2.1) · Palette Builder ground-up: Auto/HCT default 5 (CS#3.6, 3.8), maths harmonies → Pro (3.7), tints merged (3.3), add-between ×1-3 (3.5), space/lock/drag (3.10), HSL+temp adjust (3.15), manual swatch set (3.16), >6 colours → Pro (3.17) · high-quality UI previews w/ tamper-proof Pro overlays (3.2) · swatch popup + right-click menu (shades/contrast/info) (3.12) · "Colour System" popup w/ image-picker (3.14) · colour-blindness view (3.9) · quick-export w/ watermark (3.11) · colour names + brand matching (CS#4, 5) · gradient tool rebuild + flip fix (CS#7) · community gradients "view more" (CS#8) · remove visualiser/named-library/add-to-project/tagline/design-systems (CS#6, 9, 10, 11, 14) · UI-states own export (CS#13) · re-theme (CS#12).

### Phase 4 — Features
- [#10–10.2] onboarding walkthrough w/ Apple-emoji bubbles · [#11] expand help docs · [#12] compact/default density modes · [#19] Community Hub as inspiration destination (Framer-marketplace style), out of Help · [#20/#21] pricing redesign (Coolors) + Pro popups · [#23/#24] export popup redesign + paywall · [#34] UI-Preview themes (ours/Apple/Material) instead of rounding · [#35] font-of-day clickable · [#7] emoji scroll perf · [#8] icon filters by type/category · [#9] colour-picker styling + eyedropper.

### Phase 5 — Analytics  ·  analytics → engineer
- [#17] bounce-rate drill-down (page/section/in-tutorial) · [#18] time-on-page, unused tools, etc.

### Phase 6 — Responsive + polish
- [#32/#33] dashboard tablet + all breakpoints, bento sizing per tool · [#16] AI-crawler/SEO indexability (safely) · MISC: tidy file system, READMEs, full UX pass.
