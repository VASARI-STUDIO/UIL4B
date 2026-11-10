// Which locale keys the feedback page reads for its heading, intro line and
// message placeholder. A Help request reads as a call for support; every other
// type reads as feedback. Pure, so the choice can be tested without a render.

const FEEDBACK_KEYS = Object.freeze({
  title: 'feedback.title',
  subtitle: 'feedback.subtitle',
  placeholder: 'feedback.messagePlaceholder',
})

const HELP_KEYS = Object.freeze({
  title: 'feedback.helpTitle',
  subtitle: 'feedback.helpSubtitle',
  placeholder: 'feedback.helpPlaceholder',
})

/** The locale keys for the page copy of one request type. */
export function feedbackCopyKeys(type) {
  return type === 'help' ? HELP_KEYS : FEEDBACK_KEYS
}
