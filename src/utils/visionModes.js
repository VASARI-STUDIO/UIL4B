// The colour-vision check's modes: ids (the ones simCvd understands), the plain
// name with the medical term in brackets, the short name for the toolbar trigger
// and the board strip, and one line saying what changes and how common it is.
// The figures are for the type family at full dichromacy, the form simCvd draws,
// except the mild mode, which counts the milder cousin of green-blind (deuteranomaly).
export const VISION_MODES = [
  { id: 'normal', name: 'Normal vision', short: 'Normal', hint: 'Your colours as you built them' },
  { id: 'deuteranomaly', name: 'Red-green, mild (deuteranomaly)', short: 'Red-green, mild', hint: 'Reds and greens look duller. 1 in 20 men' },
  { id: 'deuteranopia', name: 'Green-blind (deuteranopia)', short: 'Green-blind', hint: 'Reds and greens look alike. 1 in 100 men' },
  { id: 'protanopia', name: 'Red-blind (protanopia)', short: 'Red-blind', hint: 'Reds look dark and muddy. 1 in 100 men' },
  { id: 'tritanopia', name: 'Blue-blind (tritanopia)', short: 'Blue-blind', hint: 'Blues look green. Under 1 in 10,000 people' },
  { id: 'achromatopsia', name: 'No colour (achromatopsia)', short: 'No colour', hint: 'Only light and dark. 1 in 30,000 people' },
]

// Content colours, not theme tokens: each is the hue its mode loses, drawn as the
// dot in the mode's eye icon. They stay the same in light and dark and never come
// from the accent. Normal takes the text colour; achromatopsia is a hollow ring.
// The mild mode shares green-blind's hue; its icon draws a bigger open ring, left half filled.
export const VISION_HUES = {
  deuteranomaly: '#2E9E4F',
  deuteranopia: '#2E9E4F',
  protanopia: '#D93A3A',
  tritanopia: '#3B6FE0',
}

// Shown under the list, not an option.
export const VISION_NOTE = 'Red-green, mild shows a lighter form. The others show the strongest form. About 1 in 12 men and 1 in 200 women have some form of red-green colour blindness.'

export const visionMode = (id) => VISION_MODES.find((mode) => mode.id === id) || VISION_MODES[0]

// What the page's polite live region says when the mode changes.
export const visionAnnouncement = (id) => (id === 'normal'
  ? 'Colour vision check off.'
  : `Colour vision check on: ${visionMode(id).name.toLowerCase()}. The bottom half of each colour shows how it looks.`)
