// The headline's FIRST painted keyframe must leave part of the headline inside
// its clip, or the homepage LCP moves and nobody sees it move.
//
// Measured 2026-09-08 (scripts/home-field-metrics.mjs profile, 5 cold runs):
// the LCP entry for SPAN.home-hero-line-in lands 19-22 ms after the clip-up's
// own startTime — on the hero's first frame — with a recorded size of 2369 px².
// That size is a sliver: the clip-up starts at translate3d(0,110%,0) inside an
// overflow:hidden `.home-hero-line`, so on frame 0 the line box sits .098em
// (10% of a .98 line-height) below the content box, and only the `.28em` of
// descender padding INSIDE the mask keeps ~.18em of it painted. Chrome records
// a text block's LCP on the first frame it paints with non-zero clipped area,
// and never re-sizes it, so that sliver is what pins LCP to the first frame.
// Push the `from` past 100% + padding (or shrink the padding under the
// overshoot) and Chrome waits for the first VISIBLE frame instead: the 80 ms
// delay plus a frame, ~100 ms on that profile, with no visual change at all.
//
// This reads the shipped CSS and does the arithmetic. The rendered check is
// tests/user-sim/65-hero-first-paint.spec.js, which asks the same question of
// the real page at the animation's own time 0. Neither asserts a millisecond.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')
const css = stripCss(fs.readFileSync(path.join(process.cwd(), 'src/styles/global.css'), 'utf8'))

const num = (re, where) => {
  const m = re.exec(css)
  assert.ok(m, `could not read ${where} from global.css — the hero paint path moved; update this test with it`)
  return Number(m[1])
}

test('the clip-up starts inside the descender padding, so the headline paints on frame 0', () => {
  // How far below its content box the line box sits on the first keyframe.
  const fromPct = num(/@keyframes home-hero-clip-up\{from\{transform:translate3d\(0,\s*(-?[\d.]+)%,\s*0\)\}/, "the clip-up's from-translate")
  assert.ok(fromPct >= 100, `the clip-up starts at ${fromPct}% — the entrance no longer masks the headline, which is a different (visible) design change`)
  const overshootLines = fromPct / 100 - 1

  // The padding that lives INSIDE the overflow:hidden mask, in em of the h1.
  const lineRule = /\.home-hero-line\{([^}]*)\}/.exec(css)?.[1] || ''
  const pad = Number(/(?:^|;)\s*padding-(?:block|bottom)\s*:\s*([\d.]+)em/.exec(lineRule)?.[1] || 0)
  assert.ok(pad > 0, '.home-hero-line has no em padding-block — the mask has no descender room and the first frame is fully clipped')

  // Every line-height the h1 ships at, because the overshoot is a fraction of
  // the line box: the tallest line box is the one that leaves the least inside.
  const h1Rules = [...css.matchAll(/\.home-hero-h1\{([^}]*)\}/g)].map((m) => m[1])
  assert.ok(h1Rules.length >= 1, 'no .home-hero-h1 rule')
  const lineHeights = h1Rules
    .map((r) => /(?:^|;)\s*line-height\s*:\s*([\d.]+)(?:;|$)/.exec(r)?.[1])
    .filter(Boolean).map(Number)
  assert.ok(lineHeights.length >= 1, '.home-hero-h1 has no unitless line-height to size the overshoot from')

  for (const lh of lineHeights) {
    const overshootEm = overshootLines * lh
    const insideEm = pad - overshootEm
    assert.ok(
      insideEm > 0,
      `at line-height ${lh} the clip-up's ${fromPct}% start puts the line box ${overshootEm.toFixed(3)}em below its `
      + `content box, past the ${pad}em of padding inside the mask: 0em of the headline is inside the clip on `
      + 'frame 0, so Chrome records LCP on the first VISIBLE frame — the delay plus a frame later. '
      + 'Keep from-translate under (100% + padding-block / line-height), or shorten nothing and widen the padding.',
    )
  }
})

test('the fill mode still supplies the from-keyframe before the delay ends', () => {
  // `both` is what makes frame 0 the `from` keyframe at all. Without it the
  // headline paints in place for 80 ms and then jumps — a visible flash — and
  // the geometry above would be true of the wrong frame.
  const line = /\.home-hero-line-in\{animation:([^}]*)\}/.exec(css)?.[1] || ''
  assert.match(line, /\bhome-hero-clip-up\b/, '.home-hero-line-in no longer runs the clip-up')
  assert.match(line, /\bboth\b/, 'animation-fill-mode must be both')
})
