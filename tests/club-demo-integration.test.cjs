const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('módulo de club aislado carga planificador y escudos sin Supabase',()=>{
  const page=read('demo-club.html');
  assert.match(page,/src="js\/club-planner\.js"/);
  assert.match(page,/src="js\/club-crest\.js"/);
  assert.match(page,/src="js\/demo-club\.js"/);
  const js=read('js/demo-club.js');
  assert.match(js,/Prototipo local aislado/);
  assert.doesNotMatch(js,/supabase\.createClient|service_role|sb_secret_/i);
});
test('demo valida campos y horario al asignar y publicar',()=>{
  const s=read('js/demo-club.js');
  assert.match(s,/ClubPlanner\.resourceList\(state\.facilities,modality\)/);
  assert.match(s,/ClubPlanner\.conflicts\(candidate,state\.schedule,ignoreId\)/);
  assert.match(s,/ClubPlanner\.validate\(candidate,state\.schedule,state\.facilities,ignoreId\)/);
  assert.match(s,/const problem=validate\(m,id\)/);
  assert.match(s,/const problem=validate\(candidate,assignmentId\)/);
});
test('directores comparten permisos pero preferencias individuales',()=>{
  const s=read('js/demo-club.js');
  assert.match(s,/state\.directors\.length<2/);
  assert.match(s,/switch-director/);
  assert.match(s,/data-preferred/);
  assert.match(s,/Mismos permisos/i);
});
test('permite copiar mensajes semanales o mensuales sin envío automático',()=>{
  const s=read('js/demo-club.js');
  assert.match(s,/function weekMessage\(\)/);
  assert.match(s,/function monthMessage\(\)/);
  assert.match(s,/copy-week/);
  assert.match(s,/copy-month/);
  assert.match(s,/navigator\.clipboard\.writeText/);
  assert.match(s,/lines\.join\("\\n"\)/);
});
test('escudo opcional del club permanece local y enlace Canva indica servicio externo',()=>{
  const s=read('js/demo-club.js');
  assert.match(s,/clubCrestUpload/);
  assert.match(s,/ClubCrest\.upload/);
  assert.match(s,/remove-club-crest/);
  assert.match(s,/https:\/\/www\.canva\.com\/es_es\/funciones\/quitar-fondo-imagen\//);
});
