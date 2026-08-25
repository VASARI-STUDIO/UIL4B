# Git Workflow

> Reference doc for UIL4B. Linked from `CLAUDE.md`.

## Branching

- **Always work on the designated feature branch** — never commit directly to
  `main`.
- Create the feature branch locally if it doesn't exist yet.
- **Never push to a different branch** without explicit permission.

## Committing

- **Descriptive, component-prefixed messages** (e.g. `cs:`, `adm:`, `aipg:`,
  `docs:`) describing what changed and why.
- Commit only when the work is verified (build passes — see
  `build-and-verify.md`).
- **Never force-push** without explicit permission.

## Pushing

```bash
git push -u origin <branch-name>
```

- On **network failure only**, retry up to 4 times with exponential backoff
  (2s, 4s, 8s, 16s).

## Merging to `main`

- **Via PR only.** Direct push to `main` returns **503**.
- **Do NOT open a pull request unless the user explicitly asks for one.**
- The Director (main thread) opens and squash-merges PRs; subagents cannot.
  See `director.md`.

## Release gate (when a PR is requested)

Before a PR is prepared, the branch passes the quality gates:

1. Clean tree, on the feature branch (not `main`).
2. `npx vite build` passes.
3. `npx eslint .` is clean.
4. One `reviewer` pass — secrets, correctness and security in a single
   verdict — **BLOCK on any critical**.
5. Version + CHANGELOG updated.

The **Director** drives this and executes the merge. The former
`release-captain` agent was retired on 2026-08-20 because it duplicated the
Director, which already owns release verification and merging — see
[`.claude/agents/README.md`](../../.claude/agents/README.md).
