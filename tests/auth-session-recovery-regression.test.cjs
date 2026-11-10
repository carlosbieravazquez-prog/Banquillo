const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../js/auth.js"),"utf8");
const PhoneCountry=require("../js/phone-country.js");

function harness(){
 const queue=[],calls={init:0,reset:0,signout:0,update:0,verify:0};
 const slot={innerHTML:"",dataset:{}},app={innerHTML:""},sheet={innerHTML:""};
 const nodes={"#authSlot":slot,"#app":app,"#sheetRoot":sheet};
 let listener=null,verifiedUser=null;
 const session=(id="u1")=>({user:{id,email:id+"@example.test"}});
 const auth={
  onAuthStateChange(cb){listener=cb;return {data:{subscription:{unsubscribe(){}}}};},
  signOut:async()=>{calls.signout++;listener?.("SIGNED_OUT",null);return {error:null};},
  getUser:async()=>{calls.verify++;return {data:{user:verifiedUser},error:null};},
  updateUser:async()=>{calls.update++;return {error:null};},
  signInWithPassword:async()=>({error:null}),
  resetPasswordForEmail:async()=>({error:null})
 };
 const scope=vm.createContext({
  Cloud:{sb:{auth},cfg:{SUPABASE_URL:"https://staging.test",STAGING:true},configured:()=>true,
   init(){return true},db:{},loadProfile:async()=>{},profile:null},
  Auth:null,UI:{sheet:null,wiz:null,ai:{}},ACT:{},CHG:{},INP:{},FORM:{},V:{sheet:{}},
  Store:{reset(){calls.reset++},init:async()=>{calls.init++},connecting:false},
  PhoneCountry,
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},
  document:{body:{classList:{remove(){},add(){}}},addEventListener(){}},
  TurnstileGuard:{token:()=>null,mount(){},placeholder:()=>""},
  location:{origin:"http://127.0.0.1:5500",pathname:"/staging.html"},
  history:{replaceState(){}},
  $:k=>nodes[k],esc:x=>String(x),render(){},toast(){},go(){},
  setTimeout(fn){queue.push(fn);return queue.length},
  clearTimeout(){},window:{},console
 });
 vm.runInContext(source+"\nthis.H={Auth,FORM,ACT};",scope);
 const h=scope.H;
 const flush=async()=>{
  for(let i=0;i<8;i++){
   const fns=queue.splice(0);
   fns.forEach(fn=>fn());
   await new Promise(resolve=>setImmediate(resolve));
   if(!queue.length)break;
  }
 };
 return {h,calls,flush,emit:(ev,s)=>listener(ev,s),session,verify:id=>verifiedUser={id},slot};
}
test("Ciclo de sesión: iniciar, cerrar y volver a iniciar la misma cuenta",async()=>{
 const x=harness();x.h.Auth.start();
 x.emit("INITIAL_SESSION",null);await x.flush();
 assert.equal(x.h.Auth.state,"out");
 x.emit("SIGNED_IN",x.session());await x.flush();
 assert.equal(x.h.Auth.state,"in");
 assert.equal(x.h.Auth.uid,"u1");
 assert.equal(x.calls.init,1);
 await x.h.ACT.signOut();await x.flush();
 assert.equal(x.calls.signout,1);
 assert.equal(x.h.Auth.state,"out");
 assert.equal(x.h.Auth.uid,null);
 const resetsAfterLogout=x.calls.reset;
 x.emit("SIGNED_IN",x.session());await x.flush();
 assert.equal(x.h.Auth.state,"in");
 assert.equal(x.h.Auth.uid,"u1");
 assert.equal(x.calls.init,2);
 assert.equal(x.calls.reset,resetsAfterLogout+1);
});
test("Al llegar un SIGNED_OUT antiguo tras SIGNED_IN no se cierra la cuenta nueva",async()=>{
 const x=harness();x.h.Auth.start();
 x.emit("SIGNED_OUT",null);
 x.emit("SIGNED_IN",x.session("u2"));
 await x.flush();
 assert.equal(x.h.Auth.uid,"u2");
 assert.equal(x.h.Auth.state,"in");
});
test("Al cambiar de cuenta sin recargar se reinicia el almacén de datos",async()=>{
 const x=harness();x.h.Auth.start();
 x.emit("SIGNED_IN",x.session("u1"));await x.flush();
 const initial=x.calls.reset;
 x.emit("SIGNED_IN",x.session("u2"));await x.flush();
 assert.equal(x.h.Auth.uid,"u2");
 assert.equal(x.calls.reset,initial+1);
});
test("No se puede restablecer la contraseña sin evento PASSWORD_RECOVERY",async()=>{
 const x=harness();x.h.Auth.start();
 const form={elements:{password:{value:"PasswordFicticia2026!"},confirm_password:{value:"PasswordFicticia2026!"}}};
 await x.h.FORM.authNewPass(form);
 assert.equal(x.calls.update,0);
 assert.equal(x.h.Auth.ui.mode,"forgot");
});
test("Al abrir enlace válido se exige repetir contraseña y confirmar usuario",async()=>{
 const x=harness();x.h.Auth.start();
 x.emit("PASSWORD_RECOVERY",x.session("u2"));await x.flush();
 assert.equal(x.h.Auth.state,"recovery");
 assert.equal(x.h.Auth.recovery.uid,"u2");
 let form={elements:{password:{value:"PasswordFicticia2026!"},confirm_password:{value:"DistintaFicticia2026!"}}};
 await x.h.FORM.authNewPass(form);
 assert.equal(x.calls.update,0);
 assert.match(x.h.Auth.ui.msg.text,/coincidir/);
 x.verify("u2");
 form={elements:{password:{value:"PasswordFicticia2026!"},confirm_password:{value:"PasswordFicticia2026!"}}};
 await x.h.FORM.authNewPass(form);
 await x.flush();
 assert.equal(x.calls.verify,1);
 assert.equal(x.calls.update,1);
 assert.equal(x.calls.signout,1);
 assert.equal(x.h.Auth.state,"out");
 assert.equal(x.h.Auth.ui.mode,"login");
 assert.match(x.h.Auth.ui.msg.text,/Contraseña actualizada/);
});
test("Si la sesión del enlace pertenece a otra cuenta no se cambia ninguna contraseña",async()=>{
 const x=harness();x.h.Auth.start();
 x.emit("PASSWORD_RECOVERY",x.session("u2"));await x.flush();
 x.verify("otraCuenta");
 const form={elements:{password:{value:"PasswordFicticia2026!"},confirm_password:{value:"PasswordFicticia2026!"}}};
 await x.h.FORM.authNewPass(form);
 assert.equal(x.calls.update,0);
 assert.equal(x.h.Auth.ui.mode,"forgot");
});
test("Selector de teléfonos cubre países, banderas, prefijos y no almacena el número",()=>{
 assert.ok(PhoneCountry.countries.length>=200);
 assert.equal(PhoneCountry.byIso.ES.dial,"+34");
 assert.equal(PhoneCountry.byIso.MX.dial,"+52");
 assert.equal(PhoneCountry.byIso.AR.dial,"+54");
 const html=PhoneCountry.render("ES","");
 assert.match(html,/type="search"/);
 assert.match(html,/data-phone-select="ES"/);
 assert.match(html,/data-phone-select="MX"/);
 assert.match(html,/data-phone-toggle/);
 assert.match(html,/no se guarda ni se envían SMS/);
 assert.match(html,/name="phone_optional"[^>]+required/);
 assert.equal(PhoneCountry.normalized("México"),"mexico");
 const authSource=fs.readFileSync(path.join(__dirname,"../js/auth.js"),"utf8");
 assert.match(authSource,/PhoneCountry\.render/);
 assert.doesNotMatch(authSource,/data: \{ name, (?:phone|telefono|contact_phone)/);
 for(const page of ["index.html","staging.html"]){
  const code=fs.readFileSync(path.join(__dirname,"..",page),"utf8");
  assert.ok(code.indexOf('src="js/phone-country.js"')<code.indexOf('src="js/auth.js"'));
 }
});
