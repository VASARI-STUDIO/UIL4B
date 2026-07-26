# UIL4B project skills

Project-scoped skills make reusable methods and knowledge available to every
agent without bloating agent personas. They are committed with UIL4B so the
repository never depends on Dylan's private local wiki.

## First-party skills

| Skill | Purpose |
|---|---|
| `uil4b-brand-design` | Governs UIL4B identity, product-versus-sales continuity, anti-slop critique, and the brand learning loop. |

Brand-specific decisions belong here and in the live project sources it names,
not in `.claude/agents/design.md`.

## Vendored workflow skills

| Skill | Purpose in UIL4B |
|---|---|
| `spec-driven-development` | Turns ambiguous work into an explicit outcome and acceptance criteria before implementation. |
| `incremental-implementation` | Delivers coherent vertical slices with verification at each useful boundary. |
| `frontend-ui-engineering` | Applies production UI, accessibility, state, and responsive engineering practices. |
| `browser-testing-with-devtools` | Verifies rendered behaviour and interaction in a real browser. |
| `performance-optimization` | Measures, diagnoses, and corrects performance bottlenecks. |
| `debugging-and-error-recovery` | Finds root causes and verifies regressions systematically. |

## Precedence

Use this order when guidance conflicts:

1. Current explicit user direction.
2. `CLAUDE.md` and canonical project reference documents.
3. Approved task acceptance criteria.
4. First-party UIL4B skills.
5. Vendored general-purpose skills.
6. General examples or external conventions.

In particular:

- Follow `docs/reference/css-conventions.md` for the current styling system.
- Follow `docs/reference/build-and-verify.md` for required verification.
- Follow `docs/reference/human-validation-zones.md` for founder-gated scope.
- Read live code for implemented values instead of copying values into a skill
  or agent unless they are durable brand decisions.

## Updating knowledge

Update the narrowest authoritative layer:

- a task-specific decision goes in the task specification;
- a current architecture or product rule goes in project docs;
- a reusable method or quality bar goes in a skill;
- an implemented value goes in code;
- a durable founder brand response follows
  `uil4b-brand-design/references/learning-loop.md`.

Do not turn a single preference into a global rule, and do not make the app
agents read from an absolute private-vault path.

## Licence and attribution

The six workflow skills were vendored from
https://github.com/addyosmani/agent-skills under the MIT License:

```text
MIT License

Copyright (c) 2025 Addy Osmani

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

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
