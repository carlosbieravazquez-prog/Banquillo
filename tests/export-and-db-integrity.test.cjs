const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('los Excel de la temporada insertan el escudo opcional en cabeceras sin enlaces externos',()=>{
 const src=read('js/export.js');
 assert.match(src,/const crestData = ClubCrest\.current\(s\)/);
 assert.match(src,/wb\.addImage\(\{ base64: crestData\.split\(","\)\[1\], extension: "png" \}\)/);
 assert.match(src,/sheet\.addImage\(crestImageId/);
 assert.match(src,/if \(crestImageId !== null\)/);
 assert.match(src,/titleWithCrest\(ws, "RESUMEN DE LA TEMPORADA/);
 assert.match(src,/titleWithCrest\(ws, "PLANTILLA/);
 assert.match(src,/titleWithCrest\(ws, "CALENDARIO Y PARTIDOS DE LIGA/);
});

test('el registro de intentos queda protegido por RLS',()=>{
 const schema=read('supabase/schema.sql');
 assert.match(schema,/create index if not exists join_attempts_idx on public\.join_attempts/);
 assert.match(schema,/alter table public\.join_attempts enable row level security/);
});
