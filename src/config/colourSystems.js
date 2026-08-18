// The colour systems the palette engine can run, and which of them are free.
//
// ⚠️ MIRROR ONLY — the same contract src/config/plans.js has with
// api/_lib/plans.js. `HARMONIES` and `FREE_SYSTEMS` in src/pages/PaletteBuilder
// are the behavioural source of truth; a free user selecting a paid system
// there collapses to 'auto', and that gate is what actually holds. These
// entries exist so a surface OUTSIDE the palette tools — the upgrade modal —
// can name and draw the systems without importing a 2,500-line page component.
//
// Drift here is a display bug (a wrong lock badge), never a gating bypass.
// PaletteBuilder should import from this module when its workstream next
// touches that file; it is not edited here because another agent owns it.
//
// Every id is one `generateHarmony` understands, except 'auto', which is the
// tonal HCT engine (autoTonalFromSeed) rather than a hue-rotation harmony.

export const COLOUR_SYSTEMS = Object.freeze([
  Object.freeze({ id: 'auto', label: 'Auto', free: true, tonal: true }),
  Object.freeze({ id: 'monochromatic', label: 'Monochromatic', free: true }),
  Object.freeze({ id: 'analogous', label: 'Analogous', free: false }),
  Object.freeze({ id: 'complement', label: 'Complementary', free: false }),
  Object.freeze({ id: 'triadic', label: 'Triadic', free: false }),
  Object.freeze({ id: 'split', label: 'Split', free: false }),
  Object.freeze({ id: 'tetradic', label: 'Tetradic', free: false }),
  Object.freeze({ id: 'custom', label: 'Custom', free: false }),
])

export const FREE_COLOUR_SYSTEMS = Object.freeze(
  COLOUR_SYSTEMS.filter((s) => s.free).map((s) => s.id),
)
