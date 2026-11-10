const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const authSource=fs.readFileSync(path.join(__dirname,"../js/auth.js"),"utf8");
function setup(mode="signup"){
 const signups=[],elements={"#authSlot":{dataset:{},innerHTML:""},"#app":{innerHTML:""},"#sheetRoot":{innerHTML:""}};
 const ctx=vm.createContext({
  PhoneCountry:require("../js/phone-country.js"),
  Cloud:{cfg:{STAGING:true,SUPABASE_URL:"https://staging.example.test"},configured:()=>true,
   sb:{auth:{signUp:async args=>{signups.push(args);return {data:{session:null,user:{id:"test-id"}},error:null}}}}},
  document:{body:{classList:{remove(){}}},addEventListener(){}},location:{origin:"http://127.0.0.1:5500",pathname:"/staging.html"},
  localStorage:{setItem(){},removeItem(){},getItem(){return null}},
  $:id=>elements[id],TurnstileGuard:{placeholder:()=>"",mount(){},token:()=>null},
  ACT:{},CHG:{},INP:{},V:{sheet:{}},UI:{sheet:null},Store:{},
  render(){},esc:s=>String(s),setTimeout,clearTimeout,console
 });
 vm.runInContext(authSource+"\nthis.h={Auth,FORM};",ctx);
 ctx.h.Auth.state="out";
 ctx.h.Auth.ui.mode=mode;
 const notice={hidden:true,textContent:""};
 const confirm={value:"",focusCount:0,setAttribute(){},removeAttribute(){},focus(){this.focusCount++;}};
 const form={elements:{
  name:{value:"Entrenador de pruebas"},
  email:{value:"ejemplo@example.test"},
  password:{value:"ClaveSeguraDePrueba2027"},
  confirm_password:confirm,
  phone_optional:{value:"612345678"},
  accept:{checked:true},
  join_code:{value:"ABCD1234"}
 },querySelector:q=>q==="[data-signup-password-mismatch]"?notice:null};
 return {h:ctx.h,signups,form,notice,confirm,html:()=>elements["#authSlot"].innerHTML};
}
test("Registro y unión por código piden repetir contraseña con su propio botón de mostrar",()=>{
 for(const mode of ["signup","join"]){
  const x=setup(mode);x.h.Auth.render();
  assert.match(x.html(),/Repetir contraseña/);
  assert.match(x.html(),/name="confirm_password"/);
  assert.equal((x.html().match(/data-password-toggle/g)||[]).length,2);
  assert.match(x.html(),/data-signup-password-mismatch hidden/);
 }
});
test("No se envía ningún registro cuando las contraseñas no coinciden y se conservan los valores",async()=>{
 const x=setup();x.confirm.value="UnaContraseñaDiferente123";
 await x.h.FORM.authSignup(x.form);
 assert.equal(x.signups.length,0);
 assert.equal(x.notice.hidden,false);
 assert.match(x.notice.textContent,/no coinciden/);
 assert.equal(x.confirm.focusCount,1);
 assert.equal(x.form.elements.password.value,"ClaveSeguraDePrueba2027");
 assert.equal(x.form.elements.confirm_password.value,"UnaContraseñaDiferente123");
});
test("Coincidencia correcta registra normalmente y solo envía una contraseña a Supabase",async()=>{
 const x=setup();x.confirm.value="ClaveSeguraDePrueba2027";
 await x.h.FORM.authSignup(x.form);
 assert.equal(x.signups.length,1);
 assert.equal(x.signups[0].password,"ClaveSeguraDePrueba2027");
 assert.equal(x.signups[0].options.data.name,"Entrenador de pruebas");
 assert.ok(!("confirm_password" in x.signups[0]));
 assert.equal(x.h.Auth.ui.mode,"check");
});
test("La unión al club también bloquea contraseñas distintas antes de usar el código",async()=>{
 const x=setup("join");x.confirm.value="Distinta2027";
 await x.h.FORM.authSignup(x.form);
 assert.equal(x.signups.length,0);
 assert.equal(x.notice.hidden,false);
 x.confirm.value="ClaveSeguraDePrueba2027";
 await x.h.FORM.authSignup(x.form);
 assert.equal(x.signups.length,1);
});
