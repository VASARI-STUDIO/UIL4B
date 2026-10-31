// Which preview the viewer opens on: the last one viewed, but never a Pro
// preview for an account that is not (yet known to be) Pro.
//
// To make it fail: drop the `last.free || canSeePro` check in openingScene
// (src/data/palettePreviewScenes.js), or make it ignore `lastId`.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SCENE, PREVIEW_SCENES, openingScene } from '../../src/data/palettePreviewScenes.js'

const free = PREVIEW_SCENES.find((s) => s.free && s.id !== DEFAULT_SCENE)
const pro = PREVIEW_SCENES.find((s) => !s.free)

test('a free preview reopens on itself, with or without Pro', () => {
  assert.equal(openingScene(free.id, false), free.id)
  assert.equal(openingScene(free.id, true), free.id)
})

test('a Pro preview reopens on itself only when Pro is known', () => {
  assert.equal(openingScene(pro.id, true), pro.id)
  assert.equal(openingScene(pro.id, false), DEFAULT_SCENE)
})

test('an unknown id opens on the default', () => {
  assert.equal(openingScene('nope', true), DEFAULT_SCENE)
  assert.equal(openingScene(undefined, false), DEFAULT_SCENE)
})
