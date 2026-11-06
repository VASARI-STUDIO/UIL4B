// Styles for u-found.js: UI kit cover, contents, colour-light, colour-dark, type-scale, spacing, radii-borders, elevation, states.
// Classes start tu1-. The pages stand on the gate's page (.pg.tk) and use its serials (.tk-sn), fields (.tk-ff), heads and leads as they
// are. .tu1-night swaps the page's own colour variables to the dark roles (the queue at night). No hex is written here.
// meta is read at call time (index.js calls this after it has loaded), for the condensed face's pinned width.
import { meta } from './index.js';

export const cssUFound = (ctx) => {
  const D = ctx.roles.dark, B = ctx.brand, st = meta.chrome.stretch, rc = B.ui.radius.card;
  return `
.pg.tk.tu1-night{--ground:${D.surface};--ink:${D.text};--soft:${D.textSoft};--quiet:${D.quiet};--hair:${D.divider};--edge:${D.border}}
.tu1 .tu1-m{font-family:'${B.fonts.mono.family}',monospace;font-size:max(12px,0.9em);font-weight:400;letter-spacing:0;font-stretch:100%}
.tu1-perf{color:var(--ink)}.tu1-edge{box-shadow:inset 0 0 0 1px var(--hair)}
/* small labels in the condensed stub face */
.tu1-roll__k,.tu1-no,.tu1-co__p,.tu1-ts__px,.tu1-sp__n,.tu1-rt__r,.tu1-st__n,.tu1-st__name{font-family:var(--cond);font-weight:700;font-stretch:${st}%;letter-spacing:0.02em}
.tu1-h{font-size:48px;line-height:0.95;letter-spacing:-0.02em}
.tu1-h--s{font-size:30px;line-height:1}
.tu1-ff--stack{flex-direction:column;gap:12px}
.tu1-na{font-size:13px;line-height:18px;color:var(--quiet)}
/* a value that outruns its field ends in an ellipsis, never mid-word */
.tu1 .ui-input{text-overflow:ellipsis}
.tu1-cap{font-size:13px;line-height:18px;color:var(--quiet)}
.tu1 .tu1-ui{background:transparent}

/* cover: one Door red roll from edge to edge, the logo versions as a run of serials under it */
.pg.tu1--cover{justify-content:space-between}
.tu1-cv__roll{display:flex;height:300px;margin:0 calc(-1 * var(--m))}
.tu1-cv__face{flex:0 0 700px;display:flex;flex-direction:column;justify-content:space-between;padding:26px 44px 28px var(--m)}
.tu1-cv__top{display:flex;justify-content:space-between}
.tu1-cv__kit{position:relative;flex:0 0 450px;display:flex;flex-direction:column;padding:26px 32px 28px 36px}
.tu1-cv__name{font-size:64px;margin-top:auto;white-space:nowrap}
.tu1-cv__line{font-size:17px;line-height:22px;font-weight:600;margin-top:12px}
.tu1-ff--kept{margin-top:20px}
.tu1-cv__tail{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;padding:26px 20px 28px 36px}
.tu1-ff--tail{margin-top:auto}
.tu1-vstrip{position:relative;padding-top:20px}
.tu1-vss{display:flex;height:168px}
.tu1-vs{position:relative;min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:8px;padding:14px 16px 14px 18px}
.tu1-vs:first-child{padding-left:0}
.tu1-vs--g:first-child{padding-left:18px}
.tu1-vs__l{flex:1;min-height:0;display:flex;align-items:center}
.tu1-vs__n{font-size:14px;line-height:18px;font-weight:600}

/* contents: the sections as rows torn from each other, the first page on each row's stub */
.tu1-co__line{font-size:56px;line-height:0.95;letter-spacing:-0.02em;text-wrap:balance}
.tu1-co{flex:1;min-height:0;display:flex;flex-direction:column}
.tu1-co__r{position:relative;flex:1;min-height:0;display:grid;grid-template-columns:420px minmax(0,1fr) 180px;align-items:start;padding-top:14px}
.tu1-co__t{display:flex;flex-direction:column;gap:6px}
.tu1-co__t h2{font-size:34px;line-height:1;letter-spacing:-0.015em}
.tu1-co__set{columns:3;column-gap:28px;padding-top:4px}
.tu1-co__set li{display:grid;grid-template-columns:30px minmax(0,1fr);align-items:baseline;break-inside:avoid;font-size:14px;line-height:20px;padding-bottom:4px}
.tu1-no{font-size:17px;line-height:20px}
.tu1-co__stub{position:relative;align-self:stretch;display:flex;flex-direction:column;align-items:flex-end;margin-top:-14px;padding:14px 0 0 24px}
.tu1-co__k{font-size:13px;line-height:16px;font-weight:500}
.tu1-co__p{font-size:84px;line-height:0.9}

/* colour roles: Surface as a hard ticket, the rest as tickets on rolls */
.tu1-sf{position:relative;flex:none;display:flex;border-radius:${rc}px}
.tu1-sf__body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:16px 20px 18px 22px}
.tu1-sf__aa{font-size:112px;line-height:0.8}
.tu1-sf__n{font-size:30px}
.tu1-sf__stub{position:relative;flex:0 0 164px;display:flex;flex-direction:column;justify-content:flex-end;padding:16px 16px 18px 20px}
.tu1-sf--big{width:600px;height:218px}
.tu1-sf--tall{width:340px;height:258px}
.tu1-sf--tall .tu1-sf__aa{font-size:84px}
.tu1-sf--tall .tu1-sf__n{font-size:26px}
.tu1-sf--tall .tu1-sf__stub{flex-basis:132px;padding:16px 12px 18px 16px}
.tu1-rt{position:relative;flex:1 1 0;min-width:0;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding:9px 12px 9px 14px}
.tu1-rt__n{font-size:14px;line-height:18px;font-weight:600;white-space:nowrap}
.tu1-rt__b{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.tu1-rt .tu1-m{font-size:12px;line-height:16px;white-space:nowrap}
.tu1-rt__r{font-size:20px;line-height:20px;white-space:nowrap}
.tu1-rt__u{font-size:12px;line-height:16px;text-align:right;white-space:nowrap}
.tu1-rt__sc{position:absolute;right:12px;top:10px;width:20px;height:20px;border-radius:${B.ui.radius.control}px}
.tu1-roll__k{font-size:20px;line-height:22px}

/* light: the rolls unwind across the page */
.tu1-cl__top{display:flex;gap:40px}
.tu1-cl__say{min-width:0;display:flex;flex-direction:column;gap:12px}
.tu1-cl__say .tu1-h{font-size:34px;margin-bottom:4px}
.tu1-cl__say .tk-lead{font-size:14px}
.tu1-cl__low{flex:1;min-height:0;display:flex;flex-direction:column;gap:10px}
.tu1-cl__low > .tu1-roll{flex:0.8 1 0}
.tu1-cl__split{flex:3.2 1 0;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 268px}
.tu1-rolls{min-height:0;display:flex;flex-direction:column;gap:10px;padding-right:28px}
.tu1-roll--lit{flex-grow:2}
/* the lit roll's tickets are tall: name, token, ratio, value and note each take a line */
.tu1-roll--lit .tu1-rt{display:grid;grid-template-columns:minmax(0,1fr);align-content:space-between}
.tu1-roll--lit .tu1-rt__b{display:contents}
.tu1-roll--lit .tu1-rt__r{font-size:28px;line-height:28px}
.tu1-roll--lit .tu1-rt__u{text-align:left}
.tu1-cl__stub{position:relative;min-height:0;display:flex;flex-direction:column;gap:4px;padding-left:28px}
.tu1-cl__stub .tu1-hang__t{flex:1}
.tu1-cl__stub .tu1-rt{padding:5px 10px 5px 14px}
.tu1-cl__stub .tu1-rt__r{font-size:17px;line-height:17px}
.tu1-roll{flex:1 1 0;min-height:0;display:grid;grid-template-columns:110px minmax(0,1fr);gap:16px;align-items:stretch}
.tu1-roll .tu1-roll__k{align-self:center}
.tu1-roll__t{display:flex;min-width:0}

/* dark: the rolls hang from the head of the page */
.tu1-cd{flex:1;min-height:0;display:grid;grid-template-columns:340px minmax(0,1fr);gap:40px}
.tu1-cd__l{min-height:0;display:flex;flex-direction:column;gap:22px}
.tu1-cd__w{margin-top:auto;display:flex;flex-direction:column;gap:10px}
.tu1-cd__w .tk-lead{font-size:14px}
.tu1-hangs{min-height:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:stretch}
.tu1-hang{min-width:0;min-height:0;display:flex;flex-direction:column;gap:8px}
.tu1-hang__t{flex:1;min-height:0;display:flex;flex-direction:column}
.tu1-hang__t .tu1-hole{left:0}

/* type scale: the print hierarchy on the body, the faces on the stub */
.tu1-ts{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 380px}
.tu1-ts__rs{display:flex;flex-direction:column;justify-content:space-between;padding-right:40px;min-width:0}
.tu1-ts__r{display:grid;grid-template-columns:64px minmax(0,1fr);align-items:baseline}
.tu1-ts__px{font-size:22px;line-height:24px}
.tu1-ts__b{min-width:0}
.tu1-ts__f{display:flex;gap:16px;align-items:baseline;font-size:13px;line-height:18px;color:var(--soft);margin-top:4px}
.tu1-ts__f b{font-weight:600;color:var(--ink)}
.tu1-ts__stub{position:relative;display:flex;flex-direction:column;gap:18px;padding-left:40px}
.tu1-ff--faces{margin-top:8px;gap:18px}
.tu1-ts__face{display:block;font-size:38px;line-height:42px;overflow-wrap:anywhere}

/* spacing: each step a ticket torn apart by the step, stacked smallest first so the stubs walk out to the right */
.tu1-sp__top{display:grid;grid-template-columns:minmax(0,1fr) 460px;gap:48px;align-items:end}
.tu1-sp{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-end}
.tu1-sp__rs{display:flex;flex-direction:column;gap:6px}
.tu1-sp__r{display:flex;align-items:stretch;height:38px}
.tu1-sp__body{position:relative;flex:0 0 600px;display:grid;grid-template-columns:96px 112px minmax(0,1fr);align-items:center;gap:16px;padding:0 28px 0 20px;background:var(--ink);color:var(--ground)}
.tu1-sp__body .tu1-m{color:var(--ground)}
.tu1-sp__u{font-size:14px;line-height:18px}
.tu1-sp__gap{position:relative;flex:none}
.tu1-sp__gap::before{content:'';position:absolute;left:4px;right:4px;top:50%;border-top:1px solid var(--ink)}
.tu1-sp__stub{position:relative;flex:0 0 132px;display:flex;align-items:baseline;justify-content:flex-end;gap:4px;padding:6px 16px 0 22px;background:var(--ink);color:var(--ground)}
.tu1-sp__n{font-size:28px;line-height:28px}
.tu1-sp__px{font-size:13px;line-height:16px;font-weight:600}
.tu1-sp .tu1-cap{margin-top:14px}

/* radii and borders: corners drawn large on the body, border weights on the stub */
.tu1-rb{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 400px}
.tu1-rb__body{min-width:0;display:flex;flex-direction:column;gap:14px;padding-right:40px}
/* the page's line at the head of the stub, at lead size (the kit-wide stub headline) */
.pg.tk .tu1-lh{margin:0;font-family:var(--body);font-stretch:100%;font-size:15px;line-height:1.5;font-weight:600;letter-spacing:0;color:var(--ink);text-wrap:balance}
.tu1-rb__t{display:flex;flex-direction:column;gap:8px}
.tu1-rb__t .tk-lead{font-size:14px}
.tu1-rb .tk-h3{margin-bottom:0}
.tu1-rb__x{font-family:var(--body);font-stretch:100%;font-size:13px;line-height:16px;font-weight:400;letter-spacing:0;color:var(--quiet);margin-left:8px}
.tu1-rb__rs{flex:1;min-height:0;display:grid;grid-template-columns:220px 290px minmax(0,1fr)}
.tu1-rb__r{position:relative;min-width:0;display:flex;flex-direction:column;gap:10px;padding:0 20px 0 22px}
.tu1-rb__r:first-child{padding-left:0}
.tu1-rb__fig{display:block;color:var(--ink);overflow:visible}
.tu1-rb__k{display:flex;flex-direction:column;font-size:13px;line-height:18px;color:var(--soft)}
.tu1-rb__k b{font-size:14px;font-weight:600;color:var(--ink)}
.tu1-rb__row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.tu1-rb__card{width:100%;max-width:240px;min-width:0}
.tu1-rb__card .ui-card,.tu1-rb__card .ui-card *{min-width:0;overflow-wrap:anywhere}
.tu1-rb__card .ui-card__title,.pg .tu1-rb__card .ui-card__title .ph-n{white-space:normal!important}
.tu1-rb__stub{position:relative;min-width:0;display:flex;flex-direction:column;gap:14px;padding-left:32px}
.tu1-rb__bs .ui-field{width:100%}
.tu1-rb__bs{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between}
.tu1-rb__b{position:relative;display:flex;flex-direction:column;gap:8px;padding-top:14px}
.tu1-rb__b:first-child{padding-top:0}
.tu1-rb__w{display:block;width:100%;background:var(--ink)}
.tu1-rb__list{border-top:0}
.tu1-rb__bs .ui-field input{text-overflow:ellipsis}

/* elevation: four grounds rising like stairs from the foot of the page, each with the component that stands on it */
.pg.tu1--el{position:relative}
.tu1-el__top{display:flex;flex-direction:column;gap:16px;max-width:760px}
.tu1-el__top .tk-lead{max-width:520px}
.tu1-el{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:flex-end;margin:0;padding:0;background:transparent}
.tu1-el__s{position:relative;display:flex;flex-direction:column;gap:16px;padding:16px 20px 58px;box-shadow:inset 0 1px 0 var(--divider),inset 1px 0 0 var(--divider)}
.tu1-el__s:first-child{padding-left:var(--m);box-shadow:inset 0 1px 0 var(--divider)}
.tu1-el__s--0{flex:0 0 280px;height:234px}
.tu1-el__s--1{flex:0 0 290px;height:416px}
.tu1-el__s--2{flex:0 0 290px;height:454px}
.tu1-el__s--3{flex:1 1 0;height:524px;padding-right:var(--m)}
.tu1-el__k{display:flex;flex-direction:column;gap:2px;font-size:14px;line-height:20px}
.tu1-el__k b{font-weight:600}
.tu1-el__u{color:var(--quiet);font-size:13px;line-height:18px}
.tu1-el__s--0 .tu1-el__u{color:var(--quiet-sunken)}
.tu1-el__row{display:flex;gap:12px;align-items:center}
.tu1-el__cap{font-size:13px;line-height:18px;color:var(--text-soft);margin-top:auto}
/* the Floating footnote sits right under the toast, not at the foot of a tall empty step */
.tu1-el__s--3 .tu1-el__cap{margin-top:0}
.tu1-el__cap b{color:var(--text);font-weight:600}
.tu1-el__fl{display:flex}

/* states: one roll of serials across the head of the matrix, the controls on Stock under their state */
.pg.tu1--st{gap:16px}
.tu1-st__h{font-size:44px;line-height:1;white-space:nowrap}
.tu1-st{display:grid;grid-template-columns:176px repeat(6,minmax(0,1fr))}
.tu1-st__corner{display:flex;align-items:flex-end;padding:0 18px 10px 0}
.tu1-st__lead{font-family:var(--chrome);font-stretch:100%;font-size:13px;line-height:17px;color:var(--soft)}
.tu1-st__roll{grid-column:2 / -1;position:relative;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));margin-right:calc(-1 * var(--m));padding-right:var(--m);margin-bottom:6px}
.tu1-st__t{position:relative;min-width:0;display:flex;flex-direction:column}
.tu1-st__body{height:58px;display:flex;flex-direction:column;justify-content:space-between;padding:8px 12px 6px 14px}
.tu1-st__n{font-size:24px;line-height:24px}
.tu1-st__spec{font-family:var(--chrome);font-stretch:100%;font-size:13px;line-height:17px;padding:10px 12px 12px 14px}
.tu1-st__spec .tu1-m{font-size:12px;white-space:nowrap}
.tu1-st__tear{position:absolute;left:0;right:0;top:58px;height:0}
.tu1-st__name{position:relative;padding:9px 12px 6px 0;font-size:18px;line-height:20px}
.tu1-st__c{position:relative;min-width:0;padding:7px 10px 6px 0;display:flex;align-items:flex-start}
.tu1-st__c .ui-field,.tu1-st__c .ui-choice{width:100%}
.tu1-st__c > .tu1-na{padding-top:2px}
`;
};
