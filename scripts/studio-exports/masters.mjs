import { esc, appSpecimen } from './specimens.mjs';

import { editions } from './editions.mjs';

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

export function liveSpecimen(project, design, isUI) {
  const lead=project.items?.[0] || {};
  const line=esc((isUI?project.screenTitle:lead.title) || project.headline || project.name);
  return `<div class="reading-sample"><small>${esc(design.heading)} · ${design.headingWeight}</small><strong>${line}</strong><div class="alphabet">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz &amp; 0123456789</div><div class="credits"><p>${esc(lead.detail || project.application || design.body)}</p><span>${esc(design.body)} · ${design.bodyWeight}</span></div></div>`;
}

export function appliedImage(source, project, id, digital, fallback) {
  const label=contexts[id][digital?1:0];
  const caption=digital?(project.screenDetail || project.screenTitle):(project.applicationLine || project.headline);
  if(!digital && source){
    const item=project.items?.[0];
    const message=project.applicationLine || project.headline || item?.title || project.name;
    return `<div class="usage-proof"><figure class="application-plate">${plate(source,label)}</figure><div class="caption-copy"><small>${esc(project.name)}</small><h3>${esc(message)}</h3>${project.imageryNote?`<p>${esc(project.imageryNote)}</p>`:''}</div></div>`;
  }
  return `<figure class="application-plate">${plate(source,label) || fallback}</figure><div class="application-caption"><small>${esc(project.name)}</small><p>${esc(caption)}</p></div>`;
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
