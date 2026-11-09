/* ===== Vistas: Plantilla, Jugador, Entrenos ===== */
const pStats = p => Calc.playerStats(p.id, Store.matches);

/* ---------- PLANTILLA ---------- */
V.plantilla = () => {
  const ps = Store.activePlayers(), bajas = Store.players.filter(p => p.active === false), ts = trainStats();
  const rows = ps.map(p => ({ p, s: pStats(p), t: ts.per[p.id] || { falts: 0, asist: 0, pct: null } }));
  const dInp = p => `<input type="text" inputmode="numeric" class="inp dinp" data-chg="dorsal" data-p="${p.id}" value="${p.dorsal != null && p.dorsal !== "" ? esc(p.dorsal) : ""}" placeholder="Nº" aria-label="Dorsal de ${esc(p.name)}" maxlength="2">`;
  const z = n => n || '<span class="zero">·</span>';
  const table = `<div class="tbl desk-only" data-scroll="pl"><table class="t"><thead><tr><th>Dorsal</th><th class="l">Jugador</th><th>Goles</th><th>Conv.</th><th>No conv.</th><th>D.T</th><th>L.S</th><th>M.P</th><th>Titular</th><th>Suplente</th><th>Jugados</th><th>Minutos</th><th>Portero</th><th>Porter. a 0</th><th>Entrenos</th></tr></thead><tbody>
    ${rows.map(({ p, s, t }) => `<tr><td>${dInp(p)}</td><td class="l"><button type="button" class="plink" data-act="go" data-to="jugador" data-arg="${p.id}">${esc(p.name)}</button></td><td><b>${z(s.goals)}</b></td><td>${z(s.conv)}</td><td>${z(s.noconv)}</td><td>${z(s.DT)}</td><td>${z(s.LS)}</td><td>${z(s.MP)}</td><td>${z(s.T)}</td><td>${z(s.S)}</td><td>${z(s.played)}</td><td>${z(s.min ? fmtNum(s.min) : 0)}</td><td>${z(s.gk)}</td><td>${z(s.clean)}</td><td><span class="pcell ${t.pct != null && t.pct < 0.75 ? "low" : ""}">${fmtPct(t.pct)}</span></td></tr>`).join("")}
    </tbody></table></div>`;
  const cards = `<ul class="pcards mob-only">${rows.map(({ p, s, t }) => `<li class="pcard"><div class="pc-top">${dInp(p)}<button type="button" class="plink" data-act="go" data-to="jugador" data-arg="${p.id}">${esc(p.name)}</button>${icon("chev", "mc")}</div>
      <div class="pc-st"><span><b>${s.goals}</b>goles</span><span><b>${s.played}</b>jugados</span><span><b>${s.min ? fmtNum(s.min) : 0}</b>min</span><span><b>${fmtPct(t.pct)}</b>entrenos</span></div></li>`).join("")}</ul>`;
  const add = UI.newPlayer ? `<section class="card form addp"><div class="row gap wrap"><label class="fld grow"><span>Nombre</span><input type="text" id="npName" class="inp" data-inp="npName" data-enter="addPlayer" value="${esc(UI.npName || "")}" placeholder="Nombre y apellido" autocomplete="off"></label>
      <label class="fld sm"><span>Dorsal</span><input type="text" inputmode="numeric" class="inp" data-inp="npDorsal" data-enter="addPlayer" value="${esc(UI.npDorsal || "")}" placeholder="Nº" maxlength="2"></label></div>
      <div class="row gap end">${btn("Cancelar", "toggleNewPlayer", {}, "ghost")}${btn("Añadir jugador", "addPlayer", {}, "primary", "plus")}</div></section>` : "";
  return `${pageHead("Plantilla", `${ps.length} jugadores · Temporada ${esc(Store.season().name)}`, btn("Añadir jugador", "toggleNewPlayer", {}, "primary", "plus"))}
    ${add}${table}${cards}
    ${bajas.length ? `<section class="card"><div class="card-h"><h3>Bajas</h3></div><ul class="todo">${bajas.map(p => `<li>${esc(p.name)} ${btn("Reactivar", "reactivate", { p: p.id }, "link")}</li>`).join("")}</ul></section>` : ""}`;
};
ACT.toggleNewPlayer = () => { UI.newPlayer = !UI.newPlayer; UI.npName = ""; UI.npDorsal = ""; };
INP.npName = el => { UI.npName = el.value; };
INP.npDorsal = el => { UI.npDorsal = el.value; };
ACT.addPlayer = () => {
  const name = (UI.npName || "").trim();
  if (!name) { toast("Escribe el nombre del jugador.", "err"); return; }
  if (Store.players.some(p => norm(p.name) === norm(name))) { toast("Ya hay un jugador con ese nombre.", "err"); return; }
  const dors = parseNum(UI.npDorsal);
  const num = Store.players.reduce((a, p) => Math.max(a, parseInt(String(p.id).replace(/\D/g, "")) || 0), 0) + 1;
  const p = { id: "p" + String(num).padStart(2, "0"), name, dorsal: dors != null ? dors : null, order: Store.players.reduce((a, q) => Math.max(a, q.order || 0), 0) + 1, active: true, notes: "" };
  Store.players.push(p); Store.save("player", p);
  UI.newPlayer = false; UI.npName = ""; UI.npDorsal = ""; toast(`${name} añadido a la plantilla.`, "ok");
};
CHG.dorsal = el => {
  const p = Store.player(el.dataset.p), t = el.value.trim();
  if (t === "") { p.dorsal = null; Store.save("player", p); return; }
  const n = parseInt(t, 10);
  if (!/^\d{1,2}$/.test(t) || n < 0) { toast("El dorsal es un número de 0 a 99.", "err"); el.value = p.dorsal ?? ""; return; }
  const dup = Store.players.find(q => q !== p && q.active !== false && q.dorsal === n);
  if (dup) toast(`Atención: el ${n} también lo tiene ${dup.name}.`, "err");
  p.dorsal = n; Store.save("player", p);
};
ACT.reactivate = el => { const p = Store.player(el.dataset.p); p.active = true; Store.save("player", p); };

/* ---------- JUGADOR ---------- */
V.jugador = id => {
  const p = Store.player(id);
  if (!p) return empty("Jugador no encontrado", "Puede que se haya dado de baja.", btn("Volver a la plantilla", "go", { to: "plantilla" }, "primary"));
  const s = pStats(p), ts = trainStats(), t = ts.per[p.id] || { falts: 0, asist: 0, pct: null };
  const rep = Store.reports[p.id];
  const hist = Store.matches.filter(m => !m.rest).map(m => {
    const nc = Calc.noCallMap(m), d = (m.players || {})[p.id], i = Calc.matchInfo(m);
    const goals = Calc.isNum(m.ourGoals) ? (m.scorers || []).slice(0, m.ourGoals).filter(x => x === p.id).length : 0;
    if (!(p.id in nc) && !d && !i.played && !Calc.isRegistered(m)) return "";
    let role = "–";
    if (p.id in nc) role = `<span class="tag bad">No conv. ${MOTIVO_COD[nc[p.id]] || ""}</span>`;
    else if (d && d.role) role = `<span class="lt ${d.role}">${d.role}</span>`;
    return `<tr><td><button type="button" class="plink" data-act="openMatch" data-n="${m.n}">J${m.n}</button></td><td class="l">${esc(matchLabel(m))}</td><td>${i.played ? resPill(i.res, matchScore(m)) : "–"}</td><td>${role}</td><td>${d && d.min != null ? fmtNum(d.min) : "–"}</td><td>${goals || "–"}</td><td>${d && d.gk ? "P" : ""}</td></tr>`;
  }).join("");
  const tile = (b, l) => `<div class="tile"><b>${b}</b><span>${l}</span></div>`;
  return `<div class="mhead"><button type="button" class="back" data-act="go" data-to="plantilla">${icon("back")}Plantilla</button>
      <div class="mh-main"><span class="mh-n big">${p.dorsal != null && p.dorsal !== "" ? esc(p.dorsal) : "–"}</span><div><h1>${esc(p.name)}</h1><p>Temporada ${esc(Store.season().name)}</p></div></div></div>
    <section class="tiles six">${tile(s.conv, "Convocatorias")}${tile(s.played, "Partidos jugados")}${tile(`${s.T}<s>/</s>${s.S}`, "Titular / suplente")}${tile(s.min ? fmtNum(s.min) : 0, "Minutos")}${tile(s.goals, "Goles")}${tile(fmtPct(t.pct), "Asistencia")}</section>
    <section class="card"><div class="card-h"><h3>Partido a partido</h3></div>
      ${hist ? `<div class="tbl" data-scroll="hist"><table class="t"><thead><tr><th>Jor.</th><th class="l">Rival</th><th>Resultado</th><th>Rol</th><th>Min</th><th>Goles</th><th>Port.</th></tr></thead><tbody>${hist}</tbody></table></div>` : `<p class="muted">Todavía no hay partidos registrados.</p>`}
      <p class="muted small">No convocado: D.T ${s.DT} · L.S ${s.LS} · M.P ${s.MP}${s.gk ? ` · Portero ${s.gk} partidos (${s.clean} a cero)` : ""} · Entrenos: ${t.asist} asistidos, ${t.falts} faltas.</p></section>
    <section class="card"><div class="card-h"><h3>Notas del entrenador</h3></div>
      <textarea class="inp area" rows="4" data-inp="pNotes" data-p="${p.id}" placeholder="Fortalezas, aspectos a mejorar, actitud… La IA usará estas notas para redactar el informe.">${esc(p.notes || "")}</textarea>
      <div class="row gap wrap foot"><span class="muted small">${rep ? `Informe ${rep.source === "ia" ? "redactado con IA" : "escrito a mano"}.` : "Sin informe todavía."}</span>${btn("Informe individual", "openReport", { p: p.id }, "primary", "doc")}</div></section>
    <section class="card"><div class="row between wrap gap"><span class="muted small">Si el jugador deja el equipo, se oculta de listas nuevas pero se conserva su historial.</span>${btn("Dar de baja", "bajaAsk", { p: p.id }, "danger-ghost")}</div></section>`;
};
INP.pNotes = el => { const p = Store.player(el.dataset.p); p.notes = el.value; Store.save("player", p); };
ACT.bajaAsk = el => { const p = Store.player(el.dataset.p); confirmSheet(`¿Dar de baja a ${p.name}?`, "Dejará de aparecer en convocatorias y entrenos nuevos. Su historial se conserva y podrás reactivarlo.", "Dar de baja", "baja", { p: p.id }); };
ACT.baja = el => { const p = Store.player(el.dataset.p); p.active = false; Store.save("player", p); UI.sheet = null; go("plantilla"); toast(`${p.name} dado de baja.`); };

/* ---------- ENTRENOS ---------- */
const sessLabel = k => { const d = pd(k); return `${cap(DIAS[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
function defaultTrainDate(sess) {
  const t = todayKey();
  if (sess.includes(t)) return t;
  const past = sess.filter(d => d <= t);
  return past.length ? past[past.length - 1] : sess[0] || null;
}
V.entrenos = () => {
  const sess = seasonSessions(), ts = trainStats(), ps = Store.activePlayers(), tr = Store.training;
  if (!sess.length) return `${pageHead("Entrenamientos")}${empty("Sin sesiones", "Define los días y las fechas de entrenamiento en los ajustes de la temporada.", btn("Ajustes de la temporada", "openSettings", {}, "primary"))}`;
  if (!UI.trainDate || !sess.includes(UI.trainDate)) UI.trainDate = defaultTrainDate(sess);
  const d = UI.trainDate, skipped = (tr.skipped || []).includes(d), abs = (tr.absences || {})[d] || [];
  const today = todayKey(), isFuture = d > today;
  const mode = UI.trainMode;
  const seg = `<div class="seg two"><button type="button" class="${mode === "lista" ? "on" : ""}" data-act="trainMode" data-v="lista">Pasar lista</button><button type="button" class="${mode === "matriz" ? "on" : ""}" data-act="trainMode" data-v="matriz">Todas las sesiones</button></div>`;
  let body;
  if (mode === "lista") {
    const idx = sess.indexOf(d);
    const months = {}; sess.forEach(k => { (months[k.slice(0, 7)] = months[k.slice(0, 7)] || []).push(k); });
    const pick = `<select class="sel" data-chg="trainPick" aria-label="Elegir sesión">${Object.entries(months).map(([mk, list]) => `<optgroup label="${cap(MESES[+mk.slice(5) - 1])} ${mk.slice(0, 4)}">${list.map(k => `<option value="${k}" ${k === d ? "selected" : ""}>${DIAS3[pd(k).getDay()]} ${pd(k).getDate()}${(tr.skipped || []).includes(k) ? " · sin entreno" : ""}${k === today ? " · hoy" : ""}</option>`).join("")}</optgroup>`).join("")}</select>`;
    const present = ps.length - abs.filter(x => ps.some(p => p.id === x)).length;
    body = `<section class="card">
      <div class="tnav"><button type="button" class="ctrb" data-act="trainNav" data-d="-1" ${idx <= 0 ? "disabled" : ""} aria-label="Sesión anterior">${icon("back")}</button>
        <div class="tnav-m"><b>${esc(sessLabel(d))}</b><span>${d === today ? "Hoy" : isFuture ? "Aún no ha llegado" : relDay(d) || "Sesión pasada"}</span></div>
        <button type="button" class="ctrb" data-act="trainNav" data-d="1" ${idx >= sess.length - 1 ? "disabled" : ""} aria-label="Sesión siguiente">${icon("chev")}</button></div>
      <div class="row gap wrap tool">${pick}</div>
      ${skipped ? `<div class="skipbox"><p><b>Esta sesión está marcada como «sin entreno».</b> No cuenta para la asistencia y por eso no se puede pasar lista.</p>${btn("Volver a contar esta sesión", "unskipDay", {}, "primary", "check")}</div>` : `<p class="muted small note">Toca a quien <b>no ha venido</b>: pasa a <b>Faltó X</b>. Si no marcas nada, se entiende que vino.${isFuture ? " Las sesiones futuras no cuentan todavía." : ""}</p>
      <div class="count-big"><b>${present}</b> de ${ps.length} han venido</div>
      <ul class="alist">${ps.map(p => { const out = abs.includes(p.id); return `<li><button type="button" class="arow ${out ? "out" : "in"}" data-act="toggleAbs" data-p="${p.id}" data-d="${d}"><span class="an">${dorsalBadge(p)}<b>${esc(p.name)}</b></span><span class="ast">${out ? "Faltó" : "Vino"}<i>${out ? "X" : "✓"}</i></span></button></li>`; }).join("")}</ul>`}
      <details class="det"><summary>Más opciones de esta sesión</summary>${skipped ? "" : `<div class="row gap tool">${btn("Este día no hubo entreno (festivo)", "skipDay", {}, "ghost")}</div>`}<p class="muted small">Añadir una sesión extra (un día que no es de entreno habitual):</p><div class="row gap tool"><input type="date" id="xDate" class="inp" data-inp="xDate" aria-label="Fecha de la sesión extra">${btn("Añadir", "addExtra", {}, "ghost", "plus")}</div></details>
    </section>
    <section class="card"><div class="card-h"><h3>Asistencia de la temporada</h3><span class="count">${ts.done} sesiones</span></div>
      <ul class="abars">${ps.map(p => { const t = ts.per[p.id]; return `<li><span class="bn">${esc(p.name)}</span><span class="bt ${t.pct != null && t.pct < .75 ? "low" : ""}"><i style="width:${t.pct == null ? 0 : Math.round(t.pct * 100)}%"></i></span><b>${fmtPct(t.pct)}</b><small>${t.falts} faltas</small></li>`; }).join("")}</ul>
      <div class="months">${ts.months.map(m => `<div class="mo"><span>${cap(MESES[+m.key.slice(5) - 1]).slice(0, 3)}</span><b>${fmtPct(m.pct)}</b><small>${m.done}/${m.planned}</small></div>`).join("")}</div></section>`;
  } else {
    const byMonth = []; sess.forEach(k => { const mk = k.slice(0, 7); const last = byMonth[byMonth.length - 1]; if (last && last.key === mk) last.n++; else byMonth.push({ key: mk, n: 1 }); });
    const monthStart = new Set(byMonth.map(b => sess.find(k => k.startsWith(b.key))));
    const head1 = byMonth.map((b, i) => `<th colspan="${b.n}" class="mh m${i % 2}">${cap(MESES[+b.key.slice(5) - 1])} ${b.key.slice(0, 4)}</th>`).join("");
    const head2 = sess.map(k => { const dd = pd(k); return `<th class="dh ${k === today ? "today" : ""} ${(tr.skipped || []).includes(k) ? "skip" : ""} ${monthStart.has(k) ? "ms" : ""}"><small>${DIAS3[dd.getDay()]}</small>${dd.getDate()}</th>`; }).join("");
    const rowsH = ps.map(p => { const t = ts.per[p.id];
      return `<tr><th class="nm"><span>${esc(p.name)}</span></th><td class="sm"><b>${t.falts}</b></td><td class="sm">${fmtPct(t.pct)}</td>${sess.map(k => { const x = ((tr.absences || {})[k] || []).includes(p.id), sk = (tr.skipped || []).includes(k); return `<td class="c ${x ? "x" : ""} ${sk ? "skip" : ""} ${k > today ? "fut" : ""} ${monthStart.has(k) ? "ms" : ""}"><button type="button" data-act="toggleAbs" data-p="${p.id}" data-d="${k}" aria-label="${esc(p.name)} ${k}">${x ? "X" : ""}</button></td>`; }).join("")}</tr>`; }).join("");
    const foot = `<tr class="ft"><th class="nm">Faltas del día</th><td class="sm"></td><td class="sm"></td>${sess.map(k => { const sk = (tr.skipped || []).includes(k); const n = ps.filter(p => ((tr.absences || {})[k] || []).includes(p.id)).length; return `<td class="c ${sk ? "skip" : ""} ${monthStart.has(k) ? "ms" : ""}">${k > today || sk ? "" : n}</td>`; }).join("")}</tr>`;
    body = `<section class="card flush"><p class="muted small pad">Toca una casilla para marcar una <b>X</b> (no vino). Los días en gris son sesiones sin entreno. Desliza hacia los lados para ver todo el curso.</p>
      <div class="mx" data-scroll="mx"><table class="mtx"><thead><tr><th class="nm" rowspan="2">Jugador</th><th class="sm" rowspan="2">Falt.</th><th class="sm" rowspan="2">%</th>${head1}</tr><tr>${head2}</tr></thead><tbody>${rowsH}${foot}</tbody></table></div></section>`;
  }
  return `${pageHead("Entrenamientos", `${ts.done} realizadas · ${ts.planned} previstas · asistencia media ${fmtPct(ts.teamPct)}`, btn("Ajustes", "openSettings", {}, "ghost", "edit"))}${seg}${body}`;
};
ACT.trainMode = el => { UI.trainMode = el.dataset.v; };
ACT.trainNav = el => { const sess = seasonSessions(), i = sess.indexOf(UI.trainDate) + Number(el.dataset.d); if (sess[i]) UI.trainDate = sess[i]; };
CHG.trainPick = el => { UI.trainDate = el.value; };
ACT.skipDay = () => {
  const tr = Store.training, d = UI.trainDate; if (!d) return;
  tr.skipped = [...(tr.skipped || []).filter(x => x !== d), d]; Store.save("training", tr);
  toast("Sesión marcada como «sin entreno». Puedes volver a contarla desde aquí.", "ok");
};
ACT.unskipDay = () => {
  const tr = Store.training, d = UI.trainDate; if (!d) return;
  tr.skipped = (tr.skipped || []).filter(x => x !== d); Store.save("training", tr);
  toast("Sesión de nuevo en la asistencia. Ya puedes pasar lista.", "ok");
};
ACT.toggleAbs = el => {
  const tr = Store.training, d = el.dataset.d, p = el.dataset.p; tr.absences = tr.absences || {};
  const arr = tr.absences[d] || [];
  tr.absences[d] = arr.includes(p) ? arr.filter(x => x !== p) : [...arr, p];
  if (!tr.absences[d].length) delete tr.absences[d];
  Store.save("training", tr);
};
INP.xDate = el => { UI.xDate = el.value; };
ACT.addExtra = () => {
  const d = UI.xDate; if (!d) { toast("Elige la fecha de la sesión extra.", "err"); return; }
  if (seasonSessions().includes(d)) { toast("Esa fecha ya es una sesión.", "err"); UI.trainDate = d; return; }
  const tr = Store.training; tr.extra = [...(tr.extra || []), d]; Store.save("training", tr); UI.trainDate = d; UI.xDate = ""; toast("Sesión extra añadida.", "ok");
};
