const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('Dirección Deportiva usa la página y el módulo oficiales', () => {
  const core=read('js/core.js'), boot=read('js/boot.js');
  assert.match(read('clubes.html'), /src="js\/clubs-official\.js\?/);
  assert.match(core,/name === "clubes"\) \{ openClubManagement\(\)/);
  assert.match(core,/window\.location\.assign\("clubes\.html"\)/);
  assert.match(core,/window\.location\.replace\("clubes\.html"\)/);
  assert.match(core,/ACT\.clubGo = \(\) => go\("clubes"\)/);
  assert.match(boot,/UI\.route\.name === "clubes".*openClubManagement\(\{ replace: true \}\)/);
});

test('las demos públicas no cargan Supabase ni exponen controles de edición',()=>{
  for(const mode of ['club','equipo']){
    const page=read(`demo-${mode}-vista.html`);
    assert.doesNotMatch(page,/<form|contenteditable|supabase|config\.js|demo-temporal\.js/i);
    assert.match(page,/href="index\.html"/);
  }
});
