// What the Palette Builder loads to open its preview: the dialog and the
// example it opens on, together, so the first frame is the picture and not an
// empty stage. The page calls this on a hover or focus of the Preview button and
// again when the dialog is rendered; the second call costs nothing.
//
// The example is requested only once the dialog has arrived. A chunk failure is
// answered by a reload unless an example is loading (see examples/loading.js),
// and that flag is global: with both requests in flight after a redeploy, the
// dialog's own failure would be taken for the example's, no reload would follow
// and the page would land on its error screen.
import { DEFAULT_SCENE } from '../../data/palettePreviewScenes'

export function loadPreviewDialog() {
  return import('./PalettePreviewDialog').then((dialog) => (
    import('./examples/registry').then((r) => r.preloadExample(DEFAULT_SCENE)).then(() => dialog)
  ))
}
