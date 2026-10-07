// The alt-text request budget and the rule for what counts as a usable answer.
//
// Gemini 2.5 models think before they answer, and the thinking tokens are
// charged against the same `maxOutputTokens` ceiling as the visible reply
// (`usageMetadata.thoughtsTokenCount`). With a small ceiling, thinking spends
// most of it and the reply stops mid-sentence with finishReason MAX_TOKENS.
// So the budget is set in two parts:
//   1. thinking is capped at the lowest value each model family accepts, since
//      describing one image needs no deliberation;
//   2. the output ceiling is a runaway guard, not a length control. Length is
//      set by the tone instruction in the prompt; only tokens actually produced
//      are billed, so a generous ceiling costs nothing on a normal reply.
//
// Pure functions over plain data, so both halves are unit-testable without a
// provider call. Files under `api/_lib/` are imports, not deployed routes.
import { classifyGeminiFinish } from './geminiFinish.js'

// A 300-character answer is roughly 75-100 tokens. 2048 leaves ample room for
// the reply plus the minimum thinking a model that cannot switch it off spends.
export const ALT_TEXT_MAX_OUTPUT_TOKENS = 2048

// A Gemini text model id: optional version, the family, then only release
// suffixes (preview, latest, exp, date or build numbers). Image, speech, audio,
// live and embedding variants carry other suffixes and do not match, because
// generateContent rejects a thinkingConfig for a model that cannot think.
const GEMINI_TEXT_MODEL = /^gemini-(?:(\d+(?:\.\d+)?)-)?(flash-lite|flash|pro)(?:-(?:preview|latest|exp|experimental|\d+))*$/

// For an alias such as gemini-flash-latest, which can resolve to either
// generation: a budget every thinking model in 2.5 accepts (Flash-Lite's
// floor is 512), and which Gemini 3 still honours in place of a level.
export const ALIAS_THINKING_BUDGET = 512

/**
 * The thinkingConfig to send for a Gemini model, or null to send none.
 *
 * - 2.5 Flash and Flash-Lite: budget 0, which switches thinking off.
 * - 2.5 Pro cannot switch thinking off; 128 is its minimum.
 * - Gemini 3 and later: thinkingLevel LOW, the lowest level every model in
 *   the family supports (MINIMAL is not available on all of them). A
 *   thinkingLevel sent to an earlier model is an error.
 * - A version-less alias: ALIAS_THINKING_BUDGET.
 * - Older models, non-text variants and ids that are not Gemini: nothing, and
 *   the output ceiling above is the protection.
 */
export function thinkingConfigFor(model) {
  const m = String(model || '').toLowerCase().replace(/^models\//, '')
  const match = GEMINI_TEXT_MODEL.exec(m)
  if (!match) return null
  const [, version, family] = match
  if (version === undefined) return { thinkingBudget: ALIAS_THINKING_BUDGET }
  const v = Number(version)
  if (v >= 3) return { thinkingLevel: 'LOW' }
  if (v === 2.5) return { thinkingBudget: family === 'pro' ? 128 : 0 }
  return null
}

// A reply cut off at the length ceiling is refunded, but only this many times
// per user per day; after that the attempt counts. The refund count lives on
// the same daily-usage document as the metered count.
export const ALT_TEXT_CUTOFF_REFUND_CAP = { field: 'altTextCutoffRefunds', limit: 3 }

const CUTOFF = 'The AI stopped before finishing its description, so it was not used.'
export const ALT_TEXT_CUTOFF_ERRORS = {
  refunded: `${CUTOFF} Nothing came off your allowance — try again.`,
  limit: `${CUTOFF} You have reached the daily limit on free retries for unfinished replies, so this attempt counted toward your allowance.`,
  kept: `${CUTOFF} This attempt may have counted toward your allowance — try again.`,
}

/**
 * The error and quotaSpent flag for a cut-off reply, from the result of the
 * capped refund ('refunded' | 'limit' | 'kept'). The allowance is said to be
 * untouched only when the refund was actually granted.
 */
export function altTextCutoffReply(refund) {
  if (refund === 'refunded') return { error: ALT_TEXT_CUTOFF_ERRORS.refunded, quotaSpent: false }
  if (refund === 'limit') return { error: ALT_TEXT_CUTOFF_ERRORS.limit, quotaSpent: true }
  return { error: ALT_TEXT_CUTOFF_ERRORS.kept, quotaSpent: true }
}

export function altTextGenerationConfig(model, temperature) {
  const config = { temperature, maxOutputTokens: ALT_TEXT_MAX_OUTPUT_TOKENS }
  const thinkingConfig = thinkingConfigFor(model)
  if (thinkingConfig) config.thinkingConfig = thinkingConfig
  return config
}

// Markdown the model may return despite the plain-text contract.
export function stripAltTextMarkdown(text) {
  return String(text || '')
    .replace(/^#+\s*/gm, '')           // heading markers
    .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
    .replace(/\*(.+?)\*/g, '$1')       // italic
    .replace(/__(.+?)__/g, '$1')       // bold underscores
    .replace(/_(.+?)_/g, '$1')         // italic underscores
    .replace(/`(.+?)`/g, '$1')         // inline code
    .replace(/^[-*]\s+/gm, '')         // list markers
    .replace(/^\d+\.\s+/gm, '')        // numbered list markers
    .trim()
}

/**
 * Turn a Gemini response body into either a finished alt text or an error.
 *
 * A reply that stopped at the token ceiling is an error, never a result: part
 * of a sentence presented as alt text is worse than no alt text. That holds
 * whether or not any text arrived, since thinking can use the whole ceiling.
 * Such an outcome carries `cutOff: true`; the route settles its refund under
 * ALT_TEXT_CUTOFF_REFUND_CAP and takes the message from altTextCutoffReply.
 * Every other error is answered through `res`, which refunds the metered unit.
 *
 * @returns {{ok: true, altText: string, finishReason: string}
 *         | {ok: false, status: number, error: string, finishReason: string, cutOff?: true}}
 */
export function altTextOutcome(data) {
  const verdict = classifyGeminiFinish(data)
  const finishReason = verdict.reason

  if (verdict.status === 'blocked') {
    return {
      ok: false,
      status: 422,
      error: 'The AI declined to describe this image — its safety filters flagged it. Nothing is wrong with your file; try a different image, or write this one by hand.',
      finishReason,
    }
  }
  if (verdict.status === 'recitation') {
    return {
      ok: false,
      status: 422,
      error: 'The AI stopped because its answer was reproducing copyrighted text it recognised. Try again, or describe this image by hand.',
      finishReason,
    }
  }
  if (verdict.status === 'truncated' || finishReason === 'MAX_TOKENS') {
    return {
      ok: false,
      status: 502,
      error: ALT_TEXT_CUTOFF_ERRORS.kept,
      finishReason: 'MAX_TOKENS',
      cutOff: true,
    }
  }

  const altText = verdict.status === 'ok' ? stripAltTextMarkdown(verdict.text) : ''
  if (!altText) {
    return { ok: false, status: 502, error: 'Empty response from AI provider', finishReason }
  }
  return { ok: true, altText, finishReason }
}
