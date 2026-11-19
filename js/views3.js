/* ===== Vistas: Informes (IA + PDF), Temporadas, asistente de nueva temporada, ajustes ===== */

/* ---------- IA ---------- */
const AI_MSG = {
  insufficient_tokens: "Te has quedado sin Silbatos. Puedes escribir el texto tú mismo o conseguir más desde Mi cuenta.",
  auth: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  rate_limited: "Demasiadas peticiones seguidas. Espera un momento e inténtalo de nuevo.",
  ai_not_deployed: "La función de IA todavía no está activada en este servidor.",
  ai_unavailable: "La IA no está disponible ahora mismo. No se te ha cobrado ningún Silbato.",
  empty_completion: "La IA no ha devuelto texto. No se te ha cobrado ningún Silbato.",
  unavailable: "No hay conexión con el servidor. Inténtalo de nuevo.",
};
const aiErr = e => AI_MSG[e && e.code] || "No se ha podido redactar el texto ahora mismo. Inténtalo de nuevo.";
async function aiSample(prompt, signal, kind) {
  const t = await Cloud.ai(prompt, kind || "report", signal);
  if (!t) throw { code: "empty_completion" };
  return t;
}
const AI_STOP = ["insufficient_tokens", "auth", "rate_limited", "ai_not_deployed", "ai_unavailable", "unavailable"];
function reportPrompt(pid) {
  const D = playerReportData(pid), { s, t } = D;
  const pj = Calc.record(Store.matches).pj;
  // PRIVACIDAD: el proveedor IA no recibe nombre, dorsal, notas libres ni motivos médicos/personales.
  return `Redacta en español de España un informe individual de fútbol base para la familia de una persona menor de edad.
Usa exclusivamente el identificador literal [JUGADOR] para referirte al jugador, sin inventar ningún nombre propio.

DATOS ANÓNIMOS:
- Partidos del equipo: ${pj}
- Convocatorias: ${s.conv} de ${D.regCount}
- Partidos disputados: ${s.played}, titular ${s.T}, suplente ${s.S}
- Minutos disputados: ${s.min ? fmtNum(s.min) : 0}
- Goles: ${s.goals}
- Partidos como portero: ${s.gk}
- Asistencia a entrenamientos: ${fmtPct(t.pct)}

REGLAS: informe positivo y constructivo, entre 110 y 160 palabras, dos o tres párrafos.
Conserva literalmente [JUGADOR] cada vez que menciones al jugador. No menciones ausencias,
lesiones, datos médicos, notas privadas, domicilios, colegios ni nombres de clubes.
No inventes jugadas, cualidades ni resultados. Sin títulos ni listas.`;
}
// La sustitución por el nombre ocurre únicamente en el dispositivo, DESPUÉS de recibir el texto.
const nameLocalReport = (pid, text) => {
  const p = Store.player(pid), first = p?.name?.trim().split(/\s+/)[0];
  return first ? String(text).replace(/\[JUGADOR\]/g, first) : String(text);
};
function setReport(pid, text, source) {
  const cur = Store.reports[pid] || { id: pid };
  Store.reports[pid] = { ...cur, id: pid, text, source: source || cur.source || "manual", updatedAt: new Date().toISOString() };
  Store.save("report", Store.reports[pid]);
}
async function genReport(pid, signal) {
  UI.ai.busy = UI.ai.busy || {}; UI.ai.busy[pid] = true; UI.ai.err = null; render(true);
  try { const text = nameLocalReport(pid, await aiSample(reportPrompt(pid), signal)); setReport(pid, text, "ia"); if (UI.sheet && UI.sheet.type === "report" && UI.sheet.pid === pid) UI.sheet.draft = text; return true; }
  catch (e) { if (e && e.code === "insufficient_tokens") Cloud.loadProfile(); if (!(e && e.code === "cancelled")) UI.ai.err = { pid, msg: aiErr(e), code: e && e.code }; return false; }
  finally { UI.ai.busy[pid] = false; render(true); }
}
ACT.genOne = async el => { await genReport(el.dataset.p); };
ACT.genAll = async () => {
  const todo = Store.activePlayers().filter(p => !(Store.reports[p.id] && Store.reports[p.id].text));
  if (!todo.length) { toast("Todos los jugadores ya tienen informe."); return; }
  const have = Cloud.tokens();
  if (have < 1) { toast("No te quedan Silbatos para redactar con IA.", "err"); UI.sheet = { type: "account" }; return; }
  if (have < todo.length) { toast(`Tienes ${have} Silbatos: redactaré ${have} informes.`, ""); todo.length = have; }
  const ctl = new AbortController();
  UI.ai.bulk = { done: 0, total: todo.length, ctl }; render(true);
  for (const p of todo) {
    if (ctl.signal.aborted) break;
    const ok = await genReport(p.id, ctl.signal);
    if (!ok) { if (!ctl.signal.aborted && UI.ai.err && AI_STOP.includes(UI.ai.err.code)) break; continue; }
    UI.ai.bulk.done++; render(true);
  }
  const b = UI.ai.bulk; UI.ai.bulk = null; render(true);
  if (b && b.done) toast(`${b.done} informes redactados. Revísalos antes de descargarlos.`, "ok");
};
ACT.stopAll = () => { if (UI.ai.bulk) UI.ai.bulk.ctl.abort(); };
ACT.genCron = async () => {
  const m = curMatch(); if (!m) return;
  const i = Calc.matchInfo(m);
  // No se transmite al proveedor IA ningún nombre de jugador, club, rival o nota libre.
  const sc = {}, goals = (m.scorers || []).slice(0, m.ourGoals);
  goals.forEach(id => { if (id && id !== "og") sc[id] = (sc[id] || 0) + 1; });
  const og = goals.filter(id => id === "og").length;
  const prompt = `Escribe una crónica breve de fútbol base de 60 a 90 palabras, en español de España.
Sin títulos, emojis ni nombres propios. No inventes jugadas ni datos.
- Jornada: ${m.n}
- Local o visitante: ${m.home ? "local" : "visitante"}
- Goles del equipo: ${m.ourGoals}; goles del rival: ${m.rivalGoals}
- Resultado: ${i.res === "V" ? "victoria" : i.res === "E" ? "empate" : "derrota"}
- Número de jugadores convocados: ${calledPlayers(m).length}
- Número de goleadores diferentes: ${Object.keys(sc).length}
- Distribución anónima de goles por jugador: ${Object.values(sc).join(", ") || "sin asignar"}
- Goles en propia puerta rival: ${og}
Usa expresiones genéricas "nuestro equipo" y "el rival". No menciones nombres de menores ni lesiones.`;
  UI.ai.busyCron = true; UI.ai.cronErr = null; render(true);
  try { UI.ai["cron" + m.n] = await aiSample(prompt, undefined, "cron"); } catch (e) { UI.ai.cronErr = aiErr(e); }
  UI.ai.busyCron = false; render(true);
};
ACT.copyCron = async () => {
  const t = UI.ai["cron" + UI.route.arg]; if (!t) return;
  try { await navigator.clipboard.writeText(t); toast("Texto copiado.", "ok"); }
  catch (e) { const a = $("#cronTxt"); if (a) { a.removeAttribute("readonly"); a.select(); } toast("Selecciona el texto y cópialo.", ""); }
};

/* ---------- INFORMES ---------- */
V.informes = () => {
  const ps = Store.activePlayers(), ms = Store.matches, rec = Calc.record(ms), ts = trainStats();
  const mot = { DT: 0, LS: 0, MP: 0 }; ms.forEach(m => (m.noCall || []).forEach(x => { if (x.m in mot) mot[x.m]++; }));
  const withRep = ps.filter(p => Store.reports[p.id] && Store.reports[p.id].text).length;
  const bulk = UI.ai.bulk;
  const rows = ps.map(p => {
    const s = pStats(p), t = ts.per[p.id] || {}, r = Store.reports[p.id], busy = UI.ai.busy && UI.ai.busy[p.id];
    const st = busy ? `<span class="tag wait">Redactando…</span>` : r && r.text ? `<span class="tag ok">${r.source === "ia" ? "IA" : r.source === "editado" ? "Editado" : "Escrito"}</span>` : `<span class="tag">Sin informe</span>`;
    return `<li class="irow"><div class="ir-n">${dorsalBadge(p)}<div><b>${esc(p.name)}</b><small>${s.played} partidos · ${s.goals} goles · ${s.min ? fmtNum(s.min) : 0} min · ${fmtPct(t.pct)} entrenos</small></div></div>
      <div class="ir-a">${st}${btn(r && r.text ? "Revisar" : "Redactar", "openReport", { p: p.id }, "ghost small")}${btn("PDF", "dlPdf", { p: p.id }, "ghost small", "down")}</div></li>`;
  }).join("");
  const err = UI.ai.err && !bulk ? `<p class="err small">${esc(UI.ai.err.msg)}</p>` : "";
  return `${pageHead("Informes", `Temporada ${esc(Store.season().name)} · ${rec.pj} partidos jugados`, btn(UI.ai.busyXlsx ? "Preparando…" : "Exportar Excel", "dlXlsx", {}, "ghost", "down"))}
    <section class="tiles">
      <div class="tile win"><b>${rec.v}</b><span>Victorias</span></div><div class="tile draw"><b>${rec.e}</b><span>Empates</span></div><div class="tile loss"><b>${rec.d}</b><span>Derrotas</span></div>
      <div class="tile"><b>${rec.gf}<s>-</s>${rec.gc}</b><span>Goles a favor / en contra</span></div>
      <div class="tile"><b>${fmtPct(ts.teamPct)}</b><span>Asistencia media</span></div><div class="tile"><b>${mot.DT + mot.LS + mot.MP}</b><span>Veces sin convocar</span></div>
    </section>
    <section class="card">
      <div class="card-h"><h3>Informes individuales</h3><span class="count ${withRep === ps.length && ps.length ? "ok" : ""}">${withRep} de ${ps.length} redactados</span></div>
      <p class="muted small">Cada jugador tiene su propio informe en PDF con sus números de la temporada y una valoración. La IA redacta la valoración con los datos y tus notas del jugador; tú puedes revisarla y editarla antes de descargar.</p>
      <div class="row gap wrap tool">${bulk ? `${btn("Detener", "stopAll", {}, "ghost")}<span class="muted small">Redactando ${bulk.done + 1} de ${bulk.total}…</span>` : btn("Redactar los que faltan con IA", "genAll", {}, "primary", "spark")}${btn(UI.ai.busyZip ? "Preparando ZIP…" : "Descargar todos (ZIP)", "dlZip", {}, "ghost", "down")}</div>
      ${bulk ? `<div class="prog"><i style="width:${Math.round(bulk.done / bulk.total * 100)}%"></i></div>` : ""}${err}
      <ul class="ilist">${rows}</ul></section>`;
};
ACT.openReport = el => { const p = Store.player(el.dataset.p), r = Store.reports[p.id]; UI.sheet = { type: "report", pid: p.id, draft: r ? r.text || "" : "", wide: true }; UI.ai.err = null; };
V.sheet.report = sh => {
  const p = Store.player(sh.pid), s = pStats(p), t = (trainStats().per[p.id]) || {}, busy = UI.ai.busy && UI.ai.busy[p.id], r = Store.reports[p.id];
  const words = (sh.draft || "").trim() ? (sh.draft || "").trim().split(/\s+/).length : 0;
  return `<h2>Informe de ${esc(p.name)}</h2>
    <p class="muted small">${s.conv} convocatorias · ${s.played} partidos jugados (${s.T} titular, ${s.S} suplente) · ${s.min ? fmtNum(s.min) : 0} min · ${s.goals} goles · ${fmtPct(t.pct)} asistencia</p>
    <label class="fld"><span>Notas del entrenador (la IA las usa)</span><textarea class="inp area" rows="3" data-inp="pNotes" data-p="${p.id}" placeholder="Fortalezas, aspectos a mejorar, actitud…">${esc(p.notes || "")}</textarea></label>
    <label class="fld"><span>Valoración que aparecerá en el PDF <em class="muted">${words} palabras</em></span><textarea class="inp area" id="repTxt" rows="10" data-inp="repText" data-p="${p.id}" placeholder="Pulsa «Redactar con IA» o escribe la valoración tú mismo.">${esc(sh.draft || "")}</textarea></label>
    ${UI.ai.err && UI.ai.err.pid === p.id ? `<p class="err small">${esc(UI.ai.err.msg)}</p>` : ""}
    <div class="row gap wrap between foot"><div class="row gap wrap">${btn(busy ? "Redactando…" : r && r.text ? "Volver a redactar con IA" : "Redactar con IA", "genOne", { p: p.id }, "ghost", "spark")}</div><div class="row gap wrap">${btn(UI.ai.busyPdf === p.id ? "Preparando…" : "Descargar PDF", "dlPdf", { p: p.id }, "primary", "down")}</div></div>
    <p class="muted small">Se guarda solo mientras escribes.</p>`;
};
INP.repText = el => {
  const pid = el.dataset.p; if (UI.sheet) UI.sheet.draft = el.value;
  const cur = Store.reports[pid];
  Store.reports[pid] = { ...(cur || { id: pid }), id: pid, text: el.value, source: cur && cur.source === "ia" ? "editado" : (cur && cur.source) || "manual", updatedAt: new Date().toISOString() };
  Store.save("report", Store.reports[pid]);
};

/* ---------- TEMPORADAS ---------- */
V.temporadas = () => {
  const links = Store.clubLinks || [];
  const linkFor = sid => links.find(x=>x.season_id===sid);
  const cards=Store.seasons.map(season=>{
    const on=season.id===Store.sid,link=linkFor(season.id),role=Store.roles[season.id];
    const name=link?.team_name||season.club||"Mi equipo";
    const permission=role==="owner"?"Responsable":link?.manager?"Dirección deportiva":role==="editor"?"Entrenador":"Solo lectura";
    return '<li class="bq-cloud-team '+(on?"is-active":"")+'"><div class="bq-cloud-team-main">'+
      '<div class="bq-cloud-team-icon">⚽</div><div class="bq-cloud-team-copy"><strong>'+esc(name)+'</strong>'+
      '<span>Temporada '+esc(season.name)+'</span><div class="bq-cloud-tags">'+
      '<span>'+(link?.archived?"Archivado":link?"Equipo de club":"Independiente")+'</span><span>'+esc(permission)+'</span>'+
      (season.status==="closed"?'<span>Cerrada</span>':"")+'</div></div></div>'+
      '<div class="bq-cloud-actions">'+btn(on?"Seleccionado":"Entrar","openSeason",{id:season.id},on?"ghost small":"primary small")+
      btn("⚙ Ajustes","teamCloudSettings",{id:season.id},"ghost small")+'</div></li>';
  }).join("");
  const hasClub=Store.seasons.some(season=>!!linkFor(season.id));
  return pageHead("Mis equipos","Elige tu equipo o entra en sus ajustes.",
    '<div class="row gap wrap">'+btn("Código de equipo de club","openTeamJoin",{},"ghost","users")+btn("Código de equipo independiente","openJoin",{},"ghost")+
    btn("Crear equipo independiente","wizStart",{},"primary","plus")+'</div>')+
    (typeof TeamRequests !== "undefined" ? TeamRequests.panel() : "")+
    '<ul class="bq-cloud-grid">' +(cards||'<li class="card">Todavía no tienes equipos.</li>')+'</ul>'+
    (hasClub?'<p class="muted small">Los equipos de club se administran desde Dirección Deportiva.</p>':"");
};
ACT.teamCloudSettings=el=>{
  const sid=el?.dataset?.id;
  if(!Store.seasons.some(s=>s.id===sid)){toast("Equipo no disponible.","err");return;}
  UI.sheet={type:"teamCloudSettings",sid};
};
V.sheet.teamCloudSettings=sh=>{
  const s=Store.seasons.find(x=>x.id===sh.sid);
  if(!s)return '<h2>Equipo no disponible</h2>';
  const link=(Store.clubLinks||[]).find(x=>x.season_id===sh.sid);
  const owner=Store.roles[sh.sid]==="owner";
  const accessReady=Store.clubLinksReady;
  const role=owner?"Responsable":link?.manager?"Dirección deportiva":Store.roles[sh.sid]==="editor"?"Entrenador":"Solo lectura";
  return '<h2>⚙ '+esc(link?.team_name||s.club||"Mi equipo")+'</h2>'+
    '<p class="muted small">Temporada '+esc(s.name)+' · '+(link?"Equipo de club":"Equipo independiente")+'</p>'+
    '<section class="card flat"><h3>Datos del equipo</h3><p>Permiso: <b>'+esc(role)+'</b></p>'+
    '<p>Temporada: <b>'+esc(s.status==="closed"?"Cerrada":"Abierta")+'</b></p></section>'+
    '<div class="row gap wrap">'+
    (!accessReady?'<p class="muted small">Los permisos del equipo todavía no están disponibles.</p>':
      link?.manager?btn("Gestionar club y entrenadores","teamCloudClub",{id:link.club_id,team:link.team_id},"ghost"):
      link&&!link.archived?btn("Abandonar equipo","leaveTeamAsk",{id:link.team_id,sid:sh.sid},"ghost danger-t"):
      !link&&owner?(s.status==="closed"?"":btn("Modificar valores","teamCloudEdit",{id:sh.sid},"ghost"))+
        btn("Compartir y gestionar entrenadores","teamCloudMembers",{id:sh.sid},"ghost")+
        btn(s.status==="closed"?"Reabrir temporada":"Cerrar temporada","teamCloudSeasonStatus",{id:sh.sid},"ghost")+
        btn("Eliminar equipo","seasonDelAsk",{id:sh.sid},"ghost danger-t"):
      !link?btn("Abandonar equipo","leaveAsk",{id:sh.sid},"ghost danger-t"):"")+
    '</div>'+
    '<div class="row end foot">'+btn("Cerrar","closeSheet",{},"primary")+'</div>';
};
function selectIndependentTeam(el) {
  const sid=el.dataset.id;
  if (!Store.clubLinksReady || Store.roles[sid] !== "owner" ||
      Store.clubLinks.some(link=>link.season_id===sid) || !Store.seasons.some(s=>s.id===sid)) return false;
  if (Store.sid!==sid) Store.selectSeason(sid);
  UI.sheet=null;
  return true;
}
ACT.teamCloudEdit=el=>{if(selectIndependentTeam(el)&&!Store.readOnly())ACT.openSettings();};
ACT.teamCloudMembers=el=>{if(selectIndependentTeam(el))ACT.openShare();};
ACT.teamCloudSeasonStatus=el=>{
  if (!selectIndependentTeam(el)) return;
  if (Store.season()?.status==="closed") ACT.reopenSeason();
  else ACT.closeSeasonAsk();
};
ACT.teamCloudClub=el=>{UI.sheet=null;ACT.openClubPanel(el);};
ACT.openSeason = el => { const id=el?.dataset?.id;if(!Store.seasons.some(x=>x.id===id)){toast("Este equipo no está disponible en tu cuenta.","err");return;} Store.selectSeason(id); go("inicio"); toast("Has abierto la temporada seleccionada.","ok"); };
ACT.openClubPanel = el => {
  const clubId=el?.dataset?.id,teamId=el?.dataset?.team;
  const permitted=(Store.clubLinks||[]).some(x=>x.club_id===clubId&&x.manager&&(!teamId||x.team_id===teamId));
  if(!permitted){toast("Esta cuenta no tiene permiso para gestionar ese equipo.","err");return;}
  const query=new URLSearchParams({club:clubId});
  if(teamId)query.set("team",teamId);
  location.href="clubes.html?"+query.toString();
};
ACT.refreshSeasonLinks = async () => {
  await Store.loadRoles();
  await Store.loadClubLinks();
  await Store.db.refreshNow("seasons");
  toast("Cuentas y permisos actualizados.","ok");
};
ACT.closeSeasonAsk = () => confirmSheet("¿Cerrar la temporada?", "Se marcará como terminada. Seguirás pudiendo consultar y descargar sus datos.", "Cerrar temporada", "closeSeason", {id:Store.sid}, false);
ACT.closeSeason = el => {
  if (!Store.setIndependentSeasonStatus(el.dataset.id, "closed")) {
    toast("No tienes permiso para cerrar esta temporada.", "err"); return;
  }
  UI.sheet=null;
  toast("Temporada cerrada.", "ok");
};
ACT.reopenSeason = () => {
  if (!Store.setIndependentSeasonStatus(Store.sid, "active")) {
    toast("No tienes permiso para reabrir esta temporada.", "err"); return;
  }
  toast("Temporada reabierta.", "ok");
};

/* ---------- AJUSTES de la temporada ---------- */
ACT.openSettings = () => {
  const s = Store.season(), st = s.settings || {};
  UI.sheet = { type: "settings", wide: true, page:"data", d: { club: s.club || "", category: s.category || "", matchMinutes: st.matchMinutes || 50, format: st.format || "F7", crest: ClubCrest.current(s), kits: ClubTheme.normalizeKits(st.kits), palette: ClubTheme.cleanPalette(st.palette), trainStart: st.trainStart || "", trainEnd: st.trainEnd || "", trainDays: [...(st.trainDays || [1, 3])] } };
};
const crestControl = (data, change, remove) => `
    <div class="card flat"><div class="card-h"><h3>Escudo del equipo</h3><span class="tag">Opcional</span></div>
    <p class="muted small">Aparecerá en Banquillo, informes individuales y actas PDF. Sube un PNG transparente si es posible. Puedes preparar la imagen con
    <a href="https://www.canva.com/es_es/funciones/quitar-fondo-imagen/" target="_blank" rel="noopener noreferrer">Quitafondos de Canva</a>
    (servicio externo, algunas funciones requieren pago). No es obligatorio utilizar Canva.</p>
    ${data ? `<div class="file-picker-preview">${ClubCrest.preview(data)}<div class="file-picker-preview-copy"><strong>Escudo seleccionado</strong><small>Se utilizará en la temporada, los informes y las actas</small></div></div>` : ""}
    ${FilePicker.render({title:"Escudo del equipo",formats:"PNG · JPG · WEBP",help:"Hasta 3 MB · Se ajustará automáticamente al tamaño de los informes",icon:"🛡️",label:data?"Cambiar imagen":"Elegir imagen",accept:"image/png,image/jpeg,image/webp",change})}
    ${data ? `<div class="file-picker-actions">${btn("Quitar escudo", remove, {}, "ghost")}</div>` : ""}
    </div>`;
const DAYSEL = [[1, "Lun"], [2, "Mar"], [3, "Mié"], [4, "Jue"], [5, "Vie"], [6, "Sáb"], [0, "Dom"]];
V.sheet.settings = sh => {
  const d=sh.d,pg=sh.page||"data",tabs=[["data","Datos"],["kits","Equipaciones"],["palette","Identidad visual"]];
  const nav='<div class="settings-visual-tabs" role="navigation" aria-label="Apartados de configuración">'+tabs.map(([id,title])=>
    '<button type="button" data-act="settingsPage" data-page="'+id+'" class="'+(pg===id?"on":"")+'" aria-current="'+(pg===id?"page":"false")+'">'+title+'</button>').join("")+'</div>';
  const general='<div class="form"><label class="fld"><span>Club</span><input type="text" class="inp" data-inp="setClub" value="'+esc(d.club)+'"></label>'+
    '<label class="fld"><span>Categoría</span><input type="text" class="inp" data-inp="setCat" value="'+esc(d.category)+'"></label>'+
    crestControl(d.crest,"setCrest","removeCrest")+
    '<label class="fld"><span>Formato de fútbol</span><select class="sel" data-chg="setFormat"><option value="F7"'+(d.format==="F7"?" selected":"")+'>Fútbol 7</option><option value="F11"'+(d.format==="F11"?" selected":"")+'>Fútbol 11</option></select></label>'+
    '<label class="fld"><span>Duración del partido (minutos)</span><input type="text" inputmode="numeric" class="inp mini" data-inp="setMin" value="'+esc(d.matchMinutes)+'"></label>'+
    '<div class="fld"><span>Días de entrenamiento</span><div class="chips">'+DAYSEL.map(([v,l])=>'<button type="button" class="chip '+(d.trainDays.includes(v)?"on":"")+'" data-act="setDay" data-v="'+v+'">'+l+'</button>').join("")+'</div></div>'+
    '<div class="row gap wrap"><label class="fld grow"><span>Primer entreno</span><input type="date" class="inp" data-inp="setStart" value="'+esc(d.trainStart)+'"></label><label class="fld grow"><span>Último entreno</span><input type="date" class="inp" data-inp="setEnd" value="'+esc(d.trainEnd)+'"></label></div>'+
    '<p class="muted small">Los cambios se aplicarán al pulsar Guardar ajustes.</p></div>';
  const body=pg==="kits"?ClubKitsEditor.renderKits(d,"set"):pg==="palette"?ClubKitsEditor.renderPalette(d,"set"):general;
  return '<h2>Ajustes de la temporada '+esc(Store.season().name)+'</h2>'+nav+body+
    '<div class="row end gap foot">'+btn("Cancelar","closeSheet",{},"ghost")+btn("Guardar ajustes","saveSettings",{},"primary")+'</div>';
};
ACT.settingsPage = el => {
  if(UI.sheet?.type==="settings" && ["data","kits","palette"].includes(el.dataset.page))
    UI.sheet.page=el.dataset.page;
};
CHG.setCrest = async el => {
  const d = UI.sheet && UI.sheet.d;
  if (!d || !el.files || !el.files[0]) return;
  try { d.crest = await ClubCrest.upload(el.files[0]); toast("Escudo preparado. Pulsa Guardar ajustes para aplicarlo.", "ok"); }
  catch (e) { toast(e.message || "No se pudo procesar el escudo.", "err"); }
  render(true);
};
ACT.removeCrest = () => { UI.sheet.d.crest = ""; };
INP.setClub = el => { UI.sheet.d.club = el.value; };
INP.setCat = el => { UI.sheet.d.category = el.value; };
INP.setMin = el => { UI.sheet.d.matchMinutes = el.value; }; CHG.setFormat = el => { UI.sheet.d.format = el.value; }; INP.setKit = el => { UI.sheet.d.kits[el.dataset.kit][el.dataset.part] = el.value; };
INP.setStart = el => { UI.sheet.d.trainStart = el.value; };
INP.setEnd = el => { UI.sheet.d.trainEnd = el.value; };
ACT.setDay = el => { const v = +el.dataset.v, a = UI.sheet.d.trainDays; UI.sheet.d.trainDays = a.includes(v) ? a.filter(x => x !== v) : [...a, v]; };
/* Controles comunes de equipaciones y paletas para ajustes y asistente. */
const clubKitDraft = which => which === "w" ? UI.wiz : (UI.sheet && UI.sheet.d);
const updateClubKit = (which, el) => {
  const d=clubKitDraft(which),k=el.dataset.kit,p=el.dataset.part;
  if(!d || !d.kits || !d.kits[k] || !["shirt","shorts","socks"].includes(p) || !ClubTheme.validHex(el.value))return;
  d.kits[k][p]=el.value.toUpperCase();
};
const updateClubPalette = (which, el, kind) => {
  const d=clubKitDraft(which);if(!d)return;
  d.palette=ClubTheme.cleanPalette(d.palette);
  if(kind==="mode" && ["auto","preset","custom"].includes(el.value))d.palette.mode=el.value;
  if(kind==="preset" && ClubTheme.presets[el.value])d.palette.preset=el.value;
  if(kind==="custom" && ["customPrimary","customAccent"].includes(el.dataset.part) && ClubTheme.validHex(el.value))
    d.palette[el.dataset.part]=el.value.toUpperCase();
};
const toggleClubThird = which => {
  const d=clubKitDraft(which);if(!d)return;
  d.kits=ClubTheme.normalizeKits(d.kits);
  if(d.kits.third)delete d.kits.third;
  else d.kits.third={shirt:"#EFEFEF",shorts:"#17365D",socks:"#EFEFEF"};
};
CHG.setKit = el => updateClubKit("set",el);
CHG.wKit = el => updateClubKit("w",el);
CHG.setPaletteMode = el => updateClubPalette("set",el,"mode");
CHG.wPaletteMode = el => updateClubPalette("w",el,"mode");
CHG.setPalettePreset = el => updateClubPalette("set",el,"preset");
CHG.wPalettePreset = el => updateClubPalette("w",el,"preset");
CHG.setPaletteCustom = el => updateClubPalette("set",el,"custom");
CHG.wPaletteCustom = el => updateClubPalette("w",el,"custom");
ACT.wPaletteChoice = el => { if(UI.wiz && ["auto","preset"].includes(el.dataset.mode)) UI.wiz.palette={...ClubTheme.cleanPalette(UI.wiz.palette),mode:el.dataset.mode}; };
ACT.setPaletteChoice = el => { if(UI.sheet?.d && ["auto","preset"].includes(el.dataset.mode)) UI.sheet.d.palette={...ClubTheme.cleanPalette(UI.sheet.d.palette),mode:el.dataset.mode}; };
ACT.setToggleThird = () => toggleClubThird("set");
ACT.wToggleThird = () => toggleClubThird("w");
ACT.saveSettings = () => {
  const d = UI.sheet.d, mm = parseNum(d.matchMinutes);
  if (!mm || mm < 10 || mm > 120) { toast("La duración del partido debe estar entre 10 y 120 minutos.", "err"); return; }
  if (d.trainStart && d.trainEnd && d.trainStart > d.trainEnd) { toast("El último entreno no puede ser anterior al primero.", "err"); return; }
  if (!d.trainDays.length) { toast("Elige al menos un día de entrenamiento.", "err"); return; }
  const s = Store.season(); s.club = d.club.trim(); s.category = d.category.trim();
  s.settings = { ...(s.settings || {}), matchMinutes: mm, format: d.format || "F7", crest: ClubCrest.clean(d.crest), kits: ClubTheme.normalizeKits(d.kits), palette: ClubTheme.cleanPalette(d.palette), trainDays: d.trainDays, trainStart: d.trainStart, trainEnd: d.trainEnd };
  Store.save("season", s); UI.sheet = null; toast("Ajustes guardados.", "ok");
};

/* ---------- ASISTENTE: nueva temporada ---------- */
function nextSeasonName(name) {
  const m = String(name || "").match(/(\d{4})\s*[\/-]\s*(\d{2,4})/);
  if (!m) return "";
  const a = +m[1] + 1; return `${a}/${String(a + 1).slice(-2)}`;
}
const addYear = k => { if (!k) return ""; const d = pd(k); d.setFullYear(d.getFullYear() + 1); return dk(d); };
ACT.wizStart = el => {
  const cur = Store.season(), first = !!el.dataset.first || !cur;
  const st = (cur && cur.settings) || {};
  const players = first ? [] : Store.activePlayers().map(p => ({ id: null, name: p.name, dorsal: "", keep: true }));
  const matches = first ? [] : Store.matches.map(() => ({ date: "", rival: "", home: true, rest: false }));
  UI.wiz = { step: 1, name: first ? "" : nextSeasonName(cur.name), club: (cur && cur.club) || "", category: (cur && cur.category) || "",
    matchMinutes: st.matchMinutes || 50, format: st.format || "F7", crest: ClubCrest.current(cur), kits: ClubTheme.normalizeKits(st.kits), palette: ClubTheme.cleanPalette(st.palette), trainDays: [...(st.trainDays || [1, 3])], trainStart: addYear(st.trainStart), trainEnd: addYear(st.trainEnd),
    players, matches, copyNote: !first, progress: null, done: false, newId: null };
  UI.sheet = { type: "wizard", wide: true };
};
const WSTEPS = ["Datos", "Equipaciones", "Identidad visual", "Plantilla", "Jornadas", "Crear"];
V.sheet.wizard = () => {
  const w = UI.wiz;
  const stepper = `<ol class="wsteps">${WSTEPS.map((l, i) => `<li class="${w.step === i + 1 ? "on" : w.step > i + 1 ? "done" : ""}"><i>${i + 1}</i>${l}</li>`).join("")}</ol>`;
  let body = "";
  if (w.step === 1) {
    body = `<div class="form"><div class="row gap wrap"><label class="fld grow"><span>Temporada</span><input type="text" class="inp" data-inp="wName" value="${esc(w.name)}" placeholder="2027/28"></label>
      <label class="fld grow"><span>Duración del partido (min)</span><input type="text" inputmode="numeric" class="inp" data-inp="wMin" value="${esc(w.matchMinutes)}"></label></div>
      <label class="fld"><span>Club</span><input type="text" class="inp" data-inp="wClub" value="${esc(w.club)}" placeholder="Nombre de tu club"></label>
      <label class="fld"><span>Categoría</span><input type="text" class="inp" data-inp="wCat" value="${esc(w.category)}" placeholder="Benjamín · Liga Educa"></label>
       ${crestControl(w.crest, "wCrest", "wRemoveCrest")}<label class="fld"><span>Formato de fútbol</span><select class="sel" data-chg="wFormat"><option value="F7" ${w.format === "F7" ? "selected" : ""}>Fútbol 7</option><option value="F11" ${w.format === "F11" ? "selected" : ""}>Fútbol 11</option></select></label>
      <div class="fld"><span>Días de entrenamiento</span><div class="chips">${DAYSEL.map(([v, l]) => `<button type="button" class="chip ${w.trainDays.includes(v) ? "on" : ""}" data-act="wDay" data-v="${v}">${l}</button>`).join("")}</div></div>
      <div class="row gap wrap"><label class="fld grow"><span>Primer entreno</span><input type="date" class="inp" data-inp="wStart" value="${esc(w.trainStart)}"></label><label class="fld grow"><span>Último entreno</span><input type="date" class="inp" data-inp="wEnd" value="${esc(w.trainEnd)}"></label></div>
      ${w.copyNote ? `<p class="muted small">La plantilla y el número de jornadas se copian de la temporada ${esc(Store.season().name)}. Los dorsales quedan en blanco por si cambian.</p>` : ""}</div>`;
  } else if (w.step === 2) {
    body = ClubKitsEditor.renderKits(w,"w");
  } else if (w.step === 3) {
    body = ClubKitsEditor.renderPalette(w,"w");
  } else if (w.step === 4) {
    body = `<p class="muted small">Quita a quien se va, corrige nombres y añade los jugadores nuevos. Los dorsales se pueden poner ahora o más tarde.</p>
      <ul class="wlist">${w.players.map((p, i) => `<li class="${p.keep ? "" : "off"}"><input type="checkbox" data-chg="wKeep" data-i="${i}" ${p.keep ? "checked" : ""} aria-label="Seguir en la plantilla"><input type="text" class="inp" data-inp="wPName" data-i="${i}" value="${esc(p.name)}" placeholder="Nombre" aria-label="Nombre"><input type="text" inputmode="numeric" class="inp mini" data-inp="wPDors" data-i="${i}" value="${esc(p.dorsal)}" placeholder="Nº" maxlength="2" aria-label="Dorsal"><button type="button" class="ix" data-act="wDelP" data-i="${i}" aria-label="Quitar">${icon("x")}</button></li>`).join("")}</ul>
      <div class="row gap wrap tool">${btn("Añadir jugador", "wAddP", {}, "ghost", "plus")}<button type="button" class="link" data-act="wPaste">Pegar una lista de nombres</button></div>
      ${UI.pasteOpen === "p" ? `<textarea class="inp area" rows="7" data-inp="wPasteP" placeholder="- Oliver Atom – **10**&#10;- Santiago Muñez – **26**&#10;- Benji Price – **1**"></textarea><p class="muted small">Pega un jugador por línea. Reconocemos «Nombre – 10», «- Nombre – **10**», «10 – Nombre» y «10. Nombre». Nombre y dorsal quedan en columnas distintas; revisa los dorsales repetidos antes de terminar.</p><div class="row end">${btn("Añadir jugadores", "wPasteP", {}, "primary")}</div>` : ""}`;
  } else if (w.step === 5) {
    body = `<p class="muted small">Fecha, rival y campo de cada jornada. Si aún no los tienes, déjalos en blanco y complétalos después en Partidos.</p>
      <ul class="wm">${w.matches.map((m, i) => `<li class="${m.rest ? "off" : ""}"><b>J${m.n || i + 1}</b><input type="date" class="inp" data-inp="wMDate" data-i="${i}" value="${esc(m.date)}" aria-label="Fecha">${m.rest ? `<span class="muted grow">Descansa</span>` : `<input type="text" class="inp grow" data-inp="wMRival" data-i="${i}" value="${esc(m.rival)}" placeholder="Rival" aria-label="Rival"><select class="sel" data-chg="wMHome" data-i="${i}" aria-label="Local o visitante"><option value="" ${m.home == null ? "selected" : ""}>Por definir</option><option value="1" ${m.home === true ? "selected" : ""}>Local</option><option value="0" ${m.home === false ? "selected" : ""}>Visitante</option></select>`}<label class="chk" title="Jornada de descanso"><input type="checkbox" data-chg="wMRest" data-i="${i}" ${m.rest ? "checked" : ""}>Desc.</label><button type="button" class="ix" data-act="wDelM" data-i="${i}" aria-label="Quitar jornada">${icon("x")}</button></li>`).join("")}</ul>
      <div class="row gap wrap tool">${btn("Añadir jornada", "wAddM", {}, "ghost", "plus")}<button type="button" class="link" data-act="wPasteM">Pegar el calendario</button></div>
      ${UI.pasteOpen === "m" ? `<textarea class="inp area" rows="9" data-inp="wPasteM" placeholder="Por ejemplo: - Jornada 1; Fecha: Sábado, 14 de noviembre de 2026; Rival: Rayo Ficticio\n17/10/2027; Lora del Río CF; V\n24/10/2027; CMD San Juan; L\n08/01/2028; DESCANSA">${esc(UI.wizPasteM || "")}</textarea><p class="muted small">Puedes pegar «Jornada 1», «Fecha: Sábado, 14 de noviembre de 2026» y «Rival: Rayo Ficticio», incluso con viñetas Markdown. También se admite fecha; rival; L/V. Si no indicas casa o fuera se quedará «Por definir», sin suponer que eres local.</p><div class="row end">${btn("Analizar y añadir jornadas", "wApplyPasteM", {}, "primary")}</div>` : ""}`;
  } else {
    const keep = w.players.filter(p => p.keep && p.name.trim()).length;
    body = w.done ? `<div class="okbox"><div class="okmark">${icon("check")}</div><h3>Temporada ${esc(w.name)} creada</h3><p class="muted">${keep} jugadores y ${w.matches.length} jornadas listos. Ya puedes empezar a usarla.</p>
        <div class="row gap wrap center">${btn(UI.ai.busyXlsx ? "Preparando…" : "Descargar Excel de la temporada nueva", "dlXlsx", {}, "ghost", "down")}${btn("Ir al inicio", "wizFinish", {}, "primary")}</div></div>`
      : `<div class="sumbox"><h3>Temporada ${esc(w.name)}</h3><ul><li><b>${keep}</b> jugadores</li><li><b>${w.matches.length}</b> jornadas (${w.matches.filter(m => m.rest).length} de descanso)</li><li>Entrenos: ${w.trainDays.map(d => DIAS3[d]).join(" y ")}${w.trainStart ? ` del ${esc(fmtShort(w.trainStart))} al ${esc(fmtShort(w.trainEnd))}` : ""}</li><li>Partido de ${esc(w.matchMinutes)} minutos</li></ul>
        <p class="muted small">La temporada actual no se toca. Todo lo nuevo empieza vacío.</p>
        ${w.progress ? `<div class="prog"><i style="width:${Math.round(w.progress[0] / w.progress[1] * 100)}%"></i></div><p class="muted small">Creando… ${w.progress[0]} de ${w.progress[1]}</p>` : ""}${w.err ? `<p class="err small">${esc(w.err)}</p>` : ""}</div>`;
  }
  const nav = w.step === 6 && w.done ? "" : `<div class="row between gap foot">${w.step > 1 && !w.progress ? btn("Atrás", "wBack", {}, "ghost", "back") : btn("Cancelar", "closeSheet", {}, "ghost")}${w.step < 6 ? btn("Siguiente", "wNext", {}, "primary") : btn(w.progress ? "Creando…" : "Crear temporada", "wCreate", {}, "primary", "check")}</div>`;
  return `<h2>Nueva temporada</h2>${stepper}<div class="wbody">${body}</div>${nav}`;
};
CHG.wCrest = async el => {
  const w = UI.wiz;
  if (!w || !el.files || !el.files[0]) return;
  try { w.crest = await ClubCrest.upload(el.files[0]); toast("Escudo añadido a la nueva temporada.", "ok"); }
  catch (e) { toast(e.message || "No se pudo procesar el escudo.", "err"); }
  render(true);
};
ACT.wRemoveCrest = () => { UI.wiz.crest = ""; };
INP.wName = el => { UI.wiz.name = el.value; };
INP.wMin = el => { UI.wiz.matchMinutes = el.value; };
INP.wClub = el => { UI.wiz.club = el.value; };
INP.wCat = el => { UI.wiz.category = el.value; }; CHG.wFormat = el => { UI.wiz.format = el.value; }; INP.wKit = el => { UI.wiz.kits[el.dataset.kit][el.dataset.part] = el.value; };
INP.wStart = el => { UI.wiz.trainStart = el.value; };
INP.wEnd = el => { UI.wiz.trainEnd = el.value; };
ACT.wDay = el => { const w = UI.wiz, v = +el.dataset.v; w.trainDays = w.trainDays.includes(v) ? w.trainDays.filter(x => x !== v) : [...w.trainDays, v]; };
CHG.wKeep = el => { UI.wiz.players[+el.dataset.i].keep = el.checked; };
INP.wPName = el => { UI.wiz.players[+el.dataset.i].name = el.value; };
INP.wPDors = el => { UI.wiz.players[+el.dataset.i].dorsal = el.value; };
ACT.wDelP = el => { UI.wiz.players.splice(+el.dataset.i, 1); };
ACT.wAddP = () => { UI.wiz.players.push({ id: null, name: "", dorsal: "", keep: true }); };
ACT.wPaste = () => { UI.pasteOpen = UI.pasteOpen === "p" ? false : "p"; };
INP.wPasteP = el => { UI.wizPasteP = el.value; };
ACT.wPasteP = () => {
  const rows = PlayerListImport.parseList(UI.wizPasteP || "");
  let added = 0, duplicates = 0, repeatedDorsals = 0;
  for (const row of rows) {
    if (UI.wiz.players.some(p => norm(p.name) === norm(row.name))) { duplicates++; continue; }
    // Preservamos exactamente el dorsal introducido, incluso cuando se repite.
    // Avisamos del conflicto, pero nunca borramos un número al importar.
    if (row.dorsal !== null && UI.wiz.players.some(p => p.keep && String(p.dorsal) === String(row.dorsal))) repeatedDorsals++;
    UI.wiz.players.push({ id: null, name: row.name, dorsal: row.dorsal === null ? "" : String(row.dorsal), keep: true });
    added++;
  }
  UI.wizPasteP = ""; UI.pasteOpen = false;
  toast(`${added} jugadores añadidos.${duplicates ? " "+duplicates+" nombres repetidos omitidos." : ""}${repeatedDorsals ? " Aviso: "+repeatedDorsals+" dorsales repetidos conservados; revísalos." : ""}`, repeatedDorsals ? "err" : "ok");
};
INP.wMDate = el => { UI.wiz.matches[+el.dataset.i].date = el.value; };
INP.wMRival = el => { UI.wiz.matches[+el.dataset.i].rival = el.value; };
CHG.wMHome = el => { UI.wiz.matches[+el.dataset.i].home = el.value === "" ? null : el.value === "1"; };
CHG.wMRest = el => { UI.wiz.matches[+el.dataset.i].rest = el.checked; };
ACT.wDelM = el => { UI.wiz.matches.splice(+el.dataset.i, 1); };
ACT.wAddM = () => { UI.wiz.matches.push({ date: "", rival: "", home: null, rest: false }); };
ACT.wPasteM = () => { UI.pasteOpen = UI.pasteOpen === "m" ? false : "m"; };
ACT.wApplyPasteM = () => {
  const w = UI.wiz, result = MatchListImport.parse(UI.wizPasteM || "");
  if (result.errors.length) {
    toast("Revisa el calendario: " + result.errors[0] + (result.errors.length > 1 ? " (" + result.errors.length + " avisos)" : ""), "err");
    return;
  }
  const occupied = new Set(w.matches.map((m,i) => m.n || i + 1));
  let added=0,duplicates=0,unknown=0;
  for (const row of result.matches) {
    let n=row.n;
    if(n != null && occupied.has(n)){duplicates++;continue;}
    if(n == null){
      n=1;while(occupied.has(n))n++;
    }
    occupied.add(n);
    if(!row.rest && row.home===null)unknown++;
    w.matches.push({n,date:row.date,rival:row.rival,home:row.home,rest:row.rest});
    added++;
  }
  if(!added){toast(duplicates?"Las jornadas ya estaban añadidas.":"No se encontraron jornadas válidas.","err");return;}
  UI.wizPasteM = "";UI.pasteOpen = false;
  toast(added+" jornadas añadidas."+(duplicates?" "+duplicates+" jornadas repetidas omitidas.":"")+
    (unknown?" "+unknown+" pendientes de local o visitante.":""),unknown||duplicates?"err":"ok");
};
INP.wPasteM = el => { UI.wizPasteM = el.value; };
ACT.wBack = () => { UI.wiz.step = Math.max(1, UI.wiz.step - 1); UI.pasteOpen = false; };
ACT.wNext = () => {
  const w = UI.wiz;
  if (w.step === 1) {
    const name = w.name.trim(), mm = parseNum(w.matchMinutes);
    if (!/^\d{4}\s*[\/-]\s*\d{2,4}$/.test(name)) { toast("Escribe la temporada así: 2027/28", "err"); return; }
    if (Store.seasons.some(s => s.name === name && Store.roles[s.id] === "owner")) { toast("Ya tienes una temporada con ese nombre.", "err"); return; }
    if (!mm || mm < 10 || mm > 120) { toast("La duración del partido debe estar entre 10 y 120 minutos.", "err"); return; }
    if (!w.trainDays.length) { toast("Elige al menos un día de entrenamiento.", "err"); return; }
    if (w.trainStart && w.trainEnd && w.trainStart > w.trainEnd) { toast("El último entreno no puede ser anterior al primero.", "err"); return; }
    w.name = name;
  }
  if (w.step === 4 && !w.players.some(p => p.keep && p.name.trim())) { toast("Añade al menos un jugador.", "err"); return; }
  w.step++; UI.pasteOpen = false;
};
ACT.wCreate = async () => {
  const w = UI.wiz; if (w.progress) return;
  if (!w.sid) w.sid = w.name.replace(/\s*[\/-]\s*/, "-") + "-" + Array.from(crypto.getRandomValues(new Uint8Array(4)), b => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
  const id = w.sid;
  const plist = w.players.filter(p => p.keep && p.name.trim()).map((p, i) => ({ id: "p" + String(i + 1).padStart(2, "0"), name: p.name.trim(), dorsal: parseNum(p.dorsal), order: i + 1, active: true, notes: "" }));
  const mlist = w.matches.map((m, i) => ({ id: "j" + String(m.n || i + 1).padStart(2, "0"), n: m.n || i + 1, date: m.date || null, rival: m.rest ? "" : m.rival.trim(), home: m.rest ? null : m.home, rest: m.rest, notes: "", ourGoals: null, rivalGoals: null, scorers: [], players: {}, noCall: [], subs: [], callDone: false }));
  w.progress = [0, 1 + plist.length + mlist.length + 1]; w.err = null; render(true);
  try {
    await Store.createSeason({ id, name: w.name, club: w.club.trim(), category: w.category.trim(), settings: { matchMinutes: parseNum(w.matchMinutes), format: w.format || "F7", crest: ClubCrest.clean(w.crest), kits: ClubTheme.normalizeKits(w.kits), palette: ClubTheme.cleanPalette(w.palette), trainDays: w.trainDays, trainStart: w.trainStart, trainEnd: w.trainEnd }, players: plist, matches: mlist },
      (n, t) => { w.progress = [n, t]; render(true); });
    w.newId = id; w.done = true; w.progress = null;
  } catch (e) { console.error(e); w.progress = null; w.err = String(e?.message||e||"").includes("insufficient_management_whistles") ? "No tienes suficientes silbatos de gestión para crear un equipo independiente. Puedes consultar el saldo en Configuración de Dirección Deportiva." : "No se pudo guardar la temporada completa. Comprueba tu conexión e inténtalo de nuevo: continuará donde se quedó."; }
  render(true);
};
ACT.wizFinish = () => { const id = UI.wiz.newId; UI.sheet = null; UI.wiz = null; if (id) { Store.selectSeason(id); } go("inicio"); toast("Temporada nueva abierta.", "ok"); };
