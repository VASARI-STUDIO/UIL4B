// What the Palette Builder loads to open its preview: the dialog and the
// example it opens on, together, so the first frame is the picture and not an
// empty stage. The page calls this on a hover or focus of the Preview button and
// again when the dialog is rendered; the second call costs nothing.
import { DEFAULT_SCENE } from '../../data/palettePreviewScenes'

export function loadPreviewDialog() {
  return Promise.all([
    import('./PalettePreviewDialog'),
    import('./examples/registry').then((r) => r.preloadExample(DEFAULT_SCENE)),
  ]).then(([dialog]) => dialog)
}
