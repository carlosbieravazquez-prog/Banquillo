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
  const cur = Store.season();
  const cards = Store.seasons.map(s => {
    const on = s.id === Store.sid;
    return `<li class="scard ${on ? "on" : ""}"><div class="sc-m"><b>${esc(s.name)}</b><small>${esc(s.club || "")} · ${esc(s.category || "")}</small></div>
      <div class="sc-s">${s.status === "closed" ? `<span class="tag">Cerrada</span>` : `<span class="tag ok">Activa</span>`}${on ? `<span class="tag info">Abierta</span>` : ""}<span class="tag">${Auth.roleLabel(Store.roles[s.id])}</span></div>
      <div class="sc-a">${on ? "" : btn("Abrir", "openSeason", { id: s.id }, "ghost small")}</div></li>`;
  }).join("");
  return `${pageHead("Temporadas", "Cada temporada guarda su plantilla, jornadas, estadísticas y entrenos.", `<div class="row gap wrap">${btn("Unirme con un código", "openJoin", {}, "ghost", "users")}${btn("Nueva temporada", "wizStart", {}, "primary", "plus")}</div>`)}
    <ul class="slist2">${cards}</ul>
    <section class="card"><div class="card-h"><h3>Temporada abierta · ${esc(cur.name)}</h3></div>
      <div class="row gap wrap">${btn("Compartir y miembros", "openShare", {}, "primary", "users")}${btn("Ajustes", "openSettings", {}, "ghost", "edit")}${btn(UI.ai.busyXlsx ? "Preparando…" : "Exportar Excel", "dlXlsx", {}, "ghost", "down")}${cur.status === "closed" ? btn("Reabrir temporada", "reopenSeason", {}, "ghost") : btn("Cerrar temporada", "closeSeasonAsk", {}, "ghost", "lock")}</div>
      <p class="muted small">Cerrar la temporada no borra nada: solo la marca como terminada. Antes de cerrarla, prepara los informes individuales en <button type="button" class="link" data-act="go" data-to="informes">Informes</button>.</p></section>
    <section class="card"><div class="card-h"><h3>Cómo empezar una temporada nueva</h3></div>
      <ol class="steps"><li>Pulsa <b>Nueva temporada</b> y copia la plantilla de esta temporada.</li><li>Corrige los nombres, añade los jugadores nuevos y quita los que se van.</li><li>Pega el calendario de jornadas (fecha; rival; L o V) o añádelas a mano.</li><li>La app crea todo vacío y listo para usar. Si quieres, descarga el Excel de la temporada nueva.</li></ol></section>`;
};
ACT.openSeason = el => { Store.selectSeason(el.dataset.id); go("inicio"); toast("Temporada abierta."); };
ACT.closeSeasonAsk = () => confirmSheet("¿Cerrar la temporada?", "Se marcará como terminada. Seguirás pudiendo ver y descargar todo, y podrás reabrirla cuando quieras.", "Cerrar temporada", "closeSeason", {}, false);
ACT.closeSeason = () => { const s = Store.season(); s.status = "closed"; Store.save("season", s); UI.sheet = null; toast("Temporada cerrada.", "ok"); };
ACT.reopenSeason = () => { const s = Store.season(); s.status = "active"; Store.save("season", s); toast("Temporada reabierta.", "ok"); };

/* ---------- AJUSTES de la temporada ---------- */
ACT.openSettings = () => {
  const s = Store.season(), st = s.settings || {};
  UI.sheet = { type: "settings", wide: true, d: { club: s.club || "", category: s.category || "", matchMinutes: st.matchMinutes || 50, format: st.format || "F7", crest: ClubCrest.current(s), kits: st.kits || { first:{shirt:"#17365D",shorts:"#17365D",socks:"#FFFFFF"}, second:{shirt:"#FFFFFF",shorts:"#17365D",socks:"#17365D"} }, trainStart: st.trainStart || "", trainEnd: st.trainEnd || "", trainDays: [...(st.trainDays || [1, 3])] } };
};
const crestControl = (data, change, remove) => `
    <div class="card flat"><div class="card-h"><h3>Escudo del equipo</h3><span class="tag">Opcional</span></div>
    <p class="muted small">Aparecerá en Banquillo, informes individuales y actas PDF. Sube un PNG transparente si es posible. Puedes preparar la imagen con
    <a href="https://www.canva.com/es_es/funciones/quitar-fondo-imagen/" target="_blank" rel="noopener noreferrer">Quitafondos de Canva</a>
    (servicio externo, algunas funciones requieren pago). No es obligatorio utilizar Canva.</p>
    ${ClubCrest.preview(data)}
    <label class="fld"><span>Seleccionar escudo · PNG, JPG o WebP (máx. 3 MB)</span>
    <input type="file" class="inp" accept="image/png,image/jpeg,image/webp" data-chg="${change}"></label>
    ${data ? btn("Quitar escudo", remove, {}, "ghost") : ""}
    </div>`;
const DAYSEL = [[1, "Lun"], [2, "Mar"], [3, "Mié"], [4, "Jue"], [5, "Vie"], [6, "Sáb"], [0, "Dom"]];
V.sheet.settings = sh => {
  const d = sh.d;
  return `<h2>Ajustes de la temporada ${esc(Store.season().name)}</h2>
    <div class="form"><label class="fld"><span>Club</span><input type="text" class="inp" data-inp="setClub" value="${esc(d.club)}"></label>
    <label class="fld"><span>Categoría</span><input type="text" class="inp" data-inp="setCat" value="${esc(d.category)}"></label>
    ${crestControl(d.crest, "setCrest", "removeCrest")}
    <label class="fld"><span>Formato de fútbol</span><select class="sel" data-chg="setFormat"><option value="F7" ${d.format === "F7" ? "selected" : ""}>Fútbol 7</option><option value="F11" ${d.format === "F11" ? "selected" : ""}>Fútbol 11</option></select></label><details class="det"><summary>Colores de las equipaciones</summary><p class="muted small">Selecciona camiseta, pantalón y medias para cada equipación.</p>${["first","second"].map((k,i)=>`<div class="form"><b>${i===0?"Primera equipación":"Segunda equipación"}</b>${["shirt","shorts","socks"].map((part,j)=>`<label class="fld"><span>${["Camiseta","Pantalón","Medias"][j]}</span><input type="color" data-inp="setKit" data-kit="${k}" data-part="${part}" value="${esc(d.kits[k][part])}"></label>`).join("")}</div>`).join("")}</details><label class="fld"><span>Duración del partido (minutos)</span><input type="text" inputmode="numeric" class="inp mini" data-inp="setMin" value="${esc(d.matchMinutes)}"></label>
    <div class="fld"><span>Días de entrenamiento</span><div class="chips">${DAYSEL.map(([v, l]) => `<button type="button" class="chip ${d.trainDays.includes(v) ? "on" : ""}" data-act="setDay" data-v="${v}">${l}</button>`).join("")}</div></div>
    <div class="row gap wrap"><label class="fld grow"><span>Primer entreno</span><input type="date" class="inp" data-inp="setStart" value="${esc(d.trainStart)}"></label><label class="fld grow"><span>Último entreno</span><input type="date" class="inp" data-inp="setEnd" value="${esc(d.trainEnd)}"></label></div>
    <p class="muted small">Si cambias las fechas, las faltas ya marcadas se conservan. Las sesiones nuevas aparecen en Entrenos.</p></div>
    <div class="row end gap foot">${btn("Cancelar", "closeSheet", {}, "ghost")}${btn("Guardar ajustes", "saveSettings", {}, "primary")}</div>`;
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
ACT.saveSettings = () => {
  const d = UI.sheet.d, mm = parseNum(d.matchMinutes);
  if (!mm || mm < 10 || mm > 120) { toast("La duración del partido debe estar entre 10 y 120 minutos.", "err"); return; }
  if (d.trainStart && d.trainEnd && d.trainStart > d.trainEnd) { toast("El último entreno no puede ser anterior al primero.", "err"); return; }
  if (!d.trainDays.length) { toast("Elige al menos un día de entrenamiento.", "err"); return; }
  const s = Store.season(); s.club = d.club.trim(); s.category = d.category.trim();
  s.settings = { ...(s.settings || {}), matchMinutes: mm, format: d.format || "F7", crest: ClubCrest.clean(d.crest), kits: d.kits, trainDays: d.trainDays, trainStart: d.trainStart, trainEnd: d.trainEnd };
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
    matchMinutes: st.matchMinutes || 50, format: st.format || "F7", crest: ClubCrest.current(cur), kits: st.kits || { first:{shirt:"#17365D",shorts:"#17365D",socks:"#FFFFFF"}, second:{shirt:"#FFFFFF",shorts:"#17365D",socks:"#17365D"} }, trainDays: [...(st.trainDays || [1, 3])], trainStart: addYear(st.trainStart), trainEnd: addYear(st.trainEnd),
    players, matches, copyNote: !first, progress: null, done: false, newId: null };
  UI.sheet = { type: "wizard", wide: true };
};
const WSTEPS = ["Datos", "Plantilla", "Jornadas", "Crear"];
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
      <details class="det"><summary>Colores de las equipaciones</summary><p class="muted small">Selecciona camiseta, pantalón y medias para cada equipación.</p>${["first","second"].map((k,i)=>`<div class="form"><b>${i===0?"Primera equipación":"Segunda equipación"}</b>${["shirt","shorts","socks"].map((part,j)=>`<label class="fld"><span>${["Camiseta","Pantalón","Medias"][j]}</span><input type="color" data-inp="wKit" data-kit="${k}" data-part="${part}" value="${esc(w.kits[k][part])}"></label>`).join("")}</div>`).join("")}</details><div class="fld"><span>Días de entrenamiento</span><div class="chips">${DAYSEL.map(([v, l]) => `<button type="button" class="chip ${w.trainDays.includes(v) ? "on" : ""}" data-act="wDay" data-v="${v}">${l}</button>`).join("")}</div></div>
      <div class="row gap wrap"><label class="fld grow"><span>Primer entreno</span><input type="date" class="inp" data-inp="wStart" value="${esc(w.trainStart)}"></label><label class="fld grow"><span>Último entreno</span><input type="date" class="inp" data-inp="wEnd" value="${esc(w.trainEnd)}"></label></div>
      ${w.copyNote ? `<p class="muted small">La plantilla y el número de jornadas se copian de la temporada ${esc(Store.season().name)}. Los dorsales quedan en blanco por si cambian.</p>` : ""}</div>`;
  } else if (w.step === 2) {
    body = `<p class="muted small">Quita a quien se va, corrige nombres y añade los jugadores nuevos. Los dorsales se pueden poner ahora o más tarde.</p>
      <ul class="wlist">${w.players.map((p, i) => `<li class="${p.keep ? "" : "off"}"><input type="checkbox" data-chg="wKeep" data-i="${i}" ${p.keep ? "checked" : ""} aria-label="Seguir en la plantilla"><input type="text" class="inp" data-inp="wPName" data-i="${i}" value="${esc(p.name)}" placeholder="Nombre" aria-label="Nombre"><input type="text" inputmode="numeric" class="inp mini" data-inp="wPDors" data-i="${i}" value="${esc(p.dorsal)}" placeholder="Nº" maxlength="2" aria-label="Dorsal"><button type="button" class="ix" data-act="wDelP" data-i="${i}" aria-label="Quitar">${icon("x")}</button></li>`).join("")}</ul>
      <div class="row gap wrap tool">${btn("Añadir jugador", "wAddP", {}, "ghost", "plus")}<button type="button" class="link" data-act="wPaste">Pegar una lista de nombres</button></div>
      ${UI.pasteOpen === "p" ? `<textarea class="inp area" rows="7" data-inp="wPasteP" placeholder="- Oliver Atom – **10**&#10;- Santiago Muñez – **26**&#10;- Benji Price – **1**"></textarea><p class="muted small">Pega un jugador por línea. Reconocemos «Nombre – 10», «- Nombre – **10**», «10 – Nombre» y «10. Nombre». Nombre y dorsal quedan en columnas distintas; revisa los dorsales repetidos antes de terminar.</p><div class="row end">${btn("Añadir jugadores", "wPasteP", {}, "primary")}</div>` : ""}`;
  } else if (w.step === 3) {
    body = `<p class="muted small">Fecha, rival y campo de cada jornada. Si aún no los tienes, déjalos en blanco y complétalos después en Partidos.</p>
      <ul class="wm">${w.matches.map((m, i) => `<li class="${m.rest ? "off" : ""}"><b>J${i + 1}</b><input type="date" class="inp" data-inp="wMDate" data-i="${i}" value="${esc(m.date)}" aria-label="Fecha">${m.rest ? `<span class="muted grow">Descansa</span>` : `<input type="text" class="inp grow" data-inp="wMRival" data-i="${i}" value="${esc(m.rival)}" placeholder="Rival" aria-label="Rival"><select class="sel" data-chg="wMHome" data-i="${i}" aria-label="Campo"><option value="1" ${m.home ? "selected" : ""}>Local</option><option value="0" ${!m.home ? "selected" : ""}>Visitante</option></select>`}<label class="chk" title="Jornada de descanso"><input type="checkbox" data-chg="wMRest" data-i="${i}" ${m.rest ? "checked" : ""}>Desc.</label><button type="button" class="ix" data-act="wDelM" data-i="${i}" aria-label="Quitar jornada">${icon("x")}</button></li>`).join("")}</ul>
      <div class="row gap wrap tool">${btn("Añadir jornada", "wAddM", {}, "ghost", "plus")}<button type="button" class="link" data-act="wPasteM">Pegar el calendario</button></div>
      ${UI.pasteOpen === "m" ? `<textarea class="inp area" rows="6" data-inp="wPasteM" placeholder="Una jornada por línea:\n17/10/2027; Lora del Río CF; V\n24/10/2027; CMD San Juan; L\n08/01/2028; DESCANSA"></textarea><p class="muted small">Formato: fecha; rival; L (local) o V (visitante).</p><div class="row end">${btn("Añadir jornadas", "wPasteM", {}, "primary")}</div>` : ""}`;
  } else {
    const keep = w.players.filter(p => p.keep && p.name.trim()).length;
    body = w.done ? `<div class="okbox"><div class="okmark">${icon("check")}</div><h3>Temporada ${esc(w.name)} creada</h3><p class="muted">${keep} jugadores y ${w.matches.length} jornadas listos. Ya puedes empezar a usarla.</p>
        <div class="row gap wrap center">${btn(UI.ai.busyXlsx ? "Preparando…" : "Descargar Excel de la temporada nueva", "dlXlsx", {}, "ghost", "down")}${btn("Ir al inicio", "wizFinish", {}, "primary")}</div></div>`
      : `<div class="sumbox"><h3>Temporada ${esc(w.name)}</h3><ul><li><b>${keep}</b> jugadores</li><li><b>${w.matches.length}</b> jornadas (${w.matches.filter(m => m.rest).length} de descanso)</li><li>Entrenos: ${w.trainDays.map(d => DIAS3[d]).join(" y ")}${w.trainStart ? ` del ${esc(fmtShort(w.trainStart))} al ${esc(fmtShort(w.trainEnd))}` : ""}</li><li>Partido de ${esc(w.matchMinutes)} minutos</li></ul>
        <p class="muted small">La temporada actual no se toca. Todo lo nuevo empieza vacío.</p>
        ${w.progress ? `<div class="prog"><i style="width:${Math.round(w.progress[0] / w.progress[1] * 100)}%"></i></div><p class="muted small">Creando… ${w.progress[0]} de ${w.progress[1]}</p>` : ""}${w.err ? `<p class="err small">${esc(w.err)}</p>` : ""}</div>`;
  }
  const nav = w.step === 4 && w.done ? "" : `<div class="row between gap foot">${w.step > 1 && !w.progress ? btn("Atrás", "wBack", {}, "ghost", "back") : btn("Cancelar", "closeSheet", {}, "ghost")}${w.step < 4 ? btn("Siguiente", "wNext", {}, "primary") : btn(w.progress ? "Creando…" : "Crear temporada", "wCreate", {}, "primary", "check")}</div>`;
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
CHG.wMHome = el => { UI.wiz.matches[+el.dataset.i].home = el.value === "1"; };
CHG.wMRest = el => { UI.wiz.matches[+el.dataset.i].rest = el.checked; };
ACT.wDelM = el => { UI.wiz.matches.splice(+el.dataset.i, 1); };
ACT.wAddM = () => { UI.wiz.matches.push({ date: "", rival: "", home: true, rest: false }); };
ACT.wPasteM = el => {
  if (!el || !el.dataset || UI.pasteOpen !== "m" || el.tagName === "BUTTON" && el.textContent.trim() === "Pegar el calendario") { UI.pasteOpen = UI.pasteOpen === "m" ? false : "m"; return; }
  const lines = (UI.wizPasteM || "").split(/\n+/).map(x => x.trim()).filter(Boolean);
  let bad = 0;
  lines.forEach(l => {
    const parts = l.split(/\s*[;\t]\s*/);
    const date = parseEsDate(parts[0]);
    if (!date) { bad++; return; }
    const rest = /^descansa$/i.test(parts[1] || "");
    const campo = (parts[2] || "").trim().toLowerCase();
    UI.wiz.matches.push({ date, rival: rest ? "" : (parts[1] || ""), home: !(campo.startsWith("v")), rest });
  });
  UI.wizPasteM = ""; UI.pasteOpen = false;
  toast(bad ? `${lines.length - bad} jornadas añadidas. ${bad} líneas no tenían una fecha válida.` : `${lines.length} jornadas añadidas.`, bad ? "err" : "ok");
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
  if (w.step === 2 && !w.players.some(p => p.keep && p.name.trim())) { toast("Añade al menos un jugador.", "err"); return; }
  w.step++; UI.pasteOpen = false;
};
ACT.wCreate = async () => {
  const w = UI.wiz; if (w.progress) return;
  if (!w.sid) w.sid = w.name.replace(/\s*[\/-]\s*/, "-") + "-" + Array.from(crypto.getRandomValues(new Uint8Array(4)), b => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
  const id = w.sid;
  const plist = w.players.filter(p => p.keep && p.name.trim()).map((p, i) => ({ id: "p" + String(i + 1).padStart(2, "0"), name: p.name.trim(), dorsal: parseNum(p.dorsal), order: i + 1, active: true, notes: "" }));
  const mlist = w.matches.map((m, i) => ({ id: "j" + String(i + 1).padStart(2, "0"), n: i + 1, date: m.date || null, rival: m.rest ? "" : m.rival.trim(), home: m.rest ? null : m.home, rest: m.rest, notes: "", ourGoals: null, rivalGoals: null, scorers: [], players: {}, noCall: [], subs: [], callDone: false }));
  w.progress = [0, 1 + plist.length + mlist.length + 1]; w.err = null; render(true);
  try {
    await Store.createSeason({ id, name: w.name, club: w.club.trim(), category: w.category.trim(), settings: { matchMinutes: parseNum(w.matchMinutes), format: w.format || "F7", crest: ClubCrest.clean(w.crest), kits: w.kits, trainDays: w.trainDays, trainStart: w.trainStart, trainEnd: w.trainEnd }, players: plist, matches: mlist },
      (n, t) => { w.progress = [n, t]; render(true); });
    w.newId = id; w.done = true; w.progress = null;
  } catch (e) { console.error(e); w.progress = null; w.err = "No se pudo guardar la temporada completa. Comprueba tu conexión e inténtalo de nuevo: continuará donde se quedó."; }
  render(true);
};
ACT.wizFinish = () => { const id = UI.wiz.newId; UI.sheet = null; UI.wiz = null; if (id) { Store.selectSeason(id); } go("inicio"); toast("Temporada nueva abierta.", "ok"); };
