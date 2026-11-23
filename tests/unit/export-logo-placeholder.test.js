// The logo placeholder is the UIL4B mark as a quiet watermark, not a dashed "Your logo goes here" box.
// Checks: every slot in a guide is labelled "Logo placeholder", has the mark in one tone at low opacity and no dashed border;
// the standalone placeholder svg in a zip says the same. Break: put the dashed border back in slotHtml, or the old aria-label, in engine/logo.js.
// Test seam: renderThemeExport (api/_lib/exportThemeRoute.js).
import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { renderThemeExport } from '../../api/_lib/exportThemeRoute.js'

test('guide slots are a labelled watermark, never a dashed box', async () => {
  const { html } = await renderThemeExport({ theme: '27-swissfield', row: 'guide', format: 'pdf' })
  const slots = [...html.matchAll(/<div class="logo-slot"[^>]*>/g)].map((m) => m[0])
  assert.ok(slots.length >= 6, 'the guide draws its slots')
  for (const s of slots) {
    assert.match(s, /aria-label="Logo placeholder"/)
    assert.doesNotMatch(s, /dashed|border:/)
  }
  assert.doesNotMatch(html, /Logo slot|Your logo goes here/)
  assert.match(html, /<svg[^>]*aria-hidden="true"[^>]*opacity:0\.16/)
})

test('the placeholder svg file is the mark at low opacity with a small label', async () => {
  const { zip } = await renderThemeExport({ theme: '01-presentation', row: 'ui-kit', format: 'html' })
  const z = await JSZip.loadAsync(zip)
  const name = Object.keys(z.files).find((f) => f.endsWith('logo-slot.svg'))
  assert.ok(name, 'the kit carries the placeholder file')
  const svg = await z.file(name).async('string')
  assert.match(svg, /aria-label="Logo placeholder"/)
  assert.match(svg, /fill-opacity="0\.16"/)
  assert.match(svg, />Your logo</)
  assert.doesNotMatch(svg, /stroke-dasharray|goes here/)
})
