// PER-TOOL ACTIVATION MUST FIRE FROM THE EXPORT, NOT FROM SOMETHING NEAR IT.
//
// P-001 defines activation as "saving or exporting a palette, gradient or type
// scale". Saving was instrumented in ProjectContext and the style-guide export
// in ExportPanel; the three workbenches' own exports were the missing half.
//
// The pipeline item rejected two shapes before this one, and this file exists to
// keep them rejected:
//
//   · TAGGING EVERY COPY CALL SITE. PaletteBuilder has eight copy affordances,
//     TypeScale three. Tagging each guarantees the ninth is added without one
//     and the count under-reports forever — the exact failure trackUpgradeGate
//     was created to avoid.
//   · SNIFFING THE PAYLOAD. Deciding "this string looks like a CSS export" is
//     fragile and would start counting a hex copy the day the format changed.
//
// What shipped instead: ONE declared export hook per tool, and the decision in
// CreateTool, where the single onCopy already lives. src/config/
// activationExports.js is the one table; this file is what makes it CHECKED, in
// both directions — a tool cannot call the hook without a row, and a row cannot
// name a tool that does not call it.
//
// AND IT CHECKS THE CALL SITE, NOT A HELPER. Three fixes this week shipped
// beside a test that exercised a helper in isolation, so reverting the real call
// site passed the whole suite. Every assertion below reads the component that
// actually renders the button, or CreateTool's actual wiring. The rendered half
// — that clicking the real button in a real browser writes the counter — is
// tests/user-sim/56-activation-events.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ACTIVATION_EXPORTS, ACTIVATION_EXPORT_SOURCES } from '../../src/config/activationExports.js'

const ROOT = process.cwd()
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const CREATE_TOOL = read('src/pages/CreateTool.jsx')
const CODE = stripComments(CREATE_TOOL)
const ROUTES = Object.keys(ACTIVATION_EXPORTS)

test('the table is not empty', () => {
  // Positive control. Every per-route assertion below loops over ROUTES; an
  // emptied table would make all of them pass without checking anything.
  assert.ok(ROUTES.length >= 3, `expected the three workbenches, found ${ROUTES.length}`)
  assert.deepEqual(
    Object.keys(ACTIVATION_EXPORT_SOURCES).sort(),
    ROUTES.slice().sort(),
    'every declared route must name the component file that owns its hook',
  )
})

test('every declared route is a live Create tool', () => {
  // A row naming a route the dispatcher never mounts would be an activation
  // that can never fire — a metric the product cannot produce.
  for (const route of ROUTES) {
    assert.match(
      CODE,
      new RegExp(`'${route}':\\s*\\w+`),
      `${route} is declared for activation but is not in CreateTool's LIVE_TOOLS`,
    )
  }
})

test('every declared tool calls the export hook exactly once', () => {
  // ONE call site per tool is the whole shape. Two would be two places to
  // forget; zero means the row is decorative.
  for (const route of ROUTES) {
    const src = stripComments(read(ACTIVATION_EXPORT_SOURCES[route]))
    const calls = src.match(/onExport\?\.\(/g) || []
    assert.equal(
      calls.length,
      1,
      `${ACTIVATION_EXPORT_SOURCES[route]} must invoke onExport exactly once, found ${calls.length}`,
    )
  }
})

test('no component invokes the hook without a row in the table', () => {
  // The other direction. A tool that started calling onExport without being
  // declared would copy silently and never be counted.
  const declared = new Set(Object.values(ACTIVATION_EXPORT_SOURCES))
  const offenders = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(rel)
      else if (/\.jsx?$/.test(entry.name)) {
        if (rel === 'src/pages/CreateTool.jsx' || rel === 'src/config/activationExports.js') continue
        if (declared.has(rel)) continue
        if (/onExport\?\.\(/.test(stripComments(read(rel)))) offenders.push(rel)
      }
    }
  }
  walk('src')
  assert.deepEqual(offenders, [], 'these call the export hook but have no row in ACTIVATION_EXPORTS')
})

test('the hook falls back to a plain copy when it is not provided', () => {
  // Mounted outside CreateTool — or mounted on a route with no row — the tool
  // must still COPY. An export hook that silently stopped copying would trade a
  // missing metric for a broken button.
  for (const route of ROUTES) {
    assert.match(
      stripComments(read(ACTIVATION_EXPORT_SOURCES[route])),
      /\{\s*onCopy,\s*onExport = onCopy,/,
      `${ACTIVATION_EXPORT_SOURCES[route]} must default onExport to onCopy`,
    )
  }
})

test('CreateTool resolves the name from the table, not from the tool', () => {
  assert.match(CODE, /import \{ ACTIVATION_EXPORTS \} from '\.\.\/config\/activationExports'/)
  assert.match(
    CODE,
    /const activationId = ACTIVATION_EXPORTS\[normPath\(location\.pathname\)\] \|\| null/,
    'the decision must be a table lookup in CreateTool',
  )
  assert.match(CODE, /<LiveTool onCopy=\{copy\} onExport=\{exportCopy\}/, 'the hook must reach the mounted tool')
})

test('the event fires only after the clipboard write actually succeeded', () => {
  // The honesty rule. useClipboard resolves false when the browser has no
  // clipboard, when the value is empty, and when writeText rejects. Counting
  // the CLICK would report exports that never left the page — an analytics
  // event for an action that did not happen.
  const fn = CODE.slice(CODE.indexOf('const exportCopy'), CODE.indexOf('const group ='))
  assert.match(fn, /const ok = await copy\(value\)/, 'the hook must await the real clipboard write')
  assert.match(fn, /if \(ok === true && activationId\)/, 'and fire only on a resolved-true write')
  assert.match(fn, /trackActivation\(activationId, 'export'\)/)
  assert.match(fn, /return ok/, 'and still hand the result back so callers can show their own failure state')
})

test('the ordinary copy affordances are NOT counted as activations', () => {
  // The line between "completed a piece of work" and "looked something up".
  // PaletteBuilder still copies single hexes, tint rows and a share link
  // through plain onCopy; if those had been swept into the hook, activation
  // would measure fidgeting and the one number that says whether any of this
  // works would be inflated.
  const pb = stripComments(read('src/pages/PaletteBuilder.jsx'))
  // Five since the drawn board: the swatch's hex, its actions
  // menu's Copy hex, a tint row, the share link and the hex list.
  const plainCopies = (pb.match(/onCopy\?\.\(/g) || []).length
  assert.ok(plainCopies >= 5, `expected PaletteBuilder's lookup copies to stay on onCopy, found ${plainCopies}`)
  assert.match(pb, /onCopy\?\.\(adjusted\[i\](\.toUpperCase\(\))?\)/, 'copying one hex must stay a lookup')
  assert.match(pb, /onCopy\?\.\(shareLink\(\)\)/, 'copying a share link must stay a lookup')

  const ts = stripComments(read('src/pages/TypeScale.jsx'))
  assert.match(ts, /onCopy\?\.\(importUrl\)/, 'copying the font import URL must stay a lookup')
})

test('the palette routes both of its CSS buttons through the single hook', () => {
  // "Copy CSS variables" in the save menu and "Copy CSS" in the footer are the
  // same export reached two ways, so they share one function rather than each
  // calling the hook.
  const pb = stripComments(read('src/pages/PaletteBuilder.jsx'))
  assert.match(pb, /const copyCssExport = \(\) => onExport\?\.\(cssExport\)/)
  assert.match(pb, /copyCssExport\(\); setSaveOpen\(false\)/, 'the save menu must use it')
  // The optional glyph is the <IcoCopy /> the footer button gained so it stops
  // reading as a text field — it and `.plb-hexfield` shared a white ground and
  // the identical border. What this line defends is the ONCLICK, not the label:
  // the anchor on "Copy CSS" is only what tells the footer button apart from the
  // save-menu row, whose handler is a closure.
  assert.match(pb, /onClick=\{copyCssExport\}>\s*(<(Ico\w+|ToolIcon)[^>]*\/>\s*)?(<span>)?Copy CSS</, 'the footer button must use it')
  assert.equal((pb.match(/onCopy\?\.\(cssExport\)/g) || []).length, 0, 'no CSS export may bypass the hook')
})

test('activation stays separate from ordinary tool usage', () => {
  // trackActivation must not be folded into trackToolAction: the moment
  // ordinary usage can inflate it, it stops answering the question it exists
  // for.
  const analytics = read('src/utils/analytics.js')
  assert.match(analytics, /export function trackActivation\(toolId, kind = 'save'\)/)
  assert.doesNotMatch(
    stripComments(analytics).slice(stripComments(analytics).indexOf('export function trackToolAction')),
    /trackActivation\(/,
    'trackToolAction must never raise an activation',
  )
})

test('no personal field reaches the aggregate payload', () => {
  // analytics-daily is a deliberately aggregate per-day counter collection. The
  // export activation adds `activation__<tool>__export` and nothing else — no
  // email, no uid, no palette contents.
  const analytics = stripComments(read('src/utils/analytics.js'))
  const fn = analytics.slice(analytics.indexOf('export function trackActivation'), analytics.indexOf('export function startTimeToValue'))
  assert.doesNotMatch(fn, /\bemail\b|\buid\b|currentUser\.(email|uid|displayName)/, 'no personal field in an activation payload')
  assert.match(fn, /recordAggregateTool\(`activation__\$\{id\}__\$\{k\}`\)/)
  // And the id is bounded, so a tool name can never carry a payload into a
  // Firestore field path.
  assert.match(fn, /String\(toolId \|\| 'unknown'\)\.slice\(0, 48\)/)
})
