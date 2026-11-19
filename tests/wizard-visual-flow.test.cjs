const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const text=p=>fs.readFileSync(path.join(root,p),"utf8");
const Theme=require("../js/club-theme.js");
const Kits=require("../js/kit-editor.js");
const Mockup=require("../js/kit-mockup.js");

test("Silueta SVG limpia y sin fotografías, patrocinadores o logos",()=>{
 const svg=Mockup.render({shirt:"#00FF00",shorts:"#101010",socks:"#FFFFFF"});
 assert.match(svg,/class="kit-mockup"/);
 assert.match(svg,/fill="#00FF00"/);
 assert.match(svg,/fill="#101010"/);
 assert.match(svg,/fill="#FFFFFF"/);
 assert.match(svg,/role="img"/);
 assert.doesNotMatch(svg,/<(?:image|foreignObject|script)\b|(?:xlink:)?href=/);
 assert.ok((svg.match(/<path /g)||[]).length>=7);
});

test("SVG rechaza colores introducidos que no sean hexadecimales",()=>{
 const svg=Mockup.render({shirt:'"><script>alert(1)</script>',shorts:"red",socks:"#445566"});
 assert.doesNotMatch(svg,/<script>|alert\(1\)|fill="red"/);
 assert.match(svg,/fill="#17365D"/);
});
test("Paso Equipaciones y paso Identidad visual no se mezclan",()=>{
 const data={club:"Atlético Monteverde CF",kits:Theme.normalizeKits({first:{shirt:"#00FF00"}}),palette:{mode:"auto"}};
 const kits=Kits.renderKits(data,"w");
 const palette=Kits.renderPalette(data,"w");
 assert.match(kits,/kit-mockup/);
 assert.match(kits,/1ª equipación/);
 assert.match(kits,/2ª equipación/);
 assert.doesNotMatch(kits,/data-act="wPaletteChoice"/);
 assert.match(palette,/Identidad visual/);
 assert.match(palette,/data-act="wPaletteChoice"/);
 assert.match(palette,/data-mode="auto"/);
 assert.match(palette,/data-mode="preset"/);
 assert.doesNotMatch(palette,/data-mode="custom"/);
 assert.doesNotMatch(palette,/kit-mockup/);
 assert.doesNotMatch(palette,/type="color"/);
});
test("Los ocho estilos profesionales muestran selector propio y vista previa de app",()=>{
 const html=Kits.renderPalette({club:"Club Ficticio",palette:{mode:"preset",preset:"bosque"}},"w");
 assert.match(html,/data-chg="wPalettePreset"/);
 assert.match(html,/club-theme-preview-nav/);
 assert.match(html,/club-theme-preview-tile/);
 for(const p of Object.values(Theme.presets))assert.ok(html.includes(p.name));
});
test("El asistente conserva nombres, jornadas y resumen en las nuevas posiciones",()=>{
 const src=text("js/views3.js");
 assert.match(src,/const WSTEPS = \["Datos", "Equipaciones", "Identidad visual", "Plantilla", "Jornadas", "Crear"\]/);
 assert.match(src,/w\.step === 2[\s\S]{0,80}ClubKitsEditor\.renderKits\(w,"w"\)/);
 assert.match(src,/w\.step === 3[\s\S]{0,80}ClubKitsEditor\.renderPalette\(w,"w"\)/);
 assert.match(src,/w\.step === 4[\s\S]{0,160}Quita a quien se va/);
 assert.match(src,/w\.step === 5[\s\S]{0,150}Fecha, rival/);
 assert.match(src,/w\.step === 6 && w\.done/);
 assert.match(src,/w\.step < 6 \? btn\("Siguiente"/);
 assert.match(src,/w\.step === 4 && !w\.players\.some/);
 assert.match(src,/ACT\.wPaletteChoice/);
 assert.match(src,/ACT\.setPaletteChoice/);
 assert.match(src,/ACT\.settingsPage/);
});
test("Ajustes conserva las mismas tres secciones y guardado único",()=>{
 const src=text("js/views3.js");
 assert.match(src,/\[\["data","Datos"\],\["kits","Equipaciones"\],\["palette","Identidad visual"\]\]/);
 assert.match(src,/ClubKitsEditor\.renderKits\(d,"set"\)/);
 assert.match(src,/ClubKitsEditor\.renderPalette\(d,"set"\)/);
 assert.match(src,/Store\.save\("season", s\)/);
});
