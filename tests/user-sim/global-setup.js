// Fresh per-run evidence files so the feedback report and the One Tap audit
// only ever reflect this run.
import fs from 'node:fs'
import { FINDINGS_FILE, REPORT_DIR } from './helpers.js'
import { ONE_TAP_AUDIT_FILE, STALE_ASSET_AUDIT_FILE } from './base.js'
import { ICONIFY_AUDIT_FILE } from './iconify-stub.js'

export default function globalSetup() {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  fs.rmSync(FINDINGS_FILE, { force: true })
  fs.rmSync(ONE_TAP_AUDIT_FILE, { force: true })
  fs.rmSync(STALE_ASSET_AUDIT_FILE, { force: true })
  fs.rmSync(ICONIFY_AUDIT_FILE, { force: true })
}
