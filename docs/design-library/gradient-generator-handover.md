# Gradient Generator preview handover

The generator at `/create/gradient` has three choices. **Gradient type** in the toolbar defines the paint. **Preview as** chooses where it appears. On **Fill**, **Fill style** adds an optional surface treatment.

## Walk through an edit

1. In the toolbar, choose Linear, Radial, Conic or Mesh. With Mesh selected, open **Mesh points**, select a numbered point and drag it on the map. Horizontal, Vertical and Spread give precise keyboard control. The colour swatch changes that point’s stop. **Add point** adds a stop in the widest gap, up to five points.
2. Choose **Webpage** above the artwork to see the gradient on the Frequency FM feature sleeve. Choose **App icon** to compare icon sizes, or **Poster** to see the same field beneath the Night swim lettering. Narrow screens put additional places in **More**. The point editor stays available in each scene.
3. Change a colour or move a point while the scene is open. Its gradient-bearing surfaces repaint immediately. Webpage keeps the masthead, schedule and sleeve lettering on paper so the layout stays legible. Poster and App icon choose an ink for the lettering or mark from the painted region.
4. Copy **CSS** or **Tailwind** to reuse the underlying gradient. Under **Fill → Plain**, **Save or share → Download Mesh PNG** exports the field at 2048 pixels on the long edge with Pro. Selecting a finish exports the treated surface. Save a project or copy a link to continue editing. SVG export supports the linear and radial types.

## Toolbar and inspector

The toolbar holds the gradient type, angle, interpolation space and locks. On a phone, **Angle and interpolation** expands the precision controls. **Reverse** flips the stops. **Random settings** opens a tray for the next random gradient. On narrow screens these actions move into the toolbar’s overflow menu. The inspector groups the editable stops, colour sources and the selected stop’s controls. Choosing Mesh adds its point map.

**Fill style** groups live thumbnails into Surface, Optics and Print & colour. Fresnel lens bends the field into concentric ridges. Risograph adds screened ink and grain. **Finish strength** mixes the chosen treatment with the original paint, from the original at 0% to the full treatment at 100%. The picker and exported PNG use the same strength. The browser tab remembers this setting when you change scenes or reload. On a phone, selecting a finish closes the sheet to reveal the canvas. Reopen it to adjust strength.

## Rendering a scene

[GradientGenerator.jsx](../../src/pages/GradientGenerator.jsx) owns the stops, type, geometry, undo history, shared links and preview selection. It builds one CSS image value and passes it to the stage, scene components, fill picker and editing map. A mesh is layered radial gradients over an opaque ground. The result works both as a background and inside a stack of background images.

| Scene | Where the gradient goes |
|---|---|
| Webpage | Record sleeve on the programme page, beneath the grooves and catalogue mark |
| Hero | Channel Ferry landing page behind the headline and arched ferry photograph |
| Card | Printed face of a Harbour Pass ticket beside its barcode stub |
| Button | Booking action in a ferry checkout, beneath the fare and departure details |
| Poster | Printed field beneath the typography, lane lines and grain |
| App icon | Frequency FM waveform tile in its store listing and compact player |
| Phone | Header of a mobile ferry boarding pass, with a stop colour on the action |
| Spec card | Colour field, with the stop values and samples underneath |

Use [GradientText.jsx](../../src/components/tool/GradientText.jsx) for measured lettering and object layouts and [gradient.css](../../src/styles/pages/gradient.css) for their composition. For another webpage or product scene, register the place in [gradientPreviewStyles.js](../../src/utils/gradientPreviewStyles.js) and apply the passed paint to the object that carries it. Use the current stops for any additional swatches. Keep paper, navigation, labels and framing separate from the artwork. Compare a two-colour ramp and an off-centre mesh on the same object to check that the template follows both.

[GradientFx.jsx](../../src/components/tool/GradientFx.jsx) and [gradient-fill.css](../../src/styles/pages/gradient-fill.css) draw finishes. Some finishes apply a material over the paint. Others, such as Waves, use the stops to construct their own shapes. [gradientFillImage.js](../../src/utils/gradientFillImage.js) exports the Fill canvas or finish layer. The scene controls, layout examples and editing handles stay outside the downloaded image.

## Mesh geometry and compatibility

[GradientArtworkEditor.jsx](../../src/components/tool/GradientArtworkEditor.jsx) edits up to five colour pools. Two to five stops map to points in stop-position order. Longer ramps sample at 0, 25, 50, 75 and 100 percent. Reordering stops can change the colour in a point slot. Horizontal and Vertical range from −10 to 110 percent. Spread ranges from 20 to 160 percent of the pool’s default extent. A missing point uses its default geometry.

The working design and saved project store `gradient.type = 'Mesh'` and optional overrides in `gradient.artwork.mesh`. Switching type preserves the mesh layout in the editor. The share URL uses `gt=mesh` and optional `sp` geometry. Earlier links with `st=mesh` and projects with `artwork.active = 'mesh'` open as Mesh. Earlier Orb links open the underlying gradient. Community submissions keep the type and stops in the queue payload. For Mesh, its URL field carries the editable generator link. The gallery reader recovers and validates the mesh geometry and interpolation space from that link.

## Verification

- [Artwork flows](../../tests/user-sim/gradient-artwork.spec.js) cover editing, undo, project saves, links and live paint on a webpage, poster and icon at desktop and phone widths.
- [PNG comparisons](../../tests/user-sim/gradient-fill-image.spec.js) sample downloaded images against the visible fill.
- [Picker behaviour](../../tests/user-sim/338-gradient-preview-styles.spec.js) and [poster and spec card layouts](../../tests/user-sim/353-gradient-poster-and-spec-card.spec.js) cover names, selection, keyboard operation and fit.
