// `aria-modal="true"` is a PROMISE to assistive technology: everything outside
// this element is inert. Six of seven dialogs in the app made that promise and
// trapped nothing — Tab walked straight out into the page behind, the
// background scrolled, and closing dropped focus to the top of the document.
//
// Measured 2026-08-15, before the fix:
//
//   ProUpgradeModal   dialog  esc  --    --       --      (the upgrade surface)
//   LoginPopup        dialog  esc  lock  restore  trap    (the only correct one)
//   FeedbackModal     dialog  esc  lock  --       --      (on every page)
//   UIPreviewModal    dialog  esc  lock  --       --
//   ColorPickerPop    dialog  esc  --    --       --
//   PromptModal       dialog  esc  --    --       --
//   UIKitGuide        dialog  --   --    --       --      (a new user's first screen)
//
// Escape alone is the easy half. The trap is the half everyone skipped, and it
// is the half the attribute actually claims. This test exists so the next
// dialog cannot be added without it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const SRC = path.join(process.cwd(), 'src')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return /\.jsx$/.test(entry.name) ? [full] : []
  })
}

// The invariant is "this dialog traps focus", not "this dialog imports our
// hook". Four surfaces had already written a correct trap by hand before the
// shared hook existed — LoginPopup, ExportPanel, PillNav and IconLibrary — and
// two of those carry extra behaviour the hook does not (PillNav and ExportPanel
// also pause the app-wide Lenis so its rAF loop cannot fight the locked body).
// Rewriting working code to satisfy a test is how a test starts causing bugs,
// so both routes count. A local trap is recognised by it intercepting Tab.
const TRAPS_FOCUS = /useModalDialog|key !== 'Tab'|key === 'Tab'/

// `[aria-modal="true"]` also appears inside querySelector strings — PaletteBuilder
// uses one to suppress its spacebar shortcut while any dialog is open. That is a
// READ, not a declaration, and must not be counted as one.
const DECLARES_MODAL = /(?<!\[)aria-modal=(?:"true"|\{true\})/

test('every dialog that claims aria-modal actually traps focus', () => {
  const offenders = []
  for (const file of walk(SRC)) {
    const src = fs.readFileSync(file, 'utf8')
    if (!DECLARES_MODAL.test(src)) continue
    if (TRAPS_FOCUS.test(src)) continue
    offenders.push(path.relative(process.cwd(), file))
  }
  assert.deepEqual(offenders, [],
    'aria-modal="true" promises the rest of the page is inert. These declare it and trap '
    + 'nothing, so Tab walks straight out into the page behind:\n  ' + offenders.join('\n  '))
})

test('the guard above sees a real population, so it cannot pass by finding nothing', () => {
  // A file-scanning test that silently matches zero files is green and worthless.
  const dialogs = walk(SRC).filter(f => DECLARES_MODAL.test(fs.readFileSync(f, 'utf8')))
  assert.ok(dialogs.length >= 10, `expected the app's dialog surfaces, found ${dialogs.length}`)
})

test('the shared hook still provides all four parts of the contract', () => {
  // Guards against the hook being hollowed out while every consumer still
  // imports it and the test above stays green.
  const hook = fs.readFileSync(path.join(SRC, 'hooks/useModalDialog.js'), 'utf8')
  assert.match(hook, /document\.body\.style\.overflow = 'hidden'/, 'scroll lock')
  assert.match(hook, /e\.key === 'Escape'/, 'Escape closes')
  assert.match(hook, /e\.key !== 'Tab'/, 'Tab is intercepted for the focus trap')
  assert.match(hook, /opener\.focus\(\)/, 'focus is restored to the opener')
})

// ── Invented proof ───────────────────────────────────────────────────────────
// The upgrade dialog carried five filled stars above "Loved by designers who'd
// rather build than tab-hop." There are no reviews, no ratings and nobody
// attributed to that sentence. It sat on the one surface where a user decides
// whether to trust us with money.
test('the upgrade dialog makes no claim we cannot source', () => {
  const src = fs.readFileSync(path.join(SRC, 'components/ProUpgradeModal.jsx'), 'utf8')
  const body = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.ok(!/Loved by designers/.test(body), 'the invented testimonial is back')
  assert.ok(!/ui-pro-proof-stars/.test(body), 'the unsourced star rating is back')
})

test('the upgrade dialog offers an explicit way to decline', () => {
  // Leaving "no" as the only choice without a button is the shape of a dark
  // pattern even when nothing behind it is coercive.
  const src = fs.readFileSync(path.join(SRC, 'components/ProUpgradeModal.jsx'), 'utf8')
  assert.match(src, /ui-pro-decline/, 'the decline control is gone')
})
