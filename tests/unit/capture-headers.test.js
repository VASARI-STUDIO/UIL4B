// Response headers that keep UI L4B's own pictures out of other sites' pages
// and out of search results, read out of vercel.json.
//
// Cross-Origin-Resource-Policy: same-site stops another website embedding one
// of these files in an <img>. It does not stop a save extension, a server-side
// fetch or a screenshot; it is hygiene. It must stay OFF every share card
// (og:image, twitter:image, the /api/share card), because Slack, X, iMessage
// and the rest fetch those from their own servers and would be refused.
//
// It must also stay off /previews/vendor/: the prompt demos run in a sandboxed
// iframe with an opaque origin (src/components/prompt/PromptModal.jsx), which is
// not same-site with us, so CORP would block the demo's own scripts and fonts.
//
// X-Robots-Tag: noindex keeps the real preview files out of search.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_CARD, HOME_CARD, SECTIONS, allCardFiles, CARD_DIR } from '../../scripts/share-cards.mjs'

const REPO = process.cwd()
const config = JSON.parse(fs.readFileSync(path.join(REPO, 'vercel.json'), 'utf8'))
const PUBLIC = path.join(REPO, 'public')

// Every `source` here is regex groups and no named params, so anchored it is a
// JavaScript regex. Asserted, so a `:param` source cannot be silently mis-matched.
function headersFor(p) {
  const out = {}
  for (const rule of config.headers) {
    assert.ok(!/:\w/.test(rule.source), `${rule.source} uses a named param; teach headersFor() about it`)
    if (new RegExp(`^${rule.source}$`).test(p)) {
      for (const { key, value } of rule.headers) {
        assert.ok(!(key.toLowerCase() in out) || out[key.toLowerCase()] === value,
          `${p} gets two different ${key} values`)
        out[key.toLowerCase()] = value
      }
    }
  }
  return out
}
const corp = (p) => headersFor(p)['cross-origin-resource-policy']

const IMAGE = /\.(webp|avif|png|jpe?g|gif|svg)$/i

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}
const urlOf = (file) => '/' + path.relative(PUBLIC, file).split(path.sep).join('/')

/** Every share-card URL path the site can hand to a social site or chat app. */
function shareCardPaths() {
  const paths = new Set()
  for (const f of allCardFiles()) paths.add(`${CARD_DIR}/${f}`)
  paths.add(`${CARD_DIR}/${DEFAULT_CARD.file}`)
  paths.add(`${CARD_DIR}/${DEFAULT_CARD.twitterFile}`)
  for (const s of SECTIONS) paths.add(`${CARD_DIR}/og-${s.id}.png`)
  paths.add(HOME_CARD.path)
  const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8')
  for (const m of html.matchAll(/<meta\s+(?:property="og:image"|name="twitter:image")\s+content="([^"]+)"/g)) {
    paths.add(new URL(m[1]).pathname)
  }
  paths.add('/api/share')
  paths.add('/p/4338E0')
  return [...paths]
}

test('the share card list is not empty, so the card checks below are looking at something', () => {
  const cards = shareCardPaths()
  assert.ok(cards.length >= 12, `only ${cards.length} share card paths were found`)
  assert.ok(cards.includes('/previews/og-image.png'))
  assert.ok(cards.includes('/previews/x-card.png'))
  assert.ok(cards.includes('/og/home.jpg'))
})

test('no share card or og/twitter image target gets Cross-Origin-Resource-Policy', () => {
  for (const p of shareCardPaths()) {
    assert.equal(corp(p), undefined, `${p} is fetched by social sites and chat apps; CORP would break its unfurl`)
  }
})

test('no og image on disk gets Cross-Origin-Resource-Policy', () => {
  for (const f of walk(path.join(PUBLIC, 'og'))) {
    assert.equal(corp(urlOf(f)), undefined, urlOf(f))
  }
  for (const f of fs.readdirSync(path.join(PUBLIC, 'previews')).filter((n) => /^(og-|x-card)/.test(n))) {
    assert.equal(corp(`/previews/${f}`), undefined, `/previews/${f}`)
  }
})

test('the sandboxed prompt demos can still load their own scripts and fonts', () => {
  assert.equal(corp('/previews/vendor/three/three.min.js'), undefined)
  assert.equal(corp('/previews/vendor/fonts/geist.js'), undefined)
  assert.equal(corp('/previews/prompts/c-1.html'), undefined)
  assert.match(fs.readFileSync(path.join(REPO, 'src/components/prompt/PromptModal.jsx'), 'utf8'),
    /sandbox="allow-scripts"/, 'the reason for the exception is gone; revisit it')
})

// Root-level files (favicons, manifest icons), the share cards, the vendor
// scripts and the non-image folders are deliberately outside CORP.
const EXEMPT = (rel) => {
  const parts = rel.split('/')
  if (parts.length === 1) return true
  if (parts[0] === 'og' || parts[0] === 'fonts' || parts[0] === 'iconify' || parts[0] === 'data') return true
  if (parts[0] === 'previews' && (parts.length === 2 || parts[1] === 'vendor')) return true
  return false
}

test('every first-party image under public/ that is not a share card gets CORP same-site', () => {
  const files = walk(PUBLIC).filter((f) => IMAGE.test(f)).map(urlOf)
  assert.ok(files.length > 500, `only ${files.length} images found; walk() is not seeing public/`)
  const missing = []
  let covered = 0
  for (const url of files) {
    if (EXEMPT(url.slice(1))) continue
    covered += 1
    if (corp(url) !== 'same-site') missing.push(url)
  }
  assert.ok(covered > 500, 'the exemptions swallowed nearly every image')
  assert.deepEqual(missing.slice(0, 10), [],
    `${missing.length} image file(s) have no Cross-Origin-Resource-Policy: same-site. A new image folder under public/ `
    + 'needs a source in vercel.json (or an entry in EXEMPT here with a reason).')
})

test('the preview, locked and showcase paths named in the audit are covered', () => {
  for (const p of [
    '/previews/prompts/poster/c-4.webp',
    '/previews/prompts/anim/c-4.webp',
    '/previews/card/card-front-1080.webp',
    '/previews/overshirt/overshirt-front-1080.avif',
    '/previews/ridgeline/park.svg',
    '/locked-images/prompts/c-4.webp',
    '/locked-images/export-themes/01-presentation-book.webp',
    '/export-themes/01-presentation-book.webp',
    '/home-showcase/01-presentation/guide-cover-l.avif',
    '/spectrum/model-poster.webp',
  ]) assert.equal(corp(p), 'same-site', p)
})

test('CORP is same-site, never same-origin (www and the apex serve each other)', () => {
  for (const rule of config.headers) {
    for (const h of rule.headers) {
      if (h.key.toLowerCase() === 'cross-origin-resource-policy') assert.equal(h.value, 'same-site', rule.source)
    }
  }
})

test('fonts, /assets and the API carry no CORP', () => {
  for (const p of ['/assets/index-abc.js', '/fonts/switzer-latin.woff2', '/api/share', '/api/ai', '/']) {
    assert.equal(corp(p), undefined, p)
  }
})
