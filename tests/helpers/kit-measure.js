// What spec 160 builds and measures: the UI kit's three layouts, rendered by the real
// generator from the real templates (or from KIT_TEMPLATES_DIR, a scratch copy a mutation
// run points at), with every font read from public/fonts so nothing is fetched.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { renderUiKit, KIT_CHROME } from '../../src/utils/uiKitExport.js'
import { loadPublisherFonts, SUBSET_RANGES } from '../../src/utils/kitFonts.js'

const ROOT = process.cwd()
const FONTS = path.join(ROOT, 'public', 'fonts')
export const FIXED_DATE = new Date('2026-03-04T00:00:00Z')
export const LAYOUTS = ['studio', 'manual', 'showcase']

const templateText = (layout) => fs.readFileSync(path.resolve(ROOT, process.env.KIT_TEMPLATES_DIR || 'src/templates/kit', `${layout}.html`), 'utf8')

// The project's own faces: Outfit for headings and Manrope for body, as files already in the repo.
const projectFace = (family, file, licence) => ({
  faces: [{ base64: fs.readFileSync(path.join(FONTS, file)).toString('base64'), format: 'woff2', weight: '100 900', unicodeRange: SUBSET_RANGES.latin }],
  license: { name: 'SIL Open Font License', text: fs.readFileSync(path.join(FONTS, licence), 'utf8') },
})
const PROJECT_FONTS = {
  Outfit: projectFace('Outfit', 'outfit-latin.woff2', 'OUTFIT-OFL.txt'),
  Manrope: projectFace('Manrope', 'manrope-latin.woff2', 'MANROPE-OFL.txt'),
}

// The publisher faces come from the same folder, through the loader the export itself uses.
const localFetch = async (url) => {
  const file = path.join(FONTS, decodeURIComponent(String(url)).replace(/^\/fonts\//, ''))
  if (!fs.existsSync(file)) return { ok: false }
  return { ok: true, arrayBuffer: async () => { const b = fs.readFileSync(file); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }, text: async () => fs.readFileSync(file, 'utf8') }
}
const publisherCache = {}
async function publisherFor(layout) {
  publisherCache[layout] ||= await loadPublisherFonts({ fetch: localFetch, families: KIT_CHROME[layout] })
  return publisherCache[layout]
}

// The logos: a wide mark and a square one, as the uploader stores them.
const markSvg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#222222"/><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 3}" fill="#E8B04A"/></svg>`
export const LOGOS = {
  wide: { src: `data:image/svg+xml;base64,${Buffer.from(markSvg(240, 60), 'utf8').toString('base64')}`, width: 240, height: 60, type: 'image/svg+xml', name: 'mark.svg' },
  square: { src: `data:image/svg+xml;base64,${Buffer.from(markSvg(100, 100), 'utf8').toString('base64')}`, width: 100, height: 100, type: 'image/svg+xml', name: 'mark.svg' },
}

/** Build one kit exactly as the export panel would, from a design, a layout and a tier. */
export async function buildKit({ layout, tier, colours, name, description = '', logo = null }) {
  const design = {
    palette: { base: colours[0], harmony: 'auto', colors: colours },
    fonts: { heading: { family: 'Outfit', weight: 700 }, body: { family: 'Manrope', weight: 400 } },
    identity: { name, description },
    ...(logo ? { logo: LOGOS[logo] } : {}),
  }
  const publisher = await publisherFor(layout)
  const out = renderUiKit(design, {
    template: templateText(layout), tier, fonts: PROJECT_FONTS, ...publisher, date: FIXED_DATE,
    logo: tier === 'pro' && logo ? { src: LOGOS[logo].src } : null,
  })
  return out.html
}

/**
 * The pages of a PDF: its size, and whether anything is written on it. A page is blank
 * when its content stream shows no text (Skia writes every glyph with a Tj or TJ operator).
 */
export function pdfPages(buffer) {
  const text = buffer.toString('latin1')
  const objects = new Map()
  for (const m of text.matchAll(/(\d+) 0 obj\b/g)) objects.set(Number(m[1]), m.index)
  const body = (n) => {
    const at = objects.get(n)
    if (at === undefined) return ''
    return text.slice(at, text.indexOf('endobj', at))
  }
  const stream = (n) => {
    const at = objects.get(n)
    if (at === undefined) return ''
    const head = text.slice(at, text.indexOf('stream', at))
    const start = text.indexOf('stream', at) + 'stream'.length
    const from = text[start] === '\r' ? start + 2 : start + 1
    const raw = buffer.subarray(from, text.indexOf('endstream', from))
    try { return /FlateDecode/.test(head) ? zlib.inflateSync(raw).toString('latin1') : raw.toString('latin1') } catch { return '' }
  }
  const pages = []
  for (const m of text.matchAll(/\/Type\s*\/Page\b(?!s)/g)) {
    const object = text.slice(Math.max(text.lastIndexOf('obj', m.index), 0), text.indexOf('endobj', m.index))
    const box = /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(object)
    const contents = /\/Contents\s*(?:\[([^\]]*)\]|(\d+)\s+0\s+R)/.exec(object)
    const ids = contents ? [...(contents[1] || `${contents[2]} 0 R`).matchAll(/(\d+)\s+0\s+R/g)].map((x) => Number(x[1])) : []
    const ops = ids.map(stream).join('\n')
    pages.push({ w: box ? Number(box[3]) - Number(box[1]) : null, h: box ? Number(box[4]) - Number(box[2]) : null, text: /\b(?:Tj|TJ)\b/.test(ops), bytes: ops.length })
  }
  return pages
}

/**
 * Everything measured in the page, in one pass. Runs in the browser, so it takes and
 * returns plain data only.
 *   floor   the smallest text size allowed, in px
 *   name    the whole project name (Pro), or '' (Free)
 */
export function measureKit({ floor, name, demo = true }) {
  const tag = (el) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`
  const flat = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase()
  const out = { innerWidth: window.innerWidth, docWidth: document.documentElement.scrollWidth, outside: [], tables: [], small: [], tracked: [], weak: [], textNodes: 0, wholeName: false, cutTitle: false, judged: 0 }

  // ---- colour helpers: any CSS colour to [r, g, b, a], through a canvas so color-mix() and friends resolve ----
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  const rgba = (css) => {
    const m = /^rgba?(([^)]+))$/.exec(css)
    if (m) {
      const p = m[1].split(/[s,/]+/).filter(Boolean).map(Number)
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]
    }
    const s = /^color(srgb ([^)]+))$/.exec(css)
    if (s) {
      const p = s[1].split(/[s/]+/).filter(Boolean).map(Number)
      return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]
    }
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = css
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2], d[3] / 255]
  }
  const over = (top, under) => {
    const a = top[3] + under[3] * (1 - top[3])
    if (a === 0) return [0, 0, 0, 0]
    return [0, 1, 2].map((i) => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a).concat(a)
  }
  const lin = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }

  // The colour behind an element's text: its own and its ancestors' backgrounds, stacked. Null when an image or
  // gradient sits behind it (nothing can be said from a flat colour).
  const behind = (el) => {
    let layers = []
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e)
      if (cs.backgroundImage !== 'none') return null
      const c = rgba(cs.backgroundColor)
      if (c[3] > 0) { layers.push(c); if (c[3] >= 0.999) break }
    }
    let acc = [255, 255, 255, 1]
    for (let i = layers.length - 1; i >= 0; i -= 1) acc = over(layers[i], acc)
    return acc
  }
  const opacityOf = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o }

  // The labelled demonstrations, which show a colour pair on purpose with its ratio and grade written beside it:
  // Studio's "Aa" tiles in the contrast strip, and Manual's body-text sample in a colour row. A disabled control
  // is exempt as WCAG exempts it. Nothing else is: not the swatches, the chips, the states or the stripes.
  const DEMO = '.contrast-pair > span, .smp, .smp *, [disabled], [aria-disabled="true"]'
  // A type specimen is set at the size it shows (scaled to fit on paper), so it is not held to the text floor.
  const SPECIMEN = '.spec, .spec *'

  const inClipper = (el) => {
    for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e)
      if (['auto', 'scroll', 'hidden', 'clip'].includes(cs.overflowX)) return true
    }
    return false
  }
  const w = window.innerWidth
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.position === 'fixed') continue
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.right > w + 1 && !inClipper(el)) out.outside.push(`${tag(el)} ends at ${Math.round(r.right)}px in a ${w}px window`)
  }
  out.outside = out.outside.slice(0, 8)

  // A table that scrolls sideways says so in words.
  for (const wrap of document.querySelectorAll('.tbl-wrap, .role-table-wrap, .table-wrap')) {
    const cs = getComputedStyle(wrap)
    if (cs.display === 'none') continue
    const scrolls = wrap.scrollWidth > wrap.clientWidth + 1
    const hint = wrap.nextElementSibling?.classList.contains('scroll-hint') ? wrap.nextElementSibling : null
    const shown = Boolean(hint) && getComputedStyle(hint).display !== 'none' && hint.getBoundingClientRect().height > 0
    out.tables.push({ label: wrap.getAttribute('aria-label') || tag(wrap), scrolls, hint: shown, overflow: cs.overflowX })
  }

  // Text: size, tracked capitals, contrast.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue.trim()
    if (!text) continue
    const el = node.parentElement
    if (!el || ['STYLE', 'SCRIPT', 'NOSCRIPT', 'TITLE'].includes(el.tagName)) continue
    const rects = el.getClientRects()
    if (!rects.length) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    const box = el.getBoundingClientRect()
    if (box.width <= 1.5 && box.height <= 1.5) continue // sr-only: read aloud, never seen
    out.textNodes += 1
    const px = parseFloat(cs.fontSize)
    if (px < floor - 0.01 && !el.closest(SPECIMEN)) out.small.push(`${tag(el)} "${text.slice(0, 24)}" is ${px.toFixed(2)}px`)
    if (cs.textTransform === 'uppercase' && parseFloat(cs.letterSpacing) / px > 0.04) {
      out.tracked.push(`${tag(el)} "${text.slice(0, 24)}" uppercase at ${(parseFloat(cs.letterSpacing) / px).toFixed(2)}em`)
    }
    if (!demo || !el.closest(DEMO)) {
      const bg = behind(el)
      if (bg) {
        out.judged += 1
        const fg = rgba(cs.color)
        const a = fg[3] * opacityOf(el)
        const c = ratio(over([fg[0], fg[1], fg[2], a], bg), bg)
        if (c < 4.5) out.weak.push(`${tag(el)} "${text.slice(0, 28)}" ${c.toFixed(2)}:1`)
      }
    }
    // The whole project name where nothing cuts it.
    if (name) {
      if (flat(node.nodeValue).includes(flat(name))) {
        let cut = cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')
        for (let e = el; e && !cut && e !== document.body; e = e.parentElement) {
          const s = getComputedStyle(e)
          if (['hidden', 'clip'].includes(s.overflowX) || ['hidden', 'clip'].includes(s.overflowY)) {
            if (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) cut = true
          }
        }
        if (!cut && !el.closest('.cover-title')) out.wholeName = true
      }
    }
  }
  // Is the name cut on the cover? The visible cover title ends in an ellipsis when it is.
  const cover = [...document.querySelectorAll('.cover-title, h1')].find((e) => e.getClientRects().length)
  out.cutTitle = Boolean(cover && cover.innerText.trim().endsWith('…'))
  return out
}
