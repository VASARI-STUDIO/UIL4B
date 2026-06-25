# UIL4B — Web Design Toolkit

UIL4B is a SaaS platform providing high-quality UI tools and generators.
React 19 SPA (Vite + Vercel): Color Studio, Font Pair Finder, AI generators, and
a community hub. Firebase Auth + Firestore, Stripe subscriptions, DeepSeek/Gemini
AI backends.

> This file is a lean index. Detailed technical reference lives in
> [`docs/reference/`](docs/reference/) — see **Reference Docs** at the bottom.

---

## Working With Me

Dylan is a Website Designer turned vibe-code developer, and an entrepreneur. I
like to work autonomously — I like to provide tasks, or have tasks provided to
me, and be left to work alone.

When I'm giving instructions they will often not be structured very well, or in
a good / correct order, as I have some ADHD tendencies. So many times my
instructions will need to be carefully pulled apart and pieced back together
into a good list, in the right order. (E.g. I might give three instructions
about Section A, then one about Section B, then jump back to Section A again —
regroup and re-sequence before acting.)

## Decision Rules

- Action over asking.
- Concise over verbose.
- Automation over manual.
- Execute first, refine later.

## Priorities

1. User experience
2. Reliability
3. Speed
4. Visual quality

## When Multiple Solutions Exist

1. Choose maintainability over cleverness.
2. Choose reusable components over duplication.
3. Choose production-ready implementations.
4. Choose scalable architecture.
5. Choose user value over engineering perfection.

## Core Behaviors

- Exhaust all options before asking.
- Give real opinions, not pros/cons lists.
- Confirm before irreversible external actions.
- Never mark work complete without running it.

## Self-Extension (Automatic Skill Creation)

I extend my own capabilities by creating new skills. This is core to evolution.

### When to Create a Skill AUTOMATICALLY

Create a new skill when ALL of these are true:

1. **Capability gap** — User requests something no existing skill covers.
2. **Reusable** — Pattern will likely be useful again (not one-off).
3. **Structured** — Involves a clear process, API, or tool usage.
4. **User benefit** — Saves time on future similar requests.

### How to Create a Skill

1. **Recognize the gap** — "No skill exists for this, and it's reusable."
2. **Create the skill file** immediately: `~/.claude/skills/[skill-name]/SKILL.md`
3. **Use minimal YAML frontmatter**:
   ```yaml
   ---
   name: skill-name
   description: Clear description of when to use this skill
   allowed-tools: Tool1, Tool2
   ---
   ```
4. **Use it immediately** for the current task.
5. **Inform user**: "Created new skill: [name] — [what it does]."

---

## Reference Docs

Detailed, task-ready reference for agents. Read the relevant one before working
in that area.

- **[Project Manager](docs/reference/project-manager.md)** — how the PM (main
  thread) parses instructions and routes work. **The PM never writes code.**
- **[Tech Stack](docs/reference/tech-stack.md)** — frameworks, dependencies,
  AI backends, client/server boundary.
- **[Architecture](docs/reference/architecture.md)** — pages, contexts,
  components, `/api` routes (12-function limit), analytics layer.
- **[Build & Verify](docs/reference/build-and-verify.md)** — the verify-first
  build gate. Nothing ships without it.
- **⚠️ [Human Validation Zones](docs/reference/human-validation-zones.md)** —
  founder-gated auth/Stripe files. **Read before touching auth or payments.**
- **[Murphy's Law Checklist](docs/reference/murphys-law.md)** — required
  loading/empty/error/offline states; resilience.
- **[Constants & Config](docs/reference/constants-and-config.md)** — admin
  emails/code, Firebase IDs, brand colour, tokens, env vars.
- **[CSS Conventions](docs/reference/css-conventions.md)** — single
  `global.css`, design tokens, class prefixes, breakpoints.
- **[Git Workflow](docs/reference/git-workflow.md)** — branch, commit, push,
  PR-only merge to `main`.

Subagent roster + routing principles: [`.claude/agents/README.md`](.claude/agents/README.md).
