// The semantic colour ramps a project can hold, and the one resolver that turns
// a saved selection into its ten shades (steps 50–900).
//
// A project stores its semantic colours as SELECTIONS, not hexes:
//   design.states = { success, warning, error, info, infoHue }
// where each role is a preset index or `{ custom: hue }`, and `infoHue` is
// 'blue' (the default) or 'purple'. Anything that exports those colours has to
// expand them exactly as the Semantic Colour tool does, so the data and the
// resolver live here, free of React and the DOM, where an exporter and a unit
// test can both import them.
//
// The four roles are Success, Warning, Error and Information. A `pending` key
// on a project saved by an older version is ignored.
//
// tests/unit/semantic-presets.test.js checks every ramp below against the
// Semantic Colour tool's own table, so the two cannot drift apart.

import { semanticRamp } from '../utils/colors.js'

export const SEMANTIC_ROLES = Object.freeze(['success', 'warning', 'error', 'info'])

export const SEMANTIC_STEPS = Object.freeze(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'])

export const SEMANTIC_LABELS = Object.freeze({
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Information',
})

export const STATE_PRESETS = {
  success: [
    { name: 'Emerald', shades: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'] },
    { name: 'Green', shades: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'] },
    { name: 'Teal', shades: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'] },
    { name: 'Apple', shades: ['#f0fdf4', '#dcfce7', '#b6f5cc', '#7aedaa', '#4ade80', '#34C759', '#2aa648', '#1f8a3a', '#186d2e', '#125524'] },
    { name: 'Material', shades: ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4CAF50', '#43a047', '#388e3c', '#2e7d32', '#1b5e20'] },
    { name: 'Tailwind', shades: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'] },
  ],
  warning: [
    { name: 'Amber', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
    { name: 'Yellow', shades: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'] },
    { name: 'Orange', shades: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'] },
    { name: 'Apple', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#FF9500', '#e08200', '#b86a00', '#925300', '#6e3e00'] },
    { name: 'Material', shades: ['#fff8e1', '#ffecb3', '#ffe082', '#ffd54f', '#ffca28', '#FF9800', '#fb8c00', '#f57c00', '#ef6c00', '#e65100'] },
    { name: 'Tailwind', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
  ],
  error: [
    { name: 'Red', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
    { name: 'Rose', shades: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'] },
    { name: 'Pink', shades: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'] },
    { name: 'Apple', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#FF3B30', '#e0342a', '#b82a22', '#91211b', '#6e1914'] },
    { name: 'Material', shades: ['#ffebee', '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#F44336', '#e53935', '#d32f2f', '#c62828', '#b71c1c'] },
    { name: 'Tailwind', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
  ],
  info: [
    { name: 'Blue', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] },
    { name: 'Sky', shades: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'] },
    { name: 'Indigo', shades: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'] },
    { name: 'Apple', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#007AFF', '#0062d6', '#004db3', '#003d8f', '#002e6b'] },
    { name: 'Material', shades: ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196F3', '#1e88e5', '#1565c0', '#0d47a1', '#0a3880'] },
    { name: 'Tailwind', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] },
  ],
}

// Information's alternative hue family: purple instead of blue.
export const INFO_PURPLE = [
  { name: 'Violet', shades: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'] },
  { name: 'Purple', shades: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'] },
  { name: 'Fuchsia', shades: ['#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75'] },
  { name: 'Apple', shades: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#AF52DE', '#9546bd', '#7a399b', '#642f7f', '#522768'] },
  { name: 'Material', shades: ['#ede7f6', '#d1c4e9', '#b39ddb', '#9575cd', '#7e57c2', '#673AB7', '#5e35b1', '#512da8', '#4527a0', '#311b92'] },
  { name: 'Tailwind', shades: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'] },
]

// The default selection for each role (the "Balanced" bundle). Its 500 shades
// are the reference each role's custom hue is built around.
export const DEFAULT_SELECTION = Object.freeze({ success: 1, warning: 0, error: 0, info: 0 })

const REF_HEX = Object.fromEntries(
  SEMANTIC_ROLES.map((role) => [role, STATE_PRESETS[role][DEFAULT_SELECTION[role]].shades[5]]),
)

const presetsFor = (role, infoHue) => (role === 'info' && infoHue === 'purple' ? INFO_PURPLE : STATE_PRESETS[role])

/**
 * The ten shades for one role. `sel` is a preset index or `{ custom: hue }`;
 * an out-of-range or malformed selection falls back to the first preset.
 */
export function resolveStateShades(role, sel, infoHue = 'blue') {
  if (sel && typeof sel === 'object' && Number.isFinite(sel.custom)) {
    return semanticRamp(sel.custom, REF_HEX[role])
  }
  const list = presetsFor(role, infoHue)
  const idx = Number.isInteger(sel) ? sel : 0
  return (list[idx] || list[0]).shades
}

/**
 * A saved `design.states`, normalised: the four roles (defaults filled in, any
 * other key dropped) and the Information hue family.
 */
export function readSemanticStates(saved) {
  const roles = { ...DEFAULT_SELECTION }
  for (const role of SEMANTIC_ROLES) {
    if (saved && saved[role] !== undefined && saved[role] !== null) roles[role] = saved[role]
  }
  return { roles, infoHue: saved?.infoHue === 'purple' ? 'purple' : 'blue' }
}

/** Every role expanded to its shades, upper-case hex: `{ success: [...10], … }`. */
export function semanticShades(saved) {
  const { roles, infoHue } = readSemanticStates(saved)
  return Object.fromEntries(SEMANTIC_ROLES.map((role) => [
    role,
    resolveStateShades(role, roles[role], infoHue).map((hex) => hex.toUpperCase()),
  ]))
}
