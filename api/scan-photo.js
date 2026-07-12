import { adminAuth, adminDb, credentialProblem, FieldValueIncrement } from './_lib/firebase-admin.js'
import { planForUser, dailyLimitFor } from './_lib/plans.js'
import { cleanKey } from './_lib/env.js'

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
}

const GEMINI_KEY = cleanKey(
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  ''
)

const SYSTEM_PROMPT = `You are a photography and visual analysis expert. Analyze the uploaded image and identify the photographic and visual rules/settings used. Return a JSON array of detected rules, where each rule is an object with:
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

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!GEMINI_KEY) return res.status(500).json({ error: 'AI is not configured on the server: GEMINI_API_KEY is missing.' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  let uid, email
  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7))
    uid = decoded.uid
    // Entitlement emails must be Firebase-verified (see generate-prompt.js).
    email = decoded.email_verified ? decoded.email : null
  } catch {
    const cp = credentialProblem()
    if (cp) return res.status(500).json({ error: cp })
    return res.status(401).json({ error: 'Invalid or expired session — sign out and back in.' })
  }

  // Per-user daily cap — mirrors generate-prompt.js / alt-text.js so this paid
  // Gemini Vision call can't be abused by an authenticated user.
  const fireDb = adminDb()
  const toolId = 'scan-photo'
  const date = todayStr()
  const usageRef = fireDb.doc(`daily-usage/${uid}_${date}`)
  let plan, limit, used
  try {
    const userSnap = await fireDb.doc(`users/${uid}`).get()
    plan = planForUser({ subscription: userSnap.data()?.subscription || null, email })
    limit = dailyLimitFor(plan, toolId)
    const usageSnap = await usageRef.get()
    used = usageSnap.data()?.[toolId] || 0
  } catch (e) {
    return res.status(500).json({ error: `Could not read your plan/usage from Firestore (${String(e?.message || e).slice(0, 140)}). The service account may lack Firestore access, or the project/region is misconfigured.` })
  }
  if (used >= limit) {
    return res.status(429).json({ error: 'Daily scan limit reached', usage: { used, limit, remaining: 0 }, plan: plan.id })
  }

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
              { text: SYSTEM_PROMPT },
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

    try {
      const inc = await FieldValueIncrement(1)
      await usageRef.set({ [toolId]: inc }, { merge: true })
    } catch { /* usage write best-effort */ }

    return res.status(200).json({ rules })
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI provider timed out' })
    }
    return res.status(500).json({ error: 'Request failed', detail: String(err).slice(0, 300) })
  }
}
