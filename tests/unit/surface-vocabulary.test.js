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
const PUBLIC_COPY = [
  'src/pages/Home.jsx',
  'src/pages/Landing.jsx',
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
  // If the internal code name ever disappears, the ALLOWED list is stale and
  // the test above has quietly stopped covering the case it was written for.
  const home = fs.readFileSync(path.join(process.cwd(), 'src/pages/Home.jsx'), 'utf8')
  assert.match(home, /home-workspace/, 'the internal class name this test exempts should still exist')
})
