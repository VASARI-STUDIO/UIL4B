import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_GUIDE_ORDER, GUIDE_FOR_TOOL, recommendGuide } from '../../src/components/nav/learnRecommendation.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'
import { createTools } from '../../src/data/toolTree.js'

// MUTATION: change DEFAULT_GUIDE_ORDER[0] from 'colour-contrast' to any other slug
// and "empty history gives the default" fails.
test('empty history gives the default guide and no reason', () => {
  const pick = recommendGuide({ recent: [], path: '/projects' })
  assert.equal(pick.guide.slug, 'colour-contrast')
  assert.equal(pick.guide.route, '/learn/colour-contrast')
  assert.equal(pick.fromTool, null)
})

// MUTATION: map `palette` to any slug but 'brand-colour' in GUIDE_FOR_TOOL and
// the colour case fails; the same for `contrast`.
test('colour history gives a colour guide and names the tool', () => {
  const palette = recommendGuide({ recent: ['palette'], path: '/projects' })
  assert.equal(palette.guide.route, '/learn/brand-colour')
  assert.equal(palette.fromTool.label, 'Palette')
  const contrast = recommendGuide({ recent: ['contrast'], path: '/projects' })
  assert.equal(contrast.guide.route, '/learn/colour-contrast')
  assert.equal(contrast.fromTool.label, 'Contrast Checker')
})

// MUTATION: map `font-gallery` away from 'typeface-metrics' (or `type-scale` away
// from 'type-scales') and the type case fails.
test('type history gives a typography guide', () => {
  assert.equal(recommendGuide({ recent: ['font-gallery'], path: '/projects' }).guide.route, '/learn/typeface-metrics')
  assert.equal(recommendGuide({ recent: ['type-scale'], path: '/projects' }).guide.route, '/learn/type-scales')
  assert.equal(recommendGuide({ recent: ['font-pair'], path: '/projects' }).guide.route, '/learn/font-loading')
})

// MUTATION: delete `file-converter` or `alt-text` from GUIDE_FOR_TOOL and the
// image case falls back to the default and fails.
test('image history gives the guide the library has nearest to it', () => {
  const converter = recommendGuide({ recent: ['file-converter'], path: '/projects' })
  assert.equal(converter.guide.route, '/learn/colour-spaces')
  assert.equal(converter.fromTool.label, 'File Converter')
  assert.equal(recommendGuide({ recent: ['alt-text'], path: '/projects' }).guide.route, '/learn/colour-contrast')
})

// MUTATION: loop `recent` in reverse inside recommendGuide and this fails.
test('the newest tool that has a guide decides', () => {
  const pick = recommendGuide({ recent: ['no-such-tool', 'font-pair', 'palette'], path: '/projects' })
  assert.equal(pick.guide.route, '/learn/font-loading')
  assert.equal(pick.fromTool.id, 'font-pair')
})

// MUTATION: drop the onRoute check in `open` and this fails.
test('the guide the visitor is reading is not suggested', () => {
  const pick = recommendGuide({ recent: ['palette'], path: '/learn/brand-colour' })
  assert.notEqual(pick.guide.route, '/learn/brand-colour')
  assert.equal(recommendGuide({ recent: [], path: '/learn/colour-contrast' }).guide.route, '/learn/brand-colour')
})

// MUTATION: point any GUIDE_FOR_TOOL value or default at a slug that is not in
// LEARN_ARTICLES and this fails.
test('every mapping and default points at a live Create tool and a real guide', () => {
  const tools = createTools()
  const slugs = LEARN_ARTICLES.map((a) => a.slug)
  for (const [toolId, slug] of Object.entries(GUIDE_FOR_TOOL)) {
    const tool = tools.find((t) => t.id === toolId)
    assert.ok(tool && !tool.soon, `${toolId} is a live Create tool`)
    assert.ok(slugs.includes(slug), `${slug} is a real guide`)
  }
  for (const slug of DEFAULT_GUIDE_ORDER) assert.ok(slugs.includes(slug), `${slug} is a real guide`)
})
