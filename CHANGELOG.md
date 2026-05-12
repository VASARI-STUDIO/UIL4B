# Changelog

All notable changes to the Vasari Obsidian Web Design Toolkit.

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
