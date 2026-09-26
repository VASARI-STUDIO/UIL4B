// A project's icon belongs to the PROJECT, not to the browser.
//
// It used to live in `vs-project-icons`, a { projectId: icon } map in
// localStorage — so a project opened on a second device lost its icon, and the
// map never reached the account at all. The icon is now a
// field on the project record (`project.icon`), written through ProjectContext's
// `updateProject`, which syncs with the project and stamps `updatedAt` so the
// newer choice wins a merge.
//
// The value is whatever the picker writes: one of the workspace's glyph names,
// or, for an icon somebody uploaded on the old page, its data: URL (≤ 50 KB,
// capped by the old uploader). DOM-free.

export const LEGACY_ICON_KEY = 'vs-project-icons'

export function readLegacyIcons(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(LEGACY_ICON_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch { return {} }
}

export function writeLegacyIcons(storage, map) {
  try {
    if (!map || !Object.keys(map).length) storage?.removeItem(LEGACY_ICON_KEY)
    else storage?.setItem(LEGACY_ICON_KEY, JSON.stringify(map))
  } catch { /* quota: the icons are on the projects already */ }
}

/** The icon to show: the project's own, else a not-yet-migrated local one. */
export function iconFor(project, legacy = {}) {
  if (!project) return null
  if (typeof project.icon === 'string' && project.icon) return project.icon
  const old = legacy?.[project.id]
  return typeof old === 'string' && old ? old : null
}

/** { projectId: icon } for every project, in the shape the old map had. */
export function iconMap(projects, legacy = {}) {
  const out = {}
  for (const p of projects || []) {
    const icon = iconFor(p, legacy)
    if (icon) out[p.id] = icon
  }
  return out
}

/**
 * THE MIGRATION. Which local icons move onto which projects, and what is left.
 *
 * Merge rule: the project's own icon WINS. It is either newer (set after this
 * shipped, on any device) or it arrived from the account; a leftover local
 * choice for a project that already has one is dropped, not re-applied.
 * An entry whose project is not in this account's list is KEPT locally — it
 * may belong to another account used on this browser, and it is not ours to
 * move or delete.
 */
export function planIconMigration(projects, legacy) {
  const moves = []
  const remaining = { ...(legacy || {}) }
  const byId = new Map((projects || []).map((p) => [p.id, p]))
  for (const [id, icon] of Object.entries(legacy || {})) {
    const project = byId.get(id)
    if (!project) continue
    if (typeof icon === 'string' && icon && !(typeof project.icon === 'string' && project.icon)) {
      moves.push({ id, icon })
    }
    delete remaining[id]
  }
  return { moves, remaining }
}
