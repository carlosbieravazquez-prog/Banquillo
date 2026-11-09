/* ===== Conexión con Supabase: sesión, base de datos en tiempo real, funciones y IA ===== */
const Cloud = { sb: null, cfg: window.BQ_CONFIG || {}, profile: null, db: null, ready: false };

(function () {
  const C = Cloud;
  const parentOf = p => p.replace(/\/[^/]+$/, "");
  const sidOf = p => p.split("/")[1];

  /* Errores: se traducen a códigos que entiende la app */
  const KNOWN = ["season_exists", "invalid_id", "too_many_seasons", "not_owner", "not_member", "owner_cannot_leave", "invalid_role",
    "insufficient_tokens", "doc_too_large", "season_full", "not_authenticated"];
  C.err = e => {
    const msg = String((e && (e.message || e.error_description || e.msg)) || e || "");
    const code = KNOWN.find(k => msg.includes(k));
    if (code) return { code, message: msg };
    if (e && (e.code === "42501" || /row-level security|permission denied/i.test(msg))) return { code: "permission", message: msg };
    if (e && (e.status === 401 || /JWT|not authenticated/i.test(msg))) return { code: "auth", message: msg };
    if (/failed to fetch|network|load failed|timeout/i.test(msg) || (e && e.status === 0)) return { code: "unavailable", message: msg };
    return { code: (e && e.code) || "unknown", message: msg };
  };
  const throwErr = e => { throw C.err(e); };

  C.configured = () => !!(C.cfg.SUPABASE_URL && /^https:\/\/.+\.supabase\.(co|in)\/?$/.test(C.cfg.SUPABASE_URL) && C.cfg.SUPABASE_ANON_KEY && !/PEGA_AQUI/.test(C.cfg.SUPABASE_ANON_KEY));

  C.init = () => {
    if (!C.configured() || !window.supabase) return false;
    C.sb = window.supabase.createClient(C.cfg.SUPABASE_URL, C.cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
    });
    C.db = makeDb(C.sb);
    C.ready = true;
    return true;
  };

  C.rpc = async (name, args) => {
    const { data, error } = await C.sb.rpc(name, args || {});
    if (error) throwErr(error);
    return data;
  };

  /* ---------- Perfil y Silbatos ---------- */
  C.loadProfile = async () => {
    try { C.profile = await C.rpc("my_profile"); } catch (e) { C.profile = C.profile || null; }
    return C.profile;
  };
  C.tokens = () => (C.profile ? C.profile.tokens : 0);

  /* ---------- IA (Edge Function: descuenta Silbatos y llama a Claude en el servidor) ---------- */
  // Consentimiento por sesión: se envían estadísticas seudonimizadas, nunca nombres ni notas libres.
  C.aiPrivacyAccepted = false;
    C.ai = async (prompt, kind, signal) => {
    if (!C.aiPrivacyAccepted) {
      const accepted = window.confirm("Privacidad de IA: se enviarán estadísticas deportivas sin nombres ni notas privadas a un proveedor externo para generar el texto. ¿Quieres continuar? Puedes cancelar y redactar el informe manualmente.");
      if (!accepted) throw { code: "cancelled" };
      C.aiPrivacyAccepted = true;
    }
    const { data: s } = await C.sb.auth.getSession();
    if (!s.session) throw { code: "auth" };
    let res;
    try {
      res = await fetch(`${C.cfg.SUPABASE_URL.replace(/\/$/, "")}/functions/v1/ai-report`, {
        method: "POST", signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session.access_token}`, apikey: C.cfg.SUPABASE_ANON_KEY },
        body: JSON.stringify({ prompt, kind }),
      });
    } catch (e) { if (e && e.name === "AbortError") throw { code: "cancelled" }; throw { code: "unavailable" }; }
    let body = {};
    try { body = await res.json(); } catch (e) { /* noop */ }
    if (!res.ok) throw { code: body.error || (res.status === 401 ? "auth" : res.status === 404 ? "ai_not_deployed" : "unknown") };
    if (C.profile && typeof body.tokens === "number") C.profile.tokens = body.tokens;
    return String(body.text || "").trim();
  };

  /* ---------- Base de datos con la misma forma que usa la app (colecciones y documentos) ---------- */
  function makeDb(sb) {
    const listeners = new Set();          // { parent, run }
    const timers = new Map();
    let channel = null, poll = null, visibilityHandler = null;

    const fetchParent = async parent => {
      const { data, error } = await sb.from("docs").select("path,data").eq("parent", parent);
      if (error) throwErr(error);
      return data || [];
    };
    const kick = parent => {
      clearTimeout(timers.get(parent));
      timers.set(parent, setTimeout(() => { listeners.forEach(l => { if (l.parent === parent) l.run(); }); }, 150));
    };
    const kickAll = () => listeners.forEach(l => l.run());
    const ensureChannel = () => {
      if (!channel) {
        channel = sb.channel("docs-changes")
          .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, payload => {
            const row = payload.new && payload.new.path ? payload.new : payload.old;
            if (row && row.path) kick(parentOf(row.path)); else kickAll();
          })
          .subscribe();
      }
      if (!poll) {
        // por si el tiempo real se corta o no avisa de un borrado
        poll = setInterval(() => { if (document.visibilityState === "visible" && listeners.size) kickAll(); }, 20000);
        visibilityHandler = () => { if (document.visibilityState === "visible" && listeners.size) kickAll(); };
        document.addEventListener("visibilitychange", visibilityHandler);
      }
    };
    const listen = (parent, deliver, onErr) => {
      const l = { parent, alive: true };
      l.running = false; l.again = false;
      l.run = async () => {
        // Evita acumular peticiones y renderizados cuando se recupera una pestaña en segundo plano.
        if (!l.alive) return;
        if (l.running) { l.again = true; return; }
        l.running = true;
        try { const rows = await fetchParent(parent); if (l.alive) deliver(rows); }
        catch (e) { if (l.alive && onErr) onErr(e); }
        finally {
          l.running = false;
          if (l.alive && l.again) { l.again = false; l.run(); }
        }
      };
      listeners.add(l); ensureChannel(); l.run();
      return () => {
        l.alive = false; listeners.delete(l);
        if (!listeners.size) {
          if (channel) { sb.removeChannel(channel); channel = null; }
          clearInterval(poll); poll = null;
          timers.forEach(t => clearTimeout(t)); timers.clear();
          if (visibilityHandler) { document.removeEventListener("visibilitychange", visibilityHandler); visibilityHandler = null; }
        }
      };
    };

    const api = {
      collection(c) {
        return {
          onSnapshot(cb, err) {
            return listen(c, rows => cb({ docs: rows.map(r => ({ id: r.path.slice(c.length + 1), data: () => r.data })) }), err);
          },
        };
      },
      doc(p) {
        return {
          async set(data) {
            const { error } = await sb.from("docs").upsert({ season_id: sidOf(p), path: p, data }, { onConflict: "season_id,path" });
            if (error) throwErr(error);
          },
          async delete() {
            const { error } = await sb.from("docs").delete().eq("season_id", sidOf(p)).eq("path", p);
            if (error) throwErr(error);
          },
          onSnapshot(cb, err) {
            return listen(parentOf(p), rows => { const r = rows.find(x => x.path === p); cb({ exists: !!r, data: () => (r ? r.data : undefined) }); }, err);
          },
        };
      },
      async batchSet(items) {
        for (let i = 0; i < items.length; i += 100) {
          const chunk = items.slice(i, i + 100).map(x => ({ season_id: sidOf(x.path), path: x.path, data: x.data }));
          const { error } = await sb.from("docs").upsert(chunk, { onConflict: "season_id,path" });
          if (error) throwErr(error);
        }
      },
      refresh(parent) { kick(parent); },
      async refreshNow(parent) {
        const ls = [...listeners].filter(l => l.parent === parent);
        await Promise.all(ls.map(l => l.run()));
      },
      reset() {
        listeners.forEach(l => { l.alive = false; }); listeners.clear();
        if (channel) { sb.removeChannel(channel); channel = null; }
        clearInterval(poll); poll = null;
        timers.forEach(t => clearTimeout(t)); timers.clear();
        if (visibilityHandler) { document.removeEventListener("visibilitychange", visibilityHandler); visibilityHandler = null; }
      },
    };
    return api;
  }
})();
