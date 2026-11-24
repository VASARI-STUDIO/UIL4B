// Theme 28, Print Shop: the one sentence under each page's name, longest first (the head takes the first that sets in two lines).
// Facts the sentence names (the clear-space unit, the colour count) come from the same engine facts the page draws, so the words and the drawing agree.
export function copyOf(id, f = {}) {
  const n = f.count;
  const C = {
    cover: ['The proof sheet for the brand: its inks, its type and the rules that keep every print true to it.', 'The brand, pulled as a proof.'],
    logo: [`Each colourway on the ground it is printed for. Keep ${f.unit || 'a margin'} clear on every side.`, 'Each colourway on the ground it is printed for.'],
    colour: [n === 1 ? 'The one ink on the press, with the colour that reads best on it.' : `${n > 1 ? `All ${n}` : 'Every'} inks on the press, biggest share first, each with the colour that reads best on it.`, 'Every ink, with the colour that reads best on it.'],
    ruler: ['How much of the sheet each ink covers. Hold these shares and the print keeps its balance.', 'How much of the sheet each ink covers.'],
    applied: ['The brand on the things it is printed on: a card, a post and an email.', 'The brand on the things it is printed on.'],
    type: ['The type ladder, biggest step first, drawn at its true size in the brand’s own faces.', 'The type ladder, drawn at its true size.'],
    contrast: ['Every pair the brand sets text in, with its contrast ratio and grade against WCAG 2.2.', 'Every text pair, with its ratio and grade.'],
    tokens: ['The spacing, corner and edge values every screen is built from.', 'The values every screen is built from.'],
    usage: ['A button, a card and a link, built from the tokens on the page before.', 'A button, a card and a link, built from the tokens.'],
  };
  return C[id] || [''];
}
