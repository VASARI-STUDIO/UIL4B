// Theme 35, Dispatch: Code 128 (subset B), generated from the string it encodes, never random bars. The stub on every page and the opener's foot use it:
//   code128('KBS0412-014')   returns { widths: [bar, space, bar, ...] in modules, modules: total }
//   barcodeRects(text, x, y, length, thickness, { vertical, colour })   svg rects: bars run across `thickness` and the code runs along `length`
// Each symbol is six alternating bar and space widths that sum to 11 modules (the stop is 13). Start B is 104, the check symbol is (104 + sum of position x value) mod 103.
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
for (let i = 0; i < 106; i++) if ([...PATTERNS[i]].reduce((a, c) => a + Number(c), 0) !== 11) throw new Error(`code128: pattern ${i} does not sum to 11`);
const START_B = 104, STOP = 106;

export function code128(text) {
  const s = String(text);
  const vals = [...s].map((ch) => { const v = ch.charCodeAt(0) - 32; if (v < 0 || v > 94) throw new Error(`code128: "${ch}" is not in subset B`); return v; });
  const check = (START_B + vals.reduce((a, v, i) => a + v * (i + 1), 0)) % 103;
  const widths = [START_B, ...vals, check, STOP].flatMap((v) => [...PATTERNS[v]].map(Number));
  return { widths, modules: widths.reduce((a, b) => a + b, 0), check };
}

export function barcodeRects(text, x, y, length, thickness, { vertical = false, colour = 'currentColor' } = {}) {
  const { widths, modules } = code128(text), m = length / modules;
  let p = 0, out = '';
  widths.forEach((w, i) => {
    if (i % 2 === 0) {
      const a = Math.round(p * m * 100) / 100, l = Math.round(w * m * 100) / 100;
      out += vertical ? `<rect x="${x}" y="${Math.round((y + a) * 100) / 100}" width="${thickness}" height="${l}"/>` : `<rect x="${Math.round((x + a) * 100) / 100}" y="${y}" width="${l}" height="${thickness}"/>`;
    }
    p += w;
  });
  return `<g fill="${colour}" shape-rendering="crispEdges">${out}</g>`;
}
