import { adminDb, adminAuth, FieldValueIncrement } from './_lib/firebase-admin.js'
import { planForSubscription, dailyLimitFor, modelFor } from './_lib/plans.js'

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
}

// Gemini API key — accept the common env var names so it works regardless of
// what it was named in Vercel. Server-side only (never exposed to the client).
const GEMINI_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  ''

const PROMPT = `You are writing alt text for a website. Describe the image in 1-2 sentences, under 125 characters when possible.
- Be concise and specific. Lead with the most important subject.
- Do not start with "Image of", "Picture of", or "A photo of".
- Describe what is visible — subject, action, setting, mood — not interpretation.
- If text is visible and important, include it verbatim in quotes.
- Plain text only, no markdown.`

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!GEMINI_KEY) return res.status(500).json({ error: 'AI provider not configured' })

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
  const toolId = 'alt-text'
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

  const { image, mimeType, context } = req.body || {}
  if (!image || !mimeType) return res.status(400).json({ error: 'image (base64) and mimeType required' })
  if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(mimeType)) {
    return res.status(400).json({ error: 'unsupported mimeType' })
  }

  const model = modelFor(plan, toolId)
  const userPrompt = context
    ? `${PROMPT}\n\nAdditional context from the author: ${context.slice(0, 500)}`
    : PROMPT

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: userPrompt },
            { inline_data: { mime_type: mimeType, data: image } },
          ],
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 500,
        },
      }),
    })

    if (!r.ok) {
      const text = await r.text()
      console.error('Gemini error:', r.status, text.slice(0, 1000))
      if (r.status === 429) {
        return res.status(429).json({ error: 'Rate limited by provider. Try again shortly.', retryAfter: 10 })
      }
      return res.status(502).json({ error: `AI provider error (${r.status})`, model })
    }

    const data = await r.json()
    const altText = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim() || ''
    if (!altText) return res.status(502).json({ error: 'Empty response from AI provider' })

    const inc = await FieldValueIncrement(1)
    await usageRef.set({ [toolId]: inc }, { merge: true })

    return res.status(200).json({
      altText,
      model,
      plan: plan.id,
      usage: { used: used + 1, limit, remaining: limit - used - 1 },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Request failed', detail: String(err).slice(0, 300) })
  }
}
