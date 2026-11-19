const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = 'http://banquillo.test';
const fs=require('node:fs');
const path=require('node:path');
const fixture = (authenticated, director) => `
const user = ${authenticated ? '{id:"fixture-user",email:"entrenador@example.test"}' : 'null'};
const season = {club:"Equipo Naranja",name:"2026/27",status:"active",settings:{format:"F11"}};
const docs = {
  seasons: [{ path:"seasons/naranja",data:season},{path:"seasons/azul",data:{...season,club:"Equipo Azul"}}],
  "seasons/naranja/matches": [{path:"seasons/naranja/matches/1",data:{n:1,rival:"Rival ficticio",date:"2027-01-09",home:true}}],
  "seasons/naranja/players": [{path:"seasons/naranja/players/p1",data:{name:"Jugador ficticio",dorsal:7,active:true}}]
};
const director = ${director};
const rpc = {my_profile:{tokens:20},banquillo_my_season_context:[],banquillo_my_team_requests:[],
  banquillo_list_deleted_clubs:[],banquillo_wallet_status:{balance:20},
  banquillo_club_roster:[{user_id:"fixture-user",kind:"owner",display_name:"Dirección de prueba"}],
  banquillo_team_roster:[{user_id:"fixture-coach",position:"head_coach",status:"active",display_name:"Entrenador de prueba"}],
  banquillo_director_invite:{available:true,code:"abcd2345",expires_at:"2027-01-09T12:00:00Z"},
  banquillo_team_code:"ABCD6789"};
const clubTables={
  banquillo_clubs:[{id:"club-1",name:"Club de prueba",owner_id:"fixture-user"}],
  banquillo_teams:[{id:"team-1",club_id:"club-1",name:"Cadete de prueba",modality:"F11",category:"Cadete",season_id:"naranja",settings:{}}],
  banquillo_club_seasons:[{id:"period-1",club_id:"club-1",season_label:"2026/27",status:"active"}]
};
window.supabase = {createClient(){return {
  auth:{getUser:async()=>({data:{user},error:null}),getSession:async()=>({data:{session:user?{user}:null}}),
    onAuthStateChange(cb){queueMicrotask(()=>cb("INITIAL_SESSION",user?{user}:null));return {data:{subscription:{unsubscribe(){}}}}}},
  rpc:async name=>({data:rpc[name]??null,error:null}),
  channel(){return {on(){return this},subscribe(){return this}}},removeChannel(){},
  from(table){
    let filters={};
    const q={select(){return q},eq(key,value){filters[key]=value;return q},order(){return q},limit(){return q},
      in(){return q},is(){return q},neq(){return q},or(){return q},maybeSingle(){return Promise.resolve({data:null,error:null})},
      then(yes,no){
        const data=table==="docs"?(docs[filters.parent]||[]):table==="season_members"?
          [{season_id:"naranja",role:"owner"},{season_id:"azul",role:"viewer"}]:director?(clubTables[table]||[]):[];
        return Promise.resolve({data,error:null}).then(yes,no)
      }};
    return q;
  }
}}};`;
(async()=>{
 const launch = () => chromium.launch({
   executablePath:process.env.CHROMIUM_PATH || undefined,
   args:process.env.CHROMIUM_SINGLE_PROCESS ? ['--no-sandbox','--single-process','--no-zygote'] : []
 });
 for(const [name,viewport,authenticated] of [
   ['visitor',{width:1280,height:820},false],['coach',{width:1280,height:820},true],['mobile',{width:390,height:844},true],['director',{width:1280,height:820},true]
 ]) {
   if (process.argv[2] && name !== process.argv[2]) continue;
   const browser=await launch();
   try {
   const ctx=await browser.newContext({viewport});
   const errors=[];
   await ctx.route('**/*',route=>{
     const url=route.request().url();
     if (url.includes('@supabase/supabase-js')) return route.fulfill({contentType:'application/javascript',body:fixture(authenticated,name==='director')});
     if (!url.startsWith(base+'/')) return route.abort();
     const file=path.join(__dirname,'..',new URL(url).pathname);
     return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:'Missing file'});
   });
   const p=await ctx.newPage();
   p.on('pageerror',error=>{errors.push(error.message); console.error('PAGE',error.message);});
   p.on('response',r=>{if(r.url().startsWith(base+'/')&& r.status()>=400 && !r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
   p.setDefaultTimeout(5000);
   await p.goto(base+(authenticated?'/index.html?season=naranja':'/index.html'));
   if(!authenticated){
     await p.locator('[data-entry=login]').first().click();
     await p.locator('[data-password-toggle]').click();
     assert.equal(await p.locator('input[name=password]').getAttribute('type'),'text');
     for(const demo of ['club','equipo']){
       await p.goto(base+'/demo-'+demo+'-vista.html');
       await p.locator('aside a').last().click();
       assert.equal(await p.locator('form, [contenteditable=true]').count(),0);
     }
     await p.goto(base+'/index.html#clubes');
     await p.waitForURL('**/clubes.html');
     await p.getByRole('heading',{name:'Accede a tu cuenta'}).waitFor();
     await p.getByRole('link',{name:'Entrar o registrarme'}).click();
     await p.waitForURL('**/index.html?acceso=entrar');
     await p.getByRole('dialog').locator('input[name=password]').waitFor();
   } else if(name==='director'){
     await p.goto(base+'/clubes.html');
     await p.getByText('Conectado a Supabase.',{exact:true}).waitFor();
     await p.locator('#mainNav [data-view=directores]').click();
     await p.getByRole('heading',{name:/Dirección de prueba/}).waitFor();
     await p.getByRole('button',{name:/Generar código temporal/}).click();
     await p.locator('[data-invite-code]').waitFor();
     await p.getByRole('button',{name:'Cerrar',exact:true}).click();
     await p.locator('#mainNav [data-view=equipos]').click();
     await p.locator('[data-action=openTeam]').first().click();
     await p.locator('[data-tab=coaches]').click();
     await p.getByRole('heading',{name:'Cadete de prueba',level:2}).waitFor();
     await p.locator('[data-tab=code]').click();
     await p.getByText(/ABCD.6789/i).first().waitFor();
     await p.locator('#mainNav [data-view=comunicaciones]').click();
     await p.locator('#viewRoot h2').first().waitFor();
   } else {
     await p.getByRole('heading',{name:'Equipo Naranja'}).waitFor();
     const isMobile=name==='mobile';
     if(!isMobile)assert.equal(await p.locator('.shell > .side').evaluate(e=>getComputedStyle(e).position),'fixed');
     await p.locator(isMobile?'.top-r.mob-only .schip':'.snav [data-to=temporadas]').click();
     await p.getByRole('heading',{name:'Mis equipos'}).waitFor();
     assert.equal(await p.locator('.bq-cloud-team').count(),2);
     await p.locator('.bq-cloud-team').filter({hasText:'Equipo Azul'}).getByRole('button',{name:/Ajustes/}).click();
     await p.getByRole('dialog').getByRole('heading',{name:/Equipo Azul/}).waitFor();
     assert.equal(await p.getByRole('button',{name:/Eliminar equipo/}).count(),0);
     await p.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).last().click();
     await p.locator('.bq-cloud-team').filter({hasText:'Equipo Naranja'}).getByRole('button',{name:/Ajustes/}).click();
     await p.getByRole('dialog').getByRole('button',{name:'Modificar valores'}).waitFor();
     await p.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).last().click();
     await p.locator((isMobile?'.tabs':'.snav')+' [data-to=partidos]').click();
     await p.getByText('Rival ficticio',{exact:true}).first().click();
     await p.getByRole('button',{name:/Convocatoria/}).first().click();
     await p.getByText('Jugador ficticio',{exact:false}).first().waitFor();
     await p.getByRole('button',{name:'Sancionado',exact:true}).waitFor();
     await p.getByRole('button',{name:'Preparar mensaje',exact:true}).click();
     await p.getByRole('dialog').waitFor();
     await p.keyboard.press('Escape');
     await p.locator('[data-act=setTab][data-v=ficha]').click();
     await p.getByRole('heading',{name:'Descargar o subir acta Excel'}).waitFor();
     await p.locator((isMobile?'.tabs':'.snav')+' [data-to=clubes]').click();
     await p.waitForURL('**/clubes.html');
     await p.getByText('Conectado a Supabase.',{exact:true}).waitFor();
     if(!isMobile)assert.equal(await p.locator('.app-shell > .sidebar').evaluate(e=>getComputedStyle(e).position),'fixed');
     assert.equal(await p.locator('body').evaluate(e=>e.scrollWidth <= innerWidth),true);
     await p.goBack();
     await p.waitForURL(/index\.html(?:\?[^#]*)?#partido-1$/);
   }
   assert.deepEqual(errors,[]);
   console.log('OK '+name);
   await ctx.close();
   } finally {await browser.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1});
