// The Gradient Generator's stop actions: the swatch in the stop list opens that
// stop's colour picker, and right-clicking a stop opens a tints menu whose rows
// apply for Pro accounts and raise the Pro modal for free ones.
//
// The rendered behaviour (the picker opening, the menu position, focus return)
// needs a browser, so these read the sources and the ramp the menu offers.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { tintRampForHex } from '../../src/utils/tintRamp.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n')

test('each stop row\'s swatch is a colour-picker trigger for that stop', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  assert.match(src, /ariaLabel=\{`Pick stop \$\{i \+ 1\} colour`\}/)
  assert.match(src, /triggerClassName="grd-stop-swatch"/)
  assert.match(src, /onChange=\{\(hex\) => updateStops\(targetsFor\(i\), \{ color: hex\.toUpperCase\(\) \}\)\}/)
})

test('the stop row keeps a separate control to select the stop', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  assert.match(src, /className="grd-stop-select"[\s\S]*?aria-label=\{`Select stop \$\{i \+ 1\}, /)
})

test('right-click on a stop row and on a rail handle opens the tints menu', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  assert.match(src, /openTintMenu\(e, i, e\.currentTarget\.querySelector\('\.grd-stop-select'\)\)/)
  assert.match(src, /onContextMenu=\{\(e\) => openTintMenu\(e, s\.i\)\}/)
})

test('a right-button press on a handle is not the start of a drag', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  assert.match(src, /const dragStop = useCallback\(\(e, idx\) => \{\n\s+if \(e\.button != null && e\.button > 0\) return/)
})

test('the tints menu locks for a free account and gates on press', () => {
  const menu = read('src/components/tool/StopTintMenu.jsx')
  assert.match(menu, /aria-disabled=\{!isPro \|\| undefined\}/)
  assert.match(menu, /if \(!isPro\) \{ onGate\(\); onClose\(\); return \}/)
  const page = read('src/pages/GradientGenerator.jsx')
  assert.match(page, /gate: 'gradient-stop-tints'/)
  assert.match(page, /onGate=\{gateTints\}/)
  assert.match(page, /isPro=\{isPro\}/)
})

test('a tint is applied through updateStop, so the gallery edit guard still applies', () => {
  const src = read('src/pages/GradientGenerator.jsx')
  assert.match(src, /updateStop\(tintMenu\.idx, \{ color: hex \}\)/)
})

test('the menu offers eleven tints, light to dark, each a valid six-digit hex', () => {
  const ramp = tintRampForHex('#7C3AED', 11)
  assert.equal(ramp.length, 11)
  assert.deepEqual(ramp.map((t) => t.label), ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'])
  for (const t of ramp) assert.match(t.hex, /^#[0-9a-f]{6}$/i, t.label)
  assert.ok(ramp[0].L > ramp[10].L, 'the ramp should run from light to dark')
})

test('the tints menu does not use transition: all', () => {
  assert.doesNotMatch(read('src/styles/pages/gradient.css'), /transition:\s*all/)
})
