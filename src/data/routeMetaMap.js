// Per-route <title> and <meta name="description">.
//
// These lived inside App.jsx's route-meta effect, which meant only a running
// browser could ever read them — so the build had no way to put them into the
// served HTML, and every URL shipped the homepage's title, description and
// canonical to any crawler or social unfurler that does not execute JS.
// They are plain data here so scripts/prerender.mjs and the runtime import the
// SAME table and cannot drift.
//
// The Learn articles bring their own titles and descriptions. They are spread
// in rather than typed out again because this table is what decides whether a
// route is prerendered at all (scripts/route-matrix.mjs excludes anything with
// no entry here), and an article that exists but is missing from this file
// would render fine in the browser and be invisible to every crawler.
import { LEARN_PAGE_DESCRIPTIONS, LEARN_PAGE_TITLES } from './learnIndex.js'

// Titles/descriptions for real destinations only. Legacy redirect-only paths
// (/dashboard, /resources, /docs-*) are intentionally absent — they render a
// <Navigate> and inherit their target's metadata, so an entry here would only
// describe a page that no longer exists (AUDIT-B2).
export const PAGE_TITLES = {
  '/': 'UI L4B | Design Toolkit',
  '/home': 'UI L4B | Design Toolkit',
  '/create/color': 'UI L4B | Colour System Generator',
  '/create/palette': 'UI L4B | Palette Generator',
  '/create/semantic-color': 'UI L4B | Semantic Colour Generator',
  '/create/tint': 'UI L4B | Tint Scale Generator',
  '/create/gradient': 'UI L4B | Gradient Generator',
  '/create/contrast': 'UI L4B | Colour Contrast Checker',
  '/create/typography': 'UI L4B | Typography',
  '/create/type-scale': 'UI L4B | Type Scale Generator',
  '/create/font-pair': 'UI L4B | Font Pair',
  '/create/font-gallery': 'UI L4B | Font Gallery',
  '/create/icons': 'UI L4B | Icon Library',
  '/create/imagery': 'UI L4B | Imagery',
  '/create/icons-emoji': 'UI L4B | Icons & Emoji',
  '/discover': 'UI L4B | Discover',
  '/discover/gradients': 'UI L4B | Gradient Library',
  '/discover/palettes': 'UI L4B | Palette Library',
  '/learn': 'UI L4B | Learn',
  '/create/alt-text': 'UI L4B | Alt Text Generator',
  '/create/ai-prompt': 'UI L4B | AI Image Prompt Generator',
  '/create/ai-tools': 'UI L4B | AI Tools',
  '/create/landing-prompts': 'UI L4B | AI Landing Page Prompts',
  '/discover/prompts': 'UI L4B | Prompt Library',
  '/discover/resources': 'UI L4B | Curated Resources',
  '/create/emoji': 'UI L4B | Emoji Library',
  '/create/aspect-ratio': 'UI L4B | Aspect & Resolution Calculator',
  '/create/box-shadow': 'UI L4B | Box Shadow',
  '/create/components': 'UI L4B | UI Component Builder',
  '/create/component-designer': 'UI L4B | Component Designer',
  '/projects': 'UI L4B | Projects',
  '/settings': 'UI L4B | Settings',
  '/login': 'UI L4B | Sign In',
  '/plans': 'UI L4B | Pricing & Plans',
  '/checkout': 'UI L4B | Checkout',
  '/community': 'UI L4B | Community',
  '/feedback': 'UI L4B | Feedback',
  '/help': 'UI L4B | Help & Getting Started',
  '/principles': 'UI L4B | Design Principles',
  '/info': 'UI L4B | Information Centre',
  '/seo': 'UI L4B | SEO Specialist',
  '/privacy': 'UI L4B | Privacy',
  '/terms': 'UI L4B | Terms',
  '/sitemap': 'UI L4B | Sitemap',
  '/admin': 'UI L4B | Admin',
  '/create/auto-builder': 'UI L4B | Brand Starter',
  '/create/file-converter': 'UI L4B | File Converter',
  ...LEARN_PAGE_TITLES,
}
// THE "CSS EXPORTS" CLAUSE WAS FALSE AND IS DELETED, not reworded.
//
// exportFormats.js has `css` at live:false — the CSS export renders a Soon
// badge over a disabled button — so every page on the site described an
// export nobody can run. This constant is the worst possible home for that:
// on 2026-09-14 the homepage was carrying four DIFFERENT descriptions and
// they were all unified onto this one, which made a single false claim
// consistent across meta, og, twitter AND the JSON-LD on every route.
//
// Deleted rather than rewritten because a replacement is a new claim and
// those are the founder's to write. What is left is only what ships. The
// tools DO have per-tool Copy CSS buttons, and index.html already words that
// honestly — "Copy colour values and CSS from the individual tools that
// support them" — so if he wants CSS mentioned here, that sentence is the
// shape, and it is his call.
export const DEFAULT_DESCRIPTION = 'Free browser-based design toolkit. Colour palettes, type scales, font pairing, icon library, image conversion and video frames.'
export const PAGE_DESCRIPTIONS = {
  '/': DEFAULT_DESCRIPTION,
  '/home': DEFAULT_DESCRIPTION,
  // THE SAME DELETED CLAUSE AS DEFAULT_DESCRIPTION, LEFT BEHIND ON THE ONE
  // ROUTE THAT RENDERS A CREATE HOME. This ended "Export CSS, Tailwind, PNG and
  // SVG." Against src/config/exportFormats.js on 2026-09-15: `css` carries no
  // live flag, `tailwind` carries no live flag, and the only SVG anywhere in
  // the panel is inside `assets` ("SVG + PNG"), which carries no live flag
  // either — three of the four named formats render a Soon badge over a
  // disabled button. The fourth, PNG, is the style-guide sheet, which is real.
  // ColorStudio.jsx's own "Tailwind" is a semantic-colour PRESET (`name:
  // 'Tailwind'`), not an export. Deleted rather than reworded, as the two
  // comments below already did for the sibling routes.
  '/create/color': 'Build professional colour systems with palette generation, tint scales, gradient builder, and named colour libraries.',
  // The same deleted clause as DEFAULT_DESCRIPTION above: the CSS export is
  // not live, so the promise of one came out. The rest is what the page does.
  '/create/palette': 'Generate a professional colour palette from one seed colour. Harmony systems, tonal ramps and accessibility checks.',
  '/create/semantic-color': 'Generate semantic UI colours — success, warning, error, and info — that stay legible and consistent with your palette in light and dark mode.',
  '/create/tint': 'Turn any colour into a production-ready 50–950 tint scale. Tune the curve, hue drift, and end stops, then copy swatches or CSS variables.',
  '/create/gradient': 'Design CSS gradients across your palette. Linear, radial, and conic, with editable stops and angle — copy production-ready CSS in one click.',
  '/create/contrast': 'Free WCAG colour contrast checker. Test text and background pairs against AA and AAA, preview the pair live, and get one-click fixes that pass.',
  '/create/typography': 'Typography tools for designers and developers. Pair fonts, build type scales, and browse the Google Fonts catalogue.',
  '/create/type-scale': 'Free modular type scale generator. Set a base size and a ratio, preview the whole scale in a real layout, and copy CSS custom properties, Tailwind or SCSS.',
  '/create/font-pair': 'Free font pairing tool. Pick a heading face and see which body faces work under it, with the reasoning, previewed as a real page. Copy the import and CSS.',
  '/create/font-gallery': 'Browse the Google Fonts catalogue with full specimens, category filters and side-by-side comparison, then carry a family into a pairing or a type scale.',
  '/create/icons': 'Search 200,000+ icons from popular packs. Preview, customize colours, and copy SVG or JSX code instantly.',
  '/create/imagery': 'Image tools for the web — convert and compress images, extract video frames, and calculate aspect ratios.',
  '/create/icons-emoji': 'Search 200,000+ icons and browse every emoji by category. Copy SVG or emoji to your clipboard instantly.',
  // AWAITING THE FOUNDER'S WORD (proposed 2026-09-13, shipped so the false one
  // is not live while he reads it). The sentence this replaces said "The best
  // external design resources - gradients, palettes, fonts and inspiration -
  // with a one-tap hand-off into the UI L4B tools that use them", and three
  // parts of it were false. Seven of the EIGHT groups DISCOVER_SPEC renders are
  // UI L4B's own libraries, not external resources - only Curated Resources is
  // external. `inspiration` carries soon:true and the page badges it Soon, as
  // does `collections`, so neither is a resource anyone can reach. And this is
  // the sentence Google prints under the result and every share card shows.
  // The replacement names the eight and claims nothing: no "best", no adjective
  // of quality, no urgency. 142 chars, inside what Google renders.
  '/discover': 'The UI L4B palette, gradient, font, icon and prompt libraries, plus a page of external resources. Inspiration and Collections are marked Soon.',
  // THE SAME TWO FALSEHOODS AS THE LINE ABOVE, ON ITS OWN CHILD, LEFT BEHIND BY
  // THE FIX THAT CAUGHT THE PARENT. It read "A curated library of the best
  // gradient resources on the web" — but this route renders GALLERY_GRADIENTS,
  // which is a hundred of UI L4B's OWN gradients (the page's live region says
  // "100 gradients"), not links to resources elsewhere; that is /discover/
  // resources, a different page. And "the best" is the quality superlative the
  // /discover rewrite above removed by name, two lines away, on the same day.
  //
  // The replacement is its SIBLING'S sentence with the nouns changed — the
  // palettes line below, which is already the accepted shape — so no new voice
  // was written. Every claim in it is checked: filtering and copying the CSS
  // are what gradientGallery.js documents the page as doing, and the hand-off
  // is gradientToolUrl(). Awaiting the founder's word on the same terms as the
  // line above: shipped so the false one is not live while he reads it.
  '/discover/gradients': 'Browse curated gradients, copy the CSS, or open a complete gradient directly in the UI L4B Gradient Generator.',
  '/discover/palettes': 'Browse curated colour palettes, copy any swatch, or open a complete palette directly in the UI L4B Palette Builder.',
  '/learn': 'Reference guides on colour, typography and accessibility for people who build interfaces — the thresholds, the formulas and the standards they come from.',
  '/create/alt-text': 'Generate accessible alt text for images using AI. Improve SEO and screen-reader support in seconds.',
  '/create/ai-prompt': 'Generate detailed AI image prompts with style, lighting, and composition controls. Copy-ready for Midjourney, DALL-E, and Stable Diffusion.',
  '/create/ai-tools': 'AI-powered design tools — image prompt generation, alt text, and landing page copy. Powered by OpenRouter and Gemini.',
  '/create/landing-prompts': 'Generate AI-powered landing page copy, headlines, and CTAs. Tailored to your product and audience.',
  '/discover/prompts': 'A curated library of high-quality, ready-to-use prompts for UI, web design and marketing. A free selection for everyone; the full library with Pro.',
  '/discover/resources': 'Hand-picked design and dev tools — gradients, palettes, fonts, components and free assets — each with a route into the UI L4B tool that finishes the job.',
  '/create/emoji': 'Browse, search, and copy emojis by category. Preview skin tones and find the perfect emoji for any context.',
  '/create/aspect-ratio': 'Free aspect ratio and resolution calculator. Pick a device, screen, social format or ratio — get exact dimensions, PPI, and diagonal with a live shape preview.',
  '/create/box-shadow': 'Design layered box shadows with real-time preview. Fine-tune blur, spread, offset, and colour for each layer.',
  '/create/components': 'Design UI components with live preview and production-ready CSS out — buttons, cards, inputs and the shadows under them.',
  '/create/component-designer': 'Build complete UI design systems with guided steps. Pick colours, fonts, type scales, and export production-ready CSS.',
  '/create/auto-builder': 'Describe what you are making and get a palette, a font pairing and a type scale to start from — each opens in the tool that owns it.',
  '/projects': 'Manage and organise your saved design projects. Access colour palettes, font selections, and exported assets.',
  '/settings': 'Customise your UI L4B experience. Manage theme, appearance, subscription, and account preferences.',
  '/login': 'Sign in to UI L4B to save projects, sync settings, and unlock AI-powered design tools.',
  // 192 chars was ~35 over what Google renders, so the sentence that names what
  // Pro actually buys was the part being cut. Front-loaded and trimmed to 154.
  '/plans': 'Honest pricing for UI L4B. The toolkit is free forever — palettes, type scales and exports. Pro adds AI capacity and watermark-free export.',
  '/checkout': 'Upgrade to UI L4B Pro for higher AI capacity, advanced colour controls, unlimited saved projects and watermark-free export.',
  // A CLAUSE DELETED, NOT A SENTENCE REWRITTEN. This ended "and connect with
  // other designers and developers", and there is no connecting to do: no
  // follow, no message, no profile, no comment anywhere on the page or in
  // Community.jsx. The three matches for those words in that file are
  // "follow you across devices", "follow the account" and "the message says
  // so" — none of them a person reaching another person.
  //
  // The two claims that survive were checked rather than assumed. "Share
  // designs" is real: the Submit a design dialog publishes to the shared review
  // queue in utils/communityQueue.js. "Discover inspiration" is the twelve
  // seeded entries the page renders and openly labels as seeded.
  '/community': 'Join the UI L4B community. Share designs and discover inspiration.',
  '/feedback': 'Share your feedback, report bugs, or request features for UI L4B. We read every submission.',
  '/help': 'Start with any UI L4B tool without an account or setup. What each tool opens with, what the free plan covers, and where your work is stored.',
  '/principles': 'The rules UI L4B holds to when building an interface system, each one shown beside the tool that enforces it and the measurement that proves it.',
  '/info': 'The UI L4B Information Centre — a single, searchable guide to every tool, keyboard shortcuts, privacy, and a live screen-size inspector.',
  '/seo': 'Free SEO Meta & SERP Inspector. Preview your Google search snippet and social card live, and get an instant, actionable SEO score as you type.',
  '/privacy': 'UI L4B privacy policy. Learn how we handle your data, cookies, and third-party services.',
  '/terms': 'UI L4B terms of service. Usage rules, intellectual property, and account policies.',
  '/sitemap': 'The complete UI L4B sitemap — every page across Create, Discover and Learn, plus your workspace, help and legal, laid out end to end.',
  '/admin': DEFAULT_DESCRIPTION,
  '/create/file-converter': 'Convert files between formats directly in your browser. Fast, private, client-side processing.',
  ...LEARN_PAGE_DESCRIPTIONS,
}
