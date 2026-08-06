# Tool tree & site structure

_Stable scaffolding reference — read when building/placing a tool or touching
nav. Founder-confirmed 2026-07-02. Hub → [`../../CLAUDE.md`](../../CLAUDE.md)._

---

## Site structure & navigation

**Top nav:** logo · **Create ▾** · **Discover ▾** · **Learn ▾** · search ·
account. Each ▾ opens a mega-menu (Coolors footer style: large bold main-tool
heading + smaller sub-tool links with one-line descriptions). Tool pages use the
top navigation and a full-width workbench; the retired left rail is not part of
the current shell.

**Home (`/`)** = the Mobbin-style **sales page** (the "living preview" — the page
itself is a working demo). **Dashboard is removed.** The "Create" label + surface
id is `create` (renamed from the old `workspace`).

**Two "not-ready" systems, kept distinct:**
1. **Blank TBD tool pages** — public, in the nav, **"Soon"-badged**, "coming
   soon" (chosen over a `#` prefix so the public menu reads as intentional).
2. **Unbuilt direct routes** — resolved by `CreateTool` to the same honest
   workshop state; dormant implementations are not mounted until activated.

---

## Tool tree

Main tools = **large heading** (a *system* with sub-tools built in). Sub-tools =
**smaller font** beneath, each also getting its **own standalone page** (reused
components). Colour is client-side (no Vercel function). The serverless function
budget and the current count are owned by
[`../reference/architecture.md`](../reference/architecture.md) — check there
before a new tool consumes a slot.

### CREATE (build)

- **Colour System Generator** — landing at `/color`
  - Palette Generator · Semantic (UI-state) Colour Generator · Tint Generator ·
    Gradient Generator · Contrast Checker, each live at `/color/*`
- **Typography System Builder**
  - Font Gallery `→ /fontgallery` · Font Pair Tool `→ /fontpairs` · Type Scale `→ /typescale`
- **UI Component Builder**
  - Component Designer `→ /ui-builder` · Box Shadow Generator `→ /box-shadow` ·
    UI Auto-Builder `→ /auto-builder`
- **Imagery & Media**
  - File Converter `→ /file-converter` (image + video + frames merged) ·
    Aspect-Ratio Calculator `→ /ratio`
- **AI Studio**
  - AI Image-Prompt Generator `→ /ai-prompt` · AI Landing-Page Prompt Generator
    `→ /landing-prompts` · Alt-Text Generator `→ /alt-text` · Prompt Library `→ /prompts`
- **Icons & Emoji** — unified into one pill-toggle surface
  - Icon Library `→ /icons` · Emoji Library `→ /emoji`

### DISCOVER (browse — community: inspiration + free-to-copy assets)

- **Inspiration** — curated sites (Mobbin, Godly, Lapa Ninja, …), each linking
  back to the relevant Create tool
- **Community Palettes / Systems** · **Community Fonts & Pairings** ·
  **Community Prompts**
- **Curated Resources** — the ~45 ExternalResources links fold in here
  (`discoverResources.js`)
- **Collections**

### LEARN (understand — all documentation)

- Design Principles · UI Themes · Brand Colour Guide · Typography Guide ·
  SEO (Small-Business + Specialist) · Marketing Fundamentals / Social & Marketing ·
  AI Coding Assistants · Help Centre

---

## Reusable tool code (do NOT delete — reuse when each tool is actioned)

Colour tools (`/color/*`; `/color` is their landing) ·
Typography (`/fontgallery`, `/fontpairs`, `/typescale`) · UI (`/ui-builder`,
`/box-shadow`, `/auto-builder`) · Imagery (`/file-converter`, `/ratio`) · AI
(`/ai-prompt`, `/landing-prompts`, `/alt-text`, `/prompts`) · Icons/Emoji
(`/icons`, `/emoji`).

**Kept infra/features:** Firebase Auth/Firestore, Stripe, OpenRouter/Gemini AI,
feedback tool, admin dashboard, `sections.jsx` surface model (Workspace→Create),
and the `CreateTool` workshop state. **Removed from runtime:** Dashboard and the
old tool rail. Backup of the pre-rebuild app: `backup/pre-redesign-2026-07-02`.
