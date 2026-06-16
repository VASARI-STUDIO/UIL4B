import DocsTOC from '../components/DocsTOC'

const LAST_UPDATED = '2026-06-15'

const TOC_ITEMS = [
  { id: 'art-ai-01', number: '01', title: 'CLAUDE.md Setup' },
  { id: 'art-ai-02', number: '02', title: 'Prompting Patterns' },
  { id: 'art-ai-03', number: '03', title: 'Subagents & Delegation' },
  { id: 'art-ai-04', number: '04', title: 'Common Gotchas' },
  { id: 'art-ai-05', number: '05', title: 'Useful Commands' },
  { id: 'art-ai-06', number: '06', title: 'Cursor Tips' },
  { id: 'art-ai-07', number: '07', title: 'Other AI Tools' },
  { id: 'art-ai-08', number: '08', title: 'Workflow Integration' },
]

function Stat({ value, label, sub }) {
  return (
    <div style={{ padding: '16px 20px', borderRadius: 'var(--radius)', background: 'var(--bg-1)', border: '1px solid var(--border)', flex: '1 1 140px', minWidth: 120 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Callout({ children, type = 'insight' }) {
  const colors = {
    insight: { bg: 'var(--accent-bg)', border: 'var(--accent)', label: 'Key Insight' },
    warning: { bg: 'rgba(245,158,11,.08)', border: 'var(--warn)', label: 'Common Mistake' },
    pro: { bg: 'rgba(16,185,129,.08)', border: 'var(--ok)', label: 'Pro Tip' },
  }
  const c = colors[type]
  return (
    <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-s)', background: c.bg, borderLeft: `3px solid ${c.border}`, marginTop: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: c.border, marginBottom: 6 }}>{c.label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--t0)' }}>{children}</div>
    </div>
  )
}

function Code({ children }) {
  return (
    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-s)', padding: '10px 14px', marginTop: 8, marginBottom: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--t1)' }}>
      {children}
    </div>
  )
}

function Article({ id, number, title, children }) {
  return (
    <section id={id} style={{ marginBottom: 48, paddingBottom: 48, borderBottom: '1px solid var(--border)', scrollMarginTop: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 48, fontWeight: 800, color: 'var(--accent)', opacity: 0.15, lineHeight: 1, fontFamily: 'var(--mono)' }}>{number}</span>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.2 }}>{title}</h2>
      </div>
      <div style={{ maxWidth: 720 }}>{children}</div>
    </section>
  )
}

export default function DocsAI() {
  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Documentation</div>
        <h1>AI Coding Assistants</h1>
        <p>Practical guide to Claude Code, Cursor, and other AI coding tools — prompting patterns, subagents, CLAUDE.md setup, and common gotchas.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Last updated: {LAST_UPDATED}
        </div>
      </div>

      <DocsTOC items={TOC_ITEMS} />

      <Article id="art-ai-01" number="01" title="CLAUDE.md Setup">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          CLAUDE.md is a project-level instruction file that tells Claude Code about your codebase. It sits in your repo root and is automatically read at the start of every session. Think of it as onboarding docs for your AI pair programmer.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="5-10x" label="Fewer corrections needed" sub="With a good CLAUDE.md" />
          <Stat value="&lt;200" label="Lines is the sweet spot" sub="Too long = ignored context" />
          <Stat value="1st" label="Thing to set up" sub="Before writing any prompts" />
        </div>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Template structure</h4>
        <Code>{`# Project Name

## Tech Stack
React 19, Vite, Firebase Auth, Firestore

## Build & Verify
npx vite build    # must pass before commit
npm test          # run tests

## Key Architecture
- Pages: src/pages/
- API routes: /api/*.js (Vercel serverless)
- Styles: src/styles/global.css

## Conventions
- CSS class naming: kebab-case with prefix
- No inline styles in new code
- Mobile breakpoints: 768px, 480px

## Human Validation Zones
Files that need approval before changing:
- auth, payments, admin routes`}</Code>
        <Callout type="insight">
          Include a &quot;Verify-First Workflow&quot; section. Tell the AI to state how it will verify a change before starting, then actually run that verification after finishing. This single instruction eliminates the most common failure mode: changes that look right but break the build.
        </Callout>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Keep it concise. Every line competes for context window space. Focus on things the AI would get wrong without guidance: naming conventions, file locations, build commands, and areas that are off-limits.
        </p>
        <Callout type="pro">
          Add a &quot;Human Validation Zones&quot; section listing files that should never be modified without asking first. Auth, payments, and admin routes are good candidates. This prevents the AI from casually refactoring your Stripe webhook.
        </Callout>
      </Article>

      <Article id="art-ai-02" number="02" title="Prompting Patterns">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          The difference between a frustrating AI session and a productive one is usually the prompt. These three patterns cover 90% of use cases.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="3" label="Core patterns" sub="Interview, Skill, Spec-first" />
          <Stat value="70%" label="Less back-and-forth" sub="With structured prompts" />
          <Stat value="1 min" label="Extra upfront saves 20 min" sub="Of debugging later" />
        </div>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>1. Interview-me pattern</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          Instead of describing what you want, ask the AI to interview you first. This surfaces requirements you forgot to mention.
        </p>
        <Code>{`I want to build a settings page. Before writing any code,
ask me 5 questions about the requirements, UX preferences,
and edge cases I should handle.`}</Code>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          The AI will ask about things like: which settings are user-facing vs admin, whether changes save automatically or need a submit button, and what happens when the user navigates away mid-edit.
        </p>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>2. Build-a-skill pattern</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          Teach the AI a reusable capability by giving it a template to follow. Works well for repetitive tasks.
        </p>
        <Code>{`Learn this pattern for creating new doc pages:
1. Copy the structure from DocsDesign.jsx
2. Use the same Stat, Callout, Article components
3. Add TOC_ITEMS matching each article ID
4. Use sec/sec-h wrapper classes

Now create a page about accessibility.`}</Code>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>3. Spec-first pattern</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          Ask the AI to write a spec before writing code. Review the spec, then say &quot;implement it.&quot;
        </p>
        <Code>{`Write a technical spec for adding dark mode toggle.
Include: state management approach, CSS strategy,
persistence method, and migration plan for existing
styles. Do NOT write code yet.`}</Code>
        <Callout type="warning">
          The most common prompting mistake is being vague. &quot;Make it look better&quot; produces random changes. &quot;Increase heading contrast to 7:1, add 24px bottom margin to cards, reduce body font to 14px&quot; produces exactly what you want.
        </Callout>
      </Article>

      <Article id="art-ai-03" number="03" title="Subagents & Delegation">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Subagents let you split complex work across multiple AI instances. Each subagent gets its own context window and can work independently. This is how you handle tasks too large for a single conversation.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="200K" label="Token context limit" sub="Per Claude conversation" />
          <Stat value="5-8" label="Parallel agents" sub="For independent tasks" />
          <Stat value="3x" label="Faster completion" sub="With proper delegation" />
        </div>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>When to use subagents</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Independent tasks</strong> — Searching multiple directories, running tests while editing, researching a pattern while implementing another.</li>
          <li><strong>Context separation</strong> — When one task needs deep focus on a specific file set and would be distracted by other context.</li>
          <li><strong>Parallel execution</strong> — Multiple agents can search, read, and analyze simultaneously.</li>
        </ul>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>How to brief a subagent</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          A subagent has zero context from your conversation. Brief it like a colleague who just walked into the room.
        </p>
        <Code>{`Agent({
  description: "Find all auth-related files",
  prompt: "Search for every file that imports
    AuthContext or uses useAuth. List paths and
    what each file does with auth state.
    Report in under 100 words."
})`}</Code>
        <Callout type="insight">
          Always include what you already know or ruled out. &quot;I checked src/utils and it wasn&apos;t there&quot; saves the agent from re-checking. Tell it the output format you want. &quot;Report in under 100 words&quot; prevents walls of text.
        </Callout>
        <Callout type="pro">
          Use background agents for tasks you do not need immediately. Set <code style={{ background: 'var(--bg-1)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>run_in_background: true</code> and continue working. You get notified when it finishes. Launch multiple independent agents in a single message for true parallelism.
        </Callout>
      </Article>

      <Article id="art-ai-04" number="04" title="Common Gotchas">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Every developer hits the same traps when working with AI coding tools. Knowing them in advance saves hours of debugging.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="#1" label="Gotcha: not verifying builds" sub="AI says done but build fails" />
          <Stat value="40%" label="Of AI suggestions" sub="Have subtle issues on review" />
          <Stat value="5 min" label="Verification saves 2 hours" sub="Of debugging later" />
        </div>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>1. Context window overflow</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          After 100K+ tokens, the AI starts forgetting early instructions. It may revert conventions or contradict itself.
        </p>
        <Callout type="pro">
          Fix: Use /compact regularly to summarize the conversation. Start new sessions for new tasks. Put critical rules in CLAUDE.md so they persist across sessions.
        </Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>2. Hallucinated imports</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          The AI invents packages that sound plausible but do not exist. It may also import from wrong paths in your project.
        </p>
        <Callout type="warning">
          Fix: Always run the build after changes. If the AI adds a new dependency, verify it exists on npm before installing. Check import paths against your actual file structure.
        </Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>3. Over-engineering</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          AI defaults to enterprise patterns. You ask for a toggle and get a full state machine with event sourcing.
        </p>
        <Callout type="pro">
          Fix: Add &quot;Keep it simple. No unnecessary abstractions.&quot; to your prompt. Specify the complexity level: &quot;This is a quick utility, not a library.&quot;
        </Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>4. Forgetting edge cases</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          AI tends to handle the happy path well and ignore loading states, errors, empty states, and network failures.
        </p>
        <Callout type="warning">
          Fix: Include a Murphy&apos;s Law checklist in your CLAUDE.md. What if the network is down? What if the data is empty? What if the user double-clicks? Prompt the AI to address each case explicitly.
        </Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>5. Not verifying builds</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          The AI says &quot;done&quot; but never actually ran the build. You discover the JSX syntax error an hour later.
        </p>
        <Callout type="insight">
          Fix: End every task prompt with &quot;After finishing, run npx vite build and report the result.&quot; Make build verification a non-negotiable step in your CLAUDE.md workflow section.
        </Callout>
      </Article>

      <Article id="art-ai-05" number="05" title="Useful Commands">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Claude Code has built-in slash commands that most users never discover. These save significant time once they become muscle memory.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="15+" label="Built-in commands" sub="Available via / prefix" />
          <Stat value="/compact" label="Most underused command" sub="Reclaims context window" />
          <Stat value="/cost" label="Track spending" sub="Per session token usage" />
        </div>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Essential slash commands</h4>
        <Code>{`/help       Show all available commands
/clear      Reset conversation (fresh context)
/compact    Summarize conversation to free tokens
/cost       Show token usage and estimated cost
/init       Generate a CLAUDE.md for your project
/review     Review a pull request
/config     Open settings configuration`}</Code>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Permission management</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          Claude Code asks permission before running bash commands, writing files, or using MCP tools. You can pre-approve patterns to reduce interruptions.
        </p>
        <Code>{`Settings file: .claude/settings.json
{
  "permissions": {
    "allow": [
      "Bash(npx vite build)",
      "Bash(npm test)",
      "Bash(git status)",
      "Bash(git diff)"
    ]
  }
}`}</Code>
        <Callout type="pro">
          Use the /fewer-permission-prompts skill to scan your recent transcripts and auto-generate an allowlist of common read-only commands. This eliminates the most repetitive permission prompts without compromising safety.
        </Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Keyboard shortcuts</h4>
        <Code>{`Escape      Interrupt current generation
Shift+Tab   Toggle between single/multi-line input
Up arrow    Recall previous messages`}</Code>
      </Article>

      <Article id="art-ai-06" number="06" title="Cursor Tips">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Cursor is a VS Code fork with AI built directly into the editor. It excels at inline edits and file-level context. Here is how to get the most out of it.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="Cmd+K" label="Inline edit shortcut" sub="Edit selected code in place" />
          <Stat value="Tab" label="Accept AI suggestions" sub="Context-aware completions" />
          <Stat value="Cmd+L" label="Open chat panel" sub="Full conversation mode" />
        </div>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Key features</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Tab completion</strong> — Cursor predicts your next edit based on recent changes. Accept with Tab, reject with Escape. Works best when you establish a pattern in the first 2-3 edits.</li>
          <li><strong>Cmd+K inline edits</strong> — Select code, press Cmd+K, describe the change. The AI edits in place with a diff preview. Faster than chat for small targeted changes.</li>
          <li><strong>@codebase</strong> — Type @codebase in chat to let the AI search your entire project for relevant context. Much better than manually pasting files.</li>
          <li><strong>Multi-file edits</strong> — In Composer mode (Cmd+I), describe changes that span multiple files. The AI proposes edits across all of them with a review step before applying.</li>
        </ul>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>.cursorrules file</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          Similar to CLAUDE.md but for Cursor. Place a .cursorrules file in your repo root with project-specific instructions.
        </p>
        <Code>{`# .cursorrules
You are working on a React 19 + Vite project.
Use CSS custom properties, not inline styles.
Class naming: kebab-case with component prefix.
Always check that imports resolve to real files.`}</Code>

        <Callout type="insight">
          Cursor is better than Claude Code for quick inline edits and visual diffing. Claude Code is better for multi-step tasks, running builds, and orchestrating subagents. Use both: Cursor for editing, Claude Code for architecture and automation.
        </Callout>
      </Article>

      <Article id="art-ai-07" number="07" title="Other AI Tools">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          The AI coding landscape is broader than Claude Code and Cursor. Each tool has a sweet spot. Here is when to reach for each one.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="6+" label="Major AI coding tools" sub="Available in 2026" />
          <Stat value="v0.dev" label="Best for UI prototyping" sub="Vercel, generates React" />
          <Stat value="Copilot" label="Best for inline autocomplete" sub="GitHub, works in any IDE" />
        </div>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>GitHub Copilot</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Inline code suggestions as you type. Best for boilerplate, test generation, and predictable patterns. Works in VS Code, JetBrains, and Neovim. Weakest at multi-file refactoring and architectural decisions.
        </p>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>v0.dev (Vercel)</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Generates React + Tailwind UI components from text or image prompts. Ideal for prototyping designs quickly. Export the code and adapt it to your project. Not suitable for complex interactive logic.
        </p>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Bolt.new</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Full-stack prototyping in the browser. Spins up a complete environment with frontend, backend, and database. Great for quick demos and proof-of-concepts. Code quality can be rough for production use.
        </p>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Lovable</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          App builder focused on non-developers. Describe what you want in plain English and it generates a working app. Good for MVPs and internal tools. Limited customization for complex requirements.
        </p>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Replit Agent</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Builds and deploys full apps from a prompt inside Replit. Handles environment setup, dependencies, and hosting. Best for small projects and learning. Production scalability is limited.
        </p>

        <Callout type="pro">
          Use the right tool for the right job. v0.dev for UI mockups, Copilot for typing speed, Claude Code for complex multi-file changes, Cursor for inline editing, Bolt/Lovable for quick prototypes. No single tool does everything well.
        </Callout>
      </Article>

      <Article id="art-ai-08" number="08" title="Workflow Integration">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          AI tools deliver the most value when integrated into your daily workflow, not used as one-off novelties. Here is a practical framework for when to use AI at each stage of development.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="60%" label="Time saved on boilerplate" sub="With AI-assisted workflow" />
          <Stat value="4 stages" label="Of the dev loop" sub="Plan, Build, Review, Ship" />
          <Stat value="Always" label="Verify AI output" sub="Trust but check builds" />
        </div>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Daily workflow</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Plan</strong> — Use the interview-me pattern to define requirements. Ask the AI to write a spec. Review it before coding starts.</li>
          <li><strong>Build</strong> — Let the AI handle boilerplate and repetitive patterns. You focus on business logic and UX decisions. Run builds after every change.</li>
          <li><strong>Review</strong> — Use /review or /code-review to get AI feedback on your diff. Check for missed edge cases, naming inconsistencies, and dead code.</li>
          <li><strong>Ship</strong> — AI generates commit messages, PR descriptions, and changelog entries. You verify accuracy and approve.</li>
        </ul>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>PR reviews with AI</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          Point Claude Code at a PR and ask for a review. It will check for bugs, suggest simplifications, and flag security concerns.
        </p>
        <Code>{`# Review current branch changes
/review

# Review with inline comments on GitHub
/code-review --comment

# Review and auto-fix issues
/code-review --fix`}</Code>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Debugging with AI</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          Paste the error message and the file path. Ask the AI to explain the root cause before suggesting a fix. This prevents surface-level patches that hide deeper problems.
        </p>
        <Code>{`This error appears when I click Save on the
settings page:

TypeError: Cannot read property 'uid' of null
  at SettingsPage.jsx:47

Explain the root cause first, then suggest a fix.
Do not modify AuthContext.`}</Code>

        <Callout type="insight">
          The most productive AI workflow is not &quot;AI writes all the code.&quot; It is: you make the decisions, AI handles the mechanical work. You define the architecture, AI generates the boilerplate. You spot the bug, AI writes the fix. You review everything before it ships.
        </Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Documentation generation</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          AI is excellent at generating JSDoc comments, README updates, and API documentation from existing code. Point it at a file and ask for documentation. Review for accuracy since the AI may misunderstand intent.
        </p>
        <Callout type="warning">
          Never let AI auto-commit or auto-push without your review. Always check the diff before committing. AI-generated commit messages are a starting point, not the final version. One wrong force-push can ruin your week.
        </Callout>
      </Article>
    </div>
  )
}
