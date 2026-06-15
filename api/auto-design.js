import { adminDb, adminAuth, FieldValueIncrement } from './_lib/firebase-admin.js'
import { planForSubscription, dailyLimitFor } from './_lib/plans.js'

export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } },
}

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = 'gemini-2.0-flash'

const SYSTEM_PROMPT = `You are a brand design expert. Given a business description and mood, generate a complete design system as JSON.

Return ONLY valid JSON with this exact structure:
{
  "colors": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex",
    "rationale": "Brief explanation of color choices"
  },
  "typography": {
    "heading": "Google Font name",
    "body": "Google Font name",
    "rationale": "Brief explanation of font choices"
  },
  "hero": {
    "headline": "Short hero headline for this business",
    "subheadline": "Supporting tagline"
  }
}

Rules:
- Colors must work together with 4.5:1+ contrast between text and background
- Use Google Fonts that are free and widely available
- Match the mood keyword: minimal=clean/sparse, bold=high-contrast/saturated, playful=bright/varied, corporate=blues/grays, elegant=muted/refined, rustic=earth-tones/warm
- Hero copy should be specific to the business, not generic`

const REQUIRED_KEYS = {
  colors: ['primary', 'secondary', 'accent', 'background', 'text', 'rationale'],
  typography: ['heading', 'body', 'rationale'],
  hero: ['headline', 'subheadline'],
}

function validateDesign(obj) {
  if (!obj || typeof obj !== 'object') return false
  for (const [section, keys] of Object.entries(REQUIRED_KEYS)) {
    if (!obj[section] || typeof obj[section] !== 'object') return false
    for (const key of keys) {
      if (typeof obj[section][key] !== 'string' || !obj[section][key]) return false
    }
  }
  return true
}

function parseDesignJSON(raw) {
  let text = raw.trim()
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) text = fenceMatch[1].trim()
  return JSON.parse(text)
}

async function callDeepSeek(userMessage, opts = {}) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 800,
      top_p: 0.9,
      frequency_penalty: 0.15,
      response_format: { type: 'json_object' },
    }),
  })
  if (!r.ok) {
    const text = await r.text()
    const err = new Error(`DeepSeek ${r.status}`)
    err.status = r.status
    err.detail = text.slice(0, 500)
    throw err
  }
  const data = await r.json()
  const content = data?.choices?.[0]?.message?.content?.trim() || ''
  if (!content) throw new Error('DeepSeek returned empty response')
  return content
}

async function callGemini(userMessage, opts = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${userMessage}` }] }],
      generationConfig: { temperature: opts.temperature ?? 0.7, maxOutputTokens: opts.maxTokens ?? 800, topP: 0.9, responseMimeType: 'application/json' },
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
  const content = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim() || ''
  if (!content) throw new Error('Gemini returned empty response')
  return content
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!DEEPSEEK_KEY && !GEMINI_KEY) return res.status(500).json({ error: 'AI provider not configured' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  let uid
  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7))
    uid = decoded.uid
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const fireDb = adminDb()
  const userSnap = await fireDb.doc(`users/${uid}`).get()
  const subscription = userSnap.data()?.subscription || null
  const plan = planForSubscription(subscription)
  const toolId = 'auto-design'
  const limit = dailyLimitFor(plan, toolId)

  const date = todayStr()
  const usageRef = fireDb.doc(`daily-usage/${uid}_${date}`)
  const usageSnap = await usageRef.get()
  const used = usageSnap.data()?.[toolId] || 0

  if (used >= limit) {
    return res.status(429).json({
      error: 'Daily limit reached',
      usage: { used, limit, remaining: 0 },
      plan: plan.id,
    })
  }

  const { description, mood } = req.body || {}
  if (!description || typeof description !== 'string') {
    return res.status(400).json({ error: 'description (string) is required' })
  }

  let userMessage = `Business description: ${description.slice(0, 2000)}`
  if (mood && typeof mood === 'string') userMessage += `\nMood: ${mood.slice(0, 100)}`

  // Try DeepSeek (primary), then fall back to Gemini so the tool stays up while
  // DeepSeek is being proven out in production.
  let rawResponse = ''
  let provider = ''
  let lastErr = null

  if (DEEPSEEK_KEY) {
    try {
      rawResponse = await callDeepSeek(userMessage)
      provider = 'deepseek'
    } catch (err) {
      lastErr = err
      console.error('DeepSeek failed, will try Gemini fallback:', err.status || '', err.detail || err.message)
    }
  }

  if (!rawResponse && GEMINI_KEY) {
    try {
      rawResponse = await callGemini(userMessage)
      provider = 'gemini'
    } catch (err) {
      lastErr = err
      console.error('Gemini fallback failed:', err.status || '', err.detail || err.message)
    }
  }

  if (!rawResponse) {
    if (lastErr?.status === 429) {
      return res.status(429).json({ error: 'Rate limited by provider. Try again shortly.', retryAfter: 10 })
    }
    return res.status(502).json({ error: 'AI providers unavailable', detail: String(lastErr?.message || '').slice(0, 200) })
  }

  let design
  try {
    design = parseDesignJSON(rawResponse)
  } catch {
    return res.status(502).json({ error: 'AI returned invalid JSON', detail: rawResponse.slice(0, 300) })
  }

  if (!validateDesign(design)) {
    return res.status(502).json({ error: 'AI returned incomplete design system', detail: JSON.stringify(design).slice(0, 300) })
  }

  try {
    const inc = await FieldValueIncrement(1)
    await usageRef.set({ [toolId]: inc }, { merge: true })
  } catch { /* usage write best-effort */ }

  return res.status(200).json({
    design,
    provider,
    plan: plan.id,
    usage: { used: used + 1, limit, remaining: limit - used - 1 },
  })
}
