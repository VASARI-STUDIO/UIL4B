// Vercel serverless function — generates alt text for an image via Google Gemini.
// Requires env var GEMINI_API_KEY (server-side only, never exposed to the client).
// Free tier: 15 RPM, 1500 RPD for gemini-2.0-flash.

export const config = {
  api: {
    bodyParser: { sizeLimit: '8mb' },
  },
}

const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const PROMPT = `You are writing alt text for a website. Describe the image in 1-2 sentences, under 125 characters when possible.
- Be concise and specific. Lead with the most important subject.
- Do not start with "Image of", "Picture of", or "A photo of".
- Describe what is visible — subject, action, setting, mood — not interpretation.
- If text is visible and important, include it verbatim in quotes.
- Plain text only, no markdown.`

const RPM_LIMIT = 14
const RPM_WINDOW = 60_000
const requestLog = []

function isRateLimited() {
  const now = Date.now()
  while (requestLog.length && requestLog[0] < now - RPM_WINDOW) requestLog.shift()
  if (requestLog.length >= RPM_LIMIT) return true
  requestLog.push(now)
  return false
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  if (isRateLimited()) {
    return res.status(429).json({ error: 'Rate limit reached (15 requests/minute). Please wait before trying again.', retryAfter: 5 })
  }

  const { image, mimeType, context } = req.body || {}
  if (!image || !mimeType) {
    return res.status(400).json({ error: 'image (base64) and mimeType required' })
  }
  if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(mimeType)) {
    return res.status(400).json({ error: 'unsupported mimeType' })
  }

  const userPrompt = context
    ? `${PROMPT}\n\nAdditional context from the author: ${context.slice(0, 500)}`
    : PROMPT

  try {
    const r = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: userPrompt },
            { inline_data: { mime_type: mimeType, data: image } },
          ],
        }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 300 },
      }),
    })

    if (!r.ok) {
      const text = await r.text()
      console.error('Gemini API error:', r.status, text.slice(0, 1000))
      let detail = text.slice(0, 500)
      try {
        const parsed = JSON.parse(text)
        detail = parsed?.error?.message || detail
      } catch {}

      if (r.status === 429) {
        return res.status(429).json({ error: `Gemini 429: ${detail}`, model: GEMINI_MODEL, retryAfter: 10 })
      }
      return res.status(502).json({ error: `Gemini ${r.status}: ${detail}`, model: GEMINI_MODEL })
    }

    const data = await r.json()
    const altText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    if (!altText) {
      return res.status(502).json({ error: 'Empty response from Gemini' })
    }
    return res.status(200).json({ altText })
  } catch (err) {
    return res.status(500).json({ error: 'Request failed', detail: String(err).slice(0, 300) })
  }
}
