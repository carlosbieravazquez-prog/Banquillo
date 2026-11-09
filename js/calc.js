/* ===== Cálculos (mismas reglas que el Excel Gestion_Prebenjamin3) ===== */
const Calc = (() => {
  const isNum = v => typeof v === "number" && isFinite(v);
  const pad = n => String(n).padStart(2, "0");
  const pd = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const dk = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  /** Resultado de un partido desde el punto de vista de nuestro equipo. */
  function matchInfo(m) {
    if (!m) return { played: false, res: null };
    if (m.rest) return { rest: true, played: false, res: null };
    const today = dk(new Date());
    const future = !!m.date && m.date > today;
    const played = !future && isNum(m.ourGoals) && isNum(m.rivalGoals);
    const res = played ? (m.ourGoals > m.rivalGoals ? "V" : m.ourGoals === m.rivalGoals ? "E" : "D") : null;
    return { played, future, res, gf: played ? m.ourGoals : null, gc: played ? m.rivalGoals : null };
  }

  /** Una jornada cuenta como "convocatoria registrada" si se confirmó o hay algún no convocado. */
  const isRegistered = m => !m.rest && (!!m.callDone || (m.noCall || []).length > 0);
  const noCallMap = m => { const o = {}; (m.noCall || []).forEach(x => { o[x.p] = x.m; }); return o; };

  function record(matches) {
    const r = { pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0, descansos: 0, pendientes: 0 };
    matches.forEach(m => {
      const i = matchInfo(m);
      if (i.rest) { r.descansos++; return; }
      if (!i.played) { r.pendientes++; return; }
      r.pj++; r.gf += i.gf; r.gc += i.gc;
      if (i.res === "V") r.v++; else if (i.res === "E") r.e++; else r.d++;
    });
    r.dg = r.gf - r.gc;
    r.pctV = r.pj ? r.v / r.pj : null;
    return r;
  }

  /** Estadísticas de un jugador en todos los partidos. */
  function playerStats(pid, matches) {
    const s = { goals: 0, conv: 0, noconv: 0, DT: 0, LS: 0, MP: 0, T: 0, S: 0, played: 0, min: 0, gk: 0, clean: 0 };
    matches.forEach(m => {
      if (m.rest) return;
      const nc = noCallMap(m);
      if (isRegistered(m)) {
        if (pid in nc) { s.noconv++; if (nc[pid] in s) s[nc[pid]]++; } else s.conv++;
      }
      if (pid in nc) return;
      const d = (m.players || {})[pid];
      if (d) {
        const mins = isNum(d.min) ? d.min : 0;
        if (d.role === "T") s.T++;
        if (d.role === "S") s.S++;
        if (d.role === "T" || (d.role === "S" && mins > 0)) s.played++;
        s.min += mins;
        if (d.gk) { s.gk++; if (isNum(m.rivalGoals) && m.rivalGoals === 0) s.clean++; }
      }
      if (isNum(m.ourGoals)) s.goals += (m.scorers || []).slice(0, m.ourGoals).filter(x => x === pid).length;
    });
    return s;
  }

  /** Fechas de entreno: los días de la semana elegidos entre inicio y fin, más las extra. */
  function sessionList(settings, training) {
    const out = new Set((training && training.extra) || []);
    if (settings && settings.trainStart && settings.trainEnd) {
      const end = pd(settings.trainEnd);
      const days = settings.trainDays || [1, 3];
      for (let d = pd(settings.trainStart); d <= end; d.setDate(d.getDate() + 1)) if (days.includes(d.getDay())) out.add(dk(d));
    }
    return [...out].sort();
  }

  function trainingStats(players, sessions, training, today) {
    const skipped = new Set((training && training.skipped) || []);
    const abs = (training && training.absences) || {};
    const done = sessions.filter(d => d <= today && !skipped.has(d));
    const per = {};
    let totalF = 0;
    players.forEach(p => {
      const f = done.filter(d => (abs[d] || []).includes(p.id)).length;
      totalF += f;
      per[p.id] = { falts: f, asist: done.length - f, pct: done.length ? (done.length - f) / done.length : null };
    });
    const months = {};
    sessions.forEach(d => {
      const k = d.slice(0, 7);
      const o = months[k] || (months[k] = { key: k, planned: 0, done: 0, falts: 0, pct: null });
      o.planned++;
      if (d <= today && !skipped.has(d)) {
        o.done++;
        o.falts += players.filter(p => (abs[d] || []).includes(p.id)).length;
      }
    });
    Object.values(months).forEach(o => { o.pct = o.done && players.length ? 1 - o.falts / (o.done * players.length) : null; });
    return {
      done: done.length, planned: sessions.length, totalF, per, months: Object.values(months).sort((a, b) => a.key < b.key ? -1 : 1),
      teamPct: done.length && players.length ? 1 - totalF / (done.length * players.length) : null,
    };
  }

  /** Minutos de cada jugador a partir de titulares y cambios. */
  function calcMinutes(m, dur) {
    const nc = noCallMap(m);
    const ev = (m.subs || []).filter(e => isNum(e.min)).slice().sort((a, b) => a.min - b.min);
    const res = {};
    Object.entries(m.players || {}).forEach(([pid, d]) => {
      if (pid in nc || !d.role) return;
      let on = d.role === "T", since = on ? 0 : null, total = 0;
      ev.forEach(e => {
        if (e.out === pid && on) { total += e.min - since; on = false; since = null; }
        else if (e.in === pid && !on) { on = true; since = e.min; }
      });
      if (on) total += Math.max(0, dur - since);
      res[pid] = Math.round(total * 10) / 10;
    });
    return res;
  }

  /** Cuenta de goleadores del equipo (propia puerta aparte). */
  function scorersTable(players, matches) {
    return players.map(p => ({ p, goals: playerStats(p.id, matches).goals }))
      .filter(x => x.goals > 0).sort((a, b) => b.goals - a.goals || a.p.name.localeCompare(b.p.name, "es"));
  }

  function ownGoals(matches) {
    return matches.reduce((t, m) => t + (isNum(m.ourGoals) ? (m.scorers || []).slice(0, m.ourGoals).filter(x => x === "og").length : 0), 0);
  }

  return { isNum, matchInfo, isRegistered, noCallMap, record, playerStats, sessionList, trainingStats, calcMinutes, scorersTable, ownGoals, pd, dk };
})();
if (typeof module !== "undefined") module.exports = Calc;
