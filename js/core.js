/* ===== Interfaz: estado, router, render, eventos ===== */
const UI = { route: { name: "inicio", arg: null }, matchTab: null, trainMode: "lista", trainDate: null, sheet: null, dirty: false, force: false,
  pointerDown: false, filter: "todos", ai: {}, subDraft: {}, pasteOpen: false, newPlayer: false, wiz: null };
const V = {};      // vistas
const ACT = {};    // acciones (clic)
const CHG = {};    // cambios (change)
const INP = {};    // entrada de texto (sin re-render)
const READ_OK = new Set(["go", "closeSheet", "setTab", "setFilter", "trainMode", "trainNav", "trainPick", "openReport", "dlPdf", "dlZip", "dlXlsx", "toggleSkip0", "openMatch", "openCoachNotice", "openSeason", "trainToday", "copyCron", "noop", "openAccount", "openJoin", "openTeamJoin", "joinSeason", "openShare", "leaveAsk", "leaveSeason", "signOut", "openSilbatos", "deleteAccountAsk", "deleteAccount", "wizStart", "copyCode", "openClubPanel", "refreshSeasonLinks", "leaveTeamAsk", "leaveTeamConfirmed", "withdrawTeamRequest", "leaveClubFromSeasonAsk", "leaveClubFromSeasonConfirmed", "archiveTeamFromSeasonAsk", "archiveTeamFromSeasonConfirmed", "deleteClubFromSeasonAsk"]);
const inWizard = a => !!UI.wiz && /^(w[A-Z]|wiz)/.test(a);
const NAV = [["inicio", "Inicio", "home"], ["partidos", "Partidos", "cal"], ["plantilla", "Plantilla", "users"], ["entrenos", "Entrenos", "check"], ["informes", "Informes", "doc"]];
const ROUTE_TITLE = { inicio: "Inicio", partidos: "Partidos", partido: "Partido", plantilla: "Plantilla", jugador: "Jugador", entrenos: "Entrenos", informes: "Informes", temporadas: "Temporadas" };

/* ---------- router ---------- */
function parseHash() {
  const h = (location.hash || "").replace(/^#/, "");
  if (!h) return { name: "inicio", arg: null };
  const i = h.indexOf("-");
  const name = i < 0 ? h : h.slice(0, i);
  return ROUTE_TITLE[name] ? { name, arg: i < 0 ? null : h.slice(i + 1) } : { name: "inicio", arg: null };
}
function go(name, arg) {
  const h = arg != null ? `${name}-${arg}` : name;
  UI.route = { name, arg: arg == null ? null : String(arg) };
  UI.matchTab = null;
  try { if (location.hash.replace(/^#/, "") !== h) history.replaceState(null, "", "#" + h); } catch (e) { /* noop */ }
  window.scrollTo(0, 0);
  render(true);
}
window.addEventListener("hashchange", () => { UI.route = parseHash(); UI.matchTab = null; render(true); });

/* ---------- avisos ---------- */
function toast(msg, kind = "") {
  const box = $("#toasts"); if (!box) return;
  const el = document.createElement("div");
  el.className = "toast " + kind; el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, kind === "err" ? 5200 : 2800);
}
function confirmSheet(title, text, yesLabel, yesAct, yesData = {}, danger = true) {
  UI.sheet = { type: "confirm", title, text, yesLabel, yesAct, yesData, danger }; render(true);
}

/* ---------- piezas comunes ---------- */
const btn = (label, act, data = {}, cls = "", ic = "") =>
  `<button type="button" class="btn ${cls}" data-act="${act}" ${Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(" ")}>${ic ? icon(ic) : ""}${label ? `<span>${label}</span>` : ""}</button>`;
const resTxt = { V: "Victoria", E: "Empate", D: "Derrota" };
const resPill = (r, score) => r ? `<span class="res res-${r}">${score ? esc(score) : resTxt[r]}</span>` : "";
const empty = (title, text, action = "") => `<div class="empty"><div class="empty-t">${title}</div><p>${text}</p>${action}</div>`;
const pageHead = (title, sub = "", right = "") => `<div class="phead"><div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ""}</div>${right ? `<div class="phead-r">${right}</div>` : ""}</div>`;
const dorsalBadge = p => `<span class="dors ${p && p.dorsal != null && p.dorsal !== "" ? "" : "none"}">${p && p.dorsal != null && p.dorsal !== "" ? esc(p.dorsal) : "–"}</span>`;
const matchLabel = m => m.rest ? "Descansa" : (m.rival || "Rival por definir");
const matchScore = m => { const i = Calc.matchInfo(m); return i.played ? `${m.ourGoals}-${m.rivalGoals}` : ""; };

/* ---------- vista principal ---------- */
function bodyView() {
  if (Store.connecting && !Store.db) return `<div class="loading"><div class="spin"></div><p>Conectando con tus datos…</p></div>`;
  if (!Store.db) return empty("Sin conexión con los datos", "No se ha podido abrir la base de datos. Recarga la página e inténtalo de nuevo.");
  if (!Store.isLoaded()) {
    return `<div class="loading"><div class="spin"></div><p>${Store.offline ? "No se puede conectar con los datos. Se reintentará automáticamente." : Store.slow ? "Tarda más de lo normal en responder. Comprueba tu conexión." : "Cargando tus datos…"}</p></div>`;
  }
  if (!Store.seasons.length) {
    return '<div class="bq-onboard"><div class="bq-onboard-head"><span>BIENVENIDO A BANQUILLO</span><h1>Empieza a organizar tu fútbol base</h1><p>Una única cuenta para gestionar un equipo o coordinar un club. Elige cómo empezar.</p></div><div class="bq-onboard-grid">'+
      '<article class="bq-onboard-card"><div class="bq-onboard-icon">⚽</div><h2>Crear equipo</h2><p>Configura categoría, plantilla, calendario y entrenadores desde tu primera temporada.</p>'+btn("Crear mi equipo","wizStart",{first:1},"primary","plus")+'</article>'+
      '<article class="bq-onboard-card"><div class="bq-onboard-icon">🏟️</div><h2>Crear club</h2><p>Organiza equipos, temporadas y dirección deportiva. Completa la configuración poco a poco.</p><a class="btn primary" href="clubes.html">Gestionar mi club →</a></article>'+
      '<article class="bq-onboard-card"><div class="bq-onboard-icon">◈</div><h2>Mostrar prueba</h2><p>Explora una demostración profesional con jornadas, estadísticas y datos ficticios.</p>'+btn("Ver demostraciones","openDemoChooser",{},"ghost")+'</article></div>'+
      (typeof TeamRequests!=="undefined"?TeamRequests.panel():"")+
      '<div class="bq-onboard-join"><span>¿Te han invitado a un equipo?</span>'+btn("Introducir código de equipo","openTeamJoin",{},"ghost")+btn("Código antiguo de temporada","openJoin",{},"ghost")+'</div></div>';
  }
  const fn = V[UI.route.name] || V.inicio;
  return fn(UI.route.arg);
}
function syncBadge() {
  const m = { idle: ["ok", "Todo guardado"], saving: ["wait", "Guardando…"], saved: ["ok", "Guardado"], error: ["bad", "Sin guardar · Reintentar"] }[Store.status];
  const lock = Store.readOnly() ? `<span class="sync ro">${icon("lock")}Solo lectura</span>` : "";
  return lock || `<button type="button" class="sync ${m[0]}" data-act="${Store.status === "error" ? "retrySave" : "noop"}" title="${m[1]}"><i></i><span>${m[1]}</span></button>`;
}
function accountBtn(compact) {
  const p = Cloud.profile, ini = esc(((p && (p.name || p.email)) || "?").trim().charAt(0).toUpperCase());
  return `<button type="button" class="acc ${compact ? "compact" : ""}" data-act="openAccount" aria-label="Mi cuenta"><span class="avatar">${ini}</span>${compact ? "" : `<span class="acc-t"><b>Mi cuenta</b><small>${p ? p.tokens : 0} Silbatos</small></span>`}</button>`;
}
function shell() {
  if (Store.isLoaded() && Store.db && !Store.seasons.length) {
    return '<div class="bq-entry-shell"><header class="bq-entry-header"><div class="bq-entry-brand"><span class="mark">'+icon("ball")+'</span><b>BANQUILLO</b><small>Fútbol base · Gestión profesional</small></div>'+accountBtn()+'</header><main class="bq-entry-main">'+bodyView()+'</main></div>';
  }
  const s = Store.season();
  const rn = UI.route.name;
  const activeKey = rn === "partido" ? "partidos" : rn === "jugador" ? "plantilla" : rn;
  const nav = (cls) => NAV.map(([k, l, ic]) => `<button type="button" class="${cls} ${activeKey === k ? "on" : ""}" data-act="go" data-to="${k}" ${activeKey === k ? 'aria-current="page"' : ""}>${icon(ic)}<span>${l}</span></button>`).join("");
  const seasonChip = s ? `<button type="button" class="schip" data-act="go" data-to="temporadas" title="Cambiar de temporada">${esc(s.name)}${s.status === "closed" ? " · cerrada" : ""}${icon("chev")}</button>` : "";
  return `<div class="shell ${Store.readOnly() ? "ro" : ""}">
    <aside class="side">
      <div class="brand"><span class="mark">${icon("ball")}</span><div><b>Banquillo</b><small>${esc((s && s.club) || "Tu equipo")}</small></div></div>
      <nav class="snav">${nav("sitem")}<button type="button" class="sitem ${activeKey === "temporadas" ? "on" : ""}" data-act="go" data-to="temporadas">${icon("layers")}<span>Temporadas</span></button><a class="sitem" href="clubes.html" aria-label="Abrir gestión de clubes">${icon("layers")}<span>Clubes · Beta</span></a></nav>
      <div class="side-foot">${seasonChip}${syncBadge()}${accountBtn()}</div>
    </aside>
    <div class="col">
      <header class="top"><div class="top-in">
        <div class="top-l"><span class="mark sm">${icon("ball")}</span><b class="top-t">${ROUTE_TITLE[rn] === "Inicio" ? "Banquillo" : ROUTE_TITLE[rn]}</b></div>
        <div class="top-r mob-only">${seasonChip}${accountBtn(true)}</div><div class="top-r desk-only">${syncBadge()}</div>
      </div></header>
      <main id="main" class="main">${Store.readOnly() ? "" : ""}${bodyView()}</main>
    </div>
    <nav class="tabs" aria-label="Secciones">${nav("tab")}</nav>
    ${Store.status === "error" ? `<div class="errbar"><span>No se han podido guardar los últimos cambios.</span><button type="button" data-act="retrySave">Reintentar</button></div>` : ""}
  </div>`;
}

/* ---------- hoja modal ---------- */
function sheetView() {
  const sh = UI.sheet; if (!sh) return "";
  let inner = "";
  if (sh.type === "confirm") {
    inner = `<h2>${esc(sh.title)}</h2><p>${esc(sh.text)}</p><div class="row end gap">${btn("Cancelar", "closeSheet", {}, "ghost")}${btn(esc(sh.yesLabel), sh.yesAct, sh.yesData, sh.danger ? "danger" : "primary")}</div>`;
  } else if (V.sheet && V.sheet[sh.type]) inner = V.sheet[sh.type](sh);
  return `<div class="scrim" data-act="closeSheet"></div><div class="sheet ${sh.wide ? "wide" : ""}" role="dialog" aria-modal="true"><button type="button" class="sheet-x" data-act="closeSheet" aria-label="Cerrar">${icon("x")}</button>${inner}</div>`;
}
V.sheet = {};
ACT.openDemoChooser = () => { UI.sheet = { type: "demoChooser" }; };
V.sheet.demoChooser = () => '<h2>Explorar Banquillo</h2><p class="muted">Dos demostraciones completas con datos ficticios. No modifican tu cuenta ni tus equipos reales.</p><div class="bq-demo-modes"><a class="bq-demo-option" href="demo-club.html"><b>🏟️ Gestionar club</b><span>Dirección deportiva · Instalaciones, calendarios y equipos</span></a><a class="bq-demo-option" href="demo-equipo.html"><b>⚽ Dirigir equipo</b><span>Entrenador · 18 jornadas, plantilla y estadísticas</span></a></div>';
ACT.closeSheet = () => { UI.sheet = null; render(true); };
ACT.noop = () => {};
ACT.retrySave = () => Store.retry();
ACT.go = el => go(el.dataset.to, el.dataset.arg);

/* ---------- render ---------- */
const isEditing = () => { const a = document.activeElement; return !!a && a !== document.body &&  !!a.matches && a.matches("input:not([type=checkbox]):not([type=radio]):not([type=button]),textarea"); };
let raf = 0;
function render(force) {
  if (force) UI.force = true;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(doRender);
}
function doRender() {
  if (typeof Auth !== "undefined" && Auth.state !== "in") { UI.force = false; UI.dirty = false; Auth.render(); return; }
  if (!UI.force && isEditing()) { UI.dirty = true; return; }
  UI.force = false; UI.dirty = false;
  const keep = { y: window.scrollY, sc: {} };
  $$("[data-scroll]").forEach(e => { keep.sc[e.dataset.scroll] = [e.scrollLeft, e.scrollTop]; });
  const sheetBody = $("#sheetRoot .sheet");
  keep.sheetY = sheetBody ? sheetBody.scrollTop : 0;
  $("#app").innerHTML = shell();
  $("#sheetRoot").innerHTML = sheetView();
  document.body.classList.toggle("noscroll", !!UI.sheet);
  $$("[data-scroll]").forEach(e => { const v = keep.sc[e.dataset.scroll]; if (v) { e.scrollLeft = v[0]; e.scrollTop = v[1]; } });
  window.scrollTo(0, keep.y);
  const sh = $("#sheetRoot .sheet"); if (sh) sh.scrollTop = keep.sheetY;
  if (Store.readOnly()) $$("#main input,#main select,#main textarea").forEach(e => { e.disabled = true; });
  if (V.after) V.after();
}
function lateRender() {
  clearTimeout(lateRender.t);
  lateRender.t = setTimeout(() => {
    if (!UI.dirty) return;
    if (UI.pointerDown || isEditing()) return lateRender();
    render(true);
  }, 120);
}
Store.onChange = () => render();

/* ---------- eventos ---------- */
document.addEventListener("pointerdown", () => { UI.pointerDown = true; }, true);
["pointerup", "pointercancel"].forEach(t => document.addEventListener(t, () => { setTimeout(() => { UI.pointerDown = false; }, 0); }, true));
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  if (Store.readOnly() && !READ_OK.has(el.dataset.act) && !inWizard(el.dataset.act)) { toast("Estás en modo solo lectura: no puedes cambiar datos.", "err"); return; }
  fn(el, e);
  render(true);
});
document.addEventListener("change", e => {
  const el = e.target.closest("[data-chg]");
  if (!el) return;
  const fn = CHG[el.dataset.chg];
  if (!fn) return;
  if (Store.readOnly() && !UI.wiz) { toast("Estás en modo solo lectura: no puedes cambiar datos.", "err"); return; }
  fn(el, e);
  UI.dirty = true; lateRender();
});
document.addEventListener("input", e => {
  const el = e.target.closest("[data-inp]");
  if (!el) return;
  const fn = INP[el.dataset.inp];
  if (fn && (!Store.readOnly() || UI.wiz || UI.sheet && UI.sheet.type === "join")) fn(el, e);
});
document.addEventListener("focusout", () => { if (UI.dirty) lateRender(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && UI.sheet) ACT.closeSheet();
  if (e.key === "Enter" && e.target.matches && e.target.matches("[data-enter]")) { e.preventDefault(); const t = $(`[data-act="${e.target.dataset.enter}"]`); if (t) t.click(); }
});
