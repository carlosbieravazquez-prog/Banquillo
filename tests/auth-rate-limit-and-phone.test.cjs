const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const throttleCode=fs.readFileSync(path.resolve(__dirname,"../js/auth-throttle.js"),"utf8");
const PhoneCountry=require("../js/phone-country.js");

function makeThrottle(sharedStorage=new Map()){
  const window={BQ_CONFIG:{SUPABASE_URL:"https://beta.example.test"}};
  const storage={
    getItem:k=>sharedStorage.get(k)||null,
    setItem:(k,v)=>sharedStorage.set(k,v)
  };
  let ticks=0;
  const sandbox=vm.createContext({
    window,localStorage:storage,Date,Math,JSON,console,
    document:{querySelectorAll:()=>[]},
    setInterval:()=>{ticks++;return {unref(){}};},clearInterval:()=>{}
  });
  vm.runInContext(throttleCode+"\nthis.throttle=AuthThrottle;",sandbox);
  return {api:sandbox.throttle,stored:sharedStorage,ticks:()=>ticks};
}
test("Supabase limitación de correos pone espera compartida para alta y recuperación",()=>{
  const t=makeThrottle();
  const verdict=t.api.observe({status:429,code:"over_email_send_rate_limit",message:"email rate limit exceeded"},"signup");
  assert.equal(verdict.kind,"email");
  assert.ok(t.api.remaining("signup")>=3598);
  assert.ok(t.api.remaining("forgot")>=3598);
  assert.equal(t.api.remaining("login"),0);
  assert.match(t.api.message("signup"),/2 correos por hora/);
  assert.match(t.api.message("signup"),/no es un bloqueo por bot/);
  assert.ok(t.stored.size>=1);
});
test("Si Supabase informa Retry-After, el contador usa ese plazo",()=>{
  const t=makeThrottle();
  const error={status:429,code:"over_request_rate_limit",context:{headers:{get:key=>key==="Retry-After"?"75":null}}};
  const result=t.api.observe(error,"login");
  assert.equal(result.kind,"requests");
  assert.ok(result.seconds>=74&&result.seconds<=75);
  assert.equal(t.api.remaining("forgot"),0);
});
test("Un fallo aislado de contraseña o captcha no expulsa a usuarios legítimos",()=>{
  const t=makeThrottle();
  assert.equal(t.api.observe({status:400,code:"invalid_credentials"},"login").seconds,0);
  assert.equal(t.api.observe({status:400,code:"captcha_failed"},"signup").seconds,0);
  assert.equal(t.api.remaining("login"),0);
  assert.equal(t.api.remaining("signup"),0);
});
test("El contador local se conserva al recargar sin guardar cuentas ni correos",()=>{
  const storage=new Map(),before=makeThrottle(storage);
  before.api.observe({status:429,code:"over_email_send_rate_limit"},"forgot");
  const after=makeThrottle(storage);
  assert.ok(after.api.remaining("signup")>=3590);
  assert.ok(after.api.remaining("forgot")>=3590);
  assert.ok(!JSON.stringify([...storage.values()]).includes("@"));
});
test("El teléfono ahora es obligatorio, con prefijo y validación sin persistencia",()=>{
  const html=PhoneCountry.render("ES");
  assert.match(html,/Teléfono \(obligatorio/);
  assert.match(html,/name="phone_optional"[^>]+required/);
  assert.equal(PhoneCountry.validNumber("","ES"),false);
  assert.equal(PhoneCountry.validNumber("123","ES"),false);
  assert.equal(PhoneCountry.validNumber("612345678","ES"),true);
  assert.equal(PhoneCountry.validNumber("612345678","NOEXISTE"),false);
  assert.equal(PhoneCountry.validNumber("12345678901234567890","ES"),false);
  assert.match(html,/no se guarda ni se envían SMS/);
});
