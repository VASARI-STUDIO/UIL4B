// The sample projects the template tests render, and the way their output is
// fingerprinted. Shared so the golden capture and the golden test cannot drift
// apart: one list of designs, one fixed clock, one way to hash a document.
import { createHash } from 'node:crypto'

// A clock the documents read for their "Issued" lines. A fixed instant, so a
// document built today and one built next year are the same string.
export const FIXED_DATE = new Date(0)

// A 2 by 1 vector mark, as the logo field stores it: a data URI with its size.
const MARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32"><rect width="64" height="32" rx="6" fill="#222"/><circle cx="16" cy="16" r="8" fill="#fff"/></svg>'
export const SAMPLE_LOGO = Object.freeze({
  src: `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString('base64')}`,
  width: 64,
  height: 32,
  name: 'mark.svg',
})

// Four designs that between them reach every branch the three layouts have: a
// full system with a gradient, a system with a logo and a different harmony, a
// sparse one (two colours, one family for both roles) and an empty one, which
// is the "no palette saved" fallback.
export const SAMPLES = Object.freeze({
  northbeam: {
    name: 'Northbeam',
    design: {
      palette: { base: '#1F4B8E', harmony: 'analogous', colors: ['#1F4B8E', '#2E7BB8', '#3FA9A0', '#C7D9E8', '#0D2540'] },
      gradient: { stops: [{ color: '#1F4B8E', position: 0 }, { color: '#3FA9A0', position: 100 }], angle: 135, type: 'Linear' },
      fonts: { heading: { family: 'Space Grotesk', weight: 700 }, body: { family: 'Inter', weight: 400 } },
      typeScale: { base: 16, ratio: 1.25, lineHeight: 1.55, headingSpacing: -0.02 },
      states: { success: 1, warning: 0, error: 0, info: 0 },
    },
  },
  halcyon: {
    name: 'Halcyon & Sons',
    design: {
      palette: { base: '#0E7C86', harmony: 'triadic', colors: ['#0E7C86', '#E8B04A', '#B5413B', '#F3F0E8', '#1D2B2E'] },
      fonts: { heading: { family: 'Fraunces', weight: 600 }, body: { family: 'Work Sans', weight: 400 } },
      typeScale: { base: 17, ratio: 1.333, lineHeight: 1.6 },
      logo: SAMPLE_LOGO,
      identity: { name: 'Halcyon', description: 'A small studio that makes calm interfaces.' },
    },
  },
  ferrule: {
    name: 'Ferrule',
    design: {
      palette: { base: '#B4552D', harmony: 'auto', colors: ['#B4552D', '#F5EDE3'] },
      fonts: { heading: { family: 'DM Sans', weight: 500 }, body: { family: 'DM Sans', weight: 400 } },
      typeScale: { base: 16, ratio: 1.2, lineHeight: 1.5 },
    },
  },
  bare: { name: 'Design System', design: {} },
})

export const sampleNames = () => Object.keys(SAMPLES)

// A fingerprint that says WHERE a document changed, not only that it did:
// the whole-document sha256, and a short hash of every line. A failing golden
// test then reports the first line that differs rather than "not equal".
const h = (s, n) => createHash('sha256').update(s).digest('hex').slice(0, n)
export function fingerprint(text) {
  const lines = String(text).split('\n')
  return { sha256: h(text, 64), length: text.length, lines: lines.length, lineHashes: lines.map((l) => h(l, 6)).join('') }
}

// The first line where `text` departs from a stored fingerprint, 1-based, or 0
// when they agree.
export function firstDifference(text, stored) {
  const now = String(text).split('\n')
  for (let i = 0; i < Math.max(now.length, stored.lines); i += 1) {
    const was = stored.lineHashes.slice(i * 6, i * 6 + 6)
    const is = i < now.length ? h(now[i], 6) : ''
    if (was !== is) return i + 1
  }
  return 0
}
