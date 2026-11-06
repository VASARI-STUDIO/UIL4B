// Styles for p-apps.js: business-card, social, signage, email-signature, digital, summary, contact-scope. Classes start ta-.
// Reads the .pg.tk custom properties set in css-gate.js; the gate's classes are used, never restyled. No hex is written here.
import { colourMap, tokenGroups } from '../../engine/tokens.js';

export const cssPApps = (ctx) => {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, mono = B.fonts.mono;
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  // the product screen on the digital page is the UI kit's own components, in the dark mode Encore ships first
  const uiScope = `.pg .ui.ta-win{${decl(colourMap(ctx, 'dark'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}`;
  return `
/* the page foot: the last line sits 56 px above the page's bottom edge, so it clears the trim (foot check 54 px) */
/* the one page after dark: Night ground, Stock ink */
.pg.tk.ta--night{--ground:${D.surface};--ink:${D.text};--soft:${D.textSoft};--quiet:${D.quiet};--hair:${D.divider};--edge:${D.border}}
/* the perforation as a rule: a box the height of its holes, the holes drawn across its top */
.ta-hr{position:relative;flex:none;height:3px;margin-top:2px}
.ta-ab{position:absolute}
.ta-ff{gap:0 32px}
.ta-ff dd{font-size:17px;line-height:24px;font-weight:500}
.ta-ff dt{color:var(--quiet)}
/* the page lead sits where the gate's palette page puts it: under the title, 15 px muted, 46ch */
.pg.tk .ta-lead{max-width:46ch}

/* business card: the lead and the size field under the title; front and back at 6 px to the millimetre, the large thing */
.ta-bc{flex:1;min-height:0;display:flex;flex-direction:column;gap:24px}
.ta-bc__top{display:flex;align-items:flex-start;justify-content:space-between;gap:48px}
.ta-bc__cards{display:flex;gap:32px;align-items:flex-start;margin-block:auto}
.ta-bc__fig{display:flex;flex-direction:column;gap:12px}
.ta-card{position:relative;flex:none;display:flex;flex-direction:column;justify-content:space-between;padding:36px 40px;border-radius:${B.ui.radius.card}px;overflow:hidden}
.ta-card__line{font-size:20px;line-height:26px;font-weight:600}
.ta-card--back{flex-direction:row;align-items:flex-start;gap:28px;color:var(--ink)}
.ta-card__mark{flex:none}
.ta-card__who{display:flex;flex-direction:column;gap:2px;padding-top:4px}
.ta-card__nm{font-size:20px;line-height:26px;font-weight:600}
.ta-card__rl{font-size:15px;line-height:22px;color:var(--soft)}
.ta-card__ct{font-size:15px;line-height:22px;margin-top:12px}
.ta-card__site{position:absolute;left:40px;bottom:32px;font-size:15px;line-height:22px;font-weight:600}

/* social: three posts at one scale on a perforated baseline, the bill beyond a vertical perforation */
.ta-so{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 284px;gap:0 32px}
.ta-so__run{position:relative;display:flex;flex-direction:column;justify-content:flex-end;min-width:0}
.ta-so__posts{display:flex;align-items:flex-end;gap:24px}
.ta-so__post{display:flex;flex-direction:column;gap:20px}
/* the baseline: one perforation under all three posts, between them and their serials */
.ta-so__base{position:absolute;left:0;right:0;bottom:31px;margin:0}
.ta-post{position:relative;flex:none;overflow:hidden;border-radius:${B.ui.radius.control}px}
.ta-post .photo-slot{background:${L.sunken};border-radius:0;display:flex;align-items:flex-end;padding:12px 14px;font-size:12px;line-height:1.35;color:${L.textSoft}}
.ta-post__l{line-height:0.95}
.ta-so__stub{position:relative;display:flex;flex-direction:column;justify-content:flex-end;padding-left:36px}
.ta-bills{display:flex;flex-direction:column;gap:28px}
.ta-bill{display:flex;flex-direction:column;gap:4px}
.ta-bill__n{font-family:var(--cond);font-stretch:50%;font-weight:700;line-height:0.95;letter-spacing:0.02em}
.ta-bill--1 .ta-bill__n{font-size:64px}
.ta-bill--2 .ta-bill__n{font-size:48px}
.ta-bill--3 .ta-bill__n{font-size:38px}
.ta-bill__s{font-size:17px;line-height:24px;font-weight:600}
.ta-bill__t{font-size:15px;line-height:1.45;color:var(--soft);max-width:34ch}

/* signage: the facts left, the poster at scale right with its dimension lines */
.ta-sg{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:56px;align-items:start}
.ta-sg__l{display:flex;flex-direction:column;gap:24px;min-width:0}
.ta-sg__l .ta-hr{margin-top:24px}
.ta-sg__spec{font-size:30px;line-height:1.2;font-weight:600;max-width:27ch}
.ta-ff--sg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 40px;margin-top:4px}
.ta-ff--sg dd{font-size:16px;line-height:23px;font-weight:400}
.ta-ff--sg dt{font-family:var(--cond);font-stretch:50%;font-weight:700;font-size:20px;line-height:22px;letter-spacing:0.02em;color:var(--ink)}
.ta-sgw{display:grid;column-gap:12px;row-gap:12px}
.ta-poster{display:flex;flex-direction:column;justify-content:space-between;padding:30px 30px 28px;overflow:hidden}
.ta-poster__top{display:flex;flex-direction:column;gap:6px}
.ta-poster__act{font-size:40px;line-height:0.95}
.ta-poster__when{font-size:15px;line-height:20px;font-weight:500}
.ta-poster__h{font-size:46px;line-height:0.95}
.ta-dim{display:flex;align-items:center;gap:8px;color:var(--quiet);font-size:13px;line-height:1}
.ta-dim i{flex:1;background:var(--quiet)}
.ta-dim b{font-weight:500;white-space:nowrap}
.ta-dim--h{height:12px;border-left:1px solid var(--quiet);border-right:1px solid var(--quiet)}
.ta-dim--h i{height:1px}
.ta-dim--v{flex-direction:column;justify-self:start;width:56px;border-top:1px solid var(--quiet);border-bottom:1px solid var(--quiet);align-items:flex-start}
.ta-dim--v i{width:1px;margin-left:6px}
.ta-dim--v b{padding:4px 0}

/* email signature: the lead under the title, the mail as it arrives (as tall as its content), the specs along the foot */
.ta-mail{flex:none;display:flex;flex-direction:column;gap:16px;margin-bottom:28px;padding:20px 36px 20px;background:${L.raised};box-shadow:inset 0 0 0 1px var(--hair);border-radius:${B.ui.radius.card}px}
.ta-ff--mail{gap:0 40px}
.ta-ff--mail dd{font-size:17px;line-height:24px}
.ta-ff--mail div:nth-child(3){flex:1}
/* a mail client has no tear line: its own 1 px hairline under the header */
.ta-mail__hr{flex:none;height:1px;background:var(--hair)}
/* the signature follows the body, left-aligned, 24 px under the last line: where a mail client sets it */
.ta-mail__b{display:flex;flex-direction:column;gap:24px;padding-top:8px;font-size:17px;line-height:1.55}
.ta-mail__t p+p{margin-top:10px}
.ta-mail__t{max-width:58ch}
.ta-sig{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.ta-sig__n{font-weight:600;line-height:1.3}
.ta-sig__r,.ta-sig__c{line-height:1.5;color:var(--soft)}
.ta-sig__c{margin-top:2px}
.ta-sig__l{margin-top:6px;font-size:13px;line-height:1.4;color:var(--quiet)}
.ta-es__specs{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1.35fr);gap:40px}
.pg.tk .ta-es__specs{margin-top:auto}
.ta-es__specs li{display:flex;flex-direction:column;gap:4px;font-size:15px;line-height:1.45;color:var(--soft)}
/* slot edition: the mail takes its earlier, tighter sizes and the rules drop their length lines, so both pages keep the foot clear */
.ta--slot .ta-mail{gap:10px;padding:16px 28px 16px}
.ta--slot .ta-ff--mail dd{font-size:15px;line-height:22px}
.ta--slot .ta-mail__b{font-size:15px;padding-top:0;gap:16px}
/* slot: the body blocks and the signature line drop their length line, and the line is one chip, so the card stays clear of the foot */
.ta--slot .ta-mail__t .ph-m{display:none}
.ta--slot .ta-sig-tag .ph-m{display:none}
.ta--slot .ta-sum__rules .ph-m,.ta--slot .ta-es__specs .ph-m{display:none}
.ta-es__sh{font-size:17px;line-height:24px;font-weight:600;color:var(--ink)}

/* digital: the tickets screen after dark, the whole page */
${uiScope}
.ta-win{flex:1;min-height:0;display:flex;flex-direction:column;border-radius:${B.ui.radius.card}px;overflow:hidden;background:${D.surface};box-shadow:inset 0 0 0 1px ${D.divider}}
.ta-win__url{height:36px;flex:none;display:flex;align-items:center;padding:0 16px;background:${D.raised};font-size:12px;color:${D.quiet}}
.ta-win__url span{background:${D.surface};padding:4px 16px;border-radius:${B.ui.radius.control}px}
.ta-bar__logo{display:flex;align-items:center}
.ta-win__body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:56px;padding:24px 32px;font-family:var(--body)}
/* the window runs to the page's foot: the track spreads down it and the list's rows share the height, so no band is left empty under it */
.ta-trk{display:flex;flex-direction:column;justify-content:space-between;gap:12px;min-width:0}
.ta-dl .ui-list{flex:1;display:flex;flex-direction:column}
.ta-dl .ui-list>li{flex:1;display:flex}
.ta-dl .ui-list>li>.ui-row{flex:1}
.ta-trk__top{display:flex;gap:12px;align-items:center}
.ta-trk__t{font-size:13px;color:${D.quiet}}
.ta-trk__eta{margin:0;font-size:60px;line-height:0.95;font-weight:${B.fonts.display.weights[0]};font-stretch:${B.fonts.display.stretch || 100}%;white-space:nowrap;margin-top:8px}
/* slot edition: the time promise stays at the display size (60 px is wider than the track in the slot face, so 52 px), on one line; the chip is capped at 20 px by default */
.ta-trk__eta .ph-c{font-size:52px}
.ta-trk__ft{display:flex;justify-content:space-between;font-size:12px;color:${D.quiet}}
.ta-trk__p{font-size:13px;color:${D.textSoft}}
.ta-trk__act{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid ${D.divider};border-bottom:1px solid ${D.divider}}
.ta-trk__act .ui-btn{margin-left:auto}
.ta-trk__rn{font-size:15px;font-weight:600;line-height:1.3}
.ta-trk__rs{font-size:13px;color:${D.quiet}}
.ta-trk__facts{display:flex;align-items:center;gap:40px}
.ta-trk__fl{font-size:12px;color:${D.quiet}}
.ta-trk__fv{font-size:15px;font-weight:500}
.ta-trk__facts .ui-btn{margin-left:auto}
.ta-dl{display:flex;flex-direction:column;gap:8px;min-width:0}
.ta-dl__h{font-size:13px;font-weight:600}
/* each gig row leads with its date: month in the label face over the day at the body step, on Stage */
.ta-dl .ui-row__lead{border-radius:${B.ui.radius.control}px;overflow:hidden;background:none}
.ta-date{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
.ta-date__m{font-family:var(--body);font-weight:500;font-size:12px;line-height:12px}
.ta-date__d{font-family:var(--body);font-weight:600;font-size:17px;line-height:18px}

/* summary: three tickets off one roll, the colours by share, the rules in a run of serials */
.ta-sum__tks{display:flex;gap:24px;align-items:stretch}
.ta-tk{display:flex;flex:none;border-radius:${B.ui.radius.card}px;overflow:hidden}
.ta-tk__body{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:16px;padding:24px 32px 24px 32px}
.ta-tk__stub{position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:24px 24px 24px 28px}
.ta-tk__line{font-size:42px;line-height:0.95}
.ta-tk__stubname{font-family:var(--cond);font-stretch:50%;font-weight:700;font-size:48px;line-height:0.95}
.ta-ff--faces dd{font-size:15px;line-height:20px;font-weight:600}
.ta-ff--faces dt{color:inherit}
.ta-sum__sm{flex:1;min-width:0;display:flex;flex-direction:column;gap:16px}
.ta-tk--sm{flex:1}
.ta-tk--sm .ta-tk__body{flex:1;min-width:0;justify-content:center;padding:18px 24px}
.ta-tk--sm .ta-tk__stub{flex:0 0 96px;padding:16px 16px 14px 20px}
.ta-tk__line2{font-size:26px;line-height:1}
.ta-strip{display:flex;gap:0;margin-top:4px}
.ta-strip li{min-width:0;display:flex;flex-direction:column;gap:2px;padding:10px 14px;font-size:14px;line-height:18px}
.ta-strip b{font-weight:600}
.ta-strip .tk-mono{font-size:12px;line-height:16px}
.ta-sum__rules{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:40px;width:100%}
.ta-sum__rules li{display:flex;flex-direction:column;gap:4px;font-size:15px;line-height:1.45;color:var(--soft)}
.ta-sum__rh{font-size:20px;line-height:26px;font-weight:600;color:var(--ink);text-wrap:balance}

/* contact and scope: who to ask is the body, the running order and the exclusions are the stub */
.ta-cs{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:0 48px}
.ta-cs__a{display:flex;flex-direction:column;gap:28px;justify-content:flex-start;padding-top:12px}
.ta-cs__h{font-size:76px;white-space:nowrap;margin-left:-4px}
.ta-cs__p{font-size:24px;line-height:1.4;max-width:34ch}
.ta-cs__mail{font-size:20px;line-height:1.4;white-space:nowrap}
.ta-cs__v{margin-top:20px}
.ta-cs__stub{position:relative;display:flex;flex-direction:column;gap:24px;padding-left:36px;padding-top:12px}
.ta-cs__in{display:flex;flex-direction:column;gap:6px}
.ta-cs__in li{display:flex;gap:16px;align-items:baseline}
.ta-cs__in .tk-sn{flex:none;width:72px;color:var(--quiet)}
.ta-cs__st{font-size:17px;line-height:24px;font-weight:500}
.ta-cs__not{display:flex;flex-direction:column;gap:10px;font-size:15px;line-height:1.45;color:var(--soft)}
.ta-cs__not b{font-weight:600;color:var(--ink)}
.pg.tk :where(.ta-cs__in,.ta-cs__not,.ta-es__specs,.ta-sum__rules,.ta-strip,.ta-bills,.ta-so__posts){list-style:none;margin:0;padding:0}
`;
};
