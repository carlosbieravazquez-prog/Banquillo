const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('una baja anterior no descuenta jornadas de una sanción posterior',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','js','views1.js'),'utf8');
  const suspended=[{p:'p1',m:'SA'}];
  const matches=[
    {n:3,closed:true,noCall:suspended},
    {n:1,closed:true,noCall:suspended},
    {n:2,closed:true,sanctions:[{p:'p1',matches:2}]},
    {n:4,closed:true,rest:true,noCall:suspended}
  ];
  const ctx={V:{sheet:{}},ACT:{},CHG:{},INP:{},Store:{matches},Calc:{matchInfo:()=>({played:true})}};
  vm.runInNewContext(source+'\nthis.result=pendingSanctions({n:5});',ctx);
  assert.equal(JSON.stringify(ctx.result),JSON.stringify([{p:'p1',remaining:1}]));
});
