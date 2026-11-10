const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const source=fs.readFileSync(path.join(__dirname,"../js/auth.js"),"utf8");

function makeAuth(signUpResponse){
  const slot={innerHTML:"",dataset:{}};
  const app={innerHTML:""},sheet={innerHTML:""};
  const els={"#authSlot":slot,"#app":app,"#sheetRoot":sheet};
  const auth={
    signUp: async () => typeof signUpResponse==="function"?signUpResponse():signUpResponse
  };
  const ctx=vm.createContext({
    Cloud:{cfg:{SUPABASE_URL:"https://staging.example.test"},configured:()=>true,sb:{auth}},
    localStorage:{setItem(){},getItem(){return null},removeItem(){}},
    location:{origin:"http://127.0.0.1:5500",pathname:"/staging.html"},
    $:x=>els[x],document:{body:{classList:{remove(){}}}},
    TurnstileGuard:{token:()=>null,placeholder:()=>"",mount(){}},
    UI:{sheet:null},ACT:{},CHG:{},INP:{},V:{sheet:{}},
    Store:{},window:{},render(){},esc:x=>String(x),setTimeout,clearTimeout,console,
  });
  vm.runInContext(source+"\nthis.harness={Auth,FORM,ACT};",ctx);
  const h=ctx.harness;
  h.Auth.state="out";
  h.Auth.ui.mode="signup";
  const form={elements:{
    name:{value:"Usuario Simulación"},
    email:{value:"prueba@example.test"},
    password:{value:"ClaveLargaFicticia2026"},
    accept:{checked:true}
  }};
  return {h,form,slot};
}
test("Si Supabase devuelve usuario ya registrado, se muestra error inmediato y acceso a iniciar sesión",async()=>{
 const {h,form,slot}=makeAuth({data:null,error:{code:"user_already_exists",message:"User already registered"}});
 await h.FORM.authSignup(form);
 assert.equal(h.Auth.ui.mode,"signup");
 assert.match(h.Auth.ui.msg.text,/Esta cuenta ya existe\. Debes iniciar sesión/);
 h.Auth.render();
 assert.match(slot.innerHTML,/role="alert"/);
 assert.match(slot.innerHTML,/data-v="login"/);
 assert.match(slot.innerHTML,/data-v="forgot"/);
});
test("Si Supabase oculta si existe cuenta, no se asegura falsamente que se envió un correo",async()=>{
 const {h,form,slot}=makeAuth({data:{session:null,user:{identities:[]}},error:null});
 await h.FORM.authSignup(form);
 assert.equal(h.Auth.ui.mode,"check");
 h.Auth.render();
 assert.match(slot.innerHTML,/Comprueba tu correo o inicia sesión/);
 assert.match(slot.innerHTML,/¿El correo ya estaba registrado\?/);
 assert.match(slot.innerHTML,/no se enviará otra confirmación/);
 assert.match(slot.innerHTML,/data-v="login"/);
 assert.match(slot.innerHTML,/data-v="forgot"/);
});
test("Si el alta es nueva se conserva la confirmación sin afirmar que la cuenta ya existía",async()=>{
 const {h,form,slot}=makeAuth({data:{session:null,user:{identities:[{id:"id-de-prueba"}]}},error:null});
 await h.FORM.authSignup(form);
 assert.equal(h.Auth.ui.mode,"check");
 h.Auth.render();
 assert.match(slot.innerHTML,/Si acabas de crear la cuenta, revisa el correo/);
 assert.match(slot.innerHTML,/Si has indicado un código de equipo/);
});
