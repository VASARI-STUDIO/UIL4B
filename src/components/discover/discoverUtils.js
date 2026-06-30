// Shared, framework-free helpers for the Discover surface. Extracted to kill the
// byte-for-byte duplication that the code-review gate flagged (monogram in 4
// files, tool hand-off logic in 3). Pure functions only — no React, no DOM — so
// every consumer keeps its own navigate()/onClose() around the result.

import { CATEGORY_MAP } from '../../data/discoverCategories'

// Routes that exist but are NOT yet public (admin-gated in App.jsx, rendered as
// <ComingSoon/> for normal users). A relatedTools entry pointing at one of these
// is treated as unavailable so we never offer a "Use in tool" CTA that dead-ends
// on a placeholder. Removing a route from this set (when the tool ships) re-lights
// every CTA for it automatically — no per-component change needed.
export const GATED_ROUTES = new Set(['/ui-builder', '/file-converter'])

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

// Build the in-product hand-off URL for a related tool. Only ColorStudio reads
// `preset`/`tab`; other tools just route. (We no longer append ?from=discover —
// no destination reads it, so it was inert dead weight.)
export function buildToolHandoffUrl(tool) {
  const params = new URLSearchParams()
  if (tool.preset) params.set('preset', tool.preset)
  if (tool.tab) params.set('tab', tool.tab)
  const qs = params.toString()
  return qs ? `${tool.route}?${qs}` : tool.route
}
