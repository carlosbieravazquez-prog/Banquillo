// Ejecutar: node --test tests/auth-captcha.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const component = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth-captcha.js'), 'utf8');
const auth = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth.js'), 'utf8');
const config = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
function componentWith(key) {
  const context = vm.createContext({window: {BQ_CONFIG:{TURNSTILE_SITE_KEY:key}},document:{querySelector(){return null;}}});
  return vm.runInContext(component + '\nTurnstileGuard;',context);
}
test('desactivado por defecto y compatible con login existente',() => {
  assert.match(config,/TURNSTILE_SITE_KEY:\s*""/);
  const guard = componentWith('');
  assert.equal(guard.enabled(),false);
  assert.equal(guard.placeholder(),'');
  assert.equal(guard.token(),null);
});
test('con clave pública exige token y muestra hueco para desafío',() => {
  const guard = componentWith('clave-publica-de-prueba');
  assert.equal(guard.enabled(),true);
  assert.match(guard.placeholder(),/data-bq-turnstile/);
  assert.equal(guard.token(),''); // sin desafío completado
});
test('solo protege los tres formularios de autenticación que acepta Supabase',() => {
  assert.equal((auth.match(/TurnstileGuard\.placeholder\(\)/g)||[]).length,3);
  assert.equal((auth.match(/captchaForSubmit\(f,"(?:signup|login|forgot)"\)/g)||[]).length,3);
  assert.match(auth,/signInWithPassword\([\s\S]*?captchaToken/);
  assert.match(auth,/signUp\([\s\S]*?captchaToken/);
  assert.match(auth,/resetPasswordForEmail\([\s\S]*?captchaToken/);
  assert.match(auth,/captchaToken === ""/);
});


test('el widget se crea una vez y entrega token solo mientras sigue montado', () => {
  let renders = 0, removes = 0;
  const element = {isConnected: true, textContent: ''};
  const turnstile = {
    render(target, settings) { assert.equal(target, element); assert.equal(settings.sitekey, 'test-public-key'); renders++; return 1; },
    getResponse(id) { assert.equal(id, 1); return 'token-ficticio'; },
    remove() { removes++; }
  };
  const document = {querySelector() {return element;}};
  const context = vm.createContext({window:{BQ_CONFIG:{TURNSTILE_SITE_KEY:'test-public-key'},turnstile},document});
  const guard = vm.runInContext(component + '\nTurnstileGuard;', context);
  guard.mount(); guard.mount();
  assert.equal(renders, 1);
  assert.equal(guard.token(), 'token-ficticio');
  element.isConnected = false;
  assert.equal(guard.token(), '');
  element.isConnected = true;
  assert.equal(removes, 0);
});
test('tras un error al cargar el script se permite reintentarlo', () => {
  const scripts = [], target = {textContent:''};
  const head = {appendChild(node) {scripts.push(node);}};
  const document = {
    head,
    querySelector() {return target;},
    getElementById(id) {return scripts.find(s => s.id === id && !s.removed) || null;},
    createElement() {return {remove(){this.removed=true;}};}
  };
  const context = vm.createContext({window:{BQ_CONFIG:{TURNSTILE_SITE_KEY:'test-key'}},document});
  const guard = vm.runInContext(component + '\nTurnstileGuard;',context);
  guard.mount();
  assert.equal(scripts.length,1);
  scripts[0].onerror();
  assert.equal(scripts[0].removed,true);
  guard.mount();
  assert.equal(scripts.length,2);
});
