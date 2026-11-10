const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname,"..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const FilePicker = require("../js/file-picker.js");

test("Selector reusable preserva input nativo y manejadores de los archivos", () => {
 const html = FilePicker.render({title:"Escudo del equipo",formats:"PNG",help:"Hasta 3 MB",icon:"🛡️",accept:"image/png,image/jpeg,image/webp",change:"wCrest"});
 assert.match(html,/type="file"/);
 assert.match(html,/data-chg="wCrest"/);
 assert.match(html,/accept="image\/png,image\/jpeg,image\/webp"/);
 assert.match(html,/file-picker-drop/);
 assert.match(html,/file-picker-name/);
 assert.match(html,/Ningún archivo seleccionado/);
 assert.match(html,/Hasta 3 MB/);
});
test("Escapa texto y atributos para no insertar HTML ni scripts", () => {
 const html = FilePicker.render({title:'<img src=x onerror=alert(1)>',accept:'" onmouseover="alert(1)',change:"x",help:"<script>bad</script>"});
 assert.doesNotMatch(html,/<script>|<img/);
 assert.match(html,/&lt;script&gt;bad&lt;\/script&gt;/);
 assert.match(html,/&quot; onmouseover=&quot;/);
});
test("La subida soporta ratón, teclado y arrastre sin tocar validaciones de tamaño", () => {
 const css = read("css/file-picker.css"), js=read("js/file-picker.js");
 assert.match(css,/:focus-within/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(js,/addEventListener\("drop"/);
 assert.match(js,/dispatchEvent\(new Event\("change",\{bubbles:true\}\)\)/);
 assert.match(js,/input\.disabled/);
 assert.match(read("js/club-crest.js"),/MAX_FILE = 3 \* 1024 \* 1024/);
 assert.match(read("js/acta-excel.js"),/file\.size > 5\*1024\*1024/);
});
test("La Beta y la demo cargan CSS y JS del selector antes de usarlo", () => {
 for(const file of ["index.html","staging.html","demo-club.html"]){
  const html=read(file);
  assert.match(html,/href="css\/file-picker\.css"/);
  assert.match(html,/src="js\/file-picker\.js"/);
  assert.ok(html.indexOf("js/file-picker.js")<html.indexOf(file==="demo-club.html"?"js/demo-club.js":"js/views3.js"));
 }
 assert.match(read("js/views3.js"),/FilePicker\.render\(\{title:"Escudo del equipo"/);
 assert.match(read("js/views1.js"),/FilePicker\.render\(\{title:"Importar acta Excel cumplimentada"/);
 assert.match(read("js/demo-club.js"),/FilePicker\.render\(\{title:"Escudo del club"/);
});
