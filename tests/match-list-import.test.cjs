const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const MatchListImport=require("../js/match-list-import.js");
const txt=[
"- **Jornada 1**","  - **Fecha:** Sábado, 14 de noviembre de 2026","  - **Rival:** Rayo Ficticio",
"- **Jornada 2**","  - **Fecha:** Domingo, 22 de noviembre de 2026","  - **Rival:** Atlético Imagina",
"- **Jornada 3**","  - **Fecha:** Sábado, 28 de noviembre de 2026","  - **Rival:** Deportivo Simulación",
"- **Jornada 4**","  - **Fecha:** Domingo, 6 de diciembre de 2026","  - **Rival:** Real Utopía",
"- **Jornada 5**","  - **Fecha:** Sábado, 12 de diciembre de 2026","  - **Rival:** F.C. Quimera",
"- **Jornada 6**","  - **Fecha:** Domingo, 20 de diciembre de 2026","  - **Rival:** Balompié Ilusión",
"- **Jornada 7**","  - **Fecha:** Sábado, 26 de diciembre de 2026","  - **Rival:** Sporting Espejismo",
"- **Jornada 8**","  - **Fecha:** Domingo, 3 de enero de 2027","  - **Rival:** Racing Fantasía",
"- **Jornada 9**","  - **Fecha:** Sábado, 9 de enero de 2027","  - **Rival:** Inter Espectro",
"- **Jornada 10**","  - **Fecha:** Domingo, 17 de enero de 2027","  - **Rival:** Unión Delirio"
].join("\n");
test("Interpreta diez jornadas completas del ejemplo del usuario",()=>{
 const {matches,errors}=MatchListImport.parse(txt);
 assert.deepEqual(errors,[]);
 assert.equal(matches.length,10);
 assert.deepEqual(matches[0],{n:1,date:"2026-11-14",rival:"Rayo Ficticio",home:null,rest:false});
 assert.deepEqual(matches[9],{n:10,date:"2027-01-17",rival:"Unión Delirio",home:null,rest:false});
 assert.equal(matches[3].date,"2026-12-06");
});
test("No inventa localía si no aparece; respeta L, V y descanso",()=>{
 const s=["- Jornada 4","- Fecha: Miércoles, 24 de febrero de 2027","- Rival: CF Amistad","- Condición: Visitante",
 "- Jornada 5","- Fecha: 03/03/2027","- Rival: DESCANSA",
 "10/03/2027; CF Unión; L"].join("\n");
 const {matches,errors}=MatchListImport.parse(s);
 assert.deepEqual(errors,[]);
 assert.deepEqual(matches.map(m=>m.home),[false,null,true]);
 assert.deepEqual(matches.map(m=>m.rest),[false,true,false]);
});
test("Reconoce fechas españolas y rechaza días imposibles",()=>{
 assert.equal(MatchListImport.parseDate("Sábado, 14 de noviembre de 2026"),"2026-11-14");
 assert.equal(MatchListImport.parseDate("6 de diciembre de 2026"),"2026-12-06");
 assert.equal(MatchListImport.parseDate("10/01/27"),"2027-01-10");
 assert.equal(MatchListImport.parseDate("2026-02-30"),null);
 assert.equal(MatchListImport.parseDate("31 de febrero de 2026"),null);
});
test("Las fechas y los rivales incompletos no se importan silenciosamente",()=>{
 const a=MatchListImport.parse("- Jornada 1\n- Fecha: 31 de febrero de 2026\n- Rival: X");
 assert.ok(a.errors.length);
 const b=MatchListImport.parse("- Jornada 1\n- Fecha: 14 de noviembre de 2026");
 assert.ok(b.errors.some(x=>x.includes("falta el rival")));
});
test("El asistente reconoce bloques Markdown y permite rectificar la localía",()=>{
 const v=fs.readFileSync(path.join(__dirname,"../js/views3.js"),"utf8");
 assert.match(v,/MatchListImport\.parse\(UI\.wizPasteM/);
 assert.match(v,/ACT\.wApplyPasteM/);
 assert.match(v,/m\.home == null \? "selected"/);
 assert.match(v,/m\.n \|\| i \+ 1/);
 for (const page of ["index.html","staging.html"]){
   const html=fs.readFileSync(path.join(__dirname,"..",page),"utf8");
   assert.match(html,/src="js\/match-list-import\.js"/);
   assert.ok(html.indexOf("match-list-import.js")<html.indexOf("views3.js"));
 }
});
