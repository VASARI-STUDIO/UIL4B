// CLAUDE.md: "The user-facing surface label is Create everywhere in the shipped
// nav. 'Workspace' survives only as an internal code name (WorkspaceContext) and
// in the strategy framing in positioning.md. Don't reintroduce it in UI copy."
//
// It was reintroduced anyway, across four public pages — the homepage kicker, a
// hero CTA, the Plans CTA, the sitemap section label, three tool eyebrows and
// several landing sentences. A rule nothing enforces is a rule that decays, so
// this is the enforcement.
//
// WHAT THIS DELIBERATELY DOES NOT BAN:
//   • WorkspaceContext and the home-workspace-* CSS classes — internal names.
//   • The names of PREVIEW SCENES ("Product Workspace", "Project workspace").
//     Those label a fictional app rendered inside a colour preview to show the
//     palette in use. They are not our surface, and renaming them would make
//     the demo describe UIL4B instead of the imaginary product it is showing.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// The four public pages the violation actually reached, plus the tool pages
// whose eyebrows named the surface.
//
// 'src/pages/Landing.jsx' WAS LISTED HERE and is removed with the page itself
// (`landing-page-orphaned`) — the superseded predecessor homepage, on no route,
// deleted along with its 156 selectors. The header above says the violation
// reached "several landing sentences"; those sentences went with the file, so
// there is nothing left on that page to enforce against. src/pages/Home.jsx,
// the homepage that replaced it, stays first in this list and still carries the
// homepage half of the rule.
// index.html IS PUBLIC COPY AND WAS OUTSIDE THIS GUARD.
//
// The list was seven src/pages files, so the one page that is not a React
// component was never scanned — and on 2026-09-15 its <noscript> block, which
// is what a crawler without JS reads on the highest-traffic URL on the site,
// described UIL4B as "a free, browser-based workspace". The rule held
// everywhere it was looking and was broken where it was not.
//
// It is also the page prerender.mjs clones into all 39 route shells, so one
// banned word there ships on every route at once. HTML comments are stripped
// below for the same reason the JS ones are: this file's own notes about the
// rule must not be read as copy that breaks it.
const PUBLIC_COPY = [
  'index.html',
  'src/pages/Home.jsx',
  'src/pages/Plans.jsx',
  'src/pages/SiteMap.jsx',
  'src/pages/HelpCentre.jsx',
  'src/pages/TypeScale.jsx',
  'src/pages/TintTool.jsx',
  'src/pages/GradientGenerator.jsx',
]

// A JSX text node or a quoted string, minus the exempt cases above.
const ALLOWED = /WorkspaceContext|home-workspace|plb-pv-workspace|Product Workspace|Project workspace|id: 'workspace'|#workspace/

const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(new RegExp(String.fromCharCode(60)+'!--[^]*?--'+String.fromCharCode(62),'g'), '')

test('no public page calls a UIL4B surface a "workspace"', () => {
  const offenders = []
  for (const file of PUBLIC_COPY) {
    const src = stripComments(fs.readFileSync(path.join(process.cwd(), file), 'utf8'))
    for (const line of src.split('\n')) {
      if (!/workspace/i.test(line)) continue
      if (ALLOWED.test(line)) continue
      offenders.push(`${file}: ${line.trim().slice(0, 110)}`)
    }
  }
  assert.deepEqual(offenders, [],
    'CLAUDE.md fixes the user-facing surface label as "Create". These lines put "workspace" back into shipped copy:\n  '
    + offenders.join('\n  '))
})

test('the exemptions are real, so this test cannot pass by being toothless', () => {
  // If the exempted pattern ever disappears from the file that carries it, the
  // ALLOWED list is stale and the test above has quietly stopped covering the
  // case it was written for. The V2 homepage rebuild (2026-08-15+) replaced
  // Home.jsx's hero wholesale and dropped the `home-workspace-intro` wrapper
  // along with it, so that anchor no longer exists there — the exemption this
  // scan still genuinely exercises is SiteMap.jsx's `id: 'workspace'`, a URL
  // anchor rather than copy.
  const siteMap = fs.readFileSync(path.join(process.cwd(), 'src/pages/SiteMap.jsx'), 'utf8')
  assert.match(siteMap, /id: 'workspace'/, "the SiteMap anchor this test exempts should still exist")
})
