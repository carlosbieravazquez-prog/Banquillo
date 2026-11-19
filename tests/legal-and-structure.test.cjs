const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

test('las referencias locales de las páginas principales resuelven',()=>{
  for(const page of ['index.html','clubes.html','demo-club-vista.html','demo-equipo-vista.html']){
    const html=fs.readFileSync(path.join(root,page),'utf8');
    for(const [,ref] of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
      if(ref.startsWith('#')||/^(https?:|data:|mailto:)/.test(ref))continue;
      const local=ref.split(/[?#]/)[0];
      assert.ok(fs.existsSync(path.join(root,local)),page+' → '+local);
    }
  }
});
