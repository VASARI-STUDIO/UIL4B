// The states each preview can be shown in, for the dialog's State menu.
//
// The first entry of a list is the resting frame the preview opens on; the
// menu shows one state at a time, so a state never sits beside the resting
// frame. A preview with no entry here has no menu and shows one frame.
// Each example reads the id it is given as its `state` prop.
//
// Plain data, so the dialog can build the menu without loading the example.

export const PREVIEW_STATES = {
  product: [
    { id: 'overview', label: 'Overview' },
    { id: 'soldout', label: 'Sold out size' },
    { id: 'added', label: 'Added to bag' },
    { id: 'focus', label: 'Focused size' },
  ],
  card: [
    { id: 'overview', label: 'Overview' },
    { id: 'frozen', label: 'Card frozen' },
    { id: 'limits', label: 'Limits' },
    { id: 'declined', label: 'Declined payment' },
  ],
}

/** The states of a preview, resting first; an empty list when it has only one frame. */
export const statesOf = (sceneId) => PREVIEW_STATES[sceneId] || []
