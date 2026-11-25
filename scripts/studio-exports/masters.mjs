import { esc, appSpecimen } from './specimens.mjs';

import { editions, editionCover } from './editions.mjs';

export const contexts = {
  ...Object.fromEntries(Object.entries(editions).map(([id,e])=>[id,e.contexts])),
  flyleaf:['The book jacket','The reading list'],
  'set-square':['Site hoarding','The project dashboard'],
  dispatch:['The street billboard','Rider tracking'],
  doorlist:['The venue poster','Mobile tickets'],
  'market-day':['The market label','The counter display'],
};

export function plate(src, alt) {
  return src ? `<img class="scene-photo" src="${src}" alt="${esc(alt)}">` : '';
}

export function frontispiece(id, project, title, isUI, images, photo, fallback) {
  const name=esc(project.name || 'Your brand'), line=esc(project.headline || ''), lead=project.items?.[0] || {};
  const pic=plate(isUI?images.digital:images.physical,contexts[id][isUI?1:0]) || fallback;
  const product=`<span class="edition-title">${title}</span>`;
  if(editions[id]) return editionCover(id,project,title,isUI,images,pic,fallback);
  switch(id){
    case 'flyleaf':
      return `<div class="front folio-front"><div class="folio-text">${product}<h1>${name}</h1><p>${line}</p></div><figure>${pic}</figure></div>`;
    case 'set-square':
      return `<div class="front building-front"><div class="binder">${title}</div><h1>${name}</h1><div class="drawing-window">${pic}</div><div class="building-record"><strong>${esc(lead.title || project.screenTitle || project.name)}</strong><p>${esc(lead.detail || project.application)}</p><b>${esc(lead.price)}</b></div><div class="building-caption"><p>${line}</p><small>${contexts[id][isUI?1:0]}</small></div></div>`;
    case 'dispatch':
      return `<div class="front street-front"><figure>${isUI?pic:(photo || pic)}</figure><div class="street-tab">${product}</div><div class="street-band"><h1>${name}</h1><p>${line}</p></div></div>`;
    case 'doorlist':
      return `<div class="front poster-front"><div class="poster-top">${product}<span>${esc(isUI?project.screenTitle:lead.detail)}</span></div><h1>${name}</h1><div class="poster-bottom"><p>${esc(isUI?project.action:project.headline)}</p><figure>${pic}</figure></div></div>`;
    case 'market-day':
      return `<div class="front market-front"><div class="market-mast"><h1>${name}</h1>${product}</div><div class="market-columns"><div><p>${line}</p><small>${esc(isUI?project.screenTitle:project.applicationLine)}</small></div><figure>${isUI?pic:(photo || pic)}</figure></div></div>`;
  }
}

export function liveSpecimen(project, design, isUI) {
  const lead=project.items?.[0] || {};
  const line=esc((isUI?project.screenTitle:lead.title) || project.headline || project.name);
  return `<div class="reading-sample"><small>${esc(design.heading)} · ${design.headingWeight}</small><strong>${line}</strong><p>${esc(lead.detail || project.application || design.body)}</p><span>${esc(design.body)} · ${design.bodyWeight}</span></div>`;
}

export function composition(project, mark) {
  return `<div class="layout-proof"><div class="proof-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="proof-content">${mark}<strong>${esc(project.headline || project.name)}</strong><p>${esc(project.application || project.screenTitle)}</p></div></div><p class="note">Align the mark and headline to the same column. Use the neighbouring column for the supporting text.</p>`;
}

export function appliedImage(source, project, id, digital, fallback) {
  const label=contexts[id][digital?1:0];
  const lead=project.items?.[0] || {};
  const formatNames={flyleaf:'Jacket detail','set-square':'Hoarding detail',dispatch:'Billboard detail',doorlist:'Poster detail','market-day':'Label detail'};
  const itemFirst=['flyleaf','doorlist','contact-sheet','workbench','soundings'].includes(id);
  const words=itemFirst?lead.title:id==='market-day'?project.name:project.headline;
  const flat=source && !digital?`<div class="print-detail"><small>${editions[id]?.detail || formatNames[id]}</small><strong>${esc(words || project.name)}</strong><span>${esc(id==='market-day'?project.headline:(itemFirst?lead.detail:project.name))}</span></div>`:'';
  return `<figure class="application-plate${flat?' physical-pair':''}">${plate(source,label) || fallback}${flat}</figure><div class="application-caption"><h3>${label}</h3><p>${esc(digital?(project.screenDetail || project.screenTitle):(project.applicationLine || project.headline))}</p></div>`;
}


export function interfaceStudy(id,project,mark) {
  const label=editions[id]?.screen || {flyleaf:'Book detail','set-square':'Project overview',dispatch:'Delivery status',doorlist:'Box office','market-day':'Market listings'}[id];
  return '<div class="interface-study"><div class="screen-bar"><span>'+esc(project.name)+'</span><span>'+label+'</span></div>'+appSpecimen(project,mark,true)+'</div>';
}

export const componentStyles = {
  ...Object.fromEntries(Object.entries(editions).map(([id,e])=>[id,e.controls])),
  flyleaf: '.ui-demo{border:0;border-block:3px double var(--color-border)}.ui-demo button,.ui-demo input:not([type=checkbox]){border-radius:0}.ui-demo button{padding-inline:22px}',
  'set-square': '.ui-demo{border:2px solid var(--color-on-surface)}.ui-demo button,.ui-demo input:not([type=checkbox]){border-radius:0;border-width:2px}.ui-demo label{font-weight:var(--font-weight-heading)}',
  dispatch: '.ui-demo{border:0;border-left:10px solid var(--color-primary)}.ui-demo button{border-radius:0;font-weight:var(--font-weight-heading);padding-inline:20px}.ui-demo input:not([type=checkbox]){border-radius:0;border-bottom-width:3px}',
  doorlist: '.ui-demo{border:0;border-block:3px dashed var(--color-on-surface)}.ui-demo button{border-radius:22px;padding-inline:19px}.ui-demo input:not([type=checkbox]){border-radius:0;border-width:0 0 2px}',
  'market-day': '.ui-demo{border:4px double var(--color-border)}.ui-demo button{border-radius:3px 14px 3px 14px;padding-inline:20px}.ui-demo input:not([type=checkbox]){border-radius:0}',
};
