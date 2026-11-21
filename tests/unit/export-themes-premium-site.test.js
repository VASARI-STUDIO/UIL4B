// A theme that has a multi-page site serves it from the themed export: the brand guidelines zip holds index.html and a page each, the UI
// kit zip holds the same beside the code package. A theme with no site keeps the single stacked document.
//
// What is pinned here, and the change that makes each fail:
//  1. THE GUIDELINES ZIP IS A SITE: index.html, many pages, a stylesheet, a script and the fonts; no single-file document.
//     Break: drop the premiumSite('guide', ...) line in renderThemeExport (api/_lib/exportThemeRoute.js).
//  2. THE UI KIT ZIP IS A SITE BESIDE THE CODE PACKAGE: the same, and the tokens, components and example files are still there.
//     Break: drop the premiumSite('kit', ...) line, or let the site's files replace the code package's.
//  3. THE PAGES ARE WIRED: every local link and asset a page names is in the zip, and no slot placeholder is left unswapped.
//     Break: write a page with fs-style put() skipped (a file map entry that bypasses put() in guide-site-build.js or kit-site-build.js).
//  4. A THEME WITH NO SITE KEEPS THE DOCUMENT.
//     Break: serve a site for every theme without checking T.guideSite / T.kitSite.
//  5. THE GUIDE AND THE KIT LINK TO EACH OTHER ACROSS THEIR ZIPS: a link out of one zip names the other zip's top folder and a
//     page that is in it, so both work when unpacked side by side. Break: drop relinkSites() in exportThemeRoute.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'

const DESIGN = {
  palette: { base: '#2F6F5E', harmony: 'auto', colors: ['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27'] },
  fonts: { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } },
}
const USERS = { 'pro-1': { subscription: { status: 'active', currentPeriodEnd: Date.now() + 10 * 86_400_000 } } }

function fakeRes() {
  const res = {
    headers: {},
    setHeader(k, v) { res.headers[k] = v },
    status(code) { res.code = code; return res },
    json(body) { res.body = body; return res },
    send(buf) { res.buffer = buf; return res },
  }
  return res
}

const deps = () => ({
  verifyIdToken: async () => ({ uid: 'pro-1' }),
  readUser: async (uid) => USERS[uid],
  consume: async () => ({ allowed: true, remaining: 10, retryAfter: 0 }),
})

// The export zip as { name: text-or-buffer-size } with the one top folder taken off.
async function exportZip(theme, row, withTop = false) {
  const res = fakeRes()
  await serveExportDocument({ headers: { authorization: 'Bearer tok' }, body: { theme, row, format: row === 'slides' ? 'html' : 'zip', projectName: 'Tide & Co.', design: DESIGN } }, res, deps())
  assert.equal(res.code, 200, `${theme} ${row}`)
  const zip = await JSZip.loadAsync(res.buffer)
  const out = {}
  let top = ''
  for (const [name, f] of Object.entries(zip.files)) {
    if (f.dir) continue
    top = name.slice(0, name.indexOf('/'))
    out[name.slice(name.indexOf('/') + 1)] = /\.(html|css|js|md|json|ts|txt|svg)$/.test(name) ? await f.async('string') : (await f.async('uint8array')).length
  }
  return withTop ? { top, files: out } : out
}

const htmlPages = (files) => Object.keys(files).filter((n) => /^[^/]+\.html$/.test(n))

// Every href and src a page names that stays in the site must be a file in the zip (an anchor is checked only for its file).
function brokenLinks(files, pages) {
  const bad = []
  for (const p of pages) {
    for (const m of files[p].matchAll(/\b(?:href|src)="([^"#?]+)[^"]*"/g)) {
      const target = m[1]
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\.\.\/)/i.test(target)) continue
      const rel = target.replace(/^\.\//, '')
      if (!(rel in files)) bad.push(`${p} -> ${target}`)
    }
  }
  return bad
}

test('the brand guidelines of a theme with a site is that site: an index, a page each, a stylesheet, a script and the fonts', async () => {
  const files = await exportZip('21-presentation', 'slides')
  const pages = htmlPages(files)
  assert.ok(files['index.html'], 'index.html')
  assert.ok(pages.length > 10, `many pages, got ${pages.length}`)
  assert.ok(files['assets/guidelines.css'] && files['assets/guidelines.js'], 'stylesheet and script')
  assert.ok(Object.keys(files).some((n) => /^assets\/fonts\/.+\.woff2$/.test(n)), 'fonts')
  assert.ok(!('brand-guidelines.html' in files), 'no single-file document')
  assert.match(files['index.html'], /<link rel="stylesheet" href="assets\/guidelines\.css">/)
  assert.match(files['assets/guidelines.css'], /#2F6F5E/i, 'the brand colour is in the stylesheet')
  assert.deepEqual(brokenLinks(files, pages), [])
  for (const p of pages) assert.ok(!/[]/.test(files[p]), `${p}: a slot placeholder was left in the page`)
})

test('the UI kit of a theme with a site is that site beside the code package', async () => {
  const files = await exportZip('21-presentation', 'ui-kit')
  const pages = htmlPages(files)
  assert.ok(files['index.html'], 'index.html')
  assert.ok(pages.length > 10, `many pages, got ${pages.length}`)
  assert.ok(files['assets/kit.css'] && files['assets/kit.js'], 'stylesheet and script')
  assert.ok(Object.keys(files).some((n) => /^assets\/fonts\/.+\.woff2$/.test(n)), 'fonts')
  assert.ok(!('ui-kit.html' in files), 'no single-file document')
  for (const f of ['tokens.css', 'tokens.json', 'tailwind.css', 'tokens.ts', 'components.css', 'example.html', 'README.md']) assert.ok(f in files, `${f} (code package) missing`)
  assert.deepEqual(brokenLinks(files, pages.filter((p) => p !== 'example.html')), [])
  for (const p of pages) assert.ok(!/[]/.test(files[p]), `${p}: a slot placeholder was left in the page`)
})

test('a theme with no site keeps the single document in both rows', async () => {
  const guide = await exportZip('04-standards', 'slides')
  assert.ok(guide['brand-guidelines.html'], 'brand-guidelines.html')
  assert.ok(!('index.html' in guide))
  const kit = await exportZip('04-standards', 'ui-kit')
  assert.ok(kit['ui-kit.html'], 'ui-kit.html')
  assert.ok(!('index.html' in kit))
})

test('the guide and the UI kit link to each other by the top folder of the other zip', async () => {
  for (const theme of ['28-riso', '32-dieline']) {
    const guide = await exportZip(theme, 'slides', true)
    const kit = await exportZip(theme, 'ui-kit', true)
    const out = (from, other) => {
      const seen = []
      for (const p of htmlPages(from.files)) {
        for (const m of from.files[p].matchAll(/\b(?:href|src)="\.\.\/([^"#?]+)/g)) {
          const [dir, ...rest] = m[1].split('/')
          seen.push(m[1])
          assert.equal(dir, other.top, `${theme} ${p} -> ../${m[1]}`)
          assert.ok(rest.join('/') in other.files, `${theme} ${p} -> ../${m[1]} is not in the other zip`)
        }
      }
      return seen
    }
    assert.ok(out(guide, kit).length > 0, `${theme}: the guide links to the kit`)
    assert.ok(out(kit, guide).length > 0, `${theme}: the kit links to the guide`)
  }
})

// The design review of the premium site (r1) found these; each is one thing a later edit could quietly bring back.
test('the palette page counts and lists each colour once, and carries no writing-rule text', async () => {
  const files = await exportZip('21-presentation', 'slides')
  const page = files['palette.html']
  const distinct = new Set(DESIGN.palette.colors.map((c) => c.toLowerCase()))
  const words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][distinct.size]
  assert.match(page, new RegExp(`>${words} colours<`), 'the headline counts the distinct colours (the label colour on the action is the canvas: it must not make a sixth)')
  assert.equal((page.match(/class="ht-field[ "]/g) || []).length, distinct.size, 'one field a colour, each once')
  assert.doesNotMatch(page, /Writing rule/, 'a writing-rule slot in the colour strip')
})

test('the type spec prints whole pixels, and the kit stylesheet sizes its code blocks by the border box', async () => {
  const guide = await exportZip('21-presentation', 'slides')
  assert.doesNotMatch(guide['type-in-use.html'], /\b\d+\.\d+ px\b/, 'a fractional px in the type spec')
  const kit = await exportZip('21-presentation', 'ui-kit')
  assert.match(kit['assets/kit.css'], /\.ht--kit\s*,[^{]*\*[^{]*\{\s*box-sizing:\s*border-box/, 'a border-box rule (a code block overflowed its column at 390 without it)')
  assert.doesNotMatch(kit['buttons.html'], /\n\s+&lt;path/, 'the source indent of an svg printed inside the code sample')
})

test('the kit tokens are drawn from the palette: no stock blue, and no pure white as a surface or a label', async () => {
  const kit = await exportZip('21-presentation', 'ui-kit')
  const light = kit['tokens.css'].split('\n[data-theme="dark"]')[0] // the first line's comment names the dark selector too
  for (const token of ['--focus', '--info', '--raised', '--action-label']) {
    const m = new RegExp(token + ': *(#[0-9A-Fa-f]{6})').exec(light)
    assert.ok(m, `${token} in tokens.css`)
    assert.notEqual(m[1].toUpperCase(), '#2563EB', `${token} is the stock blue`)
    assert.notEqual(m[1].toUpperCase(), '#FFFFFF', `${token} is pure white`)
  }
})

// Design review round 2 (r2) found these; each is one thing a later edit could quietly bring back.
test('the slide is never hidden at narrow widths, and every page opens with a skip link to the main area', async () => {
  for (const row of ['slides', 'ui-kit']) {
    const files = await exportZip('21-presentation', row)
    const css = Object.entries(files).filter(([n]) => /^assets\/.+\.css$/.test(n)).map(([, t]) => t).join('\n')
    assert.doesNotMatch(css, /\.ht-stage--reflow[^{}]*\{[^}]*display:\s*none/, `${row}: a reflow slide hidden by display:none (the palette and type values went missing at 768 and 390)`)
    for (const p of htmlPages(files).filter((n) => n !== 'example.html')) {
      assert.match(files[p], /<a class="ht-skip" href="#ht-main">/, `${p}: no skip link`)
      assert.match(files[p], /<main id="ht-main"/, `${p}: the skip link has no main to point at`)
    }
  }
})

test('with a project name given, no button specimen in the kit is a placeholder box', async () => {
  const files = await exportZip('21-presentation', 'ui-kit')
  for (const p of ['buttons.html', 'index.html', 'inputs.html', 'dialog.html', 'feedback.html']) {
    const buttons = [...files[p].matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0])
    assert.ok(buttons.length > 0, `${p}: no buttons found`)
    for (const b of buttons) assert.doesNotMatch(b, /class="[^"]*\bph-[bc]\b/, `${p}: a placeholder box inside a button: ${b.slice(0, 90)}`)
  }
})

// 10. THE PUBLISHED SITES CARRY NO EDITOR GUIDANCE: a placeholder the project has not filled is not printed. The guidance is the engine's
//     sentinel (U+E000), so the helpers that drop it are pinned here and the built pages are checked for the boxes it would draw.
//     Break: return the string unchanged from realOnly()/cleaned() in themes/21-presentation/lane-ht-clean.js, or drop the siteCtx() call in lane-ht.js page().
test('the site helpers drop placeholders: a line, a list item and a group with nothing real left are not kept', async () => {
  const { hasPh, realOnly, cleaned } = await import('../../api/_lib/exportThemes/themes/21-presentation/lane-ht-clean.js')
  const ph = String.fromCharCode(0xe000) + '12' + String.fromCharCode(0xe001)
  assert.equal(hasPh(`a ${ph} b`), true)
  assert.equal(hasPh('a real line'), false)
  assert.equal(realOnly(ph), '')
  assert.equal(realOnly('kept'), 'kept')
  assert.deepEqual(cleaned({ name: ph, lines: { primary: 'Keep this', second: ph }, list: ['One', ph, 'Two'], groups: [{ items: [ph] }, { items: ['Real'] }] }),
    { name: '', lines: { primary: 'Keep this', second: '' }, list: ['One', 'Two'], groups: [{ items: [] }, { items: ['Real'] }].filter((g) => g.items.length) })
})

test('a brand with nothing written yet gets a guide and a kit with no dashed boxes, no logo frame and no editor labels', async () => {
  for (const row of ['slides', 'ui-kit']) {
    const res = fakeRes()
    await serveExportDocument({ headers: { authorization: 'Bearer tok' }, body: { theme: '21-presentation', row, format: row === 'slides' ? 'html' : 'zip', design: {} } }, res, deps())
    assert.equal(res.code, 200, row)
    const zip = await JSZip.loadAsync(res.buffer)
    for (const [name, f] of Object.entries(zip.files)) {
      if (f.dir || !/^[^/]+\/[^/]+\.html$/.test(name)) continue
      const html = await f.async('string')
      assert.doesNotMatch(html, /class="[^"]*\b(ph-b|ph-c|logo-slot)\b/, `${row} ${name}: a placeholder box`)
      assert.doesNotMatch(html, /\uE000/, `${row} ${name}: an unswapped placeholder`)
    }
  }
})

test('theme 21 sites print no empty page, no editor words, no stock sample copy and no void closing tags, with or without a design', async () => {
  for (const design of [DESIGN, {}]) {
    for (const row of ['slides', 'ui-kit']) {
      const res = fakeRes()
      await serveExportDocument({ headers: { authorization: 'Bearer tok' }, body: { theme: '21-presentation', row, format: row === 'slides' ? 'html' : 'zip', design } }, res, deps())
      assert.equal(res.code, 200, row)
      const zip = await JSZip.loadAsync(res.buffer)
      const names = Object.keys(zip.files)
      for (const name of names.filter((n) => /^[^/]+\/[^/]+\.html$/.test(n) && !/example\.html$/.test(n))) {
        const html = await zip.files[name].async('string')
        assert.doesNotMatch(html, /Not written yet\.|Item 1|Main action|Example Street|undefined|NaN/, `${row} ${name}`)
        assert.doesNotMatch(html, /&lt;\/input&gt;|class=&quot;&quot;/, `${row} ${name}: a void closing tag or an empty class in the markup shown`)
      }
      // every page the contents lists is in the zip: a page left out of the build is left out of the contents too
      const root = names[0].split('/')[0], index = await zip.files[`${root}/index.html`].async('string')
      for (const m of index.matchAll(/href="([^"#:]+\.html)"/g)) assert.ok(zip.files[`${root}/${m[1]}`], `${row}: the contents links to ${m[1]}, which is not in the zip`)
    }
  }
})

// Design review round 6: one shared set of orders, no photo slot, the fonts named as shipped.
//     Break: change the 1040 order's minutes late in real-copy.js, drop exampleDemo from the theme's meta, or restore the photo-slot words.
test('theme 21 tells one story: order 1040 is late, the example total is the sum of the orders, and no page asks for a photograph', async () => {
  const kit = await exportZip('21-presentation', 'ui-kit')
  assert.match(kit['example.html'], /\$623\.05/, 'the example total is not the sum of the sample orders')
  assert.doesNotMatch(kit['example.html'], /value="Tide &amp; Co\."/, 'the account field shows the shop name as a disabled value')
  for (const row of ['slides', 'ui-kit']) {
    const files = row === 'ui-kit' ? kit : await exportZip('21-presentation', row)
    for (const p of htmlPages(files)) {
      assert.doesNotMatch(files[p], /Place a photograph|class=""/, `${row} ${p}`)
    }
  }
  const lists = Object.entries(kit).filter(([n]) => /\.html$/.test(n)).map(([, t]) => t).join('\n')
  assert.match(lists, /1040[\s\S]{0,400}Late/, 'order 1040 is not shown as Late')
})

test('theme 21 labels the faces it ships: the body family named in the css has a font file in the zip', async () => {
  const files = await exportZip('21-presentation', 'slides')
  const css = Object.entries(files).filter(([n]) => /^assets\/.+\.css$/.test(n)).map(([, t]) => t).join('\n')
  const fonts = Object.keys(files).filter((n) => /\.(woff2?|ttf|otf)$/.test(n))
  assert.ok(fonts.length > 0, 'no font files shipped')
  for (const m of css.matchAll(/@font-face\s*\{[^}]*font-family:\s*['"]?([^;'"]+)/g)) assert.ok(m[1].trim().length > 0, 'an unnamed @font-face')
  assert.doesNotMatch(Object.values(files).filter((t) => typeof t === 'string').join('\n'), /Inter \/ Inter/)
})

// Design review round 7: the typeset wordmark keeps the space in the name ("Tide& Co." / "Yourname" came from a bare text run beside the accent tag).
//     Break: in wordmark() (themes/21-presentation/lane-ht-clean.js) put the name back as a bare text run, outside <span>, for the non-horizontal shape.
async function pagesFor(row, body) {
  const res = fakeRes()
  await serveExportDocument({ headers: { authorization: 'Bearer tok' }, body: { theme: '21-presentation', row, format: row === 'slides' ? 'html' : 'zip', ...body } }, res, deps())
  assert.equal(res.code, 200, row)
  const zip = await JSZip.loadAsync(res.buffer)
  const out = {}
  for (const [name, f] of Object.entries(zip.files)) if (!f.dir && /\.(html|css|md)$/.test(name)) out[name.slice(name.indexOf('/') + 1)] = await f.async('string')
  return out
}
// each typeset wordmark's inner markup: from its opening span to the span that closes it (spans nest inside)
function wordmarkInners(html) {
  const out = []
  for (const m of html.matchAll(/<span class="ht-wm ht-d[^"]*"[^>]*>/g)) {
    const start = m.index + m[0].length
    let depth = 1
    for (const t of html.slice(start).matchAll(/<(\/?)span\b[^>]*>/g)) {
      depth += t[1] ? -1 : 1
      if (!depth) { out.push(html.slice(start, start + t.index)); break }
    }
  }
  return out
}
// the words a wordmark's own box holds directly: text outside every child element (a flex box drops the space at the edge of such a run)
function bareText(inner) {
  let depth = 0, bare = ''
  for (const part of inner.split(/(<[^>]*>)/)) {
    if (/^<\//.test(part)) depth--
    else if (/^<[a-z]/i.test(part)) depth++
    else if (!depth) bare += part
  }
  return bare.trim()
}
const readOf = (inner) => inner.replace(/<\/b>/g, ' ').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

test('the typeset wordmark reads as the brand name, spaces kept, with a name and without one', async () => {
  for (const [body, name] of [[{ projectName: 'Tide & Co.', design: DESIGN }, 'Tide & Co.'], [{ design: {} }, 'Your name']]) {
    const files = await pagesFor('slides', body)
    const inners = Object.entries(files).filter(([n]) => /^[^/]+\.html$/.test(n)).flatMap(([, h]) => wordmarkInners(h))
    assert.ok(inners.length > 0, name + ': no typeset wordmark found in the guide')
    for (const inner of inners) {
      // the horizontal and stacked shapes carry the initial first: "T Tide & Co."
      const t = readOf(inner), bare = t.replace(/^\S\s(?=\S)/, '')
      assert.ok(t === name || bare === name || t === name[0].toUpperCase(), name + ': a wordmark reads "' + t + '"')
      // the symbol alone is one run and has nothing beside it; every other shape keeps its words in an element
      if (/</.test(inner)) assert.equal(bareText(inner), '', name + ': a wordmark holds a bare text run, which loses its space beside the accent tag: ' + t)
    }
  }
})

// Design review round 7: a project with no design is shown under one plain name everywhere, and its clear space is a multiple of the logo, not a percentage.
//     Break: drop the siteBrand() call in renderThemeExport (api/_lib/exportThemeRoute.js), or print Lg.clearShare with a "%" again in lane-g2.js.
test('with no design, the guide and the kit say "Your name" in titles, comments and the example, and the clear space is drawn in multiples of the logo', async () => {
  const guide = await pagesFor('slides', { design: {} })
  const kit = await pagesFor('ui-kit', { design: {} })
  for (const [n, html] of [...Object.entries(guide), ...Object.entries(kit)]) {
    assert.doesNotMatch(html, /Brand name|class="[^"]*\bph-[bc]\b|data-ph=/, n + ': an unwritten-name box or label')
    if (/\.html$/.test(n)) assert.match(html.match(/<title>([^<]*)/)[1], /Your name/, n + ': the title does not carry the name the page shows')
  }
  assert.match(kit['example.html'], /<strong class="ui-display">Your name<\/strong>/, 'the example topbar names the brand')
  assert.match(kit['tokens.css'], /^\/\* Your name /, 'the tokens comment names the brand')
  assert.match(guide['clear-space.html'], /Keep \d(?:\.\d)?× the logo's height clear/, 'the clear space is not a multiple of the logo height')
  assert.doesNotMatch(guide['clear-space.html'], /\d+% of the logo/, 'the clear space is a percentage')
})

// Design review round 8: the markup the kit pages show and copy only names classes the shipped components.css defines
// (the docs-only hk-* and ht-* layout classes had leaked into the copied snippets).
//     Break: wrap a snippet in a docs class again (a `class="hk-links"` in themes/21-presentation/lane-ht-kit.js), or drop .ui-table from components.css.
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&')
function shownMarkup(html) {
  const out = []
  for (const m of html.matchAll(/data-copy="([^"]*)"/g)) out.push(unesc(m[1]))
  for (const m of html.matchAll(/<pre\b[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)) out.push(unesc(m[1]))
  return out
}
test('every class named in markup the kit shows or copies is defined in the shipped components.css', async () => {
  for (const body of [{ projectName: 'Tide & Co.', design: DESIGN }, { design: {} }]) {
    const files = await pagesFor('ui-kit', body)
    const defined = new Set([...files['components.css'].matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]))
    assert.ok(defined.has('ui-table') && defined.has('ui-empty'), 'components.css lost a class this test relies on')
    let seen = 0
    for (const [n, html] of Object.entries(files).filter(([k]) => /^[^/]+\.html$/.test(k) && k !== 'example.html')) {
      for (const markup of shownMarkup(html)) {
        for (const m of markup.matchAll(/\bclass="([^"]*)"/g)) {
          for (const c of m[1].split(/\s+/).filter(Boolean)) { seen++; assert.ok(defined.has(c), `${n}: the copied markup names .${c}, which components.css does not define`) }
        }
      }
    }
    assert.ok(seen > 40, 'the test found almost no classes to check: ' + seen)
  }
})

// A page whose notes throw is dropped by keep() without a word (contentOf catches), so a lost page has to be caught by name.
//   Break: shadow an imported helper with a later local of the same name in layoutSlides (the layouts page silently drops).
test('theme 21 builds every page it has content for: layouts and the logo pages are in the guide, its contents and its links', async () => {
  const files = await exportZip('21-presentation', 'slides')
  for (const page of ['layouts.html', 'clear-space.html', 'min-size.html', 'logo-versions.html', 'type-in-use.html', 'summary.html']) {
    assert.ok(page in files, `${page} is built`)
    assert.ok(files['index.html'].includes(`href="${page}"`), `${page} is in the contents`)
  }
  assert.match(files['layouts.html'], /class="ht-sls"/, 'the layouts page shows its slide specimens')
})

// Design review round 9 (theme 21): what the buyer pastes is what the kit page shows. The raised card's edge and shadow, the scrim and the
// skeleton are in the SHIPPED components.css and tokens.css, and no docs-only .hk-i rule restyles a ui- component.
//     Break: drop `shipped` from the theme's meta (themes/21-presentation/index.js), or put `.hk-i .ui-card--raised{...}` back in lane-ht-kcss.js.
test('theme 21 ships the raised card with its edge and shadow, a visible skeleton and a scrim that is ink at a share, in light and dark, with or without a design', async () => {
  for (const body of [{ projectName: 'Tide & Co.', design: DESIGN }, { design: {} }]) {
    const files = await pagesFor('ui-kit', body)
    const comp = files['components.css'], tokens = files['tokens.css'], docs = files['assets/kit.css']
    assert.match(comp, /\.ui-card--raised\s*\{[^}]*border-color:\s*var\(--divider\)[^}]*box-shadow:\s*var\(--shadow-float\)/, 'the shipped raised card has no edge and shadow')
    assert.doesNotMatch(tokens, /--shadow-float:\s*none/, 'the float shadow is none')
    const dark = tokens.match(/\[data-theme="dark"\]\s*\{([^}]*)\}/)[1]
    assert.match(dark, /--shadow-float:\s*[^;]*\S/, 'the dark ground has its own float shadow')
    assert.match(comp, /\.ui-skeleton\s*\{[^}]*color-mix\(in srgb, var\(--text\)/, 'the skeleton is the sunken fill, which vanishes on a raised surface')
    assert.match(comp, /\.ui-scrim\s*\{[^}]*color-mix\(in srgb, var\(--scrim\) 60%/, 'the scrim is a solid slab')
    assert.match(comp, /dialog\.ui-dialog::backdrop\s*\{[^}]*color-mix\(in srgb, var\(--scrim\) 60%/, 'the backdrop is a solid slab')
    // the docs wrapper only lays out specimens: no .hk-* rule changes a ui- component's border, shadow, colour or spacing
    assert.ok(docs, 'assets/kit.css is in the kit')
    const bad = []
    for (const m of docs.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
      if (!/\.hk-[\w-]+[^,{]*\s\.ui-|\.hk-[\w-]+\.ui-/.test(m[1])) continue
      if (/\.hk-phone\b/.test(m[1])) continue // the drawn phone stands in for the under-480px rule components.css already ships
      if (/(?:^|;)\s*(?:border|box-shadow|background|color|padding|margin|outline)[\w-]*\s*:/.test(';' + m[2])) bad.push(m[1].trim())
    }
    assert.deepEqual(bad, [], 'the docs wrapper restyles a shipped component, so the pasted one will not match the page')
  }
})
