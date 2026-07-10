import { adminDb, adminAuth, credentialProblem, FieldValueIncrement } from './_lib/firebase-admin.js'
import { planForSubscription, dailyLimitFor } from './_lib/plans.js'
import { cleanKey } from './_lib/env.js'

export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } },
}

// Primary AI provider is now OpenRouter (OpenAI-compatible gateway). It lets us
// swap the underlying model with a single env var and keeps one billing account
// across providers. OPENROUTER_MODEL overrides the default without a code change.
const OPENROUTER_KEY = cleanKey(process.env.OPENROUTER_API_KEY)
const OPENROUTER_MODEL = (process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat').trim()
const OPENROUTER_REFERER = process.env.OPENROUTER_SITE_URL || 'https://uil4b.com'
const GEMINI_KEY = cleanKey(process.env.GEMINI_API_KEY)
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
  // Config health check (admin-code gated). GET /api/generate-prompt?diag=<code>
  // reports whether the AI keys and Firebase credential are present/valid —
  // lengths only, never the values — so misconfiguration is diagnosable fast.
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

  if (!OPENROUTER_KEY && !GEMINI_KEY) return res.status(500).json({ error: 'AI is not configured on the server: set OPENROUTER_API_KEY (and/or GEMINI_API_KEY) in the deployment environment.' })

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
  const toolId = 'prompts-ai'
  const date = todayStr()
  const usageRef = fireDb.doc(`daily-usage/${uid}_${date}`)
  let plan, limit, used
  try {
    const userSnap = await fireDb.doc(`users/${uid}`).get()
    plan = planForSubscription(userSnap.data()?.subscription || null)
    limit = dailyLimitFor(plan, toolId)
    const usageSnap = await usageRef.get()
    used = usageSnap.data()?.[toolId] || 0
  } catch (e) {
    return res.status(500).json({ error: `Could not read your plan/usage from Firestore (${String(e?.message || e).slice(0, 140)}). The service account may lack Firestore access, or the project/region is misconfigured.` })
  }

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
