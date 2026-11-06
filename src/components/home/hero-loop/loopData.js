// Data and pure helpers shared by every size of the hero loop. Anything that
// depends on a panel's pixel geometry lives in that size's config instead.

// Keystrokes: [text after the key, ms until the next key]. Spaces take longer; '⌫' deletes one character.
export const keystrokes = (...parts) => {
  const RHYTHM = [110, 85, 135, 95, 75, 120, 90, 105, 80, 145, 100, 70];
  const out = []; let text = '';
  parts.forEach((part) => (part === '⌫' ? ['⌫'] : [...part]).forEach((ch) => {
    text = ch === '⌫' ? text.slice(0, -1) : text + ch;
    if (ch === '⌫' && out.length) out[out.length - 1][1] += 380;
    out.push([text, ch === '⌫' ? 170 : RHYTHM[out.length % RHYTHM.length] + (ch === ' ' ? 150 : 0)]);
  }));
  return out;
};
// The phone's typist: one string, a quicker rhythm, no deletes.
export const keystrokesPhone = (text) => {
  const RHYTHM = [95, 72, 115, 80, 65, 100, 76, 90, 68, 120, 85, 60];
  return [...text].map((ch, i) => [text.slice(0, i + 1), RHYTHM[i % RHYTHM.length] + (ch === ' ' ? 120 : 0)]);
};
// Two typing beats: the icon search, and the brand's name in the font preview. Everything else pastes or is prefilled.
export const FIELD_KEYS = keystrokes('Kerbside');
export const SEARCH = 'bike';
export const SEARCH_KEYS = keystrokes(SEARCH);
export const ALT_TEXT = 'Two riders waiting at a city intersection, one in an orange jacket';
export const ALT_WORDS = ALT_TEXT.split(' ');
// The words a search engine and a screen reader lean on: what is in the picture and where.
export const ALT_KEYS = new Set(['riders', 'intersection', 'orange', 'jacket']);

// A run of typing beats at one cursor position.
export const keyBeats = (scene, prefix, x, y, keys) => keys.map(([, ms], i) => [scene, prefix + i, ms, x, y, 0]);
// A drag split into short steps, so the value read-outs keep pace with the thumb.
export const lerp3 = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
export const dragSteps = (scene, prefix, from, to, ms, n, place, press = 2) => Array.from({ length: n }, (_, i) => {
  const [x, y] = place(lerp3(from, to, (i + 1) / n));
  return [scene, prefix + i, Math.round(ms / n), Math.round(x), Math.round(y), press];
});
// The icon colour picker: the hue drag lands on orange, then the pad drag lifts
// saturation and brightness to Signal (#FF5A1F). Values are [hue, sat, value].
export const PK_FROM = [40, 0.021, 0.937];
export const PK_HUE = [15.803571428571429, 0.021, 0.937];
export const PK_TO = [15.803571428571429, 0.8784313725490196, 1];
// Where the picker's thumbs sit for a value, from a size's picker geometry:
// { box: [x, y] popover top-left, padW, padH, hueY, inset }.
export const pickerPlacers = ({ box, padW, padH, hueY, inset = 12, padTop = 40 }) => ({
  padAt: ([, sat, val]) => [box[0] + inset + sat * padW, box[1] + padTop + (1 - val) * padH],
  hueAt: ([h]) => [box[0] + inset + h / 360 * padW, box[1] + hueY],
});

// The last palette is Kerbside's. Its first colour, Signal, is the one that gets locked, so it matches the one before.
export const PALS = [
  ['#2F6B4F', '#E9C46A', '#F4F1EA'],
  ['#FF5A1F', '#4B3B5C', '#F2C14E'],
  ['#FF5A1F', '#1A1A1A', '#E6E4DE'],
];
export const ADDED = '#FFFFFF';
export const ROLES = ['Primary', 'Secondary', 'Accent', 'Subtle'];
export const NAMES = { '#FF5A1F': 'Signal', '#1A1A1A': 'Asphalt', '#E6E4DE': 'Concrete', '#FFFFFF': 'White' };
export const TONES = [95, 90, 80, 70, 60, 50, 40, 30, 20, 10];
export const GRID = [
  'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20 20l-4-4', 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  'M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.4 6.6 19.4l1.2-6L3.4 9.3l6-.7z', 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4', 'M12 3v12M7 10l5 5 5-5M5 21h14', 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4',
  'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5', 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', 'M3 6h18v12H3zM3 7l9 6 9-6',
  'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  'M4 8h4l2-3h4l2 3h4v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2', 'M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11', 'M4 5h16v11H9l-5 4z', 'M6 3h12v18l-6-4-6 4z',
  'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1', 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6', 'M4 4h16v16H4zM12 8v8M8 12h8', 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  'M3 4h2l2.4 11h11L21 7H6.2M9 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z',
  'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z', 'M7 4l13 8-13 8z', 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  'M3 6h6l2 2h10v11H3z', 'M3 3h8l10 10-8 8L3 11zM7.5 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18',
];
export const BIKE = 'M15 17.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M2 17.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M14 5a1 1 0 1 0 2 0a1 1 0 1 0-2 0M12 17.5V14l-3-3 4-3 2 3h2';
// Real results for the search "bike" in the Icon Library's free packs, Regular weight by the app's own rules, in the
// API's order: [path, viewBox, 'stroke' or 'fill', stroke width, fill rule]. The third is Lucide's bike, the one picked
// and customised. Licences: Lucide ISC, Tabler MIT, Material Design Icons and Material Symbols Apache 2.0, Phosphor MIT.
export const RESULTS = [
  ["M5 20.5A3.5 3.5 0 0 1 1.5 17A3.5 3.5 0 0 1 5 13.5A3.5 3.5 0 0 1 8.5 17A3.5 3.5 0 0 1 5 20.5M5 12a5 5 0 0 0-5 5a5 5 0 0 0 5 5a5 5 0 0 0 5-5a5 5 0 0 0-5-5m9.8-2H19V8.2h-3.2l-1.94-3.27c-.29-.5-.86-.83-1.46-.83c-.47 0-.9.19-1.2.5L7.5 8.29C7.19 8.6 7 9 7 9.5c0 .63.33 1.16.85 1.47L11.2 13v5H13v-6.5l-2.25-1.65l2.32-2.35m5.93 13a3.5 3.5 0 0 1-3.5-3.5a3.5 3.5 0 0 1 3.5-3.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m0-8.5a5 5 0 0 0-5 5a5 5 0 0 0 5 5a5 5 0 0 0 5-5a5 5 0 0 0-5-5m-3-7.2c1 0 1.8-.8 1.8-1.8S17 1.2 16 1.2S14.2 2 14.2 3S15 4.8 16 4.8","0 0 24 24","fill",0,"nonzero"], // mdi:bike
  ["M2 18a3 3 0 1 0 6 0a3 3 0 0 0-6 0m14 0a3 3 0 1 0 6 0a3 3 0 0 0-6 0m-4 1v-4l-3-3l5-4l2 3h3m-5.993-6a2 2 0 1 0 4 0a2 2 0 1 0-4 0","0 0 24 24","stroke",2,"nonzero"], // tabler:bike
  ["M15 17.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0M2 17.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0M14 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M12 17.5V14l-3-3l4-3l2 3h2","0 0 24 24","stroke",2,"nonzero"], // lucide:bike
  ["M2 18a3 3 0 1 0 6 0a3 3 0 1 0-6 0m14.437-1.56a3 3 0 0 0 4.123 4.123M22 18a3 3 0 0 0-3-3m-7 4v-4l-3-3l1.665-1.332m2.215-1.772L14 8l2 3h3m-3-6a1 1 0 1 0 2 0a1 1 0 1 0-2 0M3 3l18 18","0 0 24 24","stroke",2,"nonzero"], // tabler:bike-off
  ["M3 21v-2l4.25-1.225l1.55-13q.1-.75.65-1.263T10.775 3h2.45q.775 0 1.325.512t.65 1.263l1.55 13L21 19v2zm8-3h2V6q0-.425-.288-.712T12 5t-.712.288T11 6z","0 0 24 24","fill",0,"nonzero"], // material-symbols:bike-dock
  ["M18 20q.825 0 1.413-.587T20 18t-.587-1.412T18 16t-1.412.588T16 18t.588 1.413T18 20m0 2q-1.65 0-2.825-1.175T14 18t1.175-2.825T18 14t2.825 1.175T22 18t-1.175 2.825T18 22M13.763 7.988q-.513-.513-.513-1.238t.513-1.237T15 5t1.238.513t.512 1.237t-.513 1.238T15 8.5t-1.237-.513M11 19v-3.675L8.675 13.4q-.65-.575-.687-1.45t.612-1.475l2-1.925q.575-.575 1.4-.563t1.4.588l1.575 1.4q.65.5 1.425.763T18 11v2q-1.5 0-2.825-.6t-2.325-1.675L11 12.5l2 2V19zm-5 1q.825 0 1.413-.587T8 18t-.587-1.412T6 16t-1.412.588T4 18t.588 1.413T6 20M4.275 8.25l3.45-3.45L6.7 3.75l-2.4 2.4l-1-1l-1.05 1.075zM6 22q-1.65 0-2.825-1.175T2 18t1.175-2.825T6 14t2.825 1.175T10 18t-1.175 2.825T6 22M5 11q-1.725-.425-2.863-1.987T1 5.55v-3L5 1l4 1.55v3q0 1.9-1.137 3.463T5 11","0 0 24 24","fill",0,"nonzero"], // material-symbols:bike-lane
  ["M3 20L5 7.875l-2 .8V11H1V8.35q0-.475.25-.85t.675-.55L6.05 5.3q.575-.225 1.113-.012T7.9 6q.075.15.175.638t.413 1.012t.9.938T11 9h1v2h-1q-.75 0-1.437-.225t-1.263-.6L7.9 12.5l1.625 1.55q.225.225.35.5t.125.6V20H8v-4l-2-2l-1 6zM6.513 3.988Q6 3.475 6 2.75t.513-1.237T7.75 1t1.238.513T9.5 2.75t-.513 1.238T7.75 4.5t-1.237-.513M18.5 22.026q-1.5 0-2.65-.837T14.225 19H11.5l1-2H14q.05-.55.238-1.062t.487-.938H12.5l1-2h2.45l-.675-2H13.5V9h1.775q.65 0 1.175.363t.725.987l.875 2.625q.125-.025.225-.012t.225.012q1.875 0 3.2 1.325t1.325 3.2t-1.325 3.2t-3.2 1.325m0-2.025q1.05 0 1.775-.725T21 17.5q0-.975-.662-1.687T18.725 15l.725 2.175l-1.9.625l-.725-2.15q-.375.35-.6.813T16 17.5q0 1.05.725 1.775T18.5 20","0 0 24 24","fill",0,"nonzero"], // material-symbols:walk-bike
  ["M16 1.2c-1 0-1.8.8-1.8 1.8S15 4.8 16 4.8S17.8 4 17.8 3S17 1.2 16 1.2m-3.6 2.9c-.47 0-.9.19-1.2.5L7.5 8.29C7.19 8.6 7 9 7 9.5c0 .63.33 1.16.85 1.47L11.2 13v5H13v-6.5l-2.25-1.65l2.32-2.35L14.8 10H19V8.2h-3.2l-1.94-3.27c-.29-.5-.86-.83-1.46-.83M10 3H3c-.55 0-1-.45-1-1s.45-1 1-1h9.79c-.21.34-.38.71-.47 1.11c-.86.02-1.67.34-2.32.89m-5 9c-2.76 0-5 2.24-5 5s2.24 5 5 5s5-2.24 5-5s-2.24-5-5-5m0 8.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5s-1.57 3.5-3.5 3.5M19 12c-2.76 0-5 2.24-5 5s2.24 5 5 5s5-2.24 5-5s-2.24-5-5-5m0 8.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5s-1.57 3.5-3.5 3.5M5.32 11H1c-.552 0-1-.45-1-1s.448-1 1-1h4.05c-.02.16-.05.33-.05.5c0 .53.12 1.04.32 1.5M6 7H2c-.55 0-1-.45-1-1s.45-1 1-1h5.97L6.09 6.87C6.05 6.91 6 6.96 6 7","0 0 24 24","fill",0,"nonzero"], // mdi:bike-fast
  ["M19.5 13c-1.32 0-2.45.74-3.05 1.81l-3.22-2.63l-2.27.82l-1.09-1.68l1.34.37l2.66-2.19l-.94-1.14l-2.03 1.67L7.96 9h-.01c-.41-.15-.87-.11-1.26.14c-.65.42-.86 1.25-.53 1.93c-.21-.04-.43-.07-.66-.07C3 11 1 13 1 15.5S3 20 5.5 20s4.5-2 4.5-4.5c0-.13-.03-.25-.04-.38L13 14l3 2.5c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5s-1.57-3.5-3.5-3.5m-14 5.5c-1.65 0-3-1.35-3-3s1.35-3 3-3s3 1.35 3 3s-1.35 3-3 3m14 0c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2M6.44 7.57c-.59-.57-.59-1.51 0-2.07c.59-.61 1.53-.61 2.12 0c.59.56.59 1.5 0 2.07c-.59.58-1.53.58-2.12 0","0 0 24 24","fill",0,"nonzero"], // mdi:hand-bike
  ["M5 20q-2.125 0-3.562-1.437T0 15t1.463-3.562T5 10q1.925 0 3.238 1.15T9.9 14h.65l-1.8-5H7V7h5v2h-1.1l.35 1h4.8L14.6 6H12V4h2.6q.65 0 1.163.35t.737.95l1.7 4.65h.8q2.075 0 3.538 1.463T24 14.95q0 2.1-1.45 3.575T19 20q-1.8 0-3.162-1.125T14.1 16H9.9q-.35 1.725-1.7 2.863T5 20m0-4h2.8v-2H5zm7.7-2h1.4q.125-.575.338-1.075T15 12h-3.05zm5.3 1.35l1.9-.7l-1-2.65l-1.85.7z","0 0 24 24","fill",0,"nonzero"], // material-symbols:pedal-bike
  ["M21 11.5V10l-7.5-1V5H9v1.5h3v7.8h-1L9 10c.3-.1.5-.4.5-.7c0-.4-.3-.8-.7-.8h-2c-.5 0-.8.3-.8.7s.3.8.8.8h.6l2 4.2H7.9C7.6 12.4 6 11 4 11c-2.2 0-4 1.8-4 4s1.8 4 4 4c2 0 3.6-1.4 3.9-3.2h8.6c.2-2.4 2.1-4.3 4.5-4.3M6.4 15.8c-.3 1-1.3 1.8-2.4 1.8c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5c1.1 0 2.1.7 2.4 1.8H4v1.5h2.4M21 13c-1.7 0-3 1.3-3 3s1.3 3 3 3s3-1.3 3-3s-1.3-3-3-3m0 4.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5s1.5.7 1.5 1.5s-.7 1.5-1.5 1.5","0 0 24 24","fill",0,"nonzero"], // mdi:bike-cargo
  ["M6.85 5c-.98 0-1.81.71-1.98 1.67L4 12l.87 5.33c.17.96 1 1.67 1.98 1.67h7.3c.98 0 1.82-.71 1.98-1.67l.55-3.33H18v-1h2v-2h-2v-1h-1.32l-.55-3.33c-.16-.96-1-1.67-1.98-1.67zm0 2h7.3l.67 4H6.18zm-.67 6h8.64l-.67 4h-7.3z","0 0 24 24","fill",0,"nonzero"], // mdi:bike-pedal
  ["m11.74 13.36l2.4-5.65l-1.08-2.21H10.5V4H14l.73 1.5h7.02l-1 3.5h-4.31l.67 1.37A5.002 5.002 0 0 1 24 15c0 2.76-2.24 5-5 5s-5-2.24-5-5c0-1.55.71-2.94 1.82-3.85L15 9.5L12.25 16H9.9A5 5 0 1 1 5 10c2.59 0 4.72 1.97 5 4.5h.58L8.3 9h-.8c-.41 0-.75-.34-.75-.75s.34-.75.75-.75h2.75c.41 0 .75.34.75.75s-.34.75-.75.75h-.28zM5 11.5c-1.93 0-3.5 1.57-3.5 3.5a3.504 3.504 0 0 0 6.86 1H4v-1.5h4.47c-.25-1.7-1.71-3-3.47-3m14 0c-.43 0-.85.08-1.23.22l1.93 3.96l-1.35.66l-1.85-3.79c-.62.63-1 1.5-1 2.45c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5s-1.57-3.5-3.5-3.5","0 0 24 24","fill",0,"nonzero"], // mdi:bike-basket
  ["M0 19v-2h4.1q.275-1.7 1.413-2.975T8.3 12.25L6.85 6H3V4h3.85q.675 0 1.238.438T8.8 5.55L10.75 14H10q-1.65 0-2.825 1.175T6 18v1zm7.875 1.125Q7 19.25 7 18t.875-2.125T10 15t2.125.875T13 18t-.875 2.125T10 21t-2.125-.875M19 18q-1.8 0-3.162-1.112T14.1 14h-2.35l-.45-2h2.8q.125-.575.338-1.075T15 10h-4.15l-.45-2h5.65l-1.1-3h-2.6V3h2.6q.65 0 1.163.35t.737.95l1.35 3.65h.8q2.075 0 3.538 1.463T24 12.95q0 2.125-1.463 3.588T19 18m-1-4.65l1.9-.7l-1-2.65l-1.85.7z","0 0 24 24","fill",0,"nonzero"], // material-symbols:bike-scooter
  ["M5 17q-2.125 0-3.562-1.437T0 12t1.463-3.562T5 7q1.925 0 3.238 1.15T9.9 11h.65l-1.8-5H7V4h5v2h-1.1l.35 1h4.8L14.6 3H12V1h2.6q.65 0 1.163.35t.737.95l1.7 4.65h.8q2.075 0 3.538 1.463T24 11.95q0 2.1-1.45 3.575T19 17q-1.8 0-3.162-1.125T14.1 13H9.9q-.35 1.725-1.7 2.863T5 17m0-4h2.8v-2H5zm8 10l-6-3h4v-2l6 3h-4zm-.3-12h1.4q.125-.575.338-1.075T15 9h-3.05zm5.3 1.35l1.9-.7l-1-2.65l-1.85.7z","0 0 24 24","fill",0,"nonzero"], // material-symbols:electric-bike
  ["M19 7c-.56 0-1.09.11-1.59.28L14.46 1.5H11V3h2.54l.88 1.72L12 10.13l-1.77-4.18c.27-.1.51-.37.51-.7c0-.41-.33-.75-.74-.75H8c-.42 0-.76.34-.76.75S7.58 6 8 6h.61l2.25 5.25h-.94C9.56 8.85 7.5 7 5 7c-2.76 0-5 2.24-5 5s2.24 5 5 5c2.5 0 4.56-1.85 4.92-4.25h2.58l2.79-6.32l.79 1.53A4.98 4.98 0 0 0 14 12c0 2.76 2.24 5 5 5s5-2.24 5-5s-2.24-5-5-5M5 15.5c-1.93 0-3.5-1.57-3.5-3.5S3.07 8.5 5 8.5c1.67 0 3.07 1.18 3.41 2.75H4v1.5h4.41A3.495 3.495 0 0 1 5 15.5m14 0c-1.93 0-3.5-1.57-3.5-3.5c0-1.08.5-2.03 1.27-2.67l1.8 3.52l1.32-.72l-1.79-3.5c.29-.07.59-.13.9-.13c1.93 0 3.5 1.57 3.5 3.5s-1.57 3.5-3.5 3.5M11 20H7l6 3v-2h4l-6-3z","0 0 24 24","fill",0,"nonzero"], // mdi:bike-electric
  ["M5 22q-2.075 0-3.537-1.463T0 17t1.463-3.537T5 12t3.538 1.463T10 17t-1.463 3.538T5 22m2.125-2.875Q8 18.25 8 17t-.875-2.125T5 14t-2.125.875T2 17t.875 2.125T5 20t2.125-.875M11 19v-5l-3.2-2.8q-.3-.275-.45-.637T7.2 9.8t.163-.762T7.8 8.4l2.8-2.8q.3-.3.688-.45T12.1 5t.813.15t.687.45l1.9 1.9q.7.7 1.6 1.1T19 9v2q-1.425 0-2.713-.55T14 8.9l-.8-.8l-2.4 2.4l2.2 2.3V19zm3.088-14.087Q13.5 4.325 13.5 3.5t.588-1.412T15.5 1.5t1.413.588T17.5 3.5t-.587 1.413T15.5 5.5t-1.412-.587M19 22q-2.075 0-3.537-1.463T14 17t1.463-3.537T19 12t3.538 1.463T24 17t-1.463 3.538T19 22m2.125-2.875Q22 18.25 22 17t-.875-2.125T19 14t-2.125.875T16 17t.875 2.125T19 20t2.125-.875","0 0 24 24","fill",0,"nonzero"], // material-symbols:directions-bike
  ["M164 80a28 28 0 1 0-28-28a28 28 0 0 0 28 28m0-40a12 12 0 1 1-12 12a12 12 0 0 1 12-12m36 96a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24M56 136a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24m136-80h-40a8 8 0 0 1-5.66-2.34L120 91.31L99.31 112l34.35 34.34A8 8 0 0 1 136 152v48a8 8 0 0 1-16 0v-44.69l-37.66-37.65a8 8 0 0 1 0-11.32l32-32a8 8 0 0 1 11.32 0L155.31 104H192a8 8 0 0 1 0 16","0 0 256 256","fill",0,"nonzero"], // ph:person-simple-bike
  ["m14.43 16.11l.85-2.11H16v-1h4v-2h-4v-1h-.72l-.85-2.11C14 6.75 12.87 6 11.65 6h-2.3C8.13 6 7 6.75 6.57 7.89l-1.2 3c-.29.71-.29 1.51 0 2.22l1.2 3C7 17.25 8.13 18 9.35 18h2.3c1.22 0 2.35-.75 2.78-1.89M9.35 8h2.3c.41 0 .77.25.92.63l.55 1.37H7.88l.55-1.37c.15-.38.52-.63.92-.63m-.92 7.37L7.88 14h5.24l-.55 1.37c-.15.38-.52.63-.92.63h-2.3c-.4 0-.77-.25-.92-.63","0 0 24 24","fill",0,"nonzero"], // mdi:bike-pedal-clipless
  ["M6.82 5a2 2 0 0 0-1.96 1.61l-.82 4.1c-.04.13-.04.26-.04.39v1.8c0 .13 0 .26.04.39l.82 4.1A2 2 0 0 0 6.82 19h6.56a2 2 0 0 0 1.79-1.11l1.62-3.23q.15-.315.21-.66h1v-1h2v-2h-2v-1h-1a2.5 2.5 0 0 0-.21-.66l-1.62-3.23A2 2 0 0 0 13.38 5zm0 2h.56l2.5 5l-2.5 5h-.56L6 12.9v-1.8zm4.8 4l-2-4h3.76L15 10.24V11zm0 2H15v.76L13.38 17H9.62z","0 0 24 24","fill",0,"nonzero"], // mdi:bike-pedal-mountain
  ["m17.42 10l-4.01-4H9v2h3.59l2 2H6.5C4 10 2 12 2 14.5S4 19 6.5 19c2.22 0 4.06-1.62 4.42-3.73L13.04 14c-.04.17-.04.33-.04.5c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5s-2-4.5-4.5-4.5m-8.66 5.26C8.5 16.27 7.58 17 6.47 17a2.5 2.5 0 0 1 0-5c1.12 0 2.03.74 2.37 1.75H6v1.5zM17.47 17a2.5 2.5 0 0 1 0-5a2.5 2.5 0 0 1 2.5 2.5a2.5 2.5 0 0 1-2.5 2.5","0 0 24 24","fill",0,"nonzero"], // mdi:motorbike
  ["M2 16a3 3 0 1 0 6 0a3 3 0 1 0-6 0m14 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0m-8.5-2h5l4-4H6m1.5 4l4-4M13 6h2l1.5 3l2 4","0 0 24 24","stroke",2,"nonzero"], // tabler:motorbike
  ["m18 14l-1-3M3 9l6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81M8 17h3a1 1 0 0 0 1-1a6 6 0 0 1 6-6a1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5M16 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M2 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0","0 0 24 24","stroke",2,"nonzero"], // lucide:motorbike
  ["M22.1 21.5L2.4 1.7L1.1 3l7 7H6.5C4 10 2 12 2 14.5S4 19 6.5 19c2.2 0 4.1-1.6 4.4-3.7l1.5-.9l.6.6c.2 2.1 1.9 3.8 4 4l3.8 3.8zM8.8 15.3c-.3 1-1.3 1.7-2.4 1.7C5.1 17 4 15.9 4 14.5S5.1 12 6.5 12c1.1 0 2 .7 2.4 1.8H6v1.5zM11.2 8l-2-2h4.2l4 4h.1c2.5 0 4.5 2 4.5 4.5c0 1.2-.5 2.3-1.2 3.1l-1.4-1.4c.4-.4.6-1 .6-1.6c0-1.4-1.1-2.5-2.5-2.5c-.6 0-1.2.2-1.6.6L13.2 10h1.4l-2-2z","0 0 24 24","fill",0,"nonzero"], // mdi:motorbike-off
  ["m17.42 8l-4.01-4H9v2h3.59l2 2H6.5C4 8 2 10 2 12.5S4 17 6.5 17c2.22 0 4.06-1.62 4.42-3.73L13.04 12c-.04.17-.04.33-.04.5c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5S20 8 17.5 8m-8.66 5.26C8.5 14.27 7.58 15 6.47 15a2.5 2.5 0 0 1 0-5c1.12 0 2.03.74 2.37 1.75H6v1.5zM17.47 15a2.5 2.5 0 0 1 0-5a2.5 2.5 0 0 1 0 5M11 20H7l6 3v-2h4l-6-3z","0 0 24 24","fill",0,"nonzero"], // mdi:motorbike-electric
];
export const PICK = 2;
export const FONTS = {
  'Archivo': ["'Archivo', sans-serif", 800, 'Sans · 9 weights'],
  'Bricolage Grotesque': ["'Bricolage Grotesque', sans-serif", 700, 'Sans · 7 weights'],
  'Manrope': ["'Manrope', sans-serif", 700, 'Sans · 7 weights'],
  'Outfit': ["'Outfit', sans-serif", 600, 'Sans · 9 weights'],
  'Syne': ["'Syne', sans-serif", 700, 'Sans · 5 weights'],
  'Anton': ["'Anton', sans-serif", 400, 'Sans · 1 weight'],
  'Geist': ["'Geist', sans-serif", 500, 'Sans · 9 weights'],
  'IBM Plex Sans': ["'IBM Plex Sans', sans-serif", 600, 'Sans · 7 weights'],
};
export const ALL_TILES = ['Manrope', 'Bricolage Grotesque', 'Geist', 'Outfit', 'Syne', 'IBM Plex Sans'];
export const DISPLAY_TILES = ['Archivo', 'Anton', 'Bricolage Grotesque', 'Syne', 'Outfit', 'Manrope'];
export const RATIOS = [['Minor third', 1.2], ['Major third', 1.25], ['Perfect fourth', 1.333], ['Augmented fourth', 1.414], ['Perfect fifth', 1.5], ['Golden ratio', 1.618]];
export const EASE = 'cubic-bezier(.23,1,.32,1)';

export const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export const hsvHex = ([h, sat, val]) => {
  const f = (n) => { const k = (n + h / 60) % 6; return Math.round(255 * (val - val * sat * Math.max(0, Math.min(k, 4 - k, 1)))); };
  return '#' + [f(5), f(3), f(1)].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase();
};
// Text on a swatch is Asphalt or White, whichever has the higher WCAG 2 contrast.
export const relLum = (hex) => { const [r, g, b] = rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
export const fgFor = (hex) => (contrast(hex, '#1A1A1A') >= contrast(hex, '#FFFFFF') ? '#1A1A1A' : '#FFFFFF');
// A tone is the colour's hue and saturation at a set lightness, as the Tints popover lists them.
export const tone = (hex, l) => {
  let [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0; const s0 = d === 0 ? 0 : d / (1 - Math.abs(max + min - 1));
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; const L = l / 100, s = Math.min(s0, 0.7), c = (1 - Math.abs(2 * L - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = L - c / 2;
  const [a, bb, cc] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [a, bb, cc].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
};

// The panel accessible name: what the loop shows, in words.
export const PANEL_LABEL =
  "UI L4B in use, building a kit for Kerbside, a sample brand, in five chapters. Palette: colours are randomised, one is locked, another is added and its tints opened. Icons: a search for bike is typed, and the bike icon is recoloured and flipped. Type: a display heading font is picked and previewed with the name Kerbside, then a type scale is chosen. Alt text: a description of a photo is generated and its keywords marked. Export: the finished kit is saved as an HTML style guide and opened, showing its first three pages: the cover, the palette with its contrast checks, and the type scale."

// The panel pictures, in the widths the asset set holds (public/hero-loop).
export const IMAGES = {
  kit: { path: '/hero-loop/ui-kit', widths: [870, 1740] },
  'guide-1': { path: '/hero-loop/guide-1', widths: [400, 800] },
  'guide-2': { path: '/hero-loop/guide-2', widths: [400, 800] },
  'guide-3': { path: '/hero-loop/guide-3', widths: [400, 800] },
  riders: { path: '/hero-loop/riders', widths: [400, 800] },
}

// The loop's chapters and Next stops, the same on every size: each names the
// timeline beats it starts and ends on. SETTLE is the chapter shown finished
// under reduced motion.
export const CHAPTERS = [
  { name: 'Palette', first: 'p0', end: 'h5' },
  { name: 'Icons', first: 'enter3', end: 'h16' },
  { name: 'Type', first: 'enter1', end: 'h11' },
  { name: 'Alt text', first: 'enter6', end: 'h6c' },
  { name: 'Export', first: 'pExp', end: 'guide' },
];
export const EXTRA_STEPS = [{ name: 'Type scale', beat: 'enter2' }];
export const SETTLE = 4;
