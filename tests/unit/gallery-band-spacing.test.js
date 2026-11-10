import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BAND_MIN, BAND_ROOM, BAND_SPACE, bandHeight } from '../../src/utils/galleryBand.js'

const css = readFileSync(new URL('../../src/styles/pages/font-gallery.css', import.meta.url), 'utf8')
const global = readFileSync(new URL('../../src/styles/global.css', import.meta.url), 'utf8')

// The spacing scale, read from the stylesheet that defines it.
const scale = Object.fromEntries([...global.matchAll(/--s-(\d+):(\d+)px/g)].map(([, n, px]) => [n, Number(px)]))
const token = (name) => {
  const n = name.match(/^var\(--s-(\d+)\)$/)?.[1]
  assert.ok(n && scale[n], `${name} is not a spacing token`)
  return scale[n]
}

// The value a band declares for one property in the base rule, or in the rule
// inside a media query when `query` is given.
const declared = (prop, query) => {
  const block = query
    ? css.match(new RegExp(`@media \\(${query}\\) \\{\\s*\\.fg-page :is\\(\\.fg-card, \\.fg-skel-row\\) \\{([^}]*)\\}`))?.[1]
    : css.match(/\.fg-page :is\(\.fg-card, \.fg-skel-row\) \{([^}]*)\}/)?.[1]
  assert.ok(block, `no rule for ${query || 'the base band'}`)
  return block.match(new RegExp(`${prop}:\\s*([^;]+);`))?.[1].trim()
}

// What the bands used before the spacing was widened: room above the name,
// room below and the gap between them, at each width.
const WAS = { wide: { y: 28, yb: 20, gap: 27 }, phone: { y: 16, yb: 20, gap: 14 } }

test('a band\'s spacing is built from the spacing tokens, not loose pixels', () => {
  for (const prop of ['--fg-y', '--fg-yb', '--fg-gap']) {
    assert.match(declared(prop), /^var\(--s-\d+\)$/, `${prop} is not a token`)
  }
})

test('the wide band has the room the CSS declares, and the JS height uses the same sums', () => {
  assert.equal(token(declared('--fg-y')), BAND_SPACE.wide.y)
  assert.equal(token(declared('--fg-yb')), BAND_SPACE.wide.yb)
  assert.equal(token(declared('--fg-gap')), BAND_SPACE.wide.gap)
})

test('the phone band has the room the CSS declares, and the JS height uses the same sums', () => {
  assert.equal(token(declared('--fg-y', 'max-width: 767px')), BAND_SPACE.phone.y)
  assert.equal(token(declared('--fg-gap', 'max-width: 767px')), BAND_SPACE.phone.gap)
  // The phone keeps the base room below the meta line.
  assert.equal(token(declared('--fg-yb')), BAND_SPACE.phone.yb)
})

test('the room around a name is at least 1.5 times what it was', () => {
  assert.ok(BAND_SPACE.wide.y >= WAS.wide.y * 1.5, 'wide room above the name shrank back')
  assert.ok(BAND_SPACE.wide.yb >= WAS.wide.yb * 1.5, 'wide room below the meta line shrank back')
  assert.ok(BAND_SPACE.wide.gap >= WAS.wide.gap * 1.5, 'wide gap between name and meta shrank back')
  assert.ok(BAND_SPACE.phone.y >= WAS.phone.y * 1.5, 'phone room above the name shrank back')
  assert.ok(BAND_SPACE.phone.yb >= WAS.phone.yb * 1.5, 'phone room below the meta line shrank back')
  assert.ok(BAND_SPACE.phone.gap >= WAS.phone.gap * 1.5, 'phone gap between name and meta shrank back')
})

// The grid is the round-3 boards' tiles: filled, 8px apart, 12px corners, and the
// boards' own insets (name 20 down and 16 in, meta 16 up, pick button 12), 224px
// tall. A phone is 8px in, 144px tall, with the name 16 down and 12 in.
const tileRule = (query) => {
  const re = query
    ? new RegExp(`@media \\(${query}\\) \\{\\s*\\.fg-page \\.fg-grid--tiles :is\\(\\.fg-card, \\.fg-skel-row\\) \\{([^}]*)\\}`)
    : /\.fg-page \.fg-grid--tiles :is\(\.fg-card, \.fg-skel-row\) \{([^}]*)\}/
  const block = css.match(re)?.[1]
  assert.ok(block, `no tile rule for ${query || 'the wide grid'}`)
  return block
}

test('the grid tiles are the board\'s: 8px apart, 12px corners, 224px tall with the board\'s insets', () => {
  const grid = css.match(/\.fg-page \.fg-grid--tiles \{([^}]*)\}/)?.[1]
  assert.match(grid, /gap:\s*8px;/, 'tiles are not 8px apart')
  assert.match(grid, /padding:\s*0 24px;/, 'the grid is not 24px in from the edges')
  const wide = tileRule()
  assert.match(wide, /border-radius:\s*12px;/)
  assert.match(wide, /height:\s*max\(224px,/)
  assert.match(wide, /--fg-y:\s*20px;/)
  assert.match(wide, /--fg-yb:\s*16px;/)
  assert.match(wide, /--fg-padl:\s*16px;/)
  assert.match(wide, /--fg-right:\s*64px;/)
  assert.match(wide, /--fg-ground:\s*var\(--fg-tile\);/)
  assert.doesNotMatch(wide, /border-right/, 'the flush grid\'s hairline came back')
})

test('the phone grid is two columns, 8px in, 144px tiles', () => {
  const phone = tileRule('max-width: 767px')
  assert.match(phone, /height:\s*max\(144px,/)
  assert.match(phone, /--fg-y:\s*16px;/)
  assert.match(phone, /--fg-padl:\s*12px;/)
  assert.match(css, /@media \(max-width: 767px\) \{ \.fg-page \.fg-grid--tiles \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); padding: 0 8px; \} \}/)
})

test('a hovered or focused tile takes the wake fill, with no change of colour on the name', () => {
  assert.match(css, /\.fg-grid--tiles \.fg-card:has\(:focus-visible\) \{ --fg-ground: var\(--fg-tile-wake\); \}/)
  assert.match(css, /\(hover: hover\) and \(pointer: fine\) \{\s*\.fg-page \.fg-grid--tiles \.fg-card:hover \{ --fg-ground: var\(--fg-tile-wake\); \}/)
  assert.doesNotMatch(css, /fg-grid--tiles \.fg-card:hover \.fg-card-name/, 'the old name-only hover came back')
  assert.match(css, /--fg-tile: #0F1012;/)
  assert.match(css, /\[data-theme="light"\] \.fg-page \{ --fg-tile: #E4E3DD; \}/)
})

test('band heights follow the sums, with a floor that only a tiny name reaches', () => {
  assert.equal(BAND_ROOM.wide, 48 + 18 + 48 + 32 + 1)
  assert.equal(BAND_ROOM.phone, 24 + 18 + 24 + 32 + 1)
  // The sizes the list opens at: Size 96 from a tablet up, Size 48 on a phone.
  assert.equal(bandHeight('wide', 96), 253)
  assert.equal(bandHeight('tablet', 96), 253)
  assert.equal(bandHeight('phone', 48), 152)
  assert.equal(bandHeight('wide', 24), BAND_MIN.wide)
  assert.equal(bandHeight('phone', 24), BAND_MIN.phone)
  assert.ok(bandHeight('wide', 96) >= 200 * 1.25, 'the opening band is shorter than it should be')
})
