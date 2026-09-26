// The response headers every page ships with, read out of vercel.json.
//
// Every page ships framing, nosniff, referrer-policy and CSP headers.
//
// THE CSP lists what the code actually loads (found by grepping src/ for the
// hosts below, not guessed).
//
// FRAMING: DENY everywhere except /previews/, because the Prompt Library frames
// its own /previews/prompts/<id>.html (src/components/prompt/PromptModal.jsx),
// and DENY there would blank every live preview.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const REPO = process.cwd()
const config = JSON.parse(fs.readFileSync(path.join(REPO, 'vercel.json'), 'utf8'))
const read = (f) => fs.readFileSync(path.join(REPO, f), 'utf8')

// Every `source` in the headers block is a path with regex groups and no
// named params, so it is also a valid JavaScript regex once anchored. Asserted
// rather than assumed, so a `:param` source cannot be silently mis-matched.
function headersFor(p) {
  const out = {}
  for (const rule of config.headers) {
    assert.ok(!/:\w/.test(rule.source), `${rule.source} uses a named param; teach headersFor() about it`)
    if (new RegExp(`^${rule.source}$`).test(p)) {
      for (const { key, value } of rule.headers) {
        assert.ok(!(key.toLowerCase() in out) || out[key.toLowerCase()] === value,
          `${p} gets two different ${key} values — which one Vercel sends is not something to rely on`)
        out[key.toLowerCase()] = value
      }
    }
  }
  return out
}

const PAGES = ['/', '/create/palette', '/settings', '/nope', '/api/support', '/assets/index-abc.js']

test('every response carries the baseline security headers', () => {
  for (const p of PAGES) {
    const h = headersFor(p)
    assert.equal(h['x-content-type-options'], 'nosniff', p)
    assert.equal(h['referrer-policy'], 'strict-origin-when-cross-origin', p)
    assert.match(h['strict-transport-security'] || '', /max-age=\d{8,};\s*includeSubDomains/, p)
    assert.match(h['permissions-policy'] || '', /camera=\(\)/, p)
    assert.match(h['permissions-policy'] || '', /microphone=\(\)/, p)
    assert.match(h['permissions-policy'] || '', /geolocation=\(\)/, p)
    // Not `payment=()`: the embedded Stripe Checkout iframe needs the payment
    // permission delegated for Apple Pay / Google Pay.
    assert.doesNotMatch(h['permissions-policy'], /payment=/, p)
  }
})

test('pages cannot be framed by another site, and the prompt previews can still be framed by ours', () => {
  for (const p of PAGES) assert.equal(headersFor(p)['x-frame-options'], 'DENY', p)
  assert.equal(headersFor('/previews/prompts/c-1.html')['x-frame-options'], 'SAMEORIGIN')
  // The reason for the exception, so it cannot outlive the thing it exists for.
  assert.match(read('src/data/promptPreviewAssets.js'), /\/previews\/prompts\//)
})

test('the Content-Security-Policy is report-only, never enforcing, for now', () => {
  const h = headersFor('/')
  assert.equal(h['content-security-policy'], undefined,
    'an ENFORCING CSP shipped — turn it on only after the report-only console is clean')
  assert.ok(h['content-security-policy-report-only'], 'no report-only CSP')
})

function csp() {
  const raw = headersFor('/create/palette')['content-security-policy-report-only']
  const out = {}
  for (const part of raw.split(';').map((s) => s.trim()).filter(Boolean)) {
    const [name, ...values] = part.split(/\s+/)
    out[name] = values
  }
  return out
}

test('the CSP allows what the code actually loads', () => {
  const d = csp()
  const allows = (directive, host) => (d[directive] || []).some((v) =>
    v === host || (v.startsWith('https://*.') && host.endsWith(v.slice('https://*'.length))))
  // [directive, origin, the file that loads it — asserted to still say so]
  const loads = [
    ['script-src', 'https://js.stripe.com', 'node_modules/@stripe/stripe-js/dist/index.mjs'],
    ['frame-src', 'https://js.stripe.com', 'node_modules/@stripe/stripe-js/dist/index.mjs'],
    ['connect-src', 'https://api.stripe.com', null],
    ['frame-src', 'https://checkout.stripe.com', null],
    ['script-src', 'https://accounts.google.com', 'src/components/GoogleOneTap.jsx'],
    ['frame-src', 'https://accounts.google.com', 'src/components/GoogleOneTap.jsx'],
    ['script-src', 'https://apis.google.com', null],
    ['frame-src', 'https://uil4b-357c5.firebaseapp.com', 'src/utils/firebase.js'],
    ['connect-src', 'https://firestore.googleapis.com', null],
    ['connect-src', 'https://identitytoolkit.googleapis.com', null],
    ['connect-src', 'https://securetoken.googleapis.com', null],
    ['connect-src', 'https://www.googleapis.com', 'src/utils/googleFonts.js'],
    ['style-src', 'https://fonts.googleapis.com', 'src/styles/global.css'],
    ['font-src', 'https://fonts.gstatic.com', 'src/styles/global.css'],
    ['connect-src', 'https://api.iconify.design', 'src/pages/IconLibrary.jsx'],
    ['img-src', 'https://api.iconify.design', 'src/pages/IconLibrary.jsx'],
    ['img-src', 'https://img.logo.dev', 'src/pages/IconLibrary.jsx'],
    ['img-src', 'https://flagcdn.com', 'src/pages/Settings.jsx'],
    ['connect-src', 'https://cdn.jsdelivr.net', 'src/utils/ffmpegEngine.js'],
    ['connect-src', 'https://cdn.jsdelivr.net', 'src/utils/cadEngine.js'],
    ['connect-src', 'https://fonts.googleapis.com', 'src/utils/kitFonts.js'],
    ['connect-src', 'https://fonts.gstatic.com', 'src/utils/kitFonts.js'],
    ['connect-src', 'https://cdn.jsdelivr.net', 'src/utils/kitFonts.js'],
    ['img-src', 'https://lh3.googleusercontent.com', null],
  ]
  for (const [directive, origin, file] of loads) {
    assert.ok(allows(directive, origin), `${directive} does not allow ${origin}`)
    if (file) assert.ok(read(file).includes(origin.replace('https://', '').replace('uil4b-357c5.', '')),
      `${file} no longer mentions ${origin} — re-derive this row`)
  }
  // The engines run WebAssembly, and their workers start from blob: URLs
  // (src/utils/cadEngine.js says so in as many words).
  assert.ok(d['script-src'].includes("'wasm-unsafe-eval'"))
  assert.ok(d['worker-src'].includes('blob:'))
})

test('the CSP closes the doors nothing uses', () => {
  const d = csp()
  assert.deepEqual(d['object-src'], ["'none'"])
  assert.deepEqual(d['base-uri'], ["'self'"])
  assert.deepEqual(d['default-src'], ["'self'"])
  assert.ok(d['frame-ancestors'], 'no frame-ancestors')
  assert.ok(!Object.values(d).flat().includes('*'), 'a bare * source makes the policy meaningless')
  assert.ok(!d['script-src'].includes("'unsafe-eval'"), "'unsafe-eval' is not needed — wasm has its own keyword")
})
