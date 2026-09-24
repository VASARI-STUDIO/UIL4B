import { useState, useMemo } from 'react'

// Content analyzer — paste page copy and get readability scores, keyword
// density, and top phrases. Fully client-side, no backend.

const STOPWORDS = new Set('a an and are as at be by for from has have he her his i in is it its of on or that the their they this to was were will with you your we our us not but can if so do does about into over more most can also any all'.split(' '))

function syllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '')
  const m = w.match(/[aeiouy]{1,2}/g)
  return m ? m.length : 1
}

function readingEaseLabel(score) {
  if (score >= 80) return { label: 'Very easy', tone: 'ok' }
  if (score >= 60) return { label: 'Plain English', tone: 'ok' }
  if (score >= 50) return { label: 'Fairly difficult', tone: 'warn' }
  if (score >= 30) return { label: 'Difficult', tone: 'warn' }
  return { label: 'Very difficult', tone: 'err' }
}

function analyze(text, keyword) {
  const trimmed = text.trim()
  if (!trimmed) return null

  const words = trimmed.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const sentences = trimmed.split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
  const sentenceCount = Math.max(1, sentences.length)
  const syllableCount = words.reduce((s, w) => s + syllables(w), 0)

  const wordsPerSentence = wordCount / sentenceCount
  const syllablesPerWord = syllableCount / Math.max(1, wordCount)
  const ease = Math.max(0, Math.min(100, 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord))
  const grade = Math.max(0, 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59)

  // Normalised single words for frequency (strip punctuation, drop stopwords).
  const norm = words.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean)
  const content = norm.filter(w => w.length > 2 && !STOPWORDS.has(w))

  const freq = new Map()
  content.forEach(w => freq.set(w, (freq.get(w) || 0) + 1))
  const topWords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count, density: (count / wordCount) * 100 }))

  // Bigrams from the normalised stream (skip pairs that are both stopwords).
  const bigrams = new Map()
  for (let i = 0; i < norm.length - 1; i++) {
    const a = norm[i], b = norm[i + 1]
    if (!a || !b) continue
    if (STOPWORDS.has(a) && STOPWORDS.has(b)) continue
    if (a.length < 2 || b.length < 2) continue
    const key = `${a} ${b}`
    bigrams.set(key, (bigrams.get(key) || 0) + 1)
  }
  const topPhrases = [...bigrams.entries()]
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([phrase, count]) => ({ phrase, count }))

  let keywordStat = null
  const kw = keyword.trim().toLowerCase()
  if (kw) {
    // Count against the RAW lowercased text (so stopword keywords aren't filtered
    // out), with Unicode-safe word boundaries so "café"/CJK keywords still match.
    const raw = trimmed.toLowerCase()
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    let count = 0
    try {
      count = (raw.match(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'gu')) || []).length
    } catch {
      count = (raw.match(new RegExp(escaped, 'g')) || []).length
    }
    const density = (count / Math.max(1, wordCount)) * 100
    let verdict
    if (count === 0) verdict = { text: 'Not found — add it to your copy.', tone: 'err' }
    else if (density > 3) verdict = { text: 'High — may read as keyword stuffing.', tone: 'warn' }
    else if (density < 0.4) verdict = { text: 'Low — could appear a little more.', tone: 'warn' }
    else verdict = { text: 'Healthy density.', tone: 'ok' }
    keywordStat = { count, density, verdict }
  }

  return {
    wordCount,
    sentenceCount,
    readingTime: Math.max(1, Math.round(wordCount / 200)),
    avgSentence: wordsPerSentence,
    ease,
    grade,
    topWords,
    topPhrases,
    keywordStat,
  }
}

export default function ContentAnalyzer() {
  const [text, setText] = useState('')
  const [keyword, setKeyword] = useState('')

  const result = useMemo(() => analyze(text, keyword), [text, keyword])
  const easeMeta = result ? readingEaseLabel(result.ease) : null

  return (
    <div className="seo-grid">
      <div className="seo-inputs">
        <label className="seo-field">
          <span className="seo-field-label">Page content</span>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={14} placeholder="Paste your page copy here to analyse readability, keyword density, and top phrases…" />
        </label>
        <label className="seo-field">
          <span className="seo-field-label">Target keyword <em>optional</em></span>
          <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="aspect ratio calculator" />
        </label>
      </div>

      <div className="seo-preview-col">
        {!result ? (
          <div className="seo-ca-empty">Start typing or paste content to see the analysis.</div>
        ) : (
          <>
            <div className="seo-ca-stats">
              <div className="seo-ca-stat"><div className="seo-ca-num">{result.wordCount}</div><div className="seo-ca-lbl">Words</div></div>
              <div className="seo-ca-stat"><div className="seo-ca-num">{result.sentenceCount}</div><div className="seo-ca-lbl">Sentences</div></div>
              <div className="seo-ca-stat"><div className="seo-ca-num">{result.readingTime}<span> min</span></div><div className="seo-ca-lbl">Read time</div></div>
              <div className="seo-ca-stat"><div className="seo-ca-num">{result.avgSentence.toFixed(1)}</div><div className="seo-ca-lbl">Words/sentence</div></div>
            </div>

            <div className="seo-tags seo-tags--flush">
              <div className="seo-ca-ease">
                <div>
                  <div className={`seo-ca-ease-score seo-tone--${easeMeta.tone}`}>{Math.round(result.ease)}</div>
                  <div className="seo-ca-lbl">Reading ease</div>
                </div>
                <div className="seo-ca-ease-meta">
                  <div className={`seo-ca-ease-label seo-tone--${easeMeta.tone}`}>{easeMeta.label}</div>
                  <div className="seo-ca-ease-grade">Grade level ≈ {result.grade.toFixed(1)}</div>
                </div>
              </div>
            </div>

            {result.keywordStat && (
              <div className="seo-tags seo-tags--flush">
                <h2 className="seo-checklist-h seo-checklist-h--tight">Target keyword</h2>
                <div className="seo-ca-kwline">
                  <span><strong>{result.keywordStat.count}</strong> uses · <strong>{result.keywordStat.density.toFixed(2)}%</strong> density</span>
                  <span className={`seo-ca-verdict seo-tone--${result.keywordStat.verdict.tone}`}>{result.keywordStat.verdict.text}</span>
                </div>
              </div>
            )}

            <div className="seo-tags seo-tags--flush">
              <h2 className="seo-checklist-h seo-checklist-h--tight">Top keywords</h2>
              <div className="seo-ca-kw-grid">
                {result.topWords.length ? result.topWords.map(k => (
                  <div key={k.word} className="seo-ca-kw">
                    <span className="seo-ca-kw-word">{k.word}</span>
                    <span className="seo-ca-kw-meta">{k.count}× · {k.density.toFixed(1)}%</span>
                  </div>
                )) : <span className="seo-ca-lbl">Not enough content yet.</span>}
              </div>
            </div>

            {result.topPhrases.length > 0 && (
              <div className="seo-tags seo-tags--flush">
                <h2 className="seo-checklist-h seo-checklist-h--tight">Repeated phrases</h2>
                <div className="seo-ca-phrases">
                  {result.topPhrases.map(p => (
                    <span key={p.phrase} className="seo-ca-phrase">{p.phrase} <em>{p.count}×</em></span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
