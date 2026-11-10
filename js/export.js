/* ===== Exportar: PDF por jugador, ZIP y Excel ===== */
const LIBS = {
  jspdf: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", () => window.jspdf && window.jspdf.jsPDF],
  jszip: ["https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", () => window.JSZip],
  exceljs: ["https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js", () => window.ExcelJS],
};
const libCache = {};
function loadLib(k) {
  if (LIBS[k][1]()) return Promise.resolve(LIBS[k][1]());
  return libCache[k] || (libCache[k] = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = LIBS[k][0]; s.async = true;
    s.onload = () => (LIBS[k][1]() ? res(LIBS[k][1]()) : rej(new Error("lib")));
    s.onerror = () => { delete libCache[k]; rej(new Error("lib")); };
    document.head.appendChild(s);
  }));
}
const slug = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "jugador";
async function saveFile(filename, data) {
  const types = { pdf: "application/pdf", zip: "application/zip", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: types[filename.split(".").pop()] || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return "saved";
  } catch (e) { toast("No se pudo guardar el archivo.", "err"); return false; }
}

/* ---------- datos para el informe de un jugador ---------- */
function playerReportData(pid) {
  const p = Store.player(pid), s = pStats(p), ts = trainStats(), t = ts.per[pid] || { falts: 0, asist: 0, pct: null };
  const regCount = Store.matches.filter(Calc.isRegistered).length;
  const rows = Store.matches.filter(m => !m.rest).map(m => {
    const nc = Calc.noCallMap(m), d = (m.players || {})[pid], i = Calc.matchInfo(m);
    if (!(pid in nc) && !d && !i.played && !Calc.isRegistered(m)) return null;
    const goals = Calc.isNum(m.ourGoals) ? (m.scorers || []).slice(0, m.ourGoals).filter(x => x === pid).length : 0;
    return { n: m.n, rival: m.rival || "Rival por definir", home: m.home, res: i.res, score: i.played ? `${m.ourGoals}-${m.rivalGoals}` : "", nc: pid in nc ? nc[pid] : null, role: d && d.role, min: d && d.min, goals, gk: !!(d && d.gk) };
  }).filter(Boolean);
  return { p, s, t, regCount, rows, season: Store.season(), months: ts.months.filter(m => m.done) };
}

/* ---------- PDF ---------- */
const pdfTxt = s => String(s == null ? "" : s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^ -ÿ–—…€]/g, "");
async function buildPlayerPdf(pid) {
  const JsPDF = await loadLib("jspdf");
  const D = playerReportData(pid), { p, s, t } = D, season = D.season;
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 16, CW = W - 2 * M, H = 297;
  const NAVY = [23, 54, 93], BLUE = [47, 117, 181], GREEN = [27, 138, 75], INK = [30, 40, 56], GREY = [110, 122, 138], LINE = [222, 228, 236], SOFT = [243, 246, 250];
  let y = 0;
  const T = (txt, x, yy, o = {}) => doc.text(pdfTxt(txt), x, yy, o);
  const font = (st, size, col = INK) => { doc.setFont("helvetica", st); doc.setFontSize(size); doc.setTextColor(...col); };
  const ensure = h => { if (y + h > H - 22) { doc.addPage(); y = M + 4; } };

  // cabecera
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 36, "F");
  doc.setFillColor(...GREEN); doc.rect(0, 36, W, 1.6, "F");
  font("bold", 9, [180, 205, 235]); T("INFORME INDIVIDUAL  ·  TEMPORADA " + season.name, M, 12);
  const crestAdded = ClubCrest.addToPdf(doc, season, W - M - 29, 4, 29, 29);
  font("bold", 20, [255, 255, 255]);
  const clubTitle = pdfTxt(season.club || "Club");
  T(clubTitle.length > (crestAdded ? 29 : 39) ? clubTitle.slice(0, crestAdded ? 28 : 38) + "…" : clubTitle, M, 23);
  font("normal", 10, [210, 225, 242]); T(season.category || "", M, 30);
  // jugador: dorsal destacado y legible a tamaño de impresión
  y = 52;
  const dorsalX = M + 12.5;
  doc.setFillColor(...NAVY); doc.circle(dorsalX, y - 2, 12.5, "F");
  font("bold", 24, [255, 255, 255]); T(p.dorsal != null && p.dorsal !== "" ? String(p.dorsal) : "-", dorsalX, y + 5, { align: "center" });
  font("bold", 21, INK); T(p.name, M + 32, y - 1);
  font("normal", 10, GREY); T("Resumen de la temporada", M + 32, y + 6);
  y += 18;
  // tarjetas
  const tiles = [[`${s.conv}/${D.regCount}`, "Convocatorias"], [s.played, "Partidos jugados"], [`${s.T} / ${s.S}`, "Titular / suplente"], [s.min ? fmtNum(s.min) : "0", "Minutos"], [s.goals, "Goles"], [fmtPct(t.pct), "Asistencia"]];
  const gap = 3, tw = (CW - gap * 5) / 6;
  tiles.forEach(([v, l], i) => {
    const x = M + i * (tw + gap);
    doc.setFillColor(...SOFT); doc.roundedRect(x, y, tw, 22, 2, 2, "F");
    font("bold", 15, NAVY); T(String(v), x + tw / 2, y + 10, { align: "center" });
    font("normal", 7.5, GREY); T(l, x + tw / 2, y + 17, { align: "center" });
  });
  y += 32;
  // valoración
  const h2 = txt => { ensure(14); font("bold", 11.5, NAVY); T(txt.toUpperCase(), M, y); doc.setDrawColor(...BLUE); doc.setLineWidth(0.5); doc.line(M, y + 1.8, M + 14, y + 1.8); y += 8; };
  h2("Valoración del entrenador");
  const rep = Store.reports[pid];
  font("normal", 10.5, INK);
  if (rep && rep.text && rep.text.trim()) {
    rep.text.trim().split(/\n+/).forEach(par => {
      const lines = doc.splitTextToSize(pdfTxt(par), CW);
      lines.forEach(ln => { ensure(6); T(ln, M, y); y += 5.4; });
      y += 2.2;
    });
  } else { font("italic", 10, GREY); T("Valoración pendiente de redactar.", M, y); y += 6; font("normal", 10.5, INK); }
  y += 4;
  // partido a partido
  h2("Partido a partido");
  const cols = [["Jor.", 12, "c"], ["Rival", 64, "l"], ["Resultado", 28, "c"], ["Rol", 28, "c"], ["Min", 18, "c"], ["Goles", 16, "c"], ["Port.", 14, "c"]];
  const drawHead = () => {
    doc.setFillColor(...NAVY); doc.rect(M, y - 4.6, CW, 7, "F"); font("bold", 8.5, [255, 255, 255]);
    let x = M; cols.forEach(([l, w, a]) => { T(l, a === "c" ? x + w / 2 : x + 2, y, a === "c" ? { align: "center" } : {}); x += w; }); y += 6;
  };
  if (D.rows.length) {
    ensure(24); drawHead();
    D.rows.forEach((r, k) => {
      if (y + 7 > H - 22) { doc.addPage(); y = M + 8; drawHead(); }
      if (k % 2 === 0) { doc.setFillColor(...SOFT); doc.rect(M, y - 4.6, CW, 6.4, "F"); }
      const role = r.nc ? "No convocado" : r.role === "T" ? "Titular" : r.role === "S" ? "Suplente" : "-";
      const cells = ["J" + r.n, r.rival + (r.home === false ? " (V)" : r.home ? " (L)" : ""), r.score ? `${{ V: "Victoria", E: "Empate", D: "Derrota" }[r.res]} ${r.score}` : "-", role, r.min != null ? fmtNum(r.min) : "-", r.goals ? String(r.goals) : "-", r.gk ? "P" : ""];
      let x = M;
      cols.forEach(([, w, a], c) => {
        const col = c === 2 && r.res ? ({ V: GREEN, E: [168, 115, 10], D: [194, 59, 45] }[r.res]) : r.nc && c === 3 ? GREY : INK;
        font(c === 2 || c === 5 && r.goals ? "bold" : "normal", 8.8, col);
        let txt = cells[c]; if (c === 1) { while (doc.getTextWidth(pdfTxt(txt)) > w - 3 && txt.length > 4) txt = txt.slice(0, -2); }
        T(txt, a === "c" ? x + w / 2 : x + 2, y, a === "c" ? { align: "center" } : {}); x += w;
      });
      y += 6.4;
    });
    y += 2;
  } else { font("italic", 10, GREY); T("Todavía no hay partidos registrados.", M, y); y += 6; }
  // entrenos
  y += 3; h2("Asistencia a entrenamientos");
  font("normal", 9.5, INK);
  T(`${t.asist} sesiones asistidas de ${t.asist + t.falts} realizadas  ·  ${t.falts} faltas  ·  ${fmtPct(t.pct)}`, M, y); y += 7;
  const abs = Store.training.absences || {}, skipped = new Set(Store.training.skipped || []), today = todayKey();
  const perMonth = {};
  seasonSessions().filter(d => d <= today && !skipped.has(d)).forEach(d => { const k = d.slice(0, 7); const o = perMonth[k] || (perMonth[k] = { n: 0, f: 0 }); o.n++; if ((abs[d] || []).includes(pid)) o.f++; });
  Object.keys(perMonth).sort().forEach(k => {
    ensure(8); const o = perMonth[k], pct = (o.n - o.f) / o.n;
    font("normal", 9, INK); T(cap(MESES[+k.slice(5) - 1]), M, y);
    doc.setFillColor(...LINE); doc.roundedRect(M + 28, y - 3.2, 100, 4, 2, 2, "F");
    if (pct > 0) { doc.setFillColor(...(pct >= .75 ? GREEN : [201, 138, 0])); doc.roundedRect(M + 28, y - 3.2, Math.max(3, 100 * pct), 4, 2, 2, "F"); }
    font("bold", 9, INK); T(fmtPct(pct), M + 132, y); font("normal", 8, GREY); T(`${o.n - o.f} de ${o.n}`, M + 148, y); y += 7;
  });
  // pie
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(M, H - 16, W - M, H - 16);
    font("normal", 8, GREY); T(`${season.club || ""} · Temporada ${season.name} · Informe de ${p.name}`, M, H - 10);
    T(`Página ${i} de ${pages}`, W - M, H - 10, { align: "right" });
    if (i === pages) { T("Firma del entrenador", W - M - 52, H - 24); doc.line(W - M - 52, H - 26, W - M, H - 26); }
  }
  return doc.output("arraybuffer");
}
ACT.dlPdf = async el => {
  const p = Store.player(el.dataset.p); if (!p) return;
  UI.ai.busyPdf = p.id; render(true);
  try {
    const buf = await buildPlayerPdf(p.id);
    const st = await saveFile(`Informe_${slug(p.name)}_${Store.season().id}.pdf`, buf);
    if (st) toast("Informe de " + p.name + " guardado.", "ok");
  } catch (e) { toast("No se pudo crear el PDF. Comprueba tu conexión e inténtalo de nuevo.", "err"); }
  UI.ai.busyPdf = null; render(true);
};
ACT.dlZip = async () => {
  UI.ai.busyZip = true; render(true);
  try {
    const [JSZip] = await Promise.all([loadLib("jszip"), loadLib("jspdf")]);
    const zip = new JSZip(), ps = Store.activePlayers();
    for (const p of ps) zip.file(`Informe_${slug(p.name)}_${Store.season().id}.pdf`, await buildPlayerPdf(p.id));
    const buf = await zip.generateAsync({ type: "arraybuffer" });
    const st = await saveFile(`Informes_${Store.season().id}.zip`, buf);
    if (st) toast(`${ps.length} informes guardados en un ZIP.`, "ok");
  } catch (e) { toast("No se pudo crear el ZIP.", "err"); }
  UI.ai.busyZip = false; render(true);
};

/* ---------- Excel ---------- */
async function buildWorkbook() {
  const EJ = await loadLib("exceljs");
  const wb = new EJ.Workbook(); wb.creator = "Banquillo"; wb.created = new Date();
  const s = Store.season(), ps = Store.activePlayers(), ms = Store.matches, ts = trainStats(), rec = Calc.record(ms);
  const NAVY = "FF17365D", BLUE = "FF2F75B5", LIGHT = "FFDDEBF7", GREYB = "FFEDEDED";
  const thin = { style: "thin", color: { argb: "FFBFBFBF" } }, box = { top: thin, left: thin, bottom: thin, right: thin };
  const fill = c => ({ type: "pattern", pattern: "solid", fgColor: { argb: c } });
  const utc = k => { const [y, m, d] = k.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const sheet = (name, tab) => { const ws = wb.addWorksheet(name, { properties: { tabColor: { argb: tab || BLUE } }, views: [{ showGridLines: false }] }); return ws; };
  const title = (ws, text, sub, span) => {
    ws.mergeCells(1, 1, 1, span); ws.mergeCells(2, 1, 2, span);
    const a = ws.getCell(1, 1); a.value = text; a.font = { name: "Calibri", size: 15, bold: true, color: { argb: "FFFFFFFF" } }; a.fill = fill(NAVY); a.alignment = { vertical: "middle", indent: 1 };
    const b = ws.getCell(2, 1); b.value = sub; b.font = { name: "Calibri", size: 10, color: { argb: "FF17365D" } }; b.fill = fill(LIGHT); b.alignment = { vertical: "middle", indent: 1 };
    ws.getRow(1).height = 30; ws.getRow(2).height = 20;
  };
  const head = (ws, row, labels, from = 1) => labels.forEach((l, i) => { const c = ws.getCell(row, from + i); c.value = l; c.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" } }; c.fill = fill(BLUE); c.border = box; c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; });
  const cellsOf = (ws, row, vals, opt = {}) => vals.forEach((v, i) => { const c = ws.getCell(row, 1 + i); c.value = v; c.border = box; c.font = { name: "Calibri", size: 11, bold: !!(opt.bold && opt.bold.includes(i)) }; c.alignment = { horizontal: i === (opt.left ?? 1) || (opt.leftAll && opt.leftAll.includes(i)) ? "left" : "center", vertical: "middle" }; });
  const sub = `${s.club || ""} · ${s.category || ""} · Temporada ${s.name}`;
  const crestData = ClubCrest.current(s);
  // ExcelJS admite PNG embebido: se añade a las cabeceras sin servidor externo.
  // El archivo sigue siendo válido si el club no tiene escudo o si falla la imagen.
  let crestImageId = null;
  if (crestData) {
    try { crestImageId = wb.addImage({ base64: crestData.split(",")[1], extension: "png" }); }
    catch (err) { console.warn("No se pudo añadir el escudo al libro Excel."); }
  }
  const titleWithCrest = (sheet, text, subtitle, span) => {
    title(sheet, text, subtitle, span);
    if (crestImageId !== null) {
      try { sheet.addImage(crestImageId, {tl:{col: Math.max(0,span-1)+0.05,row:0.04},ext:{width:48,height:48},editAs:"oneCell"}); }
      catch (err) { console.warn("No se pudo dibujar el escudo en esta hoja."); }
    }
  };


  // RESUMEN
  let ws = sheet("RESUMEN", "FF70AD47"); ws.columns = [{ width: 34 }, { width: 14 }, { width: 3 }, { width: 24 }, { width: 10 }, { width: 3 }, { width: 18 }, { width: 11 }, { width: 11 }, { width: 14 }];
  titleWithCrest(ws, "RESUMEN DE LA TEMPORADA " + s.name, sub, 10);
  head(ws, 4, ["Resultados del equipo", "Valor"]);
  [["Partidos jugados", rec.pj], ["Victorias", rec.v], ["Empates", rec.e], ["Derrotas", rec.d], ["Goles a favor", rec.gf], ["Goles en contra", rec.gc], ["Diferencia de goles", rec.dg], ["% de victorias", rec.pctV == null ? "" : rec.pctV]].forEach((r, i) => { cellsOf(ws, 5 + i, r, { left: 0, bold: [1] }); if (i === 7) ws.getCell(5 + i, 2).numFmt = "0%"; });
  const motTot = { DT: 0, LS: 0, MP: 0 }; ms.forEach(m => (m.noCall || []).forEach(x => { if (x.m in motTot) motTot[x.m]++; }));
  head(ws, 15, ["No convocados por motivo", "Veces"]);
  [["D.T · Decisión técnica", motTot.DT], ["L.S · Lesionado", motTot.LS], ["M.P · Motivos personales", motTot.MP]].forEach((r, i) => cellsOf(ws, 16 + i, r, { left: 0, bold: [1] }));
  head(ws, 20, ["Entrenamientos", "Valor"]);
  [["Sesiones realizadas", ts.done], ["Sesiones previstas", ts.planned], ["Faltas totales (X)", ts.totalF], ["Asistencia media", ts.teamPct == null ? "" : ts.teamPct]].forEach((r, i) => { cellsOf(ws, 21 + i, r, { left: 0, bold: [1] }); if (i === 3) ws.getCell(21 + i, 2).numFmt = "0%"; });
  head(ws, 4, ["Goleadores", "Goles"], 4);
  Calc.scorersTable(ps, ms).forEach((x, i) => { const r = 5 + i; [x.p.name, x.goals].forEach((v, k) => { const c = ws.getCell(r, 4 + k); c.value = v; c.border = box; c.alignment = { horizontal: k ? "center" : "left" }; c.font = { name: "Calibri", bold: !!k }; }); });
  head(ws, 4, ["Entrenos por mes", "Sesiones", "Faltas", "% asistencia"], 7);
  ts.months.forEach((m, i) => { const r = 5 + i; [cap(MESES[+m.key.slice(5) - 1]) + " " + m.key.slice(0, 4), m.done, m.falts, m.pct == null ? "" : m.pct].forEach((v, k) => { const c = ws.getCell(r, 7 + k); c.value = v; c.border = box; c.alignment = { horizontal: k ? "center" : "left" }; if (k === 3) c.numFmt = "0%"; }); });

  // PLANTILLA
  ws = sheet("PLANTILLA", "FF70AD47");
  ws.columns = [8, 24, 8, 8, 11, 12, 7, 7, 7, 9, 10, 9, 9, 10, 12, 11, 10, 12].map(w => ({ width: w }));
  titleWithCrest(ws, "PLANTILLA · TEMPORADA " + s.name, sub, 18);
  head(ws, 4, ["ID", "Jugador", "Dorsal", "Goles", "Convocados", "No convocados", "D.T", "L.S", "M.P", "Titular", "Suplente", "Jugados", "Minutos", "Partidos portero", "Porterías a cero", "Entrenos asistidos", "Faltas entreno", "% asistencia"]);
  ws.getRow(4).height = 32;
  ps.forEach((p, i) => { const st = pStats(p), t = ts.per[p.id]; cellsOf(ws, 5 + i, [p.id.toUpperCase(), p.name, p.dorsal ?? "", st.goals, st.conv, st.noconv, st.DT, st.LS, st.MP, st.T, st.S, st.played, st.min, st.gk, st.clean, t.asist, t.falts, t.pct == null ? "" : t.pct], { bold: [1, 3] }); ws.getCell(5 + i, 18).numFmt = "0%"; });
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: 4, showGridLines: false }];

  // PARTIDOS
  ws = sheet("PARTIDOS"); ws.columns = [{ width: 9 }, { width: 13 }, { width: 31 }, { width: 31 }, { width: 11 }, { width: 11 }, { width: 12 }, { width: 17 }, { width: 46 }];
  titleWithCrest(ws, "CALENDARIO Y PARTIDOS DE LIGA", sub, 9);
  head(ws, 4, ["Jornada", "Fecha", "Local", "Visitante", "Goles local", "Goles visitante", "Estado", "Resultado", "Observaciones"]);
  ms.forEach((m, i) => {
    const inf = Calc.matchInfo(m), club = s.club;
    const loc = m.rest ? "DESCANSA" : m.home ? club : m.rival, vis = m.rest ? club : m.home ? m.rival : club;
    const gl = inf.played ? (m.home ? m.ourGoals : m.rivalGoals) : "", gv = inf.played ? (m.home ? m.rivalGoals : m.ourGoals) : "";
    cellsOf(ws, 5 + i, [m.n, m.date ? utc(m.date) : "", loc || "", vis || "", gl, gv, m.rest ? "Descansa" : inf.played ? "Jugado" : "Pendiente", inf.res ? resTxt[inf.res] : m.rest ? "Descansa" : "Pendiente", m.notes || ""], { leftAll: [2, 3, 8], left: -1 });
    if (m.date) ws.getCell(5 + i, 2).numFmt = "dd/mm/yyyy";
    if (m.rest) for (let c = 1; c <= 9; c++) { ws.getCell(5 + i, c).fill = fill(GREYB); }
    else if (inf.res) ws.getCell(5 + i, 8).font = { name: "Calibri", bold: true, color: { argb: inf.res === "V" ? "FF006100" : inf.res === "E" ? "FF9C5700" : "FF9C0006" } };
  });
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];

  // CONVOCATORIAS
  ws = sheet("CONVOCATORIAS"); ws.columns = [{ width: 11 }, { width: 13 }, { width: 30 }, { width: 28 }, { width: 24 }, { width: 14 }];
  titleWithCrest(ws, "CONVOCATORIAS", "Por jornada: jugadores NO convocados y motivo (D.T Decisión técnica · L.S Lesionado · M.P Motivos personales).", 6);
  head(ws, 4, ["Jornada", "Fecha", "Rival", "Jugador no convocado", "Motivo", "Convocados"]);
  let r = 5;
  ms.filter(m => !m.rest).forEach(m => {
    const nc = m.noCall || [], called = ps.length - nc.filter(x => ps.some(p => p.id === x.p)).length;
    const list = nc.length ? nc : [null];
    list.forEach((x, k) => {
      cellsOf(ws, r, [m.n, m.date ? utc(m.date) : "", m.rival || "", x ? (Store.player(x.p) || {}).name || "" : (Calc.isRegistered(m) ? "(todos convocados)" : "(pendiente)"), x ? `${MOTIVO_COD[x.m] || ""} · ${MOTIVOS[x.m] || ""}` : "", k === 0 && Calc.isRegistered(m) ? `${called} de ${ps.length}` : ""], { leftAll: [2, 3, 4], left: -1 });
      if (m.date) ws.getCell(r, 2).numFmt = "dd/mm/yyyy";
      r++;
    });
  });
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];

  // GOLES Y ESTADISTICAS
  ws = sheet("GOLES Y ESTADISTICAS"); ws.columns = [{ width: 11 }, { width: 28 }, { width: 24 }, { width: 14 }, { width: 10 }, { width: 10 }, { width: 10 }];
  titleWithCrest(ws, "GOLES Y ESTADÍSTICAS POR JORNADA", "Titular/suplente, minutos, portero y goles de cada jugador convocado.", 7);
  head(ws, 4, ["Jornada", "Rival", "Jugador", "Titular / Suplente", "Minutos", "Portero", "Goles"]);
  r = 5;
  ms.filter(m => !m.rest).forEach(m => {
    const goals = Calc.isNum(m.ourGoals) ? (m.scorers || []).slice(0, m.ourGoals) : [];
    Object.entries(m.players || {}).forEach(([pid, d]) => {
      const p = Store.player(pid); if (!p) return;
      cellsOf(ws, r++, [m.n, m.rival || "", p.name, d.role === "T" ? "Titular" : d.role === "S" ? "Suplente" : "", d.min ?? "", d.gk ? "Sí" : "", goals.filter(x => x === pid).length || ""], { leftAll: [1, 2], left: -1 });
    });
  });
  head(ws, 4, ["Jornada", "Rival", "Marcador", "Gol", "Goleador"], 9);
  [9, 28, 14, 7, 26].forEach((w, i) => { ws.getColumn(9 + i).width = w; });
  r = 5;
  ms.filter(m => Calc.matchInfo(m).played).forEach(m => {
    (m.scorers || []).slice(0, m.ourGoals).forEach((x, k) => {
      [m.n, m.rival || "", `${m.ourGoals}-${m.rivalGoals}`, k + 1, x === "og" ? "Propia puerta (rival)" : x ? (Store.player(x) || {}).name || "" : "Sin asignar"].forEach((v, c) => { const cell = ws.getCell(r, 9 + c); cell.value = v; cell.border = box; cell.alignment = { horizontal: c === 1 || c === 4 ? "left" : "center" }; });
      r++;
    });
  });
  ws.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];

  // ENTRENAMIENTOS
  ws = sheet("ENTRENAMIENTOS"); const sess = seasonSessions(), skipped = new Set(Store.training.skipped || []), abs = Store.training.absences || {};
  ws.getColumn(1).width = 26; [2, 3, 4].forEach(c => { ws.getColumn(c).width = 10; });
  sess.forEach((_, i) => { ws.getColumn(5 + i).width = 4.6; });
  titleWithCrest(ws, "ENTRENAMIENTOS", "X = no vino · en blanco = vino · gris = sin entreno.", Math.max(4 + sess.length, 8));
  const mon = {}; sess.forEach((k, i) => { (mon[k.slice(0, 7)] = mon[k.slice(0, 7)] || []).push(5 + i); });
  Object.entries(mon).forEach(([k, cols], mi) => {
    if (cols.length > 1) ws.mergeCells(4, cols[0], 4, cols[cols.length - 1]);
    const c = ws.getCell(4, cols[0]); c.value = cap(MESES[+k.slice(5) - 1]) + " " + k.slice(0, 4); c.fill = fill(mi % 2 ? BLUE : NAVY); c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.alignment = { horizontal: "center" };
  });
  head(ws, 6, ["Jugador", "Asistencias", "Faltas", "% asist."]); ws.getRow(6).height = 20;
  sess.forEach((k, i) => {
    const c1 = ws.getCell(5, 5 + i), c2 = ws.getCell(6, 5 + i), d = pd(k);
    c1.value = DIAS3[d.getDay()].slice(0, 3); c1.alignment = { horizontal: "center" }; c1.font = { size: 8, bold: true }; c1.fill = fill(LIGHT); c1.border = box;
    c2.value = d.getDate(); c2.alignment = { horizontal: "center" }; c2.font = { bold: true }; c2.fill = fill(skipped.has(k) ? GREYB : LIGHT); c2.border = box;
  });
  ps.forEach((p, i) => {
    const row = 7 + i, t = ts.per[p.id];
    cellsOf(ws, row, [p.name, t.asist, t.falts, t.pct == null ? "" : t.pct], { left: 0, bold: [2] }); ws.getCell(row, 4).numFmt = "0%";
    sess.forEach((k, j) => { const c = ws.getCell(row, 5 + j); c.border = box; c.alignment = { horizontal: "center" }; if (skipped.has(k)) c.fill = fill(GREYB); if ((abs[k] || []).includes(p.id)) { c.value = "X"; c.font = { bold: true, color: { argb: "FF9C0006" } }; c.fill = fill("FFF8CBAD"); } });
  });
  ws.views = [{ state: "frozen", xSplit: 4, ySplit: 6, showGridLines: false }];
  return wb;
}
ACT.dlXlsx = async () => {
  UI.ai.busyXlsx = true; render(true);
  try {
    const wb = await buildWorkbook();
    const buf = await wb.xlsx.writeBuffer();
    const st = await saveFile(`Temporada_${slug(Store.season().name)}.xlsx`, buf);
    if (st) toast("Excel de la temporada guardado.", "ok");
  } catch (e) { console.error(e); toast("No se pudo crear el Excel. Comprueba tu conexión e inténtalo de nuevo.", "err"); }
  UI.ai.busyXlsx = false; render(true);
};
