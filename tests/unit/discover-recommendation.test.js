import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_GALLERY_ORDER, GALLERY_FOR_TOOL, recommendGallery } from '../../src/components/nav/discoverRecommendation.js'
import { createTools, DISCOVER_GROUPS } from '../../src/data/toolTree.js'

test('with no recent tools the first live gallery is offered', () => {
  const pick = recommendGallery({ recent: [], path: '/projects' })
  assert.equal(pick.gallery.id, DEFAULT_GALLERY_ORDER[0])
  assert.equal(pick.fromTool, null)
})

test('the newest tool that has a gallery decides, and is named', () => {
  const pick = recommendGallery({ recent: ['alt-text', 'gradient', 'palette'], path: '/projects' })
  assert.equal(pick.gallery.id, 'gradient-gallery')
  assert.equal(pick.fromTool.id, 'gradient')
})

test('a different recent list gives a different gallery', () => {
  const a = recommendGallery({ recent: ['palette'], path: '/projects' })
  const b = recommendGallery({ recent: ['font-pair'], path: '/projects' })
  assert.notEqual(a.gallery.id, b.gallery.id)
})

test('a tool whose own page is the gallery is not used as the reason', () => {
  const pick = recommendGallery({ recent: ['font-gallery', 'icons', 'palette'], path: '/projects' })
  assert.equal(pick.gallery.id, 'palette-library')
  assert.equal(pick.fromTool.id, 'palette')
})

test('the gallery the visitor is standing on is never suggested', () => {
  const palettes = DISCOVER_GROUPS.find((g) => g.id === 'palette-library')
  const pick = recommendGallery({ recent: ['palette'], path: palettes.route })
  assert.notEqual(pick.gallery.id, 'palette-library')
  assert.equal(recommendGallery({ recent: [], path: palettes.route }).gallery.id, DEFAULT_GALLERY_ORDER[1])
})

test('ids the registry does not know are ignored', () => {
  const pick = recommendGallery({ recent: ['no-such-tool'], path: '/projects' })
  assert.equal(pick.gallery.id, DEFAULT_GALLERY_ORDER[0])
})

test('every mapping points at a live tool and a live gallery that is not that tool\'s own page', () => {
  const tools = createTools()
  for (const [toolId, galleryId] of Object.entries(GALLERY_FOR_TOOL)) {
    const tool = tools.find((t) => t.id === toolId)
    const gallery = DISCOVER_GROUPS.find((g) => g.id === galleryId)
    assert.ok(tool && !tool.soon, `${toolId} is a live Create tool`)
    assert.ok(gallery && !gallery.soon, `${galleryId} is a live gallery`)
    assert.notEqual(gallery.route, tool.route, `${toolId} does not recommend itself`)
  }
})

test('every default gallery is live, and none of them is the retired prompt library', () => {
  for (const id of DEFAULT_GALLERY_ORDER) {
    const gallery = DISCOVER_GROUPS.find((g) => g.id === id)
    assert.ok(gallery && !gallery.soon, `${id} is live`)
    assert.ok(!gallery.route.startsWith('/discover/prompts'), `${id} does not link the prompt library`)
  }
})
