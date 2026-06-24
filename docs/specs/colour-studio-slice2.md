# Colour Studio — Rebuild Design Spec · Slice 2

> Source: `design` agent, 2026-06-24. Engineer-ready. Continues
> [`colour-studio.md`](colour-studio.md) (Slice 1). Tracks Phase 1 of
> [`BUILD-PLAN-2026-06-23.md`](../BUILD-PLAN-2026-06-23.md) lines 137–139.
> **Slice 2** is the **per-swatch interaction layer**: the swatch popup redesign +
> hover/right-click context menu (CS#3.12), the colour-blindness variants view
> (CS#3.9), and manual per-swatch set (CS#3.16). It **extends** the shipped Slice 1
> palette builder — it does **not** replace the rail, the toolbar, or the `cs-pb-*`
> system.
>
> **What already exists (and what this slice does to it).** Slice 1 shipped a
> `ColorInfoPopup` (ColorStudio.jsx L232–446) — a **centered modal** with
> `values / contrast / shades / vision / usage` tabs, opened by the toolbar `(i)`
> button and by `onContextMenu` (both call `setInfoColor(color)`). It works, but it
> is **inline-style-heavy** (the `ci-*` classes at global.css L2343+ are
> half-classed, half-`style={{}}`), its **shades tab uses naïve RGB `mixHex` toward
> white/black** (not the tonal engine), its **CVD matrices are the low-fidelity
> Coblis/ColorJack set**, and **right-click and the toolbar do exactly the same
> thing** (no fast-path context menu). Slice 2 **rebuilds this popup as `cs-sw-*`**,
> **adds a real right-click context menu** (`cs-ctx-*`) as the fast path, **adds a
> palette-wide colour-blindness overlay** (`cs-cb-*`) distinct from the per-swatch
> Vision tab, and **promotes manual per-swatch set** to a first-class popup field.
> The old `ci-*` block and `ColorInfoPopup` are **removed** in this slice.
>
> **Engine note (no new colour library).** Everything here runs on the existing
> `src/utils/colors.js`: `tonalRamp`, `hexToHct`/`hctToHex`, `contrastRatio`,
> `luminance`, `linearized`/`delinearized` (currently module-private — see §5.4),
> `hexToRgb`, `hexToHsl`, `describeColor`. The **only** new colour code is the
> Machado-2009 CVD matrices + a linear-RGB `simCvd()` (replacing the current
> sRGB-space `simCVD`), added to `colors.js`. **No `/api` route** — entirely
> client-side.

---

## Slice 2 — Per-Swatch Interaction Layer

Scope: CS#3.12 (swatch popup redesign + context menu), CS#3.9 (colour-blindness
variants view), CS#3.16 (manual per-swatch set, promoted). Leaves named hooks for the
later Colour-System-popup and HQ-preview/paywall slices; touches none of them.

### 1. Goal & success metric

Turn a single swatch from a *value* into a **workbench**: in two gestures (hover-click
**or** right-click) a designer can answer "is this accessible?", "what does this look
like to a colour-blind user?", "give me a lighter/darker version", and "make this an
exact brand hex" — **without leaving the rail or losing their palette**. The signature:
the popup is *the same tonal engine as the rail, surfaced per-swatch* — shades are the
swatch's real `tonalRamp`, and choosing one **replaces the swatch in place**, so the
popup is a generative tool, not a read-only inspector.

- **Primary metric:** per-swatch interaction depth ↑ (popup-opens & shade-replacements
  per session) — proxy for "this palette is *mine* now", which drives **save** and
  **retention**. A palette the user has *tuned* is one they come back to.
- **Secondary:** accessibility-tool engagement (contrast checks + CB-view toggles) — a
  differentiator vs Coolors (whose contrast/CB tooling is buried in Pro export) and a
  trust signal (first-impression / halo). Time-to-exact-brand-colour ↓ (CS#3.16).
- **Guardrail:** popup open → first meaningful pixel **< 100ms** (all maths is
  synchronous; no spinner is permitted, see §8). The interaction must feel like the
  swatch *unfolded*, not like a page loaded.

### 2. References (steal / adapt / avoid)

**Coolors — swatch column menu** (verified, free tier): each swatch exposes
**View shades** (full light→dark range for any swatch), **Copy**, **Adjust**, and a
**Contrast Checker** with a "click to fix" accessible-alternative suggestion; **CB
simulation + shades live behind Pro PDF export**.
[coolors.co](https://coolors.co/) · [Coolors guide 2026](https://eisterix.com/how-to-master-coolors-the-ultimate-guide-for-marketers-and-saas-developers-in-2026/)
- **Steal:** "View shades" as a per-swatch action; contrast-check living *on* the
  swatch; one-click copy of any value.
- **Adapt:** our shades are the **HCT `tonalRamp`** (perceptually even, hue-stable), not
  Coolors' lightness range — and **clicking a shade replaces the swatch** (Coolors only
  lets you copy or open a new palette). That replace-in-place loop is our signature move.
- **Avoid:** **paywalling CB-sim and contrast** like Coolors does. These are
  *accessibility utilities*; gating them is hostile and off-brand for a premium tool.
  We keep them **FREE** (§7) — the lock lives on **export**, not on understanding.

**Realtime Colors — contrast read-out** (verified): a **traffic-light** system — red
< 4.5 (fails AA), yellow 4.5–7 (AA, not AAA), green ≥ 7 (AAA). Contrast shown live on a
real layout. [realtimecolors.com/docs/contrast-checker](https://www.realtimecolors.com/docs/contrast-checker/)
- **Steal:** the **three-band traffic-light grammar** — it's instantly legible and
  matches the mental model designers already carry. We map it to our `--ok/--warn/--err`
  tokens (our `ci-qc-badge .pass/.warn/.fail` already does this — port it).
- **Adapt:** we show the **numeric ratio + the named tier (AA / AA Large / AAA / Fail)**
  alongside the colour band — number for the spec-writer, band for the scanner (serves
  both the analytic and the glance reader; layer-cake scanning).
- **Avoid:** a full live-website preview here — that's the later HQ-previews slice. The
  popup's contrast view is **focused** (swatch vs white/black/siblings), not a mock site.

**Adobe Leonardo / Adobe Express contrast analyzer** (verified): contrast is framed as a
**target to hit**, with adaptive theme tooling and a **colour-blind-safe** generation
mode; AA = 4.5:1 normal / 3:1 large, AAA = 7:1.
[github.com/adobe/leonardo](https://github.com/adobe/leonardo) · [Adobe contrast analyzer](https://color.adobe.com/create/color-contrast-analyzer)
- **Steal:** contrast presented as **pass/fail against named WCAG thresholds**, not a
  bare number; large-text vs normal-text distinction (3:1 vs 4.5:1).
- **Adapt:** we already have `fixForeground`/`fixBackground` in `colors.js` — surface a
  **"Fix"** affordance in the contrast view (Coolors' "click to fix", grounded in our
  own engine) that nudges the swatch to the nearest AA-passing tone. **FREE.**
- **Avoid:** Leonardo's heavy multi-key-colour generation model — out of scope; our
  contrast view is read-and-nudge, not a generator.

**Machado, Oliveira & Fernandes 2009 — physiologically-based CVD model** (verified): the
modern standard for dichromacy simulation — **linearise sRGB → 3×3 matrix → back to
sRGB**; models cone-response shift, more accurate than the geometric Brettel/Viénot
projection and far better than the per-channel Coblis matrices currently in the code.
DaltonLens recommends Brettel 1997 / Viénot 1999 / Machado 2009 as the credible family;
Machado is the cleanest single-matrix option for full dichromacy.
[Machado 2009 (UFRGS)](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html) · [DaltonLens — understanding CVD sim](https://daltonlens.org/understanding-cvd-simulation/) · [colorspace R](http://colorspace.r-forge.r-project.org/articles/color_vision_deficiency.html)
- **Steal:** the **linear-RGB pipeline** and Machado's **severity=1.0 matrices** for
  prot/deut/tritanopia (§5.4). This replaces the current `simCVD` (which multiplies
  **gamma** sRGB — visibly wrong, especially in midtones).
- **Adapt:** **achromatopsia** (CS#3.9 requires it; Machado doesn't cover it) =
  Rec.709 luma in **linear** light then re-encode — physically correct greyscale, not a
  naïve `(r+g+b)/3`.
- **Avoid:** shipping the full Machado **severity ramp** (anomalous trichromacy at every
  %) — overkill for a palette judge. We ship the **four canonical full-deficiency
  views** the brief names; the matrices are constants, the maths is one matrix-multiply.

**NN/g + Material — bottom sheets vs context menus** (verified): on large screens a
bottom-sheet action set **becomes a context menu** to preserve context; on mobile the
**thumb zone is the bottom ~40%**, so a bottom sheet beats a centered dialog for
reachability; long-press is the established mobile equivalent of right-click.
[NN/g bottom sheets](https://www.nngroup.com/articles/bottom-sheet/) · [Material bottom sheets](https://m2.material.io/components/sheets-bottom)
- **Steal:** **desktop = floating context menu at the cursor / floating popup near the
  swatch; mobile = bottom sheet** (same content, thumb-reachable). Long-press = the
  mobile context-menu trigger.
- **Adapt:** our floating popup **flips** off viewport edges (§4.A flip logic) the way a
  native menu does — Jakob's Law: it should behave exactly like the OS context menu the
  user already knows.
- **Avoid:** a centered modal on mobile (current `ci-overlay` behaviour) — it ignores
  the thumb zone and feels heavier than the gesture that summoned it.

### 3. The concept (signature move)

**"The swatch unfolds into its own engine."** Right-click (or long-press) a swatch and a
**compact context menu** springs from the cursor with the four verbs a designer actually
wants — **Copy · Shades · Contrast · Edit colour** — plus Lock/Remove. Click any of the
first three (or the toolbar `(i)`) and the swatch **unfolds into a popup that is the
tonal engine made visible**: its real `tonalRamp` as a clickable strip (**click → the
swatch *becomes* that shade, in place, live in the rail behind**), its contrast scored in
the Realtime-Colors traffic-light grammar against white/black/and *its palette
siblings*, and an exact-hex/native-picker field for brand-precise entry. Separately, a
single **"Colour vision" toggle** above the rail re-renders the **whole palette** through
Machado-2009 prot/deut/tritanopia + true-luma achromatopsia, so the designer judges the
*set*, not one chip. The through-line from Slice 1 holds: **everything is the tonal
engine** — Slice 1 made the palette tonal; Slice 2 makes every *interaction* tonal.

---

### 4. Concrete spec

Three coordinated surfaces, all `cs-`-prefixed, all in `global.css`, all theme-aware via
`color-mix`/tokens:

- **§4.A** `cs-ctx-*` — the right-click / long-press **context menu** (the fast path).
- **§4.B** `cs-sw-*` — the **swatch popup** (the deep path; replaces `ColorInfoPopup`/`ci-*`).
- **§4.C** `cs-cb-*` — the palette-wide **colour-blindness overlay** (CS#3.9).
- **§4.D** manual per-swatch set (CS#3.16) — woven into the popup's **Edit** field and
  the menu's **Edit colour** item.

---

#### A. CONTEXT MENU — `cs-ctx` (CS#3.12, right-click / long-press fast path)

**Trigger (desktop).** Replace the swatch's current
`onContextMenu={(e)=>{e.preventDefault(); setInfoColor(color)}}` (ColorStudio.jsx L1572)
with `onContextMenu={(e)=>{e.preventDefault(); openCtxMenu(i, e.clientX, e.clientY)}}`.
The native menu is suppressed; **ours** opens at the cursor. Left-click behaviour is
**unchanged** (select + copy, L1571).

**Trigger (touch).** **Long-press ≥ 450ms** on a swatch opens the menu **as a bottom
sheet** (§ responsive). Implement with `onTouchStart` → `setTimeout(450)` →
`openCtxMenu(i, null, null)` (null coords = sheet mode); **cancel** the timer on
`onTouchMove` (> 10px) / `onTouchEnd` / scroll so a tap-to-copy or a drag is never
hijacked. Suppress the synthetic context-menu and the 450ms tap's click
(`e.preventDefault()` in the long-press handler). Add `touch-action: manipulation` to the
swatch so the OS text-callout/selection doesn't fight the long-press.

**Menu content (the four verbs + structural actions).** Miller/Hick: keep it to **one
chunk of ≤ 6 items**, ordered by frequency, with the destructive action isolated:

```
┌─────────────────────────────┐
│  ▢ #3B82F6   PRIMARY         │  ← cs-ctx-head (live chip + role + hex, not a button)
├─────────────────────────────┤
│  ⧉  Copy            ⌘C       │  ← cs-ctx-item   (copies hex; closes)
│  ◳  View shades     ▸        │  ← cs-ctx-item   (opens popup → Shades)
│  ◑  Check contrast  ▸        │  ← cs-ctx-item   (opens popup → Contrast)
│  ✎  Edit colour…            │  ← cs-ctx-item   (opens popup → Edit, focuses hex input)
│  🔒 Lock / Unlock            │  ← cs-ctx-item   (toggleLock(i); stays open, label flips)
├─────────────────────────────┤
│  ⌫  Remove                   │  ← cs-ctx-item cs-ctx-danger (extras only; else hidden)
└─────────────────────────────┘
```

- **Copy** → `onCopy(color)`, close. **View shades / Check contrast / Edit colour** →
  `openSwatchPopup(i, 'shades' | 'contrast' | 'edit')`, close menu. **Lock** →
  `toggleLock(i)`, menu **stays open** (so the user can lock then act), label + icon
  flip live. **Remove** → `removeExtra(i - colors.length)`, close — **only rendered for
  `isExtra`** (anti-tamper-irrelevant, but keep the menu honest about what's possible on
  the base 5).
- The `cs-ctx-head` is **non-interactive** (a label), so arrow-key navigation lands on
  the first *action*, not the header.

**Positioning + flip (desktop).** Menu is `position: fixed`, rendered to a portal at
`document.body` (not inside the swatch — it must escape `overflow:hidden` on the card).
Open at `(clientX, clientY)`; then in a `useLayoutEffect`, measure
`menu.getBoundingClientRect()` and clamp:

- **Right edge:** if `x + menuW > innerWidth - 8` → `x = clientX - menuW` (flip to
  cursor's left).
- **Bottom edge:** if `y + menuH > innerHeight - 8` → `y = clientY - menuH` (flip up).
- **Both / no room:** clamp to `Math.max(8, Math.min(x, innerWidth - menuW - 8))` and the
  same for `y`. The menu **never** renders partly off-screen (Murphy: tiny viewport, §8).
- Set position via an **imperative ref** (`el.style.setProperty('--cs-ctx-x', x+'px')`)
  to honour the no-inline-styles rule (same pattern as Slice 1's thumb, colour-studio.md
  L481–483). Document the choice in the PR.

```css
.cs-ctx{
  position: fixed; z-index: 1200;            /* above rail(40), below toasts(>1500) */
  left: var(--cs-ctx-x, 0); top: var(--cs-ctx-y, 0);
  min-width: 208px; max-width: 256px; padding: 6px;
  background: color-mix(in srgb, var(--bg-1) 86%, transparent);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid var(--border);
  border-radius: var(--radius-l);
  box-shadow: var(--shadow-l), var(--ring);
  transform-origin: var(--cs-ctx-origin, top left);
  animation: cs-ctx-in .14s cubic-bezier(.16,1,.3,1) both;
}
@keyframes cs-ctx-in{ from{ opacity:0; transform: scale(.94) } to{ opacity:1; transform:none } }
.cs-ctx-head{
  display:flex; align-items:center; gap:8px;
  padding: 7px 9px 9px; margin-bottom:4px;
  border-bottom:1px solid var(--border);
}
.cs-ctx-chip{ width:16px; height:16px; border-radius:5px; border:1px solid var(--border); flex:0 0 auto }
.cs-ctx-role{ font-family:var(--mono); font-size:9px; font-weight:700; letter-spacing:.1em; color:var(--t2); text-transform:uppercase }
.cs-ctx-hex{ font-family:var(--mono); font-size:12px; font-weight:700; color:var(--t0); margin-left:auto }
.cs-ctx-item{
  display:flex; align-items:center; gap:10px; width:100%;
  padding: 8px 9px; min-height: 36px;
  border:none; background:none; cursor:pointer; text-align:left;
  font-family:var(--font); font-size:13px; font-weight:500; color:var(--t1);
  border-radius: var(--radius-s);
  transition: background .12s ease, color .12s ease;
}
.cs-ctx-item:hover, .cs-ctx-item.cs-ctx-active{ background:var(--hvr); color:var(--t0) }
.cs-ctx-item:focus-visible{ outline:2px solid var(--accent); outline-offset:-2px }
.cs-ctx-item svg{ flex:0 0 16px; opacity:.7 }
.cs-ctx-kbd{ margin-left:auto; font-family:var(--mono); font-size:10px; color:var(--t3); font-weight:600 }
.cs-ctx-arrow{ margin-left:auto; opacity:.5 }
.cs-ctx-sep{ height:1px; background:var(--border); margin:4px 6px }
.cs-ctx-danger{ color:var(--err) }
.cs-ctx-danger:hover{ background:color-mix(in srgb, var(--err) 12%, transparent); color:var(--err) }
```

**Dismissal.** Outside-click (`mousedown` on `document`, ignore clicks inside the menu),
`Escape`, scroll of the rail/window, `resize`, route change, and **selecting any item
that closes**. Restore focus to the originating swatch (`itemRefs`/swatch ref) on close.

**States (menu).** Default — springs in at cursor. Hover/roving-focus — `cs-ctx-active`
wash. Keyboard — `↓/↑` move (roving `tabindex`, wrap), `→`/`Enter` on Shades/Contrast/Edit
opens the popup, `Esc` closes, first item auto-focused on open. Disabled — n/a (we hide
rather than disable, except Remove which is conditionally rendered). Reduced-motion — the
`cs-ctx-in` scale collapses to a 0.01ms opacity swap (global `data-reduced-motion`).

---

#### B. SWATCH POPUP — `cs-sw` (CS#3.12, deep path; **replaces** `ColorInfoPopup` / `ci-*`)

The redesigned, fully-classed popup. **Removes** `ColorInfoPopup` (L232–446) and the
`ci-*` CSS (global.css L2343+). Same *capabilities* the stub had (the brief names
contrast / shades / info), re-expressed with the tonal engine, real CB matrices, no
inline styles, and a **role-aware "replace this swatch"** loop.

**Open paths.** (1) toolbar `(i)` button → `openSwatchPopup(i,'values')`; (2) context
menu items → `openSwatchPopup(i, tab)`; (3) the hex label click (Slice 1's
`cs-pb-hex` → native picker) is **superseded** — clicking the hex now opens the popup on
the **Edit** tab (the native picker lives *inside* the Edit field, §4.D), so there's one
coherent "edit" surface instead of two.

**Anatomy** (desktop = floating popover anchored to the swatch; mobile = bottom sheet —
same DOM, different positioning class):

```
┌───────────────────────────────────────────┐
│ ███████████████████████████████  [Edit ✎] │  cs-sw-hero (live swatch bg, fg=textColorForBg)
│ ███  Vivid Blue                  ███████   │  cs-sw-name (describeColor) + cs-sw-hex
│ ███  #3B82F6                     ███████   │
├───────────────────────────────────────────┤
│  Values    Contrast    Shades    Edit      │  cs-sw-tabs (role=tablist, sliding underline)
├───────────────────────────────────────────┤
│  VALUES tab:                               │  cs-sw-body (role=tabpanel)
│   HEX   #3B82F6                  ⧉         │  cs-sw-val-row (copy-each, FREE)
│   RGB   59, 130, 246             ⧉         │
│   HSL   217°, 91%, 60%           ⧉         │
│   HCT   258°, 88, 56             ⧉         │  ← from hexToHct(color)
│  ─────────────────────────────────────     │
│   [Aa on white 3.2:1 AA Lg] [Aa on blk …] │  cs-sw-quick (mini contrast preview)
└───────────────────────────────────────────┘
```

**Tabs (4, down from the stub's 5 — Hick).** `Values · Contrast · Shades · Edit`. The
stub's **"Usage"** (colorPsychology) and **"Vision"** tabs are **removed from the popup**:
Usage is editorial, not interaction — defer to the later colour-data slice (CS#5); the
per-swatch Vision tab is **superseded by the palette-wide CB overlay** (§4.C), which is
the more useful framing (judge the *set*). Keep `colorPsychology` and the old per-swatch
sim **out** of this slice's render path (don't delete the functions if CS#5 will reuse
`colorPsychology`; just stop importing them here). Default tab = `values` (or the tab the
opener requested).

**B.1 — Values tab (FREE).** Copy-each rows for **HEX / RGB / HSL / HCT**. (Drop CMYK,
HSB, OKLCH from the stub — they're print/niche; HCT replaces them because HCT *is* this
tool's native space and the most defensible "what is this colour" answer. If telemetry
later shows demand, they're trivial to re-add — but Hick's law says ship the 4 that
matter.) Each row is a `<button>` → `onCopy(formatted)` with a copy glyph + transient
"Copied" swap. HCT via `hexToHct(color)` → `[h, c, t]`, rounded. Below the rows, a
**mini contrast preview**: two cells, swatch-on-white and swatch-on-black, each with
ratio + traffic-light badge (the Realtime-Colors grammar) — a glanceable accessibility
read without leaving Values (peak moment: the answer is *right there*).

**B.2 — Contrast tab (FREE) — the accessibility centrepiece.** Three groups, layer-cake
ordered:

1. **vs white & vs black** (the universal pair): two cells, each rendering `Aa` sample
   in the swatch colour on that ground, with `contrastRatio(color, '#FFF')` /
   `'#000'`, the numeric ratio, and **two tier badges** — **Normal** (≥4.5 = AA, ≥7 =
   AAA) and **Large** (≥3 = AA) — so the designer knows it passes for headings even if
   it fails for body. Traffic-light: `--ok` (≥AA) / `--warn` (AA-Large only) / `--err`
   (fail).
2. **vs palette siblings** (the differentiator — Coolors/Adobe don't do this inline):
   for **each other swatch in the live palette**, a row: sibling chip · sibling role ·
   `contrastRatio(color, sibling)` · pass/fail badge **for UI-component contrast (≥3:1,
   the WCAG 1.4.11 non-text threshold)**. This answers "can I put my Primary text on my
   Subtle background?" — the real question when *building a system*, which is the whole
   point of a palette tool. Compute over `allColors` (the adjusted display palette)
   minus the active index.
3. **Text-on-this-colour:** white-text and black-text rows on the swatch (which reads
   on this colour), each with ratio + badge — answers "what label colour works here?"

**The "Fix" affordance.** On any **failing vs-white / vs-black** cell, a small
`cs-sw-fix` button: "Nudge to AA". Calls `fixForeground(color, ground, 4.5)` (already in
`colors.js`, L509) to find the nearest tone that hits 4.5:1, previews the candidate hex,
and on confirm **replaces the swatch** via `editPaletteColor(i, fixed)`. This is the
Coolors "click-to-fix" / Leonardo "target a ratio" move, grounded in *our* engine, and
it's **FREE** (accessibility is never paywalled). Show the before→after hex so the change
is legible (loss-aversion handled: it's a preview, the rail updates only on confirm; an
undo toast — reuse Slice 1's `showUndoToast` — lets them revert).

```css
.cs-sw-contrast{ display:flex; flex-direction:column; gap:var(--s-3) }
.cs-sw-cc-pair{ display:grid; grid-template-columns:1fr 1fr; gap:var(--s-2) }
.cs-sw-cc{ padding:var(--s-3); border-radius:var(--radius); border:1px solid var(--border); display:flex; flex-direction:column; align-items:center; gap:4px }
.cs-sw-cc-aa{ font-size:26px; font-weight:800; line-height:1 }           /* the Aa sample */
.cs-sw-cc-ratio{ font-family:var(--mono); font-size:13px; font-weight:700 }
.cs-sw-badges{ display:flex; gap:4px }
.cs-sw-badge{ font-size:9px; font-weight:700; letter-spacing:.04em; padding:2px 6px; border-radius:5px }
.cs-sw-badge.pass{ background:color-mix(in srgb,var(--ok) 16%,transparent); color:var(--ok) }
.cs-sw-badge.warn{ background:color-mix(in srgb,var(--warn) 16%,transparent); color:var(--warn) }
.cs-sw-badge.fail{ background:color-mix(in srgb,var(--err) 16%,transparent); color:var(--err) }
.cs-sw-fix{ margin-top:6px; font-size:11px; font-weight:700; color:var(--accent); background:none; border:1px solid var(--border); border-radius:var(--radius-s); padding:5px 10px; cursor:pointer }
.cs-sw-fix:hover{ border-color:var(--bh); background:var(--hvr) }
.cs-sw-siblings{ display:flex; flex-direction:column; gap:2px }
.cs-sw-sib-row{ display:flex; align-items:center; gap:10px; padding:7px 8px; border-radius:var(--radius-s) }
.cs-sw-sib-chip{ width:18px; height:18px; border-radius:5px; border:1px solid var(--border); flex:0 0 auto }
.cs-sw-sib-role{ font-family:var(--mono); font-size:10px; color:var(--t2); letter-spacing:.06em }
.cs-sw-sib-ratio{ margin-left:auto; font-family:var(--mono); font-size:12px; font-weight:700; color:var(--t1) }
```

**B.3 — Shades tab (FREE) — the signature loop.** The swatch's **real tonal ramp** as a
clickable strip, **clicking replaces the swatch in place**.

- **Source:** `tonalRamp(color, [10,20,30,40,50,60,70,80,90,95])` — a **10-stop** ramp
  (richer than the rail's 5-stop underside; this is the *expanded* view). `tonalRamp`
  preserves the swatch's HCT hue/chroma, so every stop is a true tone of *this* colour,
  perceptually even — the thing Coolors' lightness range can't guarantee.
- **Render:** a vertical list (`cs-sw-shade-row`) — each row is a `<button>`: tone chip ·
  tone label (`10`…`95`) · hex · contrast-vs-white ratio (so the ramp doubles as an
  accessibility scale, à la Material's "tone distance guarantees contrast"). Plus a
  compact horizontal strip (`cs-sw-shade-strip`) on top for the at-a-glance gradient.
- **The replace interaction (CS#3.12 core):** clicking a shade calls
  `editPaletteColor(activeIdx, shadeHex)` → the swatch in the rail behind the popup
  **becomes that shade live**, the popup's hero + tabs recompute to the new colour, and
  an **undo toast** fires ("Swatch set to #…", reuse `showUndoToast`). The active stop
  gets `aria-current="true"` + a ring. This is the generative payoff — the popup *edits*,
  it doesn't just *inform*. **Distinguish copy vs replace:** primary click = **replace**;
  a small per-row `⧉` = **copy** (so the user who only wants the hex isn't forced to
  mutate their palette). Label the tab's intent with a one-line helper:
  *"Click a shade to replace this swatch · ⧉ to copy."*

```css
.cs-sw-shade-strip{ display:flex; height:40px; border-radius:var(--radius-s); overflow:hidden; border:1px solid var(--border); margin-bottom:var(--s-3) }
.cs-sw-shade-seg{ flex:1; cursor:pointer; transition:flex .18s cubic-bezier(.16,1,.3,1) }
.cs-sw-shade-seg:hover{ flex:1.6 }                       /* peek the hovered stop */
.cs-sw-shade-row{ display:flex; align-items:center; gap:10px; width:100%; padding:8px; border:none; background:none; cursor:pointer; border-radius:var(--radius-s); transition:background .12s }
.cs-sw-shade-row:hover{ background:var(--hvr) }
.cs-sw-shade-row[aria-current="true"]{ box-shadow:inset 0 0 0 2px var(--accent) }
.cs-sw-shade-dot{ width:22px; height:22px; border-radius:6px; border:1px solid var(--border); flex:0 0 auto }
.cs-sw-shade-tone{ font-family:var(--mono); font-size:10px; color:var(--t3); width:24px }
.cs-sw-shade-hex{ font-family:var(--mono); font-size:12px; font-weight:700; color:var(--t1) }
.cs-sw-shade-ratio{ margin-left:auto; font-family:var(--mono); font-size:10px; color:var(--t3) }
.cs-sw-shade-copy{ flex:0 0 auto; padding:4px; border:none; background:none; color:var(--t3); cursor:pointer; border-radius:4px }
.cs-sw-shade-copy:hover{ color:var(--t0); background:var(--hvr) }
```

**B.4 — Edit tab (FREE) — manual per-swatch set (CS#3.16, promoted).** See §4.D.

**Popup chrome (shared).**

```css
.cs-sw-overlay{ position:fixed; inset:0; z-index:1100; display:flex; }   /* scrim only on mobile sheet; desktop is anchored, no scrim — see below */
.cs-sw{
  position: fixed; z-index: 1150;
  width: 340px; max-width: calc(100vw - 24px); max-height: min(560px, calc(100vh - 24px));
  display:flex; flex-direction:column; overflow:hidden;
  background: var(--bg-1); border:1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-l), var(--ring);
  animation: cs-sw-in .18s cubic-bezier(.16,1,.3,1) both;
}
@keyframes cs-sw-in{ from{ opacity:0; transform:translateY(6px) scale(.985) } to{ opacity:1; transform:none } }
.cs-sw-hero{ position:relative; padding:var(--s-5) var(--s-5) var(--s-4); display:flex; flex-direction:column; gap:2px; flex:0 0 auto }
.cs-sw-name{ font-size:13px; font-weight:700; letter-spacing:-.01em; opacity:.85 }
.cs-sw-hex{ font-family:var(--mono); font-size:26px; font-weight:700; letter-spacing:-.01em }
.cs-sw-edit-pill{ position:absolute; top:var(--s-3); right:var(--s-3); display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; padding:5px 10px; border-radius:var(--radius-pill); background:color-mix(in srgb,currentColor 0%,transparent); border:1.5px solid currentColor; cursor:pointer }
.cs-sw-tabs{ display:flex; position:relative; border-bottom:1px solid var(--border); background:var(--bg-2); flex:0 0 auto }
.cs-sw-tab{ flex:1; padding:11px 6px; border:none; background:none; font-family:var(--font); font-size:11px; font-weight:700; letter-spacing:.04em; color:var(--t2); cursor:pointer; transition:color .14s }
.cs-sw-tab:hover{ color:var(--t0) }
.cs-sw-tab.active{ color:var(--accent) }
.cs-sw-tab-underline{ position:absolute; bottom:-1px; height:2px; background:var(--accent); transition:transform .28s cubic-bezier(.34,1.56,.64,1), width .28s cubic-bezier(.34,1.56,.64,1) }  /* same sliding-pill technique as the page nav — visual continuity */
.cs-sw-body{ padding:var(--s-4) var(--s-5) var(--s-5); overflow-y:auto; flex:1 1 auto; overscroll-behavior:contain }
.cs-sw-close{ position:absolute; top:var(--s-3); left:var(--s-3); width:30px; height:30px; border:none; border-radius:50%; background:color-mix(in srgb,#000 30%,transparent); color:#fff; cursor:pointer; display:grid; place-items:center }
```

> **Hero swatch colour** is dynamic (`background:color`, `color:textColorForBg(color)`).
> Per the no-inline-styles rule, set these on a ref via
> `el.style.setProperty('--cs-sw-bg', color)` and `--cs-sw-fg`, with
> `.cs-sw-hero{ background:var(--cs-sw-bg); color:var(--cs-sw-fg) }`. Same imperative
> pattern as Slice 1's thumb and §4.A. All other dynamic colour chips (sibling chips,
> shade dots, CB cells) use the same custom-property approach. **Document in PR.**

**Positioning + flip (desktop, anchored popover).** Unlike the old centered modal, the
popup **anchors to the swatch** so the user keeps spatial context (the rail stays
visible behind — *no scrim on desktop*, so live shade-replacement is visible). Algorithm:

- Preferred placement **below** the swatch, left-aligned to it:
  `x = swatchRect.left`, `y = swatchRect.bottom + 8`.
- **Bottom overflow:** if `y + popupH > innerHeight - 12` → place **above**:
  `y = swatchRect.top - popupH - 8`.
- **No room either side (short viewport):** center vertically and let `cs-sw-body` scroll
  (`max-height` already caps it).
- **Right overflow:** clamp `x = Math.min(x, innerWidth - popupW - 12)`; **left clamp**
  `x = Math.max(12, x)`.
- Same imperative `--cs-sw-x/--cs-sw-y` ref pattern.
- **Reposition on scroll/resize** (the anchor moves) — either reposition via the same
  measure or **close on rail-scroll** (simpler, and matches the context menu's dismissal;
  recommend **close on scroll** for v1 to avoid jank, with a note that sticky-follow is a
  later polish).

**Dismissal & focus.** Outside-click, `Esc`, route change. **Focus trap** while open
(Tab cycles within the popup), **focus the requested tab / the hex input** on open,
**restore focus** to the originating swatch on close. `role="dialog"`
`aria-modal="false"` on desktop (non-modal — rail stays usable), `aria-modal="true"` on
the mobile sheet (modal — scrim blocks the rail). `aria-labelledby` → the hero hex.

**States (popup).** Default — anchored, Values tab (or requested tab). Hover — row/seg
washes. Focus — visible rings on every control, trap active. Tab-switch — underline
slides (sliding-pill, echoing the page nav for continuity). Shade-click — rail swatch +
hero recompute live + undo toast. Fix-confirm — swatch updates + undo toast. Loading —
**none** (all synchronous; if `tonalRamp`/`hexToHct` throws on a pathological hex, the
function's own internal `try/catch` returns an HSL fallback — never empty). Empty —
impossible (a swatch always has a colour). Error — see §8. Reduced-motion — `cs-sw-in`,
underline-slide, and seg-peek collapse to instant.

---

#### C. COLOUR-BLINDNESS VARIANTS VIEW — `cs-cb` (CS#3.9, **palette-wide**)

**Recommendation: an overlay *mode on the existing rail*, not a separate panel.** The
question CS#3.9 answers is "does my **palette** survive CVD?" — which is about the
relationships *between* swatches (do Primary and Accent collapse into the same colour for
a deuteranope?). That judgement only works if the swatches stay in their **same
positions, same sizes, side by side** — exactly what the rail already is. A separate
panel would force a mental re-mapping ("which of these is my Accent again?"). So: a
**segmented toggle above the rail** swaps the rail's render between **Normal** and four
CVD modes; the swatches morph in place.

**Placement & control.** A `cs-cb-toggle` segmented control sits in the palette-builder
header, near the Randomise button (Slice 1's `cs-pb-randomize`), grouped with palette-level
actions (Gestalt: common region). Six segments — **Normal · Protan · Deutan · Tritan ·
Achroma** — using the **same sliding-pill technique** as the page nav and the popup tabs
(visual through-line). Default = **Normal** (off — the rail shows true colour; CVD is an
*opt-in lens*, never the resting state — Murphy: a user must never think their palette is
actually grey).

```
  [ Randomise ⎵ ]            Colour vision:  ( Normal | Protan | Deutan | Tritan | Achroma )
  ┌──────┬──────┬──────┬──────┬──────┐
  │      │      │      │      │      │     ← the existing cs-pb-rail, recoloured through the active CVD matrix
  └──────┴──────┴──────┴──────┴──────┘
```

**Mechanism (the key anti-jank decision).** When a CVD mode is active, compute a
**parallel display array** `cbColors = allColors.map(c => simCvd(c, mode))` and feed
*that* to the swatch backgrounds — **do not** mutate `baseColor`/`overrides`/`allColors`
(the source of truth stays the true palette; the CB view is a pure presentation lens,
exactly like Slice 1's `applyAdjust` is a lens over `baseColors`). The rail keeps the
**true hex labels** but adds a subtle banner so the user knows the *colours* are
simulated:

- Each swatch's **background** = simulated; its **hex label** = **true** hex (you're
  judging how the real colour *appears*, but the value is still the real value). Add a
  per-swatch `cs-cb-tag` micro-label ("simulated") and a rail-level banner
  `cs-cb-banner`: *"Simulating deuteranopia (green-blind) — colours shown are how your
  palette appears; hex values are unchanged."* with a **"Back to normal"** link.
- **Tints underside, toolbar, gap-insert, drag** are **suppressed/disabled** in CB mode
  (you don't edit through a simulation — you *judge*, then exit). The popup and context
  menu are also disabled in CB mode (right-click does nothing but a toast hint:
  *"Exit colour-vision mode to edit."*). This keeps the mode unambiguous (one job per
  screen) and prevents the footgun of "I picked a colour that was actually the simulated
  one."
- **Confusion hint (premium touch, FREE):** when a CVD mode is active, compute pairwise
  CVD-space distance between swatches; if any two simulated colours are within a small
  ΔRGB threshold, badge them with `cs-cb-clash` ("These two are hard to tell apart for
  this vision type"). This is the *insight* a designer can't get from Coolors — it turns
  a passive simulation into actionable feedback (Zeigarnik: it gives them something to
  fix). Use a cheap Euclidean RGB distance on the simulated hexes (threshold ≈ 28/255);
  this is a heuristic flag, labelled as such, not a clinical claim.

```css
.cs-cb-toggle{ display:inline-flex; position:relative; padding:3px; gap:0; background:var(--bg-2); border:1px solid var(--border); border-radius:var(--radius-pill) }
.cs-cb-seg{ position:relative; z-index:1; padding:6px 12px; min-height:32px; border:none; background:none; cursor:pointer; font-family:var(--font); font-size:12px; font-weight:600; color:var(--t2); white-space:nowrap; transition:color .18s }
.cs-cb-seg:hover{ color:var(--t0) }
.cs-cb-seg.active{ color:var(--accent-fg) }
.cs-cb-thumb{ position:absolute; top:3px; z-index:0; height:calc(100% - 6px); border-radius:var(--radius-pill); background:var(--brand); box-shadow:0 2px 8px -2px var(--brand-glow); transform:translateX(var(--cs-cb-x,0)); width:var(--cs-cb-w,0); transition:transform .42s cubic-bezier(.34,1.56,.64,1), width .42s cubic-bezier(.34,1.56,.64,1) }
.cs-cb-banner{ display:flex; align-items:center; gap:10px; margin-bottom:var(--s-3); padding:9px var(--s-4); border-radius:var(--radius); background:color-mix(in srgb,var(--brand) 8%,var(--bg-2)); border:1px solid color-mix(in srgb,var(--brand) 24%,var(--border)); font-size:12px; color:var(--t1) }
.cs-cb-banner-icon{ flex:0 0 auto; color:var(--brand) }
.cs-cb-banner-exit{ margin-left:auto; font-weight:700; color:var(--accent); background:none; border:none; cursor:pointer; font-size:12px }
.cs-cb-tag{ position:absolute; top:6px; right:6px; font-size:8px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:2px 5px; border-radius:4px; background:color-mix(in srgb,#000 38%,transparent); color:#fff }
.cs-cb-clash{ box-shadow:inset 0 0 0 2px var(--warn) }
```

**The CVD maths** lives in `colors.js` (§5.4): `simCvd(hex, 'protanopia'|'deuteranopia'|
'tritanopia'|'achromatopsia')` — **linearise → matrix (or luma) → delinearise**, using
**Machado-2009 severity-1.0** matrices. This **replaces** the current sRGB-space
`CVD_MATRICES`/`simCVD` (L219–230), which is the wrong pipeline and lower fidelity.

**Responsive (CB toggle).** >768 inline 5-segment pill in the header. ≤768 the pill wraps
below the Randomise row, full-width, segments `flex:1`. ≤480 segments may abbreviate
(`Normal · Prot · Deut · Trit · Achr`) with full `aria-label`s; if still cramped, the
toggle becomes a labelled `<select>` styled as `cs-cb-select` (Hick: a select is fine for
5 mutually-exclusive options on a tiny screen) — recommend the select fallback at ≤380.

**States (CB view).** Default — Normal (off). Active — rail recoloured + banner +
per-swatch tags + clash badges; editing affordances suppressed. Toggling — thumb slides,
swatch backgrounds cross-fade (`transition:background .2s` on the swatch, suppressed under
reduced-motion). Reduced-motion — instant swap, banner still appears. Error — `simCvd`
internal `try/catch` returns the original hex on a bad input (never a blank swatch).

---

#### D. MANUAL PER-SWATCH SET — (CS#3.16, in the popup **Edit** tab + menu **Edit colour**)

Slice 1 already ships the **hidden-overlay `<input type=color>`** pattern
(`cs-pb-base-input`, `cs-add-pick-input`, `cs-pb-edit`; global.css L251/280). Slice 2
**reuses that exact pattern** and gives manual entry a **proper home** in the popup so it
isn't a fiddly click-the-tiny-hex affordance.

**The Edit tab** (`cs-sw-edit`):

```
┌───────────────────────────────────────────┐
│  EXACT COLOUR                              │
│   ┌──────┐  ┌──────────────────┐  ┌─────┐  │
│   │ ████ │  │ #3B82F6          │  │ Pick│  │   chip(opens native picker) · hex input · "Pick" btn
│   └──────┘  └──────────────────┘  └─────┘  │
│   ⚠ Enter a valid 6-digit hex             │   ← cs-sw-edit-err (only on invalid)
│  ─────────────────────────────────────     │
│   Recent: ▢ ▢ ▢ ▢ ▢                        │   cs-sw-recent (session history of edits, optional-but-nice)
│  ─────────────────────────────────────     │
│   This sets the swatch exactly. Global     │   helper: explains base/adjust reconciliation
│   adjust still applies as a lens.          │
└───────────────────────────────────────────┘
```

- **Chip** (`cs-sw-edit-chip`) wraps a hidden `<input type="color">` (the
  `cs-pb-base-input` pattern) → opens the OS-native colour picker; `onChange` →
  `commitEdit(value)`.
- **Hex input** (`cs-sw-edit-hex`) — a `<input type="text">`, mono font. Validates against
  `/^#?[0-9a-fA-F]{6}$/`, auto-prepends `#`, upper-cases. **On valid** → `commitEdit`.
  **On invalid** → `cs-sw-edit-err` message + red ring; **do not** mutate the swatch
  (Murphy: malformed hex never corrupts the palette). Accept paste of `3B82F6`,
  `#3b82f6`, and `rgb(59,130,246)` (parse RGB → hex; nice-to-have, gate behind a simple
  regex; if it doesn't match either pattern, error). Debounce commit by 120ms so typing
  mid-value doesn't thrash the rail.
- **"Pick" button** — explicit trigger that clicks the hidden native input (for
  discoverability; the chip is the same target — Fitts gives the user two ways in).

**Reconciliation with the Slice 1 base/adjust model (the load-bearing detail).** Manual
set writes through the **existing `editPaletteColor(idx, hex)`** (L1077), which already
routes correctly: idx 0 → `setBaseColor`; idx 1..(colors.length−1) → `overrides[idx]`;
extras → `extraColors`. **Critical:** `editPaletteColor` writes the **base layer**, and
the displayed swatch is `applyAdjust(base, globalAdjust)`. So if a global adjust is
active, the user types `#3B82F6` but sees the **adjusted** result, which is confusing for
an "exact" set. **Resolution:**

- If `globalAdjust` is **identity** (all zero — the common case), exact set is truly
  exact. ✓
- If `globalAdjust` is **non-zero**, the Edit tab shows an inline note:
  *"A global adjust is active — this swatch is set exactly, then the adjust lens is
  applied on top (shown in the rail). Reset adjust for a 1:1 match."* with a **"Reset
  adjust"** shortcut (calls the Slice 1 `setGlobalAdjust({h:0,s:0,b:0,temp:0})`). This is
  honest, non-destructive, and consistent with Slice 1's lens model — we do **not**
  invert the adjust to fake exactness (that would silently change the user's adjust
  settings). The hero swatch in the popup shows the **true set value**; a small
  "as shown in rail: #…" sub-line shows the post-adjust result when they differ, so the
  user sees both truths.
- **Locked swatches:** if the swatch is locked, editing it is still allowed (lock = "don't
  randomise", not "read-only") — but show a one-line note *"This swatch is locked; it
  won't change on Randomise."* so the user understands lock semantics. (Contrast against a
  locked swatch in the Contrast tab works normally.)

```css
.cs-sw-edit-field{ display:flex; gap:8px; align-items:center; margin-bottom:var(--s-3) }
.cs-sw-edit-chip{ position:relative; width:40px; height:40px; border-radius:var(--radius-s); border:1px solid var(--border); flex:0 0 auto; overflow:hidden; cursor:pointer }
.cs-sw-edit-chip input[type=color]{ position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; border:none; padding:0 }   /* the cs-pb-base-input pattern */
.cs-sw-edit-hex{ flex:1 1 auto; font-family:var(--mono); font-size:15px; font-weight:700; letter-spacing:.04em; padding:0 12px; height:40px; background:var(--inp); border:1px solid var(--border); border-radius:var(--radius-s); color:var(--t0) }
.cs-sw-edit-hex:focus-visible{ outline:2px solid var(--accent); outline-offset:1px; border-color:var(--accent) }
.cs-sw-edit-hex.invalid{ border-color:var(--err) }
.cs-sw-edit-pick{ height:40px; padding:0 14px; font-size:12px; font-weight:700; border:1px solid var(--border); border-radius:var(--radius-s); background:var(--card); color:var(--t1); cursor:pointer }
.cs-sw-edit-err{ font-size:11px; color:var(--err); display:flex; align-items:center; gap:5px; margin-bottom:var(--s-3) }
.cs-sw-edit-note{ font-size:11px; color:var(--t2); line-height:1.5 }
.cs-sw-recent{ display:flex; gap:6px; margin-bottom:var(--s-3) }
.cs-sw-recent-chip{ width:24px; height:24px; border-radius:6px; border:1px solid var(--border); cursor:pointer }
```

---

### 5. Implementation notes (our stack)

**5.1 Files touched.** `src/pages/ColorStudio.jsx` (remove `ColorInfoPopup` L232–446 and
its render L2218–2229; add `CtxMenu`, `SwatchPopup`, the `cs-cb` toggle + lens in the
builder; wire `openCtxMenu`/`openSwatchPopup`/long-press; replace the swatch's
`onContextMenu`). `src/styles/global.css` (add `cs-ctx-*`, `cs-sw-*`, `cs-cb-*`,
`cs-sw-edit-*`; **remove** the `ci-*` block L2343+). `src/utils/colors.js` (add
Machado-2009 matrices + linear-RGB `simCvd`; **export** `linearized`/`delinearized` — see
5.4). **No new files, no `/api` route, no CSS-in-JS, no inline styles.**

**5.2 New state (in `ColorStudio`).**

```jsx
const [ctxMenu, setCtxMenu] = useState(null)        // { idx, x, y, mode:'menu'|'sheet' } | null
const [swPopup, setSwPopup] = useState(null)        // { idx, tab } | null  (idx, not color — so it tracks live edits)
const [cbMode, setCbMode] = useState('normal')      // 'normal'|'protanopia'|'deuteranopia'|'tritanopia'|'achromatopsia'
const [recentEdits, setRecentEdits] = useState([])  // session hex history for cs-sw-recent
```

> **Track the swatch by index, not by colour value.** The old `infoColor` stored a hex
> string and did `allColors.indexOf(infoColor)` to find the index (L2224) — that breaks
> the instant the colour changes (shade-replace, fix, edit), and breaks on duplicate
> colours. Store `{ idx, tab }`; derive the live colour as `allColors[idx]` each render
> so the popup tracks edits correctly.

**5.3 CB lens in the rail.** In the rail map (ColorStudio.jsx L1529), derive the displayed
background:

```js
const trueColor = allColors[i]                                  // source of truth, unchanged
const shownColor = cbMode === 'normal' ? trueColor : simCvd(trueColor, cbMode)
// background = shownColor (via --cs-sw custom prop set on a ref, no inline style)
// hex LABEL still renders trueColor.toUpperCase()
```

Suppress `cs-pb-tools`, `cs-pb-tints`, gap zones, and `draggable` when `cbMode!=='normal'`
(conditionally render / `pointer-events:none` via a `.cs-pb-rail.cb-on` class). The CB
toggle's sliding thumb reuses the **exact measurement effect** from Slice 1's page nav
(colour-studio.md L461–479) — `getBoundingClientRect` of the active segment → `--cs-cb-x`/
`--cs-cb-w`. Lift it into a tiny reusable measure hook if the engineer prefers (DRY with
the page nav and the popup tab underline — three uses now justifies extraction).

**5.4 Colour engine additions (`colors.js`).** Append:

```js
// Machado, Oliveira & Fernandes (2009) severity = 1.0 (full dichromacy) matrices.
// Applied to LINEAR-light RGB (linearise sRGB → matrix → delinearise). These are the
// canonical published severity-1.0 values (DaltonLens / colorspace reproduce them);
// engineer: verify against the Machado 2009 table before merge.
const MACHADO_2009 = {
  protanopia: [
    0.152286, 1.052583, -0.204868,
    0.114503, 0.786281,  0.099216,
   -0.003882, -0.048116, 1.051998,
  ],
  deuteranopia: [
    0.367322, 0.860646, -0.227968,
    0.280085, 0.672501,  0.047413,
   -0.011820, 0.042940,  0.968881,
  ],
  tritanopia: [
    1.255528, -0.076749, -0.178779,
   -0.078411,  0.930809,  0.147602,
    0.004733,  0.691367,  0.303900,
  ],
}

// Linear-RGB CVD simulation (Machado 2009 for dichromacy; Rec.709 luma for
// achromatopsia). Replaces the old sRGB-space simCVD. Never throws: any bad
// input returns the original hex (Murphy's-law).
export function simCvd(hex, type) {
  try {
    if (type === 'normal') return hex
    const [r, g, b] = hexToRgb(hex)
    const lr = linearized(r) / 100, lg = linearized(g) / 100, lb = linearized(b) / 100  // 0–1 linear
    let nr, ng, nb
    if (type === 'achromatopsia') {
      const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb   // Rec.709 luma in linear light
      nr = ng = nb = y
    } else {
      const m = MACHADO_2009[type]
      if (!m) return hex
      nr = m[0]*lr + m[1]*lg + m[2]*lb
      ng = m[3]*lr + m[4]*lg + m[5]*lb
      nb = m[6]*lr + m[7]*lg + m[8]*lb
    }
    const enc = v => delinearized(Math.max(0, Math.min(1, v)) * 100)   // back to 0–255 sRGB
    return '#' + [enc(nr), enc(ng), enc(nb)].map(v => v.toString(16).padStart(2, '0')).join('')
  } catch { return hex }
}
```

- **`linearized` / `delinearized` are currently module-private** (L272–280). They must be
  **`export`ed** for `simCvd` to share the exact same transfer function the HCT engine
  uses (consistency + no duplicated gamma code). One-word change, no behaviour change to
  existing callers. (`luminance` already exists but operates on a slightly different
  threshold and returns weighted luma directly; reusing `linearized` keeps the CVD path
  on the same curve as HCT.)
- **`hexToHct`, `tonalRamp`, `contrastRatio`, `fixForeground`, `describeColor`, `hexToRgb`,
  `hexToHsl`** are **already exported** — call as-is. The Slice-1 `CVD_MATRICES`/`simCVD`
  (L219–230) and `colorPsychology` (L203) move/stay per 5.1 (delete `simCVD`; keep
  `colorPsychology` exported only if CS#5 will consume it, else remove with the popup).

**5.5 Portals & z-index.** Context menu and (mobile) sheet render via
`createPortal(node, document.body)` so they escape the swatch's `overflow:hidden` and the
rail's stacking context. Z-order: rail `40` → swatch popup `1100/1150` → context menu
`1200` → toasts/undo `>1500` (keep Slice 1's `cs-undo-toast` above everything). Only **one**
of {ctxMenu, swPopup} is open at a time (opening one closes the other).

**5.6 Reduced motion.** Nothing extra — global `data-reduced-motion` (global.css L7) zeroes
all our transitions/animations. Verify the CB swatch cross-fade, the popup `cs-sw-in`, the
context-menu `cs-ctx-in`, the tab underline, and the shade-seg peek all *appear instantly*
(opacity/position correct at 0.01ms) and nothing depends on an animation's `end` event.

**5.7 ProjectContext.** `cbMode` is **ephemeral UI state** — do **not** persist it (a saved
palette must reload as Normal, never as a simulation; Murphy). `recentEdits` is ephemeral
too. Shade-replace/fix/manual-set all write through the **existing** `editPaletteColor` →
already persisted via Slice 1's palette sync. No new persistence schema.

---

### 6. Accessibility checklist

- **Context menu:** `role="menu"`; items `role="menuitem"`; roving `tabindex` (`↓/↑` move
  with wrap, `Home/End` jump, `Esc` close, `→`/`Enter` activate); first item focused on
  open; focus **restored** to the swatch on close. `aria-label` per item. The header is
  `aria-hidden`/non-focusable. Long-press has an explicit non-gesture alternative: the
  toolbar `(i)` button already reaches the popup, and a future menu-from-toolbar can be
  added — flag that touch users without long-press (motor impairment) still reach every
  action via the toolbar + popup tabs (no action is context-menu-only).
- **Swatch popup:** `role="dialog"`, `aria-labelledby` → hero hex, `aria-modal="false"`
  desktop / `"true"` mobile sheet. **Focus trap** while open; focus the requested
  tab/control on open; **restore** on close. Tabs = `role="tablist"`/`tab`/`tabpanel`,
  `aria-selected`, `aria-controls`. Active shade = `aria-current="true"`. Copy buttons
  announce via the existing toast/`aria-live`. The "Fix" and shade-replace fire an
  `aria-live="polite"` announcement ("Swatch set to #2563EB, contrast on white now 4.6 to
  1, passes AA").
- **Contrast tab — eat our own dog food:** every badge meets AA against its background
  (the `--ok/--warn/--err` on `color-mix … 16%` grounds — verify each ≥ 4.5:1; if `--warn`
  amber-on-amber is thin, bump the text token or background mix). The `Aa` samples use the
  **actual** swatch/ground colours (that's the point), so their legibility *is* the data —
  don't "fix" a low-contrast sample, it's demonstrating the failure.
- **CB toggle:** `role="radiogroup"` `aria-label="Colour vision simulation"`; segments
  `role="radio"` `aria-checked`. When active, the `cs-cb-banner` is the visible text
  alternative (never rely on colour alone to signal "you're in a simulation"); the
  per-swatch `cs-cb-tag` + the banner text carry the meaning for screen-reader and
  colour-blind users alike. `cs-cb-clash` pairs out an `aria-live` note, not just a ring.
- **Manual set:** hex `<input>` has a `<label>`; invalid state sets
  `aria-invalid="true"` + `aria-describedby` → the error text. Native `<input type=color>`
  carries `aria-label`. ≥ 44px touch targets on chip/pick/segments (Fitts).
- **Keyboard reachability of the whole slice:** swatch (Tab) → toolbar `(i)` (Tab) →
  popup; **and** a keyboard equivalent for the context menu — `Shift+F10` / the
  `ContextMenu` key on a focused swatch opens `cs-ctx` (the OS convention; Jakob). Never
  trap a keyboard user with a menu they can only summon by mouse.
- **Contrast of our own UI:** `cs-ctx`/`cs-sw` text tokens (`--t0/t1/t2`) on
  `--bg-1`/glass — verify AA (these are the established Slice-1 popup tokens, already QA'd;
  re-confirm on the new glass `cs-ctx` background, which is more translucent — if `--t2`
  on 86% glass dips below 4.5:1 over a bright palette, raise the glass opacity to 90%).

### 7. Free vs Pro split (anti-tamper, CS#3.2)

**All three Slice-2 features are FREE.** They are **accessibility and core-editing
utilities** — the palette's basic *usability*. Per the founder guidance ("don't paywall
basic palette usability; Pro = ALL exports"), the paywall stays on **export**, not on
**understanding or editing your own palette**:

| Capability | Tier | Rationale |
|---|---|---|
| Context menu (Copy/Shades/Contrast/Edit/Lock/Remove) | **FREE** | Core interaction; gating it would cripple basic use and feel hostile (von Restorff in reverse — a locked right-click *teaches users to leave*). |
| Swatch popup — Values / Contrast / sibling-contrast / Fix-to-AA | **FREE** | Accessibility tooling. Coolors paywalls this; **we beat them by not** — a concrete, demonstrable advantage and a trust/halo driver. |
| Shades tab + **click-to-replace** | **FREE** | It's just editing your own swatch via the tonal engine — same as the rail's existing tints. Paywalling editing is absurd. |
| CB variants view (prot/deut/tritan/achroma + clash hints) | **FREE** | Accessibility. Coolors hides CB behind Pro PDF export; we surface it inline, free. Differentiator. |
| Manual per-swatch set (hex + native picker) | **FREE** | Core editing (Slice 1 already ships the base picker free). |
| **Exporting** any of the above (a CB-simulated palette, a contrast report, a shade scale as CSS/PNG/PDF) | **PRO** | Consistent with the slice-wide rule — **Free = save + share preview URL; Pro = ALL exports.** The *insight* is free; *taking it out of the app* is Pro. |

**Anti-tamper note:** because all three features are FREE, there is **no gated content to
hide** in this slice — so there's no render-then-CSS-hide risk here. The only Pro touch is
the **export** action, which is the existing later-slice quick-export gate (already
designed as not-rendered/server-gated for non-Pro). Slice 2 simply **does not add an
export button** to the popup/CB-view for non-Pro users (the button is conditionally
*not rendered* when `!isPro`, routing to `onProGate('export')` only if shown). No Pro maths
runs client-side for free users because **there is no Pro maths in this slice** — the CVD
matrices, tonal ramps, and contrast calc are all free-tier. This is the cleanest possible
anti-tamper posture: nothing to leak.

### 8. Murphy's-law states

- **Malformed hex entry (Edit tab):** validate `/^#?[0-9a-fA-F]{6}$/` before commit;
  invalid → red ring + `cs-sw-edit-err`, swatch **unchanged**. Never write a partial/NaN
  hex. Accept lower/upper/no-`#`; optional `rgb()` paste parse, else error. Debounce 120ms.
- **Contrast against a locked swatch:** works normally — contrast is read-only on the
  other swatch; lock only affects randomise. Show the "this swatch is locked" note in
  Edit, not in Contrast.
- **Popup/menu with no room to flip (tiny viewport / swatch at a corner):** the clamp
  branch (§4.A/§4.B) guarantees the surface is fully on-screen, scrolling its body
  (`cs-sw-body max-height`) rather than overflowing. On ≤ 480px both the menu and popup
  become a **bottom sheet** (full-width, max-height 85vh, drag-to-dismiss handle), which
  sidesteps flip entirely.
- **No loading state — and that's the requirement, not an omission:** every computation
  (`tonalRamp`, `hexToHct`, `contrastRatio`, `simCvd`) is **synchronous and sub-millisecond**
  for 5–6 swatches; a spinner would violate the Doherty threshold by *adding* perceived
  latency. If any engine call throws on a pathological value, its internal `try/catch`
  returns an HSL/identity fallback (already true for `tonalRamp`/`applyAdjust`; `simCvd`
  added with the same guard) — the surface renders with the fallback, never blank, never a
  white-screen.
- **Empty:** structurally impossible — a swatch always has a colour; the palette always
  has ≥ 1 swatch (Slice 1 invariant).
- **Double-click / rapid right-click:** opening a menu/popup while one is open **closes the
  first** (single-instance state). Double-clicking a shade fires `editPaletteColor` twice
  with the same value — idempotent, harmless; the undo toast debounces (reuse Slice 1's
  `showUndoToast` clear-then-set).
- **Rapid CB toggling:** `simCvd` is pure + cheap; spamming segments just re-derives the
  lens. The source palette is never touched, so there's nothing to corrupt.
- **localStorage disabled/full:** none of this slice writes storage directly; edits flow
  through the existing `editPaletteColor` → ProjectContext, which already wraps persistence
  in `try/catch` (Slice 1). `recentEdits`/`cbMode` are in-memory only.
- **Navigate away mid-edit:** popup/menu are local state; unmount cleans listeners
  (`mousedown`/`keydown`/`resize`/scroll/long-press timers) in the effect's cleanup — no
  leaked global handlers, no stuck scrim.
- **Offline:** entirely client-side; works offline. (The only network-touching action,
  Pro export, is a later slice and not rendered for free users.)
- **1000+ / many swatches:** Pro caps palettes at the existing limit; sibling-contrast in
  the popup is O(n) over ≤ a handful of swatches — trivial. If a future large palette
  exists, virtualise the sibling list (note for later; not needed now).

### 9. Responsive behaviour (320px → 4K)

- **> 768 (desktop):** context menu = floating at cursor (flip logic). Swatch popup =
  anchored popover below/above the swatch, **no scrim**, rail visible behind (live
  replace). CB toggle = inline 5-seg pill in the header. Hover reveals everything.
- **≤ 768 (tablet):** context menu and popup keep floating but widen
  (`max-width:calc(100vw-24px)`); CB toggle wraps below the Randomise row, full-width.
- **≤ 480 (phone):** **context menu → bottom sheet** (long-press summons it), **swatch
  popup → bottom sheet** (`aria-modal="true"`, scrim, slides up from bottom, drag-handle
  + drag-to-dismiss, max-height 85vh, `cs-sw-body` scrolls). This is the NN/g thumb-zone
  pattern — the sheet sits where the thumb already is. The Edit hex input gets a numeric/
  text keyboard; `inputmode="text"`. CB toggle = full-width segmented or abbreviated.
- **≤ 380 (tiny):** sheets hold; CB toggle becomes a labelled `<select>` (`cs-cb-select`)
  if 5 segments won't fit. Popup tabs may abbreviate. Touch targets stay ≥ 44px.
- **4K:** popup/menu keep their fixed `max-width` (340/256px) — they must not balloon;
  larger viewports just mean more breathing room and the popover anchors comfortably.
  `clamp`/`max-width` already cap them.

**Bottom-sheet specifics (`cs-sw.cs-sw-sheet`, `cs-ctx.cs-ctx-sheet`):**

```css
@media (max-width:480px){
  .cs-sw-overlay{ background:var(--scrim, rgba(8,9,11,.62)); align-items:flex-end }
  .cs-sw{ position:relative; width:100%; max-width:100%; max-height:85vh; border-radius:var(--radius-2xl) var(--radius-2xl) 0 0; animation:cs-sheet-up .24s cubic-bezier(.16,1,.3,1) both }
  .cs-sw::before{ content:''; display:block; width:36px; height:4px; border-radius:2px; background:var(--t3); margin:10px auto 2px }  /* grab handle */
  .cs-ctx{ position:fixed; left:0!important; right:0; bottom:0; top:auto!important; width:100%; min-width:0; max-width:100%; border-radius:var(--radius-2xl) var(--radius-2xl) 0 0; padding:8px 8px max(8px,env(safe-area-inset-bottom)); animation:cs-sheet-up .24s cubic-bezier(.16,1,.3,1) both }
  .cs-ctx-item{ min-height:48px; font-size:15px }   /* fat-finger targets */
}
@keyframes cs-sheet-up{ from{ transform:translateY(100%) } to{ transform:none } }
```

---

### 10. What NOT to do

- **Don't keep the centered `ci-overlay` modal on mobile.** It ignores the thumb zone;
  the gesture (long-press, low on the screen) must summon a **bottom sheet**, not a
  full-screen dialog that floats in the middle.
- **Don't paywall contrast, shades, CB-sim, or manual set.** These are accessibility/core
  utilities — Coolors gates them and it's a weakness we exploit. The lock is on **export**,
  never on understanding or editing your own palette.
- **Don't mutate the source palette for the CB view.** It's a **lens** over `allColors`
  (like `applyAdjust`), rendered to a parallel `cbColors` array. The true hex labels stay
  true; resetting to Normal must be a no-op on the data.
- **Don't keep the sRGB-space `simCVD` (L224).** It multiplies gamma-encoded values —
  visibly wrong in midtones. Replace with the **linear-RGB Machado-2009 `simCvd`**.
- **Don't compute shades with RGB `mixHex` toward white/black** (the stub's L261–263).
  Use `tonalRamp` — hue-stable, perceptually even, and the same engine as the rail.
- **Don't track the open swatch by colour value** (`indexOf(infoColor)`). Track by
  **index** — colour values change under shade-replace/fix/edit and can duplicate.
- **Don't leave inline styles.** Every dynamic colour (hero bg, chips, shade dots, CB
  swatches, positioning) goes through a CSS custom property set on a ref — the same
  documented pattern as Slice 1's nav thumb. No `style={{}}` in new JSX.
- **Don't make the right-click menu and the toolbar `(i)` do the same thing.** The menu is
  the **fast path** (Copy/Lock/Remove without a popup, jump straight to a tab); the popup
  is the **deep path**. Collapsing them wastes the gesture.
- **Don't render an export button in the popup/CB-view for non-Pro users.** It must be
  **not-rendered** (anti-tamper), not CSS-hidden — though note this slice ideally adds
  **no** export at all; export is the later quick-export slice.
- **Don't add a spinner.** All maths is synchronous; a loading state here *adds* perceived
  latency and breaks the "the swatch unfolded" illusion. Sub-100ms or it's broken.
- **Don't let the popup or menu render partly off-screen.** Flip, then clamp, then (mobile)
  fall back to a sheet. A corner swatch on a 320px screen must still get a fully-visible
  surface.
- **Don't suppress the long-press fallback for motor-impaired users.** Every context-menu
  action is **also** reachable via Tab → toolbar → popup tabs, and via `Shift+F10`. No
  action is gesture-only.
- **Don't persist `cbMode`.** A saved palette must always reload showing **true** colour —
  never a simulation a user might mistake for their real palette.
- **Don't fake "exact" set under an active global adjust.** Be honest: set the base
  exactly, show the adjusted rail result *and* the true value, and offer "Reset adjust".
  Never silently invert the lens.

---

**Open questions for the builder:** none. Matrices, class names, `colors.js` calls, state
shape, positioning maths, tier split, and every UX state are specified above. The only
pre-merge verification the engineer owes is a numeric check of the Machado-2009 matrix
constants in §5.4 against the canonical published table (cited), since the primary source
(`inf.ufrgs.br/~oliveira/...`) 403-blocked this fetch — the values given are the standard
severity-1.0 set reproduced by DaltonLens / the `colorspace` R package and are correct to
my knowledge, but a one-line cross-check is cheap insurance.

---

**Relevant file paths (all absolute):**
- Spec to save: `/home/user/UIL4B/docs/specs/colour-studio-slice2.md` (this document)
- Slice 1 spec (matched voice/structure): `/home/user/UIL4B/docs/specs/colour-studio.md`
- Page to edit: `/home/user/UIL4B/src/pages/ColorStudio.jsx` (remove `ColorInfoPopup` L232–446 + render L2218–2229; swatch `onContextMenu` L1572; toolbar `(i)` L1599; `editPaletteColor` L1077; CVD maths L219–230)
- Styles: `/home/user/UIL4B/src/styles/global.css` (add `cs-ctx-*`/`cs-sw-*`/`cs-cb-*`; remove `ci-*` L2343+)
- Colour engine: `/home/user/UIL4B/src/utils/colors.js` (add `MACHADO_2009` + `simCvd`; export `linearized`/`delinearized`; reuse `tonalRamp`/`hexToHct`/`contrastRatio`/`fixForeground`)
- Build plan item defs: `/home/user/UIL4B/docs/BUILD-PLAN-2026-06-23.md` (L137–139)

**Sources:**
- [Coolors](https://coolors.co/) · [Coolors 2026 guide (View shades, contrast, Pro CB export)](https://eisterix.com/how-to-master-coolors-the-ultimate-guide-for-marketers-and-saas-developers-in-2026/)
- [Realtime Colors — contrast checker (traffic-light grammar)](https://www.realtimecolors.com/docs/contrast-checker/)
- [Adobe Leonardo](https://github.com/adobe/leonardo) · [Adobe contrast analyzer](https://color.adobe.com/create/color-contrast-analyzer)
- [Machado, Oliveira & Fernandes 2009 — physiologically-based CVD model](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html) · [DaltonLens — understanding CVD simulation](https://daltonlens.org/understanding-cvd-simulation/) · [colorspace R — CVD emulation](http://colorspace.r-forge.r-project.org/articles/color_vision_deficiency.html)
- [NN/g — Bottom sheets](https://www.nngroup.com/articles/bottom-sheet/) · [Material — bottom sheets](https://m2.material.io/components/sheets-bottom)
