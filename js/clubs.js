/* Clubes reales en Supabase-Staging: directores, equipos, códigos individuales. */
const ClubSpace = (() => {
  const state={clubs:null,loading:false,error:"",selected:null,tab:"teams",pendingCode:null,notices:[],noticeLoading:false,noticeError:"",noticeModality:"todos"};
  const e=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const current=()=>state.clubs?.find(c=>c.id===state.selected)||state.clubs?.[0]||null;
  const fmtCode=x=>String(x||"").replace(/^(.{4})(.{4})$/,"$1-$2");
  const canSave=()=>!!current();
  async function refresh(){
    if(state.loading||Auth.state!=="in")return;
    const uid=Auth.uid;
    state.loading=true;state.error="";render(true);
    try{
      const rows=await Cloud.rpc("bq_clubs_list");
      if(Auth.state!=="in"||Auth.uid!==uid)return;
      state.clubs=Array.isArray(rows)?rows:[];
      if(!state.clubs.some(c=>c.id===state.selected))state.selected=state.clubs[0]?.id||null;
    }catch(err){if(Auth.uid===uid)state.error="No se han podido cargar los clubes. Comprueba la conexión con Supabase-Staging.";}
    finally{state.loading=false;if(Auth.state==="in"&&Auth.uid===uid)render(true);}
  }
  const head=(title,description,actions="")=>'<div class="phead"><div><h1>'+e(title)+'</h1><p class="sub">'+e(description)+'</p></div><div class="phead-r">'+actions+'</div></div>';
  const tabBtn=(id,label)=>'<button type="button" data-act="clubTab" data-tab="'+id+'" class="'+(state.tab===id?"on":"")+'">'+label+'</button>';
  function clubPage(){
    if(!state.clubs&&!state.loading)setTimeout(refresh,0);
    if(state.loading&&!state.clubs)return '<div class="loading"><div class="spin"></div><p>Cargando la gestión del club…</p></div>';
    if(state.error)return head("Dirección deportiva",state.error,btn("Reintentar","clubRefresh",{},"primary"));
    if(!state.clubs?.length)return head("Dirección deportiva","Organiza tus equipos y entrega un código diferente a cada entrenador.")+
      '<section class="card club-onboarding"><h2>Crea tu primer club</h2><p>Primero identifica el club. Después podrás añadir equipos como «Juvenil A» o «Benjamín · Liga Educa», sin introducir jugadores ni jornadas.</p>'+
      '<p class="muted small">Los entrenadores recibirán únicamente el código de su equipo. Puedes continuar usando Banquillo para un solo equipo sin crear un club.</p>'+
      btn("Crear un club","clubCreateAsk",{},"primary","plus")+'</section>';
    const c=current();if(!c)return "";
    const choose=state.clubs.length>1?'<label class="fld"><span>Club activo</span><select class="sel" data-chg="clubSelect">'+state.clubs.map(x=>'<option value="'+e(x.id)+'"'+(x.id===c.id?" selected":"")+'>'+e(x.name)+'</option>').join("")+'</select></label>':"";
    const tabs='<div class="settings-visual-tabs" role="navigation" aria-label="Gestión del club">'+
      tabBtn("teams","Equipos")+tabBtn("alerts","Avisos")+tabBtn("directors","Dirección deportiva")+tabBtn("facilities","Instalaciones")+tabBtn("settings","Configuración")+'</div>';
    let inner="";
    if(state.tab==="teams")inner=teamList(c);
    if(state.tab==="alerts")inner=alertsPage(c);
    if(state.tab==="directors")inner=directorList(c);
    if(state.tab==="facilities")inner=facilitiesPage(c);
    if(state.tab==="settings")inner=settingsPage(c);
    return head(c.name,"Temporada "+c.season+" · Gestión del club")+
      '<div class="card club-overview"><div><b>'+e(c.name)+'</b><p class="muted small">'+e(c.town||"")+" · "+e(c.province||"")+'</p></div>'+
      '<div class="row gap wrap"><span class="tag">'+(c.teams||[]).length+' equipos</span><span class="tag">'+(c.directors||[]).length+'/2 directores</span><span class="tag info">'+(c.role==="owner"?"Responsable del club":"Director deportivo")+'</span></div></div>'+
      choose+tabs+inner+
      '<p class="muted small">Los entrenadores no ven este directorio. Cada código permite unirse únicamente a la temporada del equipo indicado.</p>'+
      '<div class="row end gap foot">'+btn("Crear otro club","clubCreateAsk",{},"ghost small")+'</div>';
  }
  function teamList(c){
    const teams=c.teams||[];
    const items=teams.map(t=>'<article class="card club-team-card"><div class="club-team-top"><div><b>'+e(t.name)+'</b><p class="muted small">'+e(t.modality)+' · '+e(t.category||"Categoría por definir")+' · '+e(t.competition||"Competición pendiente")+'</p></div><span class="tag">'+Number(t.member_count||0)+' miembros</span></div>'+
      '<div class="club-code-row"><div><span class="muted small">Código exclusivo del equipo</span><strong class="club-team-code">'+e(fmtCode(t.code))+'</strong></div><span class="tag '+(t.enabled?"ok":"")+'">'+(t.enabled?"Activo":"Desactivado")+'</span></div>'+
      '<div class="row gap wrap">'+btn("Copiar código","clubCopyCode",{id:t.id},"primary small")+
      btn("Cambiar código","clubRotateCode",{id:t.id},"ghost small")+
      btn(t.enabled?"Desactivar":"Activar","clubToggleCode",{id:t.id},"ghost small")+
      btn("Abrir equipo","clubOpenTeam",{id:t.id},"ghost small")+
      btn("Gestionar entrenadores","clubManageCoaches",{id:t.id},"ghost small")+'</div></article>').join("");
    return '<section class="club-section"><div class="club-section-head"><div><h2>Equipos del club</h2><p class="muted small">Crea solo el nombre y asigna la modalidad. El entrenador hará el resto cuando reciba su código.</p></div>'+
      btn("Añadir equipo","clubAddTeamAsk",{},"primary","plus")+'</div>'+
      '<div class="club-team-grid">'+(items||'<p class="muted">Aún no hay equipos. Añade el primero.</p>')+'</div></section>';
  }
  async function loadNotices(){
    const c=current();if(!c||state.noticeLoading)return;
    const id=c.id;
    state.noticeLoading=true;state.noticeError="";render(true);
    try{
      const rows=await Cloud.rpc("bq_list_team_notices",{p_club:id});
      if(current()?.id===id)state.notices=Array.isArray(rows)?rows:[];
    }catch(_){if(current()?.id===id)state.noticeError="No se han podido cargar los avisos del club.";}
    finally{state.noticeLoading=false;if(current()?.id===id)render(true);}
  }
  const noticeLabel=n=>'No has cerrado el acta de la Jornada '+e(n.jornada||"?")+' ('+e(n.rival||"Rival")+')';
  function alertsPage(c){
    const rows=state.notices.filter(n=>state.noticeModality==="todos"||n.modality===state.noticeModality);
    return '<section class="club-section"><div class="club-section-head"><div><h2>Avisos importantes</h2>'+
      '<p class="muted small">Solo se generan tras 48 horas sin cerrar el acta. Los recordatorios ignorados se entregan una vez a los 7 días, dentro de Banquillo.</p></div>'+
      btn("Actualizar","clubRefreshNotices",{},"ghost small")+'</div>'+
      '<div class="row gap wrap">'+["todos","F7","F11"].map(v=>
        '<button type="button" class="btn '+(state.noticeModality===v?"primary":"ghost")+'" data-act="clubNoticeScope" data-v="'+v+'">'+(v==="todos"?"Todo el club":v)+'</button>'
      ).join("")+'</div>'+
      (state.noticeLoading?'<p>Cargando avisos…</p>':state.noticeError?'<p class="err">'+e(state.noticeError)+'</p>':
        rows.length?'<div class="club-coaches-list">'+rows.map(n=>'<article class="club-live-notice '+(n.resolved_at?"bq-resolved":"")+'">'+
         '<div class="club-team-top"><div><strong>'+e(n.team)+'</strong><p class="muted small">'+e(n.modality)+' · '+e(n.event_date)+'</p></div>'+
         '<span class="tag '+(n.resolved_at?"ok":"warn")+'">'+(n.resolved_at?"Corregido":n.ignored_at?"Ignorado":"Prioritario")+'</span></div>'+
         '<h3>'+noticeLabel(n)+'</h3><p class="muted small">Si el entrenador completa el acta, se quitará el aviso automáticamente del listado.</p>'+
         (!n.resolved_at?'<div class="row gap wrap">'+btn("Enviar aviso interno","clubSendNotice",{id:n.id},"primary small")+
           btn(n.ignored_at?"Ignorado":"Ignorar 7 días","clubIgnoreNotice",{id:n.id},"ghost small")+'</div>'+
           (n.reminded_at?'<p class="muted small">Recordatorio único enviado a la bandeja del entrenador.</p>':""):"")+
         '</article>').join("")+'</div>':'<p class="muted">No hay actas pendientes para la modalidad seleccionada.</p>')+
      '<p class="muted small">Los envíos de esta sección son avisos internos. No se envían por WhatsApp ni SMS.</p></section>';
  }
  ACT.clubRefreshNotices=()=>loadNotices();
  ACT.clubNoticeScope=el=>{if(["todos","F7","F11"].includes(el.dataset.v))state.noticeModality=el.dataset.v;};
  ACT.clubSendNotice=async el=>{
    const c=current(),n=state.notices.find(n=>n.id===el.dataset.id);
    if(!c||!n||n.resolved_at)return;
    try{
      const count=await Cloud.rpc("bq_send_team_notice",{p_club:c.id,p_notice:n.id});
      toast(Number(count)>0?"Aviso enviado a "+count+" entrenador(es) dentro de Banquillo.":"No hay entrenadores nuevos a quienes enviar este aviso.","ok");
      await loadNotices();
    }catch(_){toast("No se ha podido entregar el aviso.","err");}
  };
  ACT.clubIgnoreNotice=async el=>{
    const c=current(),n=state.notices.find(n=>n.id===el.dataset.id);
    if(!c||!n||n.resolved_at||n.ignored_at)return;
    try{await Cloud.rpc("bq_ignore_team_notice",{p_club:c.id,p_notice:n.id});await loadNotices();toast("Aviso ignorado. El recordatorio interno se creará una sola vez tras 7 días si sigue pendiente.","ok");}
    catch(_){toast("No se pudo ignorar este aviso.","err");}
  };

  function directorList(c){
    const rows=(c.directors||[]).map(d=>'<article class="card club-director-card"><div><b>'+e(d.name||"Director deportivo")+'</b><p class="muted small">'+(d.role==="owner"?"Responsable principal":"Director deportivo")+' · Acceso a todos los equipos</p></div>'+
      '<div class="row gap wrap">'+(d.user_id===Auth.uid?'<span class="tag ok">Tu cuenta</span>':
        c.role==="owner"&&d.role!=="owner"?btn("Quitar de dirección","clubRemoveDirector",{id:d.user_id},"ghost small"):"")+'</div></article>').join("");
    return '<section class="club-section"><div class="club-section-head"><div><h2>Directores deportivos</h2><p class="muted small">Dos responsables como máximo. Ambos pueden administrar los equipos y sus códigos.</p></div>'+
      (c.role==="owner"&&(c.directors||[]).length<2?btn("Añadir segundo director","clubAddDirectorAsk",{},"primary"):"")+'</div>'+
      '<div class="club-directors-grid">'+rows+'</div><p class="muted small">El segundo director debe registrarse y confirmar su correo antes de que puedas añadirlo. Un código de entrenador no concede este permiso.</p></section>';
  }
  function facilitiesPage(c){
    const x=c.facilities||{},f11=Number(x.f11)||0,f7=Number(x.f7)||0;
    return '<section class="card"><h2>Instalaciones deportivas</h2><p class="muted small">Un campo F11 divisible puede albergar dos partidos F7 si el horario y el uso del campo lo permiten.</p>'+
      '<div class="club-facility-readout"><span><strong>'+f11+'</strong><small>Campos F11</small></span><span><strong>'+f7+'</strong><small>Campos F7 independientes</small></span><span><strong>'+(f11*2+f7)+'</strong><small>F7 equivalentes teóricos</small></span></div>'+
      btn("Configurar instalaciones","clubSettingsAsk",{page:"facilities"},"primary")+'</section>';
  }
  function settingsPage(c){
    const k=ClubTheme.normalizeKits(c.settings?.kits),p=ClubTheme.cleanPalette(c.settings?.palette);
    return '<section class="card"><h2>Configuración del club</h2><p class="muted small">Escudo, primera, segunda y tercera equipación; identidad visual automática o profesional y datos del club.</p>'+
      '<div class="row gap wrap">'+btn("Datos y escudo","clubSettingsAsk",{page:"data"},"ghost")+
      btn("Equipaciones","clubSettingsAsk",{page:"kits"},"ghost")+
      btn("Identidad visual","clubSettingsAsk",{page:"palette"},"ghost")+'</div>'+
      '<p class="muted small">Colores principales: '+e(k.first.shirt)+' · Estilo '+e(p.mode==="auto"?"Automático":"Profesional")+'. Los nuevos equipos heredarán la configuración del club.</p></section>';
  }
  ACT.clubGo=()=>{go("clubes");refresh();};
  ACT.clubRefresh=()=>refresh();
  ACT.clubTab=el=>{if(["teams","alerts","directors","facilities","settings"].includes(el.dataset.tab)){state.tab=el.dataset.tab;if(state.tab==="alerts")loadNotices();}};
  CHG.clubSelect=el=>{state.selected=el.value;state.tab="teams";state.notices=[];};
  ACT.clubCreateAsk=()=>{UI.sheet={type:"clubCreate",wide:true,d:{name:"",town:"",province:"Sevilla",season:"2026/27"}};};
  V.sheet.clubCreate=sh=>'<h2>Crear club · Dirección deportiva</h2><p class="muted small">Los entrenadores no reciben acceso hasta que se les entregue el código de su equipo.</p>'+
    '<div class="form"><label class="fld"><span>Nombre del club</span><input class="inp" data-inp="clubDraft" data-field="name" maxlength="90" value="'+e(sh.d.name)+'" placeholder="Atlético Monteverde CF"></label>'+
    '<label class="fld"><span>Municipio</span><input class="inp" data-inp="clubDraft" data-field="town" maxlength="80" value="'+e(sh.d.town)+'" placeholder="Dos Hermanas"></label>'+
    '<label class="fld"><span>Provincia</span><input class="inp" data-inp="clubDraft" data-field="province" maxlength="80" value="'+e(sh.d.province)+'"></label>'+
    '<label class="fld"><span>Temporada</span><input class="inp" data-inp="clubDraft" data-field="season" value="'+e(sh.d.season)+'" placeholder="2026/27"></label></div>'+
    '<div class="row end gap foot">'+btn("Cancelar","closeSheet",{},"ghost")+btn(sh.busy?"Creando…":"Crear club","clubCreateSave",{},"primary")+'</div>';
  INP.clubDraft=el=>{if(UI.sheet?.d && ["name","town","province","season"].includes(el.dataset.field))UI.sheet.d[el.dataset.field]=el.value;};
  ACT.clubCreateSave=async()=>{
    const sh=UI.sheet;if(sh?.type!=="clubCreate"||sh.busy)return;
    const d=sh.d;if(d.name.trim().length<2||!/^\d{4}\/\d{2,4}$/.test(d.season.trim())){toast("Escribe un nombre y la temporada en formato 2026/27.","err");return;}
    sh.busy=true;render(true);
    try{
      const id=await Cloud.rpc("bq_create_club",{p_name:d.name.trim(),p_town:d.town.trim(),p_province:d.province.trim(),
        p_season:d.season.trim(),p_settings:{kits:ClubTheme.normalizeKits(),palette:ClubTheme.cleanPalette({}),crest:""}});
      if(UI.sheet===sh)UI.sheet=null;state.selected=id;await refresh();
      toast("Club creado. Ahora añade sus equipos.","ok");
    }catch(err){sh.busy=false;toast("No se pudo crear el club. Comprueba los datos e inténtalo de nuevo.","err");render(true);}
  };
  ACT.clubAddTeamAsk=()=>{
    if(!canSave())return;
    UI.sheet={type:"clubTeamNew",wide:true,d:{name:"",category:"",modality:"F7",competition:""}};
  };
  V.sheet.clubTeamNew=sh=>'<h2>Añadir equipo al club</h2><p class="muted small">El director crea el equipo; el entrenador añadirá plantilla, partidos y entrenamientos al acceder con su código exclusivo.</p>'+
    '<div class="form"><label class="fld"><span>Nombre del equipo</span><input class="inp" maxlength="75" data-inp="clubTeamDraft" data-field="name" placeholder="Benjamín · Liga Educa" value="'+e(sh.d.name)+'"></label>'+
    '<label class="fld"><span>Modalidad</span><select class="sel" data-chg="clubTeamModality"><option value="F7"'+(sh.d.modality==="F7"?" selected":"")+'>Fútbol 7</option><option value="F11"'+(sh.d.modality==="F11"?" selected":"")+'>Fútbol 11</option></select></label>'+
    '<label class="fld"><span>Categoría (opcional)</span><input class="inp" data-inp="clubTeamDraft" data-field="category" placeholder="Benjamín" maxlength="60" value="'+e(sh.d.category)+'"></label>'+
    '<label class="fld"><span>Competición (opcional)</span><input class="inp" data-inp="clubTeamDraft" data-field="competition" placeholder="Liga Educa" maxlength="100" value="'+e(sh.d.competition)+'"></label></div>'+
    '<div class="row end gap foot">'+btn("Cancelar","closeSheet",{},"ghost")+btn(sh.busy?"Creando…":"Crear equipo y código","clubTeamSave",{},"primary")+'</div>';
  INP.clubTeamDraft=el=>{if(UI.sheet?.type==="clubTeamNew" && ["name","category","competition"].includes(el.dataset.field))UI.sheet.d[el.dataset.field]=el.value;};
  CHG.clubTeamModality=el=>{if(UI.sheet?.type==="clubTeamNew")UI.sheet.d.modality=el.value;};
  ACT.clubTeamSave=async()=>{
    const sh=UI.sheet,c=current();if(!c||sh?.type!=="clubTeamNew"||sh.busy)return;
    const d=sh.d;if(d.name.trim().length<2){toast("Escribe el nombre del equipo.","err");return;}
    sh.busy=true;render(true);
    try{
      const data=await Cloud.rpc("bq_create_team",{p_club:c.id,p_name:d.name.trim(),p_category:d.category.trim(),
        p_modality:d.modality,p_competition:d.competition.trim()});
      if(UI.sheet===sh)UI.sheet={type:"clubCodeCreated",code:data.code,name:d.name};
      await Store.loadRoles();await Store.db.refreshNow("seasons");
      await refresh();toast("Equipo creado correctamente.","ok");
    }catch(err){sh.busy=false;toast(err?.message?.includes("team_exists")?"Ya existe un equipo con ese nombre.":"No se pudo crear el equipo. Revisa los datos.","err");render(true);}
  };
  V.sheet.clubCodeCreated=sh=>'<h2>Equipo creado</h2><p>Entrega este código únicamente al entrenador de <b>'+e(sh.name)+'</b>.</p>'+
    '<div class="codebox">'+e(fmtCode(sh.code))+'</div><p class="muted small">El entrenador entra en Banquillo, se registra y confirma su correo. También puede añadir este código después desde su cuenta.</p>'+
    '<div class="row end gap foot">'+btn("Cerrar","closeSheet",{},"primary")+'</div>';
  const teamOf=id=>current()?.teams?.find(t=>t.id===id);

  ACT.clubManageCoaches=async el=>{
    const c=current(),t=teamOf(el.dataset.id);if(!c||!t)return;
    const sh={type:"clubTeamCoaches",wide:true,name:t.name,teamId:t.id,clubId:c.id,loading:true,coachList:[],busy:false,error:""};
    UI.sheet=sh;render(true);
    try{
      const items=await Cloud.rpc("bq_team_coaches",{p_club:c.id,p_season:t.id});
      if(UI.sheet===sh){sh.coachList=Array.isArray(items)?items:[];sh.loading=false;render(true);}
    }catch(_){
      if(UI.sheet===sh){sh.loading=false;sh.error="No se ha podido cargar la lista de entrenadores.";render(true);}
    }
  };
  V.sheet.clubTeamCoaches=sh=>'<h2>Entrenadores · '+e(sh.name)+'</h2>'+
    '<p class="muted small">Los directores pueden retirar únicamente el acceso de este equipo. La cuenta personal del entrenador no se elimina.</p>'+
    (sh.loading?'<p>Cargando entrenadores…</p>':sh.error?'<p class="err">'+e(sh.error)+'</p>':
      sh.coachList.length?'<div class="club-coaches-list">'+sh.coachList.map(coach=>
        '<article class="club-coach-row"><div><b>'+e(coach.display_name)+'</b><p class="muted small">'+
        (coach.role==="editor"?"Entrenador":"Solo lectura")+'</p></div>'+
        btn("Retirar acceso","clubKickCoach",{id:coach.user_id},"ghost small")+'</article>'
      ).join("")+'</div>':'<p class="muted">Este equipo todavía no tiene entrenadores vinculados mediante un código.</p>')+
    '<p class="muted small">Al retirar un entrenador, su membresía se elimina en Supabase y se genera un código nuevo para este equipo. El código anterior deja de servir. Sus datos deportivos permanecen asociados a la temporada.</p>'+
    '<div class="row end gap foot">'+btn("Cerrar","closeSheet",{},"primary")+'</div>';
  ACT.clubKickCoach=async el=>{
    const sh=UI.sheet,c=current();
    if(!sh||sh.type!=="clubTeamCoaches"||sh.busy||c?.id!==sh.clubId)return;
    const coach=sh.coachList.find(x=>x.user_id===el.dataset.id);
    if(!coach)return;
    if(!confirm("¿Retirar a "+coach.display_name+" de "+sh.name+"? Se invalidará el código de acceso anterior. No se borrará su cuenta."))return;
    sh.busy=true;render(true);
    try{
      const result=await Cloud.rpc("bq_remove_team_coach",{p_club:sh.clubId,p_season:sh.teamId,p_user:coach.user_id});
      if(!result?.ok)throw Error("Rechazado");
      sh.coachList=sh.coachList.filter(x=>x.user_id!==coach.user_id);
      await refresh();
      toast("Entrenador retirado. Código del equipo renovado.","ok");
    }catch(_){
      toast("No se pudo retirar. Comprueba que el usuario es entrenador y tienes permisos de dirección.","err");
    }finally{sh.busy=false;if(UI.sheet===sh)render(true);}
  };

  ACT.clubCopyCode=async el=>{
    const t=teamOf(el.dataset.id);if(!t)return;
    try{await navigator.clipboard.writeText(fmtCode(t.code));toast("Código de "+t.name+" copiado.","ok");}
    catch(_){window.prompt("Copia el código exclusivo de "+t.name,fmtCode(t.code));}
  };
  ACT.clubOpenTeam=async el=>{
    const t=teamOf(el.dataset.id);if(!t)return;
    await Store.loadRoles();
    if(!Store.roles[t.id]){toast("Todavía no tienes permiso de acceso a esa temporada.","err");return;}
    Store.selectSeason(t.id);go("inicio");
  };
  ACT.clubRotateCode=async el=>{
    const t=teamOf(el.dataset.id),c=current();if(!t||!c||!confirm("¿Generar un código nuevo solo para "+t.name+"? El anterior dejará de funcionar."))return;
    try{await Cloud.rpc("bq_rotate_team_code",{p_club:c.id,p_season:t.id});await refresh();toast("Código de "+t.name+" renovado.","ok");}
    catch(_){toast("No se pudo cambiar el código.","err");}
  };
  ACT.clubToggleCode=async el=>{
    const t=teamOf(el.dataset.id),c=current();if(!t||!c)return;
    try{await Cloud.rpc("bq_set_team_code_enabled",{p_club:c.id,p_season:t.id,p_enabled:!t.enabled});await refresh();}
    catch(_){toast("No se pudo modificar el acceso.","err");}
  };
  ACT.clubAddDirectorAsk=()=>{const c=current();if(c?.role!=="owner")return;UI.sheet={type:"clubDirectorNew",email:"",busy:false};};
  V.sheet.clubDirectorNew=sh=>'<h2>Añadir segundo director deportivo</h2><p class="muted small">Debe tener ya una cuenta confirmada en Banquillo Beta. Recibirá los mismos permisos de gestión de los equipos, pero no un código de entrenador.</p>'+
    '<label class="fld"><span>Correo de la cuenta del director</span><input class="inp" type="email" data-inp="clubDirectorEmail" autocomplete="off" value="'+e(sh.email)+'" placeholder="correo de la cuenta registrada"></label>'+
    '<div class="row end gap foot">'+btn("Cancelar","closeSheet",{},"ghost")+btn("Añadir director","clubDirectorSave",{},"primary")+'</div>';
  INP.clubDirectorEmail=el=>{if(UI.sheet?.type==="clubDirectorNew")UI.sheet.email=el.value;};
  ACT.clubDirectorSave=async()=>{
    const sh=UI.sheet,c=current();if(!sh||sh.type!=="clubDirectorNew"||!c||sh.busy)return;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sh.email.trim())){toast("Introduce un correo válido.","err");return;}
    sh.busy=true;render(true);
    try{
      await Cloud.rpc("bq_add_director",{p_club:c.id,p_email:sh.email.trim()});if(UI.sheet===sh)UI.sheet=null;
      await refresh();toast("Segundo director añadido.","ok");
    }catch(_){sh.busy=false;toast("No se pudo añadir. Confirma que la cuenta existe y su correo está verificado.","err");render(true);}
  };
  ACT.clubRemoveDirector=async el=>{
    const c=current();if(c?.role!=="owner"||!confirm("¿Quitar a este director de la gestión de todos los equipos?"))return;
    try{await Cloud.rpc("bq_remove_director",{p_club:c.id,p_user:el.dataset.id});await refresh();toast("Director retirado.","ok");}
    catch(_){toast("No se pudo retirar al director.","err");}
  };
  ACT.clubSettingsAsk=el=>{
    const c=current();if(!c)return;
    const x=c.settings||{};
    UI.sheet={type:"clubSettings",wide:true,page:el?.dataset?.page||"data",
      d:{name:c.name,town:c.town,province:c.province,season:c.season,
      crest:ClubCrest.clean(x.crest),kits:ClubTheme.normalizeKits(x.kits),palette:ClubTheme.cleanPalette(x.palette),
      facilities:{f11:Number(c.facilities?.f11)||0,f7:Number(c.facilities?.f7)||0,
        divisible:Array.isArray(c.facilities?.divisible)?[...c.facilities.divisible]:[]}}};
  };
  ACT.clubSettingsPage=el=>{if(UI.sheet?.type==="clubSettings"&&["data","kits","palette","facilities"].includes(el.dataset.page))UI.sheet.page=el.dataset.page;};
  V.sheet.clubSettings=sh=>{
    const d=sh.d,p=sh.page||"data",tabs=[["data","Datos y escudo"],["kits","Equipaciones"],["palette","Identidad visual"],["facilities","Instalaciones"]];
    const nav='<div class="settings-visual-tabs">'+tabs.map(([k,l])=>'<button type="button" data-act="clubSettingsPage" data-page="'+k+'" class="'+(p===k?"on":"")+'">'+l+'</button>').join("")+'</div>';
    const general='<div class="form"><label class="fld"><span>Club</span><input class="inp" data-inp="clubSettingsField" data-field="name" value="'+e(d.name)+'"></label>'+
       '<label class="fld"><span>Municipio</span><input class="inp" data-inp="clubSettingsField" data-field="town" value="'+e(d.town)+'"></label>'+
       '<label class="fld"><span>Provincia</span><input class="inp" data-inp="clubSettingsField" data-field="province" value="'+e(d.province)+'"></label>'+
       '<label class="fld"><span>Temporada</span><input class="inp" data-inp="clubSettingsField" data-field="season" value="'+e(d.season)+'"></label>'+
       (d.crest?'<div class="file-picker-preview">'+ClubCrest.preview(d.crest)+'</div>':"")+
       FilePicker.render({title:"Escudo del club",formats:"PNG · JPG · WEBP",help:"Hasta 3 MB · Imagen transparente recomendada",
         icon:"🛡️",label:"Elegir escudo",accept:"image/png,image/jpeg,image/webp",change:"clubCrest"})+
       (d.crest?btn("Quitar escudo","clubRemoveCrest",{},"ghost"):"")+'</div>';
    const fac=d.facilities;
    const fields='<div class="form"><p>Un F11 divisible puede utilizarse como dos F7. Configura las instalaciones físicas reales.</p>'+
      '<label class="fld"><span>Número de campos F11</span><input class="inp" type="number" min="0" max="12" data-chg="clubFacilityCount" data-field="f11" value="'+Number(fac.f11)+'"></label>'+
      '<label class="fld"><span>Campos F7 independientes</span><input class="inp" type="number" min="0" max="12" data-chg="clubFacilityCount" data-field="f7" value="'+Number(fac.f7)+'"></label>'+
      Array.from({length:fac.f11},(_,i)=>'<label class="chk"><input type="checkbox" data-chg="clubFacilityDivisible" data-i="'+i+'"'+(fac.divisible[i]?" checked":"")+'><span>Campo F11 '+(i+1)+' divisible en dos F7</span></label>').join("")+
      '</div>';
    const body=p==="kits"?ClubKitsEditor.renderKits(d,"set"):p==="palette"?ClubKitsEditor.renderPalette(d,"set"):p==="facilities"?fields:general;
    return '<h2>Configuración del club</h2>'+nav+body+
      '<div class="row end gap foot">'+btn("Cancelar","closeSheet",{},"ghost")+btn(sh.busy?"Guardando…":"Guardar configuración","clubSettingsSave",{},"primary")+'</div>';
  };
  INP.clubSettingsField=el=>{if(UI.sheet?.type==="clubSettings"&&["name","town","province","season"].includes(el.dataset.field))UI.sheet.d[el.dataset.field]=el.value;};
  CHG.clubFacilityCount=el=>{
    if(UI.sheet?.type!=="clubSettings")return;
    const k=el.dataset.field;if(!["f11","f7"].includes(k))return;
    const n=Math.min(12,Math.max(0,Number(el.value)||0)),d=UI.sheet.d.facilities;d[k]=n;
    if(k==="f11")d.divisible.length=n;
  };
  CHG.clubFacilityDivisible=el=>{if(UI.sheet?.type==="clubSettings")UI.sheet.d.facilities.divisible[Number(el.dataset.i)]=el.checked;};
  CHG.clubCrest=async el=>{
    const sh=UI.sheet;if(sh?.type!=="clubSettings"||!el.files?.[0])return;
    try{sh.d.crest=await ClubCrest.upload(el.files[0]);toast("Escudo preparado. Pulsa Guardar configuración.","ok");}
    catch(err){toast(err.message||"No se pudo cargar el escudo.","err");}
    render(true);
  };
  ACT.clubRemoveCrest=()=>{if(UI.sheet?.type==="clubSettings")UI.sheet.d.crest="";};
  ACT.clubSettingsSave=async()=>{
    const c=current(),sh=UI.sheet;if(!c||sh?.type!=="clubSettings"||sh.busy)return;
    const d=sh.d;
    if(d.name.trim().length<2||!/^\d{4}\/\d{2,4}$/.test(d.season.trim())){toast("Revisa el nombre y la temporada (2026/27).","err");return;}
    sh.busy=true;render(true);
    try{
      await Cloud.rpc("bq_update_club",{p_club:c.id,p_name:d.name.trim(),p_town:d.town.trim(),p_province:d.province.trim(),
        p_season:d.season.trim(),p_settings:{crest:ClubCrest.clean(d.crest),kits:ClubTheme.normalizeKits(d.kits),palette:ClubTheme.cleanPalette(d.palette)},
        p_facilities:d.facilities});
      if(UI.sheet===sh)UI.sheet=null;await refresh();toast("Configuración del club guardada.","ok");
    }catch(_){sh.busy=false;toast("No se pudo guardar la configuración del club.","err");render(true);}
  };
  ACT.openCoachInbox=async()=>{
    const sh={type:"coachInbox",wide:true,loading:true,items:[],error:""};
    UI.sheet=sh;render(true);
    try{
      const items=await Cloud.rpc("bq_my_team_inbox");
      if(UI.sheet!==sh)return;
      sh.items=Array.isArray(items)?items:[];sh.loading=false;render(true);
      if(sh.items.some(n=>n.resolved_at)){
        // A la entrada: el aviso corregido se cubre de verde y desaparece.
        setTimeout(()=>{
          if(UI.sheet!==sh)return;
          sh.items=sh.items.filter(n=>!n.resolved_at);
          render(true);
        },1100);
      }
    }catch(_){
      if(UI.sheet===sh){sh.loading=false;sh.error="No se pudo abrir el buzón. Comprueba tu conexión.";render(true);}
    }
  };
  V.sheet.coachInbox=sh=>'<h2>Avisos de Dirección Deportiva</h2>'+
    '<p class="muted small">Solo mensajes de tus equipos. Abre uno para ir a la ficha de la jornada correspondiente.</p>'+
    (sh.loading?'<p>Cargando avisos…</p>':sh.error?'<p class="err">'+e(sh.error)+'</p>':
      sh.items.length?'<div class="club-coaches-list">'+sh.items.map(n=>
       '<article class="club-live-notice '+(n.resolved_at?"bq-resolved":"")+'">'+
       '<div class="club-team-top"><div><b>'+e(n.team)+'</b><p class="muted small">'+e(n.director)+' · '+e(n.created_at?.slice(0,10))+'</p></div>'+
       '<span class="tag '+(n.read_at?"":"warn")+'">'+(n.resolved_at?"Corregido":n.delivery==="reminder"?"Recordatorio":"Aviso")+'</span></div>'+
       '<p><b>Dirección deportiva:</b> no se ha cerrado el acta de la Jornada '+e(n.jornada)+' ('+e(n.rival)+').</p>'+
       (!n.resolved_at?btn("Abrir acta de la jornada","coachOpenNotice",{id:n.id},"primary small"):"")+
       '</article>').join("")+'</div>':'<p class="muted">No tienes avisos pendientes.</p>')+
    '<div class="row end gap foot">'+btn("Cerrar","closeSheet",{},"ghost")+btn("Actualizar avisos","openCoachInbox",{},"primary")+'</div>';
  ACT.coachOpenNotice=async el=>{
    const sh=UI.sheet;if(!sh||sh.type!=="coachInbox")return;
    const n=sh.items.find(n=>n.id===el.dataset.id);if(!n||n.resolved_at)return;
    try{await Cloud.rpc("bq_read_team_notice",{p_inbox:n.id});}catch(_){/* el enlace sigue disponible */}
    const allowed=Store.roles?.[n.season_id];
    if(!allowed){toast("Ya no tienes acceso a este equipo.","err");return;}
    UI.sheet=null;
    if(Store.sid!==n.season_id)Store.selectSeason(n.season_id);
    if(n.jornada){go("partido",n.jornada);UI.matchTab="ficha";render(true);}
    else{go("partidos");toast("Busca la jornada pendiente para completar su acta.","");}
  };
  const reset=()=>{
    state.clubs=null;state.selected=null;state.loading=false;state.error="";state.tab="teams";
    state.notices=[];state.noticeLoading=false;state.noticeError="";state.noticeModality="todos";
  };
  return {state,current,refresh,clubPage,reset};
})();
V.clubes=()=>ClubSpace.clubPage();
