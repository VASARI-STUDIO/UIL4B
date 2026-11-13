// Theme 32, Dieline, lane hk: the kit site's own CSS, loaded after netCss (lane-ht-net.js). Classes are hk-*. Nothing here restyles a ui-
// component: the windows set the kit's surface, and the hk- wrappers only place the components. Narrow rules sit at max-width 840px.
export function hkCss(ctx, benchRows) {
  const rc = ctx.brand.ui.radius.control;
  const curs = benchRows.map((s) => `[data-bench][data-state="${s}"] .hk-mx__r[data-row="${s}"]`), cur = curs.join(',');
  // the marked row sits on the sheet, so its quiet values take the sheet's quiet ink
  const curQ = curs.flatMap((c) => [`${c} .hk-hx`, `${c} .hk-none`, `${c} .hk-w`, `${c}>[data-k]::before`]).join(',');
  return `
/* the fold over each panel's top edge shares its class with the bar (.hs-top): keep it a 2 px line, not a 64 px band */
.hs .hs-pn>.hs-ln.hs-top{position:absolute;top:0;z-index:0;display:block;min-height:0;padding:0;background:none;border:0;gap:0}
.sx-live{position:fixed;left:16px;bottom:16px;z-index:5;margin:0;max-width:calc(100% - 32px);font:500 13px/1.3 var(--hs-chrome);background:var(--hs-ink);color:var(--hs-sheet);border-radius:${rc}px;padding:0}
.sx-live:not(:empty){padding:10px 14px}
.hs .hs-win__ui{background:var(--surface);color:var(--text)}
.hk-flush>.hs-win__ui{padding:0;align-items:stretch}
.hk-title{color:var(--fi)}
.hk-meta{color:var(--fi)}
.hk-samp{display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px}
.hk-col{display:flex;flex-direction:column;align-items:flex-start;gap:12px;width:100%}
.hk-grow{flex:1;min-width:0}
.hk-form{display:flex;flex-direction:column;align-items:flex-start;gap:16px;width:100%;max-width:400px}
.hk-form .ui-field{width:100%}
.hs-win__ui>.ui-field{width:100%;max-width:400px}
.hk-uilogo{display:block;flex:none}
.hk-uilogo>svg,.hk-uilogo>.logo-slot{display:block;width:100%!important;height:auto!important}

/* specimens: a heading, a note, the window and its markup */
.hk-specs{display:flex;flex-direction:column;gap:48px}
.hk-spec{display:flex;flex-direction:column;gap:12px;min-width:0}
.hk-spec .hs-h2{margin-top:0}

/* the markup: a sealed strip, the copy tab on the perforation */
.hk-code{position:relative;min-width:0;background:var(--hs-sheet);color:var(--hs-ink);border:1.5px solid var(--fl)}
.hk-code[hidden]{display:none}
.hk-code__bar{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 6px 8px 16px}
.hk-code__bar .hk-perf{top:auto;bottom:0;color:var(--hs-die)}
.hk-code__k{font:500 13px/1.3 var(--hs-chrome);color:var(--hs-qsheet);min-width:0}
.hk-pre{margin:0;padding:14px 16px 18px;font:400 12.5px/1.6 var(--hs-val);white-space:pre-wrap;overflow-wrap:anywhere;tab-size:2;color:var(--hs-ink)}
.hk-pre code{font:inherit}
.hk-copy{position:relative;flex:none;appearance:none;display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border:1.5px solid var(--hs-ink);border-radius:${rc}px;background:var(--hs-sheet);color:var(--hs-ink);font:500 13px/1 var(--hs-chrome);cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out,transform 120ms ease-out}
.hk-copy.is-done{background:var(--hs-ink);color:var(--hs-sheet)}
.hk-copy:active{transform:scale(.97)}
@media (hover:hover){.hk-copy:hover{background:var(--hs-ink);color:var(--hs-sheet)}}
.hk-hexrow .hk-copy,.hk-samp .hk-copy{min-height:32px;padding:0 10px}

/* the contents: one strip a section, one cell a page */
.hk-sec{display:flex;flex-direction:column;gap:12px}
.hk-sec+.hk-sec{margin-top:24px}
.hk-sec__n{font-variant-numeric:tabular-nums;color:var(--fq);margin-right:6px}
.hk-tiles{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
.hk-tiles .hs-cell{padding:0}
.hk-tile{display:flex;flex-direction:column;gap:6px;height:100%;padding:20px 24px 24px;text-decoration:none;color:var(--fi);transition:background-color 120ms ease-out}
.hk-tile__r{color:var(--fq);font-variant-numeric:tabular-nums}
.hk-tile__t{font:500 16px/1.3 var(--hs-chrome)}
.hk-tile__d{font:400 13px/1.5 var(--hs-body);color:var(--fq)}
.hk-tile:focus-visible{outline-offset:-4px}
@media (hover:hover){.hk-tile:hover{background:var(--hs-sheet)}.hk-tile:hover .hk-tile__t{text-decoration:underline;text-underline-offset:4px}}

/* the bench: kind and state tabs, the live figure, the measured matrix */
.hk-ctl{display:flex;flex-wrap:wrap;gap:16px 40px}
.hk-grp{display:flex;flex-direction:column;gap:8px;min-width:0}
.hk-grp__k{font:500 13px/1.3 var(--hs-chrome);color:var(--fq)}
.hk-tabs{display:flex;flex-wrap:wrap;gap:6px}
.hk-tabs button{appearance:none;min-height:40px;padding:0 14px;border:1.5px solid var(--fi);border-radius:${rc}px;background:transparent;color:var(--fi);font:500 14px/1 var(--hs-chrome);cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.hk-tabs button[aria-pressed="true"]{background:var(--fi);color:var(--f)}
@media (hover:hover){.hk-tabs button[aria-pressed="false"]:hover{box-shadow:inset 0 0 0 1.5px var(--fi)}}
.hk-benchwin>.hs-win__ui{min-height:240px;justify-content:center;align-items:center;padding:48px 32px}
.hk-fv{display:flex;justify-content:center;width:100%;max-width:400px}
.hk-fv[hidden]{display:none}
.hk-fv>.ui-field{width:100%}
.hk-now{font:500 14px/1.3 var(--hs-chrome);color:var(--fi)}
.hk-now span{font-weight:400}
.hk-mx{display:flex;flex-direction:column;border-top:1.5px solid var(--fl)}
.hk-mx[hidden]{display:none}
.hk-mx__r{display:grid;grid-template-columns:minmax(72px,.7fr) repeat(4,minmax(0,1.3fr)) minmax(44px,.45fr);gap:12px;padding:12px 8px;border-bottom:1px solid var(--hs-hair);font:400 13px/1.4 var(--hs-chrome);align-items:start}
.hk-mx__h{font-weight:500;color:var(--fq);padding-top:10px;padding-bottom:10px}
.hk-mx__s{font-weight:500}
.hk-mx__r>span{display:flex;gap:8px;min-width:0}
.hk-mx .m{font-size:12px;line-height:1.45}
.hk-dots{display:inline-flex;flex:none;gap:2px;padding-top:3px}
.hk-dots i{display:block;width:10px;height:10px;border-radius:2px;box-shadow:inset 0 0 0 1px var(--hs-die)}
.hk-tv{display:flex;flex-direction:column;min-width:0}
.hk-tn{font-weight:400;color:var(--fi)}
.hk-hx{color:var(--fq)}
.hk-tv .hk-tn+.hk-hx,.hk-tv .hk-tn+.hk-hx+.hk-hx{color:var(--fq)}
.hk-none{color:var(--fq)}
.hk-w{color:var(--fq);white-space:nowrap}
${cur}{background:var(--hs-sheet);box-shadow:inset 3px 0 0 var(--fi)}
${curQ}{color:var(--hs-qsheet)}
.hk-bcode{display:flex;flex-direction:column}

/* colour */
.hk-sws{grid-template-columns:repeat(auto-fill,minmax(180px,1fr))}
.hk-sw{display:block;height:88px;margin:-24px -24px 8px;box-shadow:inset 0 -1px 0 var(--fl)}
.hk-tok{font-size:13px;color:var(--fi)}
.hk-hexrow{display:flex;align-items:center;justify-content:space-between;gap:8px}
/* type */
.hk-tys{display:flex;flex-direction:column;gap:20px;width:100%}
.hk-ty{margin:0;max-width:40em;text-wrap:pretty}
.hk-tyv{display:block}
/* spacing */
.hk-sps{display:flex;flex-direction:column;gap:10px;width:100%}
.hk-sp{display:grid;grid-template-columns:96px 56px minmax(0,1fr);gap:16px;align-items:center;color:var(--text)}
.hk-sp .m{font-size:12px}
.hk-sp__px{color:var(--quiet);font-variant-numeric:tabular-nums}
.hk-sp__bar{display:block;height:16px;max-width:100%;background:var(--text)}
/* radii and lines */
.hk-rds{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:24px;width:100%;color:var(--text)}
.hk-rd,.hk-bd{display:flex;flex-direction:column;gap:6px}
.hk-rd .m,.hk-bd .m{font-size:12px}
.hk-rd__box{display:block;width:96px;height:96px;border:1.5px solid var(--text);background:var(--sunken);margin-bottom:6px}
.hk-rd__u{font:400 13px/1.45 var(--hs-body);color:var(--quiet)}
.hk-bds{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:24px;width:100%;color:var(--text)}
.hk-bd__ln{display:block;width:100%;background:var(--text);margin:12px 0 10px}
/* elevation */
.hk-el{display:flex;flex-direction:column;gap:16px;width:100%}
.hk-el__well{display:flex;flex-direction:column;gap:12px;padding:16px;background:var(--sunken);border-radius:${ctx.brand.ui.radius.card || rc}px}
.hk-el__k{font:400 12px/1.3 var(--hs-val);color:var(--text)}
.hk-el .ui-toast{max-width:100%}
/* states */
.hk-sts{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
.hk-stn{font:500 15px/1.3 var(--hs-chrome);color:var(--fi)}
.hk-stc{display:flex;flex-direction:column;align-items:flex-start;gap:12px;width:100%}
.hk-stc .ui-field{width:100%}
.hk-sts .hs-win__ui{padding:16px}
.hk-cardw{width:100%;max-width:480px}
.hk-sidew{width:252px;max-width:100%}
.hk-tabbarw{width:100%;max-width:390px}
.hk-fs{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:12px;min-width:0}
.hk-fs legend{padding:0;margin-bottom:12px}
.hk-srs{display:flex;flex-direction:column;width:100%}
.hk-sr{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:44px;border-bottom:1px solid var(--divider);color:var(--text)}
.hk-sr .m{font-size:12px;color:var(--quiet)}
.hk-load{display:flex;align-items:center;gap:16px;width:100%}
.hk-scrim{display:flex;align-items:center;justify-content:center;padding:48px 24px;min-height:320px;background:color-mix(in srgb,var(--scrim) 48%,var(--surface))}
.hk-scrim .ui-dialog{position:static;max-width:440px;width:100%}
/* screens */
.hk-scr{width:100%;display:flex;flex-direction:column;container-type:inline-size}
.hk-scr .ui-topbar{flex-wrap:wrap;row-gap:8px}
.hk-scr__body{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:32px;padding:32px}
.hk-scr__main,.hk-scr__side{display:flex;flex-direction:column;gap:16px;min-width:0}
.hk-track{display:flex;flex-direction:column;align-items:flex-start;gap:12px;width:100%}
.hk-big{margin:0}
.hk-soft{margin:0;color:var(--text-soft);font:400 var(--fs-body,15px)/var(--lh-body,24px) var(--ff-body)}
.hk-route{display:flex;justify-content:space-between;width:100%;font:400 var(--fs-caption,12px)/var(--lh-caption,16px) var(--ff-body);color:var(--quiet)}
.hk-track .ui-progress{width:100%}
.hk-person{display:flex;align-items:center;gap:12px;width:100%}
.hk-pm{flex:1;min-width:0}
.hk-pn{margin:0;font:600 var(--fs-body,15px)/1.3 var(--ff-body);color:var(--text)}
.hk-ps{margin:0;font:400 var(--fs-caption,12px)/var(--lh-caption,16px) var(--ff-body);color:var(--quiet)}
.hk-dl{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;margin:0}
.hk-dl dt{font:500 var(--fs-label,13px)/var(--lh-label,18px) var(--ff-body);color:var(--quiet)}
.hk-dl dd{margin:0;font:400 var(--fs-body,15px)/var(--lh-body,24px) var(--ff-body);color:var(--text)}
.hk-clock{margin-left:16px;color:var(--quiet)}
@container (max-width:620px){.hk-scr__body{grid-template-columns:minmax(0,1fr);padding:20px}}
.hk-phone{width:100%;max-width:390px;margin:0 auto;display:flex;flex-direction:column;min-height:640px}
.hk-phone__top{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--divider);color:var(--text)}
.hk-phone__body{flex:1;display:flex;flex-direction:column;gap:20px;padding:20px}
.hk-phone .ui-tabbar{margin-top:auto}

@media (max-width:840px){
.hk-copy{min-height:44px}
.hk-hexrow .hk-copy,.hk-samp .hk-copy{min-height:44px}
.hk-tabs button{min-height:44px}
.hk-benchwin>.hs-win__ui{min-height:180px;padding:32px 16px}
.hk-mx__h{display:none}
.hk-mx__r{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px 12px;padding:12px 8px}
.hk-mx__s{grid-column:1/-1}
.hk-mx__r>[data-k]{flex-direction:column;gap:4px}
.hk-mx__r>[data-k]::before{content:attr(data-k);font:500 12px/1.3 var(--hs-chrome);color:var(--fq)}
.hk-mx__r>[data-k]>.hk-dots{padding-top:0}
.hk-sp{grid-template-columns:80px 44px minmax(0,1fr);gap:10px}
.hk-sw{margin:-24px -24px 8px}
.hk-tile{padding:16px 20px 20px}
.hk-pre{font-size:12px;padding:12px}
.hk-scrim{padding:24px 12px;min-height:280px}
.hk-phone{min-height:0}
/* a narrow window: long status words wrap inside it rather than run out over the panel */
.hs-win__ui .ui-chip{white-space:normal}
.hs-win__ui .ui-row__end{flex-shrink:1;min-width:0;max-width:45%;text-align:right}
.hk-tbl .ui-table th,.hk-tbl .ui-table td{padding:8px}
/* a phone keeps the columns people compare: the item, its status and the price */
.hk-tbl .ui-table tr>:nth-child(2){display:none}
${ctx.placeholders ? `/* slot: a placeholder inside a narrow window may wrap rather than run out of its row */
.hs-win__ui .ph-c.ph-n{white-space:normal!important;overflow-wrap:anywhere}` : ''}
}
@media (prefers-reduced-motion:reduce){.hk-copy,.hk-tabs button,.hk-tile{transition:none}.hk-copy:active{transform:none}}
`;
}
