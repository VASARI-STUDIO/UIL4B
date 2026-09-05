// Shared, framework-free helpers for the Discover surface. Extracted to kill the
// byte-for-byte duplication that the code-review gate flagged (monogram in 4
// files, tool hand-off logic in 3). Pure functions only — no React, no DOM — so
// every consumer keeps its own navigate()/onClose() around the result.

// Explicit .js extensions: these three data modules import nothing themselves,
// so with the extension written out this module loads under bare `node --test`
// as well as through Vite — which is what lets tests/unit/discover-handoff.test.js
// exercise the real GATED_ROUTES derivation instead of reading this file as text.
import { CATEGORY_MAP } from '../../data/discoverCategories.js'
import { createTools, liveToolRoutes } from '../../data/toolTree.js'

// Routes a relatedTools entry may name that are NOT yet a real screen —
// CreateTool.jsx resolves `group.soon ? null : LIVE_TOOLS[path]`, so a `soon`
// tool renders <ComingSoon/> for everyone. A hand-off pointing at one is a CTA
// that dead-ends, so it is treated as unavailable.
//
// THIS WAS A HAND-KEPT LITERAL SET AND IT HAD DRIFTED IN BOTH DIRECTIONS, which
// is the whole reason it is now derived. Its own comment promised "removing a
// route from this set (when the tool ships) re-lights every CTA for it
// automatically", and nobody ever did:
//   • /create/file-converter SHIPPED (soon:false, mounted in LIVE_TOOLS) and was
//     still listed, so three curated resources silently lost their hand-off.
//   • /create/box-shadow is soon:true and was NEVER listed, so two resources
//     offered a button that lands on Coming Soon — the exact fault the set exists
//     to prevent.
// Deriving it off toolTree's own `soon` flags means it cannot drift again: the
// day the founder flips a flag, every CTA for that tool re-lights by itself.
//
// Only routes the Create tree OWNS are considered. /create/color is not one of
// them (App.jsx intercepts it and renders ColorLanding), so it stays available,
// which is correct — it is a real page.
const CREATE_ROUTES = new Set(createTools().map(t => t.route))
const LIVE_ROUTES = new Set(liveToolRoutes())

export const GATED_ROUTES = new Set(
  [...CREATE_ROUTES].filter(route => !LIVE_ROUTES.has(route)),
)

// True when a related tool's destination is live for everyone (not admin-gated).
export function isToolAvailable(tool) {
  return !!tool && !GATED_ROUTES.has(tool.route)
}

// The first available (public) related tool for a resource, or undefined.
export function primaryAvailableTool(resource) {
  return (resource?.relatedTools || []).find(isToolAvailable)
}

// Deterministic monogram from a title (max 2 chars). Falls back to the resource's
// category initial, then a middot, so a punctuation-only title (e.g. "++") can
// never render a blank face.
export function monogram(title, category) {
  const words = String(title || '').replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean)
  let mono = ''
  if (words.length >= 2) mono = (words[0][0] + words[1][0]).toUpperCase()
  else if (words.length === 1) mono = words[0].slice(0, 2).toUpperCase()
  if (mono) return mono
  const catLabel = CATEGORY_MAP[category]?.label
  return (catLabel ? catLabel[0].toUpperCase() : '·')
}

// Build the in-product hand-off URL for a related tool. Only GradientGenerator
// reads `preset`/`tab` (see its hand-off effect); other tools just route. (We no
// longer append ?from=discover — no destination reads it, so it was inert dead
// weight.)
//
// This said ColorStudio until 2026-09-04. ColorStudio did carry a copy of the
// reader, but every `preset` hand-off in discoverResources.js points at
// /create/gradient, which mounts GradientGenerator — so ColorStudio's copy had
// never run, and it went with that page's dead sections.
export function buildToolHandoffUrl(tool) {
  const params = new URLSearchParams()
  if (tool.preset) params.set('preset', tool.preset)
  if (tool.tab) params.set('tab', tool.tab)
  const qs = params.toString()
  return qs ? `${tool.route}?${qs}` : tool.route
}
