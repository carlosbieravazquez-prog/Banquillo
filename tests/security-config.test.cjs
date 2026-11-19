const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const read = p=>fs.readFileSync(path.join(root,p),'utf8');

test('la configuración publicada contiene solo una clave pública',()=>{
  const src=read('config.js');
  assert.match(src,/SUPABASE_ANON_KEY:\s*"sb_publishable_/);
  assert.doesNotMatch(src,/(?:SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|TURNSTILE_SECRET_KEY)\s*:/i);
  assert.doesNotMatch(src,/sb_secret_[a-zA-Z0-9_-]{8,}/);
});

test('las entradas oficiales y sus módulos carecen de dependencias de Staging',()=>{
  const files=['index.html','clubes.html','config.js', ...fs.readdirSync(path.join(root,'js')).map(f=>'js/'+f)];
  for(const file of files)assert.doesNotMatch(read(file),/config\.staging\.js|staging-guard\.js|js\/clubs\.js|opfujvhgqrweyaaqquif|Cloud\.cfg\.STAGING/,file);
  for(const file of ['staging.html','config.staging.js','js/clubs.js'])assert.ok(!fs.existsSync(path.join(root,file)),file);
});
