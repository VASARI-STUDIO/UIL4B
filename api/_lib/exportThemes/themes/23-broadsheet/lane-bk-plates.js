// Theme 23, Broadsheet, brand book lane: the halftone plates for the web edition.
// The paper draws a brand's photographs as dots in inline SVG, read once in a browser. The server holds no photographs and no browser (its
// pictures are neutral scene plates), so no plate is drawn: plateOf finds none, plateSvg prints nothing, and the pages that would hold a plate
// run without one.
export const plateOf = () => null;
export const plateSvg = () => '';
