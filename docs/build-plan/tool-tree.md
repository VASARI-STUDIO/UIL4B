# Tool tree & site structure

_Stable scaffolding reference — read when building/placing a tool or touching
nav. Founder-confirmed 2026-07-02. Hub → [`../BUILD-PLAN.md`](../BUILD-PLAN.md)._

---

## Site structure & navigation

**Top nav:** logo · **Create ▾** · **Discover ▾** · **Learn ▾** · search ·
account. Each ▾ opens a mega-menu (Coolors footer style: large bold main-tool
heading + smaller sub-tool links with one-line descriptions). **A left in-tool
sidebar exists ONLY inside tool pages** — quick access to sibling tools in the
same Create group; at its bottom a **CTA to Upgrade**, which becomes a **profile
link** if the user is already Pro.

**Home (`/`)** = the Mobbin-style **sales page** (the "living preview" — the page
itself is a working demo). **Dashboard is removed.** The "Create" label + surface
id is `create` (renamed from the old `workspace`).

**Two "not-ready" systems, kept distinct:**
1. **Blank TBD tool pages** — public, in the nav, **"Soon"-badged**, "coming
   soon" (chosen over a `#` prefix so the public menu reads as intentional).
2. **Hidden tools** reached by direct URL — the re-skinned
   "🤫 You found something we're still building" page (`ComingSoon.jsx`).

---

## Tool tree

Main tools = **large heading** (a *system* with sub-tools built in). Sub-tools =
**smaller font** beneath, each also getting its **own standalone page** (reused
components). Colour is **one** client-side tool (no Vercel function). We stay
within the **12/12 serverless-function cap** — the rebuild adds no functions.

### CREATE (build)

- **Colour System Generator** — _one merged tool_ (`/color`)
  - Palette Generator · Semantic (UI-state) Colour Generator · Tint Generator ·
    UI Colour Generator · Gradient Generator · Contrast Checker
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

Colour Studio (`/color`, already merges palette/tints/contrast/gradients) ·
Typography (`/fontgallery`, `/fontpairs`, `/typescale`) · UI (`/ui-builder`,
`/box-shadow`, `/auto-builder`) · Imagery (`/file-converter`, `/ratio`) · AI
(`/ai-prompt`, `/landing-prompts`, `/alt-text`, `/prompts`) · Icons/Emoji
(`/icons`, `/emoji`).

**Kept infra/features:** Firebase Auth/Firestore, Stripe, OpenRouter/Gemini AI,
feedback tool, admin dashboard, `sections.jsx` surface model (Workspace→Create),
`ComingSoon.jsx` hidden-tool page. **Removed:** Dashboard page; all prior design
styling. Backup of the pre-rebuild app: `backup/pre-redesign-2026-07-02`.
