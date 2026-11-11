// The previews the Palette Builder paints a palette onto.
//
// Every scene is an example: its own made-up product, built around one drawn
// artefact that is painted with the palette, and a lazy chunk under
// src/components/palette/examples/. Nothing here names a real person, a real
// place's Country or this site, and nothing claims proof;
// tests/unit/palette-preview-copy.test.js holds that line.
//
// This is content, not behaviour: no React, no hooks. The components that read
// it live in src/components/palette/PalettePreview.jsx.

// A group with no scene in it is left out, so the list never shows an empty
// heading. The graphic group joins when its first scene does.
export const PREVIEW_GROUPS = [
  { id: 'product', label: 'Product' },
  { id: 'marketing', label: 'Marketing' },
]

// `free` is the whole Pro gate: a preview without it is blurred behind
// "Unlock preview" for an account that is not Pro. `example` marks the lazy
// chunks. The list is in group order, because the arrow keys walk it.
export const PREVIEW_SCENES = [
  { id: 'energy', name: 'Energy dashboard', group: 'product', free: true, example: true },
  { id: 'trail', name: 'Trail run app', group: 'product', free: true, example: true },
  { id: 'card', name: 'Spending card', group: 'product', free: false, example: true },
  { id: 'editorial', name: 'Editorial hero', group: 'marketing', free: true, example: true },
  { id: 'product', name: 'Product page', group: 'marketing', free: true, example: true },
  { id: 'studio', name: 'Architect portfolio', group: 'marketing', free: false, example: true },
]

export const DEFAULT_SCENE = 'editorial'

const sceneIs = (id) => (s) => s.id === id
export const sceneById = (id) => PREVIEW_SCENES.find(sceneIs(id)) || PREVIEW_SCENES.find(sceneIs(DEFAULT_SCENE))

// The scene the viewer opens on: the last one viewed, unless it is a Pro
// preview and the plan is not known to be Pro (still loading counts as not
// Pro), so a free account never opens onto a blurred scene.
export const openingScene = (lastId, canSeePro) => {
  const last = PREVIEW_SCENES.find(sceneIs(lastId))
  return last && (last.free || canSeePro) ? last.id : DEFAULT_SCENE
}
