// Ejecutar: node --test tests/staging-isolation.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const stage = read('staging.html');
const config = read('config.staging.js');
const prodConfig = read('config.js');
const guard = read('js/staging-guard.js');

test('staging.html carga primero la config y guard antes de Cloud/Auth', () => {
  const a = stage.indexOf('src="config.staging.js"');
  const b = stage.indexOf('src="js/staging-guard.js"');
  const c = stage.indexOf('src="js/cloud.js"');
  const d = stage.indexOf('src="js/auth.js"');
  assert.ok(a>=0 && a<b && b<c && c<d);
  assert.ok(!stage.includes('src="config.js"'));
});
test('staging no debe publicarse en buscadores y su entorno queda señalado', () => {
  assert.match(stage,/noindex,nofollow,noarchive/);
  assert.match(stage,/PRUEBAS · DATOS FICTICIOS/);
});
test('staging y producción apuntan a diferentes proyectos Supabase', () => {
  assert.match(config,/opfujvhgqrweyaaqquif\.supabase\.co/);
  assert.doesNotMatch(config,/dsewztxveqgwhyuyyyoq/);
  assert.match(prodConfig,/dsewztxveqgwhyuyyyoq\.supabase\.co/);
});
test('CSP permite cargar Turnstile sin habilitar scripts arbitrarios', () => {
  assert.match(stage,/script-src[^;]+https:\/\/challenges\.cloudflare\.com;/);
  assert.match(stage,/frame-src https:\/\/challenges\.cloudflare\.com;/);
  assert.doesNotMatch(stage,/script-src[^;]*unsafe-inline/);
});
test('guard bloquea accidentalmente configuración del servidor de producción', () => {
  const scope={window:{BQ_CONFIG:{STAGING:true,SUPABASE_URL:'https://dsewztxveqgwhyuyyyoq.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_test'}},document:{documentElement:{setAttribute(k,v){scope.blocked=k+':'+v;}}},console:{error(){}},blocked:''};
  vm.runInNewContext(guard,scope);
  assert.equal(scope.blocked,'data-staging-config-error:true');
  assert.equal(Object.keys(scope.window.BQ_CONFIG).length,0);
});
test('guard permite la configuración pública correcta de staging', () => {
  const scope={window:{BQ_CONFIG:{STAGING:true,SUPABASE_URL:'https://opfujvhgqrweyaaqquif.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_test'}},document:{documentElement:{setAttribute(){throw Error('Unexpected block');}}},console:{error(){throw Error('Unexpected block');}}};
  vm.runInNewContext(guard,scope);
  assert.equal(scope.window.BQ_CONFIG.STAGING,true);
});
