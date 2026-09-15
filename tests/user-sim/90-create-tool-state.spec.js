// The 2026-09-15 defect pass over eight Create tools — /create/gradient, tint,
// contrast, font-pair, font-gallery, emoji, aspect-ratio and auto-builder —
// measured on the built preview rather than read out of the source.
//
// Most of what was looked for was already clean, and that is recorded here so
// the next pass does not re-measure it: a keyboard walk of all eight routes at
// 1440 reached 561 tab stops (the emoji grid truncated at the walk’s own
// 160-step cap), every one visible and every one with an accessible
// name; no horizontal overflow at 390 or 1440; no heading-level jump on any of
// them; and driving both catalogue tools to a search that matches nothing left
// a named empty state and a live count on each (font gallery 77 → 0 families,
// emoji 1,655 → 0). What this file pins is the three faults that were real.
//
// `test` comes from ./base.js, not @playwright/test — that is where Google One
// Tap is stubbed on the browser fixture and the Iconify catalogue is served
// from tests/user-sim/fixtures/iconify/.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// ── The composited-ink probe ────────────────────────────────────────────────
//
// Element `opacity` is alpha, and it is NOT the same thing as an alpha inside
// the colour: getComputedStyle().color reports the UNDIMMED value, so a probe
// that reads `color` alone measures a legibility the screen never had. Every
// ancestor's opacity multiplies in, which is why alphaOf walks up.
//
// color-mix() computes to color(srgb …), never rgba(). A parser that matches
// only rgba() returns null, the tint drops out of the ground stack, and the
// element appears to sit on the nearest OPAQUE ancestor — always a kinder
// ground than the real one. Both forms are parsed. Add a colour form here IN
// THE SAME COMMIT you introduce it: an unparsed ground does not fail loudly, it
// stops being measured.
const INK_PROBE = `
  const chan = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  const lum = (c) => 0.2126 * chan(c[0]) + 0.7152 * chan(c[1]) + 0.0722 * chan(c[2])
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
  const parse = (s) => {
    s = s || ''
    const cm = s.match(/color\\(srgb\\s+([^)]+)\\)/)
    if (cm) { const p = cm[1].split(/[\\s/]+/).filter(Boolean).map(Number); return { rgb: [p[0] * 255, p[1] * 255, p[2] * 255], a: p.length > 3 ? p[3] : 1 } }
    const m = s.match(/rgba?\\(([^)]+)\\)/)
    if (!m) return null
    const p = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number)
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 }
  }
  const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a))
  const groundOf = (el) => {
    const stack = []
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null
      const c = parse(cs.backgroundColor)
      if (c && c.a > 0) stack.push(c)
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor)
    let base = root && root.a >= 1 ? root.rgb : [255, 255, 255]
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base)
    return base
  }
  const alphaOf = (el) => {
    let a = 1
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) a *= parseFloat(getComputedStyle(n).opacity)
    return a
  }
  const measure = (sel) => {
    const out = []
    for (const el of document.querySelectorAll(sel)) {
      if (!el.getClientRects().length) continue
      const ground = groundOf(el)
      if (!ground) continue
      const ink = parse(getComputedStyle(el).color)
      if (!ink) continue
      const a = alphaOf(el) * ink.a
      const painted = ink.rgb.map((c, i) => c * a + ground[i] * (1 - a))
      out.push({
        sel,
        text: (el.textContent || '').trim().slice(0, 14),
        size: parseFloat(getComputedStyle(el).fontSize),
        alpha: Math.round(a * 1000) / 1000,
        asPainted: Math.round(ratio(painted, ground) * 1000) / 1000,
        undimmed: Math.round(ratio(ink.rgb, ground) * 1000) / 1000,
      })
    }
    return out
  }
`

/** Assert the route is really on screen before anything is measured off it. */
async function arrived(page, h1) {
  await expect(
    page.getByRole('heading', { level: 1, name: h1 }),
    `the route never arrived — no <h1> reading "${h1}"`,
  ).toBeVisible()
}

// ─────────────────────────────────────────────────────────────────────────────
// /create/tint — an opacity on ink that was chosen for contrast
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/create/tint · the swatch labels keep the contrast they were given', () => {
  // THE CONTROL, and it is the whole reason the test below can be believed.
  // That test is an absence — "nothing falls under 4.5:1" — and an absence
  // passes trivially on a probe that has stopped measuring. This injects two
  // labels onto a ground where the answer is arithmetic rather than opinion:
  // white on #767676 is 4.542:1, and the same white at opacity .6 composites
  // to rgb(200.2) over that ground, which is 2.720:1. A probe blind to
  // element opacity reports 4.54 twice and fails on the second assertion; a
  // probe that has stopped resolving grounds returns nothing and fails on
  // the first.
  test('the ink probe can see an opacity', async ({ page }) => {
    watch(page, 'the probe checking itself')
    await go(page, '/create/tint')
    await arrived(page, 'Tint Scale Generator')

    await page.evaluate(() => {
      const host = document.createElement('div')
      host.id = 'ink-probe-control'
      host.style.cssText = 'background:#767676;color:#ffffff;padding:8px'
      host.innerHTML = '<span class="ink-probe-full">full</span>'
        + '<span class="ink-probe-dim" style="opacity:.6">dimmed</span>'
      document.body.appendChild(host)
    })

    const got = await page.evaluate(`(() => {
      ${INK_PROBE}
      return [...measure('.ink-probe-full'), ...measure('.ink-probe-dim')]
    })()`)

    expect(got, 'the probe returned nothing for two spans it was handed').toHaveLength(2)
    expect(got[0].asPainted, 'white on #767676 at full strength').toBeCloseTo(4.542, 1)
    expect(got[1].asPainted, 'the same white at opacity .6').toBeCloseTo(2.72, 1)
    expect(
      got[1].undimmed - got[1].asPainted,
      'the probe read the dimmed label as if it were undimmed — it is not '
      + 'multiplying element opacity into the paint, so every measurement in '
      + 'this file is reporting a legibility the screen never had',
    ).toBeGreaterThan(1.5)
  })

  // MEASURED 2026-09-15 on the built preview at 1440x900, base colour #EC001A
  // typed into the tool's own hex field: `.tt-cell-hex` reading "#ee041b"
  // painted 4.293:1 on its own swatch and the "Primary" role label 4.410:1 —
  // 2 of 17 labels on one ramp under the 4.5:1 floor that 9px text has to
  // clear. Undimmed, the worst of the 17 was 4.669:1 and none failed.
  //
  // The cause was a pair of CSS rules, `.tt-cell-hex{opacity:.84}` and
  // `.tt-role-sample span{opacity:.8}`, sitting on top of ink that
  // TintTool.jsx computes per swatch with textColorForBg(). Swept over the
  // whole sRGB cube those two cost AA on 14.84% and 20.42% of grounds — see
  // tests/unit/tint-label-ink-not-dimmed.test.js, which owns the arithmetic.
  //
  // MUTATION: put either opacity back in src/styles/pages/tint.css and this
  // goes red naming the label, the ratio and the colour it was painted on.
  test('every swatch label clears AA on a ramp built from #EC001A', async ({ page }) => {
    watch(page, 'a designer building a tint scale from a saturated red')
    await go(page, '/create/tint')
    await arrived(page, 'Tint Scale Generator')

    // #EC001A is not arbitrary: it is the ground the sRGB sweep names as the
    // worst case for a dimmed label, and the tool accepts it as typed.
    const hex = page.getByRole('textbox', { name: 'Base colour 1 hex' })
    await hex.fill('#EC001A')
    await expect(page.locator('.tt-ramp-select')).toContainText('#EC001A source')
    await expect(page.locator('.tt-cell')).toHaveCount(11)

    const measured = await page.evaluate(`(() => {
      ${INK_PROBE}
      return [...measure('.tt-cell-hex'), ...measure('.tt-role-sample span')]
    })()`)

    // POSITIVE CONTROL. "No label failed" is true of a page that rendered no
    // labels, and this suite has shipped exactly that kind of green before.
    expect(
      measured.length,
      'no swatch label was measured at all, so the assertion below is guarding '
      + 'nothing — the ramp did not render, or the classes were renamed',
    ).toBeGreaterThanOrEqual(11)

    const failing = measured.filter((m) => m.asPainted < 4.5)
    expect(
      failing.map((m) => `${m.sel} "${m.text}" ${m.size}px at alpha ${m.alpha}: `
        + `${m.asPainted}:1 as painted (${m.undimmed}:1 undimmed)`),
      'a tint label was painted under the 4.5:1 floor for small text. Its colour '
      + 'is var(--tt-ink), computed per swatch by textColorForBg() against the '
      + 'colour the user chose, so anything dimming it is spending a guarantee '
      + 'with 1% of headroom — see the note above .tt-cell-hex in tint.css',
    ).toEqual([])
  })
})

// ── The accessibility-state probe ───────────────────────────────────────────
//
// Chrome's own computed node for a given element, not the markup. A button can
// carry aria-pressed in the DOM and still surface nothing — a bad value, a
// conflicting role, an aria-hidden ancestor — so the only honest place to read
// a choice is the tree a screen reader is handed. getPartialAXTree by
// backendNodeId rather than filtering getFullAXTree, because the flat array is
// not in document order and a filtered list reports a believable wrong order.
async function axRows(page, selector) {
  const count = await page.evaluate((sel) => {
    const els = [...document.querySelectorAll(sel)]
    els.forEach((el, i) => el.setAttribute('data-axprobe', String(i)))
    return els.length
  }, selector)

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Accessibility.enable')
  await cdp.send('DOM.enable')
  const rows = []
  for (let i = 0; i < count; i += 1) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelector('[data-axprobe="${i}"]')` })
    const { node } = await cdp.send('DOM.describeNode', { objectId: result.objectId })
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { backendNodeId: node.backendNodeId, fetchRelatives: false })
    const n = nodes[0]
    if (!n) continue
    const props = Object.fromEntries((n.properties || []).map((p) => [p.name, p.value?.value]))
    rows.push({
      role: n.role?.value || '',
      name: (n.name?.value || '').trim(),
      pressed: props.pressed,
      selected: props.selected,
      checked: props.checked,
      current: props.current,
    })
  }
  await cdp.detach()
  await page.evaluate(() => document.querySelectorAll('[data-axprobe]').forEach((el) => el.removeAttribute('data-axprobe')))
  return rows
}

/** How a reader is told this control is the chosen one, or `none`. */
const stateOf = (r) => {
  const hit = ['pressed', 'selected', 'checked', 'current']
    .filter((k) => r[k] !== undefined && r[k] !== 'false' && r[k] !== false)
  return hit.length ? hit.map((k) => `${k}=${r[k]}`).join(',') : 'none'
}

// ─────────────────────────────────────────────────────────────────────────────
// /create/gradient — a choice that was painted and never announced
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/create/gradient · the chosen gradient type reaches the tree', () => {
  // THE CONTROL. Every assertion below is about a property being PRESENT, and
  // a probe that has stopped resolving properties reports `undefined` for all
  // three buttons — which is exactly what the defect looked like. This hands
  // the probe three buttons whose answers are known: pressed, not pressed, and
  // a plain button with no state at all. It fails if the probe cannot tell
  // them apart, and it is deliberately NOT a check that the page is correct.
  test('the state probe can tell pressed from unpressed', async ({ page }) => {
    watch(page, 'the probe checking itself')
    await go(page, '/create/gradient')
    await arrived(page, 'Gradient Generator')

    await page.evaluate(() => {
      const host = document.createElement('div')
      host.innerHTML = '<button class="ax-probe-ctl" aria-pressed="true">on</button>'
        + '<button class="ax-probe-ctl" aria-pressed="false">off</button>'
        + '<button class="ax-probe-ctl">plain</button>'
      document.body.appendChild(host)
    })

    const rows = await axRows(page, '.ax-probe-ctl')
    expect(rows, 'the probe returned nothing for three buttons it was handed').toHaveLength(3)
    expect(rows.map((r) => `${r.role} "${r.name}" ${stateOf(r)}`)).toEqual([
      'button "on" pressed=true',
      'button "off" none',
      'button "plain" none',
    ])
  })

  // MEASURED 2026-09-15 on the built preview at 1440x900, signed out, reading
  // Accessibility.getFullAXTree:
  //
  //   button "Linear"  {invalid:false, focusable:true}
  //   button "Radial"  {invalid:false, focusable:true}
  //   button "Conic"   {invalid:false, focusable:true}
  //
  // Three buttons, one of them visibly the chosen one, and not one pressed,
  // selected, checked or current between them. Thirty pixels below in the same
  // inspector the export format group already read tab "CSS" {selected:true} |
  // tab "Tailwind" {selected:false} | tab "SVG" {selected:false}.
  //
  // The assertion is deliberately not "Linear is pressed on arrival": that
  // pins a default rather than the contract. It is that the paint and the tree
  // agree — whichever button carries `is-on` is the one the tree calls
  // pressed — which is the exact thing that was false.
  //
  // MUTATION: drop `aria-pressed={type === t}` from the button in
  // GradientGenerator.jsx and this goes red on all three rows reading `none`.
  test('the type carrying `is-on` is the type the tree calls pressed', async ({ page }) => {
    watch(page, 'someone choosing a gradient type with a screen reader')
    await go(page, '/create/gradient')
    await arrived(page, 'Gradient Generator')

    // The group itself, named from the "Type" label already beside it rather
    // than from a sentence written for it. The name comes back UPPERCASE
    // because `.ggn-label` sets text-transform:uppercase and an accessible
    // name is computed from RENDERED text, not from the source — asserted as
    // measured rather than as written, since asserting "Type" would be
    // asserting something no browser reports.
    const group = await axRows(page, '.ggn-seg')
    expect(group, 'no .ggn-seg was found, so nothing below is being measured').toHaveLength(1)
    expect(`${group[0].role}("${group[0].name}")`).toBe('group("TYPE")')

    for (const want of ['Radial', 'Conic', 'Linear']) {
      await page.locator('.ggn-seg-btn', { hasText: want }).click()

      const painted = await page.locator('.ggn-seg-btn.is-on').innerText()
      expect(painted.trim(), 'the click did not move the painted state').toBe(want)

      const rows = await axRows(page, '.ggn-seg-btn')
      // POSITIVE CONTROL: three buttons, or the loop below is asserting over
      // an empty list and passing for it.
      expect(rows, 'the gradient type group did not render three buttons').toHaveLength(3)
      expect(rows.map((r) => `${r.name} ${stateOf(r)}`)).toEqual(
        ['Linear', 'Radial', 'Conic'].map((t) => `${t} ${t === want ? 'pressed=true' : 'none'}`),
      )
    }
  })
})

// ── The landmark walk ───────────────────────────────────────────────────────
//
// Walked from the ROOT through childIds, so the result is in TREE order.
// `nodes.filter(...)` on the flat array reports a believable wrong order —
// Accessibility.getFullAXTree does not return its nodes in document order.
const LANDMARKS = new Set([
  'region', 'banner', 'complementary', 'contentinfo', 'form', 'main', 'navigation', 'search',
])

async function landmarks(page) {
  const client = await page.context().newCDPSession(page)
  const { nodes } = await client.send('Accessibility.getFullAXTree')
  await client.detach()
  const byId = new Map(nodes.map((n) => [n.nodeId, n]))
  const out = []
  const seen = new Set()
  ;(function walk(node) {
    if (!node || seen.has(node.nodeId)) return
    seen.add(node.nodeId)
    if (node.role?.value && !node.ignored && LANDMARKS.has(node.role.value)) {
      const name = (node.name?.value || '').trim()
      out.push(`${node.role.value}${name ? `("${name}")` : ''}`)
    }
    for (const childId of node.childIds || []) walk(byId.get(childId))
  })(nodes.find((n) => !n.parentId) || nodes[0])
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// The two catalogue tools — results that were in no landmark
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the catalogue tools name the thing they are for', () => {
  // THE CONTROL. Both tests below are shaped "the landmark list is exactly
  // this", and a walk that had stopped resolving NAMES, or stopped resolving
  // ROLES, would produce a consistent wrong answer rather than an error. This
  // injects one named <section> — which is a landmark — one bare <section> —
  // which computes to `generic` and is the whole reason this defect is
  // invisible in the markup — and one named role=group, which is named but is
  // not a landmark. It fails unless the walk reports the first and omits the
  // other two.
  test('the walk can tell a named region from a group and from an unnamed section', async ({ page }) => {
    watch(page, 'the probe checking itself')
    await go(page, '/create/font-gallery')

    const before = await landmarks(page)
    await page.evaluate(() => {
      const main = document.querySelector('main')
      const named = document.createElement('section')
      named.setAttribute('aria-label', 'Probe region')
      main.appendChild(named)
      main.appendChild(document.createElement('section'))
      const group = document.createElement('div')
      group.setAttribute('role', 'group')
      group.setAttribute('aria-label', 'Probe group')
      main.appendChild(group)
    })
    const after = await landmarks(page)

    expect(after.filter((l) => !before.includes(l))).toEqual(['region("Probe region")'])
    expect(
      after.join(' | '),
      'a bare <section> was reported as a landmark; without a name it computes to generic',
    ).not.toContain('region |')
    expect(
      after.join(' | '),
      'a role=group was reported as a landmark; it is named but it is not one',
    ).not.toContain('Probe group')
  })

  // MEASURED 2026-09-15 on the built preview at 1440x900, signed out. Before:
  //
  //   navigation("Primary") | main | navigation("More typography tools")
  //     | contentinfo | navigation("Footer")
  //
  // Four landmarks, none naming content, on a page carrying 24 result cards,
  // 88 controls and ONE heading in the entire document. Searching for
  // something with no matches changed nothing about that list, because there
  // was nothing there to lose.
  //
  // The name arrives UPPERCASE because `.fg-count` sets text-transform at this
  // width and an accessible name is computed from RENDERED text. Asserted as
  // the browser reports it, not as the source reads.
  //
  // MUTATION: drop aria-labelledby from `.fg-results` in FontGallery.jsx and
  // both halves go red quoting the original four-landmark list back.
  test('/create/font-gallery · the results are a region, in both states', async ({ page }) => {
    watch(page, 'a screen-reader user looking for the gallery by landmark')
    await go(page, '/create/font-gallery')

    // POSITIVE CONTROL: the grid was populated before anything was measured.
    // "The region is present" is worth nothing on a page that never rendered.
    await expect(page.locator('.fg-card').first()).toBeVisible()
    const cards = await page.locator('.fg-card').count()
    expect(cards, 'the gallery rendered no cards at all').toBeGreaterThan(10)

    expect(await landmarks(page)).toEqual([
      'navigation("Primary")',
      'main',
      'region("77 FAMILIES")',
      'navigation("More typography tools")',
      'contentinfo',
      'navigation("Footer")',
    ])

    // AND IT SURVIVES THE EMPTY STATE. A section wrapped around only the
    // populated arm vanishes exactly when a reader most needs to find out why
    // there are no results — the fault fixed on /discover/palettes.
    await page.locator('.fg-controls input').first().fill('zzzzqqq')
    await expect(page.locator('.fg-empty')).toBeVisible()
    await expect(page.locator('.fg-card')).toHaveCount(0)

    expect(await landmarks(page)).toEqual([
      'navigation("Primary")',
      'main',
      'region("0 FAMILIES MATCHING “ZZZZQQQ”")',
      'navigation("More typography tools")',
      'contentinfo',
      'navigation("Footer")',
    ])
  })

  // MEASURED the same way. Before:
  //
  //   navigation("Primary") | main | contentinfo | navigation("Footer")
  //
  // on a surface that mounts 391 of 1,655 cells into the viewport and offers
  // 122 tab stops at 390px. The tabpanel it lives in is named ("Emoji") but a
  // tabpanel is not a landmark and never appears in this list.
  //
  // MUTATION: drop aria-labelledby from `.emoji-results` in EmojiLibrary.jsx
  // and both halves go red on the four-landmark list.
  test('/create/emoji · the grid is a region, in both states', async ({ page }) => {
    watch(page, 'a screen-reader user looking for the emoji grid by landmark')
    await go(page, '/create/emoji')

    // POSITIVE CONTROL: cells are on screen before the landmark list is read.
    await expect(page.locator('.emoji-virt')).toBeVisible({ timeout: 20000 })
    const cells = await page.locator('.emoji-vrow button').count()
    expect(cells, 'the emoji grid mounted no cells at all').toBeGreaterThan(50)

    expect(await landmarks(page)).toEqual([
      'navigation("Primary")',
      'main',
      'region("Showing all 1655 emojis")',
      'contentinfo',
      'navigation("Footer")',
    ])

    await page.locator('.emoji-toolbar input').first().fill('zzzzqqq')
    await expect(page.locator('.pl-empty')).toBeVisible({ timeout: 20000 })
    await expect(page.locator('.emoji-vrow button')).toHaveCount(0)

    expect(await landmarks(page)).toEqual([
      'navigation("Primary")',
      'main',
      'region("0 emojis for zzzzqqq")',
      'contentinfo',
      'navigation("Footer")',
    ])
  })
})
