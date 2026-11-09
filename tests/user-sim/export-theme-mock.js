// A stand-in for POST /api/ai?export=document, the route that builds the themed exports, for specs that drive the Export dialog.
// What the dialog does with an answer is what these specs check; the documents themselves are built (and unit-tested) server side.
// Every call is recorded, so a spec can read back what the dialog asked for.
import JSZip from 'jszip'

export const EXPORT_ROUTE = '**/api/ai?export=document'

/** A real, tiny zip (one text file), as bytes the dialog can save. */
export async function tinyZip(label = 'themed export') {
  const zip = new JSZip()
  zip.file('README.txt', label)
  return Buffer.from(await zip.generateAsync({ type: 'uint8array' }))
}

/** A print document of the shape the route writes: the CSP meta first in the head, no script, no inline handler. */
export const cleanHtml = (title = 'Print document') => '<!doctype html><html><head>'
  + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; font-src data:">'
  + `<meta charset="utf-8"><title>${title}</title><style>body{font:16px system-ui}</style></head>`
  + `<body><h1 id="printed-doc">${title}</h1><p>Sample page</p></body></html>`

/**
 * Answer the route and record each request. `answer(body, calls)` returns one of
 *   { zip: Buffer, name }                          200, application/zip, Content-Disposition with that file name
 *   { html, json? }                                200, JSON { ok, theme, row, format, html } for the request; `json` overrides fields
 *   { status, body?, headers? }                    anything else, as given (body is JSON-encoded unless it is a string)
 * Without `answer`, a zip row gets a zip and a print row gets clean html.
 */
export async function mockThemeApi(page, answer) {
  const calls = []
  await page.route(EXPORT_ROUTE, async (route) => {
    const req = route.request()
    const body = req.postDataJSON()
    calls.push({ method: req.method(), auth: req.headers().authorization, body })
    const out = answer ? await answer(body, calls) : (body.format === 'zip' || body.format === 'html'
      ? { zip: await tinyZip(), name: `p-${body.theme}.zip` }
      : { html: cleanHtml() })
    if (out.zip) {
      return route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${out.name}"` },
        body: out.zip,
      })
    }
    if (out.html !== undefined) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, theme: body.theme, row: body.row, format: body.format, html: out.html, ...out.json }),
      })
    }
    return route.fulfill({
      status: out.status,
      headers: out.headers,
      contentType: 'application/json',
      body: typeof out.body === 'string' ? out.body : JSON.stringify(out.body ?? {}),
    })
  })
  return calls
}
