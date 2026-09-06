// The ONE description of which Create tools can complete an ACTIVATION by
// exporting, and under what name that activation is counted.
//
// WHY A TABLE AND NOT SIXTEEN TAGGED CALL SITES. P-001 defines activation as
// "saving or exporting a palette, gradient or type scale" — the first moment
// the product was actually useful to someone. Saving was already instrumented
// in ProjectContext and the style-guide export in ExportPanel. Exporting from
// the three colour/type workbenches was the missing half, and the reason it
// stayed missing is that each of those tools has SEVERAL copy affordances:
// PaletteBuilder has eight, TypeScale three, GradientGenerator one. Tagging
// each was rejected on the pipeline item itself — it is the exact pattern
// trackUpgradeGate exists to avoid, and it would under-report forever the first
// time a copy button was added without a tag.
//
// So the tools do not decide. Each declares ONE export hook — `onExport`, used
// at exactly one place in its source, for the payload that IS the artefact —
// and CreateTool resolves the name from this table. The decision lives at the
// dispatcher, where the single `onCopy` already lives.
//
// WHAT COUNTS AS AN EXPORT, AND WHAT DELIBERATELY DOES NOT. The hook wraps the
// clipboard write for the payload that represents the WHOLE artefact in a form
// another tool can consume:
//   palette     — the CSS custom properties for every colour and its role
//   gradient    — the gradient's export code
//   type-scale  — the full scale as CSS, SCSS or a Tailwind config
// Copying ONE hex, ONE step's font-size, a share link or a Google Fonts import
// URL stays on plain `onCopy` and is NOT an activation. Those are lookups, not
// completed work, and counting them would inflate the one number meant to say
// whether any of this works — the inward-pointing version of selling a file the
// product cannot make.
//
// The event fires only after the clipboard write RESOLVES TRUE. A copy that the
// browser refused is not an export, and an activation counted on the click
// would make the dashboard report work that never left the page.
//
// This lives outside CreateTool.jsx for the same mechanical reason as
// exportFormats.js: a constant exported alongside a component trips
// react-refresh/only-export-components. tests/unit/activation-exports.test.js
// fails the build if a tool calls `onExport` without a row here, or if a row
// here names a route that is not a live tool.

// Route (already normalised: lowercase, no query/hash, no trailing slash) →
// the activation id passed to trackActivation(id, 'export').
export const ACTIVATION_EXPORTS = Object.freeze({
  '/create/palette': 'palette',
  '/create/gradient': 'gradient',
  '/create/type-scale': 'type-scale',
})

// The component file that owns each route's export hook. Only used by the
// coherence test, which reads those files and checks they call `onExport`.
export const ACTIVATION_EXPORT_SOURCES = Object.freeze({
  '/create/palette': 'src/pages/PaletteBuilder.jsx',
  '/create/gradient': 'src/pages/GradientGenerator.jsx',
  '/create/type-scale': 'src/pages/TypeScale.jsx',
})
