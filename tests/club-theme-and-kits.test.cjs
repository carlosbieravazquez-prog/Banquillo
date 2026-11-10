const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ClubTheme=require("../js/club-theme.js");
const ClubKitsEditor=require("../js/kit-editor.js");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");

test("Una camiseta verde fluorescente genera verdes profesionales, no fondos chillones",()=>{
  const original="#00FF00",kits={first:{shirt:original,shorts:"#000000",socks:"#FFFFFF"}};
  const v=ClubTheme.derive(kits,{mode:"auto"});
  assert.match(v.light["--brand"],/^hsl\(120, 28%, 25%\)$/);
  assert.match(v.light["--accent"],/^hsl\(120, 36%, 31%\)$/);
  assert.equal(v.light["--accent-ink"],"#FFFFFF");
  assert.notEqual(v.light["--brand"],original);
  assert.notEqual(v.light["--accent"],original);
  assert.equal(ClubTheme.normalizeKits(kits).first.shirt,original);
});
test("Los colores personalizados también se convierten en paletas sobrias y coherentes",()=>{
  const v=ClubTheme.derive(null,{mode:"custom",customPrimary:"#FFFF00",customAccent:"#FF00FF"});
  assert.equal(v.light["--brand"],"hsl(60, 28%, 25%)");
  assert.equal(v.dark["--brand"],"hsl(60, 24%, 19%)");
  assert.equal(v.dark["--accent-ink"],"#081C2A");
  assert.equal(ClubTheme.validHex("#FF00FF"),true);
  assert.equal(ClubTheme.validHex("javascript:alert(1)"),false);
});
test("Paletas profesionales, tercera equipación y normalización segura",()=>{
  assert.ok(Object.keys(ClubTheme.presets).length>=8);
  const normalized=ClubTheme.normalizeKits({first:{shirt:"#123456"},third:{shirt:"#AABBCC"}});
  assert.equal(normalized.first.shirt,"#123456");
  assert.equal(normalized.third.shirt,"#AABBCC");
  assert.equal(normalized.second.shirt,"#FFFFFF");
  assert.deepEqual(Object.keys(ClubTheme.cleanPalette({mode:"peligroso"})),["mode","preset","customPrimary","customAccent"]);
  assert.equal(ClubTheme.cleanPalette({mode:"peligroso"}).mode,"auto");
});
test("El editor muestra equipaciones visibles y todos los modos de personalización",()=>{
  const data={club:"Club Ficticio",kits:ClubTheme.normalizeKits(),palette:{mode:"auto"}};
  const html=ClubKitsEditor.render(data,"w");
  assert.match(html,/Equipaciones del club/);
  assert.match(html,/1ª equipación/);
  assert.match(html,/2ª equipación/);
  assert.match(html,/Añadir tercera equipación/);
  assert.match(html,/data-chg="wKit"/);
  assert.match(html,/data-act="wPaletteChoice"/);
  assert.match(html,/data-mode="auto"/);
  assert.match(html,/data-mode="preset"/);
  assert.doesNotMatch(html,/data-mode="custom"/);
  assert.match(html,/class="kit-mockup"/);
  assert.match(html,/hsl\(\d+, 28%, 25%\)/);
  assert.doesNotMatch(html,/<details/);
  const third=ClubKitsEditor.render({club:"Ficticio",kits:{...data.kits,third:{shirt:"#FFFFFF",shorts:"#000000",socks:"#FFFFFF"}},palette:{mode:"preset",preset:"bosque"}},"set");
  assert.match(third,/3ª equipación/);
  assert.match(third,/data-chg="setPalettePreset"/);
  const manual=ClubKitsEditor.render({...data,palette:{mode:"custom"}}, "w");
  assert.match(manual,/colores personalizados guardados/i);
});
test("UI conecta paletas, PDF de dorsal central y hojas de temporada",()=>{
  const v=read("js/views3.js"),core=read("js/core.js"),pdf=read("js/export.js");
  assert.match(v,/ClubKitsEditor\.renderKits\(w,"w"\)/);
  assert.match(v,/ClubKitsEditor\.renderPalette\(w,"w"\)/);
  assert.match(v,/const WSTEPS = \["Datos", "Equipaciones", "Identidad visual", "Plantilla", "Jornadas", "Crear"\]/);
  assert.match(v,/ClubKitsEditor\.renderKits\(d,"set"\)/);
  assert.match(v,/ClubKitsEditor\.renderPalette\(d,"set"\)/);
  assert.match(v,/palette: ClubTheme\.cleanPalette\(w\.palette\)/);
  assert.match(v,/palette: ClubTheme\.cleanPalette\(d\.palette\)/);
  assert.match(core,/ClubTheme\.apply\(Store\.season\(\)\)/);
  assert.match(pdf,/font\("bold", 30, \[255, 255, 255\]\)/);
  assert.match(pdf,/baseline: "middle"/);
  for(const page of ["index.html","staging.html"]){
    const html=read(page);
    for(const file of ["js/club-theme.js","js/kit-mockup.js","js/kit-editor.js","css/kit-editor.css"])
      assert.ok(html.includes(file),page+" missing "+file);
    assert.ok(html.indexOf("js/club-theme.js")<html.indexOf("js/kit-editor.js"));
  }
});
