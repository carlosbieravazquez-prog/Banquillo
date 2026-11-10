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
  assert.equal((auth.match(/captchaForSubmit\(\)/g)||[]).length,3);
  assert.match(auth,/signInWithPassword\([^\n]+captchaToken/);
  assert.match(auth,/signUp\([^\n]+captchaToken/);
  assert.match(auth,/resetPasswordForEmail\([^\n]+captchaToken/);
  assert.match(auth,/captchaToken === ""/);
});
