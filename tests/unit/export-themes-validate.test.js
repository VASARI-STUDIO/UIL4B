// validateBrand is the allowlist every brand passes before the export engine reads it.
//
//  1. THE TEN SAMPLE BRANDS PASS UNCHANGED. Break: tighten a leaf rule so a sample value no longer matches.
//  2. A HOSTILE VALUE IN ANY FIELD IS REFUSED OR CLEANED. Fields with an exact rule (colours, ids, numbers, weights, families, css queries)
//     refuse every hostile string; free text is cleaned of control characters and private-use code points (where the slot edition's
//     placeholder sentinels live) and cut to its length cap. Break: take PRIVATE_USE out of validate.js's text(), or give a leaf the
//     length-only rule the links labels once had.
//  3. QUOTES, MARKUP AND COMMENT ENDS IN FREE TEXT ARE KEPT, because each output place escapes them. That is the escapers' job, so the
//     last test renders a hostile brand and counts the elements it adds.
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateBrand, BrandInputError } from '../../api/_lib/exportThemes/engine/validate.js'
import { BRANDS } from '../../api/_lib/exportThemes/brands/index.js'
import { makeCtx, GUIDE_PAGES, UIKIT_PAGES } from '../../api/_lib/exportThemes/engine/pages.js'
import { pageDoc } from '../../api/_lib/exportThemes/engine/doc.js'
import loaders from '../../api/_lib/exportThemes/node-loaders.js'
import * as theme04 from '../../api/_lib/exportThemes/themes/04-standards/index.js'
import * as theme02 from '../../api/_lib/exportThemes/themes/02-poster/index.js'

const PRIVATE_USE = new RegExp(`[${String.fromCodePoint(0xE000)}-${String.fromCodePoint(0xF8FF)}]`)
const HOSTILE = {
  quote: '"',
  styleEnd: '</style>',
  commentEnd: '*/',
  newline: 'a\nb',
  privateUse: `x${String.fromCodePoint(0xE000)}y${String.fromCodePoint(0xE010)}z${String.fromCodePoint(0xE001)}`,
  dots: '../',
  long: 'x'.repeat(10000),
}
const SLUGS = Object.keys(BRANDS)

test('there are ten sample brands', () => {
  assert.equal(SLUGS.length, 10)
})

for (const slug of SLUGS) {
  test(`sample brand ${slug} passes validateBrand unchanged`, () => {
    const data = BRANDS[slug].data
    assert.deepEqual(validateBrand(data), data)
  })
}

const leaves = (v, path = [], out = []) => {
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) leaves(x, [...path, k], out)
  else out.push(path)
  return out
}
const get = (o, path) => path.reduce((x, k) => x[k], o)
const setAt = (data, path, value) => {
  const copy = structuredClone(data)
  get(copy, path.slice(0, -1))[path.at(-1)] = value
  return copy
}
/** 'refused', or the value that came back. */
const attempt = (data, path, value) => {
  try { return get(validateBrand(setAt(data, path, value)), path) } catch (e) {
    if (e instanceof BrandInputError) return 'refused'
    throw e
  }
}

const PROBE = 'Plain "words" <here>'
// A string leaf is free text if a sentence with quotes and a tag goes through it untouched; every other string leaf has an exact rule.
const classify = (data) => {
  const free = [], exact = [], numbers = []
  for (const path of leaves(data)) {
    const v = get(data, path)
    if (typeof v === 'number') numbers.push(path)
    else if (typeof v === 'string') (attempt(data, path, PROBE) === PROBE ? free : exact).push(path)
  }
  return { free, exact, numbers }
}

const ONE_LINE = new Set(['name', 'city', 'logo.showcase.wordmark', 'contact.email', 'applications.site.url', 'applications.card.contact'])

for (const slug of ['margin', 'two-shores', 'encore']) {
  const data = BRANDS[slug].data
  const { free, exact, numbers } = classify(data)

  test(`${slug}: the leaves split into free text, exact-rule strings and numbers, and each group is large`, () => {
    assert.ok(free.length > 100 && exact.length > 40 && numbers.length > 20, `${free.length} free, ${exact.length} exact, ${numbers.length} numbers`)
  })

  test(`${slug}: every exact-rule string field refuses every hostile string`, () => {
    for (const path of exact) {
      for (const [name, value] of Object.entries(HOSTILE)) {
        assert.equal(attempt(data, path, value), 'refused', `${path.join('.')} accepted the ${name} value`)
      }
    }
  })

  test(`${slug}: every number field refuses NaN, Infinity and a string`, () => {
    for (const path of numbers) {
      for (const value of [NaN, Infinity, -Infinity, '12']) {
        assert.equal(attempt(data, path, value), 'refused', `${path.join('.')} accepted ${String(value)}`)
      }
    }
  })

  test(`${slug}: free text loses private-use code points and control characters, and is cut to its cap`, () => {
    for (const path of free) {
      const key = path.join('.')
      const priv = attempt(data, path, HOSTILE.privateUse)
      assert.ok(priv !== HOSTILE.privateUse && !PRIVATE_USE.test(priv), `${key} kept a private-use code point`)
      const control = attempt(data, path, `a${String.fromCharCode(0)}b${String.fromCharCode(7)}c${String.fromCodePoint(0x2028)}d`)
      assert.equal(control, 'abcd', `${key} kept a control character`)
      const long = attempt(data, path, HOSTILE.long)
      assert.ok(typeof long === 'string' && long.length <= 1000, `${key} kept ${long.length} characters`)
    }
  })

  test(`${slug}: one-line fields collapse a line break`, () => {
    const lines = free.filter((p) => ONE_LINE.has(p.join('.')) || p.at(-2) === 'links')
    assert.ok(lines.length >= 3, 'no one-line fields found')
    for (const path of lines) assert.doesNotMatch(attempt(data, path, HOSTILE.newline), /[\r\n]/, `${path.join('.')} kept a line break`)
  })
}

test('keys outside the allowlist and prototype keys are refused', () => {
  const data = BRANDS.margin.data
  for (const key of ['__proto__', 'constructor', 'prototype', 'extra', '../x', 'a b']) {
    const copy = structuredClone(data)
    Object.defineProperty(copy, key, { value: 'x', enumerable: true, configurable: true, writable: true })
    assert.throws(() => validateBrand(copy), BrandInputError, `key ${key} was accepted`)
  }
})

test('a brand that is not an object, or is nested or sized past the limits, is refused', () => {
  for (const bad of [null, undefined, 'x', 5, []]) assert.throws(() => validateBrand(bad), BrandInputError)
  const many = structuredClone(BRANDS.margin.data)
  many.personality = Array.from({ length: 301 }, () => ({ trait: 'a', means: 'b' }))
  assert.throws(() => validateBrand(many), BrandInputError)
})

// ---- hostile text, rendered ----
// Text keeps its quotes and markup in the data; this renders a hostile copy of the two-shores brand (theme 04) and of encore (theme 02) in the
// showcase edition and checks the page documents gain no element: the same count of <script, <img and </style as the clean brand.
const MARKUP = '"></style><script>alert(1)</script><img src=x onerror=alert(1)>*/ /* \' ../ '
const hostileCopy = (data) => {
  const copy = structuredClone(data)
  for (const key of ['description', 'product', 'audience', 'city']) copy[key] = MARKUP + copy[key]
  copy.lines.primary = MARKUP
  copy.logo.showcase.symbolNote = MARKUP
  copy.voice.nameRules = MARKUP
  copy.colours.forEach((c) => { c.name = MARKUP; c.lands = MARKUP })
  copy.personality.forEach((p) => { p.trait = MARKUP })
  copy.type.sample.headline = MARKUP
  return copy
}
const count = (html, re) => (html.match(re) || []).length
const tally = (T, data) => {
  const out = { script: 0, style: 0, img: 0, pages: 0 }
  for (const [kind, list] of [['guidelines', GUIDE_PAGES], ['uikit', UIKIT_PAGES]]) {
    const ctx = makeCtx(T, 'showcase', kind, loaders, data)
    for (const p of list) {
      const html = pageDoc(ctx, T, { title: p.id, pages: [T[kind][p.id](ctx)], size: ctx.size })
      out.script += count(html, /<script/gi)
      out.style += count(html, /<\/style/gi)
      out.img += count(html, /<img\b/gi)
      out.pages++
    }
  }
  return out
}

for (const [slug, T] of [['two-shores', theme04], ['encore', theme02]]) {
  test(`hostile text in ${slug} adds no script, image or style end to any page`, () => {
    const clean = tally(T, BRANDS[slug].data)
    const hostile = tally(T, hostileCopy(BRANDS[slug].data))
    assert.ok(hostile.pages > 50, 'few pages rendered, so the count proves little')
    assert.deepEqual(hostile, clean)
  })
}
