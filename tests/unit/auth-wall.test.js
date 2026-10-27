// The log-in wall's content: the manifest, the 11 generated WebPs, and the data
// scripts/auth-wall/generate.mjs recorded from the tools' own exports.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AUTH_WALL, WALL_ICON_COUNT } from '../../src/data/authWall.js'
import { AUTH_WALL_GENERATED as G } from '../../src/data/authWall.generated.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const dir = path.join(root, 'public', 'auth-wall')
const sha = (d) => createHash('sha256').update(d).digest('hex')
const row = (id) => AUTH_WALL.find((r) => r.id === id)

const expectedFiles = AUTH_WALL.flatMap((r) => {
  if (r.kind === 'pair') return [`${r.id}-light.webp`, `${r.id}-dark.webp`]
  return r.asset ? [`${r.id}.webp`] : []
}).sort()

test('the wall has 15 rows and exactly 11 raster files', () => {
  assert.equal(AUTH_WALL.length, 15)
  assert.equal(expectedFiles.length, 11)
  assert.deepEqual(readdirSync(dir).sort(), expectedFiles)
  assert.deepEqual(Object.keys(G.assets).sort(), expectedFiles)
})

test('every WebP is the one the generator recorded, at the recorded size', () => {
  for (const file of expectedFiles) {
    const buf = readFileSync(path.join(dir, file))
    const rec = G.assets[file]
    assert.equal(buf.length, rec.bytes, `${file} size`)
    assert.equal(sha(buf), rec.sha256, `${file} hash`)
    assert.equal(buf.subarray(0, 4).toString(), 'RIFF', `${file} is a RIFF container`)
    assert.equal(buf.subarray(8, 12).toString(), 'WEBP', `${file} is WebP`)
    assert.ok(rec.width === 600 && [270, 400].includes(rec.height), `${file} is 600 wide at the stored aspect`)
  }
  const total = Object.values(G.assets).reduce((n, a) => n + a.bytes, 0)
  assert.ok(total < 150 * 1024, `raster tiles total ${total} bytes`)
})

test('each palette asset was made from its row\'s colours', () => {
  for (const r of AUTH_WALL.filter((x) => x.kind === 'palette')) {
    const rec = G.palettes[r.id]
    assert.ok(rec, `${r.id} recorded`)
    assert.deepEqual(rec.colors, r.colors.map((c) => c.toUpperCase()))
    assert.equal(rec.colorsSha256, sha(r.colors.map((c) => c.toUpperCase()).join(',')))
  }
})

test('font pairs: both themes exist and the body was one of the tool\'s suggestions', () => {
  for (const r of AUTH_WALL.filter((x) => x.kind === 'pair')) {
    const [heading, body] = r.sourceId.split(' + ')
    const rec = G.pairs[r.id]
    assert.equal(rec.heading.family, heading)
    assert.equal(rec.body.family, body)
    assert.ok(rec.suggestions.includes(body), `${r.id}: ${body} not in ${rec.suggestions.join(', ')}`)
    assert.equal(rec.suggestions.length, 6)
  }
})

test('icon tiles carry 9 currentColor SVGs at stroke 2, in the group\'s order', () => {
  for (const r of AUTH_WALL.filter((x) => x.kind === 'icons')) {
    const rec = G.icons[r.id]
    assert.equal(rec.items.length, WALL_ICON_COUNT)
    assert.deepEqual(rec.items.map((i) => i.ref), r.refs)
    for (const it of rec.items) {
      assert.match(it.svg, /^<svg [^>]*viewBox="0 0 \d+ \d+">/)
      assert.match(it.svg, /currentColor/)
      assert.match(it.svg, /stroke-width="2"/)
    }
    assert.equal(rec.sha256, sha(rec.items.map((i) => i.svg).join('\n')))
  }
})

test('tint ramps have 11 steps, 50 to 950, of distinct hexes', () => {
  for (const r of AUTH_WALL.filter((x) => x.kind === 'tint')) {
    const rec = G.tints[r.id]
    assert.equal(rec.source, r.sourceId.toUpperCase())
    assert.deepEqual(rec.steps.map((s) => s.step), ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'])
    assert.ok(rec.steps.every((s) => /^#[0-9A-F]{6}$/.test(s.hex)))
    assert.equal(new Set(rec.steps.map((s) => s.hex)).size, 11)
  }
})

test('code tiles are 7 lines: ":root {" and six size tokens', () => {
  for (const r of AUTH_WALL.filter((x) => x.kind === 'scale')) {
    const { lines } = G.code[r.id]
    assert.equal(lines.length, 7)
    assert.equal(lines[0], ':root {')
    assert.ok(lines.slice(1).every((l) => /^\s+--text-[a-z0-9]+: clamp\(/.test(l)))
  }
  assert.equal(G.code['s-major-third'].base, 16)
  assert.equal(G.code['s-perfect-fourth'].base, 18)
})

test('text in tile art stays at or over the 11px floor at the narrowest tile', () => {
  assert.equal(G.floor, 11)
  assert.equal(G.narrowest, 217)
  for (const r of AUTH_WALL) {
    const f = G.floors[r.id]
    if (['icons', 'tint', 'scale'].includes(r.kind)) continue // drawn by the wall component, at 11px mono
    assert.ok(f, `${r.id} has a recorded floor`)
    if (!f.text) continue
    assert.ok(f.at217 >= 11, `${r.id}: ${f.at217}px at 217px`)
    assert.equal(f.at217, Math.round((f.minTextCssPx * 217 / f.artCssWidth) * 100) / 100)
  }
  assert.ok(row('g-ocean-deep-guide') && G.floors['g-ocean-deep-guide'].at217 >= 11)
})
