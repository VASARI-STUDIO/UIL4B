import { esc } from './specimens.mjs';

export const stationery = {
  flyleaf:['card-black-paper','Publisher’s cards'], 'set-square':['bench-cards-offcuts','Site contact cards'],
  dispatch:['card-concrete','Rider cards'], doorlist:['late-box-office','Box office cards'],
  'market-day':['counter-till-cards','Counter cards'], 'contact-sheet':['card-black-paper','Gallery cards'],
  workbench:['card-steel','Workshop cards'], soundings:['card-timber-pier','Wharf cards'],
  hearth:['bench-cards-offcuts','Installer cards'], offprint:['card-concrete','Lesson cards'],
};

export function brandProfile(project,id,image){
  const caption=stationery[id][1], lead=esc(project.headline || project.name);
  return `<div class="identity-essay">${image?`<figure><img src="${image}" alt="${esc(caption)}"></figure>`:''}<div class="essay-text"><h2>${lead}</h2><p>${esc(project.profile)}</p>${image?`<small>${esc(caption)}</small>`:''}</div></div>`;
}

export function correspondence(project,mark) {
  const mail=project.message;
  const paragraphs=Array.isArray(mail.body)?mail.body:[mail.greeting,mail.body].filter(Boolean);
  const address=[mail.to,mail.time].filter(Boolean).map(value=>`<span>${esc(value)}</span>`).join('');
  return `<div class="correspondence"><div class="mail-intro"><small>Customer email</small><h2>${esc(mail.title || 'Correspondence')}</h2></div><article class="mail-paper"><header>${mark}</header><div class="address-line">${address}</div><div class="mail-body"><small>Subject</small><h3>${esc(mail.subject)}</h3>${paragraphs.map(line=>`<p>${esc(line)}</p>`).join('')}</div></article></div>`;
}

