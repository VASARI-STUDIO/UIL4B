# Changelog

All notable changes to the VISARI STUDIO Web Design Toolkit.

---

## v1.3.0 — Premium UI Overhaul

**Focus:** Spacious, high-end feel across every surface.

### Sidebar
- Widened from 210px to 260px
- Brand area padding increased (28px top, 32px bottom) for breathing room
- Nav group labels get 28px top spacing creating clear visual separation between sections
- Nav links are taller (11px/14px padding) with 10px radius and 13.5px font
- Icons bumped to 18px with softer 0.4 opacity
- Theme toggle switch enlarged to 42×24px

### Main Content
- Page padding increased to 56px/64px (was 40px/48px)
- Section headers get 48px bottom margin (was 32px)
- Page titles are 42px, descriptions 15px with 1.7 line height
- Subsections have 52px bottom margin for clear section breaks

### Components
- Cards: 24px internal padding, 14px border radius
- Section labels: dot increased to 7px, text to 10px, 14px bottom margin
- Segmented bar cells: 20px/24px padding
- Input fields: 13px font, 10px/16px padding, 10px radius
- Range slider thumbs: 18px with 3px accent border
- Buttons: 10px/22px padding, 10px radius
- Code blocks: 18px/20px padding, 12px radius
- Tags: 5px/14px padding, 8px radius

### Swatches & Data
- Palette swatches: 220px minimum height, 20px padding
- Tint swatches: 16px border radius, 12px bottom padding
- Spectrum table: 12px/14px cell padding, 32px swatch previews
- Compliance rows: 16px/20px padding, 12px radius, 8px gaps
- Suggest bar: 20px/24px padding, 40px swatches
- Gradient preview: 160px tall, 16px radius

### Documentation
- Toggle cards: 22px/24px padding, 28px icon containers
- Sub-sections: 16px toggle padding, 14px body text, 1.75 line height
- Article content: 14px font, 22px list indent, 8px between list items

---

## v1.2.0 — Documentation System

**Focus:** Built-in knowledge base with expandable reference docs.

### New Feature: Documentation Page
- Added "Knowledge" nav group with Documentation link
- Two-level collapsible accordion — top-level doc groups expand to show sub-sections
- `+` icon rotates to `×` on open, highlights in accent purple
- Smooth transitions on expand/collapse

### Web Design Principles (5 sub-sections)
- The Halo Effect — first impressions psychology, hero section advice
- Cognitive Load & Cognitive Fluency — why simplicity reads as premium
- Micro Interactions & The Peak-End Rule — hover states, scroll animations, spring physics
- How Top Brands Apply This — Apple, luxury brands, Stripe, Figma
- 3-Step Framework — engineer first impression, reduce cognitive load, add micro interactions

### Social Media Marketing — Instagram (8 sub-sections)
- Content Pillars & Strategy — 7 pillars with KPIs
- Posting Cadence — weekly rhythm, 2–3 feed posts + daily Stories
- Caption Templates — 5 ready-to-use captions
- Carousel & Reel Scripts — 5 storyboard outlines
- Growth Tactics & Budget Scenarios — $0, $200, $1000/month
- Metrics & A/B Testing — 5 key metrics, 5 test ideas
- DM Outreach Templates — 3 personalised messages
- Lead-Capture Workflow — step-by-step funnel

---

## v1.1.0 — Contrast Checker Fix BG

**Focus:** Allow fixing background colour as well as foreground.

### Contrast Checker
- Each failing WCAG compliance row now shows two buttons: **Fix FG** and **Fix BG**
- Fix FG adjusts foreground lightness to meet the target ratio (existing behaviour)
- Fix BG adjusts background lightness while keeping the foreground colour intact
- Uses the same binary search algorithm (30 iterations) preserving hue and saturation
- If foreground is light, Fix BG pushes background darker; if foreground is dark, pushes lighter
- Suggested Adjustments bar at bottom shows 3 clickable alternative swatches meeting different WCAG levels

---
