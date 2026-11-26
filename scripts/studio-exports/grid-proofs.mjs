import { esc } from './specimens.mjs';

// The sample artwork uses these same tracks and column lines described in its caption.
const grids = {
  flyleaf: [6,'2 / 6','2 / 5','3 / 6','Set the title one column in from the binding edge. Indent the supporting line by one more column.'],
  'set-square': [8,'1 / 3','4 / 9','4 / 8','Keep the mark in the first two columns. Use the fourth grid line as the datum for the headline and specification.'],
  dispatch: [4,'1 / 2','1 / 5','3 / 5','Give the message the width of the sign. Start the delivery detail halfway across the sheet.'],
  doorlist: [6,'5 / 7','1 / 6','1 / 4','Keep the mark in the upper right. Set the event line wide, with the small print flush to its left edge.'],
  'market-day': [5,'2 / 5','1 / 4','4 / 6','Centre the masthead over three columns. Give the lead story three columns and the market note two.'],
  'contact-sheet': [6,'1 / 3','3 / 7','3 / 5','Keep the first two columns for the imprint. Hang the title and wall label on the third grid line.'],
  workbench: [6,'1 / 3','1 / 5','5 / 7','Reserve two columns at the right for the job details. Keep the quote and the workshop mark on the left.'],
  soundings: [8,'1 / 4','2 / 8','5 / 9','Inset the main line by one column. Set the service information in the right half of the board.'],
  hearth: [4,'2 / 4','1 / 5','2 / 4','Centre the mark and the household note on the middle two columns. Let the heading span the page.'],
  offprint: [5,'4 / 6','1 / 5','2 / 5','Place the mark in the last two lanes. Offset the caption one lane from the headline.'],
};

export function gridProof(id,project,mark) {
  const [count,logo,headline,caption,note] = grids[id];
  return `<div class="grid-drawing" style="--tracks:${count}"><div class="grid-lines" aria-hidden="true">${'<i></i>'.repeat(count)}</div><div class="grid-mark" style="grid-column:${logo}">${mark}</div><strong style="grid-column:${headline}">${esc(project.headline || project.name)}</strong><p style="grid-column:${caption}">${esc(project.applicationLine || project.application || project.screenTitle)}</p></div><p class="grid-note">${note}</p>`;
}
