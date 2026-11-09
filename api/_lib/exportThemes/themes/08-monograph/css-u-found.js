// Styles for u-found.js: the Riso UI kit's cover and foundations pages. Classes start ru1-. Page 794 x 1123, margin 72, spacing on a
// 4 px base. The gate's sheet (.r-sheet: the paper, edged by a hairline, crosses at its corners) frames every figure; components
// inside a .ui region keep the engine's own styles. Mono only on literal values.
export const cssUFound = () => `
.ru1-body{top:208px}
.ru1-fig{margin:0}
.ru1-fig>figcaption{margin-top:0}
/* the job line, copied from p-image.js (.ri-job, .ri-jd, .ri-sw): one line under the figure, flush with the sheet's left edge */
.ru1-job{margin-top:8px;max-width:72ch;font-family:var(--body);font-size:12px;line-height:1.5;color:var(--quiet);text-wrap:pretty}
.ru1-jd,.ru1-jn{white-space:normal}
.ru1-sw{display:inline-block;width:8px;height:8px;margin-right:4px;vertical-align:0;outline:1px solid var(--hair);outline-offset:-1px}
.ru1-pg--dk .ru1-sw{outline-color:var(--quiet)}
.ru1-gap{margin-top:12px}
/* the page's words: one short paragraph under a figure (round 2: no note grid, no headings) */
.ru1-para{margin-top:20px;max-width:62ch;font-family:var(--body);font-size:14px;line-height:1.55;color:var(--ink);text-wrap:pretty}
.ru1-para .r-mono{color:var(--ink)}
.ru1-para--u{margin-top:12px}
.ru1-para--s{margin-top:0}
.ru1-para--el{grid-column:1 / -1;margin-top:0}
.r-sheet.ru1-cl{outline:0}
.ru1-pg--dk .r-lead{max-width:68ch}
.ru1-notes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:24px}
.ru1-notes--3{grid-template-columns:repeat(3,minmax(0,1fr))}
.ru1-notes--one{grid-template-columns:minmax(0,52ch)}
.ru1-notes--col{grid-template-columns:minmax(0,1fr);gap:16px;margin-top:0}
.ru1-hq{margin-left:8px;font-weight:400;font-size:13px;color:var(--quiet)}
.ru1-nh{font-family:var(--chrome);font-weight:600;font-size:14px;line-height:1.3;color:var(--ink)}
.ru1-np{margin-top:4px;max-width:62ch;font-family:var(--body);font-size:13px;line-height:1.5;color:var(--quiet)}
.ru1-np .r-mono,.ru1-ln .r-mono,.ru1-sc__r .r-mono{color:var(--ink)}
.ru1-sc__r .r-mono{white-space:nowrap}

/* cover: the kit's name large, one composite sheet (the Blush plate with the logo, the product line, the real button), the imprint */
.ru1-cv__t{position:absolute;left:72px;top:72px;right:72px;font-family:var(--chrome);font-weight:700;font-size:96px;line-height:0.95;letter-spacing:-0.03em;color:var(--ink)}
.ru1-cv__b{display:block;margin-bottom:8px;font-weight:500;font-size:16px;line-height:1.4;letter-spacing:0}
.ru1-cv{position:absolute;left:72px;right:72px;top:236px}
.ru1-cv__sh{display:grid;grid-template-columns:304px minmax(0,1fr);gap:0;height:690px;padding:40px;--xi:8px}
.ru1-cv__pl{position:relative;display:flex;align-items:flex-end;padding:28px}
.ru1-cv__lg{line-height:0}
.ru1-cv__ui{display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;gap:28px;padding:0 0 4px 32px;background:transparent}
.ru1-cv__p{font-weight:500;font-size:30px;line-height:1.15;letter-spacing:-0.01em;text-wrap:balance}
.ru1-cv__im{position:absolute;left:72px;bottom:72px;font-size:14px;line-height:1.6;color:var(--ink)}
.ru1-cv__im .num{color:var(--quiet)}

/* contents: sections down the page, the number large in the action drum, the pages in two columns with reference and folio */
.ru1-toc{position:absolute;left:72px;right:72px;top:200px}
.ru1-ts{display:grid;grid-template-columns:120px minmax(0,1fr);column-gap:16px;padding:20px 0 28px;border-top:1px solid var(--hair)}
.ru1-ts:first-child{padding-bottom:56px}
.ru1-ts__n{font-family:var(--chrome);font-weight:700;font-size:72px;line-height:0.85;letter-spacing:-0.03em}
.ru1-ts:first-child .ru1-ts__n{font-size:120px}
.ru1-ts__t{font-family:var(--chrome);font-weight:700;font-size:24px;line-height:1.15;letter-spacing:-0.01em;color:var(--ink)}
.ru1-ts:first-child .ru1-ts__t{font-size:32px}
.ru1-ts__p{margin-top:12px;columns:2;column-gap:32px;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--ink)}
.ru1-ts__p li{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:8px;break-inside:avoid;padding:3px 0}
.ru1-ts__r,.ru1-ts__f{color:var(--quiet)}

/* role captions, shared by both colour pages */
.ru1-rc{font-size:13px;line-height:1.4}
.ru1-nw{white-space:nowrap}
.ru1-rl{font-weight:600}
.ru1-rc .r-mono{font-size:11px}
.ru1-rm{font-family:var(--body);font-size:12px;line-height:1.4}
.ru1-rm b{font-family:var(--chrome);font-weight:700}
.ru1-pt{display:flex;align-items:center;justify-content:center;font-family:var(--ff-body);font-weight:500;font-size:16px;line-height:1}
.ru1-pt--ring{box-shadow:inset 0 0 0 1px var(--divider)}

/* colour, light: a test print on one sheet. The grounds as fields (Surface widest), the text roles printed on their ground; then runs */
.ru1-cl{padding:20px;--xi:2px}
.ru1-cl__pr{background:transparent}
.ru1-cl .r-tg__h{font-size:14px;margin-bottom:6px}
.ru1-cl+figcaption,.ru1-cl~.ru1-job{margin-top:8px}
.ru1-body .ru1-fig+.ru1-notes{margin-top:16px}
.ru1-gr{display:grid;grid-template-columns:minmax(0,2.1fr) minmax(0,1fr) minmax(0,1fr);gap:0}
.ru1-gf{padding:14px 12px 16px;min-width:0}
.ru1-gf--s{outline:1px solid var(--divider);outline-offset:-1px}
.ru1-gf__n{font-family:var(--ff-display);font-weight:500;font-size:22px;line-height:1.15;margin-bottom:4px}
.ru1-gf .ru1-rm{color:var(--quiet)}
.ru1-tls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}
.ru1-tl{margin-top:10px}
.ru1-tl__s{font-family:var(--ff-body);font-weight:500;font-size:16px;line-height:1.3;text-wrap:balance}
.ru1-run{display:grid;gap:12px}
.ru1-run li{min-width:0}
.ru1-run .ru1-pt{height:32px;margin-bottom:6px}
.ru1-run--act{grid-template-columns:repeat(4,minmax(0,1fr))}
.ru1-run--act .ru1-pt{height:32px}
.ru1-run--ln{grid-template-columns:repeat(5,minmax(0,1fr))}
.ru1-run--st{grid-template-columns:repeat(4,minmax(0,1fr))}
.ru1-run--st .ru1-pt{height:28px;width:56px}
.ru1-run .ru1-rm{color:var(--quiet)}

/* colour, dark: the drum room. A sheet whose print area is flooded with the dark ground; the rule large, then a two-column control strip */
.ru1-pg--dk .ru1-body{top:264px}
.ru1-fl{padding:0;background:transparent}
.ru1-fl__hd{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;padding-bottom:24px;border-bottom:1px solid var(--divider)}
.ru1-fl__l{max-width:24ch;font-weight:500;font-size:26px;line-height:1.2;letter-spacing:-0.01em;color:var(--text);text-wrap:balance}
.ru1-fl__cs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px;margin-top:24px}
.ru1-cs li{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;align-items:center}
.ru1-cs .ru1-pt{height:50px}
.ru1-cs__c{padding:4px 0}
.ru1-cs .ru1-rc{color:var(--text)}
.ru1-cs .ru1-rm{color:var(--quiet)}

/* type scale: a reading column on one sheet, the specs in the right margin past a margin rule */
.ru1-body--ty{top:168px}
.ru1-tsh{padding:40px 0 40px 36px;--xi:2px}
.ru1-tys{display:flex;flex-direction:column;gap:32px;background:transparent}
.ru1-ty{display:grid;grid-template-columns:minmax(0,1fr) 196px;column-gap:24px;align-items:start}
.ru1-ty__s{color:var(--text);max-width:24em;padding-top:4px}
/* a slot placeholder chip would cap its own size at 20 px; inside a sample it takes the sample's face and size, so the scale shows */
.ru1-ty__s .ph-c{font:inherit;letter-spacing:inherit}
.ru1-ty__m{border-left:1px solid var(--hair);padding:2px 24px 2px 16px;font-family:var(--chrome);font-size:13px;line-height:1.4;color:var(--ink)}
.ru1-ty__n{display:block;font-weight:600;font-size:14px}
.ru1-ty__m .r-mono{display:block}
.ru1-ty__u{display:block;font-family:var(--body);font-size:12px;color:var(--quiet)}
.ru1-body--ty .ru1-notes{margin-top:24px}

/* spacing: a staircase of solids at true size on one baseline; then grouping measured on a real form, and the control heights */
/* the plate: one printed sheet of the kit's parts at true size. Each space is a band in the field drum (--bl) with its step number
   beside it on a short rule; three columns of 150 px, each with 24 px at its right for the numbers. The crosses are the sheet's edge. */
.r-sheet.ru1-pl,.r-sheet.ru1-gp,.r-sheet.ru1-ht{outline:0}
.ru1-body--sp{top:184px}
.ru1-pl{padding:24px 28px 28px;--xi:2px}
.ru1-pl__c{display:flex;justify-content:space-between;align-items:flex-start}
.ru1-pl__c>div{width:174px}
.ru1-pl__c>div>*{width:150px}
.ru1-vg{position:relative;display:block;background:var(--bl)}
.ru1-vg::after{content:"";position:absolute;left:100%;top:50%;width:6px;border-top:1px solid var(--ink)}
.ru1-mk{position:absolute;left:calc(100% + 9px);top:50%;transform:translateY(-50%);font-family:var(--chrome);font-weight:700;font-size:12px;line-height:1;color:var(--ink);white-space:nowrap}
.ru1-mk.r-mono{font-weight:400}
.ru1-br,.ru1-sg,.ru1-bt{display:block}
.ru1-bt{height:44px}
.ru1-bx{position:relative;display:block;outline:1px solid var(--ink);outline-offset:-1px}
.ru1-bx__in{padding:0 var(--p) var(--p)}
.ru1-key{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 24px;margin-top:12px}
.ru1-key li{display:grid;grid-template-columns:18px minmax(0,1fr);column-gap:6px;font-size:12px;line-height:1.4;color:var(--ink)}
.ru1-key__n{grid-row:1 / 3;font-family:var(--chrome);font-weight:700}
.ru1-key__t{white-space:nowrap}
.ru1-key .r-mono{font-size:11px}
.ru1-key__u{font-family:var(--body);color:var(--quiet)}
/* grouping on a real form and the control heights, side by side */
.ru1-sp2{display:grid;grid-template-columns:412px minmax(0,1fr);gap:24px;margin-top:20px;align-items:start}
.ru1-notes--u{margin-top:12px}
.ru1-gp{padding:24px 56px 24px 24px;--xi:2px}
.ru1-gp__ui{background:transparent}
.ru1-ht{padding:24px 20px;--xi:2px}
.ru1-ht__r{display:flex;flex-direction:column;align-items:flex-start;gap:24px;background:transparent}
.ru1-ht__i{display:flex;align-items:flex-start;gap:8px}
.ru1-ht__b{min-width:0}
.ru1-ht__b p{margin-top:6px;color:var(--ink)}
.ru1-dm{position:relative;display:block;flex:none;width:9px;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)}
.ru1-dm::before{content:"";position:absolute;left:4px;top:0;bottom:0;border-left:1px solid var(--ink)}

/* radii and borders: the magnified corner large, the controls sheet and the card beside it; the edges sheet under both */
/* two columns on one top line: the corner, with its token list as its caption, then the edges notes, at the left; the controls sheet, the card and the edges sheet at the right */
.ru1-rb{display:grid;grid-template-columns:232px minmax(0,1fr);column-gap:32px;align-items:start}
.ru1-rb__l{display:flex;flex-direction:column;gap:24px}
.ru1-rb__t{display:flex;flex-direction:column;gap:12px}
.ru1-rb__r{display:flex;flex-direction:column;gap:24px;min-width:0}
.ru1-cnf{margin:0}
.ru1-cn{display:block}
.ru1-cn__t{margin-top:12px;font-weight:600;font-size:14px;line-height:1.3;color:var(--ink)}
.ru1-rd{padding:24px;--xi:2px}
.ru1-rd__ui{display:flex;flex-wrap:wrap;align-items:center;gap:24px;background:transparent}
.ru1-rd__r{display:flex;align-items:center;gap:20px}
.ru1-rd__cd{max-width:320px;background:transparent}
.ru1-ln{font-size:13px;line-height:1.6;color:var(--ink)}
/* the edges: the row and two fields hold their own edges, so the sheet is its four crosses only; the fields take a full 332 px column */
.r-sheet.ru1-bd{outline:0}
.ru1-bd{padding:16px 24px 20px;--xi:2px}
.ru1-bd__ui{background:transparent}
.ru1-bd .ui-row__end{flex:0 1 auto;min-width:0;max-width:96px}
.ru1-bd__f{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;margin-top:12px}
.ru1-notes--in{grid-template-columns:minmax(0,1fr);margin-top:0;gap:16px}

/* elevation: the ground steps as pulled sheets, the card and the dialog on the open page (the dialog large) */
.ru1-el{top:216px;display:grid;grid-template-columns:340px minmax(0,1fr);column-gap:48px;row-gap:20px;align-items:start}
.ru1-gsf{margin:0}
/* one sheet, the crosses at its four outer corners; the three grounds step down it, each held by its own hairline (Surface is Wall) */
.r-sheet.ru1-gss{width:340px;height:436px;outline:0;--xi:2px}
.ru1-gso{position:absolute;inset:0}
.ru1-gs{position:absolute;left:calc(20px + var(--i) * 30px);top:calc(20px + var(--i) * 100px);width:240px;height:196px;padding:16px 20px;outline:1px solid var(--hair);outline-offset:-1px;isolation:isolate;z-index:calc(var(--i) + 1)}
.ru1-gs__n{font-family:var(--chrome);font-weight:700;font-size:20px;line-height:1.1;color:var(--ink)}
.ru1-gs__c{margin-top:4px;font-size:12px;line-height:1.4;color:var(--ink)}
.ru1-gs__u{margin-top:2px;font-family:var(--body);font-size:13px;line-height:1.4;color:var(--quiet)}
.ru1-gsf figcaption,.ru1-lf figcaption{margin-top:12px}
.ru1-lf{margin:0}
.ru1-lf__ui{background:transparent}
.ru1-lf--card .ru1-lf__ui{max-width:262px}
.ru1-lf--dlg{grid-column:1 / -1;display:grid;grid-template-columns:440px minmax(0,1fr);gap:40px;align-items:end}
.ru1-lf--dlg .ru1-lf__ui .ui-dialog{max-width:none;width:440px;position:static}
.ru1-notes--el{grid-column:1 / -1;margin-top:0}

/* states: the button run on one sheet, a state to a line in press order, its rule beside it; the field and the choices on a second */
.ru1-stb{top:156px}
.r-sheet.ru1-sb,.r-sheet.ru1-s2{outline:0}
.ru1-sb{padding:20px 24px 24px;--xi:2px}
.ru1-scs{display:flex;flex-direction:column;gap:8px;background:transparent}
.ru1-sc{display:grid;grid-template-columns:72px auto minmax(0,1fr);column-gap:20px;align-items:center;min-width:0}
.ru1-sc__h{font-family:var(--chrome);font-weight:600;font-size:13px;line-height:1.3;color:var(--ink);margin-bottom:8px}
.ru1-sc .ru1-sc__h{margin-bottom:0}
.ru1-sc__b{display:flex;align-items:center;gap:12px}
.ru1-na{font-family:var(--body);font-size:12px;line-height:1.45;color:var(--quiet);max-width:132px}
.ru1-sc__r{font-family:var(--body);font-size:12px;line-height:1.45;color:var(--quiet)}
.ru1-stb>.ru1-fig+.ru1-fig{margin-top:16px}
.ru1-s2{padding:20px 20px 24px;--xi:2px}
/* the text fields take the sheet's full width, two columns of about 300 px, so a slot placeholder is never cut; the choices go under them */
.ru1-s2__ui{display:grid;grid-template-columns:minmax(0,1fr);gap:24px;background:transparent}
.ru1-sf__l{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 20px}
.ru1-sf__l li{position:relative}
.ru1-sf__l .ru1-sc__h{position:absolute;right:0;top:0}
.ru1-sx__l{display:flex;flex-direction:column;gap:16px}
.ru1-sx__l li{display:grid;grid-template-columns:72px minmax(0,1fr) minmax(0,1fr);column-gap:20px;align-items:center;min-width:0}
.ru1-sx__l .ru1-sc__h{margin-bottom:0}
/* a card's title breaks evenly and its text never leaves one word alone */
.ru1-pg .ui-card__title{text-wrap:balance}
.ru1-pg .ui-card__text{text-wrap:pretty}
`;
