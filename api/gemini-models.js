// Debug endpoint — lists available Gemini models for the current API key.
// Visit /api/gemini-models in a browser to see what's accessible.

export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const results = {}

  for (const version of ['v1', 'v1beta']) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}`)
      const data = await r.json()
      if (!r.ok) {
        results[version] = { error: data?.error?.message || `HTTP ${r.status}` }
        continue
      }
      const models = (data.models || [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => ({
          name: m.name,
          displayName: m.displayName,
          inputTokenLimit: m.inputTokenLimit,
          outputTokenLimit: m.outputTokenLimit,
        }))
      results[version] = { count: models.length, models }
    } catch (err) {
      results[version] = { error: String(err) }
    }
  }

  return res.status(200).json(results)
}
