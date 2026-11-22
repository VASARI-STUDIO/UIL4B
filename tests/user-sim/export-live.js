// Serves the Export popup's two server routes under `vite preview`, which has no /api: the live page preview
// (POST /api/ai?export=live-preview) and the document (POST /api/ai?export=document) are answered by the REAL handlers
// (api/_lib/exportLivePreview.js, api/_lib/exportDocument.js), with the account's user document standing in for Firestore and the
// token check stubbed. What each request carried and what came back is logged, so a spec can read the project's name off the wire.
//
// Every token stands for one Pro account ('test-pro'): these specs are about what the popup draws and names, not about plans (the
// plan rules are tests/user-sim/434-export-free-bypass.spec.js and tests/unit/export-preview.test.js).
import { serveExportLivePreview } from '../../api/_lib/exportLivePreview.js'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'

const ACCOUNT = { subscription: { status: 'active', interval: 'monthly', currentPeriodEnd: Date.now() + 10 * 86_400_000 } }
const deps = {
  verifyIdToken: async () => ({ uid: 'test-pro', email_verified: true }),
  readUser: async () => ACCOUNT,
  consume: async () => ({ allowed: true, remaining: 100, retryAfter: 0 }),
}
const isRoute = (kind) => (url) => url.pathname === '/api/ai' && url.searchParams.get('export') === kind

async function answer(route, serve) {
  const req = route.request()
  const body = req.method() === 'POST' ? req.postDataJSON() : null
  const reply = { status: 200, headers: {}, body: null, bytes: null }
  const res = {
    setHeader: (k, v) => { reply.headers[k] = v },
    status: (code) => { reply.status = code; return res },
    json: (b) => { reply.body = b; return res },
    send: (b) => { reply.bytes = b; return res },
  }
  await serve({ headers: req.headers(), body }, res, deps)
  await route.fulfill({
    status: reply.status,
    headers: reply.headers,
    contentType: reply.bytes ? reply.headers['Content-Type'] : 'application/json',
    body: reply.bytes || JSON.stringify(reply.body ?? {}),
  })
  return { body, status: reply.status, html: reply.body?.html || '' }
}

/** Answer both routes with the real server code. Returns { previews, documents }, each a list of { body, status, html } as they happen. */
export async function serveExportRoutes(page) {
  const previews = []
  const documents = []
  await page.route(isRoute('live-preview'), async (route) => { previews.push(await answer(route, serveExportLivePreview)) })
  await page.route(isRoute('document'), async (route) => { documents.push(await answer(route, serveExportDocument)) })
  return { previews, documents }
}
