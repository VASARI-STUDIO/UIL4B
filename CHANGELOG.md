# Changelog

All notable changes to the Vasari Obsidian Web Design Toolkit.

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
