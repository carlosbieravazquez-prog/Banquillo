const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../js/convocatoria-message.js');
const players=[{id:'a',name:'Jugador Alfa',dorsal:9,active:true},{id:'b',name:'Jugador Beta',dorsal:2,active:true},{id:'c',name:'Jugador Gamma',dorsal:4,active:false}];
const season={club:'Club Ficticio',name:'2026/27',settings:{kits:{first:{},second:{}}}};
const match={n:4,date:'2026-11-14',time:'11:00',rival:'Rival Ejemplo',home:true,noCall:[{p:'b',m:'DT'}]};

test('convocados y ausentes se generan sin mezclar destinatarios',()=>{
 const called=M.build(season,match,players,{mode:'called',kit:'first'});
 assert.match(called,/JORNADA 4/);
 assert.match(called,/🏠 Jugamos en casa/);
 assert.match(called,/👕 Equipación: Primera/);
 assert.match(called,/Jugador Alfa/);
 assert.doesNotMatch(called,/Jugador Beta/);
 assert.doesNotMatch(called,/Jugador Gamma/);
 const absent=M.build(season,match,players,{mode:'absent',kit:'second'});
 assert.match(absent,/Jugador Beta — Decisión técnica/);
 assert.match(absent,/Segunda/);
 assert.doesNotMatch(absent,/Jugador Alfa/);
});
test('distingue ausencias por motivos y local/visitante sin publicar detalles médicos',()=>{
 const away={...match,home:false,noCall:[{p:'a',m:'LS'},{p:'b',m:'MP'}]};
 const text=M.build(season,away,players,{mode:'absent'});
 assert.match(text,/✈️ Jugamos fuera/);
 assert.match(text,/Lesión/);
 assert.match(text,/Motivos personales/);
 assert.doesNotMatch(text,/diagnóstico|dirección|teléfono/i);
});
test('nunca incorpora saltos de línea arbitrarios de nombres o clubes',()=>{
 const text=M.build({club:'Club\nSUJETO'}, {...match,rival:'Rival\nOCULTO'},[{id:'a',name:'Alfa\nBETA',active:true}],{});
 assert.match(text,/Club SUJETO/);
 assert.match(text,/Alfa BETA/);
 assert.doesNotMatch(text,/Club\nSUJETO/);
});
test('la jornada de descanso no permite generar convocatoria',()=>{
 assert.equal(M.build(season,{...match,rest:true},players,{}),'');
});
test('selector de vista y permisos ofrecen solo copiado explícito',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 assert.match(read('js/views1.js'),/openConvocationMessage/);
 assert.match(read('js/views1.js'),/copyConvocationMessage/);
 assert.match(read('js/core.js'),/"openConvocationMessage"/);
 assert.match(read('js/core.js'),/"copyConvocationMessage"/);
 for(const page of ['index.html','staging.html'])assert.match(read(page),/src="js\/convocatoria-message\.js"/);
});
