// The Semantic Colour page's two files, built from one list of roles so the copied
// tokens, the downloaded stylesheet and the downloaded swatch sheet can never
// disagree.
//
// A role is { id, label, intent, base, shades }: its id ('success'), its name on
// the page, one line of meaning, the hex of the chosen base step, and every step's
// hex in the order of `steps` ('50' to '900'). Plain functions with no React or
// DOM, so node tests read them.
import { textColorForBg } from './colors.js'

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

/**
 * The `:root` block: one `--color-<role>` alias per role (its base step), then
 * every step of every role as `--color-<role>-<step>`. No trailing newline.
 */
export function semanticTokensCSS(roles, steps) {
  const aliases = roles.map((r) => `  --color-${r.id}: ${r.base};`).join('\n')
  const ramps = roles
    .map((r) => steps.map((step, i) => `  --color-${r.id}-${step}: ${r.shades[i]};`).join('\n'))
    .join('\n')
  return `:root {\n${aliases}\n\n${ramps}\n}`
}

const SHEET_STYLE = `
:root { color-scheme: light dark; --bg: #f7f7f5; --ink: #1c1c1a; --dim: #5f5f59; --line: rgba(0,0,0,.12); --card: #fff; }
@media (prefers-color-scheme: dark) { :root { --bg: #111210; --ink: #ecece8; --dim: #a3a39b; --line: rgba(255,255,255,.14); --card: #1a1b19; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 32px 20px 56px; background: var(--bg); color: var(--ink); font: 14px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif; }
main { max-width: 1040px; margin: 0 auto; }
h1 { margin: 0 0 4px; font-size: 24px; line-height: 1.2; letter-spacing: -.02em; }
h2 { margin: 0; font-size: 17px; line-height: 1.3; }
.lead, .intent { margin: 0; color: var(--dim); }
section { margin-top: 40px; }
.alias { margin: 8px 0 16px; color: var(--dim); }
code { font: 12px/1.4 ui-monospace, 'SF Mono', Menlo, Consolas, monospace; }
ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(136px, 1fr)); gap: 8px; margin: 0; padding: 0; list-style: none; }
li { overflow: hidden; border: 1px solid var(--line); border-radius: 12px; background: var(--card); }
.chip { display: flex; align-items: flex-end; height: 56px; padding: 8px 10px; background: var(--c); color: var(--ink-on); font-weight: 600; font-variant-numeric: tabular-nums; }
.meta { display: grid; gap: 2px; padding: 8px 10px; }
.hex { font-variant-numeric: tabular-nums; }
.meta code { color: var(--dim); overflow-wrap: anywhere; }
`.trim()

/**
 * A self-contained page (no script, no network) that lists every role's ramp:
 * the step, its hex and the variable that holds it. `baseStep` is the index of
 * the step the `--color-<role>` alias points at.
 */
export function semanticSwatchHTML(roles, steps, baseStep) {
  const sections = roles.map((r) => {
    const tiles = steps.map((step, i) => {
      const hex = r.shades[i]
      return `      <li style="--c:${escapeHtml(hex)};--ink-on:${escapeHtml(textColorForBg(hex))}">
        <div class="chip">${escapeHtml(step)}</div>
        <div class="meta"><span class="hex">${escapeHtml(hex.toUpperCase())}</span><code>--color-${escapeHtml(r.id)}-${escapeHtml(step)}</code></div>
      </li>`
    }).join('\n')
    return `    <section aria-labelledby="role-${escapeHtml(r.id)}">
      <h2 id="role-${escapeHtml(r.id)}">${escapeHtml(r.label)}</h2>
      <p class="intent">${escapeHtml(r.intent)}</p>
      <p class="alias"><code>--color-${escapeHtml(r.id)}</code> is step ${escapeHtml(steps[baseStep])}, ${escapeHtml(r.base.toUpperCase())}</p>
      <ul>
${tiles}
      </ul>
    </section>`
  }).join('\n')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Semantic colour tokens</title>
  <style>
${SHEET_STYLE}
  </style>
</head>
<body>
  <main>
    <h1>Semantic colour tokens</h1>
    <p class="lead">${roles.length} roles, ${steps.length} steps each. Each swatch names the CSS variable that holds it.</p>
${sections}
  </main>
</body>
</html>
`
}
