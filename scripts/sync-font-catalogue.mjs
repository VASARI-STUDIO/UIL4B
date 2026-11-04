// Write public/data/font-catalogue.json: the Google Fonts catalogue, as a static
// file the font tools can load without waking a serverless function.
//
//   node scripts/sync-font-catalogue.mjs        (npm run sync:fonts)
//
// The file holds `{ "fonts": [...] }`, the exact body /api/fonts answers with,
// because both are produced by the same reshaping (api/_lib/fontCatalogue.js).
// The client loads this file first and refreshes from /api/fonts afterwards, so
// a cold start or a CDN miss on the API no longer decides whether the tools see
// the full catalogue.
//
// It needs network access to fonts.google.com and is run by hand, then the
// result is committed; it is deliberately not part of the build. It reads no
// key and writes none: the metadata endpoint is public.
//
// The anti-XSSI guard is optional here: parseMetadataText strips it when present,
// and the body is plain JSON when it is not.
//
// An unusually small or empty answer aborts without touching the committed file.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import {
  METADATA_URL,
  fontsFromMetadataList,
  parseMetadataText,
} from '../api/_lib/fontCatalogue.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'data', 'font-catalogue.json')
// Google lists well over 1,000 families; far fewer means the answer changed shape.
const MIN_FAMILIES = 500

const res = await fetch(METADATA_URL, { signal: AbortSignal.timeout(60_000) })
if (!res.ok) throw new Error(`${METADATA_URL} answered HTTP ${res.status}`)
const text = await res.text()
const fonts = fontsFromMetadataList(parseMetadataText(text).familyMetadataList || [])
if (fonts.length < MIN_FAMILIES) {
  throw new Error(`Only ${fonts.length} usable families (expected at least ${MIN_FAMILIES}); leaving ${path.relative(ROOT, OUT)} alone.`)
}

const body = JSON.stringify({ fonts })
await mkdir(path.dirname(OUT), { recursive: true })
await writeFile(OUT, body)

const bytes = Buffer.byteLength(body)
console.log(`${path.relative(ROOT, OUT)}: ${fonts.length} families, ${bytes} bytes (${gzipSync(body).length} gzip)`)
