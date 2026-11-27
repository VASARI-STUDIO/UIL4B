// Copy the project has not written yet. A placeholder says what to write, how long it should be and shows a labelled example,
// the same three parts the engine's guide prompts use. It prints in the page, so nothing here is ever mistaken for the project's own words.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export class Ph {
  constructor(what, length, example) { this.what = what; this.length = length; this.example = example; }
  toString() { return `${this.what} (${this.length}). Example: ${this.example}`; }
  html() { return `<span class="ph"><span class="ph-what">${escape(this.what)}</span> <span class="ph-length">${escape(this.length)}.</span> <span class="ph-example">Example: ${escape(this.example)}</span></span>`; }
}
export const escapeText = escape;
export const isPh = value => value instanceof Ph;
// The project's own words, or undefined where the field is a placeholder: for places that would rather show the project name than a prompt.
export const real = value => isPh(value) ? undefined : value;

export const PH = {
  headline: new Ph('Write the brand’s main line, as you would put it on a sign','3 to 8 words','Made slowly, for people who notice'),
  applicationLine: new Ph('Write one line as it would read on a product, sign or label','6 to 12 words','Ask us how it was made'),
  application: new Ph('Describe where this artwork is used','1 sentence, about 20 words','Printed on the counter card and the shopfront window.'),
  profile: new Ph('Write who the brand is, who it serves and what it does','1 to 2 sentences, about 30 words','We make simple tools for neighbourhood businesses, so owners spend less time on admin and more time with customers.'),
  subject: new Ph('Write the email subject line','4 to 8 words','Your order is on its way'),
  body: new Ph('Write the email as your customer would read it','2 short paragraphs, about 60 words','Thanks for your order. We will pack it today and send tracking details once it ships.'),
  itemTitle: new Ph('Write the item name','2 to 4 words','Weekend workshop'),
  itemDetail: new Ph('Write one short detail, such as when or where','4 to 8 words','Saturday morning, main studio'),
  itemPrice: new Ph('Write the price with its currency','up to 8 characters','12.50 AUD'),
  screenTitle: new Ph('Write the name of the screen shown in the interface','2 to 4 words','Your bookings'),
  screenDetail: new Ph('Write one line of supporting text for that screen','6 to 12 words','See what is coming up and change a booking'),
  action: new Ph('Write the main button label','1 to 3 words','Book now'),
  formLabel: new Ph('Write the form field label','1 to 3 words','Email address'),
  logoNote: new Ph('Explain the idea behind the logo','1 sentence, about 20 words','A folded corner that points the way forward.'),
  imageryNote: new Ph('Describe the photography style','1 to 2 sentences, about 25 words','Natural light, close crops and real work in progress.'),
  colourUse: new Ph('Write where this colour is used','1 short sentence, about 10 words','Buttons, links and highlights'),
};

const written = value => typeof value === 'string' && value.trim() !== '';
// Returns the project with a placeholder in every field the templates print and the project left empty. Authored fields are untouched.
export function fillProject(project) {
  const out = {...project};
  for (const key of ['headline','applicationLine','application','profile','screenTitle','screenDetail','action','formLabel','logoNote','imageryNote']) {
    if (!written(out[key])) out[key] = PH[key];
  }
  const fillItem = (item = {}) => ({...item, title: written(item.title) ? item.title : PH.itemTitle, detail: written(item.detail) ? item.detail : PH.itemDetail, price: written(item.price) ? item.price : PH.itemPrice});
  out.items = Array.isArray(project.items) && project.items.length ? project.items.map(fillItem) : [fillItem(), fillItem(), fillItem()];
  const mail = project.message || {};
  const body = Array.isArray(mail.body) ? mail.body.filter(written) : [mail.greeting, mail.body].filter(written);
  out.message = {...mail, subject: written(mail.subject) ? mail.subject : PH.subject, body: body.length ? body : [PH.body]};
  return out;
}
