# Homepage chaos → calm experience

> **Build-ready founder-approved specification · 2026-07-28**
>
> Scope: the public homepage hero and the live mini-workbench immediately below
> it. This document is the acceptance contract for implementation. It does not
> reopen the wider homepage, navigation, pricing, Discover, Learn, authentication
> or entitlement systems.

## 1. Experience intent

**Surface and users:** the public homepage for designers and front-end
developers evaluating whether UIL4B can replace a cluster of disconnected
single-purpose tabs.

**Job:** recognise the live tools, enter one directly, or test a small honest
workflow before committing to the full workspace.

**Business outcome:** turn the “No more tab hoarding” promise into product proof
without invented activity, generic SaaS theatre or a demo that bypasses the real
product.

**Observable response:** the first view may feel busy because it shows the real
breadth of work; the next view must feel ordered, usable and calm. A reviewer
should be able to say what the eight live tools are, why they resolve into four
workbench modes, and where every action goes.

## 2. Evidence and diagnosis

- The current hero already owns the approved headline and places a working
  preview directly beneath it.
- The current preview model derives three category tabs from the Create tree.
  That model cannot express eight honest tool links resolving into exactly four
  task-focused tabs. Hero satellites and workbench tabs therefore need separate
  data contracts.
- `useHomeMotion` already loads GSAP dynamically and has reduced-motion and
  failed-chunk recovery. The new composition must strengthen that progressive
  enhancement rule: content and controls are never hidden pending GSAP.
- `imageHandoff.js` already demonstrates a one-consumption, in-memory `File`
  transfer into File Converter. Extend that pattern; do not persist files.
- The current icon preview links individual glyphs toward the library but does
  not define a validated editable draft. The new Icon panel needs an explicit,
  bounded handoff contract.

## 3. Locked product decisions

1. Keep the existing H1 theme and wording:
   **“No more tab hoarding. Build your UI system in one place.”**
2. Show exactly eight live hero satellites:
   Palette, Semantic, Tint, Gradient Generator, Contrast, Icon Library,
   File Converter, Aspect & Resolution.
3. Every satellite is a real semantic link with a stable destination. Motion,
   hover and preview state must not change its `href`.
4. The satellites may look deliberately irregular on wide screens, but their
   convergence is decorative. It resolves into a calm mini-workbench.
5. The workbench has exactly four persistent tabs, in this order:
   **Palette, Gradient, Image, Icon**.
6. Satellites and tabs are not one-to-one. Semantic, Tint and Contrast remain
   direct tool links; they do not become extra tabs.
7. The Image panel has exactly three built-in reference sub-tabs:
   **Architecture, People, Nature**.
8. Image output intent defaults to **4K · WebP · Lossless**.
9. “Try your image” opens the operating-system picker synchronously from the
   click/keyboard activation. Selected files transfer once to
   `/file-converter`; cancel leaves the visitor on the homepage.
10. The Icon panel is a limited, ephemeral preview. “Continue in Icon Editor”
    opens a validated draft in the real editor and grants no authentication,
    quota or Pro capability.
11. The entire promise and workbench remain readable and operable if GSAP is
    late or unavailable. Reduced-motion and mobile presentations are calm and
    static.

## 4. Information and DOM hierarchy

Keep this order in both the visual layout and accessible document:

1. Existing public navigation.
2. Hero copy:
   - operating-workspace kicker;
   - approved H1;
   - one concrete supporting sentence naming real work;
   - existing primary conversion action and workspace-exploration action;
   - honest free-plan qualifier.
3. A labelled `nav`/list of the eight live tool links.
4. The mini-workbench section, directly adjacent to the hero:
   - short “Live workspace” eyebrow;
   - visible heading: **“Turn scattered tools into one working surface.”**
   - one sentence explaining that the preview is limited and interactive;
   - four-tab list;
   - one persistent tab panel region;
   - one panel-specific continuation action.
5. Existing lower homepage narrative.

Do not insert a logo strip, abstract manifesto, metric strip, testimonial,
floating notification stack or explanatory interstitial between hero and
workbench.

## 5. Satellite contract

| Satellite label | Stable route | Workbench family | Wide-screen zone |
|---|---|---|---|
| Palette | `/color/palette` | Palette | upper left |
| Semantic | `/color/semantic` | Palette | left |
| Tint | `/color/tint` | Palette | lower left |
| Gradient Generator | `/color/gradient` | Gradient | upper right |
| Contrast | `/color/contrast` | Palette | right |
| Icon Library | `/icons` | Icon | outer right |
| File Converter | `/file-converter` | Image | lower right |
| Aspect & Resolution | `/ratio` | Image | lower outer edge |

The positions are authored and deterministic, not randomised per load. Apparent
disorder comes from varied offsets and paths, not from collisions, unreadable
rotation or changing order. The H1, supporting copy and CTAs retain a clear
reading area. Satellite labels are never truncated.

Use anchors for the eight destinations. Hover or focus may identify the
corresponding workbench family, but must not select a tab, navigate, rewrite the
URL or make another link unavailable.

## 6. Convergence and reveal

The large-screen enhancement tells one causal story:

1. At rest, the eight tool links surround but do not obstruct the hero.
2. As the workbench approaches, aria-hidden visual proxies travel along short,
   controlled paths toward their mapped family tab.
3. Multiple colour satellites resolve toward Palette; both media satellites
   resolve toward Image. This visibly explains why eight tools do not create
   eight tabs.
4. The proxies fade as the already-present workbench becomes the clear focus.
   The real links stay untouched in the document and naturally leave the
   viewport with the hero.
5. Scrolling upward may reverse the decorative sequence. Do not pin the user,
   hijack scrolling or delay access to the workbench.

Only decorative proxies may depend on GSAP. Do not transform a focused anchor
into a tab, duplicate an accessible name, toggle core controls `inert`, or make
the workbench opacity depend on a completed timeline. If GSAP import fails,
remove the enhancement state and leave the static composition visible.

## 7. Mini-workbench contract

### Shared tab behaviour

- Default tab: Palette.
- Use a real ARIA tablist with one roving tab stop. Arrow Left/Right, Home and
  End move and activate tabs; Tab enters the active panel.
- Tab selection is client state only. It must not alter the satellite links.
- Each panel is a limited real interaction, not a screenshot. It clearly names
  its continuation destination.
- Switching tabs preserves edits for the current homepage session. Reload
  returns to safe defaults; no account/project write occurs.

### Palette

- Show five working swatches.
- Allow generate, lock/unlock and copy. Copy success is announced without
  replacing the swatch’s accessible name.
- “Continue in Palette Builder” opens `/color/palette`.
- Clipboard failure keeps the palette and offers a human-readable retry/manual
  value; it never reports false success.

### Gradient

- Show a real two-stop gradient with editable stop colours and an angle control.
- Show the generated CSS value and allow copy.
- “Continue in Gradient Generator” opens `/color/gradient`.
- Invalid colour input leaves the last valid preview intact and explains the
  correction. The panel must not claim export or saved-project state.

### Image

The panel is an **output draft**, not a completed conversion.

**Built-in references**

- A nested tablist contains Architecture, People and Nature in that order.
- Each reference uses a bundled responsive thumbnail with meaningful alt text.
  It must not depend on a stock-image CDN or fetch a 4K source.
- On first entry and Reset, every reference begins with the same output intent:
  4K, WebP, Lossless.
- Changing reference does not silently discard output choices the visitor has
  already changed.

**Controls**

- Resolution: 4K default, 2K and Original.
- File-type selector: WebP default, then PNG, JPEG and AVIF—the image formats
  already offered by File Converter.
- Compression intent: Lossless default, plus only capability labels that the
  real converter can validate. A format that cannot honour Lossless must say so
  before handoff and must never imply that conversion is complete.
- Reset restores Architecture and 4K · WebP · Lossless.

**Try-your-image handoff**

1. The visible “Try your image” button directly calls the hidden image input’s
   `.click()` within the same trusted activation handler—no promise, timeout,
   animation callback or navigation runs first.
2. The input accepts the same image types as File Converter and supports the
   converter’s batch behaviour.
3. Cancel produces no route or state change, no error toast and no synthetic
   “cancelled” telemetry.
4. If files are selected, validate that at least one is an image. Unsupported
   selections stay on the homepage with an inline error and recovery action.
5. Put accepted `File` objects and the validated output draft into an in-memory,
   versioned handoff, then navigate once to `/file-converter`.
6. File Converter atomically takes and clears that handoff. React remounts,
   Back/Forward navigation and a second converter visit must not import it again.
7. Filenames, file bytes and image content never enter the URL, localStorage,
   sessionStorage or analytics.
8. Direct navigation or a reload cannot recover in-memory `File` objects.
   File Converter must show its normal empty choose/drop state. It may open a
   picker only after a fresh pointer or keyboard activation; never on mount.
9. If the full converter cannot honour part of the draft, keep the files and
   show the adjusted setting explicitly rather than silently changing it.

### Icon

- Use a small, bundled allowlist of recognisable icons from one live-supported
  pack. Do not call Iconify, Logo.dev or another catalogue from the homepage.
- Controls are intentionally limited to icon choice, a small supported size set
  and a bounded stroke-width set. They update one visible preview.
- No homepage action saves to My Icons, writes recents, downloads, copies an
  asset, counts against a quota or claims a completed custom icon.
- The draft has a version, supported pack/name, allowed size and bounded stroke.
  Validate it before navigation and again before the editor applies it. Ignore
  unknown keys and reject arbitrary SVG/HTML, URLs, colours or executable data.
- “Continue in Icon Editor” is enabled only for a valid draft and opens
  `/icons` with that draft selected. A direct/reloaded editor route falls back to
  normal editor state if the ephemeral draft is absent or invalid.
- The editor’s existing authentication, free limits and Pro checks remain the
  sole authority. The homepage handoff cannot set plan, entitlement, save or
  quota state.

## 8. State and failure matrix

| State | Required behaviour |
|---|---|
| Static/GSAP unavailable | Headline, eight links, four tabs and active panel are visible and usable; no blank gap or stranded hidden class. |
| Reduced motion | No convergence, parallax, magnetic CTA or animated panel remount. Use the calm static layout. |
| Loading reference thumbnail | Reserve its aspect ratio; show a neutral local placeholder without moving controls. |
| Reference image error | Keep its label and settings; explain preview unavailability and allow another reference or upload. |
| Empty picker/cancel | Stay on the Image panel with the existing draft untouched. |
| Invalid upload | Stay home, retain the draft, identify supported image input and allow retry. |
| Handoff/navigation error | Stay home, retain the selected files only in memory, re-enable the action and explain retry. |
| Offline | Hero, bundled references, palette, gradient and icon preview continue locally; internal navigation does not hang. |
| Clipboard denied | Keep visible text and announce that it can be selected manually. |
| Invalid icon draft | Do not navigate with it; restore the last valid preview or disable Continue with an explanation. |
| Repeated activation | Guard handoff/Continue while navigation is pending; one activation produces one transfer. |

## 9. Responsive behaviour

The experience must hold from 320px to 4K and at browser zoom.

- **Wide desktop:** use the authored irregular satellite field and decorative
  convergence. Cap line lengths and workbench width so 4K does not create a
  sparse theatre stage.
- **Small laptop/tablet:** reduce offsets and path distance. If the hero copy no
  longer has a collision-free centre, switch to the static satellite layout
  rather than squeezing the desktop composition.
- **768px and below:** no convergence. Present the eight links as a calm,
  source-ordered compact grid/list below the copy, followed immediately by the
  workbench.
- **480px and below:** controls stack, labels remain complete and touch targets
  do not overlap. The four workbench tabs remain one tablist; allow contained
  horizontal scrolling only if all four cannot fit at 320px.
- **320px floor:** no page-level horizontal overflow. Output selectors and
  continuation actions remain reachable without precision gestures.
- **4K ceiling:** do not scale satellites, copy or controls indefinitely; preserve
  a readable centred composition and deliberate negative space.

Pointer-coarse devices do not rely on hover. Orientation changes must not leave
stale motion transforms or a hidden/focused control.

## 10. Accessibility contract

- The visual “chaos” never changes source order. Hero copy precedes the eight
  links, which precede the workbench.
- Decorative rings, paths, proxies and trails are `aria-hidden` and
  non-focusable.
- Satellite links have unique names and visible focus. The longer Gradient and
  Aspect labels remain available to assistive technology and sighted users.
- The four primary tabs and three Image sub-tabs each follow the ARIA tabs
  keyboard pattern without nesting interactive controls inside a tab.
- Panel errors use `role="alert"` only when action is required; copy/status
  confirmations use a polite live region.
- Focus remains on the activating control during tab changes. After a successful
  route handoff, the destination’s normal route focus management applies.
- Maintain current contrast and `:focus-visible` requirements. Do not encode
  satellite family or selected state by colour or motion alone.
- Test keyboard-only, screen-reader names, 200% zoom, reduced motion and
  forced-colour/high-contrast behaviour.

## 11. Performance budgets

- Add no new runtime dependency and no homepage call to a remote image or icon
  catalogue.
- Record the pre-change production bundle. The implementation may add at most
  **12 KB gzip** to homepage initial executable JavaScript; heavier panel logic
  must be lazy and user-triggered.
- GSAP/ScrollTrigger stay dynamically loaded and must not block headline,
  satellite or workbench rendering.
- The three bundled reference thumbnails together stay at or below
  **180 KB encoded**. Include intrinsic dimensions; load only the active
  reference eagerly.
- Do not load the File Converter’s FFmpeg JavaScript/WASM from the homepage.
- On a mobile Slow 4G/4× CPU profile, target LCP ≤ 2.5 s, CLS ≤ 0.05 and
  interaction response ≤ 200 ms. No satellite or panel may shift after fonts,
  motion or thumbnails resolve.
- Image draft preview work must not synchronously encode a 4K asset on the
  homepage. “4K” is an output intent handed to the full converter.

## 12. Telemetry opportunities

Use the existing analytics path only if events are added. Keep them aggregate:

- `home_satellite_open` — tool id, input method;
- `home_workbench_view` — once per page view, motion mode;
- `home_workbench_tab` — Palette/Gradient/Image/Icon;
- `home_image_reference` and `home_image_draft_change` — category and option,
  never file data;
- `home_image_picker_open` and `home_image_handoff` — selected count and broad
  size/type buckets only; do not infer or record cancel;
- `home_icon_continue` — allowlisted icon id and option buckets;
- `home_handoff_fallback` — absent, invalid or already-consumed handoff.

Never send filename, MIME metadata finer than a broad image family, image
content, object URL, exact dimensions, SVG markup or entitlement data.

## 13. Implementation boundaries

Expected future implementation touchpoints are `Home.jsx`,
`CreatePreview.jsx`, `toolTree.js`, `useHomeMotion.js`, `imageHandoff.js`,
`FileConverter.jsx`, `IconLibrary.jsx`, `global.css` and focused Playwright
coverage. Keep the hero-satellite model separate from the four-tab model.

Do not change auth, `SubscriptionContext`, Stripe, plan constants or API routes.
Do not add persistence merely to make a homepage preview survive reload.

## 14. Acceptance tests

The batch is accepted only when all of these pass:

1. H1 retains both approved sentences.
2. Exactly eight satellite anchors render with the labels/routes in §5; open in
   new tab and copied-link behaviour use those same routes.
3. Exactly four primary tabs render, in the approved order. Arrow, Home, End,
   Tab and Shift+Tab follow the tabs pattern.
4. Semantic, Tint, Contrast, File Converter and Aspect & Resolution do not
   appear as extra primary tabs.
5. Block or fail the GSAP chunks: hero, links and workbench remain visible,
   focusable and laid out without a hidden-state timeout.
6. Reduced-motion and ≤768px tests show the static arrangement and no
   convergence/parallax transform.
7. At 320, 380, 480, 768, 980, 1440 and 3840 widths there is no page overflow,
   collision, clipped label or unreachable control.
8. Palette generation/locking/copy and Gradient inputs/CSS copy produce real
   values and honest error/success states.
9. Architecture, People and Nature exist as nested tabs. First entry and Reset
   show 4K · WebP · Lossless; changing a reference does not discard edited
   output choices.
10. A trusted click/Enter on “Try your image” raises the file chooser
    synchronously. Cancel keeps the homepage URL, Image tab and draft unchanged.
11. Select multiple accepted images: `/file-converter` receives them and the
    output draft once. Revisit/remount does not duplicate them.
12. Reload or open `/file-converter` directly: no picker opens and no stale file
    appears; activating its choose/drop control still opens the picker.
13. Unsupported upload remains home with recovery copy; double activation
    cannot create two transfers.
14. Icon controls mutate only the local preview. Storage/recents and plan/quota
    state are identical before and after preview use.
15. A valid icon draft opens the real editor with supported values. Tampered or
    stale draft data is ignored/rejected and grants no capability.
16. Offline mode makes no Iconify/Logo.dev/reference-image requests and leaves
    every local panel usable.
17. Production build and zero-error lint pass; focused homepage, handoff,
    accessibility and responsive tests pass; the budgets in §11 are reported.

## 15. Anti-slop review

Target verdict: **Distinctive and coherent**.

Reject the implementation if any of these are true:

- the eight tools become interchangeable floating cards or orbiting decoration;
- motion is the only explanation of the eight-to-four relationship;
- fake dashboards, notifications, metrics, exports or user activity are added;
- “4K · WebP · Lossless” is presented as a completed conversion on the homepage;
- the composition stacks glow, glass, blur, oversized copy and motion as a
  substitute for hierarchy;
- generic claims such as “supercharge”, “effortless”, “AI-powered” or “at scale”
  replace the concrete tool and output language;
- mobile becomes a shrunken version of the chaotic desktop scene;
- removing the UIL4B logo leaves a stock SaaS hero rather than a recognisable
  progression from eight real tools to one working surface.

Final review questions:

1. Is every visible object either real navigation, a real control, state,
   output, or a clearly decorative causal cue?
2. Does the static version tell the same story as the animated one?
3. Does the workbench feel calmer than the hero without becoming generic?
4. Can a visitor predict what Continue/Try will do before activating it?
5. Are the preview’s limits as honest as its capabilities?

