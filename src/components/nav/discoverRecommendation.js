// WHICH DISCOVER GALLERY THE MENU SUGGESTS.
//
// The suggestion follows the tools a visitor opened lately (the workspace's
// recent-tools list, newest first): the gallery that feeds the newest tool that
// has one. A tool whose own page is the gallery (Icon Library, Font Gallery)
// proves nothing the visitor has not already seen, so it is skipped, and so is
// the gallery they are standing on. With no usable activity the first live
// gallery is offered.
import { createTools, DISCOVER_GROUPS } from '../../data/toolTree.js'

// Create tool id -> Discover gallery id that carries on from it.
export const GALLERY_FOR_TOOL = Object.freeze({
  palette: 'palette-library',
  semantic: 'palette-library',
  tint: 'palette-library',
  contrast: 'palette-library',
  gradient: 'gradient-gallery',
  'font-pair': 'font-gallery',
  'type-scale': 'font-gallery',
  emoji: 'icon-library',
})

// The order offered when nothing recent points anywhere.
export const DEFAULT_GALLERY_ORDER = Object.freeze([
  'palette-library', 'gradient-gallery', 'font-gallery', 'icon-library', 'button-library',
])

const onRoute = (path, route) => !!route && (path === route || path.startsWith(route + '/'))

/**
 * @param {{ recent?: string[], path?: string }} input recent tool ids, newest first; the current pathname
 * @returns {{ gallery: object, fromTool: object | null } | null} a live DISCOVER_GROUPS row, and the Create tool that led to it
 */
export function recommendGallery({ recent = [], path = '' } = {}) {
  const live = DISCOVER_GROUPS.filter((g) => !g.soon && g.route)
  const open = (id) => {
    const gallery = live.find((g) => g.id === id)
    return gallery && !onRoute(path, gallery.route) ? gallery : null
  }
  const tools = createTools()
  for (const toolId of recent) {
    const gallery = open(GALLERY_FOR_TOOL[toolId])
    const fromTool = tools.find((t) => t.id === toolId && !t.soon)
    if (gallery && fromTool) return { gallery, fromTool }
  }
  for (const id of DEFAULT_GALLERY_ORDER) {
    const gallery = open(id)
    if (gallery) return { gallery, fromTool: null }
  }
  return null
}
