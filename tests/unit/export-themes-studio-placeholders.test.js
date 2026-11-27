// A project with only a name, a palette, two fonts and a type scale exports placeholders, never the sample project's words.
// Checks: for every edition, a minimal project has no sample string, no price, no sample brand name and no plain "UI L4B" box; it carries
// placeholders with what, length and an example; it builds the same pages as the full sample; and it keeps the profile and email pages.
// Break: put a fallback string back in document.mjs or specimens.mjs (say 'Save changes'), or drop a page when the profile is missing.
// Test seam: renderTemplate in scripts/studio-exports/document.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleProject, minimalProject } from '../../scripts/studio-exports/samples.mjs';
import { renderTemplate, esc } from '../../scripts/studio-exports/document.mjs';
import { themes } from '../../scripts/studio-exports/themes.mjs';
import { PH, Ph } from '../../scripts/studio-exports/placeholders.mjs';

const ids = Object.keys(themes);
const strings = value => typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];
const sampleNames = ids.map(id => sampleProject(id).name);

for (const id of ids) {
  test(id + ' prints placeholders, not sample copy, for a minimal project', () => {
    const full = sampleProject(id);
    const authored = Object.fromEntries(Object.entries(full).filter(([key]) => key !== 'design' && key !== 'icons')); // icon names come from the shared library
    const own = strings(authored).filter(s => s.length >= 6 && !s.startsWith('data:') && s !== authored.date);
    for (const [product, layout] of [['brand','a4'],['ui','deck']]) {
      const sample = renderTemplate(full, id, product, layout);
      const minimal = renderTemplate(minimalProject(id), id, product, layout);
      const text = minimal.html.replace(/<style>[\s\S]*?<\/style>/, '');
      for (const s of own) assert.ok(!text.includes(s) && !text.includes(esc(s)), `${id} ${product} leaks "${s}"`);
      for (const n of sampleNames) assert.ok(!text.includes(esc(n)), `${id} ${product} leaks the sample name "${n}"`);
      assert.doesNotMatch(text, /\$\s?\d/, `${id} ${product} has a price`);
      assert.doesNotMatch(text, /\b\d+ ?mm\b/, `${id} ${product} has an invented size`);
      assert.doesNotMatch(text, /UI L4B<\/b>|Your logo goes here/);
      assert.match(text, /class="logo-slot"[^>]*aria-label="Logo placeholder"/);
      assert.match(text, /class="ph-what"/);
      assert.match(text, /class="ph-length"/);
      assert.match(text, /Example: /);
      assert.equal(minimal.pages, sample.pages, `${id} ${product} page count`);
      assert.equal(minimal.pages, 11, `${id} ${product} page count`);
      assert.match(minimal.html, product === 'brand' ? /<section class="sheet profile"/ : /<section class="sheet correspondence-sheet"/);
    }
  });
}

test('every placeholder has what to write, a length and a labelled example, in plain Australian English', () => {
  for (const [key, ph] of Object.entries(PH)) {
    assert.ok(ph instanceof Ph, key);
    for (const part of [ph.what, ph.length, ph.example]) assert.ok(part.trim().length > 3, key);
    assert.match(ph.length, /\d/, key + ' gives a length');
    assert.doesNotMatch(String(ph), /[\u2013\u2014]/, key + ' has a dash');
  }
});

test('authored fields are never replaced by a placeholder', () => {
  const project = { ...sampleProject('flyleaf'), headline: 'Plain words', items: [{ title: 'One', detail: 'Two', price: '' }] };
  const { html } = renderTemplate(project, 'flyleaf', 'brand', 'a4');
  assert.ok(html.includes('Plain words'));
  assert.ok(!html.includes(esc(PH.headline.what)));
  assert.ok(html.includes(esc(PH.itemPrice.what)), 'an item with no price asks for one');
});
