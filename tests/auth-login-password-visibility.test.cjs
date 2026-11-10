const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const code=fs.readFileSync(path.resolve(__dirname,"../js/auth.js"),"utf8");

function setup(loginResult={error:null}) {
  const listeners={},slot={innerHTML:"",dataset:{}};
  const els={"#authSlot":slot,"#app":{innerHTML:""},"#sheetRoot":{innerHTML:""}};
  const calls=[];
  const sb={auth:{signInWithPassword:async creds=>{calls.push(creds);return typeof loginResult==="function"?loginResult():loginResult;}}};
  const ctx=vm.createContext({
    Cloud:{sb,cfg:{STAGING:true,SUPABASE_URL:"https://staging.example.test"},configured:()=>true},
    document:{body:{classList:{remove(){}}},addEventListener(n,cb){listeners[n]=cb;}},
    TurnstileGuard:{placeholder:()=>"",token:()=>null,mount(){}},
    location:{origin:"http://127.0.0.1:5500",pathname:"/staging.html"},
    localStorage:{setItem(){},getItem(){return null},removeItem(){}},
    $:id=>els[id],ACT:{},CHG:{},INP:{},V:{sheet:{}},UI:{sheet:null},
    render(){},Store:{},window:{},console,setTimeout,clearTimeout,esc:x=>String(x)
  });
  vm.runInContext(code+"\nthis.h={Auth,FORM,ACT};",ctx);
  ctx.h.Auth.state="out";
  ctx.h.Auth.ui.mode="login";
  return {h:ctx.h,slot,events:listeners,calls};
}
test("La Beta muestra aviso de cuentas independientes y ojo accesible en login, registro y recuperación",()=>{
  const x=setup();
  x.h.Auth.render();
  assert.match(x.slot.innerHTML,/Banquillo Beta · Datos de prueba/);
  assert.match(x.slot.innerHTML,/Las cuentas de la versión oficial no se comparten/);
  assert.match(x.slot.innerHTML,/data-password-toggle/);
  assert.match(x.slot.innerHTML,/aria-label="Mostrar contraseña"/);
  assert.match(x.slot.innerHTML,/autocomplete="current-password"/);
  x.h.Auth.ui.mode="signup";
  x.h.Auth.render();
  assert.match(x.slot.innerHTML,/autocomplete="new-password"/);
  assert.match(x.slot.innerHTML,/data-password-toggle/);
  x.h.Auth.state="recovery";x.h.Auth.render();
  assert.match(x.slot.innerHTML,/data-password-toggle/);
});
test("Pulsar ojo muestra y oculta la contraseña sin perder su valor ni reenviar el formulario",()=>{
  const {events}=setup();
  assert.equal(typeof events.click,"function");
  const field={type:"password",value:"ContrasenaDePrueba123",disabled:false};
  const attributes={};
  const button={parentElement:{querySelector(selector){return selector==='input[name="password"]'?field:null;}},
    setAttribute(name,value){attributes[name]=value;}};
  const e={target:{closest(selector){return selector==="[data-password-toggle]"?button:null;}}};
  events.click(e);
  assert.equal(field.type,"text");
  assert.equal(field.value,"ContrasenaDePrueba123");
  assert.equal(attributes["aria-label"],"Ocultar contraseña");
  assert.equal(attributes["aria-pressed"],"true");
  events.click(e);
  assert.equal(field.type,"password");
  assert.equal(field.value,"ContrasenaDePrueba123");
  assert.equal(attributes["aria-label"],"Mostrar contraseña");
});
test("Error de credenciales se traduce y sugiere recuperar acceso a la Beta",async()=>{
  const x=setup({error:{code:"invalid_credentials",message:"Invalid login credentials"}});
  const f={elements:{email:{value:"prueba@example.test"},password:{value:"ClaveDePrueba123"}}};
  await x.h.FORM.authLogin(f);
  assert.equal(x.calls.length,1);
  assert.equal(x.calls[0].email,"prueba@example.test");
  assert.equal(x.calls[0].password,"ClaveDePrueba123");
  assert.equal(x.h.Auth.ui.busy,false);
  assert.equal(x.h.Auth.ui.msg.type,"err");
  assert.match(x.h.Auth.ui.msg.text,/Las cuentas de la versión oficial son independientes/);
  assert.match(x.h.Auth.ui.msg.text,/¿Has olvidado la contraseña\?/);
});
test("Errores de red al iniciar sesión no dejan el botón bloqueado",async()=>{
  const x=setup(()=>{throw Error("Network request failed");});
  const f={elements:{email:{value:"prueba@example.test"},password:{value:"ClaveDePrueba123"}}};
  await x.h.FORM.authLogin(f);
  assert.equal(x.h.Auth.ui.busy,false);
  assert.match(x.h.Auth.ui.msg.text,/No se ha podido contactar con el servicio de acceso/);
});
test("El icono del ojo tiene estilos accesibles y las contraseñas nunca van en HTML",()=>{
  const css=fs.readFileSync(path.resolve(__dirname,"../css/app.css"),"utf8");
  assert.match(css,/.auth-password-toggle:focus-visible/);
  assert.match(css,/aria-pressed="true"/);
  assert.match(code,/button class="auth-password-toggle" type="button"/);
  assert.doesNotMatch(code,/input class="inp" type="text" name="password"/);
  assert.doesNotMatch(code,/value="\$\{[^}]*password[^}]*\}"/);
});
