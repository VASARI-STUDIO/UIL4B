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

const BASE_PROMPT = `You are writing alt text for a website image.
- Do not start with "Image of", "Picture of", or "A photo of".
- Describe what is visible — subject, action, setting, mood — not interpretation.
- Describe people inclusively: avoid assuming gender, race, or ethnicity unless clearly self-evident. Use neutral terms like "person", "individual", or "child" when uncertain.
- If text is visible in the image, include it verbatim in quotes — this is critical for accessibility.
- For charts, graphs, or infographics: describe the type of visualization, the data it represents, key values or trends, and axis labels — not just "a chart" or "a graph".
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

  const { image, mimeType, context, tone } = req.body || {}
  if (!image || !mimeType) return res.status(400).json({ error: 'image (base64) and mimeType required' })
  const toneKey = tone && TONE_CONFIGS[tone] ? tone : 'concise'
  const toneConfig = TONE_CONFIGS[toneKey]
  if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(mimeType)) {
    return res.status(400).json({ error: 'unsupported mimeType' })
  }

  const model = modelFor(plan, toolId)
  const promptParts = [BASE_PROMPT, toneConfig.instruction]
  if (context) promptParts.push(`Additional context from the author: ${context.slice(0, 500)}`)
  const userPrompt = promptParts.join('\n\n')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`

  res.setHeader('Cache-Control', 'no-store')

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

    const inc = await FieldValueIncrement(1)
    await usageRef.set({ [toolId]: inc }, { merge: true })

    return res.status(200).json({
      altText,
      model,
      tone: toneKey,
      plan: plan.id,
      usage: { used: used + 1, limit, remaining: limit - used - 1 },
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI provider timed out. Try again.' })
    }
    return res.status(500).json({ error: 'Request failed', detail: String(err).slice(0, 300) })
  }
}
