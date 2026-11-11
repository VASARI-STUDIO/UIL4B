import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { EXPORT_TEMPLATES } from '../../src/config/exportTemplates.js'
import { EXPORT_TEMPLATE_THUMBS } from '../../src/data/exportTemplateThumbs.generated.js'
import { templateThumb, TILE_SIZES } from '../../src/utils/exportTemplateThumb.js'

const RATIO = { book: 1 / Math.SQRT2, guidelines: 16 / 9, kit: 4 / 5 }
const live = Object.entries(EXPORT_TEMPLATES).flatMap(([format, list]) => list.filter((t) => t.live).map((t) => ({ format, id: t.id })))

test('every live template has a tile at 240, 480 and 720 w', () => {
  for (const { format, id } of live) {
    const entry = EXPORT_TEMPLATE_THUMBS.tiles[format]?.[id]
    assert.ok(entry, `${format} ${id} has no tile in the manifest`)
    assert.deepEqual(entry.files.map((f) => f.width), [240, 480, 720], `${format} ${id}`)
  }
})

test('each file is on disk, matches its sha256, holds its frame ratio and the 240w budget', () => {
  for (const { format, id } of live) {
    for (const f of EXPORT_TEMPLATE_THUMBS.tiles[format][id].files) {
      const path = new URL(`../../public${EXPORT_TEMPLATE_THUMBS.dir}${f.file}`, import.meta.url)
      assert.ok(existsSync(path), `${f.file} is missing`)
      const bytes = readFileSync(path)
      assert.equal(createHash('sha256').update(bytes).digest('hex'), f.sha256, `${f.file} drifted from its manifest hash`)
      assert.ok(Math.abs(f.width / f.height - RATIO[format]) / RATIO[format] < 0.005, `${f.file} is off its ${format} ratio`)
      if (f.width === 240) assert.ok(bytes.length <= 14000, `${f.file} is ${bytes.length} bytes`)
    }
  }
})

test('templateThumb gives the srcset, the middle file as src and the spec sizes value', () => {
  const t = templateThumb({ format: 'book', id: 'atlas' })
  assert.equal(t.src, '/export-templates/book-atlas-480.webp')
  assert.equal(t.srcSet, '/export-templates/book-atlas-240.webp 240w, /export-templates/book-atlas-480.webp 480w, /export-templates/book-atlas-720.webp 720w')
  assert.equal(t.sizes, TILE_SIZES)
  assert.equal(TILE_SIZES, '(max-width: 560px) calc((100vw - 48px) / 3), 162px')
})

test('a template with no tile gets no picture', () => {
  assert.equal(templateThumb({ format: 'book', id: 'nothing' }), null)
  assert.equal(templateThumb({ format: 'tokens', id: 'studio' }), null)
})
