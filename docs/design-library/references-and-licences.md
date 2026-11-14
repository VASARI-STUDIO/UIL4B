# Design library: references and licences

Board card Q016. Six reference sites: what to learn from each, and what their terms let us do. Read by fetch on 13 November 2026. Anything the fetch could not see is marked "check by hand".

## navbar.gallery

**Offers.** A free, curated gallery of navbar screenshots taken from live sites. Funded by a sponsor and a newsletter. No code. ([home](https://www.navbar.gallery/), [browse](https://www.navbar.gallery/browse))

**Patterns.** Sorted by navbar type: Static, Dropdown, Mega Menu, Side Bar, Search Bar, Announcement, Full Screen, Breadcrumbs. Extra pages by style (dark) and by builder (Framer, Webflow). Each entry is a screenshot, the site name, a link to the live site and a detail page. "Load more" paging; no search or sort. ([mega menu page](https://www.navbar.gallery/type/mega-menu))

**Licence.** No terms, licence or privacy page is linked, and `/terms` returns 404. The screenshots show other companies' sites, so the gallery could not grant rights to those designs anyway. Terms not readable by fetch; check by hand.

**Verdict.** Study only. The type names are plain words and fine to use as a taxonomy. No screenshot copied, no pictured navbar recreated.

## getcssscan.com

**Offers.** A paid browser extension that copies CSS from any page ($120 list, $59 on sale, lifetime). Free galleries feed it: box-shadow (95 examples), buttons, checkboxes, radios, shapes. ([home](https://getcssscan.com/))

**Patterns.** One free gallery per CSS property, used as the door to the paid tool. The box-shadow page says its shadows were copied from other sites with the extension, and names no sources. The fetch did not render the tiles, so how a shadow is shown and copied: check by hand. ([box-shadow page](https://getcssscan.com/css-box-shadow-examples))

**Licence.** No terms or licence linked from either page; `/terms` returns 404. Terms not readable by fetch; check by hand. The values come from unnamed third parties, so their rights are unclear.

**Verdict.** Study only. Learn the "free gallery leads to the paid tool" shape. Copy no shadow value.

## cubic-bezier.com

**Offers.** A free easing-curve editor. ([home](https://cubic-bezier.com/))

**Patterns.** The live `cubic-bezier()` value with a Copy button. A duration field. "Preview & compare" plays two curves side by side. Curves save to a library, each with a shareable link. Import and export of curve code.

**Licence.** Source is MIT; the notice must be kept in copies. ([repository and LICENSE](https://github.com/LeaVerou/cubic-bezier))

**Verdict.** Study the preview-and-compare interaction. MIT would allow code reuse with the notice; our rule is no copied code, so we write our own. CSS spec keywords (`ease`, `ease-in-out`) belong to no one and are fine.

## shadcnblocks.com

**Offers.** A commercial React and Tailwind library on shadcn/ui: 2,866 blocks in about 90 categories, 2,241 components, templates, themes, Figma and admin kits. A small free set (some behind login). Paid lifetime tiers $89 to $239 on sale. ([home](https://www.shadcnblocks.com/))

**Patterns.** Category sidebar with counts (Feature 334, Hero 292, Pricing 96). Sort "Curated" and a price filter. Numbered names (Hero 231) with a screenshot and one line. Code view on the block page. Install by shadcn CLI, MCP server or IDE extension. A paid Page Builder reorders sections. ([hero listing](https://www.shadcnblocks.com/blocks/hero))

**Licence.** Strictest of the six. The paid licence bans competing products, naming UI libraries, design kits, templates and website builders, free or paid. Restyled, renamed or AI-transformed copies count as derivatives. ([licence](https://www.shadcnblocks.com/license)) The terms ban republishing free blocks as a library, kit or catalog, scraping, AI training, and cloning the site's design. ([terms](https://www.shadcnblocks.com/terms))

**Verdict.** Study the public listing pages only. Do not open, install, buy or AI-transform any block for this work. Keep no screenshots.

## hyperui.dev

**Offers.** Free Tailwind components in three groups: Application, Marketing, Neobrutalism. Plus templates and tools. ([home](https://www.hyperui.dev/))

**Patterns.** Marketing has 22 categories and 171 components (Footers 24, Contact Forms 10, Buttons 10, CTAs 8, Pricing 2). ([marketing](https://www.hyperui.dev/components/marketing)) Each preview has width toggles (Mobile, SM, MD, LG, Full) and a direction toggle; dark versions are separate entries. Two copy modes: "Copy HTML" (markup only) and "Copy for AI" (markup plus setup context). That second mode is the closest model for our copy prompt. ([footers](https://www.hyperui.dev/components/marketing/footers))

**Licence.** MIT; the notice must stay in copies. ([LICENSE](https://github.com/markmead/hyperui/blob/main/LICENSE))

**Verdict.** MIT allows reuse with the notice. We choose not to. Study only.

## recent.design

**Offers.** A free curated feed of design work: launch videos, websites, OG images, app screenshots, app icons. Sponsors and a jobs board. ([home](https://recent.design/))

**Patterns.** Tabs: All, Web, Interface, Branding, Motion, Illustration, Posters, Print. Image thumbnails with the creator's avatar and name; multi-slide items. No copy or prompt features. Useful for taste, not for how a copy library works.

**Licence.** The [info page](https://recent.design/info) states no terms, rights or reuse policy, only a copyright year. `/terms` returns 404. The featured work belongs to its creators. Terms not readable by fetch; check by hand.

**Verdict.** Study only. Copy nothing.

## Rules for our library

1. No copied code, markup, CSS values, screenshots or assets from any site. This includes MIT sites: they allow it, we decline, so every piece is ours to license.
2. Designs are original. Start from our own tokens (palette roles, type scale, radius, spacing), not from a reference open beside the editor.
3. No reference screenshots in the repo, on the site or in design files. Notes in words only.
4. Never pass a reference's code or screenshot through an AI to make a piece.
5. Generic names and CSS spec values are fine: "mega menu", `ease-in-out`, "elevation 2".
6. Each piece records its provenance in its data entry: made by us, date, "original".
7. Credit: no per-piece credit, because nothing is derived. A third-party asset inside a piece (a font, an icon) gets the usual entry on the Credits page.
8. Before launch, check by hand the three sites with no readable terms: navbar.gallery, getcssscan.com, recent.design.
