import { esc } from './specimens.mjs';

export const editions = {
  'contact-sheet': {
    name:'Contact Sheet', discipline:'Gallery contact sheet', scenes:['room-gallery-panel','laptop-plinth'],
    contexts:['The exhibition panel','The visitor screen'], detail:'Panel detail', screen:'Exhibition listings',
    brand:['cover','application','logo','digital','specimen','colour','composition','type','strategy','reference'],
    ui:['cover','interface','icons','colour','contrast','tints','type','components','feedback','handoff'],
    controls:'.ui-demo{border:0;border-block:1px solid currentColor}.ui-demo button,.ui-demo input:not([type=checkbox]){border-radius:0}.ui-demo button{padding-inline:22px}',
  },
  workbench: {
    name:'Workbench',discipline:'Workshop job card', scenes:['bench-clipboard-toolbox','laptop-desk-light'],
    contexts:['The job sheet','The quote desk'],detail:'Job sheet detail',screen:'Quotes and invoices',
    brand:['cover','reference','application','composition','digital','type','specimen','logo','colour','strategy'],
    ui:['cover','interface','feedback','components','type','icons','colour','contrast','tints','handoff'],
    controls:'.ui-demo{border:2px solid currentColor;border-left-width:9px}.ui-demo button,.ui-demo input:not([type=checkbox]){border-radius:0;border-width:2px}',
  },
  soundings: {
    name:'Soundings',discipline:'Wharf departure board',scenes:['wharf-sign','phone-hand'],
    contexts:['The wharf sign','The departure screen'],detail:'Sign detail',screen:'Departures',
    brand:['cover','colour','composition','application','digital','logo','type','specimen','reference','strategy'],
    ui:['cover','interface','colour','contrast','icons','components','feedback','tints','type','handoff'],
    controls:'.ui-demo{border:0;border-top:7px solid var(--color-on-surface)}.ui-demo button{border-radius:2px;padding-inline:24px}.ui-demo label{border-bottom:1px solid var(--color-border);padding-bottom:6px}',
  },
  hearth: {
    name:'Hearth',discipline:'Residential energy handbook',scenes:['letterhead-linen','room-kitchen-phone'],
    contexts:['The household letter','The home energy screen'],detail:'Letterhead detail',screen:'Installation overview',
    brand:['cover','strategy','application','digital','logo','specimen','type','colour','composition','reference'],
    ui:['cover','interface','type','components','feedback','colour','tints','contrast','icons','handoff'],
    controls:'.ui-demo{border-radius:22px;padding:28px}.ui-demo button{border-radius:24px;padding-inline:24px}.ui-demo input:not([type=checkbox]){border-radius:10px}',
  },
};

export function editionCover(id,p,title,isUI,images,primary,fallback) {
  const name=esc(p.name || 'Your brand'), line=esc(p.headline || ''), item=p.items?.[0] || {};
  const label=`<span class="edition-title">${title}</span>`;
  const shot=`<figure class="main-shot">${primary}</figure>`;
  switch(id){
    case 'contact-sheet': {
      const second=isUI?images.physical:images.digital;
      const alt=editions[id].contexts[isUI?0:1];
      const other=second?`<img src="${second}" alt="${alt}">`:fallback;
      return `<div class="front contact-front"><div class="contact-label">${label}<span>${esc(p.screenTitle || p.applicationLine)}</span></div><div class="exposures">${shot}<figure>${other}</figure></div><div class="contact-title"><h1>${name}</h1><p>${line}</p></div></div>`;
    }
    case 'workbench':
      return `<div class="front bench-front"><div class="bench-top"><h1>${name}</h1>${label}</div>${shot}<div class="work-order"><p>${line}</p><span>${esc(item.title)}</span><b>${esc(item.price)}</b></div></div>`;
    case 'soundings': {
      const schedule=(p.items || []).slice(0,3).map(v=>`<li><strong>${esc(v.title)}</strong><span>${esc(v.detail)}</span></li>`).join('');
      return `<div class="front harbour-front"><div class="harbour-head">${label}<h1>${name}</h1></div><div class="departure-panel"><p>${line}</p><ul>${schedule}</ul></div>${shot}</div>`;
    }
    case 'hearth':
      return `<div class="front hearth-front">${label}<div class="hearth-window">${shot}</div><div class="hearth-title"><p>${line}</p><h1>${name}</h1></div></div>`;
    case 'offprint':
      return `<div class="front offprint-front"><div class="print-mast">${label}<p>${line}</p></div><div class="print-image">${shot}</div><div class="print-name"><h1>${name}</h1><span>${esc(isUI?p.screenTitle:item.detail)}</span></div></div>`;
  }
}
