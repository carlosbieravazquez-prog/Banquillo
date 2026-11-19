const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('la ficha de partido presenta Excel, PDF e impresión diferenciados',()=>{
  const source=read('js/views1.js');
  assert.match(source,/btn\("Descargar Excel", "downloadActaXlsx"/);
  assert.match(source,/data-act="jumpActaExcel"/);
  assert.match(source,/data-act="printActa"/);
  assert.match(source,/btn\("Descargar PDF", "downloadActaPdf"/);
  assert.match(source,/id="acta-excel"/);
});
test('la subida Excel conserva formato validado y evita importaciones ajenas',()=>{
  const source=read('js/acta-excel.js');
  assert.match(source,/BANQUILLO_ACTA_V1/);
  assert.match(source,/String\(Store\.sid\)/);
  assert.match(source,/Number\(value\(ws,2,4\)\) !== Number\(m\.n\)/);
  assert.match(source,/file\.size > 5\*1024\*1024/);
  assert.match(source,/!ids\.has\(id\) \|\| seen\.has\(id\)/);
  assert.match(source,/¿Aplicar el Excel\?/);
});
test('lectores pueden descargar, no aplicar importaciones',()=>{
  const core=read('js/core.js');
  const readSet=core.match(/const READ_OK = new Set\(\[([^\]]+)\]\)/)?.[1]||'';
  assert.match(readSet,/"downloadActaXlsx"/);
  assert.match(readSet,/"downloadActaPdf"/);
  assert.match(readSet,/"printActa"/);
  assert.doesNotMatch(readSet,/"applyActaXlsx"/);
  assert.doesNotMatch(readSet,/"importActaXlsx"/);
});
