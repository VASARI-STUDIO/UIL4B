// Turn report/findings.jsonl into a readable feedback report, grouped by
// severity then persona. Run standalone (`npm run test:users:report`) or it
// runs automatically as the suite's global teardown.
import fs from 'node:fs'
import { FINDINGS_FILE } from './helpers.js'

const ORDER = { critical: 0, error: 1, improve: 2, info: 3 }

export function summarize() {
  if (!fs.existsSync(FINDINGS_FILE)) {
    console.log('\n── User-sim feedback loop ── no findings recorded. Clean run. ──')
    return
  }
  const findings = fs.readFileSync(FINDINGS_FILE, 'utf8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l))

  // The same console error on the same page often fires once per persona
  // that visits it — dedupe so the report reads as a to-do list, not a log.
  const seen = new Map()
  for (const f of findings) {
    const key = `${f.severity}|${f.where}|${f.message}`
    if (!seen.has(key)) seen.set(key, { ...f, count: 0, personas: new Set() })
    const e = seen.get(key)
    e.count += 1
    e.personas.add(f.persona)
  }
  const rows = [...seen.values()].sort(
    (a, b) => (ORDER[a.severity] ?? 9) - (ORDER[b.severity] ?? 9) || a.where.localeCompare(b.where),
  )

  console.log(`\n── User-sim feedback loop ── ${rows.length} distinct finding(s) ──`)
  for (const r of rows) {
    console.log(
      `  [${r.severity.toUpperCase()}] ${r.where}\n` +
      `    ${r.message}\n` +
      `    seen ${r.count}× by: ${[...r.personas].join(', ')}`,
    )
  }
  console.log('')
}

if (process.argv[1] && process.argv[1].endsWith('summarize.js')) summarize()
