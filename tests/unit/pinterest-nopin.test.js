// Pinterest's opt-out. `<meta name="pinterest" content="nopin">` turns off the
// Save button for the whole page, and `data-pin-nopin` does the same for one
// image. Only Pinterest reads either; it is a signal, not a lock.
//
// Every prerendered shell is index.html run through rewriteHead(), which
// substitutes named tags and keeps the rest, so the meta in index.html reaches
// all of them. This pins that, so a rewrite that rebuilds the head cannot drop it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { rewriteHead } from '../../scripts/prerender.mjs'

const REPO = process.cwd()
const read = (f) => fs.readFileSync(path.join(REPO, f), 'utf8')
const NOPIN_META = /<meta\s+name="pinterest"\s+content="nopin"[^>]*>/

test('index.html opts the whole site out of Pinterest saves', () => {
  assert.match(read('index.html'), NOPIN_META)
})

test('a prerendered shell keeps the nopin meta', () => {
  const { html, misses } = rewriteHead(read('index.html'), {
    title: 'UI L4B | Learn',
    description: 'Guides.',
    robots: 'index,follow',
    canonical: 'https://uil4b.com/learn',
    card: { id: 'og-learn', file: 'og-learn.png', alt: 'Learn' },
  })
  assert.deepEqual(misses, [])
  assert.match(html, NOPIN_META)
})

test('the 404 shell keeps the nopin meta', () => {
  const { html } = rewriteHead(read('index.html'), {
    title: 'UI L4B | Page not found',
    description: 'That page does not exist.',
    robots: 'noindex,follow',
    canonical: 'https://uil4b.com/404',
    card: { id: 'og-image', file: 'og-image.png', twitterFile: 'x-card.png', alt: 'UI L4B' },
  })
  assert.match(html, NOPIN_META)
})

test('the palette share page opts out too', async () => {
  const { default: handler } = await import('../../api/share.js')
  let body = ''
  const res = {
    setHeader() {},
    status() { return this },
    send(v) { body = String(v); return this },
    json() { return this },
    end() { return this },
  }
  handler({ method: 'GET', query: { c: '4338E0,7C6CF0' }, headers: {} }, res)
  assert.match(body, NOPIN_META)
})

// Every <img> in these files shows a Pro or locked picture: the locked
// stand-ins, prompt previews, palette preview scenes, export theme pages and
// the homepage showcase. A tag added later without the attribute fails here.
const PRO_IMAGE_FILES = [
  'src/components/prompt/PromptCard.jsx',
  'src/components/prompt/PromptLockedCard.jsx',
  'src/components/prompt/PromptModal.jsx',
  'src/components/prompt/PromptOverview.jsx',
  'src/components/library/GalleryEndGate.jsx',
  'src/components/export/ExportThemeRow.jsx',
  'src/components/export/ExportFreePreview.jsx',
  'src/components/ExportProPreview.jsx',
  'src/components/palette/PreviewImage.jsx',
  'src/components/home/HomeShowcase.jsx',
  'src/components/home/ShowcaseViewer.jsx',
  'src/components/home/HomeExports.jsx',
]

/** Each `<img ...>` opening tag, with its attributes, however many lines it spans. */
const imgTags = (src) => src.match(/<img\b(?:[^>{]|\{[^}]*\})*>/g) || []

for (const file of PRO_IMAGE_FILES) {
  test(`every <img> in ${file} carries data-pin-nopin`, () => {
    const tags = imgTags(read(file))
    assert.ok(tags.length > 0, `${file}: no <img> found, so this check is not looking at anything`)
    for (const tag of tags) {
      assert.match(tag, /data-pin-nopin="true"/, `${file}: ${tag.replace(/\s+/g, ' ').slice(0, 90)}`)
    }
  })
}
