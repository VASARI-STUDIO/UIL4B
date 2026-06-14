import { adminDb, adminAuth, FieldValueIncrement } from './_lib/firebase-admin.js'
import { planForSubscription, dailyLimitFor } from './_lib/plans.js'

export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } },
}

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''

const SYSTEM_PROMPT = `You are an expert AI image prompt engineer. Generate a detailed, effective prompt for AI image generation. Include: subject description, art style, lighting, mood, composition, color palette, and technical quality tags. Format for the specified platform if given. Return ONLY the prompt text, no explanations.`

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!DEEPSEEK_KEY) return res.status(500).json({ error: 'AI provider not configured' })

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

  const url = 'https://api.deepseek.com/chat/completions'

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    })

    if (!r.ok) {
      const text = await r.text()
      console.error('DeepSeek error:', r.status, text.slice(0, 1000))
      if (r.status === 429) {
        return res.status(429).json({ error: 'Rate limited by provider. Try again shortly.', retryAfter: 10 })
      }
      return res.status(502).json({ error: `AI provider error (${r.status})` })
    }

    const data = await r.json()
    const prompt = data?.choices?.[0]?.message?.content?.trim() || ''
    if (!prompt) return res.status(502).json({ error: 'Empty response from AI provider' })

    const inc = await FieldValueIncrement(1)
    await usageRef.set({ [toolId]: inc }, { merge: true })

    return res.status(200).json({
      prompt,
      platform: platform || null,
      plan: plan.id,
      usage: { used: used + 1, limit, remaining: limit - used - 1 },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Request failed', detail: String(err).slice(0, 300) })
  }
}
