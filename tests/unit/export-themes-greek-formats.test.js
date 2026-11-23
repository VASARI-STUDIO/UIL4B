import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleProject } from '../../scripts/greek-exports/samples.mjs';
import { renderTemplate } from '../../scripts/greek-exports/document.mjs';
import { themes } from '../../scripts/greek-exports/themes.mjs';

for (const id of Object.keys(themes)) {
  test(id+' keeps sparse projects usable in both formats',()=>{
    for(const colours of [['#0A7562','#033C31','#4A9FBC','#D9E6E1'],['#818181','#888888','#909090'],['#737373']]){
      const project=sampleProject(id);
      project.design.palette={base:colours[0],colors:colours};
      delete project.design.logo;
      project.icons=[];
      const brand=renderTemplate(project,id,'brand','a4');
      const ui=renderTemplate(project,id,'ui','deck');
      assert.match(brand.html,/Your logo goes here/);
      assert.match(brand.html,/One sentence, 12 to 20 words/);
      assert.match(ui.html,/Icon selection/);
      for (const c of colours) assert.ok(brand.html.includes(c));
      assert.deepEqual(Object.keys(ui.files).sort(),['components.css','fonts.css','tailwind.css','tokens.css','tokens.json']);
      assert.doesNotThrow(()=>JSON.parse(ui.files['tokens.json']));
      assert.equal(brand.pages,6);
      assert.equal(ui.pages,7);
    }
  });
}
test('entered mission and voice survive export as text',()=>{
  const project={...sampleProject('aphrodite'), mission:'Publish <local> authors',voice:'Friendly and direct'};
  const {html}=renderTemplate(project,'aphrodite','brand','deck');
  assert.ok(html.includes('Publish &lt;local&gt; authors'));
  assert.ok(html.includes(project.voice));
  assert.ok(!html.includes('One sentence, 12 to 20 words'));
});
