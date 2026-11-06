// Styles for p-front.js (classes start kf-). Page 794 x 1123, margin 56, on the gate's open sheet (.k-sheet, css-k.js).
// Same elevation language as the gate: 1 px and 1.5 px Rod lines, no shadows. The first and second indentions of a catalogue card
// are the margin plus 40 px and plus 80 px (96 px and 136 px from the page edge); text starts on the margin or one of the two,
// nowhere else. Other lanes read the two values from here. Goudy Bookletter 1911 (.k-disp) at 24 px and over only.
export const kIndent1 = 40;
export const kIndent2 = 80;

export const cssPFront = (ctx) => `
.kf-pg{--i1:${kIndent1}px;--i2:${kIndent2}px}
.kf-body{flex:1;display:flex;flex-direction:column;min-height:0;margin-bottom:72px}

/* the card's indentions, ruled: a 1 px Rod line 8 px before each stop, as the ruled line stands before the typed text on a card.
   A line starts at the top of the first block set on its stop (.kf-r1, .kf-r2, .kf-trait--r) and runs down behind the text to
   the foot of the ruled block, which clips it, so it never crosses type set further left */
.kf-ruled{position:relative;isolation:isolate;overflow:hidden;flex:1;display:flex;flex-direction:column}
.kf-r1,.kf-r2,.kf-trait--r{position:relative}
.kf-r1::before,.kf-r2::after,.kf-trait--r::before{content:'';position:absolute;top:0;height:3000px;z-index:-1;border-left:1px solid var(--rod)}
.kf-r1::before{left:calc(var(--i1) - 8px)}
.kf-r2::after{left:calc(var(--i2) - 8px)}
.kf-trait--r::before{left:-8px}
.kf-pretty{text-wrap:pretty}

/* guide card as a section divider: the card's top edge full width, the tab cut left, centre or right (the typefaces page's set).
   The tab sits in the flow on the card's edge, so a taller tab (a slot) pushes the card down instead of running into the text above */
.kf-gc{display:flex;flex-direction:column}
.kf-gct{position:relative;z-index:1;margin-bottom:-1.5px;display:flex;align-items:baseline;gap:8px;max-width:62%;padding:7px 14px 6px;background:var(--face);border:1.5px solid var(--rod);border-bottom:0;border-radius:8px 8px 0 0;font-family:var(--body);font-weight:500;font-size:15px;line-height:20px;color:var(--ink)}
.kf-gct b{font-weight:600;color:var(--rod);flex:none}
.kf-gc--l .kf-gct{align-self:flex-start}
.kf-gc--c .kf-gct{align-self:center}
.kf-gc--r .kf-gct{align-self:flex-end}
.kf-gcb{border-top:1.5px solid var(--rod);padding-top:16px}

/* contents: guide cards in an open drawer, third-cut tabs stepping left, centre, right. Goudy's figures are old-style only, so the
   tab numeral is set in Newsreader's lining figures, on the label's baseline */
.kf-body--ct{margin-bottom:76px}
.kf-drw{position:relative;isolation:isolate;flex:1;display:flex;flex-direction:column;padding:38px 12px 0;border-left:1.5px solid var(--rod);border-right:1.5px solid var(--rod);overflow:hidden}
.kf-gds{flex:1;display:flex;flex-direction:column}
.kf-gd{position:relative;flex:1 1 0;min-height:0;padding:10px 22px 34px;background:var(--face);box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod)}
.kf-gd:last-child{padding-bottom:28px}
.kf-gtab{position:absolute;bottom:100%;width:33.333%;height:30px;margin-bottom:-1px;display:flex;align-items:baseline;gap:12px;padding:3px 14px 0;background:var(--face);border-radius:8px 8px 0 0;box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod)}
.kf-gd--l .kf-gtab{left:0}
.kf-gd--c .kf-gtab{left:33.333%}
.kf-gd--r .kf-gtab{left:66.667%}
.kf-gn{font-family:var(--body);font-weight:500;font-size:21px;line-height:24px;font-variant-numeric:lining-nums;color:var(--ink)}
.kf-gr{font-size:12px;line-height:16px;color:var(--rod);white-space:nowrap}
.kf-gt{font-size:24px;line-height:1.1;color:var(--ink);padding-bottom:.12em;margin-bottom:-.12em}
.kf-cn{font-family:var(--body);font-size:12px;line-height:16px;color:var(--rod);max-width:600px;margin-top:3px}
.kf-lip{position:absolute;left:0;right:0;bottom:0;height:20px;z-index:40;background:var(--ground);border-top:1.5px solid var(--rod)}
.kf-ctl{font-family:var(--body);font-size:15px;line-height:23px;color:var(--ink);margin-top:20px;flex:none}

/* intro: the main entry at page size. Heading at the first indention; the title paragraph hangs from the second back to the first
   (padding to the first, the first line pushed on to the second); the notes at the second; the foot at the first */
.kf-ihd{font-size:24px;line-height:1.15;margin-top:24px;padding-left:var(--i1);padding-bottom:.12em;margin-bottom:-.12em}
.kf-desc{font-size:54px;line-height:1.14;padding-left:var(--i1);text-indent:calc(var(--i2) - var(--i1));margin-top:20px;text-wrap:pretty;padding-bottom:.12em;margin-bottom:-.12em}
.kf-desc .ph-b{display:block;width:auto;margin-left:calc(var(--i2) - var(--i1));text-indent:0}
.kf-notes{display:flex;flex-direction:column;gap:16px;margin-top:40px;padding-left:var(--i2);max-width:calc(var(--i2) + 540px)}
.kf-note{font-family:var(--body);font-size:17px;line-height:26px}
.kf-note b{font-weight:600}
.kf-foot{margin-top:auto;padding-top:56px;display:flex;flex-direction:column;gap:6px;padding-left:var(--i1);flex:none}
.kf-foot--in{padding-top:12px}
.kf-trace{font-family:var(--body);font-size:14px;line-height:21px;color:var(--rod)}
.kf-trace b{font-weight:600;color:var(--ink)}
.kf-see{font-family:var(--body);font-size:14px;line-height:21px;color:var(--ink)}
.kf-see b{font-weight:600;margin-right:4px}

/* personality: the ruled card, the traits on the card's three stops (margin, first, second indention), 64 px under the lines */
.kf-plines{display:flex;flex-direction:column;gap:8px}
.kf-pline{font-size:32px;line-height:1.15;padding-bottom:.12em;margin-bottom:-.12em}
.kf-trs{margin-top:52px;padding-top:12px;gap:36px}
.kf-trait{margin-left:calc(var(--k) * var(--i1));max-width:540px}
.kf-tw{font-size:88px;line-height:1;padding-bottom:.1em;margin-bottom:-.1em;overflow-wrap:anywhere}
.kf-tm{font-family:var(--body);font-size:16px;line-height:24px;margin-top:10px;max-width:440px}

/* voice: the guide set, each habit's line filed under its tab at the first indention */
.kf-vps{flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:32px;margin-top:8px}
.kf-vx{font-size:28px;line-height:1.2;color:var(--ink);max-width:calc(var(--i1) + 600px);padding-left:var(--i1);text-wrap:pretty;padding-bottom:.12em;margin-bottom:-.12em}

/* write this: the entry, its note, and the See reference filed for the line it replaces */
.kf-wes{margin-top:28px;display:flex;flex-direction:column;gap:36px}
.kf-we{position:relative;padding-left:var(--i1)}
.kf-wn{position:absolute;left:0;top:6px;font-size:13px;line-height:18px;color:var(--rod)}
.kf-ww{font-size:26px;line-height:1.15;max-width:620px;padding-bottom:.12em;margin-bottom:-.12em}
.kf-we--first .kf-ww{font-size:64px;line-height:1.05}
.kf-we--first .kf-wn{top:20px}
.kf-wb{font-family:var(--body);font-size:15px;line-height:22px;margin-top:6px;max-width:560px;padding-left:var(--i1)}
.kf-wr{font-family:var(--body);font-size:14px;line-height:21px;color:var(--rod);margin-top:6px;max-width:calc(var(--i2) + 520px);padding-left:var(--i2);text-wrap:pretty}
.kf-wr b{font-weight:600;color:var(--ink);margin:0 3px}
.kf-wsee{display:block;margin-top:2px}
.kf-wr .kf-wsee b{margin:0 3px 0 0}

/* messaging: the lines by size, the boilerplates in one column at the second indention with their collation, ruled down to the
   guide card that files the name */
.kf-mru{flex:none}
.kf-mp{font-size:60px;line-height:1.05;margin-top:20px;text-wrap:balance;padding-bottom:.12em;margin-bottom:-.12em}
.kf-mo{display:flex;flex-direction:column;gap:6px;margin-top:20px;padding-left:var(--i2)}
.kf-mol{font-size:28px;line-height:1.15;padding-bottom:.12em;margin-bottom:-.12em}
.kf-bps{display:flex;flex-direction:column;margin-top:56px;padding-left:var(--i2);max-width:calc(var(--i2) + 540px)}
.kf-bt{font-family:var(--body);font-size:17px;line-height:26px}
.kf-coll{font-family:var(--body);font-size:12px;line-height:16px;color:var(--rod);margin-top:6px}
.kf-coll + .kf-bt{margin-top:32px}
.kf-nm{flex:none;margin-top:48px}
.kf-nmn{font-size:28px;line-height:1.15;padding-bottom:.12em;margin-bottom:-.12em}
.kf-nmr{font-family:var(--body);font-size:15px;line-height:23px;margin-top:8px;max-width:calc(var(--i1) + 540px);padding-left:var(--i1)}
`;
