// Styles for u-screens.js: screen-light, screen-dark, screen-mobile, tokens, code. Classes start ru4-.
// Page 794 x 1123, margin 72, spacing on a 4 px base. A printed sheet is the gate's .r-sheet (the paper and its hairline) with a 32 px
// margin for its crosses and crop marks; the screen prints at the trim with no edge of its own. Mono only on literal values.
export const cssUScreens = () => `
.ru4-pg .r-lead b{font-weight:600;color:var(--ink)}
.ru4-sh{padding:32px;--xi:8px}
.ru4-trim{position:relative}
.ru4-cm{position:absolute;display:block;background:var(--ink)}
/* the job line (the same four rules as p-image.js, renamed) */
.ru4-job{margin-top:8px;max-width:72ch;font-family:var(--body);font-size:12px;line-height:1.5;color:var(--quiet);text-wrap:pretty}
.ru4-jd{white-space:normal}
.ru4-sw{display:inline-block;width:8px;height:8px;margin-right:4px;vertical-align:0;outline:1px solid var(--hair);outline-offset:-1px}
.ru4-sm__side .ru4-job{margin-top:24px;padding-top:16px;border-top:1px solid var(--hair)}
/* the page's one plain paragraph: sentences, no run-in labels, no grid */
.ru4-np{margin:0;max-width:62ch;font-family:var(--body);font-size:14px;line-height:1.55;color:var(--ink);text-wrap:pretty}
.ru4-np .r-mono{font-size:12px;white-space:nowrap}

/* the product screen (desktop), printed at the trim: 586 px wide */
.ru4-scr{display:flex;flex-direction:column;width:586px;overflow:hidden;background:var(--surface);color:var(--text)}
.ru4-scr .ui-topbar{flex:none}
.ru4-main{display:grid;grid-template-columns:minmax(0,1fr) 252px;gap:16px;padding:28px 20px 32px;background:var(--surface)}
.ru4-lbl{font:500 var(--fs-label)/1 var(--ff-body);color:var(--quiet);margin:0 0 12px}
.ru4-eta{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.ru4-time{font-size:var(--fs-title);line-height:var(--lh-title);margin:0;color:var(--text)}
.ru4-pickup{margin:8px 0 0;color:var(--text-soft);font-size:var(--fs-body);line-height:1.5}
.ru4-prog{margin-top:24px}
.ru4-route{display:flex;justify-content:space-between;gap:12px;margin-top:8px;font:400 12px/1.4 var(--ff-body);color:var(--quiet)}
.ru4-rider{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:start;gap:4px 12px;margin-top:24px;padding-top:16px;border-top:1px solid var(--divider)}
.ru4-rmain{min-width:0}
.ru4-rbtn{grid-column:2;margin-top:8px}
.ru4-rname{margin:0;font:500 15px/1.4 var(--ff-body)}
.ru4-rsub{margin:0;font:400 13px/1.4 var(--ff-body);color:var(--quiet)}
.ru4-detail{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin:12px 0 0;border-top:1px solid var(--divider)}
.ru4-detail div{padding:8px 0;border-bottom:1px solid var(--divider)}
.ru4-detail dt{font:400 12px/1.4 var(--ff-body);color:var(--quiet)}
.ru4-detail dd{margin:0;font:500 14px/1.4 var(--ff-body);font-variant-numeric:tabular-nums}
.ru4-track .ui-btn--block{margin-top:16px}
.ru4-list{min-width:0}
/* the list: the right column is fixed at 96 px, the title takes the rest and wraps (never runs into the value or the chip) */
.ru4-list .ui-row{gap:8px;align-items:flex-start}
.ru4-list .ui-row__end{width:96px;min-width:0;flex:none}
.ru4-list .ui-row__end .ph-c,.ru4-list .ui-row__title .ph-c,.ru4-list .ui-row__sub .ph-c{white-space:normal}
.ru4-book{margin-top:20px;display:flex}

/* screen-light and screen-dark: the screen first, straight under the running head; the job line, then the title large at left and the notes
   in a column at right. Light prints on a full-bleed field of the accent drum; dark's own ground is the edge, so its sheet has no hairline */
.ru4-sd{position:absolute;left:72px;right:72px;top:96px}
.ru4-sd .ru4-sh--desk{outline:none}
.ru4-sd--l{left:0;right:0;top:80px}
.ru4-sd--l .ru4-sd__u{padding:0 72px}
.ru4-band{position:relative;isolation:isolate;display:flex;justify-content:center;padding:40px 0;--xi:14px}
.ru4-sd__foot{display:grid;grid-template-columns:240px minmax(0,1fr);gap:40px;margin-top:28px;padding-top:20px;border-top:1px solid var(--hair)}
/* dark: the title and the paragraph are the lead, above the figure */
.ru4-sd--d{top:256px}
.ru4-pg--sdd .r-lead{max-width:64ch;font-size:15px;line-height:1.55;color:var(--ink)}
.ru4-pg--sdd .r-lead .r-mono{font-size:13px;white-space:nowrap}

/* code and screen-mobile carry no lead, so the body starts under the title */
.ru4-pg--cd .r-body,.ru4-pg--sm .r-body{top:176px}

/* screen-mobile: the phone (390 x 660) printed at the left, the paragraph and the job line in a narrow column at the right */
.ru4-sm{display:grid;grid-template-columns:auto minmax(0,1fr);gap:32px;align-items:start}
.ru4-sm__side{padding-top:8px}
.ru4-ph{width:390px;height:660px;box-sizing:border-box;display:flex;flex-direction:column;background:var(--surface);color:var(--text)}
.ru4-ph__top{display:flex;justify-content:space-between;align-items:center;padding:16px 24px 0;font:600 13px/20px var(--ff-body)}
.ru4-ph__top .ui-display{font-size:14px;line-height:1}
.ru4-ph__body{flex:1;min-height:0;padding:20px 24px;display:flex;flex-direction:column}
.ru4-ph__chip{display:flex}
.ru4-ph__time{margin:12px 0 0;font-size:var(--fs-title);line-height:var(--lh-title)}
.ru4-ph__body .ru4-rider{margin-top:16px}
.ru4-ph__body .ui-btn--block{margin-top:auto}
.ru4-ph .ui-tabbar{flex:none}

/* tokens: the colour run sheet in three columns, then three columns of the other groups */
.ru4-tok{top:208px}
.ru4-cts{columns:3;column-gap:24px}
.ru4-ct{display:flex;align-items:flex-start;gap:8px;break-inside:avoid;padding-bottom:8px}
.ru4-ct__f{display:flex;flex:none;width:32px;height:28px}
.ru4-ct__f i{display:block;flex:1}
.ru4-ct__t{display:flex;flex-direction:column;min-width:0}
.ru4-ct__n{font-size:11px;line-height:1.3;color:var(--ink)}
.ru4-ct__v{display:flex;gap:8px;line-height:1.3;color:var(--quiet)}
.ru4-ct__v .r-mono{font-size:12px}
.ru4-tk{margin-top:4px;font-size:12px;line-height:1.4;color:var(--quiet)}
.ru4-tgs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:24px;padding-top:20px;border-top:1px solid var(--hair)}
.ru4-tgc .ru4-tg+.ru4-tg{margin-top:20px}
.ru4-tg .r-tg__h{margin-bottom:4px}
.ru4-tg__n{margin:0 0 10px;font-size:12px;line-height:1.4;color:var(--quiet)}
.ru4-tg__n .r-mono{font-size:11px;white-space:nowrap}
.ru4-te{margin:0}
.ru4-te div{display:flex;justify-content:space-between;gap:8px;line-height:1.5}
.ru4-te dt{font-size:11px;color:var(--quiet);white-space:nowrap}
.ru4-te dd{margin:0;font-size:12px;color:var(--ink);text-align:right;min-width:0}
.ru4-te dd .r-mono{font-size:11px}
.ru4-te--st div{display:block}
.ru4-te--st dd{text-align:left;font-family:var(--body);font-size:13px}
.ru4-sp{margin:0}
.ru4-sp div{display:grid;grid-template-columns:52px minmax(0,1fr);align-items:center;gap:8px;min-height:22px}
.ru4-sp dt{font-size:11px;color:var(--quiet)}
.ru4-sp dd{margin:0;display:flex;align-items:center;gap:8px}
.ru4-sp i{display:block;height:8px;background:var(--ink)}
.ru4-sp .r-mono{font-size:11px;color:var(--ink)}

/* code: the install block across the page, then the Tailwind block with the notes beside it, the package's files across the foot; an Ink block is its own edge */
.ru4-cd{display:grid;grid-template-columns:300px minmax(0,1fr);gap:40px 32px;align-items:start}
.ru4-cf{margin:0;min-width:0}
.ru4-cf--wide{grid-column:1 / -1}
.pg .ru4-cf--wide pre.ui.ru4-code{padding:28px 32px;font-size:14px}
.ru4-cf figcaption{margin-bottom:12px}
.ru4-cf .ru4-tg__n{margin:0}
.pg pre.ui.ru4-code{margin:0;padding:20px 24px;background:var(--surface);color:var(--text);font-family:var(--mono);font-weight:400;font-size:12px;line-height:1.6;white-space:pre;overflow:hidden}
.pg pre.ui.ru4-code code{font:inherit}
.ru4-cd__text{padding-top:4px}
.ru4-pk{grid-column:1 / -1;padding-top:20px;border-top:1px solid var(--hair)}
.ru4-files{columns:3;column-gap:24px}
.ru4-files li{break-inside:avoid;padding-bottom:12px}
.ru4-fn{display:block;font-size:12px;line-height:1.4;color:var(--ink)}
.ru4-fd{display:block;font-family:var(--body);font-size:13px;line-height:1.4;color:var(--ink)}
`;
