import { isPh, escapeText } from './placeholders.mjs';

// Escapes project text. A placeholder (copy the project has not written) comes out as its own marked-up prompt.
export const esc = value => isPh(value) ? value.html() : escapeText(value);

function listing(item) {
  return `<div class="listing"><div><b>${esc(item.title)}</b><span>${esc(item.detail)}</span></div><strong>${esc(item.price)}</strong></div>`;
}

export function appSpecimen(project, mark, interactive=false) {
  const items=(project.items || []).slice(0,2);
  return `<div class="mock">${mark}<strong>${esc(project.screenTitle || project.name)}</strong><p>${esc(project.screenDetail || project.headline)}</p><div class="mock-list">${items.map(listing).join('')}</div>${interactive?'<a class="action" href="#try-feedback">'+esc(project.action)+'</a>':'<span class="action">'+esc(project.action)+'</span>'}</div>`;
}

export function applicationSpecimen(id, project, mark) {
  const items=project.items || [];
  const heading=esc(items[0]?.title || project.applicationLine || project.headline || project.name);
  const more=id==='market-day'?items.slice(1,2):[];
  const details=items[0]?`<div class="purchase-line"><span>${esc(items[0].detail)}</span><b>${esc(items[0].price)}</b></div>`:'';
  return `<figure class="stationery">${mark}<strong>${heading}</strong>${details}${more.map(listing).join('')}</figure><div class="note"><small>Artwork detail</small><p>${esc(project.application)}</p></div>`;
}

export function identityReference(project, design, mark) {
  const colours=design.palette.map((hex,i)=>`<li><i style="background:${hex}"></i><span>${esc(project.paletteNames?.[i] || hex)}</span><code>${hex}</code></li>`);
  return `<div class="identity-reference"><div class="reference-mark">${mark}</div><div class="reference-type"><small>Heading · ${design.headingWeight}</small><strong>${esc(design.heading)}</strong><small>Body · ${design.bodyWeight}</small><span>${esc(design.body)}</span></div><ul>${colours.join('')}</ul></div>`;
}

export function formExample(project) {
  const label=esc(project.formLabel);
  return `<form id="try-feedback" class="ui-demo feedback-form" novalidate><label>${label}<input name="entry" required autocomplete="off" aria-describedby="field-response"></label><button type="submit">${esc(project.action)}</button><output id="field-response" aria-live="polite"></output></form>`;
}
export const formScript = `for(const form of document.querySelectorAll('.feedback-form')){
  const field=form.elements.entry, response=form.querySelector('output');
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const valid=field.value.trim().length>0;
    field.setAttribute('aria-invalid',String(!valid));
    response.textContent=valid?'Example submitted.':'Enter a value to continue.';
    if(!valid)field.focus();
  });
  field.addEventListener('input',()=>{field.removeAttribute('aria-invalid');response.textContent='';});
}`;
