# Changelog

All notable changes to UIL4B.

---

## v2.7.0 — Public UI Quality Release (2026-07-25)

### Public Shell
- Reframed the home hero around one connected UI system while preserving the interactive Create preview directly below it
- Rebuilt mega-menus around task-led editorial hierarchy, complete keyboard navigation and a focus-safe mobile sheet
- Added a reusable beams-style closing CTA to Home, Colour, Surface and Plans, plus a clearer public footer
- Removed UI Colour from public navigation, search and sitemap data; `/color/ui` now redirects safely to `/color`

### Tool Workflows
- Refined Gradient, Tint and Semantic Colour workbenches for clearer responsive use
- Added Palette Builder Reset with immediate Undo and clarified the existing Save / export group without removing options
- Unified the Icon + Emoji command header with distinct mode symbols, keyboard switching and visible loading/offline states

### Community & Quality
- Added the founder public identity **Dylan Coleman 👑** with an accessible owner treatment
- Reconciled the Build Plan, pipeline, module board, README, changelog and tool tree; archived completed floating task lists
- Release-gated with production build, lint, interaction and cross-device checks

---

## v2.6.0 — Workspace Repositioning, Nav & Home Rebuild, Colour + Icon Tool Overhauls

### Positioning & App Shell
- Product repositioned around three surfaces: **Create** (build), **Discover** (browse), **Learn** (understand)
- Home page rebuilt (Mobbin-inspired) with live Create previews and a two-line hero
- Navigation rebuilt: fixed full-width top bar with mega-menus (labelled column groupings, deep links), global section switcher, centred search, and a 3-dot utility menu; profile popover absorbs settings and promotes the Upgrade CTA
- New public pages: `/plans` pricing page, visual site map at `/sitemap`, Discover/Learn sales pages

### Colour Tools
- Colour Studio rebuilt in slices: Colour System popup, "See it shipped" UI previews, dark-default theme
- Every colour feature split onto its own routed tool page with real page chrome and a cross-link footer; `/color` sales page with Design System Builder entry
- **Palette Builder v3** (7 waves): full-bleed workbench, unified toolbar/button system, canonical Pro modal, drag-anywhere swatch reorder, free colour cap raised 6 → 8, persisted variations, brand-territory seed randomiser, wholesale brand-system apply with proper Pro gating, drag-and-drop image picker, bookmark save + community submit popup, editorial palette names, user handles & flair
- Tint tool upgraded: multi-ramp, palette import, real perceived/linear scales, 0–1000 steps
- **Gradient Cockpit** overhaul: restyled to the design system, palette/project import, presets, and a new Discover gradient gallery (38 curated gradients with search, tag/type filters, likes, Copy CSS, and one-click "Open in Cockpit" hand-off)
- UI State Colours page redesigned; palette-picker replacement; fixed Palette Builder blank first load and cross-tool palette state loss

### Icon & Emoji Libraries
- Live Iconify-backed Icon Library and fuller Emoji Library, merged into one pill-toggle surface
- Icon customizer + Custom Icons library ("My Icons"), save-to-project picker, similar-icons row, theme-follow preview, sticky stroke width
- Cross-pack collection filtering, filter/search/pack composition fixes, pack sort, clear-recent
- Pro-gated line-style controls (cap + join) with a lighter upgrade popup (shows yearly plan at its monthly rate); copy tracking with a daily free copy cap
- Performance: keep-alive tabs, collection cache, faster emoji load

### Imagery & Media Tools
- File Converter wired live + redesigned: ICO favicon output, JPEG background fill, GIF trim, frame ranges
- Aspect & Resolution Calculator rebuilt: canonical ratio names, device/screen presets, merged size finder

### Discover
- Discover surface supersedes External Resources: community fold with curated galleries
- Palette gallery + palette history, and the new gradient gallery

### Pricing, Pro & Accounts
- All price surfaces wired to live Stripe prices via a shared hook — no hardcoded prices
- Free-tier caps enforced (3 projects / 8 custom icons); founder accounts get Pro without Stripe
- Device-level multi-account switching; custom profile photos; gradient default avatars; Settings Accessibility section
- Checkout fixes: embedded Checkout migrated to `embedded_page`, silent 500 branches now logged, base64 service-account key support

### Platform & AI
- Primary AI provider migrated DeepSeek → OpenRouter with Gemini fallback
- AI routes consolidated into a single `/api/ai` dispatcher; new `/api/share` OG endpoint
- Admin dashboard rebuilt: users tab, Stripe auto-fill, overview categories

### Consistency & Quality
- All full-screen modals unified onto the canonical `.ui-modal` system and `--scrim` backdrop; toast restyled to the design system
- Fixed the Colour→Color label flash on first paint; filled missing icon/emoji locale headers
- Responsive passes across tools and galleries (down to 380px, no horizontal overflow)

---

## v2.5.0 — Projects, Pro Features, Admin Tools & Security Hardening

### Projects
- Auto-created "Default Project" on first sign-in
- "Save current" renamed to "Add to Project" across the app
- Archive/restore projects; deletion now requires typing the project name to confirm
- Colour Studio: sticky "Add to Project" bar with colour pick tracking

### Pro & Monetisation
- Stripe Embedded Checkout with monthly/yearly plans (7-day trial on yearly)
- Cancellation retention flow: reason survey + tailored offers (discount, pause, free month)
- Rotating price comparison on the Pro tier ("less than 2 coffees" and friends)
- Premium Plus coming-soon tier preview
- Export watermark for free users; Pro unlocks all export formats
- Prompt Library: community prompts Pro-gated beyond the first 5; +25 AI generations for approved contributor submissions

### UI Builder
- New Component Designer: buttons, cards, inputs, badges, toggles, tables, tabs with shared design tokens and CSS export
- Guided mode: step-by-step progress bar walking through each component type

### Admin
- Design Analytics tab: most copied fonts, most picked colours (with swatch visualisations), tool usage
- Community prompt review with inline editing (title, text, tags) before approval
- Server-side admin verification via `/api/verify-admin` (Firebase Admin SDK)
- Admin-only `/style-guide` page documenting the internal design system

### Internationalisation
- New English (US) locale; English (AU) gains Aussie slang
- Browser language auto-detection for first-time visitors

### Security
- Removed spoofable localStorage admin unlock (session-only now)
- Input validation on the support endpoint (email format, length limits, type whitelist)
- HTML escaping in feedback email notifications
- Origin whitelist for Stripe checkout/portal return URLs
- Firestore rules for the community-prompts collection

### Consistency & Quality
- All modals standardised on the Font Gallery popup pattern
- `ADMIN_EMAILS` extracted to a shared constant; case-insensitive email checks
- External Resources: user-added custom resources with name, URL, and colour

---

## v2.4.0 — Bug Fixes & Visual Polish

### Bug Fixes
- Fixed I18nProvider blank screen on initial load — children now render immediately with a fallback `t()` function while locale data loads
- Fixed `useToast` timer firing on unmounted components — added cleanup in `useEffect`
- Fixed `useClipboard` silently failing on permission denied — added `.catch()` handler
- Replaced `prompt()` dialog in Settings email change with inline two-step password confirmation
- Replaced hardcoded colour values (`#ef4444`, `#22c55e`, `#f59e0b`) in CSS and Settings with theme-aware custom properties (`var(--err)`, `var(--ok)`, `var(--warn)`)
- Deleted unreachable `DesignSystemExport.jsx` (functionality already merged into Colour Studio)
- Added missing `videoFrames` and `promptLibrary` locale keys to all 8 non-English locale files

### Visual Polish
- **Colour Studio**: sticky anchor nav linking to all 6 sections, each section collapsible via chevron toggle, IntersectionObserver highlights active section
- **Sidebar**: redesigned active state from solid inverted background to subtle accent tint
- **Dashboard**: gradient text on hero greeting, staggered card entry animations (40ms per card)
- Added global `:focus-visible` outline styles for keyboard accessibility

### Community & Feedback
- Community page: replaced "coming soon" placeholder with GitHub repository, Discussions, and Issue report links
- Feedback page: added mailto export and "Open GitHub Issue" button
- Added community and feedback locale keys to all 9 languages

---

## v2.3.0 — Export Dropdown & Default Pins

### Design System Export
- Moved export from standalone page into TopBar dropdown — contextually visible only on Colour Studio
- Export options: HTML (styled reference page), CSS (custom properties file), Copy CSS Variables
- Export now includes UI state colours (success, error, warning, info — all 10 shades each)

### Dashboard
- Updated default pinned tools: Colour Studio, Image Converter, Icon Library, External Resources

---

## v2.2.0 — Dashboard Drag & Drop, Sidebar Fix, Export Context

### Dashboard
- Drag-and-drop reorder for pinned tools with visual feedback
- "+ Add Tools" browser to pin/unpin from all available tools
- Empty state with pin hint

### Sidebar
- Single-tool categories (e.g. Colour Studio) no longer show numbered hierarchy (1/1.1)

### Architecture
- Added `ExportContext` to share export actions between Colour Studio and TopBar
- Added `reorderPinned` to `WorkspaceContext`

---

## v2.1.0 — Video to Frames, i18n, Accounts

### New Tool: Video to Frames
- Drag-and-drop video upload with preview
- Frame extraction with format (PNG/JPEG/WebP), quality, scale, and interval controls
- Canvas-based extraction with progress bar
- Frame grid with individual and batch ZIP download (via JSZip)

### Internationalisation
- 9 languages: English (AU), Deutsch, Español, Français, Italiano, Português, 日本語, 中文, 한국어
- Dynamic locale loading with `import()` and caching
- `localiseTools()` and `localiseCategories()` for data-driven sidebar/dashboard translation

### Account System
- Local auth with localStorage (`vs-users`, `vs-session`)
- Profile management: display name, location, company, website, bio
- Password change with current password verification
- Account deletion with password confirmation
- Data export (prompts, settings) as JSON

---

## v2.0.0 — React + Vite Rewrite

Full rewrite from vanilla HTML/CSS/JS to React SPA with Vite.

### Architecture
- React 19 with React Router (HashRouter for GitHub Pages)
- CSS custom properties theming (warm light / dark mode)
- Context-based state: Auth, Theme, I18n, Palette, Workspace, Export
- Command palette (`Cmd/Ctrl + K`) for quick tool access

### Tools
- **Colour Studio** — unified page combining palette builder (6 harmony modes), tint scale generator, WCAG contrast checker, gradient builder (16 presets), and interactive UI preview
- **Type Scale** — modular scale with 6 ratio presets
- **Font Pair Finder** — Google Fonts pairings
- **Icon Library** — Iconify API search
- **Image Converter** — local convert/compress/resize
- **Prompt Library** — AI image prompt storage with previews
- **Design Principles** — visual hierarchy, cognitive load, brand psychology
- **Social & Marketing** — content strategy reference
- **Design Reference** — spacing, shadows, radii, design tokens
- **External Resources** — curated links to design tools and inspiration

### Dashboard
- Personalised time-based greeting
- Pinnable tool cards with category exploration
- Animated card entries

---
