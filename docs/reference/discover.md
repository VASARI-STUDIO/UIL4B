# Discover — community & external resource hub

> Reference doc for UIL4B. Linked from `CLAUDE.md` and `positioning.md`.
> Read before building, naming, or routing anything in the **Discover** surface.
> Discover **replaces the old "Library" concept** — it is no longer a static
> shelf of saved items.

## What Discover is

A **community and external-resource discovery hub** for UI designers, web
developers, freelancers, AI-assisted creators, and small studios. It surfaces
both **internal UIL4B resources** and **carefully curated external resources**,
and is built to be a place users **return to regularly** — optimised for
engagement, not just storage.

**Mental model (keep the three surfaces distinct):**

| Surface | Verb | Job |
|---|---|---|
| **Tools / Workspace** | create | generate, check, build, export |
| **Discover** | browse | find, save, remix, submit, get inspired |
| **Learn** | understand | guides, principles, improvement |

Discover answers: *What are other designers using? What's trending? What
prompts / palettes / gradients / UI systems can I remix? What useful sites or
tools should I know about? What can I save? What can I submit?*

## What Discover contains

**Internal UIL4B resources** — community UI systems, colour palettes, gradients,
font pairings, website prompts, AI image prompts, UI presets, creator
submissions, saved public systems, UIL4B-generated resources, featured projects.

**Curated external resources** — useful design + dev tools, UI inspiration
sites, font / icon / colour / gradient resources, mockup + AI-prompt resources,
design-system references, Figma / Framer / Webflow / Tailwind resources,
accessibility + marketing resources, free asset libraries, portfolio + landing
+ component-library inspiration.

## External resource model

Curated carefully — **never a messy link dump.** Each external resource carries:

`Title` · `Short description` · `Category` · `Tags` · `External link` ·
`Use case` · `Why it's useful` · `Free / paid label` · `Difficulty (if
relevant)` · `Save` · `Report broken link` · `Related UIL4B tools`.

**Inclusion bar** — add only if genuinely useful to the UIL4B audience. Review
each for: usefulness, relevance, quality, trust, visual standard, practical
value, whether it supports UI/design/dev workflows, and whether it connects
naturally to a UIL4B tool. No random low-quality links.

### Internal-linking rule (load-bearing)

**Every Discover resource links back to relevant UIL4B tools wherever
possible.** Discover finds inspiration; the product completes the workflow.
Examples:

| External resource | Related UIL4B tools |
|---|---|
| Font website | Font Pairing · Type Scale · Typography System Builder |
| Gradient inspiration site | Gradient Generator · Colour System Builder · UI Palette |
| Accessibility guide | Contrast Checker · Accessibility Audit · Colour System Builder |

Where UIL4B has its own tool, Discover links the user **back into that tool** —
e.g. browse a gradient → "Use in Gradient Generator" opens the generator with
the preset loaded. Don't send users away unnecessarily.

### Seed external resources (replace the founder's current bookmarks)

These tools the founder uses today should be made obsolete by curating them
*into* Discover (with related-tool links back to ours):

- **designgradients.com** → Gradient Generator / Colour System Builder
- **coverr.co** (stock video) → Assets / Video tools
- **colorhunt.co** → Colour System Builder / palettes
- **motionsites.ai** (animated-site inspiration) → UI inspiration
- **getcssscan.com box-shadow examples** → Box Shadow Generator *(capture hover/click states where applicable)*
- **getcssscan.com buttons examples** → UI Builder / Component Designer *(capture hover/click states)*
- **wickedblocks.dev** → UI Builder / component inspiration

## Page structure

```
Discover
  Featured this week        [UI System] [Gradient Pack] [Website Prompt] [External Tool]
  Browse by type            [UI Systems] [Palettes] [Gradients] [Font Pairings]
                            [Prompts] [External Resources] [UI Presets]
  Trending now              [Most saved] [Most remixed] [Most viewed] [Recently added]
  External resources        [Design tools] [Dev tools] [Inspiration sites] [Free assets]
  Community submissions     [Latest] [Top creators] [Submit a resource]
  Collections               [Best SaaS UI resources] [Free tools for freelancers] [AI prompt packs]
```

**Categories:** Featured · Trending · Community Resources · External Resources ·
UI Systems · Colour Palettes · Gradients · Font Pairings · Website Prompts ·
AI Image Prompts · UI Presets · Design Tools · Developer Tools · Free Assets ·
Creator Submissions · Collections.

## Engagement features

Save · Like · Remix · Copy · Use in tool · Submit · Follow creator · View
creator profile · Trending · Recently added · Most saved · Most remixed · Staff
picks · Featured this week · Collections · Tags · Filters · Search ·
Upvote/downvote · Comment/feedback · Report · Request similar.

## Gradient routing decision

- **Gradient Generator → Tools** (`/tools/gradient-generator`): create, edit,
  copy CSS, export, browse presets, use community gradients, save.
- **Gradient Library → Discover** (`/discover/gradients`): browse community +
  external gradient inspiration, save, remix, like, submit, **Use in Gradient
  Generator**.

## MVP scope (this build) vs future

**MVP — build now (Slice 2):**

- Discover landing page
- Featured resources
- Trending / resources grid
- Category filters
- Search
- Save resource
- External resource cards (full field model above)
- Community resource cards
- Submit-resource form → **manual approval workflow**
- Related UIL4B tools on each resource

**Future (engagement build-out):** creator profiles · likes · comments ·
remixes · public collections · follow creators · resource analytics · weekly
featured · personalised recommendations · community voting.

## Security & integrity notes (for engineering)

- External links are user/curator-supplied URLs → render with
  `rel="noopener noreferrer nofollow"` `target="_blank"`; validate/normalise
  the URL; never auto-fetch arbitrary external URLs server-side (SSRF surface).
- Submissions are user-generated content → **manual approval** before public
  display; sanitise all rendered text; rate-limit submissions.
- Reuse existing Firestore rules patterns for community content (mirror the
  community-prompts review model already in the Admin dashboard).
