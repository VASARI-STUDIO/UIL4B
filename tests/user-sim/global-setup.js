// Fresh findings file per run so the feedback report only reflects this run.
import fs from 'node:fs'
import { FINDINGS_FILE, REPORT_DIR } from './helpers.js'

export default function globalSetup() {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  fs.rmSync(FINDINGS_FILE, { force: true })
}
