// Client side of the Gemini region gate (api/_lib/geoBlock.js). The server owns
// the decision; these helpers only read its answer.
export const REGION_ENDPOINT = '/api/ai?region=1'
export const REGION_REFUSAL_CODE = 'region-unavailable'

// Only an explicit server `true` blocks. A 404 under vite, a 500, HTML or a network failure all mean open.
export function regionFromReply(ok, body) {
  return ok && body?.blocked === true ? 'blocked' : 'open'
}

export function isRegionRefusal(status, body) {
  return status === 451 || body?.code === REGION_REFUSAL_CODE
}
