// Theme 25, Label: the copy rules, the machinery that applies them, and the sentence frames that follow them. A page's words come from two places only:
// facts from the brand's data (names, numbers, the brand's own sentences) and the frames in this file. Nothing is joined to a data field with a colon.
//
// THE RULES (they hold for any brand)
//  1. Two voices, never mixed. The wall text is the book's: a page title and, only where the page has a fact the label lacks (palette, logo), one plain line. The label is the museum's:
//     it names the object, says what it is, and says one thing about it.
//  2. A label title names the object ("Shop window sign", "The Margin logo"). It never repeats the line the object carries.
//  3. A label paragraph is whole sentences. Where the label names parts (traits, colours) it sets them as items, the name first and in a heavier weight, one to a block or
//     one to a line ("Quiet: we say what the book is and stop." / "Plum   What to press"). It names every part it describes (every trait, every colour, every version).
//  4. Keys are their own list, one numbered row each, set under the paragraph. A key is never run into a sentence.
//  5. A credit is a cross-reference ("See also Colour, page 007"), or on the cover a contact. It never repeats what the object already says.
//  6. Line integrity, enforced by tie() on every string that reaches a page (a no-break space joins two words so a line cannot break between them):
//     a. a word of three letters or fewer (a, an, the, on, in, of, to, be, and, for) stays with the word after it, so no line ends on one and an
//        infinitive is never split ("to be read");
//     b. the last word of every sentence stays with the word before it, so no sentence leaves one word alone on a line ("what to press.");
//     c. a number stays with the word beside it ("24 px", "page 007"), a date stays whole ("1 November 2026"), and "x" between numbers is "×";
//     d. a name of more than one word (a typeface, the brand, a colour) never breaks ("IBM Plex Sans");
//     e. a bound run is never longer than the box can hold, so binding can never push a word out of its box (the cap is per element).
//  7. lint() refuses what tie() cannot repair: a number standing alone as a sentence ("400."), and two numbers in a row ("1911 400"). A number always
//     comes with its noun ("weight 400") or its preposition ("Goudy Bookletter 1911 at 400").
//  8. A brand fact is taken from the brand's data as it stands. Where a frame needs a fact the brand did not supply (CMYK, a size), the frame leaves it out.
//  9. Everything is checked to fit at build time (labelCard and wallText throw when the text would not fit); the box is never resized. After a render,
//     the DOM line boxes are checked for widows, short words and numbers at line ends (the line probe in the gate script).
import { lead, numberWord, listAnd, longDate, seeAlso, wrapLines, WALLTEXT } from './helpers.js';

export const NB = ' ';
const SHORT_WORD = /^[("'“‘]*[A-Za-z]{1,3}$/;
const SENTENCE_END = /[.!?]["')”’]*$/;

// Every multi-word name on the page: the brand, its typefaces, its colours (so none of them can break across lines). A name over
// eighteen characters is left free to break, or it could not fit a label line at all.
export const namesOf = (ctx) => {
  const B = ctx.brand;
  return [B.name, B.fonts.display?.family, B.fonts.body?.family, B.fonts.mono?.family, ...B.colours.map((c) => c.name)].filter((x) => x && x.includes(' ') && x.length <= 18);
};

// Bind a string so it can never break badly (rules 6a to 6e). `max` is the longest bound run in characters; `tail: false` leaves the final two words free (a title is balanced instead).
export function tie(s, { tail = true, names = [], max = 26 } = {}) {
  let t = s;
  for (const n of names) t = t.split(n).join(n.replace(/ /g, NB));
  t = t.replace(/(\d) x (\d)/g, `$1${NB}×${NB}$2`)
    .replace(/(\d) (?=[^\s]{1,9}(?: |$))/g, `$1${NB}`)
    .replace(/([A-Za-z]) (?=\d)/g, `$1${NB}`);
  const tok = t.split(' ');
  const bind = tok.map((w, i) => i < tok.length - 1 && SHORT_WORD.test(w));                                  // 6a: a short word binds to the next
  tok.forEach((w, i) => { if (i > 0 && SENTENCE_END.test(w) && (i < tok.length - 1 || tail)) bind[i - 1] = true; });  // 6b: a sentence's last word binds to the one before
  if (tail && tok.length > 1) bind[tok.length - 2] = true;                                                   // the last two words of any text stay together
  const out = []; let cur = tok[0];
  for (let i = 1; i < tok.length; i++) {
    if (bind[i - 1] && cur.length + 1 + tok[i].length <= max) cur += NB + tok[i]; else { out.push(cur); cur = tok[i]; }
  }
  out.push(cur);
  return out.join(' ');
}

// Rule 7: refuse what binding cannot repair.
export function lint(s, where = 'copy') {
  const t = s.replace(/\u00a0/g, ' ');
  if (/(^|[.!?]\s)\d+[.!?](\s|$)/.test(t)) throw new Error(`${where}: "${s}" has a number standing alone as a sentence`);
  if (/(^|[^\d.,])\d+\s\d+(?![\d])/.test(t)) throw new Error(`${where}: "${s}" has two numbers in a row`);
}

const pct = (c) => `${Math.round(c.share * 100)}%`;
// what a colour does, by its role; a role the frame does not know is named as it is
const ROLE_FRAME = { action: 'What to press', text: 'Text', 'quiet text': 'Captions', panel: 'Cards and labels', ground: 'This page' };
const roleLine = (role) => ROLE_FRAME[role] || role.charAt(0).toUpperCase() + role.slice(1);
// "weight 400", "weights 400 and 500": a weight is always a number with its noun
export const weightsPhrase = (ws) => `${ws.length > 1 ? 'weights' : 'weight'} ${listAnd(ws)}`;
// "Shop window sign, 594 x 841 mm: Read slowly. We print slowly." splits into the object, its size and the line it carries
export const splitSign = (s) => {
  const [kind, line] = s.split(/:\s+/);
  const m = /^(.*?),\s*([\d.]+ x [\d.]+ mm)$/.exec(kind);
  return { object: m ? m[1] : kind, size: m ? m[2] : '', line };
};

export function coverCopy(ctx) {
  const B = ctx.brand;
  return {
    // the cover's title is the first of the brand's own lines that sets in two lines at 28 px; a brand whose lines are all too wide gets the plain title
    wall: { title: [B.lines.primary, ...B.lines.others].find((l) => wrapLines(ctx, 'display', ctx.weights.heading, 28, tie(l, { tail: false, max: 14 }), WALLTEXT.w).length <= 2) || 'Brand guidelines', line: '' },
    // the detail breaks after "Brand guidelines" on purpose, so the version and date stay on one line
    label: { title: B.name, detail: `Brand guidelines\nVersion ${B.version.number}, ${longDate(B.version.date)}`, paragraph: B.voice.boilerplate25, credit: `Questions: ${B.contact.email}` },
  };
}

export function personalityCopy(ctx) {
  const B = ctx.brand, s = splitSign(B.applications.signage);
  return {
    wall: { title: 'Personality', line: '' },
    // each trait named, with the brand's own words for it, whole, one to a block, in the brand's order
    label: { title: s.object, detail: s.size, items: B.personality.map((p) => ({ term: `${p.trait}:`, text: p.means })), mode: 'inline', grow: true, credit: seeAlso('write-this') },
    line: s.line,
  };
}

export function logoCopy(ctx, names) {
  const B = ctx.brand, S = B.logo.showcase || {};
  const min = S.minScreenPx && S.minPrintMm ? `Use it no smaller than ${S.minScreenPx} px on screen or ${S.minPrintMm} mm in print.` : `Keep clear space of ${ctx.logo.clearShare}% of its height on every side.`;
  return {
    wall: { title: 'Logo', line: min },
    label: {
      title: `The ${B.name} logo`, detail: `Clear space is ${ctx.logo.clearShare}% of its height, marked by the four squares.`,
      paragraph: lead(B.logo.idea, 80), keys: names.map((nm, i) => ({ n: i + 1, text: nm })), cols: 2, credit: seeAlso('clear-space'),
    },
  };
}

export function paletteCopy(ctx, R, panelColours) {
  const B = ctx.brand, ground = B.colours.find((c) => c.hex === R.groundHex);
  // A ground drawn as the brand stores it is the wall itself: it is named with its hex in the last row and not hung. A ground stored as pure white is drawn as warm paper (see roles()),
  // so the wall is a tint of it, not the brand's colour: the brand's own colour is hung as a panel with its real hex, and the wall line says the page is tinted from it.
  const tinted = R.wall.toLowerCase() !== R.groundHex.toLowerCase();
  // one colour to a line, in the order they hang, then (an untinted) wall itself, with its value
  const rows = [...panelColours.map((c) => ({ term: c.name, text: tinted && c.hex === R.groundHex ? 'Page ground' : roleLine(c.role) })), ...(tinted ? [] : [{ term: ground.name, mono: ground.hex.toUpperCase(), text: roleLine(ground.role) }])];
  const hasCmyk = B.colours.every((c) => Array.isArray(c.cmyk));
  const fmt = hasCmyk ? 'hex, RGB and CMYK' : 'hex and RGB';
  const n = B.colours.length;
  return {
    wall: { title: 'Colour', line: `${ground.name} fills ${pct(ground)} of a page.${tinted ? ` This page is tinted from ${ground.name}.` : ''}` },
    label: {
      title: `The ${B.name} palette`, detail: tinted ? `${numberWord(n)} colours, in ${fmt}.` : `${numberWord(n)} colours. ${numberWord(n - 1)} hang in ${fmt}; ${ground.name} is this page.`,
      items: rows, mode: 'table', credit: seeAlso('contrast'),
    },
    hasCmyk,
  };
}

export function typefacesCopy(ctx) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body;
  return {
    wall: { title: 'Typography', line: '' },
    label: {
      title: 'Two typefaces', detail: `${d.family} at ${listAnd(d.weights)}. ${b.family} at ${listAnd(b.weights)}.`,
      paragraph: B.type.rules[0].do, credit: seeAlso('hierarchy'),
    },
    // the caption under the display plate
    caption: (minPx) => `Display, ${weightsPhrase(d.weights)}, from ${minPx} px up.`,
  };
}

export function cardCopy(ctx, R) {
  return {
    wall: { title: 'Applications', line: '' },
    label: {
      title: 'Card and post', detail: '85 x 55 mm card, square post.',
      keys: [{ n: 1, text: 'Front: the logo, a name and an email.' }, { n: 2, text: `Back: ${R.actionName}, with the symbol.` }, { n: 3, text: 'Post: the brand line, with the logo.' }], cols: 1,
      credit: seeAlso('logo'),
    },
  };
}
