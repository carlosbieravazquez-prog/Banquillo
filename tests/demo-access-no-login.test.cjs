const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=pathName=>fs.readFileSync(path.join(__dirname,"..",pathName),"utf8");
test("La portada ofrece las dos demostraciones sin cuenta",()=>{
 const html=read("index.html");
 assert.match(html,/href="demo-club-vista\.html"/);
 assert.match(html,/href="demo-equipo-vista\.html"/);
 assert.match(html,/id="authSlot"/);
 assert.doesNotMatch(html,/href="demo-club\.html#equipos">Abrir gesti/);
});
test("La demo offline no pide credenciales y permite guardar la configuraci\u00f3n",()=>{
 const html=read("demo-club.html");
 const src=read("js/demo-club.js");
 assert.match(html,/id="exportDemo"/);
 assert.match(src,/format:"banquillo-club-demo"/);
 assert.match(src,/new Blob\(/);
 assert.match(src,/URL\.createObjectURL\(blob\)/);
 assert.match(src,/link\.download="banquillo-configuracion-club-demo\.json"/);
 assert.match(src,/localStorage\.setItem\(KEY/);
 assert.match(src,/location\.hash\.slice\(1\)/);
 assert.match(src,/function editorEquipo\(\)/);
 assert.doesNotMatch(src,/signInWithPassword|auth\.signUp|Cloud\.rpc\(|service_role/);
});
test("El lÃ­mite de correo se muestra una sola vez en Beta",()=>{
 const src=read("js/auth.js");
 assert.match(src,/if\(verdict && verdict\.seconds\)\s*\{/);
 assert.match(src,/updateFeedback\(f,kind,""\);/);
 assert.match(src,/setMsg\(output \? null : type/);
 const widget=read("js/auth-throttle.js");
 assert.match(widget,/L\u00edmite de correos de Supabase alcanzado/);
 assert.match(widget,/Retry-After/);
});
