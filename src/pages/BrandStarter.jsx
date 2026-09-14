import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthGate from '../components/AuthGate'
import { useAuth } from '../contexts/AuthContext'
import useOnline from '../hooks/useOnline'
import { useSubscription } from '../contexts/SubscriptionContext'
import { auth as firebaseAuth } from '../utils/firebase'
import { contrastRatio } from '../utils/colors'
import { loadFont } from '../utils/googleFonts'
import { paletteBuilderUrl } from '../data/paletteGallery'
import { setPairDraft, setScaleDraft } from '../utils/typeHandoff'
import { navigatesThisTab } from '../utils/handoffSlot'
import { describeProvider, providerBadgeStyle } from '../utils/aiProvider'
import {
  BETA_NOTE,
  MAX_PROMPT_CHARS,
  MIN_PROMPT_CHARS,
  allowanceSentence,
  exhaustedMessage,
  generationAllowance,
  generationsRemaining,
} from '../config/aiGeneration'
// The `brand-starter` page stylesheet. Imported here rather than from global.css so
// Vite emits it as this lazy route's own chunk stylesheet — only a visitor who
// opens this page downloads it, and it arrives with the chunk, before paint.
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/studio.css'
import '../styles/pages/brand-starter.css'

// THE BRAND STARTER (beta) — one description in, three artefacts out.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS REPLACES, AND WHY THAT MATTERS MORE THAN WHAT IT ADDS
// ─────────────────────────────────────────────────────────────────────────────
// /create/auto-builder already existed. src/data/moduleBoard.js records it as
// area 'AI', status planned: "Dormant alpha 'describe your business → UI'
// implementation; public activation is deferred", with the next step written
// down as "AI mode deferred to stay under Vercel 12-function limit — revisit".
//
// So the founder's request is not a new feature — it is the revisit. The
// twelve-function limit no longer blocks it, because /api/ai is a consolidated
// multi-task route and a generation is a MODE inside it rather than a
// thirteenth file (which tests/unit/account-deletion.test.js fails the build
// on). The route was flipped out of the workshop, moved from the UI Component
// Builder group into AI Studio where its own board entry already filed it, and
// the page it mounts is this one.
//
// The 671-line page that used to sit behind that route is deleted. It was
// unreachable — absent from CreateTool's LIVE_TOOLS, so /create/auto-builder
// rendered the 🤫 workshop state and nothing ever imported the module (eslint
// here cannot see an unused React component; it was found by grep). It also
// could not have shipped as-is: it called itself AI and was a string hash
// (`hashSeed`) picking from six hard-coded mood profiles, it painted a
// "decorative gradient orb" at blur(40px), and it rendered a fake marketing
// hero with invented copy — "Professional services you can trust" — over the
// generated colours. That is the anti-slop bar's "decorative product mock-ups
// contain implausible data" and "glow, blur, gradients layered as a generic
// premium signal", on the one surface in the product where the founder's own
// "AI slop" worry is sharpest.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE ONE DECISION EVERYTHING ELSE FOLLOWS: NOTHING IS APPLIED AUTOMATICALLY
// ─────────────────────────────────────────────────────────────────────────────
// The result could write straight into `design` in ProjectContext and appear
// instantly in every tool. It deliberately does not.
//
// That store holds the work the person is already doing, and overwriting it
// from a text box is the founder's own reported bug in another form: "sometimes
// I open the palette builder and it has added many colours and it's a different
// swatch" (see the EXPIRE note in utils/handoffSlot.js). A generator that
// silently replaces your system is worse than one that does nothing.
//
// So each artefact carries an explicit hand-off into the tool that owns it,
// through the mechanisms that already exist and are already tested:
//   · palette    → paletteBuilderUrl(), the ?c= URL the Discover galleries and
//                  the homepage starters use. A real URL, so it survives a
//                  reload and can be shared.
//   · fonts      → setPairDraft(), the versioned in-memory slot Font Pair and
//                  Type Scale already read.
//   · type scale → setScaleDraft(), the same slot carrying base + ratio.
// No new hand-off mechanism was invented, and no tool needed changing to
// receive one.
//
// ─────────────────────────────────────────────────────────────────────────────
// MOBBIN — which screen drove which decision
// ─────────────────────────────────────────────────────────────────────────────
//   · Customer.io "Design Studio" (web) — the feature name carries a literal
//     `Beta` chip in the header; the generation runs over the style variables
//     the user already has rather than on a screen of its own; and a failure is
//     an INLINE banner naming the actual cause ("The site may be blocking
//     automated access") with Try again, while every existing value stays
//     visible and untouched below it. That drove the beta label, the composer
//     sitting above the result rather than behind a wizard, and the error state
//     saying what happened and that nothing was lost.
//     https://mobbin.com/flows/fd22b0b9-1d07-4b64-8514-7dd5580ac298
//   · HubSpot "Generate brand voice" (web) — a live `541 / 10,000 words max`
//     counter on the input, a BETA badge on the nav item, and a final step
//     named "Review and edit" whose output lands in the real Brand Kit fields.
//     That drove the character counter, the nav badge, and the framing of the
//     result as a draft to open in a tool rather than a finished artefact.
//     https://mobbin.com/flows/64163e57-f2de-456b-89d8-e6ff18316f55
//   · Bloom "Brand → Design Language" (web) — colours as a bare swatch row and
//     fonts as "Aa Bb Cc" specimen tiles with the family named beneath, under
//     plain section labels. That drove rendering the result as SPECIMENS on
//     hairline rules instead of three equally weighted rounded cards, which is
//     the anti-slop bar's named composition failure and the same call the User
//     Home made ("this page has exactly one card shape").
//     https://mobbin.com/flows/ffbc50b7-dbf3-433c-a294-55e03799a693
//   · Base44 (web) — the month-limit notice is a thin strip attached to the top
//     of the prompt field, with one text link to upgrade and a dismiss. The
//     composer stays where it is. That drove the quota-exhausted state.
//     https://mobbin.com/screens/a44dad2b-f50e-4acb-9267-b75f480f1ecd
//   · Krea AI (web) — REJECTED as the model for the same state: a full-screen
//     modal of three gradient-filled pricing cards thrown over the tool the
//     moment you run out. It is the "equally weighted rounded card" and
//     "gradients as a generic premium signal" failures in one screen, and it
//     answers a question the user did not ask at the moment they are most
//     annoyed.
//     https://mobbin.com/screens/dffee797-6dd4-4dc2-8fb5-a26404efdf99

// A brief the tool can honestly say is enough. Written as a real product rather
// than a placeholder mood board, because a placeholder that reads "your idea
// here" teaches nothing about what a good input looks like.
const EXAMPLE_BRIEF = 'A booking app for independent dog groomers. Calm and practical, '
  + 'not corporate. Most of the screen is a schedule, so it has to stay readable all day.'

/** Where the result's own numbers come from, so no band invents a heading. */
const BANDS = [
  { n: '01', id: 'palette', label: 'Palette' },
  { n: '02', id: 'fonts', label: 'Font pairing' },
  { n: '03', id: 'typeScale', label: 'Type scale' },
]

// A FIXED, HONEST EXAMPLE of the generator's output, for signed-out visitors.
//
// Not a random draw and not a live call: a signed-out page must not spend an AI
// allowance, and a specimen that changed on every reload would be decoration
// rather than an example. The hexes are a real ramp, the two families are the
// two that genuinely ship (the same constraint the Font Pair preview documents
// — `--display` resolves to Manrope, so a third "family" would be a duplicate
// passed off as variety), and the steps are a real 1.25 scale off a 16px base:
// 16, 20, 25, 31, 39.
//
// `brief` is printed beside it so the example is attributed to an input rather
// than floating free, which is what makes it read as a sample and not a claim.
const SAMPLE_STARTER = Object.freeze({
  brief: 'a calm reading app for long articles',
  palette: Object.freeze([
    Object.freeze({ role: 'Primary', hex: '#1F3A5F' }),
    Object.freeze({ role: 'Secondary', hex: '#4A6FA5' }),
    Object.freeze({ role: 'Accent', hex: '#C97B4A' }),
    Object.freeze({ role: 'Subtle', hex: '#E8E4DC' }),
    Object.freeze({ role: 'Deep', hex: '#12202F' }),
  ]),
  fonts: Object.freeze({ heading: 'Manrope', body: 'JetBrains Mono' }),
  scale: Object.freeze([
    Object.freeze({ name: 'Body', px: 16 }),
    Object.freeze({ name: 'H4', px: 20 }),
    Object.freeze({ name: 'H3', px: 25 }),
    Object.freeze({ name: 'H2', px: 31 }),
    Object.freeze({ name: 'H1', px: 39 }),
  ]),
})

/**
 * The Background and Text roles, by name, falling back to the extremes.
 *
 * The server's brief asks for both roles and for 4.5:1 between them, but a
 * brief is a request, not a guarantee — so the pair is FOUND rather than
 * assumed, and the ratio is MEASURED rather than claimed. This is the one place
 * the product can check its own generator's homework with a tool it already
 * owns, and saying "we asked for AA" while shipping 3.1:1 would be exactly the
 * unbacked claim the plans-truth suite exists to stop.
 */
function readingPair(palette) {
  if (!Array.isArray(palette) || palette.length < 2) return null
  const byRole = (re) => palette.find((c) => re.test(c.role || ''))
  const bg = byRole(/^background$/i) || byRole(/background|surface|base/i)
  const fg = byRole(/^text$/i) || byRole(/text|ink|foreground/i)
  if (bg && fg && bg.hex !== fg.hex) return { bg, fg }
  // No named pair: measure the widest one in the set, which is the most
  // generous honest reading of what the palette could do.
  let best = null
  for (const a of palette) {
    for (const b of palette) {
      if (a.hex === b.hex) continue
      const r = contrastRatio(a.hex, b.hex)
      if (!best || r > best.ratio) best = { bg: a, fg: b, ratio: r }
    }
  }
  return best ? { bg: best.bg, fg: best.fg } : null
}

/**
 * The type ladder a base and a ratio produce, as the Type Scale tool builds it.
 *
 * Five steps rather than the tool's full range: this is a preview of a decision,
 * and the tool on the other side of the hand-off is where the ladder is worked
 * on. Rounded the same way, so the numbers here are the numbers there.
 */
function ladder(base, ratio) {
  return [2, 1, 0, -1].map((step) => ({
    step,
    px: Math.round(base * Math.pow(ratio, step) * 100) / 100,
  }))
}

/**
 * The panel, with auth supplied from outside.
 *
 * `getToken` is injected rather than read from Firebase in here for one
 * reason: the acceptance suite cannot create a session (Firebase's hosts are
 * blocked in the sandboxed runner — see EXPECTED_NOISE in
 * tests/user-sim/helpers.js), so the signed-in half of this feature would
 * otherwise have no rendered coverage at all. The fixture supplies a token and
 * a plan; EVERYTHING ELSE — the fetch, the request body, the response handling,
 * the meter, the refusals and the hand-offs — is the real code path, and the
 * spec stubs /api/ai at the network rather than stubbing this component's
 * behaviour. The default export below is what wires the real token getter, and
 * tests/unit/ai-generation-truth.test.js asserts that it does.
 */
export function BrandStarterWorkbench({ planId = 'free', getToken, toast }) {
  const online = useOnline()
  const [brief, setBrief] = useState('')
  const [status, setStatus] = useState('idle') // idle | working | done | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  // What the SERVER last said about the allowance. Null until a response
  // arrives — the plan's own figure is the ceiling, never the count, and
  // inventing a count from localStorage is what made the old AI meters a guess
  // about one browser rather than a fact about an account.
  const [server, setServer] = useState(null)
  const [dismissedWall, setDismissedWall] = useState(false)
  const resultRef = useRef(null)

  const allowance = generationAllowance(planId)
  const used = server?.used ?? 0
  const remaining = server ? Math.max(0, server.remaining) : generationsRemaining(planId, used)
  const knownEmpty = server != null && remaining === 0
  const wallMessage = knownEmpty ? exhaustedMessage(planId, used) : null

  const trimmed = brief.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_PROMPT_CHARS
  const canGenerate = status !== 'working' && !knownEmpty && online && trimmed.length >= MIN_PROMPT_CHARS

  // Load the two families the result names, so the specimen below is the real
  // typeface rather than the page's own face wearing its name. A family that
  // will not load is not fatal — the specimen falls back to the generic in the
  // stack, and the hand-off still carries the right family to a tool that will
  // try again.
  const heading = result?.fonts?.heading
  const body = result?.fonts?.body
  useEffect(() => {
    if (heading) loadFont(heading.family, [heading.weight]).catch(() => {})
    if (body) loadFont(body.family, [body.weight]).catch(() => {})
  }, [heading, body])

  const pair = useMemo(() => (result ? readingPair(result.palette) : null), [result])
  const ratio = pair ? contrastRatio(pair.bg.hex, pair.fg.hex) : null
  const provider = describeProvider(result?.provider)

  const generate = useCallback(async () => {
    if (!canGenerate) return
    setStatus('working')
    setError(null)
    try {
      const token = await getToken?.()
      if (!token) throw new Error('Your session has expired. Sign out and back in, then try again.')

      const r = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ task: 'brand-starter', description: trimmed.slice(0, MAX_PROMPT_CHARS) }),
      })
      const data = await r.json().catch(() => ({}))

      // Absorb the count from EVERY response, success or refusal. A 429 carries
      // the authoritative figures too, and reading them is what makes the meter
      // correct after a wall instead of one generation behind it.
      if (data?.generation && typeof data.generation === 'object') {
        setServer(data.generation)
        setDismissedWall(false)
        // A REFUSAL BECAUSE THE ALLOWANCE IS SPENT IS THE WALL'S NEWS, NOT AN
        // ERROR'S. The server's 429 carries the same count the wall is built
        // from, so before this the page rendered the sentence twice — once as
        // the strip above the field, once as a red alert under it, with a
        // "Try again" button that could never succeed. Rendered 2026-09-08 at
        // 320 through 1920, both themes. One state, said once, is the whole
        // point of the strip; an alert is for something that went WRONG, and
        // nothing did.
        if (!r.ok && data.generation.remaining === 0) {
          setStatus('idle')
          return
        }
      }

      if (!r.ok) throw new Error(data.error || `The request failed (HTTP ${r.status}).`)
      if (!data.starter) throw new Error('The response arrived without a result. Nothing was used from your allowance.')

      setResult({ ...data.starter, provider: data.provider })
      setStatus('done')
      toast?.('Brand starter ready')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setStatus('error')
    }
  }, [canGenerate, getToken, trimmed, toast])

  // Move focus to the result so a keyboard or screen-reader user is not left at
  // the button wondering whether anything happened. Only on a NEW result, and
  // never on an error — the error is announced where it is, next to the control
  // that caused it.
  useEffect(() => {
    if (status === 'done' && resultRef.current) resultRef.current.focus()
  }, [status, result])

  const stageFonts = (event) => {
    if (!result || !navigatesThisTab(event)) return
    setPairDraft({ heading: result.fonts.heading, body: result.fonts.body })
  }
  const stageScale = (event) => {
    if (!result || !navigatesThisTab(event)) return
    setScaleDraft({
      heading: result.fonts.heading,
      body: result.fonts.body,
      scale: { base: result.typeScale.base, ratio: result.typeScale.ratio },
    })
  }

  return (
    <div className="bs">
      {/* THE ALLOWANCE, BEFORE THE FIELD. Someone about to spend the only
          generation they will ever get on the free plan should know that
          before they write the brief, not after they press the button — the
          same call AltTextGenerator makes about putting the meter above the
          dropzone rather than beside the button. */}
      <p className="bs-allowance" data-testid="brand-starter-allowance">
        <span className="bs-allowance-plan">{planId === 'pro' ? 'Pro' : 'Free'}</span>
        <span className="bs-allowance-figure">{allowanceSentence(planId)}</span>
        {server && (
          <span className="bs-allowance-left" data-testid="brand-starter-remaining">
            {remaining} left
          </span>
        )}
      </p>

      {/* QUOTA EXHAUSTED — a strip on the composer, not a modal over the tool.
          It names what ran out, whether it comes back, and offers exactly one
          route onward. Dismissible, because a person who has read it and is
          here to look at a previous result should not have to read it again. */}
      {wallMessage && !dismissedWall && (
        <div className="bs-wall" role="status" data-testid="brand-starter-wall">
          <p className="bs-wall-text">{wallMessage}</p>
          <div className="bs-wall-actions">
            <Link className="bs-wall-link" to="/plans">See what Pro includes</Link>
            <button type="button" className="bs-wall-close" onClick={() => setDismissedWall(true)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="bs-composer">
        <label className="bs-label" htmlFor="bs-brief">What are you designing for?</label>
        <p className="bs-hint" id="bs-brief-hint">
          What it is, who it is for, and how it should feel. One or two sentences is enough.
        </p>
        <textarea
          id="bs-brief"
          className="bs-field"
          aria-describedby="bs-brief-hint bs-brief-count"
          rows={3}
          value={brief}
          maxLength={MAX_PROMPT_CHARS}
          placeholder={EXAMPLE_BRIEF}
          onChange={(e) => setBrief(e.target.value)}
          disabled={status === 'working'}
        />
        <div className="bs-composer-foot">
          {/* The counter is a courtesy; the cap is enforced on the server. It is
              rendered rather than hidden in a maxLength because a field that
              silently stops accepting characters reads as broken. */}
          <span className="bs-count" id="bs-brief-count">
            {trimmed.length} / {MAX_PROMPT_CHARS}
          </span>
          <button
            type="button"
            className="btn btn-accent"
            onClick={generate}
            disabled={!canGenerate}
            data-testid="brand-starter-generate"
          >
            {status === 'working' ? 'Generating…' : 'Generate a starting point'}
          </button>
        </div>

        {/* Every reason the button is off, said in words next to it. A disabled
            control with no explanation is the state this product keeps being
            told reads as broken. */}
        {tooShort && (
          <p className="bs-note" role="status" data-testid="brand-starter-too-short">
            A few more words — {MIN_PROMPT_CHARS} characters is the minimum, so the answer is designed
            rather than guessed.
          </p>
        )}
        {!online && (
          <p className="bs-note bs-note--warn" role="status" data-testid="brand-starter-offline">
            You are offline, so this cannot reach the AI provider. Nothing has been used from your
            allowance — the brief above is kept, so reconnect and press Generate.
          </p>
        )}
        {!knownEmpty && (
          <p className="bs-note">
            {allowance.period === 'lifetime'
              ? 'This uses your one free generation. An attempt that fails does not count.'
              : 'Each press uses one generation. An attempt that fails does not count.'}
          </p>
        )}
      </div>

      {/* LOADING. It says what is being done and roughly how long, rather than
          animating to imply intelligence — the anti-slop bar's "loading effects
          imply intelligence without explaining system state". No shimmer, no
          skeleton pretending to be the answer. */}
      {status === 'working' && (
        <p className="bs-working" role="status" data-testid="brand-starter-working">
          Reading your brief and choosing a palette, a font pairing and a type scale. This usually
          takes five to fifteen seconds.
        </p>
      )}

      {/* ERROR. What happened, and — first, because it is the thing they are
          actually worried about — that it did not cost them anything. */}
      {status === 'error' && error && (
        <div className="bs-error" role="alert" data-testid="brand-starter-error">
          <p className="bs-error-text">{error}</p>
          <button type="button" className="btn btn-s" onClick={generate} disabled={!canGenerate}>
            Try again
          </button>
        </div>
      )}

      {/* THE RESULT. Three bands on hairline rules with mono numerals — the
          language the User Home settled on, where containment is spent only on
          things that are objects. The swatches, the specimens and the ladder
          ARE the objects; the headings around them are not. */}
      {result && (
        <section
          className="bs-result"
          aria-label="Generated brand starter"
          tabIndex={-1}
          ref={resultRef}
          data-testid="brand-starter-result"
        >
          <header className="bs-result-h">
            <h2 className="bs-result-name">{result.name}</h2>
            {provider && (
              <span style={providerBadgeStyle(provider)} title={provider.title} data-testid="ai-provider-badge">
                {provider.label}
              </span>
            )}
          </header>
          {result.rationale && <p className="bs-rationale">{result.rationale}</p>}

          {/* ── 01 palette ── */}
          <div className="bs-band">
            <div className="bs-band-h">
              <span className="bs-band-n" aria-hidden="true">{BANDS[0].n}</span>
              <h3 className="bs-band-label">{BANDS[0].label}</h3>
              <Link
                className="bs-band-open"
                to={paletteBuilderUrl(result.palette.map((c) => c.hex))}
                data-testid="brand-starter-open-palette"
              >
                Open in Palette Builder <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
            <ul className="bs-swatches">
              {result.palette.map((c) => (
                <li className="bs-swatch" key={c.hex}>
                  <span className="bs-chip" style={{ background: c.hex }} aria-hidden="true" />
                  <span className="bs-swatch-role">{c.role}</span>
                  <span className="bs-swatch-hex">{c.hex}</span>
                </li>
              ))}
            </ul>
            {pair && ratio != null && (
              // MEASURED, not claimed — with this product's own contrast maths,
              // and stated as a failure when it is one. A generator that grades
              // its own homework generously is worse than one that does not
              // grade it.
              <p className="bs-measure" data-testid="brand-starter-contrast">
                <strong>{pair.fg.role}</strong> on <strong>{pair.bg.role}</strong> measures{' '}
                <strong>{ratio.toFixed(2)}:1</strong> —{' '}
                {ratio >= 4.5
                  ? 'clears WCAG AA for body text.'
                  : ratio >= 3
                    ? 'clears AA for large text only. Body text on this pair fails; adjust it in the Contrast Checker.'
                    : 'below every WCAG threshold. Fix this pair before you build on it.'}{' '}
                <Link to="/create/contrast">Check it</Link>
              </p>
            )}
          </div>

          {/* ── 02 fonts ── */}
          <div className="bs-band">
            <div className="bs-band-h">
              <span className="bs-band-n" aria-hidden="true">{BANDS[1].n}</span>
              <h3 className="bs-band-label">{BANDS[1].label}</h3>
              <Link
                className="bs-band-open"
                to="/create/font-pair"
                onClick={stageFonts}
                data-testid="brand-starter-open-fonts"
              >
                Open in Font Pair <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
            {[result.fonts.heading, result.fonts.body].map((f, i) => (
              <div className="bs-specimen" key={`${f.family}-${i === 0 ? 'h' : 'b'}`}>
                <p
                  className="bs-specimen-face"
                  style={{
                    fontFamily: `"${f.family}", ${f.category}`,
                    fontWeight: f.weight,
                    fontSize: i === 0 ? '2.25rem' : '1.0625rem',
                  }}
                >
                  Aa Bb Cc — the quick brown fox
                </p>
                <p className="bs-specimen-meta">
                  {f.family} · {f.weight} · {i === 0 ? 'Heading' : 'Body'}
                </p>
              </div>
            ))}
            {result.fonts.heading.family === result.fonts.body.family && (
              <p className="bs-measure">
                One family in both roles. That is a real answer for interface work — the weight does
                the separating, not a second typeface.
              </p>
            )}
          </div>

          {/* ── 03 type scale ── */}
          <div className="bs-band">
            <div className="bs-band-h">
              <span className="bs-band-n" aria-hidden="true">{BANDS[2].n}</span>
              <h3 className="bs-band-label">{BANDS[2].label}</h3>
              <Link
                className="bs-band-open"
                to="/create/type-scale"
                onClick={stageScale}
                data-testid="brand-starter-open-scale"
              >
                Open in Type Scale <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
            <p className="bs-scale-figure" data-testid="brand-starter-scale">
              {result.typeScale.base}px base · {result.typeScale.ratio} ratio
            </p>
            <ul className="bs-ladder">
              {ladder(result.typeScale.base, result.typeScale.ratio).map((s) => (
                <li key={s.step}>
                  <span className="bs-ladder-px">{s.px}px</span>
                  <span
                    className="bs-ladder-sample"
                    style={{
                      fontSize: `${s.px}px`,
                      fontFamily: `"${s.step > 0 ? result.fonts.heading.family : result.fonts.body.family}", ${s.step > 0 ? result.fonts.heading.category : result.fonts.body.category}`,
                      fontWeight: s.step > 0 ? result.fonts.heading.weight : result.fonts.body.weight,
                    }}
                  >
                    Design system
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="bs-result-foot">
            Nothing here has been saved or applied. Each link opens the tool that owns that part with
            these values loaded, and your current project is untouched until you change it there.
          </p>
        </section>
      )}
    </div>
  )
}

/**
 * The page. Auth gate, plan, and the one thing the fixture cannot supply — a
 * real Firebase ID token.
 */
export default function BrandStarter({ toast }) {
  const { plan } = useSubscription()
  // AuthGate owns the sign-in UI; this only decides whether the EXAMPLE is
  // worth showing. A signed-in visitor gets the workbench and does not need a
  // sample of what they are about to generate.
  const { user } = useAuth()

  return (
    <div className="sec">
      <div className="sec-h bs-head">
        {/* NO <em> ON THE SECOND WORD. Founder, 2026-09-14: "the brand starter
            page needs a UI overhaul i dont like the heading it looks so AI
            generated."

            The italic-second-word h1 is a house formula, not a decision — the
            same shape as "Make it <em>yours</em>.", "Privacy &amp; <em>data</em>."
            and "The whole <em>map</em>." It reads as styling applied to a
            heading rather than a heading that means something, which is exactly
            the tell he has named on four surfaces now. The tool's name is two
            words; it does not need one of them leaning. */}
        <h1>
          Brand Starter{' '}
          {/* The word, and only the word. No sparkle, no shimmer, no gradient —
              a badge that decorates itself is doing marketing, and the honest
              content of "beta" is a limit rather than an event. */}
          <span className="bs-beta" data-testid="brand-starter-beta">Beta</span>
        </h1>
        <p>
          Describe what you are making and get a palette, a font pairing and a type scale to start
          from. Each one opens in the tool that owns it, with the values loaded, so you can change
          anything you disagree with.
        </p>
        <p className="bs-beta-note">{BETA_NOTE}</p>
      </div>

      {/* WHAT YOU GET, SHOWN BEFORE THE WALL.
          Founder, 2026-09-14: the page "needs a UI overhaul". Rendered
          signed-out at 1280 before this, the whole page below the lede was a
          lock icon and two buttons — a promise ("get a palette, a font pairing
          and a type scale") followed immediately by a sign-in gate, with
          nothing between them. A visitor was asked to make an account to find
          out what an account gets, on a site whose nav says "Start for Free".

          This is the SAME three bands the generator returns, in the same order,
          with the same labels, drawn from `SAMPLE_STARTER` — real hexes, the
          two families that actually ship, and a real 1.25 scale. It is marked
          as an example in words rather than implied, because a specimen a
          visitor mistakes for their own result is worse than no specimen.

          Signed-in visitors never see it: AuthGate renders its children
          instead, and the workbench is the page from that point on. */}
      {!user && (
        <section className="bs-sample" aria-labelledby="bs-sample-h">
          <h2 className="bs-sample-h" id="bs-sample-h">
            An example of what comes back
          </h2>
          <p className="bs-sample-note">
            Generated from the brief &ldquo;{SAMPLE_STARTER.brief}&rdquo;. Yours will differ.
          </p>

          <div className="bs-sample-bands">
            <div className="bs-sample-band">
              <span className="bs-sample-n" aria-hidden="true">{BANDS[0].n}</span>
              <h3 className="bs-sample-label">{BANDS[0].label}</h3>
              <ul className="bs-sample-swatches">
                {SAMPLE_STARTER.palette.map((c) => (
                  <li key={c.hex}>
                    <span className="bs-sample-chip" style={{ background: c.hex }} aria-hidden="true" />
                    <span className="bs-sample-role">{c.role}</span>
                    <span className="bs-sample-hex">{c.hex}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bs-sample-band">
              <span className="bs-sample-n" aria-hidden="true">{BANDS[1].n}</span>
              <h3 className="bs-sample-label">{BANDS[1].label}</h3>
              <p className="bs-sample-pair">
                <strong>{SAMPLE_STARTER.fonts.heading}</strong> over {SAMPLE_STARTER.fonts.body}
              </p>
            </div>

            <div className="bs-sample-band">
              <span className="bs-sample-n" aria-hidden="true">{BANDS[2].n}</span>
              <h3 className="bs-sample-label">{BANDS[2].label}</h3>
              <ul className="bs-sample-scale">
                {SAMPLE_STARTER.scale.map((s) => (
                  <li key={s.name}>
                    <span className="bs-sample-step">{s.name}</span>
                    <span className="bs-sample-px">{s.px}px</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <AuthGate featureLabel="generate a brand starter">
        <BrandStarterWorkbench
          planId={plan?.id || 'free'}
          getToken={() => firebaseAuth.currentUser?.getIdToken()}
          toast={toast}
        />
      </AuthGate>
    </div>
  )
}
