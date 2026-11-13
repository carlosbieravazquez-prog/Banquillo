/* ===== Datos: base de datos compartida entre dispositivos ===== */
const Store = {
  db: null, user: null, roles: {},
  seasons: [], sid: null,
  players: [], matches: [], reports: {}, training: { absences: {}, skipped: [], extra: [] },
  loaded: {}, slow: false, offline: false, clubLinks: [], clubLinksReady: false,
  status: "idle", // idle | saving | saved | error
  subs: [], pending: new Map(), inflight: new Set(), timer: null, flushing: false, retryTimer: null, onChange: () => {},
};

(function () {
  const S = Store;
  const SEASON_FIELDS = ["name", "club", "category", "status", "settings", "createdAt"];
  const PLAYER_FIELDS = ["name", "dorsal", "order", "active", "notes"];
  const MATCH_FIELDS = ["n", "date", "rival", "home", "rest", "notes", "ourGoals", "rivalGoals", "scorers", "players", "noCall", "subs", "callDone"];
  const REPORT_FIELDS = ["text", "source", "updatedAt"];
  const pick = (o, f) => { const r = {}; f.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); return JSON.parse(JSON.stringify(r)); };

  S.pathOf = (kind, id, sid = S.sid) => ({
    season: `seasons/${id}`, player: `seasons/${sid}/players/${id}`, match: `seasons/${sid}/matches/${id}`,
    report: `seasons/${sid}/reports/${id}`, training: `seasons/${sid}/training/main`,
  }[kind]);
  S.serialize = (kind, o) => {
    if (kind === "season") return pick(o, SEASON_FIELDS);
    if (kind === "player") return pick(o, PLAYER_FIELDS);
    if (kind === "match") return pick(o, MATCH_FIELDS);
    if (kind === "report") return pick(o, REPORT_FIELDS);
    return JSON.parse(JSON.stringify({ absences: o.absences || {}, skipped: o.skipped || [], extra: o.extra || [] }));
  };
  S.season = () => S.seasons.find(s => s.id === S.sid) || null;
  S.activePlayers = () => S.players.filter(p => p.active !== false);
  S.match = n => S.matches.find(m => m.n === Number(n)) || null;
  S.player = id => S.players.find(p => p.id === id) || null;
  S.isLoaded = () => !!S.loaded.seasons && (!S.sid || (S.loaded.players && S.loaded.matches && S.loaded.training && S.loaded.reports));
  S.role = () => S.roles[S.sid] || null;
  // Un director puede editar la temporada vinculada a su club sin convertirse
  // en entrenador/editor. La autorización definitiva sigue en RLS (can_edit).
  S.isClubManagerForSeason = sid => !!sid && (S.clubLinks || []).some(link =>
    link.season_id === sid && link.manager === true && link.archived !== true
  );
  S.readOnly = () => !!S.sid && !(
    S.roles[S.sid] === "owner" ||
    S.roles[S.sid] === "editor" ||
    S.isClubManagerForSeason(S.sid)
  );

  const setStatus = st => { S.status = st; S.onChange("status"); };

  /* ---------- escritura con cola (una a la vez por documento) ---------- */
  S.save = (kind, obj) => {
    if (!S.db || S.readOnly()) return;
    const sid = kind === "season" ? obj.id : S.sid;
    const path = S.pathOf(kind, obj.id || "main", sid);
    S.pending.set(path, { path, data: S.serialize(kind, obj) });
    setStatus("saving");
    clearTimeout(S.timer);
    S.timer = setTimeout(S.flush, 350);
  };
  S.remove = (kind, id) => {
    if (!S.db || S.readOnly()) return;
    const path = S.pathOf(kind, id);
    S.pending.set(path, { path, del: true });
    setStatus("saving");
    clearTimeout(S.timer);
    S.timer = setTimeout(S.flush, 200);
  };
  S.flush = async () => {
    if (S.flushing) return;
    S.flushing = true;
    let failed = false;
    try {
      while (S.pending.size) {
        const [path, w] = S.pending.entries().next().value;
        S.pending.delete(path);
        S.inflight.add(path);
        try {
          if (w.del) await S.db.doc(path).delete(); else await S.db.doc(path).set(w.data);
        } catch (e) {
          failed = true;
          if (!S.pending.has(path)) S.pending.set(path, w);
          S.lastError = e;
          break;
        } finally { S.inflight.delete(path); }
      }
    } finally { S.flushing = false; }
    if (failed) {
      setStatus("error");
      clearTimeout(S.retryTimer);
      const code = S.lastError && S.lastError.code;
      if (code !== "invalid_argument" && code !== "quota_exceeded" && code !== "permission" && code !== "doc_too_large" && code !== "season_full") S.retryTimer = setTimeout(S.flush, 6000);
    } else {
      setStatus("saved");
      setTimeout(() => { if (S.status === "saved") setStatus("idle"); }, 2200);
    }
  };
  S.retry = () => { clearTimeout(S.retryTimer); S.flush(); };

  /* ---------- suscripciones ---------- */
  const unsubAll = () => { S.subs.forEach(u => { try { u(); } catch (e) { /* noop */ } }); S.subs = []; };
  const local = (kind, id) => kind === "player" ? S.player(id) : kind === "match" ? S.matches.find(m => m.id === id) : kind === "report" ? S.reports[id] : null;
  const busy = path => S.pending.has(path) || S.inflight.has(path);

  function applyCollection(kind, sid, snap) {
    if (sid !== S.sid) return;
    const seen = new Set();
    const out = [];
    snap.docs.forEach(d => {
      seen.add(d.id);
      const cur = local(kind, d.id);
      out.push(busy(S.pathOf(kind, d.id, sid)) && cur ? cur : { id: d.id, ...d.data() });
    });
    const curList = kind === "player" ? S.players : kind === "match" ? S.matches : Object.values(S.reports);
    curList.forEach(o => { if (!seen.has(o.id) && busy(S.pathOf(kind, o.id, sid))) out.push(o); });
    if (kind === "player") S.players = out.sort((a, b) => (a.order || 0) - (b.order || 0));
    else if (kind === "match") S.matches = out.sort((a, b) => (a.n || 0) - (b.n || 0));
    else { S.reports = {}; out.forEach(o => { S.reports[o.id] = o; }); }
    S.loaded[kind === "player" ? "players" : kind === "match" ? "matches" : "reports"] = true;
    S.onChange("data");
  }

  S.subscribeSeason = sid => {
    unsubAll();
    S.sid = sid;
    S.players = []; S.matches = []; S.reports = {}; S.training = { absences: {}, skipped: [], extra: [] };
    S.loaded = { seasons: S.loaded.seasons };
    if (!sid) { S.onChange("data"); return; }
    const err = e => { S.offline = true; S.onChange("data"); console.warn("db", e); };
    const base = `seasons/${sid}`;
    S.subs.push(S.db.collection(`${base}/players`).onSnapshot(s => applyCollection("player", sid, s), err));
    S.subs.push(S.db.collection(`${base}/matches`).onSnapshot(s => applyCollection("match", sid, s), err));
    S.subs.push(S.db.collection(`${base}/reports`).onSnapshot(s => applyCollection("report", sid, s), err));
    S.subs.push(S.db.doc(`${base}/training/main`).onSnapshot(s => {
      if (sid !== S.sid) return;
      if (!busy(S.pathOf("training", "main", sid))) {
        const d = s.exists ? s.data() : {};
        S.training = { absences: d.absences || {}, skipped: d.skipped || [], extra: d.extra || [] };
      }
      S.loaded.training = true;
      S.onChange("data");
    }, err));
  };

  S.selectSeason = id => {
    try { localStorage.setItem("bq.season", id); } catch (e) { /* noop */ }
    // Los enlaces del panel DD usan ?season=<id>. Actualizarlo al cambiar evita
    // que un F5 vuelva a abrir una temporada antigua.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("season") && id) {
        url.searchParams.set("season", id);
        history.replaceState(history.state, "", url.pathname+url.search+url.hash);
      }
    } catch(e) { /* Navegador sin historial disponible */ }
    if (id !== S.sid) S.subscribeSeason(id);
  };

  S.loadRoles = async () => {
    const { data, error } = await Cloud.sb.from("season_members").select("season_id,role").eq("user_id", S.user.uid);
    if (!error && data) { S.roles = {}; data.forEach(r => { S.roles[r.season_id] = r.role; }); }
  };
  S.loadClubLinks = async () => {
    const uid = S.user?.uid;
    if (!uid) { S.clubLinks = []; S.clubLinksReady = false; return; }
    S.clubLinksReady = false;
    try {
      const data = await Cloud.rpc("banquillo_my_season_context");
      if (S.user?.uid !== uid) return;
      S.clubLinks = Array.isArray(data) ? data : [];
      S.clubLinksReady = true;
    } catch (e) {
      if (S.user?.uid === uid) { S.clubLinks = []; S.clubLinksReady = false; }
    }
    S.onChange("data");
  };
  S.reset = () => { unsubAll(); S.seasonsUnsub && S.seasonsUnsub(); S.seasonsUnsub = null; if (S.db && S.db.reset) S.db.reset(); clearTimeout(S.timer); clearTimeout(S.retryTimer); S.pending.clear(); S.inflight.clear();
    S.clubLinks = []; S.clubLinksReady = false; S.seasons = []; S.sid = null; S.players = []; S.matches = []; S.reports = {}; S.training = { absences: {}, skipped: [], extra: [] }; S.loaded = {}; S.roles = {}; S.offline = false; S.slow = false; S.db = null; S.user = null; };

  S.init = async (db, user) => {
    S.db = db; S.user = user;
    try { await S.loadRoles(); } catch (e) { /* se reintenta con la lista de temporadas */ }
    await S.loadClubLinks();
    const slowT = setTimeout(() => { if (!S.isLoaded()) { S.slow = true; S.onChange("data"); } }, 10000);
    S.seasonsUnsub = db.collection("seasons").onSnapshot(async snap => {
      if (!S.user) return;
      const hadUnknown = snap.docs.some(d => !S.roles[d.id]);
      if (hadUnknown) { try { await S.loadRoles(); } catch (e) { /* noop */ } if (!S.user) return; }
      S.offline = false;
      S.seasons = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name < b.name ? 1 : -1));
      S.pending.forEach((w, path) => {
        const m = path.match(/^seasons\/([^/]+)$/);
        if (m && w.data) { const i = S.seasons.findIndex(s => s.id === m[1]); const o = { id: m[1], ...w.data }; if (i >= 0) S.seasons[i] = o; else S.seasons.push(o); }
      });
      S.loaded.seasons = true;
      clearTimeout(slowT); S.slow = false;
      if (!S.seasons.length) { if (S.sid) S.subscribeSeason(null); S.onChange("data"); return; }
      if (!S.sid || !S.season()) {
        let want = null;
        try {
          const requested = new URLSearchParams(window.location.search).get("season");
          want = S.seasons.some(s=>s.id===requested)?requested:localStorage.getItem("bq.season");
        } catch (e) { try { want=localStorage.getItem("bq.season"); }catch(_){} }
        const pickS = S.seasons.find(s => s.id === want) || S.seasons.find(s => s.status !== "closed") || S.seasons[0];
        S.subscribeSeason(pickS.id);
      }
      S.onChange("data");
    }, e => { S.offline = true; S.onChange("data"); console.warn("db seasons", e); });
  };

  // Tras unirse con un código: recarga permisos y temporadas y abre la temporada
  S.afterJoin = async sid => {
    await S.loadRoles();
    await S.loadClubLinks();
    await S.db.refreshNow("seasons");
    S.selectSeason(sid);
  };

  /* ---------- crear temporada (escritura directa con progreso) ---------- */
  S.createSeason = async (cfg, onProgress) => {
    const id = cfg.id;
    const seasonData = S.serialize("season", { name: cfg.name, club: cfg.club, category: cfg.category, status: "active", settings: cfg.settings, createdAt: new Date().toISOString() });
    const items = [
      ...cfg.players.map(p => ({ path: `seasons/${id}/players/${p.id}`, data: S.serialize("player", p) })),
      ...cfg.matches.map(m => ({ path: `seasons/${id}/matches/${m.id}`, data: S.serialize("match", m) })),
      { path: `seasons/${id}/training/main`, data: S.serialize("training", { absences: {}, skipped: [], extra: [] }) },
    ];
    const total = items.length + 1; let n = 0;
    try { await Cloud.rpc("create_season", { p_id: id, p_data: seasonData }); }
    catch (e) { if (!(e && e.code === "season_exists" && S.roles[id] === "owner")) throw e; }
    onProgress && onProgress(++n, total);
    S.roles[id] = "owner";
    for (let i = 0; i < items.length; i += 25) {
      const part = items.slice(i, i + 25);
      for (let t = 0; ; t++) {
        try { await S.db.batchSet(part); break; }
        catch (e) { if (t >= 3 || !e || e.code !== "unavailable") throw e; await new Promise(r => setTimeout(r, 500 * (t + 1))); }
      }
      n += part.length; onProgress && onProgress(Math.min(n, total), total);
    }
    S.seasons = [...S.seasons.filter(x => x.id !== id), { id, ...seasonData }].sort((a, b) => (a.name < b.name ? 1 : -1));
    try { await S.db.refreshNow("seasons"); } catch (e) { /* el sondeo lo pondrá al día */ }
    return id;
  };
})();
