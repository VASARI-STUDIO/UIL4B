// THE THREE FACTS THE /discover CARD NEEDS, WITHOUT THE 27.7 KB BEHIND THEM.
//
// SurfaceLanding renders one small card for the Prompt Library: a count, and
// three titles as a visual hint of what is inside. To get them it imported
// `COMMUNITY_PROMPTS` — and SurfaceLanding is one of the five pages App.jsx
// loads EAGERLY ("small or always-visited pages"), so the whole module landed
// in the main entry chunk.
//
// Measured on a production build 2026-09-15: all 20 prompts, 27,756 bytes of
// source, inside index-*.js — the chunk every visitor downloads on every route,
// including /privacy and /terms — to print the number 20 and three strings.
//
// THIS IS A WEIGHT FIX AND NOT A SECURITY ONE, and the difference matters
// enough to say twice. The eight locked prompt texts travel with that module,
// and moving them to a lazy chunk does NOT make them secret: a static asset is
// served to anybody who asks for it, which is the whole argument of
// tests/unit/admin-chunk-carries-no-backlog.test.js. The secrecy half is
// [locked-library-values-still-in-bundle] in pipeline.js and is a founder call
// about a serverless route, untouched by this file. What this changes is that
// the bytes stop being downloaded by every visitor on every route.
//
// WHY THESE VALUES ARE COPIED RATHER THAN COMPUTED. Computing them means
// importing the array, which is the thing being avoided — a `.length` is enough
// to pull all 27.7 KB into whatever chunk asks for it. The repo already has this
// exact shape in toolTree.js, whose comment notes that importing the palette and
// gradient arrays to print their lengths "would pull 137 records into every
// bundle that loads the nav, which is every page."
//
// So they are a copy, and a copy is only safe with a drift test:
// tests/unit/prompt-preview-mirrors-data.test.js fails the build if the count
// moves, if a title moves, or if one of the three stops being free. That is the
// same mirror-plus-drift-test the repo uses for plans.js ↔ api/_lib/plans.js and
// DESIGN.md ↔ global.css.

/** How many prompts the library holds. Mirrors COMMUNITY_PROMPTS.length. */
export const PROMPT_COUNT = 20

/**
 * The first three prompt titles, in the library's own order.
 *
 * ALL THREE MUST BE FREE PROMPTS, and the drift test asserts it. They are
 * rendered on a public page with no gate in front of them, so promoting a
 * locked title into this list would publish the one thing a locked prompt
 * actually sells — for a prompt, the title IS the product, which is why
 * PromptCard's locked branch was deleted rather than left dormant.
 */
export const PROMPT_PREVIEW_TITLES = [
  'Plumbing business website',
  'Restaurant website with menu',
  'Dark mode analytics dashboard',
]
