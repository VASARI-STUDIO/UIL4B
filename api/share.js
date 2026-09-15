import zlib from 'node:zlib'

// Palette share endpoint — gives shared palette links a real social preview.
//   GET /api/share?c=4338E0,7C6CF0,...        → HTML with OG/Twitter meta whose
//     og:image points back at this endpoint, plus an instant redirect that
//     sends humans on to the Palette Builder (/create/palette?c=...).
//   GET /api/share?c=...&img=1                → 1200×630 PNG of the palette as
//     flat colour stripes, generated in pure JS (raw scanlines + node:zlib) so
//     it needs no canvas/image dependency.
// The /p/:code rewrite in vercel.json makes the copied short link
// (https://uil4b.com/p/4338E0,...) resolve here.

const CODE_RE = /^[0-9a-fA-F]{6}(,[0-9a-fA-F]{6}){0,11}$/

const W = 1200
const H = 630

// ── minimal PNG writer ───────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// Full-height vertical stripes, one per colour — every scanline is identical,
// so build one row (filter byte 0 + RGB pixels) and repeat it H times.
function palettePng(hexes) {
  const row = Buffer.alloc(1 + W * 3)
  const stripe = W / hexes.length
  for (let x = 0; x < W; x++) {
    const hex = hexes[Math.min(hexes.length - 1, Math.floor(x / stripe))]
    const o = 1 + x * 3
    row[o] = parseInt(hex.slice(0, 2), 16)
    row[o + 1] = parseInt(hex.slice(2, 4), 16)
    row[o + 2] = parseInt(hex.slice(4, 6), 16)
  }
  const raw = Buffer.concat(Array.from({ length: H }, () => row))

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0)
  ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // colour type: truecolour RGB
  // compression / filter / interlace stay 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── handler ──────────────────────────────────────────────────────────────────

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const code = String(req.query?.c || '')
  if (!CODE_RE.test(code)) {
    return res.status(400).json({ error: 'c must be 1-12 comma-separated 6-digit hex colours (no #)' })
  }
  const hexes = code.toUpperCase().split(',')

  // Deterministic output per URL — let crawlers and the CDN cache it hard.
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=604800, immutable')

  if (req.query?.img) {
    res.setHeader('Content-Type', 'image/png')
    return res.status(200).send(palettePng(hexes))
  }

  // THE ORIGIN COMES FROM THE ENVIRONMENT, NEVER FROM THE REQUEST.
  //
  // This read `x-forwarded-host || host` and interpolated it into every URL in
  // the document below — og:url, og:image, twitter:image, the canonical and the
  // redirect. Two lines above, the response is stamped
  // `s-maxage=604800, immutable`, so whatever the FIRST request produced is
  // what the CDN serves everyone else for a week.
  //
  // x-forwarded-host is a client-supplied header. A single crafted request to
  // a /p/<code> link could therefore fill a cached, week-long, shared document
  // with URLs pointing at somebody else's host — including the og:image every
  // unfurler fetches and the redirect a human follows. That is the whole
  // cache-poisoning shape, and the caching header is what turns it from one bad
  // response into a persistent one.
  //
  // Whether a given platform forwards a client's x-forwarded-host is a
  // deployment detail that can change under us; the value is not needed here
  // either way. VERCEL_ENV and VERCEL_URL are set by the platform, not by the
  // caller, so a preview deployment still links to itself and production always
  // links to the canonical host. SITE_ORIGIN in src/utils/routeMeta.js holds the
  // same literal — api/ is bundled separately and does not import from src/,
  // which is why it is restated rather than shared, and api/ai.js already
  // carries this exact fallback shape.
  const origin = process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production' && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://uil4b.com'
  const appUrl = `${origin}/create/palette?c=${code}`
  const imgUrl = `${origin}/api/share?c=${code}&img=1`
  const title = `${hexes.length}-colour palette — UIL4B`
  const desc = hexes.map(h => `#${h}`).join(' · ')

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="UIL4B">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${appUrl}">
<meta property="og:image" content="${imgUrl}">
<meta property="og:image:width" content="${W}">
<meta property="og:image:height" content="${H}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${imgUrl}">
<meta http-equiv="refresh" content="0;url=${appUrl}">
<script>location.replace(${JSON.stringify(appUrl)})</script>
</head>
<body>
<p>Opening this palette in <a href="${appUrl}">the UIL4B Palette Builder</a>…</p>
</body>
</html>`)
}
