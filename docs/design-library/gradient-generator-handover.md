# Gradient Generator preview and artwork handover

Updated 26 November 2026 for `/create/gradient`.

## Make an asset

1. Start your own gradient and set its colours in **Stops**. **Fill → Fill style** opens a live swatch picker. **Composition** contains Plain, Mesh and Orb. **Finishes** contains the surface treatments.
2. For **Mesh**, select a numbered point in **Mesh points**. Drag it in the small map or click where it should sit. Horizontal and Vertical position it precisely. Spread changes how far its colour reaches. Click the hex swatch to recolour an individual point. **Add point** adds a stop in the widest gap, up to five points. The large canvas shows the result without editing handles.
3. For **Orb**, the same map moves the sphere. Diameter sets its size relative to the shorter side of the canvas. Colour stops run from its lit interior to its edge. The checkerboard shows transparent space. Place the orb slightly outside the frame for a cropped background asset.
4. Use Back and Redo to compare edits. **Save or share** saves the design to a project or copies a link that reopens the active composition. A new project follows the existing account and project-limit rules.

| What the designer needs | What to use |
|---|---|
| A mesh background that grows with a web element | Select **Mesh CSS** and copy the declarations into the element’s CSS rule. The responsive colour field uses the edited positions and spreads. |
| An orb that can sit over a page, photo or card | Select **Orb CSS**, copy the rule, and apply `class="orb-field"` to an empty block. Adjust its aspect ratio to match the destination. |
| A finished bitmap for a mockup, slide or design tool | Under **Save or share**, download the named fill PNG. This Pro export preserves the stage aspect ratio, at 2048 pixels on the longer edge. Mesh includes the preview grain. Orb includes alpha around the sphere. |
| The underlying linear, radial or conic ramp | Use CSS or Tailwind. Base SVG is available for linear and radial gradients through the existing file-download gate. |

## How the preview is assembled

The switch above the artwork chooses a **place**. Fill renders the selected composition or finish. Hero, Card, Button, Poster, Spec card, App icon and Phone put the base gradient into a specific layout. Returning to Fill restores the selected style. The compact picker uses the same neutral surfaces, selected outlines and touch targets as the other Create tools. Its overflow menu keeps the active place reachable at narrow widths.

### Visual direction for the next preview

The supplied Savee references pair optical studies with brand guideline sheets. In the fluted studies, each rib interrupts the same pool of light. In the guideline sheets, the typography, swatches and annotations explain how a colour is used. Carry those details into the appropriate preview. Fluted glass should bend a recognisable colour boundary. A specification card should label swatches with values sampled from the current ramp. A statement card should put the gradient on an identifiable part of the product, such as the foil, and leave the figures readable.

Check a treatment with a two-colour ramp and with several closely related colours. Look at both the picker thumbnail and the full canvas. Keep diagnostic labels and editing handles on the tool side of the export boundary so the downloaded asset can go straight into another design.

| Owner | Responsibility |
|---|---|
| [GradientGenerator.jsx](../../src/pages/GradientGenerator.jsx) | Owns stops, selection, artwork edits, undo, project updates, incoming links and export actions. |
| [gradientPreviewStyles.js](../../src/utils/gradientPreviewStyles.js) | Registers places and fill styles. Computes mesh colour sampling, geometry, CSS properties and portable background CSS. |
| [GradientArtworkEditor.jsx](../../src/components/tool/GradientArtworkEditor.jsx) | Edits normalised coordinates with pointer input or labelled sliders. Uses the same artwork renderer as the main stage. |
| [FillStylePicker.jsx](../../src/components/tool/FillStylePicker.jsx) and [PreviewSwitch.jsx](../../src/components/tool/PreviewSwitch.jsx) | Own the picker, live thumbnails, responsive overflow and keyboard navigation. |
| [GradientFx.jsx](../../src/components/tool/GradientFx.jsx) and [gradient-fill.css](../../src/styles/pages/gradient-fill.css) | Paint the artwork. The live stage, thumbnails, editing map and PNG share these rules. |
| [GradientText.jsx](../../src/components/tool/GradientText.jsx) and [gradient.css](../../src/styles/pages/gradient.css) | Lay out preview objects, typography, badges, editor controls and transparency grids. |
| [gradientFillImage.js](../../src/utils/gradientFillImage.js) | Copies the rendered artwork, embeds the selected texture, strips captions and framing, then rasterises it locally. |

## Geometry, persistence and compatibility

The base gradient owns the stops, interpolation space, angle and type. Mesh uses elliptical colour pools over the darkest stop. Two to five stops map to individual points in ramp order. Longer ramps are sampled at 0, 25, 50, 75 and 100 percent. Editing a point therefore moves a colour slot. Reordering stops can change the colour in that slot.

The optional `gradient.artwork` property holds `active`, `mesh` and `orb`. Each layout is an array of overrides with numeric `x`, `y` and `size`. A missing slot uses its authored default. Coordinates run from −10 to 110 percent and size from 20 to 160. For mesh, 100 is that pool’s original spread. For orb, 100 fills the shorter side of the canvas. Mesh accepts up to five overrides and Orb accepts one. Earlier project files open with defaults. Existing base-gradient exports and community submissions keep their ramp format.

The working design and project snapshot carry both layouts. A copied art link carries the current kind in `st` and its geometry in `sp`, alongside the usual stop parameters. A recipient can open it on another device. The reader bounds the payload, checks numeric values and clamps ranges. The artwork uses percentage coordinates so it adapts to a different frame. The PNG captures the precise crop of the exporting device.

## Extending the system

For another material that only changes a surface, add a fill ID, a renderer and artwork CSS. Keep editor labels, guides and checkerboards outside the exported layer. For an editable composition, also define its bounded geometry, defaults, undo snapshot and share representation. Render thumbnails from the same recipe as the stage.

For a future **background asset library**, store the base stops with the composition recipe and an aspect ratio. Generate the thumbnail from that recipe. An **Open in Gradient Generator** action can already use a gradient link with `st` and `sp`. Publishing, ownership and library indexing would be separate work. The existing Save or share flow provides project storage and downloadable assets today.

## Verification

Run the gradient unit tests and the browser specs below using the repo’s test-mode Vite build and prerender. Restore the normal production build before using the local preview as a release candidate.

- [Artwork editing and transfer](../../tests/user-sim/gradient-artwork.spec.js) exercises editing, undo/redo, reload, cross-device links and transparency in a downloaded orb.
- [Fill export parity](../../tests/user-sim/gradient-fill-image.spec.js) samples downloaded PNGs against the visible fills.
- [Preview picker](../../tests/user-sim/338-gradient-preview-styles.spec.js) covers live colour changes, keyboard selection and narrow screens.
- [Poster and specification card](../../tests/user-sim/353-gradient-poster-and-spec-card.spec.js) checks dimensions, readable text and clear space around the controls.
