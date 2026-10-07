// Why Gemini stopped generating, read as a decision instead of ignored.
//
// The alt-text route used to pull `candidates[0].content.parts` straight out of
// the response and never look at `finishReason`. A response that hit the token
// ceiling still carries a perfectly well-formed `parts` array, so half a
// sentence was returned to the user as a finished answer — the "longer version
// gets cut off" defect — and a refusal (which carries no parts at all) fell
// through to a generic "Empty response from AI provider" that blamed the
// provider for a decision it had deliberately made.
//
// This lives in `_lib` as a pure function over the parsed body so the decision
// can be unit-tested without a provider call. That matters here specifically:
// the fault survived because nothing ever exercised it, and a test that only
// greps the route's source for a string proves the code contains that string,
// not that it behaves. Files under `api/_lib/` are imports, not deployed
// routes, so this does not consume one of the 12 Vercel function slots.

// Non-STOP reasons that mean "the model refused", across the spellings the
// v1beta API has shipped over time. Treating an unknown-but-refusing reason as
// an empty response is what produced the misleading provider-error message.
export const BLOCKED_FINISH_REASONS = new Set([
  'SAFETY',
  'PROHIBITED_CONTENT',
  'BLOCKLIST',
  'SPII',
  'IMAGE_SAFETY',
])

// What a person is told when the model used its whole output budget and wrote
// nothing. It is the one wording for every tool that surfaces this case, so the
// tools cannot drift apart on what "ran out of room" means.
export const MAX_TOKENS_EMPTY_MESSAGE =
  'The model ran out of room before it wrote anything. Try again, or shorten the request.'

/**
 * The error a provider call throws when it returns no text. `truncatedEmpty`
 * marks a reply that stopped at the output-token ceiling, so the route can say
 * so instead of reporting a generic empty response. `finishReason` keeps the
 * provider's own spelling ('MAX_TOKENS' from Gemini, 'length' from OpenRouter).
 */
export function emptyReplyError(provider, { truncatedEmpty = false, finishReason = '' } = {}) {
  const err = new Error(`${provider} returned empty response${truncatedEmpty ? ' (output token limit reached)' : ''}`)
  if (truncatedEmpty) {
    err.truncatedEmpty = true
    err.finishReason = finishReason
  }
  return err
}

/**
 * Classify a Gemini generateContent response body.
 *
 * @returns {{status: 'ok'|'truncated'|'truncated_empty'|'blocked'|'recitation'|'empty', reason: string, text: string}}
 *   'ok'              — complete answer, safe to present as finished.
 *   'truncated'       — real text, but the model was still writing. Never present as finished.
 *   'truncated_empty' — no text because the model used its whole output budget (MAX_TOKENS).
 *   'blocked'         — safety filters refused. Not a provider fault; the user needs to hear so.
 *   'recitation'      — stopped to avoid reproducing copyrighted text.
 *   'empty'           — no text and no reason that explains it.
 */
export function classifyGeminiFinish(data) {
  const candidate = data?.candidates?.[0]
  const finishReason = candidate?.finishReason || ''
  // A prompt rejected BEFORE generation starts produces no candidate at all —
  // its reason lives on promptFeedback instead. Checking only the candidate
  // makes a pre-emptive block indistinguishable from an empty response.
  const blockReason = data?.promptFeedback?.blockReason || ''

  // Array.isArray, not `|| []`: a non-array `parts` (a shape change, or a
  // proxied/garbled response) would make .map throw and surface to the user as
  // a generic "Request failed" 500 instead of the empty-response 502 that
  // actually describes what happened.
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : []
  const text = parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('')
    .trim()

  if (blockReason || BLOCKED_FINISH_REASONS.has(finishReason)) {
    return { status: 'blocked', reason: blockReason || finishReason, text: '' }
  }
  if (finishReason === 'RECITATION') {
    return { status: 'recitation', reason: 'RECITATION', text: '' }
  }
  if (!text && finishReason === 'MAX_TOKENS') {
    // Thinking can use the whole output budget, leaving no visible text.
    return { status: 'truncated_empty', reason: 'MAX_TOKENS', text: '' }
  }
  if (!text) {
    return { status: 'empty', reason: finishReason || 'unknown', text: '' }
  }
  // MAX_TOKENS with text is the dangerous case: it looks exactly like success.
  return {
    status: finishReason === 'MAX_TOKENS' ? 'truncated' : 'ok',
    reason: finishReason || 'STOP',
    text,
  }
}
