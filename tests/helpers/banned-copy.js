// Phrases that argue for a document's own honesty instead of stating its facts.
// One list for every export output, so a new phrase is one line and reaches them all.
export const BANNED = [
  /rather than/i, /not estimated/i, /measured, not/i, /\bproves?\b/i, /Nothing here/i, /Nothing in it/i, /eyeball/i, /illustrative/i,
  /placeholder/i, /predictably/i, /actually holds/i, /actual job/i, /happens to be/i, /Set from the system it describes/i,
  /How this book was made/i, /first (8|eight) colours/i, /checked elsewhere/i, /measured against paper and ink there/i,
  /\bhonest/i, /real (values?|system|type)\b/i, /reproducible/i, /ready to paste/i, /nobody (has )?(made|approved)/i,
  /not invented|has not invented|invents a lockup/i, /harder to trust/i, /already checked/i, /rebuilt exactly/i,
]

// What the UI kit used to state about a project that was never the project's: slogans under the
// colours, usage shares nobody set, and stock website copy.
export const KIT_INVENTED = [
  /The spark/i, /The anchor/i, /The softer side/i, /The breathing room/i, /The definition\b/i,
  /A place for your next idea/i, /Built on good foundations/i, /From selections to a system/i,
  /Keep the important things clear/i, /Suggested colour proportions/i,
  /class="proportions?\b/i, /\b(40|25|20|10|5)%/,
]

/** The text a reader sees: styles, scripts and tags (so attributes such as placeholder="") are gone. */
export const visibleText = (html) => String(html)
  .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
