// The routing choices the feedback dialog offers, per type. FeedbackModal draws
// its dropdowns from this list, and api/support.js keeps a restated copy of it
// (ROUTING_ALLOWED) that it checks incoming values against. The two are held
// together by tests/unit/support-validation.test.js, so a new option here fails
// that test until the server copy follows.
export const FEEDBACK_ROUTING = Object.freeze({
  feedback: {
    category: ['General', 'UI / Design', 'Performance', 'Pricing', 'Something else'],
  },
  bug: {
    category: ['Colour Studio', 'Typography / Fonts', 'Icons', 'File Converter', 'AI Tools', 'Account / Login', 'Billing', 'Other'],
    severity: ['Minor — cosmetic', 'Major — feature broken', "Blocking — can't use the app"],
  },
  feature: {
    category: ['A brand-new tool', 'Improve an existing tool', 'Export / integration', 'Other'],
  },
  help: {
    category: ['Getting started', 'Using a specific tool', 'Account', 'Billing', 'Other'],
  },
})
