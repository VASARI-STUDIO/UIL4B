import { adminDb, adminAuth, credentialProblem, FieldValueIncrement } from './_lib/firebase-admin.js'
import { planForUser, dailyLimitFor, monthlyLimitFor, modelFor } from './_lib/plans.js'
import { cleanKey } from './_lib/env.js'

// Consolidated AI endpoint — POST /api/ai with { task, ...taskBody }.
// Merges the former alt-text, scan-photo and generate-prompt routes into one
// serverless function (Vercel's 12-function limit). Each task keeps its
// original toolId so daily-usage docs and _lib/plans.js limits are unchanged:
//   task 'alt-text'        → toolId 'alt-text'        (Gemini vision, WCAG alt text)
//   task 'scan-photo'      → toolId 'scan-photo'      (Gemini vision, photo-rule JSON)
//   task 'generate-prompt' → toolId 'prompts-ai'      (OpenRouter → Gemini fallback)

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

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

const ALT_BASE_PROMPT = `You are an accessibility expert writing WCAG 2.2-compliant alt text for a website image.
- Do not start with "Image of", "Picture of", or "A photo of", and do not end with the word "image".
- Convey the image's purpose and meaning in context, not just a literal description. Ask: what information would a sighted user gain that a screen-reader user would miss?
- Describe what is visible — subject, action, setting, mood — not personal interpretation or assumptions.
- Describe people inclusively: avoid assuming gender, race, or ethnicity unless clearly self-evident. Use neutral terms like "person", "individual", or "child" when uncertain.
- If text is visible in the image, include it verbatim in quotes — this is critical for accessibility.
- For functional images (a logo that links home, an icon button, a clickable element), describe the action or destination, not the visual appearance (e.g. "Search" not "magnifying glass icon").
- For charts, graphs, or infographics: describe the type of visualization, the data it represents, key values or trends, and axis labels — not just "a chart" or "a graph".
- Keep it succinct: front-load the most important information; screen readers may truncate long descriptions.
- If the image is purely decorative (a divider, background pattern, abstract texture with no informational content), respond with exactly: decorative
- Plain text only, no markdown, no bullet points.`

const TONE_CONFIGS = {
  concise: {
    instruction: 'Be concise and specific in 1-2 sentences, under 125 characters when possible. Lead with the most important subject.',
    maxOutputTokens: 300,
    temperature: 0.4,
  },
  detailed: {
    instruction: 'Provide a thorough description in 2-4 sentences, up to 300 characters. Cover subject, context, spatial layout, and any notable details.',
    maxOutputTokens: 600,
    temperature: 0.4,
  },
  technical: {
    instruction: 'Focus on technical details: exact text content, data values, measurements, labels, UI element types, color hex values if relevant. Be precise and factual, 2-4 sentences.',
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
  const promptParts = [ALT_BASE_PROMPT, toneConfig.instruction]
  if (context) promptParts.push(`Additional context from the author: ${context.slice(0, 500)}`)
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
    let altText = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim() || ''
    if (!altText) return res.status(502).json({ error: 'Empty response from AI provider' })

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

    return {
      altText,
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
        { role: 'system', content: PROMPT_SYSTEM_PROMPT },
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
      contents: [{ role: 'user', parts: [{ text: `${PROMPT_SYSTEM_PROMPT}\n\n${userMessage}` }] }],
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

async function runGeneratePrompt(req, res, { plan, limit, used, monthUsed, monthLimit }) {
  const { description, style, platform } = req.body || {}
  if (!description || typeof description !== 'string') {
    return res.status(400).json({ error: 'description (string) is required' })
  }

  let userMessage = `Design brief: ${description.slice(0, 2000)}`
  if (style) userMessage += `\nStyle: ${style.slice(0, 200)}`
  if (platform) userMessage += `\nTarget platform: ${platform.slice(0, 100)}`

  // Try OpenRouter (primary), then fall back to Gemini so the tool stays up
  // through a provider outage or a misconfigured OpenRouter key.
  let prompt = ''
  let provider = ''
  let lastErr = null

  if (OPENROUTER_KEY) {
    try {
      prompt = await callOpenRouter(userMessage)
      provider = 'openrouter'
    } catch (err) {
      lastErr = err
      console.error('OpenRouter failed, will try Gemini fallback:', err.status || '', err.detail || err.message)
    }
  }

  if (!prompt && GEMINI_KEY) {
    try {
      prompt = await callGemini(userMessage)
      provider = 'gemini'
    } catch (err) {
      lastErr = err
      console.error('Gemini fallback failed:', err.status || '', err.detail || err.message)
    }
  }

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
    platform: platform || null,
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
}

export default async function handler(req, res) {
  // Config health check (admin-code gated). GET /api/ai?diag=<code> reports
  // whether the AI keys and Firebase credential are present/valid — lengths
  // only, never the values — so misconfiguration is diagnosable fast.
  if (req.method === 'GET') {
    if ((req.query?.diag || '') !== 'uil4b-dev-2026') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'Method not allowed' })
    }
    let cred
    try { cred = credentialProblem() || 'ok' } catch (e) { cred = 'error: ' + String(e?.message || e).slice(0, 120) }
    return res.status(200).json({
      openrouterKey: OPENROUTER_KEY ? `set (${OPENROUTER_KEY.length} chars)` : 'MISSING',
      openrouterModel: OPENROUTER_MODEL,
      geminiKey: GEMINI_KEY ? `set (${GEMINI_KEY.length} chars)` : 'MISSING',
      firebaseCredential: cred,
      node: process.version,
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const task = TASKS[req.body?.task]
  if (!task) {
    return res.status(400).json({ error: `Unknown task — expected one of: ${Object.keys(TASKS).join(', ')}` })
  }

  if (!task.configured()) return res.status(500).json({ error: task.configError })

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
    const cp = credentialProblem()
    if (cp) return res.status(500).json({ error: cp })
    return res.status(401).json({ error: 'Invalid or expired session — sign out and back in.' })
  }

  // Per-user daily cap — every task is a paid provider call, so an
  // authenticated user can't run any of them past their plan's limit.
  const fireDb = adminDb()
  const toolId = task.toolId
  const date = todayStr()
  const usageRef = fireDb.doc(`daily-usage/${uid}_${date}`)
  const monthRef = fireDb.doc(`daily-usage/${uid}_${monthStr()}`)
  let plan, limit, used, monthLimit, monthUsed
  try {
    const userSnap = await fireDb.doc(`users/${uid}`).get()
    plan = planForUser({
      subscription: userSnap.data()?.subscription || null,
      lifetimeEntitlement: userSnap.data()?.lifetimeEntitlement || null,
      email,
    })
    limit = dailyLimitFor(plan, toolId)
    monthLimit = monthlyLimitFor(plan, toolId)
    const [usageSnap, monthSnap] = await Promise.all([usageRef.get(), monthRef.get()])
    used = usageSnap.data()?.[toolId] || 0
    monthUsed = monthSnap.data()?.[toolId] || 0
  } catch (e) {
    return res.status(500).json({ error: `Could not read your plan/usage from Firestore (${String(e?.message || e).slice(0, 140)}). The service account may lack Firestore access, or the project/region is misconfigured.` })
  }

  // Whichever ceiling is reached first. The message names WHICH one and when it
  // frees up — "you have hit your limit" with no period and no reset time is
  // the kind of dead end that makes a paying user think the product is broken
  // rather than that they are being metered.
  if (monthUsed >= monthLimit) {
    return res.status(429).json({
      error: `You've used all ${monthLimit} AI generations in your plan this month. It resets on the 1st.`,
      usage: { used, limit, remaining: 0, monthUsed, monthLimit, period: 'month' },
      plan: plan.id,
    })
  }

  if (used >= limit) {
    return res.status(429).json({
      error: task.limitError,
      usage: { used, limit, remaining: 0, monthUsed, monthLimit, period: 'day' },
      plan: plan.id,
    })
  }

  res.setHeader('Cache-Control', 'no-store')

  // Task runners either send an error response themselves (and return the res
  // object / undefined) or return the success payload for the shared tail.
  const result = await task.run(req, res, { plan, limit, used, monthUsed, monthLimit })
  if (!result || result === res || res.writableEnded || res.headersSent) return

  try {
    const inc = await FieldValueIncrement(1)
    // Both buckets, or the monthly ceiling never fills and is decorative.
    await Promise.all([
      usageRef.set({ [toolId]: inc }, { merge: true }),
      monthRef.set({ [toolId]: inc }, { merge: true }),
    ])
  } catch { /* usage write best-effort — never fail a successful generation */ }

  return res.status(200).json(result)
}
