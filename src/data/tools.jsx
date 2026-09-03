// The tool registry as the UI consumes it: the derived index from
// ./toolIndex.js with its icons attached.
//
// THE DATA IS NOT HERE. Which tools exist, what they are called, where they
// live and whether they are built all come from CREATE_GROUPS in ./toolTree.js
// — the same table that drives the router, the mega-menus and the prerender
// matrix — and the search words come from ./toolIndex.js. Read the long comment
// at the top of that file for why: two hand-written lists of the same reality
// drifted far enough that typing `palette` into the homepage search returned a
// sales page and `semantic` returned nothing.
//
// This file exists only because icons are JSX and JSX is what stops `node
// --test` importing a module. Keeping them here leaves the index in plain .js,
// so tests/unit/search-index.test.js runs REAL queries against the REAL index
// rather than asserting against a copy of it.
//
// Every previous import of this module keeps working — the public API is
// unchanged apart from two deletions noted at the foot of the file.
import {
  CATEGORY_ENTRIES,
  TOOL_ENTRIES,
  TOOL_I18N_MAP,
  localiseCategoriesWith,
  localiseWith,
} from './toolIndex'

// ── Icons ───────────────────────────────────────────────────────────────────
// Presentation only. Every one is a set of children for a 24×24 <svg> the
// consumer supplies, so stroke width and colour stay the caller decision.
const CATEGORY_ICONS = {
  color: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="8" cy="14" r="1.5" fill="currentColor" />
      <circle cx="16" cy="14" r="1.5" fill="currentColor" />
    </>
  ),
  typography: (
    <>
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </>
  ),
  imagery: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  'icons-emoji': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </>
  ),
  'ui-builder': (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </>
  ),
  ai: (
    <>
      <path d="M12 2v4" /><path d="M12 18v4" /><path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  documentation: (
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </>
  ),
  resources: (
    <>
      <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5" />
    </>
  ),
}

// Keyed by the tool id in toolTree.js (Create tools) or in toolIndex.js
// (everything else). A tool with no entry here falls back to its category
// glyph, which is what the ⌘K palette has always rendered anyway.
const TOOL_ICONS = {
  palette: (<><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 22a10 10 0 010-20 9 9 0 019 9c0 4-3 4-5 4h-2a2 2 0 00-2 2 2 2 0 01-2 2"/></>),
  semantic: (<><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 8h9"/><path d="M12 16H3"/></>),
  tint: (<><path d="M12 3s6 6.5 6 10.5a6 6 0 01-12 0C6 9.5 12 3 12 3z"/><path d="M12 17a3.5 3.5 0 01-3.5-3.5"/></>),
  gradient: (<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15l18-9"/><path d="M3 20l18-9" opacity=".5"/></>),
  contrast: (<><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 010 18z" fill="currentColor"/></>),
  icons: (<><polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9"/></>),
  emoji: (<><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>),
  'font-gallery': (<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>),
  'font-pair': (<><path d="M4 7V4h7v3"/><path d="M7.5 4v16"/><path d="M5.5 20h4"/><path d="M14 12h6"/><path d="M14 16h6"/><path d="M14 20h4"/></>),
  'type-scale': (<><path d="M3 7V5h10v2"/><path d="M8 5v14"/><path d="M6 19h4"/><path d="M14 13v-2h7v2"/><path d="M17.5 11v8"/><path d="M16 19h3"/></>),
  'component-designer': (<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></>),
  'box-shadow': (<><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 21h14a2 2 0 002-2V7" opacity=".5"/></>),
  'auto-builder': (<><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></>),
  'file-converter': (<><path d="M4 14V6a2 2 0 0 1 2-2h8"/><path d="M20 10v8a2 2 0 0 1-2 2H6"/><polyline points="14 4 14 8 18 8"/><path d="M4 14l3-3 3 3"/><path d="M20 10l-3 3-3-3"/></>),
  ratio: (<><path d="M4 8V5a1 1 0 011-1h3"/><path d="M16 4h3a1 1 0 011 1v3"/><path d="M20 16v3a1 1 0 01-1 1h-3"/><path d="M8 20H5a1 1 0 01-1-1v-3"/></>),
  'alt-text': (<><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 14l2-5 2 5"/><path d="M7.5 12.5h3"/><path d="M14 14V9h2.5a1.5 1.5 0 010 3H14"/></>),
  'ai-prompt': (<><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><circle cx="12" cy="12" r="4"/></>),
  'landing-prompts': (<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></>),
  prompts: (<><path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2v-4"/><path d="M14.5 3.5l4 4L12 14l-4 1 1-4z"/></>),
  'docs-design': (<><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18"/><circle cx="12" cy="12" r="2.5"/></>),
  'docs-social': (<><path d="M3 11l18-7-7 18-2.5-8.5z"/><path d="M11.5 12.5L21 4"/></>),
  'docs-themes': (<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>),
  'docs-brand': (<><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>),
  'docs-seo': (<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>),
  seo: (<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></>),
  'docs-marketing': (<><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>),
  'docs-ai': (<><path d="M12 2a4 4 0 014 4v1h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2V6a4 4 0 014-4z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/></>),
  resources: (<><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5"/></>),
}

export const CATEGORIES = CATEGORY_ENTRIES.map(cat => ({ ...cat, icon: CATEGORY_ICONS[cat.id] }))

export const TOOLS = TOOL_ENTRIES.map(tool => ({
  ...tool,
  icon: TOOL_ICONS[tool.id] || CATEGORY_ICONS[tool.category],
}))

export function toolsByCategory(categoryId) {
  return TOOLS.filter(t => t.category === categoryId)
}

export function getCategory(categoryId) {
  return CATEGORIES.find(c => c.id === categoryId)
}

export function localiseTools(t) {
  return localiseWith(TOOLS, t, TOOL_I18N_MAP)
}

export function localiseCategories(t) {
  return localiseCategoriesWith(CATEGORIES, t)
}

// NOT re-exported from here: `queryCommandIndex`, `searchHints`, `matchesQuery`
// and `groupBySubcategory`. They are pure, icon-free and live in ./toolIndex.js,
// and a consumer that needs one imports it from there. Two reasons, one of them
// mechanical: re-exporting an imported binding out of a .jsx module makes
// eslint-plugin-react-refresh flag EVERY export in the file (it cannot tell
// whether the name it is forwarding is a component), which put ten new warnings
// on a build gate that holds the count fixed.
//
// `searchTools` and `searchToolsLocalised` are GONE entirely. They were two more
// hand-rolled filters over the same array — exactly what the comment above
// queryCommandIndex warns about — and nothing imported either of them.
