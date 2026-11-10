// Tests de seguridad para la configuración publicada de Banquillo.
// Ejecutar con node --test tests/security-config.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('staging utiliza un proyecto Supabase distinto al oficial', () => {
  const beta = read('config.staging.js'), official = read('config.js');
  const project = text => text.match(/SUPABASE_URL:\s*"https:\/\/([a-z0-9]+)\.supabase\.co"/)?.[1];
  assert.equal(project(beta), 'opfujvhgqrweyaaqquif');
  assert.equal(project(official), 'dsewztxveqgwhyuyyyoq');
  assert.notEqual(project(beta), project(official));
});

test('configuraciones públicas no contienen claves de servicio ni secretos', () => {
  for (const file of ['config.js', 'config.staging.js']) {
    const src = read(file);
    assert.doesNotMatch(src, /(?:SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|TURNSTILE_SECRET_KEY)\s*:/i, file);
    assert.doesNotMatch(src, /sb_secret_[a-zA-Z0-9_-]{8,}/, file);
    assert.doesNotMatch(src, /SUPABASE_ANON_KEY:\s*"eyJ/, 'Usar publishable key moderna');
  }
});

test('staging no inicia CAPTCHA por accidente', () => {
  assert.match(read('config.staging.js'), /TURNSTILE_SITE_KEY:\s*""/);
  assert.match(read('config.js'), /TURNSTILE_SITE_KEY:\s*""/);
});

test('la Beta nunca apunta al proyecto oficial desde la página de staging', () => {
  const page = read('staging.html');
  assert.match(page, /src="config\.staging\.js"/);
  assert.doesNotMatch(page, /src="config\.js"/);
  assert.match(page, /src="js\/staging-guard\.js"/);
  assert.match(page, /noindex,nofollow,noarchive/);
});
