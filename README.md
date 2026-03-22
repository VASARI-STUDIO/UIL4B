# VISARI STUDIO — Web Design Toolkit

Internal design toolkit for Visari Studio. Colour, typography, icons, image tools, and prompt library — all in the browser, no external dependencies.

## Features

- **Palette Builder** — colour harmony generator with 5 modes
- **Tint Generator** — 0–1000 scale with saturation control
- **Gradients** — custom builder + 11 curated presets
- **Contrast Checker** — WCAG 2.1 AA/AAA compliance
- **Type Scale** — modular scale calculator with 6 ratio presets
- **Font Matcher** — pick a heading font, get body suggestions
- **Button Catalogue** — 8 reusable button styles with CSS
- **Section Layouts** — 6 common responsive patterns
- **Icon Library** — 250+ icons from Tabler, Lucide, Iconoir, Heroicons, Simple Icons
- **Image Converter** — convert/compress/resize locally (WebP, PNG, JPEG, AVIF)
- **Prompt Library** — save AI image prompts with output previews (localStorage)

## Hosting on GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to **Deploy from a branch** → `main` → `/ (root)`
4. Your toolkit will be live at `https://yourusername.github.io/repo-name`

## Files

```
index.html      — main page
style.css       — all styles
app.js          — application logic
icons-data.js   — embedded icon SVG data
README.md       — this file
```

## Tech

Single-page app. No build step, no frameworks, no npm. Just HTML + CSS + JS.
Dark/light theme. Fully responsive. Works offline once loaded.

## Licence

Internal use — Visari Studio.
