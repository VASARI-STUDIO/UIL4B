// The head a crawler or a link unfurler receives for `/`, and the share image it
// points at.
//
// The served `/` shell is dist/index.html. Its title, description and share-card
// tags are written by scripts/prerender.mjs from src/data/routeMetaMap.js; this
// reads the bytes that shipped, with fixed expected values rather than the
// constants the build used, so a template that loses a binding cannot agree
// with itself.
//
// The shell checks need a build and skip without one (`DIST_DIR` picks a lane's
// output folder). The image checks read public/og/home.jpg and always run.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const REPO = process.cwd()
const DIST = path.join(REPO, process.env.DIST_DIR || 'dist')
const SHELL = path.join(DIST, 'index.html')
const IMAGE = path.join(REPO, 'public', 'og', 'home.jpg')

const skip = !fs.existsSync(SHELL) && 'run `npm run build` first'

const TITLE = 'UIL4B: your UI and brand kit, from one app'
const DESCRIPTION = 'Colours, type, icons and imagery in one app, exported as one file. Free to use, no account needed.'
const IMAGE_URL = 'https://uil4b.com/og/home.jpg'

const MAX_IMAGE_BYTES = 200 * 1024

/** Every `<meta>` tag in the document's head, as { key, content } where key is
 *  its `name` or `property`. Attribute order and quote style do not matter. */
function metaTags(html) {
  const head = html.slice(0, html.indexOf('</head>'))
  const tags = []
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attr = (name) => {
      const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))
      return m ? (m[1] ?? m[2]) : null
    }
    const key = attr('property') ?? attr('name')
    if (key) tags.push({ key, content: attr('content') })
  }
  return tags
}

/** The content of the one tag with this name or property. */
function metaOne(tags, key) {
  const found = tags.filter((t) => t.key === key)
  assert.equal(found.length, 1, `expected exactly one <meta> for ${key}, found ${found.length}`)
  return found[0].content
}

/** Width and height from a JPEG's start-of-frame marker. */
function jpegSize(buf) {
  assert.equal(buf[0], 0xff, 'missing the JPEG start-of-image marker')
  assert.equal(buf[1], 0xd8, 'missing the JPEG start-of-image marker')
  let at = 2
  while (at + 9 < buf.length) {
    assert.equal(buf[at], 0xff, `expected a marker at byte ${at}`)
    const marker = buf[at + 1]
    if (marker === 0xff) { at += 1; continue }
    // 0xC4 (huffman tables), 0xC8 (reserved) and 0xCC (arithmetic conditioning)
    // sit inside the SOF range but do not carry a frame size.
    const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
    if (isFrame) return { height: buf.readUInt16BE(at + 5), width: buf.readUInt16BE(at + 7) }
    at += 2 + buf.readUInt16BE(at + 2)
  }
  throw new Error('no start-of-frame marker in the file')
}

test('the built / shell carries the home title', { skip }, () => {
  const html = fs.readFileSync(SHELL, 'utf8')
  const titles = [...html.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => m[1])
  assert.deepEqual(titles, [TITLE])
})

test('the built / shell carries the home description', { skip }, () => {
  const tags = metaTags(fs.readFileSync(SHELL, 'utf8'))
  assert.equal(metaOne(tags, 'description'), DESCRIPTION)
})

test('the built / shell names the home share image, at 1200 by 630, on the apex', { skip }, () => {
  const tags = metaTags(fs.readFileSync(SHELL, 'utf8'))
  assert.equal(metaOne(tags, 'og:image'), IMAGE_URL)
  assert.equal(metaOne(tags, 'og:image:width'), '1200')
  assert.equal(metaOne(tags, 'og:image:height'), '630')
})

test('the built / shell asks for the large summary card', { skip }, () => {
  const tags = metaTags(fs.readFileSync(SHELL, 'utf8'))
  assert.equal(metaOne(tags, 'twitter:card'), 'summary_large_image')
})

test('public/og/home.jpg exists and is a JPEG', () => {
  assert.ok(fs.existsSync(IMAGE), 'public/og/home.jpg is missing')
  const head = fs.readFileSync(IMAGE).subarray(0, 3)
  assert.deepEqual([...head], [0xff, 0xd8, 0xff])
})

test('public/og/home.jpg is 1200 by 630', () => {
  assert.deepEqual(jpegSize(fs.readFileSync(IMAGE)), { width: 1200, height: 630 })
})

test('public/og/home.jpg is under 200KB', () => {
  const bytes = fs.statSync(IMAGE).size
  assert.ok(bytes < MAX_IMAGE_BYTES, `public/og/home.jpg is ${bytes} bytes, limit ${MAX_IMAGE_BYTES}`)
})

/** Every JSON-LD node in the shell's head, @graph members flattened in. */
function jsonLdNodes(html) {
  const head = html.slice(0, html.indexOf('</head>'))
  const nodes = []
  for (const [, body] of head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const data = JSON.parse(body)
    nodes.push(...(Array.isArray(data['@graph']) ? data['@graph'] : [data]))
  }
  return nodes
}

test('the built / shell names the site UIL4B in a WebSite node', { skip }, () => {
  const sites = jsonLdNodes(fs.readFileSync(SHELL, 'utf8')).filter((n) => n['@type'] === 'WebSite')
  assert.equal(sites.length, 1)
  assert.equal(sites[0].name, 'UIL4B')
  assert.deepEqual(sites[0].alternateName, ['UI L4B'])
  assert.equal(sites[0].url, 'https://uil4b.com/')
})

test('the built / shell carries an Organization with an absolute logo', { skip }, () => {
  const orgs = jsonLdNodes(fs.readFileSync(SHELL, 'utf8')).filter((n) => n['@type'] === 'Organization')
  assert.equal(orgs.length, 1)
  assert.equal(orgs[0].name, 'UIL4B')
  assert.equal(orgs[0].alternateName, 'UI L4B')
  assert.match(String(orgs[0].logo), /^https:\/\/uil4b\.com\/.+\.png$/)
  const file = path.join(REPO, 'public', new URL(orgs[0].logo).pathname)
  assert.ok(fs.existsSync(file), `${orgs[0].logo} is not in public/`)
})

test('the built / shell keeps the WebApplication, also named UIL4B', { skip }, () => {
  const apps = jsonLdNodes(fs.readFileSync(SHELL, 'utf8')).filter((n) => n['@type'] === 'WebApplication')
  assert.equal(apps.length, 1)
  assert.equal(apps[0].alternateName, 'UIL4B')
})

test('the built / shell JSON-LD is plain ASCII, so no decoder can garble it', { skip }, () => {
  const head = fs.readFileSync(SHELL, 'utf8')
  for (const [, body] of head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const wide = [...body].filter((c) => c.charCodeAt(0) > 0x7f)
    assert.deepEqual(wide, [])
  }
})

test('the built / shell shares the home title and names the site UIL4B', { skip }, () => {
  const tags = metaTags(fs.readFileSync(SHELL, 'utf8'))
  assert.equal(metaOne(tags, 'og:title'), TITLE)
  assert.equal(metaOne(tags, 'twitter:title'), TITLE)
  assert.equal(metaOne(tags, 'og:site_name'), 'UIL4B')
})

test('the built / shell has a single <h1>', { skip }, () => {
  const html = fs.readFileSync(SHELL, 'utf8').replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1)
})
