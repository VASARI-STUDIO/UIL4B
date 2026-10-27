// THE ALLOW-LIST SVG SANITISER — src/utils/svgSanitise.js.
//
// Two halves, and both have to hold:
//  1. HOSTILE INPUT COMES OUT INERT. Every payload below is checked two ways: the
//     specific thing is gone, AND the whole output is re-read and every element
//     and attribute in it must be on the allow-list (assertInert). The second
//     check is what catches a payload nobody thought to write a test for.
//  2. REAL ICONS COME OUT UNCHANGED. An allow-list that quietly eats `fill-rule`
//     or `clip-path` ruins icons without a single security finding, so every
//     built-in icon, the committed sprite and the Iconify fixture go through and
//     must keep the same elements and attributes (shape()).
//
// Run in plain Node: the sanitiser has its own parser, so there is no DOM shim.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import {
  SVG_ALLOWED_ATTRIBUTES, SVG_ALLOWED_ELEMENTS, SVG_LIMITS, sanitiseSvgInline,
} from '../../src/utils/svgSanitise.js'

const ROOT = process.cwd()
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

const NS = 'http://www.w3.org/2000/svg'
const wrap = (inner = '', attrs = '') => `<svg xmlns="${NS}" viewBox="0 0 24 24"${attrs}>${inner}</svg>`
const EMPTY = `<svg xmlns="${NS}" viewBox="0 0 24 24"/>`
const run = (src, options) => sanitiseSvgInline(src, options)

// Every tag and attribute in a serialised document. The sanitiser's own output is
// always `<name a="v" ...>` with `>` escaped inside values, so a regex reads it.
function inventory(svg) {
  const elements = []
  const attributes = []
  for (const m of svg.matchAll(/<\/?([A-Za-z][\w:.-]*)([^>]*)>/g)) {
    elements.push(m[1])
    for (const a of m[2].matchAll(/\s([^\s=]+)="[^"]*"/g)) attributes.push(a[1])
  }
  return { elements, attributes }
}

// [element, sorted attributes] for every element, in document order. Whitespace
// text is ignored, so a pretty-printed source compares equal to the compact output.
function shape(svg) {
  const out = []
  for (const m of svg.matchAll(/<([A-Za-z][\w:.-]*)((?:\s+[^\s=>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*\/?>/g)) {
    const attrs = [...m[2].matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
      .map(a => `${a[1]}=${a[2] ?? a[3]}`)
      .filter(a => !a.startsWith('xmlns') && !a.startsWith('version='))
      .sort()
    out.push([m[1], attrs])
  }
  return out
}

function assertInert(svg, label = '') {
  const { elements, attributes } = inventory(svg)
  for (const e of elements) assert.ok(SVG_ALLOWED_ELEMENTS.includes(e), `${label}: <${e}> is not allow-listed`)
  for (const a of attributes) assert.ok(SVG_ALLOWED_ATTRIBUTES.includes(a), `${label}: ${a} is not allow-listed`)
  assert.doesNotMatch(svg, /javascript:|vbscript:|data:|<!|<\?|\son[a-z]+\s*=/i, `${label}: hostile text survived`)
  for (const m of svg.matchAll(/href="([^"]*)"/g)) assert.match(m[1], /^#/, `${label}: non-fragment href`)
  for (const m of svg.matchAll(/url\(([^)]*)\)/g)) assert.match(m[1], /^#/, `${label}: non-local url()`)
}

// ── the contract ────────────────────────────────────────────────────────────

test('a clean icon comes out byte-for-byte as it went in, with ok and nothing removed', () => {
  const src = read('tests/user-sim/fixtures/iconify/icon.svg').trim()
  const out = run(src)
  assert.deepEqual(out, { ok: true, svg: src, removed: [] })
})

test('the root always carries the SVG namespace, added when the source left it out', () => {
  assert.equal(run('<svg viewBox="0 0 1 1"/>').svg, `<svg xmlns="${NS}" viewBox="0 0 1 1"/>`)
  assert.equal(run(`<svg xmlns="http://evil.example/ns" viewBox="0 0 1 1"/>`).svg,
    `<svg xmlns="${NS}" viewBox="0 0 1 1"/>`, 'a wrong namespace is replaced, not kept')
})

test('rejects return null: not a string, empty, not XML, not an svg root, two roots', () => {
  for (const bad of [undefined, null, 42, {}, '', '   ', 'hello', '<html><svg/></html>', '<g/>',
    '<svg><path d="M0 0"></svg>', '<svg><br></svg>', '<svg></g></svg>', '<svg/><svg/>', 'x<svg/>', '<svg/>x',
    '<svg><path d=M0/></svg>', '<svg><path d="M0" d="M1"/></svg>', '<svg', '<svg><!-- open </svg>',
    '<svg><![CDATA[ open </svg>', '<SVG/>', '<svg>\u0000</svg>', '<svg>\u0007</svg>']) {
    assert.equal(run(bad), null, `expected null for ${JSON.stringify(bad)}`)
  }
})

test('the exported allow-lists contain what the card asked for and nothing executable', () => {
  for (const el of ['svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect', 'defs',
    'clipPath', 'mask', 'linearGradient', 'radialGradient', 'stop', 'title', 'desc', 'symbol', 'use']) {
    assert.ok(SVG_ALLOWED_ELEMENTS.includes(el), el)
  }
  for (const attr of ['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points',
    'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
    'stroke-dasharray', 'stroke-dashoffset', 'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity',
    'transform', 'id', 'clip-path', 'mask', 'gradientUnits', 'gradientTransform', 'offset', 'stop-color',
    'stop-opacity', 'xmlns', 'preserveAspectRatio', 'vector-effect', 'href']) {
    assert.ok(SVG_ALLOWED_ATTRIBUTES.includes(attr), attr)
  }
  for (const banned of ['script', 'style', 'foreignObject', 'image', 'a', 'animate', 'set', 'filter', 'text']) {
    assert.ok(!SVG_ALLOWED_ELEMENTS.includes(banned), banned)
  }
  for (const banned of ['class', 'style', 'xlink:href', 'filter']) {
    assert.ok(!SVG_ALLOWED_ATTRIBUTES.includes(banned), banned)
  }
  assert.ok(!SVG_ALLOWED_ATTRIBUTES.some(a => /^on/i.test(a)))
})

test('the sanitiser is DOM-free: no DOMParser, no innerHTML, no document in the code', () => {
  const code = read('src/utils/svgSanitise.js').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')
  assert.doesNotMatch(code, /DOMParser|innerHTML|outerHTML|document\.|window\./)
})

// ── scripts and handlers ────────────────────────────────────────────────────

test('<script> is dropped with its contents, in any case, and the artwork beside it stays', () => {
  const out = run(wrap('<script>alert(1)</script><path d="M0 0h4v4z"/>'))
  assert.equal(out.ok, false)
  assert.deepEqual(out.removed, ['<script>'])
  assert.equal(out.svg, wrap('<path d="M0 0h4v4z"/>'))

  for (const tag of ['SCRIPT', 'Script', 'sCrIpT', 'svg:script']) {
    const mixed = run(wrap(`<${tag}>alert(1)</${tag}><path d="M0 0"/>`))
    assert.ok(mixed, tag)
    assert.doesNotMatch(mixed.svg, /script|alert/i, tag)
    assertInert(mixed.svg, tag)
  }
})

test('on* handlers are dropped from the root and from nested elements', () => {
  const out = run(`<svg xmlns="${NS}" onload="alert(1)"><g onclick="x()"><rect onerror="y()" onmouseover="z()" width="2" height="2"/></g></svg>`)
  assert.deepEqual(out.removed.sort(), ['@onclick', '@onerror', '@onload', '@onmouseover'])
  assert.equal(out.svg, `<svg xmlns="${NS}"><g><rect width="2" height="2"/></g></svg>`)
})

test('mixed-case tags and attributes are not on the list, so they do not survive', () => {
  const out = run(wrap('<PATH D="M0 0" Fill="red"/><CLIPPATH id="c"/><clippath id="d"/><path ONCLICK="x()" oNcLiCk="y()" d="M1 1"/>', ' ViewBox="0 0 1 1"'))
  assert.ok(out)
  assertInert(out.svg)
  assert.equal(out.svg, `<svg xmlns="${NS}" viewBox="0 0 24 24"><path d="M1 1"/></svg>`)
  assert.ok(out.removed.includes('@ONCLICK') && out.removed.includes('@ViewBox') && out.removed.includes('<PATH>'))
})

test('animation elements are dropped, so nothing can rewrite an href after the check', () => {
  const out = run(wrap('<a href="#x"><set attributeName="href" to="javascript:alert(1)"/></a><path id="x" d="M0 0"><animate attributeName="d" to="M1 1"/><set attributeName="onclick" to="alert(1)"/></path>'))
  assert.equal(out.svg, wrap('<path id="x" d="M0 0"/>'))
  assert.deepEqual(out.removed.sort(), ['<a>', '<animate>', '<set>'])
})

// ── links and references ───────────────────────────────────────────────────

test('javascript: in an href is dropped on <use> and <a>, plain, cloaked, or entity-encoded', () => {
  const hrefs = [
    'javascript:alert(1)', ' javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java&#x09;script:alert(1)',
    'java&#10;script:alert(1)', '&#106;avascript:alert(1)', '&#x6A;avascript&#58;alert(1)', 'vbscript:msgbox(1)',
  ]
  for (const href of hrefs) {
    for (const name of ['href', 'xlink:href']) {
      const out = run(wrap(`<use ${name}="${href}"/><a ${name}="${href}"><path d="M0 0"/></a>`, ' xmlns:xlink="http://www.w3.org/1999/xlink"'))
      assert.ok(out, href)
      assert.doesNotMatch(out.svg, /script/i, `${name}=${href}`)
      assertInert(out.svg, `${name}=${href}`)
      assert.equal(out.svg, EMPTY, `${name}=${href}: the whole <use> and <a> are gone`)
    }
  }
})

test('external and data: hrefs are dropped; a fragment href to an element in the file stays', () => {
  for (const href of ['https://evil.example/x.svg#a', 'http://evil.example/x.svg', '//evil.example/x.svg#a',
    'data:image/svg+xml;base64,PHN2Zy8+', 'x.svg#a', '', '#', '#a b', '#"><script>']) {
    const out = run(wrap(`<path id="a" d="M0 0"/><use href="${href.replace(/"/g, '&quot;').replace(/</g, '&lt;')}"/>`))
    assert.ok(out, href)
    assert.equal(out.svg, wrap('<path d="M0 0"/>'), href, 'the id nothing kept points at is dropped too')
  }
  const ok = run(wrap('<defs><path id="a" d="M0 0"/></defs><use href="#a" x="1"/><use xlink:href="#a"/>', ' xmlns:xlink="http://www.w3.org/1999/xlink"'))
  assert.equal(ok.svg, wrap('<defs><path id="a" d="M0 0"/></defs><use href="#a" x="1"/><use href="#a"/>'))
  assert.equal(ok.ok, true)
  assert.doesNotMatch(ok.svg, /xlink/)
})

test('a <use> that points at nothing in the cleaned document is dropped, so it cannot reach the host page', () => {
  assert.equal(run(wrap('<use href="#missing"/>')).svg, EMPTY)
  // The only element with that id was inside a dropped subtree.
  assert.equal(run(wrap('<foreignObject><g id="a"/></foreignObject><use href="#a"/>')).svg, EMPTY)
  // href is only meaningful on <use>.
  assert.equal(run(wrap('<path id="a" d="M0 0" href="#a"/>')).svg, wrap('<path d="M0 0"/>'))
})

test('url(#local) survives in fill, stroke, clip-path and mask; any other url() does not', () => {
  const defs = '<defs><linearGradient id="g"/><clipPath id="c"/><mask id="m"/></defs>'
  const good = run(wrap(`${defs}<rect fill="url(#g)" stroke="url(#g)" clip-path="url(#c)" mask="url(#m)"/><rect fill="url(#g) red" stroke="url('#g')"/>`))
  assert.equal(good.ok, true)
  assert.match(good.svg, /<rect fill="url\(#g\)" stroke="url\(#g\)" clip-path="url\(#c\)" mask="url\(#m\)"\/>/)
  assert.match(good.svg, /<rect fill="url\(#g\) red" stroke="url\(#g\)"\/>/, 'fallback colour kept, quotes normalised')

  for (const bad of [
    'url(http://evil.example/a.svg#g)', 'url(https://evil.example/a.svg#g)', 'url(//evil.example/a.svg#g)',
    'url(data:image/svg+xml,%3Csvg%2F%3E)', 'url(javascript:alert(1))', 'url(a.svg#g)', 'url( #g ) url(http://evil.example/x)',
    'url(#g) url(#g)', 'url(#g)url(#g)', 'url(#nope)', 'URL(HTTP://EVIL.EXAMPLE/X)', 'url(#g', 'expression(alert(1))',
  ]) {
    const out = run(wrap(`${defs}<rect fill="${bad}" stroke="${bad}"/>`))
    assert.ok(out, bad)
    assert.doesNotMatch(out.svg, /evil|javascript|data:|expression|nope/i, bad)
    assert.equal(out.svg.includes('<rect/>'), true, `${bad}: both attributes were dropped`)
    assertInert(out.svg, bad)
  }
  // url() has no business outside the four reference attributes.
  const elsewhere = run(wrap(`${defs}<rect filter="url(#g)" stop-color="url(#g)" d="url(#g)" id="url(#g)" opacity="url(#g)" transform="url(#g)"/>`))
  assert.equal(elsewhere.svg.includes('<rect/>'), true)
  // clip-path / mask take a bare reference only.
  assert.equal(run(wrap(`${defs}<rect clip-path="url(#c) red" mask="circle(50%)"/>`)).svg.includes('<rect/>'), true)
})

test('a reference to an id outside the file is dropped even when the syntax is fine', () => {
  const out = run(wrap('<rect fill="url(#page-element)" clip-path="url(#page-clip)" width="2"/>'))
  assert.equal(out.svg, wrap('<rect width="2"/>'))
  assert.deepEqual(out.removed.sort(), ['@clip-path', '@fill'])
})

// ── styles, foreign content, embeds ────────────────────────────────────────

test('<style>, style attributes and class are dropped: expression(), url(javascript:), @import and all', () => {
  const out = run(wrap(
    '<style><![CDATA[@import url(http://evil.example/x.css); .a{fill:expression(alert(1));background:url(javascript:alert(1))}]]></style>'
    + '<style type="text/css">path{behavior:url(x.htc)}</style>'
    + '<path class="a hidden" style="fill:url(javascript:alert(1));-moz-binding:url(x.xml#y)" d="M0 0"/>'
    + '<rect style="width:expression(alert(1))" class="overlay" width="3"/>',
  ))
  assert.equal(out.svg, wrap('<path d="M0 0"/><rect width="3"/>'))
  assert.deepEqual(out.removed.sort(), ['<style>', '@class', '@style'])
  assertInert(out.svg)
})

test('<foreignObject> is dropped with the HTML inside it, however it is dressed', () => {
  const html = '<body xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(1)"/><iframe src="javascript:alert(1)"></iframe><form action="http://evil.example"><input/></form></body>'
  const out = run(wrap(`<foreignObject width="10" height="10">${html}</foreignObject><switch><foreignObject>${html}</foreignObject></switch><path d="M0 0"/>`))
  assert.equal(out.svg, wrap('<path d="M0 0"/>'))
  assert.deepEqual(out.removed.sort(), ['<foreignObject>', '<switch>'])
})

test('<image>, <filter>, <text>, <metadata>, <symbol>-less sprites and every prefixed element are dropped', () => {
  const out = run(wrap(
    '<image href="http://evil.example/p.png"/><image href="data:image/png;base64,AAAA"/><filter id="f"><feImage href="http://evil.example/x"/></filter>'
    + '<text>hi</text><metadata><x:y xmlns:x="http://evil.example"/></metadata><sodipodi:namedview xmlns:sodipodi="http://evil.example"/>'
    + '<svg:path d="M0 0"/><path d="M1 1"/>',
  ))
  assert.equal(out.svg, wrap('<path d="M1 1"/>'))
  assertInert(out.svg)
})

test('comments and processing instructions never reach the output; stylesheet PIs are reported', () => {
  const out = run(`<?xml version="1.0" encoding="UTF-8"?><!-- Generator: <script>alert(1)</script> --><svg xmlns="${NS}"><!-- x --><path d="M0 0"/></svg>`)
  assert.equal(out.svg, `<svg xmlns="${NS}"><path d="M0 0"/></svg>`)
  assert.equal(out.ok, true, 'a plain xml declaration and comments are noise, not a finding')

  const pi = run(`<?xml-stylesheet href="http://evil.example/x.css"?><svg xmlns="${NS}"><?php echo 1 ?></svg>`)
  assert.equal(pi.svg, `<svg xmlns="${NS}"/>`)
  assert.deepEqual(pi.removed.sort(), ['<?php?>', '<?xml-stylesheet?>'])
})

// ── DOCTYPE, entities, CDATA ───────────────────────────────────────────────

test('DOCTYPE and ENTITY declarations reject the whole file', () => {
  const bomb = '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;"><!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;"><!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">]>'
  assert.equal(run(`${bomb}<svg xmlns="${NS}"><title>&lol4;</title></svg>`), null)
  assert.equal(run(`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">${wrap()}`), null)
  assert.equal(run(`<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>${wrap('<title>&xxe;</title>')}`), null)
  assert.equal(run(wrap('<!ENTITY a "b">')), null)
  assert.equal(run(wrap('<!doctype html>')), null)
  assert.equal(run(wrap('<!ELEMENT x ANY>')), null)
})

test('an entity that is not one of the five XML entities rejects the file, with or without a DOCTYPE', () => {
  for (const ref of ['&lol9;', '&nbsp;', '&copy;', '&amp', '& ', '&#;', '&#x;', '&#xZZ;', '&#0;', '&#1;', '&#xD800;', '&#x110000;']) {
    assert.equal(run(wrap(`<title>${ref}</title>`)), null, ref)
    assert.equal(run(wrap(`<path id="${ref}"/>`)), null, `attr ${ref}`)
  }
})

test('the five XML entities and numeric references decode and are re-escaped on the way out', () => {
  const out = run(wrap('<title>a &amp; b &lt;i&gt; &quot;q&quot; &apos;s&apos; &#65;&#x42;</title>'))
  assert.match(out.svg, /<title>a &amp; b &lt;i&gt; "q" 's' AB<\/title>/)
  assertInert(out.svg)
})

test('CDATA is plain text: kept as escaped text inside <title>/<desc>, dropped anywhere else', () => {
  const out = run(wrap('<title><![CDATA[<script>alert(1)</script>]]></title><desc><![CDATA[</desc><script>alert(1)</script>]]></desc><g><![CDATA[<script>alert(2)</script>]]></g>'))
  assert.equal(out.svg, wrap('<title>&lt;script&gt;alert(1)&lt;/script&gt;</title><desc>&lt;/desc&gt;&lt;script&gt;alert(1)&lt;/script&gt;</desc><g/>'))
  assert.doesNotMatch(out.svg, /<script/)
  assert.equal(inventory(out.svg).elements.filter(e => e === 'desc').length, 2, 'the CDATA did not close <desc> early')
})

test('markup inside <title> is dropped, and text cannot break out of it', () => {
  const out = run(wrap('<title>x<style><img src="x" onerror="alert(1)"/></style></title><desc>&lt;/desc&gt;&lt;script&gt;</desc>'))
  assert.equal(out.svg, wrap('<title>x</title><desc>&lt;/desc&gt;&lt;script&gt;</desc>'))
})

test('no element survives inside <title> or <desc>, allow-listed or not, so inlining cannot close the <svg> early', () => {
  for (const [src, note] of [
    ['<title><g/></title><path d="M0 0"/>', '<g>'],
    ['<desc><path d="M0 0"/></desc><path d="M1 1"/>', '<path>'],
    ['<title><title/></title><path d="M2 2"/>', '<title>'],
    ['<desc><g><title>deep</title></g></desc><path d="M3 3"/>', '<g>'],
  ]) {
    const out = run(wrap(src))
    assert.ok(out, src)
    assert.equal(out.ok, false, src)
    assert.ok(out.removed.includes(note), `${src}: ${out.removed}`)
    // Nothing between <title>/<desc> and its closing tag but text.
    for (const m of out.svg.matchAll(/<(title|desc)>([^]*?)<\/\1>/g)) assert.doesNotMatch(m[2], /</, `${src}: element inside <${m[1]}>`)
    assert.ok(out.svg.endsWith('/></svg>'), `${src}: the markup after it is still there`)
    assertInert(out.svg, src)
  }
  assert.equal(run(wrap('<title><g/></title>')).svg, wrap('<title/>'))
  // Text beside the dropped child stays; a plain title is untouched.
  assert.equal(run(wrap('<title>a<g/>b</title>')).svg, wrap('<title>ab</title>'))
  assert.deepEqual(run(wrap('<title>Flame</title><desc>A flame</desc>')), { ok: true, svg: wrap('<title>Flame</title><desc>A flame</desc>'), removed: [] })
})

test('attribute values cannot break out of their quotes on the way out', () => {
  for (const evil of [`red" onload="alert(1)`, `red' onload='alert(1)`, 'red"/><script>alert(1)</script><x a="', 'red&quot; onload=&quot;alert(1)']) {
    // Entity-encode the quotes and '<' so the file stays well-formed and the decoded value is the payload.
    const enc = evil.replace(/'/g, '&apos;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
    const out = run(`<svg xmlns="${NS}"><path d="M0 0" fill="${enc}"/><path d="M0 0" stroke="${enc}"/></svg>`)
    assert.ok(out, evil)
    assert.equal(out.svg, `<svg xmlns="${NS}"><path d="M0 0"/><path d="M0 0"/></svg>`, evil)
  }
  assert.equal(run(`<svg xmlns="${NS}"><path d="M0 0" fill='a"b'/></svg>`).svg, `<svg xmlns="${NS}"><path d="M0 0"/></svg>`)
  assert.equal(run(`<svg xmlns="${NS}"><path d="M0 0" fill="<"/></svg>`), null, '"<" in an attribute is not XML')
})

// ── namespaces ──────────────────────────────────────────────────────────────

test('namespaced attributes and declarations are dropped; xlink:href on <use> is read as href', () => {
  const out = run(`<svg xmlns="${NS}" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:evil="http://evil.example" xmlns:x="http://www.w3.org/1999/xhtml">`
    + '<path id="a" d="M0 0" xml:base="http://evil.example/" xlink:href="http://evil.example/" evil:onclick="alert(1)" x:onload="alert(1)" xlink:show="new"/>'
    + '<use xlink:href="#a"/></svg>')
  assert.equal(out.svg, `<svg xmlns="${NS}"><path id="a" d="M0 0"/><use href="#a"/></svg>`)
  assert.deepEqual(out.removed.sort(), ['@evil:onclick', '@href', '@x:onload', '@xlink:show', '@xml:base'])
})

test('both href and xlink:href on one element: one survives, never two', () => {
  const out = run(wrap('<path id="a" d="M0 0"/><use href="#a" xlink:href="#a"/>'))
  assert.equal((out.svg.match(/href=/g) || []).length, 1)
})

// ── values, not just names ─────────────────────────────────────────────────

test('an allowed attribute name with a hostile value is dropped', () => {
  const cases = [
    ['d', 'M0 0 javascript:alert(1)'], ['d', 'M0 0<script>'], ['d', 'url(#a)'],
    ['fill', 'expression(alert(1))'], ['fill', 'javascript:alert(1)'], ['fill', 'data:text/html,x'], ['fill', 'java\nscript:alert(1)'],
    ['stroke', 'rgb(0,0,0) onload=x'], ['stroke-width', '2;alert(1)'], ['stroke-width', 'calc(1px+1px)'],
    ['width', 'url(#a)'], ['cx', '1 2'], ['opacity', 'javascript:1'],
    ['transform', 'rotate(45) alert(1)'], ['transform', 'translate(javascript:alert(1))'], ['transform', 'foo(1)'], ['transform', ''],
    ['points', '1,2 javascript:alert(1)'], ['viewBox', '0 0 24'], ['viewBox', '0 0 24 24 24'], ['viewBox', '0 0 a b'],
    ['stroke-linecap', 'round;x'], ['stroke-linejoin', 'inherit'], ['fill-rule', 'evenodd '.repeat(2)], ['gradientUnits', 'x'],
    ['stroke-dasharray', '1 javascript:'], ['preserveAspectRatio', 'xMidYMid meet onload'], ['vector-effect', 'url(#a)'],
    ['id', 'a b'], ['id', '1a'], ['id', 'a"b'], ['id', 'a:b'], ['stop-color', 'url(#a)'],
    // Only XML whitespace separates values: NBSP, U+2028 and U+3000 do not.
    ['d', 'M0 0L1 1'], ['d', 'M0 0 L1 1'], ['points', '1,2 3,4'], ['viewBox', '0 0 24 24'],
    ['viewBox', ' 0 0 24 24'], ['transform', 'translate(1 2)'], ['transform', 'translate(1 2)　rotate(5)'],
    ['stroke-dasharray', '1 2'], ['fill', 'rgb(0,0,0 )'], ['fill', 'url(#a) red'],
    ['preserveAspectRatio', 'xMidYMid slice'],
  ]
  for (const [name, value] of cases) {
    const out = run(wrap(`<defs><linearGradient id="a"/></defs><rect ${name}="${value.replace(/"/g, '&quot;').replace(/</g, '&lt;')}"/>`))
    assert.ok(out, `${name}=${value}`)
    assert.ok(!new RegExp(`<rect[^>]* ${name}=`).test(out.svg), `${name}=${JSON.stringify(value)} survived: ${out.svg}`)
    assertInert(out.svg, `${name}=${value}`)
  }
})

test('ordinary values of every kind pass through untouched', () => {
  const body = '<g transform="translate(1 2) rotate(45 12 12) scale(.5)" fill="#0af" stroke="rgba(0,0,0,.5)" stroke-dasharray="2 1.5" opacity="50%">'
    + '<path d="M1.5-2e3L.5 3zm-1,2" fill-rule="evenodd" clip-rule="nonzero" stroke-linecap="round" stroke-linejoin="bevel" stroke-miterlimit="4"/>'
    + '<polygon points="0,0 4-4 .5,.5" vector-effect="non-scaling-stroke"/><circle cx="12px" cy="1em" r="3" fill="currentColor" stroke="none"/>'
    + '<linearGradient id="g" gradientUnits="userSpaceOnUse" gradientTransform="rotate(10)" x1="0" x2="1"><stop offset="0%" stop-color="hsl(10 20% 30%)" stop-opacity=".5"/></linearGradient></g>'
  const out = run(wrap(body, ' width="24" height="24" preserveAspectRatio="xMidYMid slice"'))
  assert.equal(out.ok, true)
  assert.equal(out.svg, wrap(body, ' width="24" height="24" preserveAspectRatio="xMidYMid slice"'))
})

test('tab, CR and LF still separate values, as in a pretty-printed or wrapped path', () => {
  const body = '<path d="M0\t0\r\nL1 1\n" transform="translate(1\n2)" stroke-dasharray="1\t2"/><polygon points="0,0\r\n4,4"/>'
    + '<rect fill="rgb(0,\n0,\t0)" width="2" height="2"/>'
  const out = run(wrap(body, ' preserveAspectRatio="xMidYMid\tslice"'))
  assert.equal(out.ok, true, out.removed.join())
  assert.match(out.svg, /preserveAspectRatio="xMidYMid\tslice"/)
  assert.match(out.svg, /<path d="M0\t0\r\nL1 1" transform="translate\(1\n2\)" stroke-dasharray="1\t2"\/>/)
})

test('version, xml:space and xmlns:* declarations are dropped without a finding', () => {
  const out = run(`<svg xmlns="${NS}" version="1.1" xml:space="preserve" xmlns:xlink="http://www.w3.org/1999/xlink" baseProfile="full"/>`)
  assert.deepEqual(out, { ok: true, svg: `<svg xmlns="${NS}"/>`, removed: [] })
})

test('a duplicate id loses the second copy, so a reference cannot be ambiguous', () => {
  const out = run(wrap('<path id="a" d="M0 0"/><path id="a" d="M1 1"/><use href="#a"/>'))
  assert.equal(out.svg, wrap('<path id="a" d="M0 0"/><path d="M1 1"/><use href="#a"/>'))
  assert.equal(out.ok, false)
})

// ── caps ────────────────────────────────────────────────────────────────────

test('over the byte cap rejects, counted in UTF-8 bytes not characters', () => {
  assert.equal(SVG_LIMITS.maxBytes, 32 * 1024)
  const path = (n) => wrap(`<path d="M0 0${' L1 1'.repeat(n)}"/>`)
  assert.ok(run(path(100)))
  assert.equal(run(path(10000)), null, 'over the default cap')
  const small = (ch) => `<svg><title>${ch.repeat(80)}</title></svg>`
  assert.ok(run(small('e'), { maxBytes: 150 }), '80 ASCII characters fit')
  assert.equal(run(small('é'), { maxBytes: 150 }), null, '80 two-byte characters do not')
  assert.equal(run(small('😀'), { maxBytes: 150 }), null, 'four-byte characters')
})

test('over the element cap rejects, counting elements that would be dropped too', () => {
  const g = (n) => wrap('<g/>'.repeat(n))
  assert.ok(run(g(SVG_LIMITS.maxElements - 1)), 'the root plus 499')
  assert.equal(run(g(SVG_LIMITS.maxElements)), null, 'the root plus 500')
  assert.equal(run(wrap('<foreignObject>' + '<x/>'.repeat(600) + '</foreignObject>')), null, 'junk inside a dropped element still counts')
  assert.ok(run(g(3), { maxElements: 4 }))
  assert.equal(run(g(4), { maxElements: 4 }), null)
})

test('over the depth cap rejects', () => {
  const nest = (n) => wrap('<g>'.repeat(n) + '</g>'.repeat(n))
  assert.ok(run(nest(SVG_LIMITS.maxDepth - 1)), 'the root plus 11 groups is 12 deep')
  assert.equal(run(nest(SVG_LIMITS.maxDepth)), null, 'one deeper')
  assert.equal(run(wrap('<foreignObject>' + '<d>'.repeat(40) + '</d>'.repeat(40) + '</foreignObject>')), null, 'nesting inside a dropped element counts')
  assert.equal(run(nest(3), { maxDepth: 3 }), null)
  assert.ok(run(nest(2), { maxDepth: 3 }))
})

test('a <use> amplification chain rejects before it can reach a renderer', () => {
  const ten = (id) => Array.from({ length: 10 }, () => `<use href="#${id}"/>`).join('')
  const chain = '<defs><g id="l0"><path d="M0 0h1v1z"/></g>'
    + Array.from({ length: 9 }, (_, i) => `<g id="l${i + 1}">${ten(`l${i}`)}</g>`).join('') + '</defs>' + ten('l9')
  assert.equal(run(wrap(chain)), null, '10^10 paths from 100 uses')

  const uses = (n) => wrap('<path id="a" d="M0 0"/>' + '<use href="#a"/>'.repeat(n))
  assert.ok(run(uses(SVG_LIMITS.maxUse)))
  assert.equal(run(uses(SVG_LIMITS.maxUse + 1)), null)
})

test('regex-hostile values finish quickly: long runs of whitespace, digits and nesting', () => {
  const started = Date.now()
  const long = ' '.repeat(20000)
  for (const [name, value] of [['transform', `rotate(${long}x`], ['transform', `translate(1)${long}x`], ['fill', `url(#a)${long}x`],
    ['d', `M${long}!`], ['stroke-dasharray', `${long}x`], ['viewBox', `${long}x`], ['points', `1${long}!`]]) {
    run(wrap(`<path id="a" ${name}="${value}"/>`), { maxBytes: 64 * 1024 })
  }
  assert.ok(Date.now() - started < 1500, 'no catastrophic backtracking')
})

// ── id prefix ───────────────────────────────────────────────────────────────

test('idPrefix renames every id and every reference to one, fallback colour kept', () => {
  const src = wrap('<defs><linearGradient id="g"/><clipPath id="c"><rect id="r" width="1" height="1"/></clipPath></defs>'
    + '<path d="M0 0" fill="url(#g) red" stroke="url(#g)" clip-path="url(#c)"/><use href="#r"/>')
  const out = run(src, { idPrefix: 'ic1' })
  assert.equal(out.ok, true)
  assert.equal(out.svg, wrap('<defs><linearGradient id="ic1.g"/><clipPath id="ic1.c"><rect id="ic1.r" width="1" height="1"/></clipPath></defs>'
    + '<path d="M0 0" fill="url(#ic1.g) red" stroke="url(#ic1.g)" clip-path="url(#ic1.c)"/><use href="#ic1.r"/>'))
  assertInert(out.svg)
})

test('two icons with the same ids share none once prefixed, and the sprite stays valid', () => {
  const a = run(wrap('<defs><clipPath id="c"/></defs><g clip-path="url(#c)"/>'), { idPrefix: 'a-' })
  const b = run(wrap('<defs><clipPath id="c"/></defs><g clip-path="url(#c)"/>'), { idPrefix: 'b-' })
  const ids = (svg) => [...svg.matchAll(/ id="([^"]+)"/g)].map(m => m[1])
  assert.deepEqual(ids(a.svg), ['a-.c'])
  assert.deepEqual(ids(b.svg), ['b-.c'])
  assert.match(a.svg, /clip-path="url\(#a-\.c\)"/)
  assert.match(b.svg, /clip-path="url\(#b-\.c\)"/)
})

test('a prefixed id is still a valid id and cannot be used to smuggle a reference', () => {
  const out = run(wrap('<path id="a" d="M0 0"/><use href="#a"/>'), { idPrefix: 'p_1-x' })
  assert.match(out.svg, /id="p_1-x\.a"/)
  assert.match(out.svg, /href="#p_1-x\.a"/)
})

test('different (prefix, id) pairs never give the same prefixed id', () => {
  // A prefix cannot contain the separator, so the first "." always ends the prefix.
  const idOut = (prefix, id) => run(wrap(`<path id="${id}" d="M0 0"/>`), { idPrefix: prefix }).svg.match(/ id="([^"]+)"/)[1]
  const pairs = [['ab', '_x'], ['a', 'b_x'], ['a_', 'x'], ['a', '_x'], ['a', 'b.x'], ['a-', 'x'], ['a', '_-x']]
  const seen = new Map()
  for (const [prefix, id] of pairs) {
    const out = idOut(prefix, id)
    assert.ok(!seen.has(out), `${prefix}+${id} collides with ${seen.get(out)} as ${out}`)
    seen.set(out, `${prefix}+${id}`)
  }
  assert.equal(seen.size, pairs.length)
})

test('without an idPrefix, ids nothing points at are dropped so they cannot reach the host page', () => {
  const out = run('<svg xmlns="' + NS + '" id="main-nav" viewBox="0 0 24 24"><g id="app"/><path id="label" d="M0 0"/></svg>')
  assert.equal(out.svg, wrap('<g/><path d="M0 0"/>'))
  assert.equal(out.ok, true, 'a dropped id is noise, not a finding')
  assert.deepEqual(out.removed, [])
})

test('without an idPrefix, ids that a kept url(#id) or <use href> points at stay, references intact', () => {
  const src = wrap('<defs><linearGradient id="g"/><clipPath id="c"/><path id="p" d="M0 0"/><g id="loose"/></defs>'
    + '<rect fill="url(#g) red" clip-path="url(#c)"/><use href="#p"/>')
  const out = run(src)
  assert.equal(out.svg, wrap('<defs><linearGradient id="g"/><clipPath id="c"/><path id="p" d="M0 0"/><g/></defs>'
    + '<rect fill="url(#g) red" clip-path="url(#c)"/><use href="#p"/>'))
  assert.equal(out.ok, true)
  // The reference can come before its target.
  assert.equal(run(wrap('<use href="#p"/><path id="p" d="M0 0"/>')).svg, wrap('<use href="#p"/><path id="p" d="M0 0"/>'))
})

test('without an idPrefix, an id only a dropped reference pointed at is dropped', () => {
  // The <use> goes (its href names nothing, or was refused), so its fill reference counts for nothing.
  for (const href of ['#missing', 'http://evil.example/x.svg#g']) {
    const out = run(wrap(`<linearGradient id="g"/><use fill="url(#g)" href="${href}"/>`))
    assert.equal(out.svg, wrap('<linearGradient/>'), href)
  }
  // A reference to an id in the page, not the file, is dropped and keeps no id alive.
  assert.equal(run(wrap('<g id="a"/><rect fill="url(#b)"/>')).svg, wrap('<g/><rect/>'))
})

test('with an idPrefix, every id is kept (prefixed), referenced or not', () => {
  const out = run(wrap('<g id="app"/><path id="p" d="M0 0"/><use href="#p"/>'), { idPrefix: 'ic' })
  assert.equal(out.svg, wrap('<g id="ic.app"/><path id="ic.p" d="M0 0"/><use href="#ic.p"/>'))
  assert.equal(out.ok, true)
})

test('a bad idPrefix is a caller bug and throws', () => {
  for (const bad of ['1x', 'a b', '"><x', '-a', 'a'.repeat(42), 'a.b', 'a#b']) {
    assert.throws(() => run(wrap(), { idPrefix: bad }), RangeError, bad)
  }
  assert.ok(run(wrap(), { idPrefix: '' }))
  assert.ok(run(wrap(), {}))
})

// ── invariants over a corpus ───────────────────────────────────────────────

const HOSTILE_CORPUS = [
  wrap('<script>alert(1)</script>'),
  wrap('<g onload="x()"><use href="javascript:alert(1)"/></g>'),
  wrap('<a xlink:href="javascript:alert(1)"><text>x</text></a>'),
  wrap('<foreignObject><iframe src="javascript:alert(1)"/></foreignObject>'),
  wrap('<style>*{fill:url(javascript:alert(1))}</style><path style="x:y" class="z" d="M0 0"/>'),
  wrap('<defs><path id="a" d="M0 0"/></defs><use href="#a"/><use href="http://evil.example/#a"/>'),
  wrap('<title><![CDATA[<script>]]></title>'),
  wrap('<rect fill="url(#a)" clip-path="url(http://evil.example/#c)"/>'),
  wrap('<SCRIPT>x</SCRIPT><Path ONCLICK="x"/>'),
  `<?xml-stylesheet href="x.css"?>${wrap('<set attributeName="href" to="javascript:alert(1)"/>')}`,
]

test('every hostile payload that is accepted comes out inert and unchanged by a second pass', () => {
  for (const src of HOSTILE_CORPUS) {
    const first = run(src)
    assert.ok(first, src)
    assertInert(first.svg, src)
    const second = run(first.svg)
    assert.equal(second.svg, first.svg, `not idempotent: ${src}`)
    assert.equal(second.ok, true, `a second pass still found something to remove: ${src}`)
    assert.deepEqual(second.removed, [])
  }
})

test('the same holds with an idPrefix: a prefixed result is stable apart from the prefix', () => {
  for (const src of HOSTILE_CORPUS) {
    const first = run(src, { idPrefix: 'q' })
    assertInert(first.svg, src)
    assert.equal(run(first.svg).svg, first.svg, src)
  }
})

// ── real icons ──────────────────────────────────────────────────────────────

// Same wrappers IconLibrary's embeddedSvgMarkup() builds for a built-in icon.
const embedded = (d, filled) => (filled
  ? `<svg xmlns="${NS}" viewBox="0 0 24 24" fill="currentColor"><path d="${d}"/></svg>`
  : `<svg xmlns="${NS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`)

test('every built-in icon from public/icons-data.js round-trips with the same elements and attributes', () => {
  const { icons, PACKS } = new Function(`${read('public/icons-data.js')}; return { icons, PACKS }`)()
  assert.ok(icons.length > 200)
  const byPack = {}
  for (const icon of icons) {
    const src = embedded(icon.d, icon.p === 'S')
    const out = run(src)
    assert.ok(out, icon.n)
    assert.equal(out.ok, true, `${icon.n} lost something: ${out.removed}`)
    assert.deepEqual(shape(out.svg), shape(src), icon.n)
    assert.equal(out.svg, src, `${icon.n} is not byte-identical`)
    byPack[icon.p] = (byPack[icon.p] || 0) + 1
  }
  for (const pack of ['L', 'T', 'S']) assert.ok(byPack[pack] > 5, `${PACKS[pack]} is covered`)
})

test('the committed sprite (symbols, clipPath, fill-rule, url(#clip)) keeps its shape', () => {
  const src = read('public/icons.svg')
  const out = run(src)
  assert.ok(out)
  assert.equal(out.ok, true, `the sprite lost: ${out.removed}`)
  // No prefix: only the clipPath id is referenced inside the file, so the
  // <symbol> ids (used from outside it) are gone.
  const keepReferencedId = (attrs) => attrs.filter(a => !a.startsWith('id=') || a === 'id=bluesky-clip')
  assert.deepEqual(shape(out.svg), shape(src).map(([t, attrs]) => [t, keepReferencedId(attrs)]))
  const tags = shape(out.svg).map(([t]) => t)
  for (const t of ['symbol', 'clipPath', 'defs', 'g', 'path']) assert.ok(tags.includes(t), t)
  assert.match(out.svg, /clip-path="url\(#bluesky-clip\)"/)
  assert.doesNotMatch(out.svg, /<symbol id=/)

  // With a prefix every id stays, so the same sprite is whole once the prefix is peeled off.
  const prefixed = run(src, { idPrefix: 'sp' })
  assert.match(prefixed.svg, /clip-path="url\(#sp\.bluesky-clip\)"/)
  assert.match(prefixed.svg, /<clipPath id="sp\.bluesky-clip">/)
  assert.match(prefixed.svg, /<symbol id="sp\.bluesky-icon"/)
  assert.deepEqual(shape(prefixed.svg.replace(/sp\./g, '')), shape(src))
})

test('a pretty-printed multi-pack icon with gradient, mask and symbol round-trips', () => {
  const src = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generator: an editor -->
<svg xmlns="${NS}" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="28" height="28" viewBox="0 0 28 28">
  <title>Flame</title>
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0" stop-color="#ff7a00"/>
      <stop offset="1" stop-color="#ff0040" stop-opacity=".8"/>
    </linearGradient>
    <mask id="cut"><rect width="28" height="28" fill="#fff"/><circle cx="14" cy="18" r="4" fill="#000"/></mask>
    <symbol id="dot" viewBox="0 0 4 4"><circle cx="2" cy="2" r="2"/></symbol>
  </defs>
  <g mask="url(#cut)" fill="url(#fade)" fill-rule="evenodd">
    <path d="M14 2c4 6 8 9 8 15a8 8 0 0 1-16 0c0-4 2-6 3-8 1 3 3 3 3 3s2-4 2-10z"/>
  </g>
  <use xlink:href="#dot" x="1" y="1" width="4" height="4"/>
</svg>`
  const out = run(src)
  assert.equal(out.ok, true)
  assert.deepEqual(shape(out.svg), shape(src.replace(' xlink:href=', ' href=')))
  assert.match(out.svg, /<title>Flame<\/title>/)
  assertInert(out.svg)
})
