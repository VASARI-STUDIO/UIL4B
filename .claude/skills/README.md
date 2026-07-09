# Vendored agent skills

Project-scoped skills for Claude Code, available in every session (committed to
the repo so they survive the ephemeral web container). Curated from Addy
Osmani's **[agent-skills](https://github.com/addyosmani/agent-skills)** and kept
close to source so upstream fixes are easy to pull.

## Skills in this workspace

| Skill | Why it earns a place in UIL4B |
|---|---|
| `frontend-ui-engineering` | Production-quality UI, real design-system adherence, a11y, and killing the generic "AI aesthetic" — the heart of what UIL4B ships. |
| `incremental-implementation` | Thin vertical slices with verification and commits — matches our ship-in-slices cadence. |
| `spec-driven-development` | Turns rough, out-of-order ideas into a concrete spec before code — fits how work arrives here. |
| `browser-testing-with-devtools` | Runtime verification via the Chrome DevTools MCP (already configured) — fills the "verify in a real browser" gap. |
| `performance-optimization` | Core Web Vitals + profiling — matters for a design product and for SEO. |
| `debugging-and-error-recovery` | Systematic root-cause triage instead of guess-and-check. |

Skills that duplicated an existing subagent (code review, security, git
workflow) or don't apply yet (no test suite → TDD) were intentionally left out.

## Precedence

These are general-purpose skills. Where they differ from UIL4B's own
conventions, **the project conventions win** — in particular:

- Styling is **class-based CSS in a single `global.css`** with design tokens.
  Ignore the skills' Tailwind / inline-style examples; see
  [`docs/reference/css-conventions.md`](../../docs/reference/css-conventions.md).
- The verify gate is `npx vite build` + `npx eslint .`; see
  [`docs/reference/build-and-verify.md`](../../docs/reference/build-and-verify.md).
- Human Validation Zones (auth / Stripe) remain founder-gated regardless of what
  a skill suggests.

## License / attribution

Vendored from https://github.com/addyosmani/agent-skills under the MIT License:

```
MIT License

Copyright (c) 2025 Addy Osmani

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
