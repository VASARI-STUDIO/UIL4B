// A project's saved colours: single swatches kept on the project record, beside
// its design rather than inside it, so saving one never rewrites the design.
//
//   project.savedColors = [{ hex: '#0051FF', name?: 'Electric blue', at: ISO string }]
//
// The rules live here so they can be tested without React or Firestore. The
// project record syncs whole, so this list travels with it.

import { normaliseHex } from './paletteAdjust.js'

// The saved colours of a project, with anything that is not a colour dropped.
export function savedColoursOf(project) {
  const list = project?.savedColors
  if (!Array.isArray(list)) return []
  return list.filter((entry) => entry && normaliseHex(entry.hex))
}

export function hasSavedColour(project, hex) {
  const wanted = normaliseHex(hex)
  return !!wanted && savedColoursOf(project).some((entry) => normaliseHex(entry.hex) === wanted)
}

// Add `hex` to a list unless it is already there (hex compared as a colour, so
// #abc and #AABBCC are one). Returns the new list, whether anything was added,
// and the hex as stored. A list that gains nothing comes back as the same array.
export function addSavedColour(list, hex, { name, at } = {}) {
  const current = Array.isArray(list) ? list : []
  const stored = normaliseHex(hex)
  if (!stored) return { list: current, added: false, hex: null }
  if (current.some((entry) => normaliseHex(entry?.hex) === stored)) return { list: current, added: false, hex: stored }
  const entry = { hex: stored, at: at || new Date().toISOString() }
  const label = typeof name === 'string' ? name.trim() : ''
  if (label) entry.name = label
  return { list: [...current, entry], added: true, hex: stored }
}

// The projects to offer when saving a colour: the project the working design
// came from first, then the rest newest first. Archived projects are put away,
// so they are left out unless the design came from one.
export function projectChoices(projects, currentId) {
  const stamp = (p) => Date.parse(p?.updatedAt || p?.createdAt || '') || 0
  const open = (Array.isArray(projects) ? projects : []).filter((p) => p && (!p.archived || p.id === currentId))
  return open.sort((a, b) => {
    if (currentId) {
      if (a.id === currentId && b.id !== currentId) return -1
      if (b.id === currentId && a.id !== currentId) return 1
    }
    return stamp(b) - stamp(a)
  })
}
