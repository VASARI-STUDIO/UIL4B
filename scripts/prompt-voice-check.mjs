// Score the prompt library for sameness: does it read as ten prompts written by
// ten different briefs, or as one template with the nouns swapped?
//
// WHY THIS EXISTS
// tests/unit/prompt-library-slop.test.js checks words and fabrication. A
// rewrite of c-1 to c-10 passed it cleanly yet read more AI-generated than the
// version it replaced. The slop was structural, not lexical: every prompt opened "Build a X, in a single
// HTML file, for Y", then Look / Page / Motion / Rules / "Done when:", the same
// sentences repeated word for word, and the lines were spent on prohibitions
// instead of pictures. A word list cannot see any of that. This can.
//
// WHAT IT MEASURES (all of it countable, none of it taste)
//   per prompt  template phrases, the share of sentences that are prohibitions,
//               and quoted sample copy ("along the lines of ...")
//   across set  the same heading list, the same opening words, whole sentences
//               repeated, and long phrases repeated
//
// Scores are out of 10, 10 = clean. A prompt score is 10 minus its own
// deductions. The set score is 10 minus the across-set deductions minus the
// mean of the per-prompt deductions, so a library of individually fine prompts
// that all share a skeleton still fails.
//
// WHAT IT CANNOT DO
// It cannot tell whether a prompt is good. A clean score means no template
// fingerprint was found; reading the prompts is still the review.
//
// Usage:
//   node scripts/prompt-voice-check.mjs                      current file, c-1 to c-10
//   node scripts/prompt-voice-check.mjs --all                every prompt
//   node scripts/prompt-voice-check.mjs --ref <git-ref>      the file as it was at a ref
//   node scripts/prompt-voice-check.mjs --compare <a> <b>    two refs side by side
//   node scripts/prompt-voice-check.mjs --json
// Exit 1 if the set scores under 8 or any prompt under 7.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const LIBRARY = 'api/_lib/library/communityPrompts.js'

export const SET_PASS = 8
export const PROMPT_PASS = 7

// Phrases that signal a template. Each costs the prompt 1 point. `minPrompts`
// makes a phrase count only when it repeats across the set: a house phrase one
// prompt uses once is a voice, the same phrase in three is a stamp.
export const TEMPLATE_PHRASES = [
  { phrase: 'in a single HTML file', reason: 'the stamped opening: every prompt delivers the same file the same way' },
  { phrase: 'One moment:', reason: 'a motion rule written as a template slot' },
  { phrase: 'Done when:', reason: 'the board card format leaking into a creative brief' },
  { phrase: 'Nothing loops', reason: 'an anti-slop rule pasted in as a prohibition' },
  { phrase: 'Nothing else animates', reason: 'an anti-slop rule pasted in as a prohibition' },
  { phrase: 'along the lines of', reason: 'quoted sample copy the model should write itself' },
  { phrase: 'Everything below supports', reason: 'the prompt explaining itself' },
  { phrase: 'answers before it shows', reason: 'an aphorism hook: the X-before-Y slogan shape' },
  { phrase: 'Invent the rest and commit to it', reason: 'the same instruction in the same words', minPrompts: 3 },
]

// Same idea as the NEGATORS in prompt-library-slop.test.js: words that turn a
// sentence into a don't.
const NEGATORS = /\b(avoid|avoids|avoiding|never|not|no|don'?t|do not|rather than|instead of|except|unless|without|ban|banned|forbid|forbidden|we do not|refuse|nothing)\b/i

// Sample copy in quotes, other than "along the lines of", which is already a
// template phrase and is not charged twice.
const SAMPLE_COPY = /for example,?\s*["“]/gi

const HEADING_MAX = 40
const SHARED_HEADINGS = 3 // prompts with the same ordered heading list
const SHARED_OPENING = 4 // prompts with the same first three words
const REPEATED_SENTENCE = 3 // prompts containing the same sentence
const REPEATED_PHRASE = 5 // prompts containing the same six-word phrase
const SENTENCE_WORDS = 6
const PHRASE_WORDS = 6

const round1 = (n) => Math.round(n * 10) / 10
const clamp10 = (n) => Math.max(0, Math.min(10, n))

const words = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean)
const stripMarker = (line) => line.replace(/^\s*(?:\d+[.)]|[-*•])\s+/, '')

// Sentences, one per list item or per full stop. A line with no full stop is a
// sentence of its own, which is how bullet lists count.
function sentencesOf(text) {
  const out = []
  for (const line of text.split(/\r?\n/)) {
    for (const part of stripMarker(line).split(/(?<=[.!?;])\s+/)) {
      const s = part.trim()
      if (s) out.push(s)
    }
  }
  return out
}

// A short standalone line with no final full stop is a heading. List items are
// not: "1. Hero: ..." and "- No photographs" begin with a marker.
function headingsOf(text) {
  const out = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.length >= HEADING_MAX || /[.!?]$/.test(line)) continue
    if (/^(?:\d+[.)]|[-*•])\s/.test(line)) continue
    if (!/\p{L}/u.test(line)) continue
    out.push(line.replace(/:$/, '').trim().toLowerCase())
  }
  return out
}

function groupBy(items, keyOf) {
  const map = new Map()
  for (const item of items) {
    const key = keyOf(item)
    if (key === null) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  return map
}

function scorePrompt(p, phraseCounts) {
  const findings = []
  let score = 10

  for (const t of TEMPLATE_PHRASES) {
    if (!p.text.toLowerCase().includes(t.phrase.toLowerCase())) continue
    if (t.minPrompts && phraseCounts.get(t.phrase) < t.minPrompts) continue
    score -= 1
    findings.push({ penalty: 1, what: `template phrase "${t.phrase}"`, why: t.reason })
  }

  const sentences = sentencesOf(p.text)
  const prohibitions = sentences.filter((s) => NEGATORS.test(s)).length
  const share = sentences.length ? prohibitions / sentences.length : 0
  if (share > 0.2) {
    const penalty = share > 0.3 ? 2 : 1
    score -= penalty
    findings.push({
      penalty,
      what: `${Math.round(share * 100)}% of sentences are prohibitions (${prohibitions} of ${sentences.length})`,
      why: 'a prompt that spends its lines on what not to do reads as a nervous machine',
    })
  }

  const samples = (p.text.match(SAMPLE_COPY) || []).length
  if (samples) {
    score -= 0.5 * samples
    findings.push({
      penalty: 0.5 * samples,
      what: `${samples} quoted sample ${samples === 1 ? 'line' : 'lines'} ("for example \\"...\\"")`,
      why: 'the model should write the copy, not be handed it',
    })
  }

  return { id: p.id, score: round1(clamp10(score)), findings }
}

// Set-level checks. Each returns { penalty, what, why } objects.
function checkHeadings(prompts) {
  const groups = groupBy(prompts, (p) => {
    const h = headingsOf(p.text)
    return h.length >= 2 ? h.join(' | ') : null
  })
  const out = []
  for (const [key, members] of groups) {
    if (members.length < SHARED_HEADINGS) continue
    out.push({
      penalty: 3,
      what: `${members.length} prompts share the heading list "${key.replace(/ \| /g, ' / ')}" (${members.map((m) => m.id).join(', ')})`,
      why: 'every prompt has the same skeleton, so the set reads as one template',
    })
    break // one skeleton is one finding; do not charge each variant
  }
  return out
}

function checkOpenings(prompts) {
  const groups = groupBy(prompts, (p) => {
    const w = words(p.text).slice(0, 3)
    return w.length === 3 ? w.join(' ') : null
  })
  const out = []
  for (const [key, members] of groups) {
    if (members.length < SHARED_OPENING) continue
    out.push({
      penalty: 2,
      what: `${members.length} prompts open "${key} ..." (${members.map((m) => m.id).join(', ')})`,
      why: 'the same opening words stamp the set',
    })
    break
  }
  return out
}

function checkSentences(prompts) {
  const seen = new Map() // normalised sentence -> { text, ids:Set }
  for (const p of prompts) {
    for (const s of sentencesOf(p.text)) {
      const w = words(s)
      if (w.length < SENTENCE_WORDS) continue
      const key = w.join(' ')
      if (!seen.has(key)) seen.set(key, { text: s, ids: new Set() })
      seen.get(key).ids.add(p.id)
    }
  }
  const repeated = [...seen.values()]
    .filter((e) => e.ids.size >= REPEATED_SENTENCE)
    .sort((a, b) => b.ids.size - a.ids.size)
  const out = repeated.map((e) => ({
    penalty: 1,
    what: `"${e.text}" appears in ${e.ids.size} prompts (${[...e.ids].join(', ')})`,
    why: 'a sentence pasted word for word is boilerplate',
  }))
  return capped(out, 4)
}

function checkPhrases(prompts) {
  const counts = new Map() // 6-gram -> Set of ids
  const streams = [] // per prompt, per sentence: token arrays
  for (const p of prompts) {
    for (const s of sentencesOf(p.text)) {
      const w = words(s)
      streams.push({ id: p.id, w })
      for (let i = 0; i + PHRASE_WORDS <= w.length; i++) {
        const key = w.slice(i, i + PHRASE_WORDS).join(' ')
        if (!counts.has(key)) counts.set(key, new Set())
        counts.get(key).add(p.id)
      }
    }
  }
  const hot = (key) => counts.get(key).size >= REPEATED_PHRASE

  // Overlapping hot 6-grams are one repeated passage, not several: merge each
  // run into a single finding and key it by its first 6-gram.
  const runs = new Map()
  for (const { w } of streams) {
    let i = 0
    while (i + PHRASE_WORDS <= w.length) {
      if (!hot(w.slice(i, i + PHRASE_WORDS).join(' '))) { i++; continue }
      let end = i + PHRASE_WORDS
      while (end + 1 <= w.length && hot(w.slice(end + 1 - PHRASE_WORDS, end + 1).join(' '))) end++
      const first = w.slice(i, i + PHRASE_WORDS).join(' ')
      if (!runs.has(first)) {
        runs.set(first, { text: w.slice(i, end).join(' '), n: counts.get(first).size })
      }
      i = end
    }
  }
  const all = [...runs.values()]
  const out = all
    .filter((r) => !all.some((o) => o !== r && o.text.length > r.text.length && o.text.includes(r.text)))
    .sort((a, b) => b.n - a.n)
    .map((r) => ({
      penalty: 0.5,
      what: `"${r.text}" appears in ${r.n} prompts`,
      why: 'a long phrase repeated across the set is a pasted slot',
    }))
  return capped(out, 2)
}

// Cap a list of equal penalties at `max` points in total, but keep listing
// every finding so the reader can see what was repeated.
function capped(findings, max) {
  let used = 0
  return findings.map((f) => {
    const penalty = Math.min(f.penalty, Math.max(0, max - used))
    used += penalty
    return { ...f, penalty }
  })
}

/**
 * @param {{id:string, text:string}[]} prompts
 * @returns {{ set:{score:number, findings:object[]}, prompts:{id:string, score:number, findings:object[]}[] }}
 */
export function scorePrompts(prompts) {
  const phraseCounts = new Map()
  for (const t of TEMPLATE_PHRASES) {
    const n = prompts.filter((p) => p.text.toLowerCase().includes(t.phrase.toLowerCase())).length
    phraseCounts.set(t.phrase, n)
  }
  const scored = prompts.map((p) => scorePrompt(p, phraseCounts))

  const setFindings = [
    ...checkHeadings(prompts),
    ...checkOpenings(prompts),
    ...checkSentences(prompts),
    ...checkPhrases(prompts),
  ]
  const setPenalty = setFindings.reduce((sum, f) => sum + f.penalty, 0)
  const meanPromptPenalty = scored.length
    ? scored.reduce((sum, s) => sum + (10 - s.score), 0) / scored.length
    : 0

  return {
    set: { score: round1(clamp10(10 - setPenalty - meanPromptPenalty)), findings: setFindings },
    prompts: scored,
  }
}

export const passes = (result) =>
  result.set.score >= SET_PASS && result.prompts.every((p) => p.score >= PROMPT_PASS)

// ── CLI ────────────────────────────────────────────────────────────────────

async function loadPrompts({ ref, all }) {
  let file = path.join(ROOT, LIBRARY)
  let tmp = null
  try {
    if (ref) {
      const source = execFileSync('git', ['show', `${ref}:${LIBRARY}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-voice-'))
      file = path.join(tmp, 'communityPrompts.mjs')
      fs.writeFileSync(file, source)
    }
    const { COMMUNITY_PROMPTS } = await import(pathToFileURL(file).href)
    return COMMUNITY_PROMPTS
      .filter((p) => all || /^c-([1-9]|10)$/.test(p.id))
      .map((p) => ({ id: p.id, text: p.text }))
  } finally {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true })
  }
}

const fmt = (n) => n.toFixed(1)
const mark = (ok) => (ok ? 'pass' : 'FAIL')

function printSetFindings(set) {
  for (const f of set.findings) {
    if (f.penalty) console.log(`          -${f.penalty}  ${f.what}: ${f.why}`)
    else console.log(`           0  ${f.what} (over the cap)`)
  }
}

function printReport(label, result) {
  console.log(`\n${label}`)
  for (const p of result.prompts) {
    console.log(`  ${p.id.padEnd(5)} ${fmt(p.score).padStart(4)}  ${mark(p.score >= PROMPT_PASS)}`)
    for (const f of p.findings) console.log(`          -${f.penalty}  ${f.what}: ${f.why}`)
  }
  console.log(`  SET   ${fmt(result.set.score).padStart(4)}  ${mark(result.set.score >= SET_PASS)}`)
  printSetFindings(result.set)
}

function printCompare(refA, a, refB, b) {
  const ids = a.prompts.map((p) => p.id)
  console.log(`\n${'prompt'.padEnd(8)}${refA.slice(0, 14).padStart(16)}${refB.slice(0, 14).padStart(16)}`)
  for (const id of ids) {
    const x = a.prompts.find((p) => p.id === id)
    const y = b.prompts.find((p) => p.id === id)
    const cell = (p) => (p ? `${fmt(p.score)} ${mark(p.score >= PROMPT_PASS)}` : '-')
    console.log(`${id.padEnd(8)}${cell(x).padStart(16)}${cell(y).padStart(16)}`)
  }
  const cell = (r) => `${fmt(r.set.score)} ${mark(r.set.score >= SET_PASS)}`
  console.log(`${'SET'.padEnd(8)}${cell(a).padStart(16)}${cell(b).padStart(16)}`)
  console.log(`\nSet findings: ${refA}`)
  printSetFindings(a.set)
  console.log(`\nSet findings: ${refB}`)
  printSetFindings(b.set)
}

async function main(argv) {
  const args = argv.slice()
  const flag = (name) => {
    const i = args.indexOf(name)
    if (i === -1) return false
    args.splice(i, 1)
    return true
  }
  const value = (name, count = 1) => {
    const i = args.indexOf(name)
    if (i === -1) return null
    const vals = args.slice(i + 1, i + 1 + count)
    if (vals.length < count) throw new Error(`${name} needs ${count} value(s)`)
    args.splice(i, 1 + count)
    return vals
  }

  const json = flag('--json')
  const all = flag('--all')
  const compare = value('--compare', 2)
  const ref = value('--ref')?.[0] ?? null

  if (compare) {
    const [refA, refB] = compare
    const a = scorePrompts(await loadPrompts({ ref: refA, all }))
    const b = scorePrompts(await loadPrompts({ ref: refB, all }))
    if (json) console.log(JSON.stringify({ [refA]: a, [refB]: b }, null, 2))
    else printCompare(refA, a, refB, b)
    return passes(a) && passes(b) ? 0 : 1
  }

  const result = scorePrompts(await loadPrompts({ ref, all }))
  if (json) console.log(JSON.stringify(result, null, 2))
  else printReport(ref ? `Prompt voice at ${ref}` : 'Prompt voice, current file', result)
  return passes(result) ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(
    (code) => { process.exitCode = code },
    (err) => { console.error(err.message); process.exitCode = 2 },
  )
}
