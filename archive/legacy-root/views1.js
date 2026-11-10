/* ===== Vistas: Inicio, Partidos, Partido ===== */
const playerLabel = p => `${p.dorsal != null && p.dorsal !== "" ? p.dorsal + " · " : ""}${p.name}`;
const playerOptions = (list, sel, blank, extra = "") =>
  `<option value="">${esc(blank)}</option>${extra}` + list.map(p => `<option value="${esc(p.id)}" ${p.id === sel ? "selected" : ""}>${esc(playerLabel(p))}</option>`).join("");
const nextMatchOf = () => { const t = todayKey(); return Store.matches.find(m => !m.rest && !Calc.matchInfo(m).played && (!m.date || m.date >= t)) || Store.matches.find(m => !m.rest && !Calc.matchInfo(m).played) || null; };
const calledPlayers = m => { const nc = Calc.noCallMap(m); return Store.activePlayers().filter(p => !(p.id in nc)); };
const seasonSessions = () => Calc.sessionList((Store.season() || {}).settings, Store.training);
const trainStats = () => Calc.trainingStats(Store.activePlayers(), seasonSessions(), Store.training, todayKey());

/* ---------- INICIO ---------- */
V.inicio = () => {
  const s = Store.season(), ms = Store.matches, ps = Store.activePlayers(), today = todayKey();
  const rec = Calc.record(ms), nx = nextMatchOf(), ts = trainStats();
  const scorers = Calc.scorersTable(ps, ms).slice(0, 5), og = Calc.ownGoals(ms);
  const played = ms.filter(m => Calc.matchInfo(m).played).slice(-5);
  const form = played.length ? `<div class="fdots" title="Últimos partidos">${played.map(m => `<span class="dot dot-${Calc.matchInfo(m).res}" title="J${m.n} · ${esc(matchLabel(m))} ${matchScore(m)}">${Calc.matchInfo(m).res}</span>`).join("")}</div>` : "";
  const noDorsal = ps.filter(p => p.dorsal == null || p.dorsal === "");
  const overdue = ms.filter(m => !m.rest && m.date && m.date < today && !Calc.matchInfo(m).played);
  const sessToday = seasonSessions().includes(today) && !(Store.training.skipped || []).includes(today);
  const maxG = scorers.length ? scorers[0].goals : 1;

  let nextCard;
  if (nx) {
    const reg = Calc.isRegistered(nx);
    const conv = reg ? calledPlayers(nx).length : null;
    nextCard = `<section class="next card">
      <div class="next-k"><span>Próximo partido</span><b>Jornada ${nx.n}</b></div>
      <div class="next-main">
        <div><h2>${esc(matchLabel(nx))}</h2>
        <p>${nx.date ? esc(fmtLong(nx.date)) : "Fecha por definir"}${nx.date && relDay(nx.date) ? ` · <b>${relDay(nx.date)}</b>` : ""}${nx.home != null ? ` · ${nx.home ? "Local" : "Visitante"}` : ""}</p></div>
        <div class="next-st ${reg ? "ok" : "warn"}">${reg ? `${conv} convocados de ${ps.length}` : "Convocatoria sin confirmar"}</div>
      </div>
      <div class="row gap wrap">${btn("Convocatoria", "openMatch", { n: nx.n, tab: "convocatoria" }, reg ? "ghost" : "primary", "users")}${btn("Ficha del partido", "openMatch", { n: nx.n, tab: "ficha" }, reg ? "primary" : "ghost", "ball")}</div>
    </section>`;
  } else {
    nextCard = `<section class="next card"><div class="next-k"><span>Calendario</span><b>${ms.length ? "Temporada completada" : "Sin jornadas"}</b></div>
      <p class="muted">${ms.length ? "Ya no quedan partidos pendientes. Prepara los informes individuales de cada jugador." : "Añade las jornadas de la temporada en Partidos."}</p>
      <div class="row gap">${ms.length ? btn("Ir a informes", "go", { to: "informes" }, "primary", "doc") : btn("Añadir jornadas", "go", { to: "partidos" }, "primary", "plus")}</div></section>`;
  }

  const avisos = [];
  if (overdue.length) avisos.push(`<li>${overdue.length === 1 ? "La jornada" : "Las jornadas"} <b>${overdue.map(m => m.n).join(", ")}</b> ya se ${overdue.length === 1 ? "jugó" : "jugaron"} y falta${overdue.length === 1 ? "" : "n"} el resultado. ${btn("Revisar", "openMatch", { n: overdue[0].n, tab: "ficha" }, "link")}</li>`);
  if (noDorsal.length) avisos.push(`<li>Sin dorsal: <b>${noDorsal.map(p => esc(p.name)).join(", ")}</b>. ${btn("Completar", "go", { to: "plantilla" }, "link")}</li>`);
  if (nx && nx.date && daysBetween(today, nx.date) <= 3 && daysBetween(today, nx.date) >= 0 && !Calc.isRegistered(nx)) avisos.push(`<li>La convocatoria de la jornada ${nx.n} está sin confirmar.</li>`);

  return `${pageHead(esc(s.club || "Tu equipo"), `${esc(s.category || "")} · Temporada ${esc(s.name)}`)}
    ${nextCard}
    <section class="tiles">
      <div class="tile"><b>${rec.pj}</b><span>Jugados</span></div>
      <div class="tile win"><b>${rec.v}</b><span>Victorias</span></div>
      <div class="tile draw"><b>${rec.e}</b><span>Empates</span></div>
      <div class="tile loss"><b>${rec.d}</b><span>Derrotas</span></div>
      <div class="tile"><b>${rec.gf}</b><span>Goles a favor</span></div>
      <div class="tile"><b>${rec.gc}</b><span>Goles en contra</span></div>
    </section>
    ${form}
    <div class="grid2">
      <section class="card"><div class="card-h"><h3>Goleadores</h3>${btn("Plantilla", "go", { to: "plantilla" }, "link")}</div>
        ${scorers.length ? `<ul class="bars">${scorers.map(x => `<li><span class="bn">${esc(x.p.name)}</span><span class="bt"><i style="width:${Math.max(6, x.goals / maxG * 100)}%"></i></span><b>${x.goals}</b></li>`).join("")}${og ? `<li class="muted"><span class="bn">Propia puerta (rival)</span><span class="bt"></span><b>${og}</b></li>` : ""}</ul>` : `<p class="muted">Todavía no hay goles asignados.</p>`}
      </section>
      <section class="card"><div class="card-h"><h3>Entrenamientos</h3>${btn("Abrir", "go", { to: "entrenos" }, "link")}</div>
        <div class="big-pct"><b>${fmtPct(ts.teamPct)}</b><span>asistencia media del equipo</span></div>
        <p class="muted small">${ts.done} sesiones realizadas de ${ts.planned} previstas · ${ts.totalF} faltas</p>
        ${sessToday ? `<div class="row gap">${btn("Pasar lista de hoy", "trainToday", {}, "primary", "check")}</div>` : ""}
      </section>
    </div>
    ${avisos.length ? `<section class="card"><div class="card-h"><h3>Pendiente</h3></div><ul class="todo">${avisos.join("")}</ul></section>` : ""}`;
};
ACT.openMatch = el => { go("partido", el.dataset.n); UI.matchTab = el.dataset.tab || null; };
ACT.trainToday = () => { UI.trainMode = "lista"; UI.trainDate = todayKey(); go("entrenos"); };

/* ---------- PARTIDOS ---------- */
V.partidos = () => {
  const ms = Store.matches, f = UI.filter, today = todayKey();
  const rec = Calc.record(ms);
  const list = ms.filter(m => f === "todos" || (f === "jugados" && Calc.matchInfo(m).played) || (f === "pendientes" && !Calc.matchInfo(m).played && !m.rest));
  const chips = [["todos", "Todos", ms.length], ["pendientes", "Pendientes", rec.pendientes], ["jugados", "Jugados", rec.pj]]
    .map(([k, l, n]) => `<button type="button" class="fchip ${f === k ? "on" : ""}" data-act="setFilter" data-v="${k}">${l} <i>${n}</i></button>`).join("");
  const rows = list.map(m => {
    const i = Calc.matchInfo(m), isNext = nextMatchOf() === m;
    const late = !m.rest && !i.played && m.date && m.date < today;
    return `<button type="button" class="mrow ${m.rest ? "rest" : ""} ${isNext ? "next" : ""}" data-act="openMatch" data-n="${m.n}">
      <span class="mn"><small>J</small>${m.n}</span>
      <span class="mi"><b>${esc(matchLabel(m))}</b>
        <small>${m.date ? esc(fmtShort(m.date)) : "Fecha por definir"}${m.home != null && !m.rest ? ` · ${m.home ? "Local" : "Visitante"}` : ""}${isNext ? ` · <em>Próximo</em>` : ""}${late ? ` · <em class="late">Falta resultado</em>` : ""}</small></span>
      <span class="mr">${i.played ? `${resPill(i.res, matchScore(m))}` : m.rest ? `<span class="tag">Descansa</span>` : Calc.isRegistered(m) ? `<span class="tag ok">Convocados</span>` : ""}</span>
      ${icon("chev", "mc")}
    </button>`;
  }).join("");
  return `${pageHead("Partidos", `${rec.pj} jugados · ${rec.pendientes} pendientes${rec.descansos ? ` · ${rec.descansos} descanso` : ""}`, btn("Añadir jornada", "addMatch", {}, "primary", "plus"))}
    <div class="fchips">${chips}</div>
    <div class="mlist">${rows || empty("Sin jornadas", "No hay partidos con este filtro.")}</div>`;
};
ACT.setFilter = el => { UI.filter = el.dataset.v; };
ACT.addMatch = () => {
  const n = Store.matches.reduce((a, m) => Math.max(a, m.n || 0), 0) + 1;
  const m = { id: "j" + String(n).padStart(2, "0"), n, date: null, rival: "", home: true, rest: false, notes: "", ourGoals: null, rivalGoals: null, scorers: [], players: {}, noCall: [], subs: [], callDone: false };
  Store.matches.push(m); Store.save("match", m);
  go("partido", n); UI.matchTab = "datos";
};

/* ---------- PARTIDO ---------- */
const MTABS = [["convocatoria", "Convocatoria"], ["ficha", "Ficha"], ["datos", "Datos"]];
V.partido = n => {
  const m = Store.match(n);
  if (!m) return empty("Jornada no encontrada", "Puede que se haya eliminado.", btn("Volver a partidos", "go", { to: "partidos" }, "primary"));
  const tab = UI.matchTab || (m.rest ? "datos" : Calc.isRegistered(m) ? "ficha" : "convocatoria");
  UI.matchTab = tab; // fija la pestaña: marcar a alguien en la convocatoria no debe saltar a la ficha
  const i = Calc.matchInfo(m);
  const seg = MTABS.map(([k, l]) => `<button type="button" class="${tab === k ? "on" : ""}" data-act="setTab" data-v="${k}">${l}</button>`).join("");
  const body = m.rest && tab !== "datos" ? empty("Jornada de descanso", "Esta jornada no cuenta como partido.", btn("Ver datos", "setTab", { v: "datos" }, "ghost")) : (T[tab] || T.ficha)(m);
  return `<div class="mhead">
      <button type="button" class="back" data-act="go" data-to="partidos">${icon("back")}Partidos</button>
      <div class="mh-main"><span class="mh-n">J${m.n}</span><div><h1>${esc(matchLabel(m))}</h1><p>${m.date ? esc(fmtLong(m.date)) : "Fecha por definir"}${m.home != null && !m.rest ? ` · ${m.home ? "Local" : "Visitante"}` : ""}</p></div></div>
      ${i.played ? `<div class="mh-res">${resPill(i.res)}<b>${m.ourGoals}<s>-</s>${m.rivalGoals}</b></div>` : ""}
    </div>
    <div class="seg" role="tablist">${seg}</div>
    ${body}`;
};
ACT.setTab = el => { UI.matchTab = el.dataset.v; };
const T = {};
const curMatch = () => Store.match(UI.route.arg);
const touch = m => Store.save("match", m);
const entry = (m, pid) => { m.players = m.players || {}; return m.players[pid] || (m.players[pid] = { role: null, min: null, gk: false }); };
const tidy = (m, pid) => { const d = (m.players || {})[pid]; if (d && !d.role && d.min == null && !d.gk) delete m.players[pid]; };

/* ----- Convocatoria ----- */
T.convocatoria = m => {
  const nc = Calc.noCallMap(m), ps = Store.activePlayers(), nCalled = ps.filter(p => !(p.id in nc)).length;
  const opts = [["", "Convocado"], ["DT", "D.T"], ["LS", "L.S"], ["MP", "M.P"]];
  const rows = ps.map(p => {
    const cur = nc[p.id] || "";
    return `<li class="crow ${cur ? "out" : ""}"><span class="cn">${dorsalBadge(p)}<b>${esc(p.name)}</b></span>
      <span class="cseg">${opts.map(([v, l]) => `<button type="button" class="${cur === v ? "on " + (v || "ok") : ""}" data-act="setCall" data-p="${p.id}" data-v="${v}" title="${v ? MOTIVOS[v] : "Convocado"}">${l}</button>`).join("")}</span></li>`;
  }).join("");
  const done = Calc.isRegistered(m);
  return `<section class="card">
    <div class="card-h"><h3>¿Quién no viene?</h3><span class="count ${done ? "ok" : ""}">Convocados <b>${nCalled}</b> de ${ps.length}</span></div>
    <p class="muted small">Todos están convocados por defecto. Marca el motivo solo de quien no va: <b>D.T</b> Decisión técnica · <b>L.S</b> Lesionado · <b>M.P</b> Motivos personales.</p>
    <ul class="clist">${rows}</ul>
    <div class="row between gap wrap foot">
      <span class="muted small">${done ? "Convocatoria confirmada." : "Aún sin confirmar."}</span>
      ${done ? btn("Ir a la ficha", "setTab", { v: "ficha" }, "primary", "ball") : btn("Confirmar convocatoria", "confirmCall", {}, "primary", "check")}
    </div></section>`;
};
ACT.setCall = el => {
  const m = curMatch(), p = el.dataset.p, v = el.dataset.v;
  m.noCall = (m.noCall || []).filter(x => x.p !== p);
  if (v) {
    m.noCall.push({ p, m: v });
    if (m.players && m.players[p]) delete m.players[p];
    if ((m.scorers || []).includes(p)) { m.scorers = m.scorers.map(x => x === p ? null : x); toast("Sus goles han quedado sin asignar.", ""); }
    (m.subs || []).forEach(s => { if (s.out === p || s.in === p) s.bad = true; });
    m.subs = (m.subs || []).filter(s => !s.bad);
  }
  m.callDone = true; touch(m);
};
ACT.confirmCall = () => { const m = curMatch(); m.callDone = true; touch(m); toast("Convocatoria confirmada.", "ok"); };

/* ----- Ficha ----- */
const goalOptions = (m, sel) => {
  const list = calledPlayers(m);
  const extra = `<option value="og" ${sel === "og" ? "selected" : ""}>Propia puerta (rival)</option>`;
  let o = playerOptions(list, sel, "Sin asignar", extra);
  if (sel && sel !== "og" && !list.some(p => p.id === sel)) { const p = Store.player(sel); if (p) o += `<option value="${esc(sel)}" selected>${esc(p.name)} (no convocado)</option>`; }
  return o;
};
T.ficha = m => {
  const i = Calc.matchInfo(m), called = calledPlayers(m), nc = Calc.noCallMap(m), dur = (Store.season().settings || {}).matchMinutes || 50;
  const goals = Calc.isNum(m.ourGoals) ? m.ourGoals : null;
  const sc = (m.scorers || []).slice(0, goals || 0);
  const assigned = sc.filter(Boolean).length;
  const gcount = pid => sc.filter(x => x === pid).length;
  const scoreBox = `<div class="score card">
      <div class="sc-side"><small>${esc((Store.season().club || "Mi equipo").replace(/ CD$/, ""))}</small>
        <div class="ctr"><button type="button" data-act="goalOur" data-d="-1" aria-label="Quitar gol nuestro">${icon("minus")}</button><b>${goals == null ? "–" : goals}</b><button type="button" data-act="goalOur" data-d="1" aria-label="Añadir gol nuestro">${icon("plus")}</button></div></div>
      <div class="sc-mid">${i.played ? resPill(i.res) : `<span class="muted small">Marcador</span>`}${m.home != null ? `<small>${m.home ? "Local" : "Visitante"}</small>` : ""}</div>
      <div class="sc-side"><small>${esc(m.rival || "Rival")}</small>
        <div class="ctr"><button type="button" data-act="goalRiv" data-d="-1" aria-label="Quitar gol rival">${icon("minus")}</button><b>${Calc.isNum(m.rivalGoals) ? m.rivalGoals : "–"}</b><button type="button" data-act="goalRiv" data-d="1" aria-label="Añadir gol rival">${icon("plus")}</button></div></div>
    </div>
    ${goals != null || Calc.isNum(m.rivalGoals) ? `<div class="row end"><button type="button" class="link small" data-act="clearScore">Borrar marcador</button></div>` : ""}`;

  const scorersCard = goals ? `<section class="card"><div class="card-h"><h3>Goles de ${esc((Store.season().club || "Mi equipo").replace(/ CD$/, ""))}</h3><span class="count ${assigned === goals ? "ok" : "warn"}">${assigned} de ${goals} con goleador</span></div>
      <ul class="glist">${sc.map((x, k) => `<li><span class="gk">${icon("ball")}Gol ${k + 1}</span><select class="sel" data-chg="scorer" data-k="${k}" aria-label="Goleador del gol ${k + 1}">${goalOptions(m, x)}</select><button type="button" class="ix" data-act="delGoal" data-k="${k}" aria-label="Quitar gol ${k + 1}">${icon("x")}</button></li>`).join("")}</ul></section>` : "";

  const rows = called.map(p => {
    const d = (m.players || {})[p.id] || {};
    const g = gcount(p.id);
    const warn = d.min != null && !d.role;
    return `<li class="prow ${d.role === "T" ? "isT" : d.role === "S" ? "isS" : ""}">
      <span class="pn">${dorsalBadge(p)}<b>${esc(p.name)}</b></span>
      <span class="pc">
        <span class="tsw ${warn ? "warn" : ""}"><button type="button" class="${d.role === "T" ? "on T" : ""}" data-act="setRole" data-p="${p.id}" data-v="T" title="Titular">T</button><button type="button" class="${d.role === "S" ? "on S" : ""}" data-act="setRole" data-p="${p.id}" data-v="S" title="Suplente">S</button></span>
        <label class="min"><input type="text" inputmode="decimal" class="inp" data-chg="minutes" data-p="${p.id}" value="${d.min != null ? fmtNum(d.min) : ""}" placeholder="min" aria-label="Minutos de ${esc(p.name)}"></label>
        <button type="button" class="gkb ${d.gk ? "on" : ""}" data-act="toggleGk" data-p="${p.id}" title="Portero">P</button>
        <button type="button" class="gbtn ${g ? "has" : ""}" data-act="goalFor" data-p="${p.id}" title="Añadir gol a ${esc(p.name)}">${icon("ball")}<i>${g || "+"}</i></button>
      </span></li>`;
  }).join("");
  const ncNames = Store.activePlayers().filter(p => p.id in nc).map(p => `${esc(p.name)} <em>${MOTIVO_COD[nc[p.id]] || ""}</em>`).join(" · ");
  const players = `<section class="card"><div class="card-h"><h3>Jugadores</h3><span class="count">Convocados <b>${called.length}</b></span></div>
      <div class="plegend"><span><b class="lt T">T</b> Titular</span><span><b class="lt S">S</b> Suplente</span><span><b class="lt P">P</b> Portero</span><span>${icon("ball")} Gol</span></div>
      <ul class="plist">${rows}</ul>
      ${ncNames ? `<p class="muted small ncl">No convocados: ${ncNames}</p>` : ""}
      ${!Calc.isRegistered(m) ? `<p class="muted small">La convocatoria aún no está confirmada: <button type="button" class="link" data-act="setTab" data-v="convocatoria">revísala</button>.</p>` : ""}</section>`;

  const subs = (m.subs || []).slice().sort((a, b) => a.min - b.min);
  const ps = UI.subDraft, amb = UI.subAmb;
  const subCard = `<section class="card"><div class="card-h"><h3>Cambios</h3><span class="count">${subs.length}</span></div>
      <div class="qin"><input type="text" id="subText" class="inp" data-inp="subText" data-enter="addSubText" value="${esc(UI.subText || "")}" placeholder="Escribe: sale 12,5 Antonio por Enrique" autocomplete="off" autocapitalize="none" aria-label="Cambio en texto libre">${btn("Añadir", "addSubText", {}, "primary")}</div>
      ${amb ? `<div class="amb"><p><b>${amb.min}'</b> · elige a quién te refieres:</p>
        ${amb.outC.length > 1 || !amb.out ? `<div class="chips"><span class="muted small">Sale</span>${amb.outC.map(id => `<button type="button" class="chip ${amb.out === id ? "on" : ""}" data-act="subPick" data-side="out" data-p="${id}">${esc(Store.player(id).name)}</button>`).join("")}</div>` : ""}
        ${amb.inC.length > 1 || !amb.in ? `<div class="chips"><span class="muted small">Entra</span>${amb.inC.map(id => `<button type="button" class="chip ${amb.in === id ? "on" : ""}" data-act="subPick" data-side="in" data-p="${id}">${esc(Store.player(id).name)}</button>`).join("")}</div>` : ""}
        <button type="button" class="link small" data-act="subCancel">Cancelar</button></div>` : ""}
      <details class="det"><summary>Elegir con listas</summary>
        <div class="sform"><select class="sel" data-chg="subOut" aria-label="Sale">${playerOptions(called, ps.out, "Sale…")}</select>${icon("swap", "swp")}<select class="sel" data-chg="subIn" aria-label="Entra">${playerOptions(called, ps.in, "Entra…")}</select>
          <input type="text" inputmode="decimal" class="inp mini" data-chg="subMin" value="${ps.min != null ? fmtNum(ps.min) : ""}" placeholder="min" aria-label="Minuto del cambio">${btn("", "addSubForm", {}, "primary", "plus")}</div></details>
      ${subs.length ? `<ul class="slist">${subs.map(s => `<li><b class="sm">${fmtNum(s.min)}'</b><span><span class="so">Sale</span> ${esc((Store.player(s.out) || {}).name || "?")}<span class="si">Entra</span> ${esc((Store.player(s.in) || {}).name || "?")}</span><button type="button" class="ix" data-act="delSub" data-id="${s.id}" aria-label="Quitar cambio">${icon("x")}</button></li>`).join("")}</ul>` : `<p class="muted small">Todavía no hay cambios. Los minutos pueden escribirse a mano o calcularse con los cambios (partido de ${dur} min).</p>`}
      <div class="row gap wrap foot">${btn("Calcular minutos con los cambios", "calcMin", {}, "ghost", "spark")}</div></section>`;

  const crono = i.played ? `<section class="card"><div class="card-h"><h3>Crónica para las familias</h3></div>${UI.ai["cron" + m.n] ? `<textarea class="inp area" id="cronTxt" rows="6" readonly>${esc(UI.ai["cron" + m.n])}</textarea><div class="row gap wrap">${btn("Copiar texto", "copyCron", {}, "ghost", "copy")}${btn("Escribir otra", "genCron", {}, "ghost", "spark")}</div>` : `<p class="muted small">Un resumen corto del partido, listo para pegar en el grupo de familias.</p><div class="row gap">${btn(UI.ai.busyCron ? "Escribiendo…" : "Escribir crónica con IA", "genCron", {}, "ghost", "spark")}</div>`}${UI.ai.cronErr ? `<p class="err small">${esc(UI.ai.cronErr)}</p>` : ""}</section>` : "";

  return scoreBox + scorersCard + players + subCard + crono;
};

const ensureGoals = m => { if (!Calc.isNum(m.ourGoals)) { m.ourGoals = 0; m.scorers = []; } if (!Calc.isNum(m.rivalGoals)) m.rivalGoals = 0; };
const addGoal = (m, pid) => { ensureGoals(m); m.scorers = (m.scorers || []).slice(0, m.ourGoals); m.scorers.push(pid || null); m.ourGoals = m.scorers.length; };
const delGoalAt = (m, k) => { m.scorers = (m.scorers || []).slice(0, m.ourGoals); if (k >= 0 && k < m.scorers.length) m.scorers.splice(k, 1); m.ourGoals = m.scorers.length; };
ACT.goalOur = el => {
  const m = curMatch(), d = +el.dataset.d; ensureGoals(m);
  if (d > 0) addGoal(m, null);
  else if (m.ourGoals > 0) { let k = (m.scorers || []).lastIndexOf(null); if (k < 0 || k >= m.ourGoals) k = m.ourGoals - 1; delGoalAt(m, k); }
  touch(m);
};
ACT.goalRiv = el => { const m = curMatch(), d = +el.dataset.d; ensureGoals(m); m.rivalGoals = Math.max(0, Math.min(99, m.rivalGoals + d)); touch(m); };
ACT.clearScore = () => { const m = curMatch(); m.ourGoals = null; m.rivalGoals = null; m.scorers = []; touch(m); };
ACT.goalFor = el => { addGoal(curMatch(), el.dataset.p); touch(curMatch()); };
ACT.delGoal = el => { delGoalAt(curMatch(), +el.dataset.k); touch(curMatch()); };
CHG.scorer = el => { const m = curMatch(), k = +el.dataset.k; m.scorers = (m.scorers || []).slice(0, m.ourGoals); m.scorers[k] = el.value || null; touch(m); };
ACT.setRole = el => {
  const m = curMatch(), p = el.dataset.p, v = el.dataset.v, d = entry(m, p);
  d.role = d.role === v ? null : v; tidy(m, p); touch(m);
};
ACT.toggleGk = el => { const m = curMatch(), p = el.dataset.p, d = entry(m, p); d.gk = !d.gk; tidy(m, p); touch(m); };
CHG.minutes = el => {
  const m = curMatch(), p = el.dataset.p, v = parseNum(el.value);
  if (el.value.trim() !== "" && (v == null || v < 0 || v > 200)) { toast("Escribe los minutos como número, por ejemplo 25 o 12,5.", "err"); return; }
  const d = entry(m, p); d.min = v; tidy(m, p); touch(m);
};
ACT.calcMin = () => {
  const m = curMatch(), dur = (Store.season().settings || {}).matchMinutes || 50;
  const res = Calc.calcMinutes(m, dur);
  const n = Object.keys(res).length;
  if (!n) { toast("Marca primero quién es titular o suplente.", "err"); return; }
  Object.entries(res).forEach(([pid, min]) => { entry(m, pid).min = min; });
  touch(m); toast(`Minutos calculados para ${n} jugadores.`, "ok");
};

/* cambios */
const addSub = (m, min, out, inn) => {
  if (min == null || min < 0) { toast("Falta el minuto del cambio.", "err"); return false; }
  if (!out || !inn || out === inn) { toast("Elige quién sale y quién entra.", "err"); return false; }
  const a = entry(m, out), b = entry(m, inn);
  if (!a.role) a.role = "T";
  if (!b.role) b.role = "S";
  m.subs = m.subs || []; m.subs.push({ id: uid("c"), min, out, in: inn });
  touch(m); return true;
};
INP.subText = el => { UI.subText = el.value; };
CHG.subOut = el => { UI.subDraft.out = el.value || null; };
CHG.subIn = el => { UI.subDraft.in = el.value || null; };
CHG.subMin = el => { UI.subDraft.min = parseNum(el.value); };
ACT.addSubForm = () => { const m = curMatch(), d = UI.subDraft; if (addSub(m, d.min, d.out, d.in)) UI.subDraft = {}; };
ACT.delSub = el => { const m = curMatch(); m.subs = (m.subs || []).filter(s => s.id !== el.dataset.id); touch(m); };
ACT.subCancel = () => { UI.subAmb = null; };
ACT.subPick = el => {
  const a = UI.subAmb; if (!a) return;
  a[el.dataset.side] = el.dataset.p;
  if (a.out && a.in) { const m = curMatch(); if (addSub(m, a.min, a.out, a.in)) { UI.subAmb = null; UI.subText = ""; } }
};
/** Busca jugadores por nombre escrito (admite nombre suelto, p. ej. "Antonio"). */
function findPlayers(txt, pool) {
  const q = norm(txt).replace(/\./g, "").split(/\s+/).filter(Boolean);
  if (!q.length) return [];
  const full = pool.filter(p => norm(p.name) === q.join(" "));
  if (full.length) return full;
  return pool.filter(p => { const t = norm(p.name).split(/\s+/); return q.every(w => t.some(x => x.startsWith(w))); });
}
function parseSub(text) {
  const t = String(text || "").trim().replace(/[’']/g, "");
  let m = t.match(/^(?:sale\s+)?(?:min(?:uto)?\.?\s*)?(\d+(?:[.,]\d+)?)\s*(?:sale\s+)?(.+?)\s+(?:por|entra|->|→)\s+(.+)$/i);
  if (m) return { min: parseNum(m[1]), out: m[2].trim(), inn: m[3].trim() };
  m = t.match(/^(?:sale\s+)?(.+?)\s+(?:por|entra|->|→)\s+(.+?)\s+(?:en\s+(?:el\s+)?)?(?:min(?:uto)?\.?\s*)?(\d+(?:[.,]\d+)?)$/i);
  if (m) return { min: parseNum(m[3]), out: m[1].trim(), inn: m[2].trim() };
  return null;
}
ACT.addSubText = () => {
  const m = curMatch(), p = parseSub(UI.subText);
  if (!p) { toast("No lo he entendido. Prueba así: sale 12,5 Antonio por Enrique", "err"); return; }
  const called = calledPlayers(m);
  const roleOf = id => ((m.players || {})[id] || {}).role;
  const onPitch = id => { const subs = (m.subs || []); let on = roleOf(id) === "T"; subs.slice().sort((a, b) => a.min - b.min).forEach(s => { if (s.out === id) on = false; if (s.in === id) on = true; }); return on; };
  let outC = findPlayers(p.out, called), inC = findPlayers(p.inn, called);
  if (outC.length > 1) { const f = outC.filter(x => onPitch(x.id)); if (f.length) outC = f; }
  if (inC.length > 1) { const f = inC.filter(x => !onPitch(x.id)); if (f.length) inC = f; }
  if (!outC.length) { toast(`No encuentro a "${p.out}" entre los convocados.`, "err"); return; }
  if (!inC.length) { toast(`No encuentro a "${p.inn}" entre los convocados.`, "err"); return; }
  if (outC.length === 1 && inC.length === 1) { if (addSub(m, p.min, outC[0].id, inC[0].id)) { UI.subText = ""; toast(`Cambio añadido: sale ${outC[0].name}, entra ${inC[0].name}.`, "ok"); } return; }
  UI.subAmb = { min: p.min, outC: outC.map(x => x.id), inC: inC.map(x => x.id), out: outC.length === 1 ? outC[0].id : null, in: inC.length === 1 ? inC[0].id : null };
};

/* ----- Datos ----- */
T.datos = m => {
  const rivals = [...new Set(Store.matches.map(x => x.rival).filter(Boolean))].sort(sortEs);
  return `<section class="card form">
    <label class="fld"><span>Fecha</span><input type="date" class="inp" data-chg="mDate" value="${esc(m.date || "")}"></label>
    <label class="fld"><span>Descanso</span><span class="sw"><input type="checkbox" data-chg="mRest" ${m.rest ? "checked" : ""}><i></i><em>Esta jornada el equipo descansa</em></span></label>
    ${m.rest ? "" : `<label class="fld"><span>Rival</span><input type="text" class="inp" list="rivalList" data-chg="mRival" value="${esc(m.rival || "")}" placeholder="Nombre del equipo rival" autocomplete="off"><datalist id="rivalList">${rivals.map(r => `<option value="${esc(r)}">`).join("")}</datalist></label>
    <div class="fld"><span>Campo</span><div class="seg two"><button type="button" class="${m.home ? "on" : ""}" data-act="setHome" data-v="1">Local</button><button type="button" class="${m.home === false ? "on" : ""}" data-act="setHome" data-v="0">Visitante</button></div></div>`}
    <label class="fld"><span>Observaciones</span><textarea class="inp area" rows="3" data-inp="mNotes" placeholder="Hora, campo, incidencias…">${esc(m.notes || "")}</textarea></label>
    <div class="row between foot"><span></span>${btn("Eliminar jornada", "delMatchAsk", {}, "danger-ghost", "trash")}</div></section>`;
};
CHG.mDate = el => { const m = curMatch(); m.date = el.value || null; touch(m); };
CHG.mRival = el => { const m = curMatch(); m.rival = el.value.trim(); touch(m); };
CHG.mRest = el => { const m = curMatch(); m.rest = el.checked; touch(m); };
INP.mNotes = el => { const m = curMatch(); m.notes = el.value; touch(m); };
ACT.setHome = el => { const m = curMatch(); m.home = el.dataset.v === "1"; touch(m); };
ACT.delMatchAsk = () => { const m = curMatch(); confirmSheet(`¿Eliminar la jornada ${m.n}?`, "Se borrarán su convocatoria, goles y minutos. No se puede deshacer.", "Eliminar", "delMatch", { n: m.n }); };
ACT.delMatch = el => {
  const m = Store.match(el.dataset.n); if (!m) return;
  Store.matches = Store.matches.filter(x => x !== m); Store.remove("match", m.id);
  UI.sheet = null; go("partidos"); toast("Jornada eliminada.");
};
