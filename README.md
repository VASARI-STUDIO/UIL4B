# UIl4b — Design Toolkit

A comprehensive design toolkit built with React and Vite. Create colour palettes, generate tint scales, check contrast, build gradients, pair fonts, convert images, extract video frames, and export production-ready CSS — all in the browser.

**Live:** [uil4b.com](https://www.uil4b.com)

## Tools

### Colour

- **Colour Studio** — Palette builder with 6 harmony modes, 10-step tint scale generator, UI state colour presets (success/warning/error/info), WCAG contrast checker, gradient builder with 16 presets, interactive light/dark UI preview, and design system export (HTML, CSS, clipboard)

### Typography

- **Type Scale** — Modular scale calculator with 6 ratio presets and CSS export
- **Font Pair Finder** — Curated heading + body font pairings from Google Fonts

### Imagery

- **Icon Library** — Search thousands of icons via the Iconify API with copy-to-clipboard
- **Image Converter** — Convert, compress, and resize images locally (WebP, PNG, JPEG, AVIF)
- **Video to Frames** — Extract individual frames from video files with format, quality, and scale controls; batch download as ZIP

### Documentation & Reference

- **Design Principles** — Visual hierarchy, cognitive load, micro interactions, and brand psychology
- **Social & Marketing** — Content pillars, posting cadence, caption templates, growth tactics
- **Design Reference** — Spacing, shadows, radii, font scales, and design token cheat sheets
- **External Resources** — Curated links to fonts, colours, AI tools, and design inspiration

### Other

- **Prompt Library** — Save and organise AI image generation prompts with output previews

## Features

- **Dashboard** — Personalised greeting, pinnable tool cards with drag-and-drop reorder, category exploration
- **Command Palette** — `Cmd/Ctrl + K` to search and jump to any tool
- **Dark / Light Theme** — System-aware with manual toggle, CSS custom property theming
- **Internationalisation** — 9 languages: English (AU), Deutsch, Español, Français, Italiano, Português, 日本語, 中文, 한국어
- **Design System Export** — Export your palette + tint scale + state colours as a styled HTML page, CSS custom properties file, or copy to clipboard (from the top bar when on Colour Studio)
- **Accounts** — Local auth with profile, password management, and data export
- **Keyboard Accessible** — Global `:focus-visible` styles on all interactive elements

## Tech Stack

- **React 19** + **React Router** (HashRouter for GitHub Pages)
- **Vite** — dev server and production build
- **CSS Custom Properties** — warm/dark theme system, no CSS-in-JS
- **Firebase** — auth provider (Google sign-in support)
- **JSZip** — batch frame/image ZIP downloads
- **Iconify API** — icon search (no bundled icon data)
- **localStorage** — preferences, pinned tools, session, prompt library, palette history

## Project Structure

```
src/
├── components/       Sidebar, TopBar, Toast, CommandPalette
├── contexts/         Auth, Theme, I18n, Palette, Workspace, Export
├── data/             Tool and category definitions
├── hooks/            useToast, useClipboard
├── locales/          9 JSON locale files (en, de, es, fr, it, ja, ko, pt, zh)
├── pages/            All page components (Dashboard, ColorStudio, etc.)
├── styles/           global.css (single stylesheet)
├── utils/            Colour math, Firebase config
├── App.jsx           Route definitions
└── main.jsx          Provider tree and entry point
```

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

## Deploy to GitHub Pages

1. Push to `main`
2. GitHub Actions builds and deploys automatically, or:
   - Settings → Pages → Deploy from branch → `main` / `root`
3. Live at [uil4b.com](https://www.uil4b.com)

## Licence

MIT — UIl4b 2026.
