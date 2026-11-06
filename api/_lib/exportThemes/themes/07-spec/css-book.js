// Styles for theme 07's brand book site (bookCss, scoped under .bk and the root custom properties) and for the
// brand kit pages: read-me, palette sheet, specimen, photography and the pack boards (cssBook, scoped under .pg).
// A standards document on the web: a contents column, each section a ruled sheet with a running head, numbered clauses hung in a
// left margin column, ledger tables (a full rule under the header, hairlines between rows), numbered figures, a contrast matrix.
// Mono only on literal values. Everything reads colours from the brand's roles; no hex is written here.
import { cssBookKit } from './css-bookkit.js';

const vars = (r) => `--bk-ground:${r.surface};--bk-raised:${r.raised};--bk-panel:${r.sunken};--bk-ink:${r.text};--bk-soft:${r.textSoft};--bk-quiet:${r.quiet};--bk-quiet-panel:${r.quietOnSunken};--bk-hair:${r.divider};--bk-edge:${r.border};--bk-action:${r.action};--bk-action-hover:${r.actionHover};--bk-action-ink:${r.actionLabel};--bk-focus:${r.focus};--bk-mark:${r.danger.fg};`;

export function bookCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const rc = B.ui.radius.control, rd = B.ui.radius.card, bw = B.ui.border;
  const top = d.weights[0], sub = d.weights[d.weights.length - 1];
  const sb = B.logo.colourways['on-sunbelt'];
  return `:root,.bk--board{${vars(L)}--bk-rule:color-mix(in srgb,var(--bk-ink) 24%,var(--bk-ground));--fix-ground:${L.surface};--fix-ink:${L.text};--fix-soft:${L.textSoft};--fix-quiet:${L.quiet};--fix-hair:${L.divider};--fix-mark:${L.danger.fg};--hang:140px;--gap:32px;
--chrome:'Hanken Grotesk',sans-serif;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--mono:'${m.family}',monospace}
[data-theme="dark"]{${vars(D)}}
body{background:var(--bk-ground);color:var(--bk-ink)}
.bk{font-family:var(--chrome);font-size:14px;line-height:1.5;color:var(--bk-ink);background:var(--bk-panel);-webkit-font-smoothing:antialiased;display:grid;grid-template-columns:264px minmax(0,1fr);min-height:100vh;position:relative}
.bk :where(h1,h2,h3,p,ul,ol,dl,dd,figure,table){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(th){font-weight:500;text-align:left}
.bk :where(a){color:inherit}
.bk .disp{font-family:var(--display);font-weight:${top};letter-spacing:-0.015em}
.bk .disp--sub{font-weight:${sub};letter-spacing:-0.01em}
.bk .num{font-variant-numeric:tabular-nums}
.bk .m{font-family:var(--mono);font-size:12px;letter-spacing:-0.02em;white-space:nowrap}
.bk :focus-visible{outline:2px solid var(--bk-focus);outline-offset:2px}
.bk-vh{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--bk-ink);color:var(--bk-ground);padding:12px 16px;border-radius:${rc}px;font-weight:600;text-decoration:none}
.bk-skip:focus{top:16px}

/* the contents column at desktop: the brand, then the sections as a table of contents with their § numbers */
.bk-top{position:sticky;top:0;align-self:start;height:100vh;display:flex;flex-direction:column;gap:28px;padding:28px 24px 24px;background:var(--bk-ground);border-right:1px solid var(--bk-rule)}
.bk-brand{display:block;text-decoration:none;width:132px}
.bk-brand svg{display:block;width:132px;height:auto}
.bk-name{font-family:var(--chrome);font-weight:600;font-size:15px;line-height:1.2}
.bk-for-dark{display:none}
[data-theme="dark"] .bk-for-dark{display:block}[data-theme="dark"] .bk-for-light{display:none}
.bk-menu{display:none}
.bk-nav{flex:1;min-height:0;overflow:auto}
.bk-nav::before{content:'Contents';display:block;padding-bottom:8px;border-bottom:1px solid var(--bk-ink);font-size:12px;color:var(--bk-quiet)}
.bk-nav a{display:grid;grid-template-columns:36px minmax(0,1fr);align-items:baseline;padding:9px 0 9px 8px;border-bottom:1px solid var(--bk-hair);font-size:14px;font-weight:400;color:var(--bk-soft);text-decoration:none;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-nav .bk-n{color:var(--bk-quiet);font-variant-numeric:tabular-nums}
.bk-nav .bk-n::before{content:'§'}
.bk-nav a[aria-current]{box-shadow:inset 3px 0 0 var(--bk-ink);color:var(--bk-ink);font-weight:600}
@media (hover:hover){.bk-nav a:hover{background:var(--bk-panel);color:var(--bk-ink)}}
.bk-mode{display:inline-flex;align-self:flex-start;border:${bw}px solid var(--bk-ink);border-radius:0;overflow:hidden}
.bk-mode button{appearance:none;border:0;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);height:36px;padding:0 16px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-mode button+button{border-left:${bw}px solid var(--bk-ink)}
.bk-mode button[aria-pressed="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button:focus-visible{outline-offset:-4px}
@media (hover:hover){.bk-mode button[aria-pressed="false"]:hover{background:var(--bk-panel)}}

/* main: the document's desk. Each section is a sheet: a running head, the section number, then numbered clauses */
.bk main{min-width:0;padding:40px 40px 0;background:var(--bk-panel)}
.bk main:focus{outline:none}
.bk-sec{max-width:1040px;margin:0 auto 40px;padding:28px 56px 72px;background:var(--bk-ground);border:1px solid var(--bk-rule);scroll-margin-top:24px}
.bk-sec>*{max-width:none}
.bk-rh{display:flex;justify-content:space-between;gap:16px;padding-bottom:10px;border-bottom:1px solid var(--bk-ink);margin-bottom:64px;font-size:12px;color:var(--bk-quiet)}
.bk-head{margin-bottom:56px}
.bk-h2{display:grid;grid-template-columns:var(--hang) minmax(0,1fr);column-gap:var(--gap);align-items:baseline;font-size:clamp(34px,3.4vw,44px);line-height:1.1;font-weight:600;letter-spacing:-0.015em;text-wrap:balance}
.bk-sn{font-size:clamp(48px,5.4vw,72px);line-height:1;font-weight:600;color:var(--bk-ink);font-variant-numeric:tabular-nums}
.bk-lead{margin:20px 0 0 calc(var(--hang) + var(--gap));font-size:16px;line-height:1.6;color:var(--bk-soft);max-width:60ch}
.bk-lead--big{margin:0;font-family:var(--body);font-size:19px;line-height:1.55;color:var(--bk-ink);max-width:none}
.bk-body{font-size:15px;line-height:1.65;color:var(--bk-soft);max-width:62ch}
.bk-measure{max-width:62ch}
.bk-note{font-size:13px;line-height:1.55;color:var(--bk-quiet);max-width:52ch;margin-top:16px}
.bk-cap,.bk .cap{font-size:12px;line-height:1.5;color:var(--bk-quiet)}
.bk-cl{display:grid;grid-template-columns:var(--hang) minmax(0,1fr);column-gap:var(--gap);margin-top:56px;padding-top:16px;border-top:1px solid var(--bk-rule)}
.bk-cl>*{grid-column:2;min-width:0}
.bk-head+.bk-cl{margin-top:0}
.bk-cl>.bk-cl__h{grid-column:1;display:flex;flex-direction:column;gap:2px;font-size:14px;line-height:1.35;font-weight:600}
.bk-cn{flex:none;color:var(--bk-quiet);font-size:13px;font-weight:500}
.bk-cl__h .bk-cn{font-size:13px}
/* every numbered block is a link target (#cl-4-1, #cl-4-4-2); the clause number links to itself */
.bk [id^="cl-"]{scroll-margin-top:24px}
.bk-cn--a{align-self:flex-start;text-decoration:none;border-radius:2px}
@media (hover:hover){.bk-cn--a:hover{color:var(--bk-ink);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}}
.bk-cl:target>.bk-cl__h .bk-cn--a,.bk-crow:target>.bk-cn,.bk-rules li:target>.bk-cn,.bk-never li:target>.bk-cn{color:var(--bk-ink);font-weight:600}
.bk-cl:target{border-top-color:var(--bk-ink)}
.bk-t tr:target>*{background:var(--bk-panel)}
.bk-ref{text-underline-offset:3px;text-decoration-thickness:1px}
.bk-mk{color:var(--bk-mark);font-weight:600}
.bk-cl>.bk-cap,.bk-cl>.bk-note{margin-top:12px}
.bk-ftn{margin-top:20px}
.bk-foot{display:flex;justify-content:space-between;gap:16px;max-width:1040px;margin:0 auto;padding:8px 0 40px;font-size:12px;color:var(--bk-quiet-panel)}

/* ledger tables: a full rule under the header, a hairline under every row */
.bk-t{width:100%;border-collapse:collapse;font-size:14px;line-height:1.5}
.bk-t th{font-size:12px;font-weight:500;color:var(--bk-quiet);padding:0 12px 8px 0;border-bottom:1px solid var(--bk-ink);vertical-align:bottom}
.bk-t td,.bk-t tbody th{padding:12px 16px 12px 0;border-bottom:1px solid var(--bk-hair);vertical-align:top;font-size:14px;font-weight:400;color:var(--bk-soft)}
.bk-t tbody th{font-weight:600;color:var(--bk-ink)}
.bk-t .r{text-align:right}
.bk-t th.bk-t__ref,.bk-t td.bk-t__ref{width:64px;color:var(--bk-quiet);font-size:13px}
.bk-t td span+span{display:block}
.bk-t tr>:last-child{padding-right:0}
.bk-t tbody th .m{font-weight:400}

/* buttons and links */
.bk-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-width:96px;height:36px;padding:0 14px;margin-top:16px;border:${bw}px solid var(--bk-ink);border-radius:${rc}px;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);white-space:nowrap;text-decoration:none;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-btn.is-copied{background:var(--bk-ink);color:var(--bk-ground)}
.bk-btn--primary{margin-top:0;height:44px;padding:0 24px;border-color:transparent;background:var(--bk-action);color:var(--bk-action-ink);font-size:14px;font-weight:600}
.bk-btn--quiet{margin-top:0;min-width:0;border-color:transparent;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
@media (hover:hover){.bk-btn:hover{background:var(--bk-panel)}.bk-btn--primary:hover{background:var(--bk-action-hover)}.bk-btn.is-copied:hover{background:var(--bk-ink)}}
.bk-btn:active{transform:scale(0.97)}
.bk-btn[disabled]{color:var(--bk-quiet);border-color:var(--bk-hair);cursor:not-allowed;transform:none}
.bk-dls{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center}
.bk-dl{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:28px;padding:0 10px;border:1px solid var(--bk-edge);border-radius:${rc}px;font:500 12px/1 var(--chrome);color:var(--bk-ink);text-decoration:none;transition:background-color 120ms ease-out}
@media (hover:hover){.bk-dl:hover{background:var(--bk-panel)}}
.bk-live{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:40;padding:12px 20px;border-radius:${rc}px;background:var(--bk-ink);color:var(--bk-ground);font:500 13px/1.3 var(--chrome);opacity:0;pointer-events:none;transition:opacity 150ms ease-out;max-width:calc(100vw - 32px)}
.bk-live.is-on{opacity:1}
.bk-live:empty{display:none}

/* numbered figures: a ruled frame, the caption below with its number */
.bk-fg{border:1px solid var(--bk-rule);background:var(--bk-ground);min-width:0}
.bk-fg__b{padding:32px;overflow:hidden}
.bk-fg__c{display:flex;gap:16px;padding:10px 16px;border-top:1px solid var(--bk-rule);font-size:12px;line-height:1.5;color:var(--bk-soft)}
.bk-fg__c b{flex:none;color:var(--bk-ink);font-weight:600}
.bk .is-hair{box-shadow:inset 0 0 0 1px var(--fix-hair)}

/* photos and slots */
.bk-ph{display:block;width:100%;height:100%;object-fit:cover}
.bk .photo-slot{display:flex;align-items:flex-end;padding:14px;font-family:var(--chrome);font-size:12px;line-height:1.5;background:var(--bk-panel);color:var(--bk-quiet-panel);border-radius:0}
.bk-capt{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;font-size:12px;line-height:1.5;color:var(--bk-quiet)}
.bk-capt b{display:block;font-size:12px;font-weight:600;color:var(--bk-ink)}

/* overview: the title block, with the document's particulars beside the description */
.bk-sec--overview .bk-rh{margin-bottom:80px}
.bk-hero h1{font-size:clamp(44px,6.4vw,92px);line-height:0.96;text-wrap:balance;font-weight:${top};max-width:12ch}
.bk-front{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:40px;margin:64px 0 8px;padding-top:20px;border-top:1px solid var(--bk-ink);align-items:start}
.bk-meta div{display:grid;grid-template-columns:96px minmax(0,1fr);gap:16px;padding:9px 0;border-bottom:1px solid var(--bk-hair);font-size:14px}
.bk-meta div:first-child{padding-top:0}
.bk-meta dt{color:var(--bk-quiet)}
.bk-pers th.bk-t__ref{width:64px}

/* voice */
.bk-defn{padding:28px 0;border-top:1px solid var(--bk-ink);border-bottom:1px solid var(--bk-hair)}
.bk-bigline{font-size:clamp(34px,4vw,56px);line-height:1.04;text-wrap:balance}
.bk-line2{margin-top:16px;font-size:24px;line-height:1.2;color:var(--bk-soft)}
.bk-pr4 td{padding-top:16px;padding-bottom:16px}
.bk-pr4 tbody th{width:170px;font-size:14px}
.bk-pe{font-family:var(--body);font-size:20px;font-weight:500;line-height:1.3;color:var(--bk-ink);text-wrap:balance}
.bk-wtn td.w{font-family:var(--body);font-weight:500;font-size:15px;color:var(--bk-ink)}
.bk-wtn td.n{font-family:var(--body);font-size:15px;color:var(--bk-quiet);text-decoration:line-through;text-decoration-thickness:1px}
.bk-wtn td.b{font-size:14px;color:var(--bk-soft)}
.bk-bps{display:flex;flex-direction:column;gap:28px}
.bk-bpb{padding:2px 0 2px 20px;border-left:3px solid var(--bk-ink)}
.bk-bpb__h{font-size:12px;font-weight:600;color:var(--bk-quiet);margin-bottom:6px}
.bk-bp{font-family:var(--body);font-size:15px;line-height:1.65;color:var(--bk-ink);max-width:58ch}

/* logo: the versions table, then figures with numbered captions */
.bk-vt th.bk-vt__v,.bk-vt td.bk-vt__v{width:214px}
.bk-vt td{vertical-align:top}
.bk-vt th.bk-vt__f,.bk-vt td.bk-vt__f{width:124px}
.bk-vcell__n{display:flex;gap:8px;align-items:baseline;margin-top:6px;font-size:12px}
.bk-vcell__n b{color:var(--bk-ink);font-weight:600}
.bk-vt .bk-ground{display:flex;align-items:center;justify-content:center;min-height:68px;padding:12px;border-radius:0}
.bk-vt .bk-ground svg,.bk-vt .bk-ground .logo-slot{display:block;max-width:100%;height:auto}
.bk-vt .bk-file__n{font-size:11px}
.bk-vt td{font-size:13px}
.bk-clearwrap{overflow:hidden;max-width:100%;text-align:center}
.bk-clear{position:relative;display:inline-block;max-width:100%;border:1px dashed var(--fix-quiet);background:var(--fix-ground);color:var(--fix-ink)}
.bk-clear__in{outline:1px solid var(--fix-hair);outline-offset:0}
.bk-clear svg,.bk-clear .logo-slot{display:block;max-width:100%;height:auto}
.bk-x{position:absolute;display:block}
.bk-x::before{content:'';position:absolute}
.bk-xt,.bk-xb{left:calc(50% - 4px);width:9px;border-top:1px solid var(--fix-mark);border-bottom:1px solid var(--fix-mark)}
.bk-xt{top:0}.bk-xb{bottom:0}
.bk-xt::before,.bk-xb::before{left:4px;top:0;bottom:0;border-left:1px solid var(--fix-mark)}
.bk-xl,.bk-xr{top:calc(50% - 4px);height:9px;border-left:1px solid var(--fix-mark);border-right:1px solid var(--fix-mark)}
.bk-xl{left:0}.bk-xr{right:0}
.bk-xl::before,.bk-xr::before{top:4px;left:0;right:0;border-top:1px solid var(--fix-mark)}
.bk-xn{position:absolute;font-size:12px;font-weight:600;line-height:1;color:var(--fix-mark);background:var(--fix-ground);padding:1px 3px}
.bk-xt .bk-xn,.bk-xb .bk-xn{left:10px;top:50%;transform:translateY(-50%)}
.bk-xl .bk-xn,.bk-xr .bk-xn{left:50%;top:-16px;transform:translateX(-50%)}
.bk-min{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end}
.bk-min__panel{display:inline-flex;padding:20px 24px;background:var(--fix-ground);color:var(--fix-ink);box-shadow:inset 0 0 0 1px var(--fix-hair);max-width:100%}
.bk-minfig{max-width:100%}
.bk-minfig svg,.bk-minfig .logo-slot{display:block;max-width:100%}
.bk-dw{position:relative;height:9px;margin-bottom:8px;border-left:1px solid var(--fix-mark);border-right:1px solid var(--fix-mark)}
.bk-dw::before{content:'';position:absolute;left:0;right:0;top:4px;border-top:1px solid var(--fix-mark)}
.bk-dw span{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:0 6px;background:var(--fix-ground);font-size:12px;font-weight:600;line-height:1;color:var(--fix-mark);white-space:nowrap}
.bk-clearwrap+*{margin:0}
.bk-cl>.bk-fg+.bk-body,.bk-cl>.bk-fg+.bk-measure{margin-top:16px}
.bk-never li{display:grid;grid-template-columns:56px minmax(0,1fr);align-items:baseline;font-size:15px;line-height:1.5;color:var(--bk-soft);padding:10px 0;border-bottom:1px solid var(--bk-hair)}
.bk-never li:first-child{padding-top:0}
.bk-never b{color:var(--bk-ink);font-weight:600}

/* colour: numbered definitions, the contrast matrix, then the tables */
.bk-defs li+li{border-top:1px solid var(--bk-hair)}
.bk-crow{display:grid;grid-template-columns:56px minmax(0,1fr);gap:0 8px;padding:24px 0 28px}
.bk-crow:first-child{padding-top:0}
.bk-crow:last-child{padding-bottom:0}
.bk-cline{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.bk-sw{appearance:none;border:0;border-radius:2px;padding:0;width:56px;height:28px;flex:none;cursor:pointer}
.bk-swc{display:block;width:56px;height:28px;flex:none;border-radius:2px}
.bk-sw:focus-visible{outline-offset:3px}
.bk-cname{font-size:22px;font-weight:600;line-height:1.2;letter-spacing:-0.01em}
.bk-crole{font-size:14px;color:var(--bk-soft)}
.bk-clands{font-size:14px;line-height:1.55;color:var(--bk-soft);margin-top:8px;max-width:60ch}
.bk-vals{display:flex;flex-wrap:wrap;gap:6px 28px;margin-top:14px}
.bk-vals div{display:flex;gap:8px;align-items:baseline}
.bk-vals dt{font-size:12px;color:var(--bk-quiet)}
.bk-vals dd{font-family:var(--mono);font-size:12px;letter-spacing:-0.02em;color:var(--bk-ink);overflow-wrap:anywhere}
/* each value copies itself; the empty .bk-btn__t takes "Copied" for a moment (engine copy script) */
.bk-vals dd{display:flex}
.bk-val{appearance:none;display:inline-flex;align-items:center;gap:8px;min-height:28px;padding:3px 8px;margin-left:-1px;border:1px solid var(--bk-hair);border-radius:${rc}px;background:var(--bk-ground);color:var(--bk-ink);font:inherit;text-align:left;cursor:pointer;transition:background-color 120ms ease-out,border-color 120ms ease-out}
.bk-val .m{font-size:12px;white-space:normal;overflow-wrap:anywhere}
.bk-val__i{flex:none;color:var(--bk-quiet)}
.bk-val .bk-btn__t{font:500 12px/1 var(--chrome);color:var(--bk-ink)}
.bk-val .bk-btn__t:empty{display:none}
.bk-val.is-copied{border-color:var(--bk-ink)}
.bk-val.is-copied .bk-val__i{display:none}
@media (hover:hover){.bk-val:hover{background:var(--bk-panel)}.bk-val:hover .bk-val__i{color:var(--bk-ink)}}
.bk-val:active{transform:scale(0.97)}
.bk-copyall{margin-top:14px;min-width:0}
.bk-ch{display:inline-block;width:14px;height:14px;margin-right:8px;vertical-align:-2px}
.bk-mxw{overflow-x:auto;margin-top:20px}
.bk-mx{width:100%;min-width:560px;border-collapse:separate;border-spacing:0;font-size:12px;line-height:1.35}
.bk-mx th{padding:0 8px 10px 0;border-bottom:1px solid var(--bk-ink);font-size:12px;font-weight:600;color:var(--bk-ink);vertical-align:bottom;text-align:left}
.bk-mx tbody th{padding:12px 8px 12px 0;border-bottom:1px solid var(--bk-hair);vertical-align:middle;white-space:nowrap}
.bk-mx__corner{font-weight:500;color:var(--bk-quiet)}
.bk-mx__c{padding:8px 8px;border-bottom:1px solid var(--bk-hair);border-left:1px solid var(--bk-hair);vertical-align:top;color:var(--bk-ink)}
.bk-mx__c.is-used{box-shadow:inset 0 0 0 2px var(--bk-ink)}
.bk-mx__c.is-same{background:var(--bk-panel);vertical-align:middle}
.bk-mx__s{display:flex;flex-direction:column;justify-content:center;gap:4px;width:44px;height:26px;padding:0 8px;margin-bottom:6px}
.bk-mx__s i{display:block;height:3px;background:currentColor}
.bk-mx__s i+i{width:60%}
.bk-mx__r{display:block;font-size:13px;font-weight:600}
.bk-mx__l{display:block;color:var(--bk-soft)}
.bk-mx__u{display:block;font-weight:600;color:var(--bk-ink)}
.bk-mx__c.is-fail .bk-mx__r,.bk-mx__c.is-fail .bk-mx__l{color:var(--bk-quiet);font-weight:400}
.bk-mx__key{margin-top:14px;max-width:80ch}
.bk-mx__swatch{display:inline-block;width:16px;height:10px;margin-right:8px;box-shadow:inset 0 0 0 2px var(--bk-ink)}
.bk-smp{display:grid;place-items:center;width:48px;height:32px;border-radius:2px;font-family:var(--body);font-weight:500;font-size:15px}
.bk-smp--big{font-size:22px;width:56px;height:40px}
.bk-ct td{vertical-align:middle}
.bk-pn{display:block;font-size:14px;font-weight:600;color:var(--bk-ink)}
.bk-pu{display:block;font-size:12px;color:var(--bk-quiet)}
.bk-pr{display:block;font-size:15px;font-weight:600;color:var(--bk-ink);white-space:nowrap}
.bk-pl{font-size:13px;color:var(--bk-soft)}
.bk-rt td{vertical-align:middle;padding-top:6px;padding-bottom:6px}
.bk-role{appearance:none;display:inline-flex;gap:10px;align-items:center;padding:4px 10px 4px 4px;border:1px solid var(--bk-hair);border-radius:${rc}px;background:var(--bk-ground);color:var(--bk-ink);font:400 12px/1.2 var(--chrome);text-align:left;cursor:pointer;transition:background-color 120ms ease-out}
.bk-role__sw{width:28px;height:28px;border-radius:2px;box-shadow:inset 0 0 0 1px var(--bk-hair)}
.bk-role__h{font-family:var(--mono);font-size:12px;letter-spacing:-0.02em;color:var(--bk-ink)}
@media (hover:hover){.bk-role:hover{background:var(--bk-panel)}}

/* typography: specification tables, requirements, one specimen figure */
.bk-ft td,.bk-ft tbody th{vertical-align:top;padding-top:16px;padding-bottom:16px}
.bk-fa{display:block;font-size:44px;line-height:1;font-family:var(--body);font-weight:500;color:var(--bk-ink);margin-bottom:8px}
.bk-fa.disp{font-family:var(--display)}
.bk-face__n{display:block;font-size:14px;font-weight:600;color:var(--bk-ink)}
.bk-face__al{display:block;font-size:16px;line-height:1.45;color:var(--bk-ink);overflow-wrap:anywhere}
.bk-st tbody th{width:150px;vertical-align:middle}
.bk-st td{vertical-align:middle;padding-top:14px;padding-bottom:14px}
.bk-sm{display:block;font-size:min(var(--size),34px);color:var(--bk-ink);margin-bottom:6px}
.bk-scale__t{display:block;font-size:13px;font-weight:600;color:var(--bk-ink)}
.bk-st .m{font-size:12px}
.bk-tester{padding:24px;border:1px solid var(--bk-rule)}
.bk-tester__c{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:24px}
.bk-field{display:flex;flex-direction:column;gap:8px}
.bk-field label{font-size:12px;font-weight:600;color:var(--bk-ink)}
.bk-field output{font-weight:400;color:var(--bk-soft);margin-left:8px}
.bk-field input[type=text]{height:44px;padding:0 12px;border:${bw}px solid var(--bk-edge);border-radius:${rc}px;background:var(--bk-ground);color:var(--bk-ink);font:400 16px/1 var(--body)}
.bk-field input[type=range]{height:44px;margin:0;accent-color:var(--bk-action);width:100%}
.bk-tester__d{margin-top:28px;font-size:min(var(--tester-size,64px),15vw);line-height:1.05;min-height:1.05em;overflow-wrap:anywhere}
.bk-tester__b{margin-top:16px;font-family:var(--body);font-weight:500;font-size:min(var(--tester-size,64px),11vw);line-height:1.15;min-height:1.15em;overflow-wrap:anywhere}
.bk-use__h{font-size:34px;line-height:1.05;margin-bottom:16px}
.bk-use__p{font-family:var(--body);font-size:15px;line-height:1.6;color:var(--bk-soft);margin-bottom:12px;max-width:56ch}
.bk-rules li{display:grid;grid-template-columns:56px minmax(0,1fr);gap:6px 0;padding:14px 0;border-bottom:1px solid var(--bk-hair)}
.bk-rules li:first-child{padding-top:0}
.bk-rules li>.bk-cn{grid-row:1/span 2;padding-top:1px}
.bk-rules p{font-size:14px;line-height:1.5;display:grid;grid-template-columns:84px minmax(0,1fr);grid-column:2}
.bk-rules b{font-size:12px;font-weight:600;color:var(--bk-ink);padding-top:2px}
.bk-dont{color:var(--bk-soft)}.bk-do{color:var(--bk-ink)}

/* imagery: each shot a figure with its numbered caption beside it */
.bk-shots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:32px;border-top:1px solid var(--bk-ink)}
.bk-shot{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-content:start;padding:20px 0 24px;border-bottom:1px solid var(--bk-hair);min-width:0}
.bk-shot__f{overflow:hidden;aspect-ratio:3/2}
.bk-shot__f:has(.photo-slot){aspect-ratio:auto;min-height:150px}
.bk-shot__f:has(.photo-slot) .photo-slot{min-height:150px}
.bk-shot .photo-slot{height:100%}
.bk-shot .bk-capt{flex-direction:column;gap:12px;font-size:13px;color:var(--bk-soft)}
.bk-shot .bk-capt b{font-size:13px;margin-bottom:2px}

/* layout */
.bk-gridfig{display:grid;grid-template-columns:minmax(0,280px) minmax(0,1fr);gap:32px;align-items:start}
.bk-gridfig .bk-fg__b{padding:20px}
.bk-page{display:grid;background:var(--bk-raised);box-shadow:inset 0 0 0 1px var(--bk-rule)}
.bk-page__g{display:grid}
.bk-page__g i{display:block;background:var(--bk-panel)}
.bk-spt td{vertical-align:middle;padding-top:8px;padding-bottom:8px}
.bk-bar{display:block;height:8px;background:var(--bk-ink)}
.bk-rdt td,.bk-rdt tbody th{vertical-align:middle}
.bk-rd{display:block;width:72px;height:44px;border:${bw}px solid var(--bk-ink);background:var(--bk-ground)}

/* applications: each work in a numbered figure */
.bk-cl>.bk-fg .bk-cap,.bk-cl>.bk-fg .cap{color:var(--bk-quiet)}
.bk-cards{display:flex;gap:24px;flex-wrap:wrap;justify-content:center}
.bk-sec--apps .bk-fg__b{display:flex;justify-content:center;padding:28px 24px;background:var(--bk-panel)}
.bk-sec--apps .bk-fg__b>*{min-width:0;max-width:100%}
.bk-card{position:relative;width:328px;max-width:100%;aspect-ratio:90/55;border-radius:3px;overflow:hidden;flex:none}
.bk-card--front{background:${sb.ground};color:${sb.name}}
.bk-card--back{background:var(--fix-ground);color:var(--fix-ink);box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-card__logo{position:absolute;left:28px;top:44%;transform:translateY(-50%)}
.bk-card__logo svg,.bk-card__logo .logo-slot{display:block;max-width:100%;height:auto}
.bk-card__line{position:absolute;left:28px;bottom:22px;font-family:var(--body);font-weight:500;font-size:12px}
.bk-card__mark{position:absolute;right:24px;top:22px}
.bk-card__who{position:absolute;left:28px;bottom:24px;font-family:var(--body)}
.bk-card__who .nm{font-family:var(--display);font-weight:${sub};font-size:17px;line-height:1.2}
.bk-card__who .rl{font-size:13px;color:var(--fix-soft);margin-top:2px}
.bk-card__who .ct{font-size:13px;line-height:1.5;margin-top:12px}
.bk-posts{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;justify-content:center}
.bk-post{position:relative;overflow:hidden;border-radius:3px;max-width:100%;flex:none;padding:20px}
.bk-post--sq{width:260px;aspect-ratio:1}
.bk-post--pt{width:208px;aspect-ratio:4/5}
.bk-post--st{width:146px;aspect-ratio:9/16;padding:16px}
.bk-post .disp{position:relative;z-index:1;font-size:28px;line-height:1}
.bk-post--pt .disp{font-size:24px}.bk-post--st .disp{font-size:22px}
.bk-post__lg{position:absolute;left:20px;bottom:20px}
.bk-sign{width:min(100%,360px)}
.bk-sign__w{position:relative;margin:28px 0 0 36px;width:240px;max-width:calc(100% - 36px)}
.bk-sign__dh{position:absolute;left:0;right:0;top:-20px;height:9px;border-left:1px solid var(--bk-mark);border-right:1px solid var(--bk-mark)}
.bk-sign__dh::before{content:'';position:absolute;left:0;right:0;top:4px;border-top:1px solid var(--bk-mark)}
.bk-sign__dv{position:absolute;left:-20px;top:0;bottom:0;width:9px;border-top:1px solid var(--bk-mark);border-bottom:1px solid var(--bk-mark)}
.bk-sign__dv::before{content:'';position:absolute;top:0;bottom:0;left:4px;border-left:1px solid var(--bk-mark)}
.bk-sign__dh span,.bk-sign__dv span{position:absolute;padding:2px 4px;background:var(--bk-ground);font-size:12px;font-weight:600;line-height:1;color:var(--bk-ink);white-space:nowrap}
.bk-sign__dh span{left:50%;top:50%;transform:translate(-50%,-50%)}
.bk-sign__dv span{left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg)}
.bk-board{position:relative;width:100%;border-radius:2px;padding:20px 18px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box}
.bk-board__h{font-size:30px;line-height:1}
.bk-board__lg svg,.bk-board__lg .logo-slot{display:block;max-width:100%;height:auto}
.bk-email{width:min(100%,480px);padding:24px;background:var(--fix-ground);color:var(--fix-ink);box-shadow:inset 0 0 0 1px var(--fix-hair);font-family:var(--body)}
.bk-email__n{font-size:16px;font-weight:500}
.bk-email__r{font-size:14px;color:var(--fix-soft)}
.bk-email__c{font-size:14px;line-height:1.5;margin-top:12px}
.bk-email__l{margin-top:20px;padding-top:16px;border-top:1px solid var(--fix-hair)}
.bk-device{width:min(100%,390px);border:${bw}px solid var(--bk-ink);border-radius:${rd}px;overflow:hidden;background:var(--bk-ground)}
.bk-screen{padding:20px;display:flex;flex-direction:column;gap:12px}
.bk-scr__top{display:flex;justify-content:space-between;align-items:center}
.bk-scr__time{font-size:13px;font-weight:500}
.bk-scr__eta{margin:0;font-size:30px;line-height:1.05}
.bk-scr__note{margin:0;font-size:13px;color:var(--text-soft)}
.bk-scr__ft{display:flex;justify-content:space-between;font-size:12px;color:var(--quiet)}

/* downloads: a bill of materials, one table per folder */
.bk-zip{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;padding:20px 0;border-top:1px solid var(--bk-ink);border-bottom:1px solid var(--bk-hair);margin-bottom:8px}
.bk-cl>.bk-zip{border-top:0;padding-top:0}
.bk-zip__n{font-family:var(--mono);font-size:13px;letter-spacing:-0.02em;margin-bottom:4px}
.bk-fwhat{margin:0 0 16px}
.bk-bom td,.bk-bom tbody th{padding-top:8px;padding-bottom:8px;vertical-align:middle;font-size:13px}
.bk-bom tbody th{font-weight:500;color:var(--bk-ink)}
.bk-t.bk-bom th.r,.bk-t.bk-bom td.r{padding-right:24px;white-space:nowrap}
.bk-bom td.bk-t__dl{padding-left:12px}
.bk-file__n{font-family:var(--mono);font-size:11px;letter-spacing:-0.02em;overflow-wrap:anywhere;color:var(--bk-soft)}
.bk-t th.bk-t__dl,.bk-t td.bk-t__dl{text-align:right;white-space:nowrap}
.bk-bom .bk-btn{height:32px;padding:0 4px}
.bk-bom .bk-dls{justify-content:flex-end}
.bk-pngs{display:inline-flex;gap:6px;align-items:center;margin-left:8px}
.bk-iconi{display:inline-block;vertical-align:-5px;margin-right:10px;color:var(--bk-ink)}

/* mid widths: the contents column keeps its place down to 1101 px, so the sheet gives back margin and hang; below that the bar replaces the column */
@media (max-width:1320px){
.bk{--hang:112px;--gap:24px}
.bk main{padding:32px 24px 0}
.bk-sec{padding:28px 32px 64px}
}
@media (max-width:1100px){
.bk{display:block}
.bk-top{position:sticky;top:0;z-index:20;height:auto;flex-direction:row;align-items:center;flex-wrap:nowrap;gap:12px;padding:8px 24px;min-height:60px;border-right:0;border-bottom:1px solid var(--bk-rule)}
.bk-brand{flex:1;width:auto}.bk-brand svg{width:112px}
.bk-name{font-size:15px}
.bk-menu{display:inline-flex;appearance:none;align-items:center;justify-content:center;height:44px;min-width:72px;padding:0 14px;border:${bw}px solid var(--bk-ink);border-radius:0;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);cursor:pointer}
.bk-menu[aria-expanded="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button{height:40px;padding:0 12px;min-width:48px}
.bk-nav{display:none;position:absolute;left:0;right:0;top:100%;padding:8px 24px 16px;background:var(--bk-ground);border-bottom:1px solid var(--bk-rule);max-height:calc(100vh - 60px);overflow:auto;overscroll-behavior:contain}
.bk-nav::before{display:none}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav a{padding:12px 8px;min-height:44px;font-size:15px;align-items:center}
.bk-sec,.bk [id^="cl-"]{scroll-margin-top:76px}
}

/* narrow: a top bar and a menu; tables stack as labelled rows; the matrix stacks too */
@media (max-width:840px){
.bk{display:block}
.bk-top{position:sticky;top:0;z-index:20;height:auto;flex-direction:row;align-items:center;flex-wrap:nowrap;gap:12px;padding:8px 16px;min-height:60px;border-right:0;border-bottom:1px solid var(--bk-rule)}
.bk-brand{flex:1;width:auto}.bk-brand svg{width:112px}
.bk-name{font-size:15px}
.bk-menu{display:inline-flex;appearance:none;align-items:center;justify-content:center;height:44px;min-width:72px;padding:0 14px;border:${bw}px solid var(--bk-ink);border-radius:0;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);cursor:pointer}
.bk-menu[aria-expanded="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button{height:40px;padding:0 12px;min-width:48px}
.bk-nav{display:none;position:absolute;left:0;right:0;top:100%;padding:8px 16px 16px;background:var(--bk-ground);border-bottom:1px solid var(--bk-rule);max-height:calc(100vh - 60px);overflow:auto;overscroll-behavior:contain}
.bk-nav::before{display:none}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav a{padding:12px 8px;min-height:44px;font-size:15px;align-items:center}
.bk main{padding:0}
.bk-sec{margin:0 0 16px;padding:20px 20px 40px;border-left:0;border-right:0;scroll-margin-top:60px}
.bk [id^="cl-"]{scroll-margin-top:60px}
.bk-rh{margin-bottom:40px}
.bk-sec--overview .bk-rh{margin-bottom:40px}
.bk-head{margin-bottom:32px}
.bk-h2{grid-template-columns:minmax(0,1fr);gap:4px;font-size:32px}
.bk-sn{font-size:48px}
.bk-lead{margin-left:0}
.bk-hero h1{font-size:44px}
.bk-front{grid-template-columns:minmax(0,1fr);gap:28px;margin-top:40px}
.bk-lead--big{font-size:18px}
.bk-cl{grid-template-columns:minmax(0,1fr);margin-top:40px}
.bk-cl>*,.bk-cl>.bk-cl__h{grid-column:1}
.bk-cl>.bk-cl__h{flex-direction:row;gap:12px;align-items:baseline;margin-bottom:16px}
.bk-bigline{font-size:36px}
.bk-line2{font-size:22px}
.bk-t:not(.bk-mx),.bk-t:not(.bk-mx) tbody,.bk-t:not(.bk-mx) tr,.bk-t:not(.bk-mx) td,.bk-t:not(.bk-mx) tbody th{display:block}
.bk-t thead{display:none}
.bk-t tr{padding:14px 0;border-bottom:1px solid var(--bk-hair)}
.bk-t tr:first-child{border-top:1px solid var(--bk-ink)}
.bk-t td,.bk-t tbody th{padding:4px 0;border:0;width:auto!important}
.bk-t td::before,.bk-t tbody th::before{content:attr(data-l);display:block;font-size:12px;font-weight:400;color:var(--bk-quiet)}
.bk-t td.bk-t__ref::before,.bk-t tbody th.bk-t__ref::before{display:none}
.bk-t td.bk-t__ref,.bk-t th.bk-t__ref{width:auto!important;padding-bottom:0}
.bk-t td:empty{display:none}
.bk-t .r,.bk-t td.bk-t__dl{text-align:left}
.bk-t .bk-ground{max-width:240px}
.bk-mx,.bk-mx tbody,.bk-mx tr,.bk-mx tbody th,.bk-mx td{display:block}
.bk-mx{min-width:0}
.bk-mx thead{display:none}
.bk-mx tbody tr{padding:14px 0;border-bottom:1px solid var(--bk-hair)}
.bk-mx tbody tr:first-child{border-top:1px solid var(--bk-ink)}
.bk-mx tbody th{padding:0 0 8px;border:0;font-size:15px}
.bk-mx__c{display:flex;align-items:center;gap:12px;padding:6px 8px;border:0}
.bk-mx__c::before{content:attr(data-l);order:1;flex:1;font-size:13px}
.bk-mx__c.is-same{display:none}
.bk-mx__s{order:0;margin:0;flex:none}
.bk-mx__r,.bk-mx__l,.bk-mx__u{order:2}
.bk-mx__r{width:64px}.bk-mx__l{width:56px}.bk-mx__u{width:40px}
.bk-bom .bk-dls{justify-content:flex-start}
.bk-wtn td.n{text-decoration:line-through}
.bk-pngs{margin-left:0}
.bk-fg__b{padding:20px 16px}
.bk-fg__c{flex-direction:column;gap:2px}
.bk-gridfig{grid-template-columns:minmax(0,1fr);gap:24px}
.bk-crow{grid-template-columns:minmax(0,1fr);padding:20px 0 24px}
.bk-crow>.bk-cn{margin-bottom:6px}
.bk-vals{flex-direction:column;gap:6px}
.bk-vals div{display:grid;grid-template-columns:52px minmax(0,1fr);align-items:center;gap:8px}
.bk-val{min-height:44px;padding:4px 12px}
.bk-copyall{height:44px}
.bk-role{min-height:44px}
.bk-shot{grid-template-columns:minmax(0,1fr);gap:12px}
.bk-shot__f{aspect-ratio:4/3}
.bk-rules li{grid-template-columns:minmax(0,1fr)}
.bk-rules li>.bk-cn{grid-row:auto}
.bk-rules p{grid-column:1}
.bk-never li{grid-template-columns:48px minmax(0,1fr)}
.bk-tester{padding:20px}
.bk-tester__c{grid-template-columns:minmax(0,1fr)}
.bk-btn,.bk-dl{min-height:44px}
.bk-dl{min-width:44px}
.bk-btn--primary{width:100%}
.bk-bom .bk-btn{height:44px;justify-content:flex-start}
.bk-foot{padding:16px 20px 32px;flex-direction:column;background:var(--bk-panel)}
}

/* dark: grounds, chips and posters that match the page ground get a hairline so their edge shows */
[data-theme="dark"] .bk-sw,[data-theme="dark"] .bk-swc,[data-theme="dark"] .bk-ch,[data-theme="dark"] .bk-smp,[data-theme="dark"] .bk-mx__s,[data-theme="dark"] .bk-vt .bk-ground,[data-theme="dark"] .bk-post,[data-theme="dark"] .bk-card--front,[data-theme="dark"] .bk-role__sw{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--bk-ink) 40%,transparent)}
@media (max-width:840px){
.bk-measure+.bk-t,.bk-body+.bk-t{margin-top:16px}
.bk-t.bk-spt tr,.bk-t.bk-meas tr{display:grid;grid-template-columns:52px minmax(0,1fr) 56px;align-items:center;gap:0 8px;padding:10px 0}
.bk-t.bk-spt tr{grid-template-columns:52px minmax(0,1fr) 56px 80px}
.bk-t.bk-spt td::before,.bk-t.bk-spt tbody th::before,.bk-t.bk-meas td::before,.bk-t.bk-meas tbody th::before{display:none}
.bk-t.bk-spt td.r,.bk-t.bk-meas td.r{text-align:right}
}
@media (max-width:560px){
.bk-shots{grid-template-columns:minmax(0,1fr)}
.bk-sec--apps .bk-fg__b{padding:12px 8px}
.bk-screen{padding:14px}
}

@media (prefers-reduced-motion:reduce){.bk *{transition:none!important}.bk-btn:active{transform:none}html{scroll-behavior:auto}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}

@media print{
:root,[data-theme="dark"]{${vars(L)}}
.bk{display:block;background:var(--bk-ground)}
.bk main{padding:0;background:var(--bk-ground)}
.bk-top,.bk-skip,.bk-live,.bk-menu,.bk-mode,.bk-btn,.bk-dls,.bk-dl,.bk-val__i,.bk-tester__c,.bk-zip,.bk-foot .bk-n,.bk-t__dl{display:none!important}
.bk-val{border:0;padding:0;min-height:0;background:none}
.bk-sec{margin:0;padding:0 0 24px;border:0;max-width:none;break-before:page}
.bk-sec--overview{break-before:auto}
.bk-sec>*{max-width:none}
figure,li,tr,.bk-fg,.bk-card,.bk-post,.bk-shot,.bk-crow{break-inside:avoid}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;
}

// the brand kit pages (read-me, sheets, pack boards) are .pg pages: appended to css() in index.js
export function cssBook(ctx) { return cssBookKit(ctx); }
