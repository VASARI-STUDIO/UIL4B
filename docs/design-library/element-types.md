# Design library: element types

Board card Q017. What the Design library under Discover makes at launch and after. Based on the reference notes in `references-and-licences.md` and on what UI L4B already ships.

## What already exists

- **Button Library** (`/discover/buttons`, `src/data/buttonLibrary.js`): 10 designs with every state. CSS copies free; Pro gets size, corners and colour edits plus an AI prompt. The colour edit is a fixed set of four accents, not the user's palette.
- **Box Shadow** and **Component Designer**: in `src/data/toolTree.js`, both marked soon.
- **Gradient** and **Palette** libraries and builders: live.
- **Token export** (`src/utils/designTokens.js`): palette, tints, semantic colours, interface roles (background, surface, border, on-primary, focus and more), type. No shadow or motion tokens yet, though the formatter already handles a `cubicBezier` value.
- **No easing tool** anywhere.

So: buttons are not rebuilt, shadows feed the planned Box Shadow tool, and easing fills a real gap.

## Shared shape for every type

Copy the Button Library's build. One data module per type; the preview CSS, the copied CSS and the prompt come from one function so they cannot drift. Closed edit sets, with contrast tested in unit tests. Free: copy HTML and CSS. Pro: quick edits and the prompt (as buttons work today; whether the prompt stays Pro is an open decision).

One new shared edit: **colour from my palette**. It maps a piece's custom properties to the user's interface roles from the token export. User palettes are not a closed set, so this edit needs a live contrast check and a fallback when a pair fails.

The prompt follows HyperUI's "Copy for AI" idea (markup plus setup context), written our way: what the piece is, its states, its tokens, its accessibility rules, then "fit it to my stack".

## v1 cut: six types

| Type | v1 count | Copy prompt contains | Pro quick edits | Why it earns a visit |
|---|---|---|---|---|
| Buttons | 10 (existing, none new) | Existing prompt: states, size, corners, colour, motion, fit to stack | Add palette colour to size, corners, accent | Zero build. The library becomes its home; palette colour is the upgrade. |
| Shadows and elevation | 6 scales of 5 steps | Each step as a custom property, light and dark values, which step suits which surface | Shadow tint from palette, strength (3 steps), light or dark | getcssscan runs a 95-shadow free gallery to draw visitors. Scales become Box Shadow presets and export tokens. |
| Easing curves | 12 curves in 4 jobs: enter, exit, move, emphasis | `cubic-bezier()` value, duration, which properties to animate, reduced-motion rule | Duration (3 steps), intensity (3 steps) | cubic-bezier.com shows lasting demand; nothing on UI L4B covers motion. Adds motion tokens to the export. |
| Navbars | 8 across 6 types: static, dropdown, mega menu, sidebar, announcement bar, full-screen mobile | Structure, breakpoint behaviour, mobile menu, keyboard and focus rules, sticky behaviour | Palette colour, density (compact or regular), corners, sticky on or off | A whole gallery (navbar.gallery) exists for this one element, with 8 types. It gives screenshots, not code. |
| Cards | 10: content, product, profile, stat, media, link | Layout, image slot and ratio, text limits, hover and focus, which shadow step | Radius, density, palette colour, shadow step from our scales | Card categories are among HyperUI's largest (blog 13, cards 9, product 8). Reuses shadows. |
| Hero blocks | 6 | Layout, headline and subline length, CTA order, image slot, breakpoints | Palette colour, type from the user's type scale, alignment | Hero is shadcnblocks' second-largest category (292). Pulls together palette, type and buttons. |

## Later

| Type | First count | Copy prompt contains | Pro quick edits | Why it earns a visit |
|---|---|---|---|---|
| Pricing blocks | 4 | Tiers, billing toggle, feature list, highlighted tier | Palette colour, highlighted tier, density | 96 on shadcnblocks, only 2 on HyperUI: thin free supply. |
| Footers | 6 | Columns, legal row, newsletter slot, mobile stacking | Palette colour, density, columns | HyperUI's largest marketing category (24). |
| Forms and inputs | 8 inputs, 3 forms | Labels, help text, error, disabled and focus states, validation copy | Radius, density, palette colour | Contact forms are 10 on HyperUI. Harder, because every state must be right. |
| Badges | 8 | Uses, semantic meaning, text limits | Semantic colour from the Semantic Colour tool, shape | Small and quick. Reuses semantic colours already built. |
| Feature grids, CTAs, FAQs, testimonials, empty states | 4 to 6 each | As for hero blocks | As for hero blocks | Common section types in both block libraries. |

## Evidence and limits

- Category counts on HyperUI and shadcnblocks show what sellers stock, not proven demand (inferred). A competitor's catalogue size is a proxy.
- No user research or search data was used. What would settle the order: Button Library copy counts by design, site search terms on Discover, and how often Pro users open the edit panel.
- Counts per type are judgement, sized so each type has enough to compare without a second filter.
