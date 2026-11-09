/* ===== Utilidades ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS3 = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MOTIVOS = { DT: "Decisión técnica", LS: "Lesión", MP: "Motivos personales" };
const MOTIVO_COD = { DT: "D.T", LS: "L.S", MP: "M.P" };
const pd = Calc.pd, dk = Calc.dk;
const todayKey = () => dk(new Date());
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const fmtShort = k => { if (!k) return "Sin fecha"; const d = pd(k); return `${DIAS3[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`; };
const fmtLong = k => { if (!k) return "Sin fecha"; const d = pd(k); return `${cap(DIAS[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
const fmtNum = n => (Math.round(n * 10) / 10).toString().replace(".", ",");
const fmtPct = v => v == null ? "–" : Math.round(v * 100) + "%";
const parseNum = v => { if (v == null) return null; const t = String(v).trim().replace(",", "."); if (t === "") return null; const n = Number(t); return isFinite(n) ? n : null; };
const uid = (p = "x") => p + Math.random().toString(36).slice(2, 8);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = o => JSON.parse(JSON.stringify(o));
const sortEs = (a, b) => a.localeCompare(b, "es");
const daysBetween = (a, b) => Math.round((pd(b) - pd(a)) / 86400000);
const relDay = k => {
  if (!k) return "";
  const n = daysBetween(todayKey(), k);
  if (n === 0) return "Hoy"; if (n === 1) return "Mañana"; if (n === -1) return "Ayer";
  if (n > 1 && n < 14) return `En ${n} días`; if (n < -1 && n > -14) return `Hace ${-n} días`; return "";
};
/** "17/10/2026" o "17-10-26" → "2026-10-17" (o null) */
const parseEsDate = t => {
  const m = String(t || "").trim().match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
  if (!m) return null;
  let y = m[3] ? +m[3] : new Date().getFullYear(); if (y < 100) y += 2000;
  const d = new Date(y, +m[2] - 1, +m[1]);
  return d.getMonth() === +m[2] - 1 ? dk(d) : null;
};
const ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.2c2.6.3 4.5 2.4 4.5 5.3"/>',
  check: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h6M9.5 16h6"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5l3.8 2.8-1.4 4.4H9.6l-1.4-4.4z"/><path d="M12 3v4.5M20.4 9.6l-4.6.7M17.2 19l-2.8-4.3M6.8 19l2.8-4.3M3.6 9.6l4.6.7"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9.5 4.3 4.3 0 0 1 17.5 18z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};
const icon = (n, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;
