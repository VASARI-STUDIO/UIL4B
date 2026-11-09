import { cssNum } from '../../engine/escape.js';
// Styles for p-apps.js (classes start ra-): business-card, social, signage, email-signature, digital, summary, contact-scope.
// Page 794 x 1123, margin 72, spacing on a 4 px base. Sheets use the gate's r-sheet (paper edged by a hairline); nothing here restyles a
// gate class. Familjen Grotesk is the chrome; the brand's faces only where the thing itself uses them; mono only on literal values.

export const cssPApps = (ctx) => `
.ra-b{position:absolute;left:72px;right:72px;top:176px}
.ra-tx{font-family:var(--body);font-size:13px;line-height:1.5;color:var(--ink)}
.ra-tx .num{white-space:nowrap}
.ra-ab{position:absolute}
.ra-lg{line-height:0}
.ra-cap{font-size:13px;line-height:1.4;color:var(--quiet)}
.ra-cap__t{font-weight:600;color:var(--ink)}
.ra-crop{position:absolute;display:block;pointer-events:none}

.ra-fg{margin:0}

/* the job line (review D1, one form across the lanes): one line under the figure, flush with its left edge, at most two lines;
   each drum an 8 px swatch, then Drum n Name, then what it prints */
.ra-job{margin-top:12px;font-family:var(--body);font-size:12px;line-height:1.5;color:var(--quiet);text-wrap:pretty}
.ra-job b{font-weight:600}
.ra-jsw{display:inline-block;width:8px;height:8px;margin-right:6px;vertical-align:0}
.ra-cap+.ra-job{margin-top:4px}

/* business card: two pulled sheets in a zigzag, the notes on the open side */
.ra-b--bc{top:216px}
.ra-bc__r{display:grid;grid-template-columns:auto minmax(0,1fr);gap:24px;align-items:start}
.ra-bc__r--b{grid-template-columns:minmax(0,1fr) auto;margin-top:24px}
.ra-bc__r--b .ra-bc__n{text-align:right}
.ra-bc .ra-job{max-width:504px}
.ra-bc__sh{padding:36px;--xi:6px}
.ra-bc__trim{position:relative}
.ra-bc__n{padding-top:36px}
.ra-card{position:relative;width:100%;height:100%;overflow:hidden}
.ra-card--f{display:flex;align-items:center;justify-content:center}
.ra-card--b{background:var(--ground);color:var(--ink);font-family:var(--body)}
.ra-card__mk{position:absolute;right:32px;top:32px;line-height:0}
.ra-card__nm{position:absolute;left:36px;bottom:92px;font-size:22px;line-height:1.2}
.ra-card__rl{position:absolute;left:36px;bottom:72px;font-size:12px;line-height:1.4;color:var(--soft)}
.ra-card__ct{position:absolute;left:36px;bottom:28px;font-size:12px;line-height:1.5}
.ra-scale{margin:12px 0 0 36px}
.ra-scale svg{display:block}
.ra-scale__l{display:flex;justify-content:space-between;margin-top:4px;font-size:12px;line-height:1.3;color:var(--quiet)}

/* social: the small posts stacked at the left, the story tall at the right, the rules across the foot */
.ra-b--so{top:216px}
.ra-so+.ra-job{margin-top:16px}
.ra-so{display:flex;justify-content:space-between;align-items:flex-start}
.ra-so__l{display:flex;flex-direction:column;gap:24px;width:220px}
.ra-so figure{margin:0}
.ra-so figcaption{margin-top:8px}
.ra-post{position:relative;overflow:hidden;isolation:isolate}
.ra-post__t{line-height:1.08;letter-spacing:-0.005em;text-wrap:balance}
${ctx.edition === 'slot' ? '/* the dashed outline is drawn round the whole placeholder, not per line, so wrapped lines at display leading do not cross */\n.ra-post__t .ph-c{display:inline-block;max-width:100%;vertical-align:top;text-align:left}\n/* a logo slot on a small post keeps a frame tall enough for its label (the portrait\'s was 7 px) */\n.ra-post .logo-slot{min-height:24px}' : ''}
.ra-so__ru{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:28px;padding-top:16px;border-top:1px solid var(--hair)}
.ra-so__ru .r-tg__h{margin-bottom:4px}

/* signage: the wall large at the left, the spec at the right */
.ra-b--sg{display:grid;grid-template-columns:auto minmax(0,1fr);gap:32px;align-items:start;top:216px}
.ra-sg__f{margin:0}
.ra-sg__f figcaption{margin-top:12px}
.ra-wall{position:relative;overflow:hidden}
.ra-vy{position:absolute;outline:2px dashed var(--quiet);outline-offset:-2px}
.ra-vy__t{line-height:1.05;letter-spacing:-0.005em}
${ctx.edition === 'slot' ? '/* the sign line\'s placeholder is set at the sign\'s headline size, its outline round the whole placeholder */\n.ra-vy__t .ph-c,.ra-hero__h .ph-c,.ra-dl__h .ph-c{font-size:1em;display:inline-block;max-width:100%;vertical-align:top;text-align:left;white-space:normal!important}' : ''}
.ra-dim{position:absolute;display:block}
.ra-dim__l{position:absolute;margin:0;font-size:12px;line-height:1.3;text-align:center;color:var(--ink)}
.ra-dim__l--v{writing-mode:vertical-rl;display:flex;justify-content:center}
.ra-sg__c{display:flex;flex-direction:column;gap:20px;padding-top:4px}
.ra-sg__i .r-tg__h{margin-bottom:4px}

/* email signature: the proof at twice its size with the rules beside it; the email at full size with its job line */
.ra-b--em{top:160px}
.ra-pf{margin:0}
.ra-pf__sh{display:grid;grid-template-columns:auto minmax(0,1fr);gap:40px;padding:28px 32px 28px;--xi:6px}
.ra-pf__dim{width:300px;margin-bottom:8px}
.ra-pf__dim svg{display:block}
.ra-pf__dim p{margin-top:4px;font-size:12px;line-height:1.3;text-align:center;color:var(--ink)}
.ra-pf__x2{zoom:2}
.ra-pf__ru{display:flex;flex-direction:column;gap:16px;padding-top:28px}
.ra-pf__ru .r-tg__h{margin-bottom:4px}
.ra-pf figcaption{margin-top:8px}
.ra-sig{font-family:var(--body);color:var(--ink)}
.ra-sig__lg{line-height:0;margin-bottom:14px}
.ra-sig__n{font-weight:500;font-size:14px;line-height:1.4}
.ra-sig__r{font-size:13px;line-height:1.4;color:var(--quiet)}
.ra-sig__c{margin-top:8px;font-size:13px;line-height:1.5}
.ra-em{display:grid;grid-template-columns:448px minmax(0,1fr);gap:28px;align-items:start;margin-top:24px}
.ra-ml{padding:20px 28px 24px;background:var(--ground)}
.ra-ml__h{display:flex;flex-direction:column;gap:2px;padding-bottom:12px;border-bottom:1px solid var(--hair);font-family:var(--body);font-size:13px;line-height:1.5;color:var(--ink)}
.ra-ml__k{display:inline-block;width:56px;color:var(--quiet)}
.ra-ml__s{font-weight:600}
.ra-ml__b{display:flex;flex-direction:column;gap:8px;padding-top:12px;font-family:var(--body);font-size:14px;line-height:1.55;color:var(--ink)}
.ra-ml__b .ra-sig{margin-top:12px}
.ra-em__s .r-tg__h{margin-bottom:4px}
.ra-em figcaption{width:650px}

/* digital: the rules in a row under the title, then the screen across the measure */
.ra-dg__ru{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:20px}
.ra-dg__ru .r-tg__h{margin-bottom:4px}
.ra-b--dg{top:296px}
.ra-b--dg figure{margin:0}
.ra-dg__c{margin-top:12px}
.ra-scr{position:relative;overflow:hidden;background:var(--ground)}
.ra-scr__in{position:absolute;left:0;top:0;transform-origin:0 0}
.ra-scr__ui{width:100%;height:100%;display:flex;flex-direction:column;font-family:var(--body);background:var(--ground)}
.ra-scr__ui .ui-topbar{padding:0 40px;height:72px}
.ra-scr__logo{line-height:0}
.ra-scr__b{padding:48px 40px 40px;display:flex;flex-direction:column;gap:56px}
.ra-hero{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:48px;align-items:stretch}
.ra-hero__t{display:flex;flex-direction:column;gap:16px;align-items:flex-start;min-width:0}
.ra-hero__s{display:flex;gap:16px;align-items:center;font-size:14px;color:var(--quiet)}
.ra-hero__h{margin:0;font-size:96px;line-height:1}
.ra-hero__by{margin:0;font-size:22px;font-weight:500;line-height:1.3}
.ra-hero__p{margin:0;font-size:16px;line-height:1.6;max-width:440px}
.ra-hero__a{display:flex;gap:12px;margin-top:8px}
.ra-hero__f{margin:0;font-size:14px;color:var(--quiet)}
.ra-hero__i{min-height:440px}
.ra-hero__i>*{height:100%}
.ra-dl{display:flex;flex-direction:column;gap:12px}
.ra-dl__h{margin:0;font-size:22px;line-height:1.3;font-family:var(--display);font-weight:${cssNum(ctx.brand.fonts.display.weights[0])};font-style:normal}
/* one Vermilion fill on the screen (the button): statuses are plain Ink words with no fill, the one that needs attention at 500,
   and the current page is underlined in Ink */
.ra-scr .ui-chip{color:var(--ink);font-weight:400}
.ra-scr .ui-chip--warning,.ra-scr .ui-chip--danger{font-weight:500}
.ra-scr .ui-link[aria-current="page"]{box-shadow:inset 0 -3px 0 var(--ink)}

/* summary: the closing sheet with its colour bar; under it the faces and tones, and the three rules */
.ra-b--su{top:176px}
.ra-su__sh{padding:48px 48px 40px;--xi:8px}
.ra-su__top{display:grid;grid-template-columns:300px minmax(0,1fr);gap:40px;align-items:end}
.ra-su__lg{line-height:0}
.ra-su__l1{font-size:28px;line-height:1.2;color:var(--ink);text-wrap:pretty}
.ra-su__l2{margin-top:8px;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--ink)}
.ra-cb{display:grid;gap:12px;margin-top:40px;padding-top:16px;border-top:1px solid var(--hair)}
.ra-cb i{display:block;height:56px}
.ra-cb p{margin-top:6px;font-size:13px;line-height:1.3;color:var(--ink)}
.ra-cb p+p{margin-top:2px}
.ra-cb__k{color:var(--quiet)}
.ra-su__ft{display:grid;grid-template-columns:220px minmax(0,1fr);gap:40px;margin-top:32px}
.ra-fs{display:flex;align-items:center;gap:16px;font-family:var(--body);font-size:13px;line-height:1.4;color:var(--ink)}
.ra-fs+.ra-fs{margin-top:8px}
.ra-fs__a{flex:none;width:72px;font-size:48px;line-height:1.1;color:var(--ink)}
.ra-fs__a--b{font-family:var(--body);font-weight:500}
.ra-su__th{margin-top:24px}
.ra-su__tones{flex-direction:column;gap:8px}
.ra-su__ru ol{display:flex;flex-direction:column;gap:16px}
.ra-su__ru li{display:grid;grid-template-columns:32px minmax(0,1fr);gap:8px;align-items:baseline}
.ra-su__n{font-size:30px;line-height:1;color:var(--ink)}
.ra-su__rh{font-family:var(--body);font-weight:600;font-size:14px;line-height:1.4;margin-bottom:2px;color:var(--ink)}

/* contact and scope: the question set large, the run in three columns under a rule */
.ra-b--cs{top:216px;bottom:96px;display:flex;flex-direction:column;justify-content:space-between}
.ra-cs__q{max-width:13em;font-size:64px;line-height:1.05;letter-spacing:-0.01em;color:var(--ink);text-wrap:balance}
.ra-cs__m{margin-top:24px;font-family:var(--body);font-size:22px;line-height:1.3;color:var(--ink)}
/* the foot starts at about 55% of the page: the body ends at 1027, so 409 px tall starts it at 618 of 1123; colophon at its head, run at the foot */
.ra-cs__ft{display:flex;flex-direction:column;justify-content:space-between;gap:40px;min-height:409px}
.ra-co{padding-top:20px;border-top:1px solid var(--hair)}
.ra-co .r-tg__h{margin-bottom:12px}
.ra-co__p{max-width:40em;font-family:var(--body);font-size:18px;line-height:1.6;color:var(--ink);text-wrap:pretty}
.ra-co__p+.ra-co__p{margin-top:8px}
.ra-co__d{white-space:nowrap}
.ra-co__d i{display:inline-block;width:12px;height:12px;margin-right:8px;vertical-align:0}
.ra-co__d .r-mono{font-size:14px;color:var(--quiet)}
.ra-co .disp{font-size:20px}
.ra-cs__run{display:grid;grid-template-columns:140px minmax(0,1.3fr) minmax(0,1fr);gap:32px;padding-top:20px;border-top:1px solid var(--hair)}
.ra-cs__run .r-tg__h{margin-bottom:8px}
.ra-cs__vn{font-family:var(--chrome);font-weight:700;font-size:40px;line-height:1;color:var(--ink);margin-bottom:8px}
.ra-cs__in{font-family:var(--body);font-size:13px;line-height:1.5;color:var(--ink)}
.ra-cs__in li{display:grid;grid-template-columns:24px minmax(0,1fr);padding:2px 0}
.ra-cs__n{color:var(--quiet)}
.ra-cs__not{display:flex;flex-direction:column;gap:8px}
`;
