import { adminDb, adminAuth, credentialProblem, FieldValueIncrement } from './_lib/firebase-admin.js'
import { planForSubscription, dailyLimitFor } from './_lib/plans.js'

export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } },
}

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = 'gemini-2.0-flash'

const SYSTEM_PROMPT = `You are an expert AI image prompt engineer specialising in photorealistic, artistic, and commercial image generation.

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
      temperature: opts.temperature ?? 0.75,
      max_tokens: opts.maxTokens ?? 600,
      top_p: 0.9,
      frequency_penalty: 0.15,
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
  const prompt = data?.choices?.[0]?.message?.content?.trim() || ''
  if (!prompt) throw new Error('DeepSeek returned empty response')
  return prompt
}

// Fallback provider: Gemini. Used only when DeepSeek is unavailable so the tool
// keeps working until DeepSeek is fully proven in production.
async function callGemini(userMessage, opts = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${userMessage}` }] }],
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

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!DEEPSEEK_KEY && !GEMINI_KEY) return res.status(500).json({ error: 'AI is not configured on the server: set DEEPSEEK_API_KEY (and/or GEMINI_API_KEY) in the deployment environment.' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  let uid
  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7))
    uid = decoded.uid
  } catch {
    const cp = credentialProblem()
    if (cp) return res.status(500).json({ error: cp })
    return res.status(401).json({ error: 'Invalid or expired session — sign out and back in.' })
  }

  const fireDb = adminDb()
  const userSnap = await fireDb.doc(`users/${uid}`).get()
  const subscription = userSnap.data()?.subscription || null
  const plan = planForSubscription(subscription)
  const toolId = 'prompts-ai'
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

  const { description, style, platform } = req.body || {}
  if (!description || typeof description !== 'string') {
    return res.status(400).json({ error: 'description (string) is required' })
  }

  let userMessage = `Design brief: ${description.slice(0, 2000)}`
  if (style) userMessage += `\nStyle: ${style.slice(0, 200)}`
  if (platform) userMessage += `\nTarget platform: ${platform.slice(0, 100)}`

  // Try DeepSeek (primary), then fall back to Gemini so the tool stays up while
  // DeepSeek is being proven out in production.
  let prompt = ''
  let provider = ''
  let lastErr = null

  if (DEEPSEEK_KEY) {
    try {
      prompt = await callDeepSeek(userMessage)
      provider = 'deepseek'
    } catch (err) {
      lastErr = err
      console.error('DeepSeek failed, will try Gemini fallback:', err.status || '', err.detail || err.message)
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
    return res.status(502).json({ error: 'AI providers unavailable', detail: String(lastErr?.message || '').slice(0, 200) })
  }

  try {
    const inc = await FieldValueIncrement(1)
    await usageRef.set({ [toolId]: inc }, { merge: true })
  } catch { /* usage write best-effort */ }

  return res.status(200).json({
    prompt,
    provider,
    platform: platform || null,
    plan: plan.id,
    usage: { used: used + 1, limit, remaining: limit - used - 1 },
  })
}
