const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ClubCrest=require('../js/club-crest.js');

test('solo se aceptan escudos PNG de datos compactos',()=>{
  const valid='data:image/png;base64,aGVsbG8=';
  assert.equal(ClubCrest.clean(valid),valid);
  for(const image of ['javascript:alert(1)','https://dominio-externo/imagen.png','data:image/svg+xml;base64,PHN2Zz4=', 'data:image/jpeg;base64,aGVsbG8=','data:image/png;base64,'+'a'.repeat(80000)])assert.equal(ClubCrest.clean(image),'');
});
test('escudos de temporada se muestran opcionalmente sin enlaces remotos',()=>{
  const data='data:image/png;base64,aGVsbG8=';
  assert.equal(ClubCrest.current({settings:{crest:data}}),data);
  assert.equal(ClubCrest.current({settings:{}}),'');
  assert.match(ClubCrest.preview(data),/<img /);
  assert.equal(ClubCrest.preview(''),'');
});
test('se integra en configuración inicial y ajustes con quitafondos opcional',()=>{
  const view=read('js/views3.js');
  assert.match(view,/CHG\.setCrest/);
  assert.match(view,/CHG\.wCrest/);
  assert.match(view,/ACT\.removeCrest/);
  assert.match(view,/ACT\.wRemoveCrest/);
  assert.match(view,/crest: ClubCrest\.clean\(d\.crest\)/);
  assert.match(view,/crest: ClubCrest\.clean\(w\.crest\)/);
  assert.match(view,/https:\/\/www\.canva\.com\/es_es\/funciones\/quitar-fondo-imagen\//);
  assert.match(view,/No es obligatorio utilizar Canva/);
});
test('informe individual destaca dorsal y muestra escudo sin impedir PDF sin imagen',()=>{
  const src=read('js/export.js');
  assert.match(src,/ClubCrest\.addToPdf\(doc, season/);
  assert.match(src,/font\("bold", 30, \[255, 255, 255\]\)/);
  assert.match(src,/baseline: "middle"/);
});
test('escudo se integra en la web y actas PDF e impresión',()=>{
  assert.match(read('js/core.js'),/ClubCrest\.preview\(ClubCrest\.current\(s\)\)/);
  const view=read('js/views1.js');
  assert.match(view,/ClubCrest\.addToPdf\(doc, season/);
  assert.match(view,/ClubCrest\.current\(season\)/);
  for(const page of ['index.html','staging.html'])assert.match(read(page),/src="js\/club-crest\.js"/);
});
test('imagen no altera documentos con escudo ausente',()=>{
  let count=0;
  const doc={addImage(){count++}};
  assert.equal(ClubCrest.addToPdf(doc,{settings:{}},1,1,10,10),false);
  assert.equal(count,0);
});
