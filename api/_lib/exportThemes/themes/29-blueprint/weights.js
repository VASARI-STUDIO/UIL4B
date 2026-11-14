// The weights each body family ships on Google Fonts (all SIL OFL), so the lettering sheet can show the ones a brand leaves out. Families not listed
// show only their loaded weights.
export const SHIPS = {
  Commissioner: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  'IBM Plex Sans': [100, 200, 300, 400, 500, 600, 700],
  Inter: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  'Albert Sans': [100, 200, 300, 400, 500, 600, 700, 800, 900],
  Barlow: [100, 200, 300, 400, 500, 600, 700, 800, 900],
};
export const WEIGHT_NAMES = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };

// the weights of the body family that the brand does not load: these are fetched as theme fonts so they can be drawn faint
export function unusedWeights(fonts) {
  const body = fonts.body, ships = SHIPS[body.family];
  if (!ships || body.axes) return [];
  const loaded = new Set([...body.weights, ...(fonts.display.family === body.family ? fonts.display.weights : [])]);
  return ships.filter((w) => !loaded.has(w));
}
