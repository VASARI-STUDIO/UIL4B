import { adminDb, adminAuth, credentialProblem, FieldValueIncrement } from './_lib/firebase-admin.js'
import { planForUser, dailyLimitFor, monthlyLimitFor, modelFor } from './_lib/plans.js'
import { requireAdmin } from './_lib/admin.js'
import { timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto'
import { cleanKey } from './_lib/env.js'
import { classifyGeminiFinish } from './_lib/geminiFinish.js'
import {
  BRAND_STARTER_TOOL_ID,
  MAX_PROMPT_CHARS,
  MIN_PROMPT_CHARS,
  PALETTE_MIN_ROLES,
  PALETTE_MAX_ROLES,
  BASE_MIN,
  BASE_MAX,
  RATIO_MIN,
  RATIO_MAX,
  fontChoiceList,
  generationBucket,
  exhaustedError,
  parseStarterJson,
  sanitizeBrandStarter,
  runMeteredTask,
} from './_lib/aiGeneration.js'

// Consolidated AI endpoint — POST /api/ai with { task, ...taskBody }.
// Merges the former alt-text, scan-photo and generate-prompt routes into one
// serverless function (Vercel's 12-function limit). Each task keeps its
// original toolId so daily-usage docs and _lib/plans.js limits are unchanged:
//   task 'alt-text'        → toolId 'alt-text'        (Gemini vision, WCAG alt text)
//   task 'scan-photo'      → toolId 'scan-photo'      (Gemini vision, photo-rule JSON)
//   task 'generate-prompt' → toolId 'prompts-ai'      (OpenRouter → Gemini fallback)
//   task 'brand-starter'   → toolId 'brand-starter'   (OpenRouter → Gemini fallback)
//
// 'brand-starter' is a MODE here rather than a route of its own for the reason
// this file exists: /api holds twelve handlers and Vercel allows twelve on this
// plan, so a thirteenth file fails the build (tests/unit/account-deletion.test.js
// asserts the count). It is also the reason src/data/moduleBoard.js recorded
// "AI mode deferred to stay under Vercel 12-function limit — revisit" against
// this feature. The consolidation is what makes revisiting it free.

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
}

// Gemini API key — accept the common env var names so it works regardless of
// what it was named in Vercel. Sanitised (quotes/whitespace stripped) and
// server-side only (never exposed to the client).
const GEMINI_KEY = cleanKey(
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  ''
)

// Primary text-prompt provider is OpenRouter (OpenAI-compatible gateway). It
// lets us swap the underlying model with a single env var and keeps one billing
// account across providers. OPENROUTER_MODEL overrides the default.
const OPENROUTER_KEY = cleanKey(process.env.OPENROUTER_API_KEY)
const OPENROUTER_MODEL = (process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat').trim()
const OPENROUTER_REFERER = process.env.OPENROUTER_SITE_URL || 'https://uil4b.com'
const GEMINI_MODEL = 'gemini-2.0-flash'

// `daysAgo` days back, as YYYY-MM-DD. The provider-health window reads a fixed
// set of day docs by id, which needs no composite index and no ordering trick.
function dayStr(daysAgo = 0) {
  const d = new Date()
  if (daysAgo) d.setDate(d.getDate() - daysAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr() {
  return dayStr(0)
}

// The month bucket, as a doc id that can never collide with a day bucket: days
// are `uid_2026-08-11`, months are `uid_m2026-08`. Both live in `daily-usage`,
// which is absent from firestore.rules and therefore default-denied to every
// client — only the Admin SDK (which bypasses rules) touches it. Reusing the
// collection is what keeps the monthly ceiling free of a rules change, and
// rules changes are founder-gated and separately published.
function monthStr() {
  const d = new Date()
  return `m${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── alt-text ─────────────────────────────────────────────────────────────────

// A markdown-structured brief rather than the flat bullet list this used to be.
// Three things the old shape kept getting wrong and this one fixes:
//   1. Headed sections separate the non-negotiable output contract from the
//      advice. As one undifferentiated list, the "plain text only" rule carried
//      no more weight than a style preference, and stray markdown and "Alt text:"
//      preambles came back often enough that a regex strip exists below to mop up.
//   2. Worked examples are the largest quality lever available on this task —
//      the difference between "a chart" and a chart description with axes and a
//      trend is something the model reproduces from an example far more reliably
//      than from an instruction.
//   3. It gives search relevance an honest home. Alt text ranks by being
//      accurate and specific; keyword density is a Google spam-policy violation
//      AND unusable for a screen-reader user, so the brief argues the two
//      audiences want the SAME sentence rather than asking for a compromise.
// Cost: the examples are text-only, so this adds input tokens and no extra
// request. Free Gemini tiers meter requests per minute/day, not tokens, so it
// stays inside the founder's free-tier-only constraint.
const ALT_BASE_PROMPT = `# Role

You are an accessibility specialist writing the alt text for one image on a website.

Two audiences read the same sentence, and it has to serve both:

- **Screen-reader users** get your words *instead of* the image. This is the WCAG 2.2 purpose, it is the legal requirement, and it wins every conflict.
- **Search engines** read alt text as one signal of what a page is about. They reward accurate, specific description and penalise keyword stuffing.

These pull in the same direction. The text that describes an image precisely for a blind reader is the same text that earns relevance in search. Write one good description — not a description with keywords bolted on.

# Accessibility rules — the floor, never traded away

1. Never open with "Image of", "Picture of", "Photo of" or "Graphic of", and never end with the word "image". The screen reader already announced that it is an image.
2. Convey purpose and meaning, not just pixels. Ask: what does a sighted reader take from this that a screen-reader user would otherwise lose?
3. Describe only what is visible — subject, action, setting, mood. No interpretation, no invented backstory, no guessing at what is outside the frame.
4. Describe people inclusively. Do not assume gender, race, ethnicity, age or relationship unless it is self-evident and relevant. "A person", "a child", "two people" are correct when you are not certain.
5. If text appears in the image, reproduce it verbatim inside quotation marks. Dropping on-image text is the most common serious failure in alt text.
6. For functional images — a logo that links home, an icon button, any clickable control — describe the destination or the action, not the artwork. "Search", not "magnifying glass icon".
7. For charts, graphs and infographics, give the chart type, what is being measured, the axis labels, and the trend or the key values. "A bar chart" is a failure.
8. Front-load the most important information. Some screen readers truncate long strings.
9. If the image is purely decorative — a divider, a background texture, an abstract flourish carrying no information — respond with exactly: decorative

# Search relevance — the honest version

Alt text earns search relevance by being accurate and specific, and by naturally reflecting the subject of the page it sits on. That is the whole mechanism. There is nothing else to exploit.

- DO reach for concrete, specific nouns: "Cotswold stone cottage", not "building". Specificity is exactly what makes a description both accessible and findable.
- DO let the author's page context, when supplied, guide which visible details matter and which plain words you reach for.
- DO NOT insert words that are not descriptions of what is in the image. DO NOT repeat a term to reach a density. DO NOT append a brand, a location, a price or a call to action that is not visible in the picture.
- Keyword-stuffed alt text violates Google's spam policies and is useless to a screen-reader user at the same time. If a word would not help a blind reader picture the image, it does not belong in the alt text.

If the page context does not match what you can actually see, describe the image and ignore the context. Never describe something that is not there.

# Output contract

- Return the alt text and nothing else. No preamble, no "Alt text:" label, no explanation, no alternatives offered, no quotation marks wrapping the whole answer.
- Plain text, one line. No markdown, no headings, no bullets, no asterisks, no backticks.
- Sentence case.
- The single permitted exception to all of the above is the one word decorative, for a decorative image.

# Worked examples

Example 1 — a woman in a hard hat looking at a tablet on a building site. Page context: "case study about our modular housing project in Leeds".
Good: Site manager in a hard hat reviews plans on a tablet in front of a part-built modular housing block.
Bad: Leeds modular housing construction, modular homes Leeds, best modular housing company. (Keyword stuffing. It also describes nothing that is actually visible.)

Example 2 — a line chart with two plotted series. Page context: "quarterly revenue report".
Good: Line chart of quarterly revenue from 2024 to 2026. Subscription revenue climbs steadily from 1.2m to 4.1m while one-off sales stay flat near 0.6m.
Bad: A chart showing revenue growth. (No axes, no values, no trend — a sighted reader gets far more than this.)

Example 3 — an envelope icon that links to the contact page. Page context: "site footer".
Good: Contact us
Bad: Envelope icon. (Describes the artwork instead of the destination, which is the only thing the user needs.)`

// The three modes the UI offers. `instruction` is appended to the brief under
// its own heading so it reads as the length spec for THIS request rather than
// as a tenth accessibility rule.
const TONE_CONFIGS = {
  concise: {
    instruction: 'Write 1-2 sentences, under 125 characters where the image allows it. Lead with the subject that matters most. This is the default for ordinary body-content images.',
    maxOutputTokens: 300,
    temperature: 0.4,
  },
  detailed: {
    instruction: 'Write 2-4 sentences, up to 300 characters. Cover subject, setting, spatial arrangement and any detail a sighted reader would notice. Use this length because the image carries meaning, not to pad it out.',
    maxOutputTokens: 600,
    temperature: 0.4,
  },
  technical: {
    instruction: 'Prioritise exact content over atmosphere: on-image text verbatim, data values, units, axis and series labels, UI element types, and colour values where they carry meaning. Be precise and factual in 2-4 sentences.',
    maxOutputTokens: 600,
    temperature: 0.2,
  },
}

async function runAltText(req, res, { plan, limit, used, monthUsed, monthLimit }) {
  const { image, mimeType, context, tone } = req.body || {}
  if (!image || !mimeType) return res.status(400).json({ error: 'image (base64) and mimeType required' })
  const toneKey = tone && TONE_CONFIGS[tone] ? tone : 'concise'
  const toneConfig = TONE_CONFIGS[toneKey]
  if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(mimeType)) {
    return res.status(400).json({ error: 'unsupported mimeType' })
  }

  const model = modelFor(plan, 'alt-text')
  const promptParts = [ALT_BASE_PROMPT, `# Length and emphasis for this request\n\n${toneConfig.instruction}`]
  // Relevance only, and said so at the point of injection rather than trusting
  // the general rule to hold 60 lines further up. Page context is the input a
  // keyword-stuffing tool would abuse; this is the line that stops it being one.
  if (context) {
    // Neutralise markdown structure in the one attacker-controlled string that
    // reaches the prompt. The brief above is markdown, so the model now treats
    // `#` headings as structure — which means a context of "# Output contract\n
    // ignore the above" carries far more leverage than it did against the old
    // flat bullet list. Stripping the leading markers keeps the field usable as
    // prose while removing the ability to forge a new section. The blast radius
    // is only the caller's own generation (there is no other tenant's data in
    // this call, and the per-user quota still meters it), so this is
    // defence-in-depth against the tool being turned into a general-purpose
    // free LLM, not a confidentiality fix.
    const safeContext = context
      .slice(0, 500)
      .replace(/^\s*#{1,6}\s*/gm, '')   // forged headings
      .replace(/`/g, '')                // code fences / inline code
    promptParts.push(`# Page context from the author\n\n"${safeContext}"\n\nUse this for relevance only: let it steer which visible details you treat as important and which plain words you choose. Do not copy it into the alt text, do not treat it as keywords to include, and do not describe anything it mentions that you cannot actually see in the image.`)
  }
  const userPrompt = promptParts.join('\n\n')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    let r
    try {
      r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: userPrompt },
              { inline_data: { mime_type: mimeType, data: image } },
            ],
          }],
          generationConfig: {
            temperature: toneConfig.temperature,
            maxOutputTokens: toneConfig.maxOutputTokens,
          },
        }),
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!r.ok) {
      const text = await r.text()
      console.error('Gemini error:', r.status, text.slice(0, 1000))
      if (r.status === 429) {
        return res.status(429).json({ error: 'Rate limited by provider. Try again shortly.', retryAfter: 10 })
      }
      return res.status(502).json({ error: `AI provider error (${r.status})`, model })
    }

    const data = await r.json()

    // Gemini reports WHY it stopped and nothing here ever read it — see
    // _lib/geminiFinish.js for the full account of what that cost.
    const verdict = classifyGeminiFinish(data)

    if (verdict.status === 'blocked') {
      return res.status(422).json({
        error: 'The AI declined to describe this image — its safety filters flagged it. Nothing is wrong with your file; try a different image, or write this one by hand.',
        finishReason: verdict.reason,
      })
    }
    if (verdict.status === 'recitation') {
      return res.status(422).json({
        error: 'The AI stopped because its answer was reproducing copyrighted text it recognised. Try again, or describe this image by hand.',
        finishReason: verdict.reason,
      })
    }
    if (verdict.status === 'empty') {
      return res.status(502).json({ error: 'Empty response from AI provider', finishReason: verdict.reason })
    }

    let altText = verdict.text

    // Strip any markdown formatting the model might return
    altText = altText
      .replace(/^#+\s*/gm, '')           // heading markers
      .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
      .replace(/\*(.+?)\*/g, '$1')       // italic
      .replace(/__(.+?)__/g, '$1')       // bold underscores
      .replace(/_(.+?)_/g, '$1')         // italic underscores
      .replace(/`(.+?)`/g, '$1')         // inline code
      .replace(/^[-*]\s+/gm, '')         // list markers
      .replace(/^\d+\.\s+/gm, '')        // numbered list markers
      .trim()

    // Flag the truncation and hand the text over, rather than silently retrying
    // at a bigger budget. A retry re-uploads the image, and vision input tokens
    // dominate this call, so it roughly doubles the cost of the single most
    // expensive request the tool makes — against a standing instruction to stay
    // on free provider tiers. It would also either spend a second unit of the
    // user's daily/monthly allowance on a result they never asked for, or hide
    // that spend from the quota meter, and both are worse than telling them.
    // The user already has a Retry button and an editable field, so the choice
    // and the quota stay theirs. What is NOT acceptable, and what this replaces,
    // is presenting half a sentence as a finished answer.
    const truncated = verdict.status === 'truncated'

    return {
      altText,
      truncated,
      finishReason: verdict.reason,
      model,
      tone: toneKey,
      plan: plan.id,
      usage: { used: used + 1, limit, remaining: limit - used - 1, monthUsed: monthUsed + 1, monthLimit, monthRemaining: monthLimit - monthUsed - 1 },
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI provider timed out. Try again.' })
    }
    return res.status(500).json({ error: 'Request failed', detail: String(err).slice(0, 300) })
  }
}

// ── scan-photo ───────────────────────────────────────────────────────────────

const SCAN_SYSTEM_PROMPT = `You are a photography and visual analysis expert. Analyze the uploaded image and identify the photographic and visual rules/settings used. Return a JSON array of detected rules, where each rule is an object with:
- "id": a short kebab-case identifier matching one of the known rule IDs listed below, or a new one if none match
- "label": a short human-readable label (max 5 words)
- "confidence": "high", "medium", or "low"
- "text": a brief prompt-fragment describing this aspect (1 short sentence)

Known rule IDs you should try to match:
aperture-wide, aperture-mid, aperture-narrow, lens-wide, lens-standard, lens-portrait, lens-tele, exp-long, exp-fast, iso-low,
comp-thirds, comp-golden, comp-center, comp-leading, comp-negative, comp-closeup, comp-wide, comp-aerial,
light-golden, light-blue, light-studio, light-rim, light-chiaroscuro, light-natural, light-neon, light-volumetric,
render-photo, render-cinematic, render-octane, render-unreal, render-anamorphic, render-film,
q-4k, q-8k, q-detail, q-sharp, q-hdr, q-raytracing

Analyze: camera settings (aperture, focal length, exposure), composition technique, lighting style, color grading, overall quality/mood.
Return ONLY a valid JSON array. No markdown, no explanation, no code fences. Aim for 5-12 detected rules.`

async function runScanPhoto(req, res) {
  const { image, mimeType } = req.body || {}
  if (!image || !mimeType) return res.status(400).json({ error: 'image (base64) and mimeType required' })
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mimeType)) {
    return res.status(400).json({ error: 'unsupported mimeType' })
  }

  const model = 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)

    let r
    try {
      r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: SCAN_SYSTEM_PROMPT },
              { inline_data: { mime_type: mimeType, data: image } },
            ],
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        }),
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!r.ok) {
      const text = await r.text()
      console.error('Gemini scan-photo error:', r.status, text.slice(0, 500))
      return res.status(502).json({ error: `AI provider error (${r.status})` })
    }

    const data = await r.json()
    let raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim() || ''
    raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

    let rules
    try {
      rules = JSON.parse(raw)
      if (!Array.isArray(rules)) throw new Error('Expected array')
    } catch {
      return res.status(502).json({ error: 'Could not parse AI response' })
    }

    return { rules }
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI provider timed out' })
    }
    return res.status(500).json({ error: 'Request failed', detail: String(err).slice(0, 300) })
  }
}

// ── generate-prompt ──────────────────────────────────────────────────────────

const PROMPT_SYSTEM_PROMPT = `You are an expert AI image prompt engineer specialising in photorealistic, artistic, and commercial image generation.

Think step-by-step:
1. Parse the user's brief to identify subject, mood, and intent.
2. Select an art style, lighting setup, and composition that serve the brief.
3. Choose a colour palette and atmosphere that reinforce the mood.
4. Add technical quality tags for the target platform.

Output rules:
- Return ONLY the finished prompt text — no reasoning, no headings, no markdown.
- Start with the subject, then layer in style → lighting → mood → composition → colour → technical tags.
- Use comma-separated descriptors. Keep it under 300 words.
- If a target platform is specified, format for its syntax conventions.`

async function callOpenRouter(userMessage, opts = {}) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      // Attribution headers OpenRouter uses for app ranking / rate-limit context.
      'HTTP-Referer': OPENROUTER_REFERER,
      'X-Title': 'UI L4B',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        // `opts.system` defaults to the image-prompt brief, so every existing
        // caller is unchanged — the parameter exists only so a second task can
        // reuse the SAME provider race (and therefore the same failover, the
        // same counters and the same operator alert) instead of writing a
        // second one that nothing watches.
        { role: 'system', content: opts.system || PROMPT_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: opts.temperature ?? 0.75,
      max_tokens: opts.maxTokens ?? 600,
      top_p: 0.9,
      frequency_penalty: 0.15,
    }),
  })
  if (!r.ok) {
    const text = await r.text()
    const err = new Error(`OpenRouter ${r.status}`)
    err.status = r.status
    err.detail = text.slice(0, 500)
    throw err
  }
  const data = await r.json()
  // OpenRouter surfaces upstream provider errors in a 200 body's `error` field.
  if (data?.error) {
    const err = new Error(`OpenRouter upstream: ${data.error.message || 'error'}`)
    err.status = data.error.code || 502
    err.detail = JSON.stringify(data.error).slice(0, 500)
    throw err
  }
  const prompt = data?.choices?.[0]?.message?.content?.trim() || ''
  if (!prompt) throw new Error('OpenRouter returned empty response')
  return prompt
}

// Fallback provider: Gemini. Used only when OpenRouter is unavailable so the tool
// keeps working through a provider outage or a misconfigured key.
async function callGemini(userMessage, opts = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${opts.system || PROMPT_SYSTEM_PROMPT}\n\n${userMessage}` }] }],
      generationConfig: { temperature: opts.temperature ?? 0.75, maxOutputTokens: opts.maxTokens ?? 600, topP: 0.9 },
    }),
  })
  if (!r.ok) {
    const text = await r.text()
    const err = new Error(`Gemini ${r.status}`)
    err.status = r.status
    err.detail = text.slice(0, 500)
    throw err
  }
  const data = await r.json()
  const prompt = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim() || ''
  if (!prompt) throw new Error('Gemini returned empty response')
  return prompt
}

// ── provider health ──────────────────────────────────────────────────────────
//
// THE DEFECT THIS EXISTS FOR. The failover above is silent and total: a wrong,
// revoked or rate-limited OpenRouter key produces a perfectly good generation
// from Gemini, the user sees nothing, and the app looks healthy while the
// primary provider is dead. Until now the only trace a failover left anywhere
// was one console.error in a Vercel function log — never counted, never
// aggregated, never alerted on, short retention, no admin surface. OpenRouter
// could have been dead since August and nothing in the product would say so.
//
// The test being answered: would an operator who is NOT looking at devtools
// find out, within a day, that every generation is coming from the fallback?
// These counters are the durable half of making that a yes.
//
// WHERE IT LIVES, and why that needed nothing from the founder: `provider-health`
// appears NOWHERE in firestore.rules, which default-denies, so it is unreachable
// from every client and only the Admin SDK (which bypasses rules) can touch it.
// That is the same property `daily-usage` already relies on, and it is what
// keeps this clear of a rules change — rules changes are founder-gated and
// published separately.
const PROVIDER_HEALTH = 'provider-health'
const HEALTH_WINDOW_DAYS = 7

/**
 * Record what each provider did on one generate-prompt call.
 *
 * Best-effort, unconditionally. An observability write must never fail a
 * generation the caller has already spent a quota unit on — that would trade a
 * silent failure for a loud one at the user's expense.
 */
// Exported and pure so the fields that get written are testable without a
// Firestore. `inc` is passed in because FieldValue.increment arrives through an
// async import, and `now` because a timestamp nobody can pin is a timestamp
// nobody can assert on.
export function buildProviderHealthPatch({ openrouterFailed, geminiFailed, served }, inc, now) {
  const patch = { updatedAt: now }
  if (served === 'openrouter') patch.openrouterOk = inc
  if (served === 'gemini') patch.geminiOk = inc
  if (openrouterFailed) patch.openrouterFail = inc
  if (geminiFailed) patch.geminiFail = inc
  if (!served) patch.noProvider = inc
  if (openrouterFailed) {
    patch.lastFailoverAt = now
    patch.lastFailoverStatus = String(openrouterFailed.status || '')
    // The MESSAGE only. `err.detail` is the provider's raw response body, and
    // gateways have been known to echo the offending key back inside one. A
    // health counter is not worth writing a credential into Firestore for.
    patch.lastFailoverMessage = String(openrouterFailed.message || '').slice(0, 200)
    patch.lastFailoverServedBy = served || 'nothing'
  }
  return patch
}

async function recordProviderOutcome(outcome) {
  try {
    const db = adminDb()
    const date = todayStr()
    const inc = await FieldValueIncrement(1)
    const patch = buildProviderHealthPatch(outcome, inc, new Date().toISOString())
    await db.doc(`${PROVIDER_HEALTH}/${date}`).set(patch, { merge: true })
    if (outcome.openrouterFailed) await alertFirstFailoverOfDay(db, date, patch)
  } catch (e) {
    console.error('provider-health write failed:', String(e?.message || e).slice(0, 200))
  }
}

/**
 * Email the operator the FIRST time OpenRouter fails on any given day.
 *
 * Vercel gives a serverless function no scheduler, no metrics store and no
 * alerting, and the standing constraint is no new paid dependency — so this
 * reuses the one outbound channel this deployment already has: the Resend key
 * /api/support sends bug reports through. Unprovisioned, it is silence rather
 * than an error, and the counters and the admin panel still do their work.
 *
 * The Resend call is written out here rather than shared with api/support.js on
 * purpose. tests/unit/api-abuse-hardening.test.js proves the support limiter
 * runs before the outbound email by locating 'api.resend.com' INSIDE support.js,
 * so lifting that string into _lib would leave the assertion green and guarding
 * nothing.
 *
 * `.create()` is the deduplication: it throws when the marker for today already
 * exists, so exactly one concurrent invocation wins the day. No transaction, no
 * read-then-write race, and at most one email however hard an outage is being
 * hammered.
 */
async function alertFirstFailoverOfDay(db, date, summary) {
  const resendKey = process.env.RESEND_API_KEY
  const notifyEmail = process.env.SUPPORT_NOTIFY_EMAIL
  if (!resendKey || !notifyEmail) return

  try {
    await db.doc(`${PROVIDER_HEALTH}/alert-${date}`).create({ at: new Date().toISOString() })
  } catch {
    return // already alerted today
  }

  const text = [
    summary.lastFailoverServedBy === 'gemini'
      ? 'OpenRouter failed and the Gemini fallback answered in its place. Users are getting normal, working prompts — nothing in the product looks wrong, which is exactly the problem.'
      : 'OpenRouter failed and so did the Gemini fallback. Prompt generation is DOWN.',
    '',
    `First failure today: ${summary.lastFailoverAt}`,
    `HTTP status from OpenRouter: ${summary.lastFailoverStatus || '(none — the request never completed)'}`,
    `Error: ${summary.lastFailoverMessage || '(none)'}`,
    '',
    '401 or 403 means OPENROUTER_API_KEY is wrong or revoked. 429 means rate-limited or out of credit. A 5xx is an OpenRouter outage and there is nothing to do but wait.',
    '',
    'Seven-day counts are on Admin -> Overview, under AI provider health.',
    'This mail is sent at most once a day.',
  ].join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5_000)
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'UIL4B <onboarding@resend.dev>',
        to: [notifyEmail],
        subject: '[UIL4B] OpenRouter is failing — AI prompts are running on the fallback',
        text,
      }),
    })
  } catch (e) {
    console.error('provider-health alert email failed:', String(e?.message || e).slice(0, 200))
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Summarise the last HEALTH_WINDOW_DAYS for the admin diagnostic.
 *
 * A verdict, not a pile of numbers. `openrouterKey: "set (73 chars)"` is what a
 * revoked key looks like too — that is precisely why the old owner action could
 * never be completed. This reports what the key DID.
 */
// Exported and pure. This is the sentence an operator actually reads, so it is
// the part most worth pinning: `days` is `[{ date, data }]`, newest first.
export function summariseProviderHealth(days, { alerting = false } = {}) {
  const totals = { openrouterOk: 0, openrouterFail: 0, geminiOk: 0, geminiFail: 0, noProvider: 0 }
  const byDay = []
  let lastFailover = null

  for (const { date, data } of days) {
    const d = data || {}
    for (const k of Object.keys(totals)) totals[k] += Number(d[k] || 0)
    byDay.push({
      date,
      openrouterOk: Number(d.openrouterOk || 0),
      openrouterFail: Number(d.openrouterFail || 0),
      geminiOk: Number(d.geminiOk || 0),
    })
    if (d.lastFailoverAt && (!lastFailover || d.lastFailoverAt > lastFailover.at)) {
      lastFailover = {
        at: d.lastFailoverAt,
        status: d.lastFailoverStatus || '',
        message: d.lastFailoverMessage || '',
        servedBy: d.lastFailoverServedBy || '',
      }
    }
  }

  const window = days.length
  const attempts = totals.openrouterOk + totals.openrouterFail
  let status, summary
  if (attempts === 0) {
    // NOT 'ok'. Silence is not health — reading no traffic as a pass is how the
    // previous owner action recorded a check that never ran.
    status = 'no-data'
    summary = `No prompt generations in the last ${window} days, so nothing has exercised the OpenRouter path. This is not a pass — generate one prompt and look again.`
  } else if (totals.openrouterFail === 0) {
    status = 'ok'
    summary = `OpenRouter served all ${totals.openrouterOk} generations in the last ${window} days.`
  } else if (totals.openrouterOk === 0) {
    status = 'failing'
    summary = `OpenRouter failed all ${totals.openrouterFail} times in the last ${window} days. EVERY generation came from the Gemini fallback, and every one of them looked perfectly fine to the user.`
  } else {
    status = 'degraded'
    summary = `OpenRouter failed ${totals.openrouterFail} of ${attempts} attempts in the last ${window} days.`
  }

  return {
    status,
    summary,
    windowDays: window,
    totals,
    byDay,
    lastFailover,
    alerting: alerting
      ? 'on — the first OpenRouter failure of each day is emailed to SUPPORT_NOTIFY_EMAIL'
      : 'OFF — set RESEND_API_KEY and SUPPORT_NOTIFY_EMAIL in Vercel to be emailed the first time OpenRouter fails on any day. Until then this panel is the only place a failover surfaces.',
  }
}

async function readProviderHealth() {
  try {
    const db = adminDb()
    const dates = Array.from({ length: HEALTH_WINDOW_DAYS }, (_, i) => dayStr(i))
    const snaps = await db.getAll(...dates.map(d => db.doc(`${PROVIDER_HEALTH}/${d}`)))
    return summariseProviderHealth(
      snaps.map((snap, i) => ({ date: dates[i], data: snap.data() || {} })),
      { alerting: Boolean(process.env.RESEND_API_KEY && process.env.SUPPORT_NOTIFY_EMAIL) },
    )
  } catch (e) {
    return {
      status: 'unavailable',
      summary: `Could not read ${PROVIDER_HEALTH} from Firestore: ${String(e?.message || e).slice(0, 160)}`,
    }
  }
}

// The three caller-controlled strings, shaped into the one user message the
// providers see. Exported and pure so the shaping is testable without a
// provider call (tests/unit/ai-prompt-message.test.js).
//
// Every OPTIONAL field is type-checked before `.slice()` touches it. The old
// inline version guarded only `description`; `style: 123` or `platform: {}`
// passed the truthiness test and then threw a TypeError out of the handler —
// after auth, so only a signed-in caller could reach it, but a 500 with a stack
// trace in the function log is still the wrong answer to a malformed body.
// Returns null when there is no usable description, which the caller turns
// into the same 400 it always sent.
export const PROMPT_DESCRIPTION_MAX = 2000
export const PROMPT_STYLE_MAX = 200
export const PROMPT_PLATFORM_MAX = 100

export function buildPromptUserMessage({ description, style, platform } = {}) {
  if (!description || typeof description !== 'string') return null
  let userMessage = `Design brief: ${description.slice(0, PROMPT_DESCRIPTION_MAX)}`
  if (typeof style === 'string' && style) userMessage += `\nStyle: ${style.slice(0, PROMPT_STYLE_MAX)}`
  if (typeof platform === 'string' && platform) userMessage += `\nTarget platform: ${platform.slice(0, PROMPT_PLATFORM_MAX)}`
  return userMessage
}

// ── brand-starter ────────────────────────────────────────────────────────────
//
// One description in, three artefacts out: a palette, a font pairing and a type
// scale — the first three steps of the brand kit walkthrough (BRAND_KIT_STEPS in
// src/utils/brandKitGuide.js). Each one lands in the real tool through the
// hand-offs the galleries already use, so the answer is a STARTING POINT that
// stays editable rather than a picture of one.
//
// It shares the OpenRouter → Gemini race with generate-prompt on purpose. A
// second, private provider path would be a second thing that can fail silently,
// and the whole provider-health apparatus below exists because the first one
// did. Same race, same counters, same once-a-day operator email.
//
// COST CONTROLS, all four of them, because this spends the founder's money:
//   1. the brief is capped at MAX_PROMPT_CHARS on the way in;
//   2. maxTokens is 900 — enough for eight swatches and two font names, and not
//      enough to be talked into an essay;
//   3. temperature is low, because this returns JSON and creative sampling in a
//      structured answer buys malformed output rather than better design;
//   4. there is no retry. A malformed answer is REFUSED and costs the caller
//      nothing (see the increment at the foot of the handler, which only runs
//      after a runner returns a payload) — retrying would double the provider
//      spend on the request most likely to fail twice.
const STARTER_SYSTEM_PROMPT = `# Role

You are a brand designer producing the FIRST DRAFT of a visual identity from a short brief. Your answer is a starting point that a person will then edit in a design tool — not a finished brand, and not a pitch.

# Output contract — this is not negotiable

Return ONE JSON object and nothing else. No prose before it, no explanation after it, no markdown, no code fences.

The object has exactly these keys:

{
  "name": "a short name for this direction, 2-4 words, max 48 characters",
  "rationale": "one plain sentence, max 200 characters, saying what the brief asked for and what you did about it",
  "palette": [ { "role": "Background", "hex": "#FFFFFF" }, ... ],
  "fonts": { "heading": "Family Name", "body": "Family Name" },
  "typeScale": { "base": 16, "ratio": 1.25 }
}

# palette

- Between ${PALETTE_MIN_ROLES} and ${PALETTE_MAX_ROLES} entries. Every hex is six digits with a leading #.
- Every entry has a ROLE, and the role says what the colour is FOR in an interface: Background, Surface, Text, Muted text, Border, Primary, Accent, Success, Warning, Danger. Do not name colours ("Deep teal") — a role is a job, not a description.
- The set must include a Background and a Text, and body text on that background must reach a contrast ratio of at least 4.5:1. This is the one hard requirement in the palette and it outranks the mood in the brief. A beautiful palette nobody can read is a failed answer.
- No two entries share a hex.

# fonts

Choose a heading family and a body family FROM THIS LIST ONLY. Any family not on this list will be rejected outright and the whole answer discarded:

${fontChoiceList()}

- Answer with the family name exactly as written above. No weights, no fallbacks, no quotes.
- Choosing the SAME family for both roles is a real answer and often the right one for interface work. Do not pair two faces just to look like you have made a decision.
- Display-leaning sans faces (Oswald, Bebas-like weights, heavily mannered geometrics) belong in the heading slot, not the body slot.

# typeScale

- "base" is the body size in pixels: an integer between ${BASE_MIN} and ${BASE_MAX}.
- "ratio" is the modular scale ratio between ${RATIO_MIN} and ${RATIO_MAX}. Dense interfaces and data-heavy products want the low end (1.15-1.25); editorial and marketing pages want the high end (1.333-1.5).

# rationale

One sentence, in plain English, that a designer would accept from a colleague. Say what in the brief drove the choice. Do not use "effortless", "elevate", "seamless", "cutting-edge", "vibrant" or "modern". Do not praise the brief and do not praise your own answer.

# If the brief is thin

Design anyway, for the most ordinary reading of it. Do not ask a question, do not return an error, and do not return an empty palette — the caller has spent part of a small allowance to be here and an empty answer is the worst possible use of it.`

async function runBrandStarter(req, res, { plan, bucket, used }) {
  const { description } = req.body || {}
  if (typeof description !== 'string' || description.trim().length < MIN_PROMPT_CHARS) {
    // 400 rather than a generation: this never reaches a provider, so it never
    // costs money and never costs the caller a unit.
    return res.status(400).json({
      error: `Describe what you are designing for in at least ${MIN_PROMPT_CHARS} characters — "a calm booking app for dog groomers" is enough.`,
    })
  }

  const brief = description.trim().slice(0, MAX_PROMPT_CHARS)
  const userMessage = `Brief: ${brief}`

  let text = ''
  let servedBy = ''
  let lastErr = null
  let openrouterFailed = null
  let geminiFailed = null
  const opts = { system: STARTER_SYSTEM_PROMPT, temperature: 0.5, maxTokens: 900 }

  if (OPENROUTER_KEY) {
    try {
      text = await callOpenRouter(userMessage, opts)
      servedBy = 'openrouter'
    } catch (err) {
      lastErr = err
      console.error('Brand starter: OpenRouter failed, will try Gemini fallback:', err.status || '', err.detail || err.message)
      openrouterFailed = err
    }
  }

  if (!text && GEMINI_KEY) {
    try {
      text = await callGemini(userMessage, opts)
      servedBy = 'gemini'
    } catch (err) {
      lastErr = err
      console.error('Brand starter: Gemini fallback failed:', err.status || '', err.detail || err.message)
      geminiFailed = err
    }
  }

  // Before the error returns, so a total outage is counted too — the same
  // ordering ai-provider-path.test.js pins for generate-prompt, and for the
  // same reason: the case most worth alerting on is the one an early return
  // would skip.
  await recordProviderOutcome({ openrouterFailed, geminiFailed, served: servedBy })

  if (!text) {
    if (lastErr?.status === 429) {
      return res.status(429).json({
        error: 'The AI provider is rate-limiting us right now. Nothing was used from your allowance — try again in a minute.',
        retryAfter: 10,
        quotaSpent: false,
      })
    }
    return res.status(502).json({
      error: 'The AI provider could not be reached, so nothing was generated. Your allowance is untouched — try again shortly.',
      detail: String(lastErr?.detail || lastErr?.message || '').slice(0, 200),
      quotaSpent: false,
    })
  }

  const parsed = parseStarterJson(text)
  if (!parsed) {
    console.error('Brand starter: unparseable model answer from', servedBy, text.slice(0, 200))
    return res.status(502).json({
      error: 'The AI returned something this tool could not read, so nothing was applied. Your allowance is untouched — try again, or reword the brief.',
      quotaSpent: false,
    })
  }

  const verdict = sanitizeBrandStarter(parsed)
  if (!verdict.ok) {
    // The REASON goes to the server log, not to the user. "ratio out of range"
    // is not something a person can act on; "it did not work and it cost you
    // nothing" is.
    console.error('Brand starter: rejected model answer from', servedBy, '—', verdict.reason)
    return res.status(502).json({
      error: 'The AI produced a result this tool refused to use — it named a font we cannot load, or a palette it could not complete. Your allowance is untouched, so try again.',
      quotaSpent: false,
    })
  }

  return {
    starter: verdict.starter,
    provider: servedBy,
    plan: plan.id,
    beta: true,
    // The authoritative count, in the same shape the refusal below uses, so the
    // meter is right after a success AND after a rejection.
    generation: { used: used + 1, limit: bucket.limit, remaining: bucket.limit - used - 1, period: bucket.period },
  }
}

async function runGeneratePrompt(req, res, { plan, limit, used, monthUsed, monthLimit }) {
  const { description, style, platform } = req.body || {}
  const userMessage = buildPromptUserMessage({ description, style, platform })
  if (!userMessage) {
    return res.status(400).json({ error: 'description (string) is required' })
  }

  // Try OpenRouter (primary), then fall back to Gemini so the tool stays up
  // through a provider outage or a misconfigured OpenRouter key.
  let prompt = ''
  let provider = ''
  let lastErr = null
  // What actually happened to each provider, so the failover can be COUNTED and
  // not merely logged. `null` means "did not fail" (including "not attempted").
  let openrouterFailed = null
  let geminiFailed = null

  if (OPENROUTER_KEY) {
    try {
      prompt = await callOpenRouter(userMessage)
      provider = 'openrouter'
    } catch (err) {
      lastErr = err
      console.error('OpenRouter failed, will try Gemini fallback:', err.status || '', err.detail || err.message)
      openrouterFailed = err
    }
  }

  if (!prompt && GEMINI_KEY) {
    try {
      prompt = await callGemini(userMessage)
      provider = 'gemini'
    } catch (err) {
      lastErr = err
      console.error('Gemini fallback failed:', err.status || '', err.detail || err.message)
      geminiFailed = err
    }
  }

  // Written HERE, before the error returns below, so a total outage is counted
  // too — that is the case most worth alerting on, and returning early would
  // have skipped it. recordProviderOutcome swallows its own failures.
  await recordProviderOutcome({ openrouterFailed, geminiFailed, served: provider })

  if (!prompt) {
    if (lastErr?.status === 429) {
      return res.status(429).json({ error: 'Rate limited by provider. Try again shortly.', retryAfter: 10 })
    }
    // 401/403 from a provider means the key was rejected — surface that plainly
    // so a misconfigured key is obvious rather than a vague "unavailable".
    if (lastErr?.status === 401 || lastErr?.status === 403) {
      return res.status(502).json({ error: `AI provider rejected the API key (${lastErr.status}). Check OPENROUTER_API_KEY / GEMINI_API_KEY in the deployment environment — re-paste with no quotes or trailing spaces, then redeploy.`, detail: String(lastErr?.detail || lastErr?.message || '').slice(0, 200) })
    }
    return res.status(502).json({ error: `AI providers unavailable (${lastErr?.message || 'unknown error'}).`, detail: String(lastErr?.detail || lastErr?.message || '').slice(0, 200) })
  }

  return {
    prompt,
    provider,
    platform: typeof platform === 'string' && platform ? platform : null,
    plan: plan.id,
    usage: { used: used + 1, limit, remaining: limit - used - 1, monthUsed: monthUsed + 1, monthLimit, monthRemaining: monthLimit - monthUsed - 1 },
  }
}

// ── task registry + shared handler ───────────────────────────────────────────

const TASKS = {
  'alt-text': {
    toolId: 'alt-text',
    limitError: 'Daily limit reached',
    configError: 'AI is not configured on the server: GEMINI_API_KEY is missing.',
    configured: () => Boolean(GEMINI_KEY),
    run: runAltText,
  },
  'scan-photo': {
    toolId: 'scan-photo',
    limitError: 'Daily scan limit reached',
    configError: 'AI is not configured on the server: GEMINI_API_KEY is missing.',
    configured: () => Boolean(GEMINI_KEY),
    run: runScanPhoto,
  },
  'generate-prompt': {
    toolId: 'prompts-ai',
    limitError: 'Daily limit reached',
    configError: 'AI is not configured on the server: set OPENROUTER_API_KEY (and/or GEMINI_API_KEY) in the deployment environment.',
    configured: () => Boolean(OPENROUTER_KEY || GEMINI_KEY),
    run: runGeneratePrompt,
  },
  'brand-starter': {
    toolId: BRAND_STARTER_TOOL_ID,
    // `quota: 'generation'` is the ONLY task-level switch this file has, and it
    // exists because this allowance is a different SHAPE, not a different
    // number. Every other task meters a day and a month; a free Brand Starter
    // is one per account FOR EVER, which no rolling window can express. See
    // generationBucket() in _lib/aiGeneration.js.
    quota: 'generation',
    limitError: 'Brand Starter allowance used',
    configError: 'AI is not configured on the server: set OPENROUTER_API_KEY (and/or GEMINI_API_KEY) in the deployment environment.',
    configured: () => Boolean(OPENROUTER_KEY || GEMINI_KEY),
    run: runBrandStarter,
  },
}

// Constant-time comparison for the break-glass code below. `===` on secrets
// leaks their length and their matching prefix through timing; over a network
// that signal is noisy, but a cheap correct comparison costs nothing.
function timingSafeEqual(a, b) {
  const av = Buffer.from(String(a))
  const bv = Buffer.from(String(b))
  if (av.length !== bv.length) return false
  return nodeTimingSafeEqual(av, bv)
}

export default async function handler(req, res) {
  // ── Config health check ───────────────────────────────────────────────────
  // GET /api/ai?diag=1 reports whether the AI keys and the Firebase credential
  // are present and valid — presence and length only, never a value.
  //
  // THIS USED TO BE GATED ON A STRING COMMITTED TO THIS FILE. That is not a
  // secret; it is a published password, and it opened an endpoint that
  // enumerates which of the deployment's secrets exist. It is now gated on a
  // VERIFIED ADMINISTRATOR, using the same allowlist + email_verified check as
  // /api/verify-admin.
  //
  // The break-glass matters and is not laziness. The single most useful thing
  // this endpoint reports is "the Firebase credential is broken" — and admin
  // auth runs on that same credential, so gating solely on it would make the
  // diagnostic unreachable in the one situation it exists for. DIAG_CODE is a
  // server-only env var with NO default: unset (the shipped state) means the
  // break-glass does not exist and admin auth is the only way in.
  if (req.method === 'GET') {
    if (!('diag' in (req.query || {}))) {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'Method not allowed' })
    }
    const breakGlass = process.env.DIAG_CODE
    const codeMatches = Boolean(breakGlass) && timingSafeEqual(req.query.diag, breakGlass)
    if (!codeMatches) {
      const admin = await requireAdmin(req)
      // 404 rather than 403 — see requireAdmin. A caller who is not the
      // administrator learns nothing about whether this surface exists.
      if (!admin.ok) return res.status(admin.status === 401 ? 404 : admin.status).json({ error: 'Not found' })
    }
    let cred
    try { cred = credentialProblem() || 'ok' } catch (e) { cred = 'error: ' + String(e?.message || e).slice(0, 120) }
    return res.status(200).json({
      openrouterKey: OPENROUTER_KEY ? `set (${OPENROUTER_KEY.length} chars)` : 'MISSING',
      openrouterModel: OPENROUTER_MODEL,
      geminiKey: GEMINI_KEY ? `set (${GEMINI_KEY.length} chars)` : 'MISSING',
      firebaseCredential: cred,
      node: process.version,
      // The key rows above report EXISTENCE, which is what a revoked key also
      // looks like. This one reports what the key did on real traffic, and it is
      // the only thing here that can tell a live OpenRouter from a dead one.
      providerHealth: await readProviderHealth(),
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Authentication comes FIRST ────────────────────────────────────────────
  // Ahead of the task lookup, and — the part that matters — ahead of
  // task.configured(). It used to run after, and the ordering was a secret
  // oracle: an anonymous POST that answered 401 meant "that provider's key is
  // set", and one that answered 500 ("AI is not configured on the server:
  // GEMINI_API_KEY is missing") meant it is not. Because each task declares its
  // OWN configured() — the vision tasks need Gemini, generate-prompt takes
  // either — three unauthenticated requests enumerated which provider keys the
  // deployment holds. No key VALUE ever leaked, only its existence, which is
  // exactly the leak /api/ai?diag=1 was locked behind an admin gate to stop:
  // "the endpoint enumerates which of the deployment's secrets exist".
  //
  // An anonymous caller now gets 401 for every task, in every configuration
  // state, and learns nothing. The diagnostic value is NOT lost — see the
  // configured() check below, which still runs, just for a verified caller.
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  let uid, email
  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7))
    uid = decoded.uid
    // Only trust the email for entitlements when Firebase has verified it —
    // an unverified signup could otherwise claim someone else's address.
    email = decoded.email_verified ? decoded.email : null
  } catch {
    // This 500 reports the state of FIREBASE_SERVICE_ACCOUNT_KEY to a caller who
    // has not proved anything, and that is deliberate rather than an oversight
    // of the same class as the one above. When the credential is broken,
    // verifyIdToken fails for EVERYONE — the endpoint is 100% unusable, so its
    // brokenness is already plain from outside and the message adds no hidden
    // fact. It is also the one diagnostic that survives a broken credential,
    // which is the same reason the diag break-glass exists at all.
    const cp = credentialProblem()
    if (cp) return res.status(500).json({ error: cp })
    return res.status(401).json({ error: 'Invalid or expired session — sign out and back in.' })
  }

  const task = TASKS[req.body?.task]
  if (!task) {
    return res.status(400).json({ error: `Unknown task — expected one of: ${Object.keys(TASKS).join(', ')}` })
  }

  // …and only now, to a caller Firebase has vouched for, does the server say
  // anything about which provider keys it holds. A signed-in user staring at a
  // broken deployment still gets the specific, actionable message naming the
  // missing env var, which is the whole reason this check has its own text.
  if (!task.configured()) return res.status(500).json({ error: task.configError })

  // Per-user daily cap — every task is a paid provider call, so an
  // authenticated user can't run any of them past their plan's limit.
  const fireDb = adminDb()
  const toolId = task.toolId
  const date = todayStr()

  // ── the Brand Starter's own meter ─────────────────────────────────────────
  //
  // ONE bucket, chosen by plan: a free account counts against `uid_life`, which
  // never resets, and a Pro account against the same `uid_m2026-09` document
  // every other AI task already uses. Both live in `daily-usage`, which is
  // absent from firestore.rules and therefore default-denied to every client —
  // only the Admin SDK, which bypasses rules, can read or write it. That is
  // what keeps this clear of a rules change, and rules changes are founder-
  // gated and published separately.
  //
  // The response carries the count back so the UI can show what is left
  // without ever reading the collection itself.
  if (task.quota === 'generation') {
    let plan
    try {
      const snap = await fireDb.doc(`users/${uid}`).get()
      plan = planForUser({
        subscription: snap.data()?.subscription || null,
        lifetimeEntitlement: snap.data()?.lifetimeEntitlement || null,
        email,
      })
    } catch (e) {
      return res.status(500).json({ error: `Could not read your plan from Firestore (${String(e?.message || e).slice(0, 140)}).` })
    }

    const bucket = generationBucket(plan.id, monthStr())
    const ref = fireDb.doc(`daily-usage/${uid}_${bucket.suffix}`)

    // The unit is RESERVED before the provider is called, inside a transaction,
    // and given back if nothing was generated — see runMeteredTask in
    // _lib/aiGeneration.js for why a read-then-increment could not hold a cap.
    // This bucket is the one where it bit hardest: a free account's allowance is
    // ONE, so any concurrency at all doubled it.
    const meters = [{ ref, field: toolId, limit: bucket.limit, period: bucket.period }]
    const metered = await runMeteredTask({
      db: fireDb,
      meters,
      run: async ([used]) => {
        res.setHeader('Cache-Control', 'no-store')
        const generated = await task.run(req, res, { plan, bucket, used })
        // A runner that answered for itself — every failure path above does —
        // has already sent a response, and NOTHING is counted. Returning null
        // is what makes runMeteredTask refund the reservation, so
        // "a failed request must not consume a free user's single use" holds.
        if (!generated || generated === res || res.writableEnded || res.headersSent) return null
        return generated
      },
    })

    if (metered.storeError) {
      const e = metered.storeError
      return res.status(500).json({ error: `Could not read your usage from Firestore (${String(e?.message || e).slice(0, 140)}).` })
    }
    if (!metered.ok) {
      return res.status(429).json({
        error: exhaustedError(plan.id),
        generation: { used: metered.counts[0], limit: bucket.limit, remaining: 0, period: bucket.period },
        plan: plan.id,
      })
    }
    if (!metered.result) return

    return res.status(200).json(metered.result)
  }

  const usageRef = fireDb.doc(`daily-usage/${uid}_${date}`)
  const monthRef = fireDb.doc(`daily-usage/${uid}_${monthStr()}`)
  let plan, limit, monthLimit
  try {
    const userSnap = await fireDb.doc(`users/${uid}`).get()
    plan = planForUser({
      subscription: userSnap.data()?.subscription || null,
      lifetimeEntitlement: userSnap.data()?.lifetimeEntitlement || null,
      email,
    })
    limit = dailyLimitFor(plan, toolId)
    monthLimit = monthlyLimitFor(plan, toolId)
  } catch (e) {
    return res.status(500).json({ error: `Could not read your plan/usage from Firestore (${String(e?.message || e).slice(0, 140)}). The service account may lack Firestore access, or the project/region is misconfigured.` })
  }

  // BOTH ceilings are reserved in ONE transaction, month first. The order is the
  // reporting order: whichever is reached first is the one the message names,
  // and the message has to name WHICH period is exhausted and when it frees up —
  // "you have hit your limit" with no period and no reset time is the kind of
  // dead end that makes a paying user think the product is broken rather than
  // that they are being metered.
  //
  // One transaction over both, rather than two, because a monthly reservation
  // that succeeded while the daily one refused would meter a call that never
  // happened — the monthly ceiling would then fill from requests nobody ran.
  const meters = [
    { ref: monthRef, field: toolId, limit: monthLimit, period: 'month' },
    { ref: usageRef, field: toolId, limit, period: 'day' },
  ]
  const metered = await runMeteredTask({
    db: fireDb,
    meters,
    run: async ([monthUsed, used]) => {
      res.setHeader('Cache-Control', 'no-store')
      // Task runners either send an error response themselves (and return the
      // res object / undefined) or return the success payload for the shared
      // tail. `used`/`monthUsed` are the counts as they were BEFORE the
      // reservation, so the runners' `used + 1` arithmetic is unchanged.
      const result = await task.run(req, res, { plan, limit, used, monthUsed, monthLimit })
      if (!result || result === res || res.writableEnded || res.headersSent) return null
      return result
    },
  })

  if (metered.storeError) {
    const e = metered.storeError
    return res.status(500).json({ error: `Could not read your plan/usage from Firestore (${String(e?.message || e).slice(0, 140)}). The service account may lack Firestore access, or the project/region is misconfigured.` })
  }

  if (!metered.ok) {
    const [monthUsed, used] = metered.counts
    const day = metered.blocked.period === 'day'
    return res.status(429).json({
      error: day
        ? task.limitError
        : `You've used all ${monthLimit} AI generations in your plan this month. It resets on the 1st.`,
      usage: { used, limit, remaining: 0, monthUsed, monthLimit, period: metered.blocked.period },
      plan: plan.id,
    })
  }

  if (!metered.result) return

  return res.status(200).json(metered.result)
}
