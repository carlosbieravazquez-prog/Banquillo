// Contratos del árbol de archivos: no romper enlaces mientras se ordena el repositorio.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const file=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const exists=p=>fs.existsSync(path.join(ROOT,p));

test('la web y el entorno staging cargan solo los JS/CSS activos',()=>{
  for(const html of ['index.html','staging.html']){
    const s=file(html);
    assert.match(s,/<link rel="stylesheet" href="css\/app\.css">/);
    for(const p of ['js/auth.js','js/cloud.js','js/store.js','js/boot.js','js/auth-captcha.js'])assert.ok(s.includes('src="'+p+'"'),html+' '+p);
  }
  assert.match(file('demo-club.html'),/src="js\/demo-club\.js"/);
});

test('cada entrada local referenciada por las paginas principales existe',()=>{
  for(const html of ['index.html','staging.html','demo-club.html']){
    const s=file(html);
    const paths=[...s.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
    for(const ref of paths){
      if(ref.startsWith('#')||/^(https?:|data:|mailto:)/.test(ref))continue;
      const clean=ref.split('#')[0].split('?')[0];
      if(!clean)continue;
      assert.ok(exists(clean),html+' apunta a archivo inexistente '+clean);
    }
  }
});

test('las politicas legales usan hoja compartida, y rutas antiguas son compatibles',()=>{
  for(const p of ['legal/privacidad.html','legal/aviso-legal.html']){
    const s=file(p);
    assert.match(s,/href="legal\.css"/);
    assert.match(s,/id="contenido"/);
    assert.match(s,/class="skip"/);
    assert.match(s,/pendiente|pendientes/i,'No inventar identidad legal');
  }
  for(const [old,dest] of [['privacidad.html','legal/privacidad.html'],['aviso-legal.html','legal/aviso-legal.html']])assert.ok(file(old).includes(dest));
});

test('único código de app en js/css; versiones anteriores conservadas en archivo',()=>{
  for(const name of ['auth.js','cloud.js','store.js','calc.js','views1.js','views2.js','views3.js','core.js','util.js','export.js','boot.js']){
    assert.ok(!exists(name),'JS obsoleto sigue duplicado en raíz: '+name);
    assert.ok(exists('archive/legacy-root/'+name),'Falta copia archivada '+name);
    assert.ok(exists('js/'+name),'Falta código activo '+name);
  }
  assert.ok(!exists('app.css')&&exists('archive/legacy-root/app.css')&&exists('css/app.css'));
});

test('los scripts y datos identificables no forman parte del árbol activo',()=>{
  assert.ok(!exists('importar_temporada.sql'));
  assert.ok(exists('.gitignore'));
  assert.match(file('.gitignore'),/importar_temporada\*\.sql/);
  assert.ok(exists('supabase/schema.sql'));
});

test('la documentación tiene índice y carpetas por función',()=>{
  for(const p of ['README.md','docs/README.md','docs/getting-started/GUIA.md',
    'docs/security/AUDITORIA_SEGURIDAD_BETA.md','docs/security/ACTIVACION_TURNSTILE_BETA.md',
    'docs/security/PROTOCOLO_PRUEBAS_RLS_STAGING.md','docs/testing/EJECUCION_STAGING_PASO_A_PASO.md',
    'docs/operations/PLAN_RESPALDOS_RECUPERACION.md','docs/legal/REVISION_PRIVACIDAD_PRELANZAMIENTO.md',
    'docs/project/CIERRE_TRABAJO_AUTONOMO_BETA.md'])assert.ok(exists(p),p);
});
