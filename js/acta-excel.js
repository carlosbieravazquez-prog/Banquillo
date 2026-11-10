/* Actas de Banquillo: plantilla Excel estructurada sin OCR */
(function () {
  const acta = () => Store.match(UI.route.arg);
  const f7 = () => ((Store.season()?.settings || {}).format || "F7") === "F7";
  const convocados = m => {
    const nc = Calc.noCallMap(m);
    return Store.activePlayers().filter(p => !(p.id in nc));
  };
  const value = (sheet, r, c) => String(sheet.getRow(r).getCell(c).value ?? "").trim();
  const rosterKey = m => convocados(m).map(p => p.id).sort().join("|");
  const heads = () => ["ID", "Dorsal", "Jugador", "Titular X", "Suplente X", "Goles", ...(f7() ? ["Portero X"] : []), "Minutos"];

  ACT.downloadActaXlsx = async () => {
    const m = acta();
    if (!m || m.rest) return;
    try {
      const Excel = await loadLib("exceljs");
      const wb = new Excel.Workbook();
      const ws = wb.addWorksheet("Acta");
      ws.addRow(["BANQUILLO_ACTA_V1"]);
      ws.addRow(["Temporada", Store.sid, "Jornada", m.n]);
      ws.addRow(["Rival", m.rival || "", "Fecha", m.date || "", "Hora", m.time || ""]);
      ws.addRow(heads());
      const score = m.scorers || [];
      convocados(m).forEach(p => {
        const d = (m.players || {})[p.id] || {};
        ws.addRow([p.id, p.dorsal ?? "", p.name, d.role === "T" ? "X" : "", d.role === "S" ? "X" : "", score.filter(id => id === p.id).length || "", ...(f7() ? [d.gk ? "X" : ""] : []), d.min ?? ""]);
      });
      ws.columns = heads().map((_, i) => ({width: i === 2 ? 32 : i === 0 ? 20 : 15}));
      ws.getRow(4).font = {bold:true,color:{argb:"FFFFFFFF"}};
      ws.getRow(4).fill = {type:"pattern",pattern:"solid",fgColor:{argb:"FF17365D"}};
      ws.views = [{state:"frozen",ySplit:4}];
      const buffer = await wb.xlsx.writeBuffer();
      const saved = await saveFile("banquillo_acta_j"+m.n+".xlsx",buffer);
      if (saved === false) toast("No se ha confirmado la descarga. Comprueba los permisos del navegador.", "err");
    } catch (e) {
      console.error(e);
      toast("No se ha podido descargar la plantilla Excel.", "err");
    }
  };

  CHG.importActaXlsx = async el => {
    const m = acta(), file = el.files && el.files[0];
    if (!m || !file) return;
    UI.actaImport = {busy:true};
    render(true);
    try {
      if (!/\.xlsx$/i.test(file.name) || file.size > 5*1024*1024)
        throw new Error("Sube la plantilla Excel de Banquillo (.xlsx, máximo 5 MB).");
      const Excel = await loadLib("exceljs");
      const wb = new Excel.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.getWorksheet("Acta");
      if (!ws || value(ws,1,1) !== "BANQUILLO_ACTA_V1" || value(ws,2,2) !== String(Store.sid) || Number(value(ws,2,4)) !== Number(m.n))
        throw new Error("El archivo no corresponde a esta temporada y jornada de Banquillo.");
      if (ws.rowCount > 120 || ws.columnCount > 20)
        throw new Error("El Excel tiene demasiadas filas o columnas para un acta.");
      if (heads().some((header,i) => value(ws,4,i+1) !== header))
        throw new Error("Las columnas no coinciden con la plantilla. Descarga una copia original.");
      const players = convocados(m), ids = new Set(players.map(p => p.id)), seen = new Set(), rows = [];
      for (let r=5;r<=ws.rowCount;r++) {
        const id = value(ws,r,1);
        if (!id) continue;
        if (!ids.has(id) || seen.has(id)) throw new Error("Jugador no convocado o repetido (fila "+r+").");
        seen.add(id);
        const p = Store.player(id);
        if (value(ws,r,3) !== p.name) throw new Error("El nombre ha cambiado en la fila "+r+".");
        const titular=value(ws,r,4).toUpperCase(), suplente=value(ws,r,5).toUpperCase(), portero=f7()?value(ws,r,7).toUpperCase():"";
        if ([titular,suplente,portero].some(x=>!["","X"].includes(x)) || titular==="X" && suplente==="X")
          throw new Error("Solo se permite una X para titular o suplente y portero (fila "+r+").");
        const rawGoals=value(ws,r,6),rawMinutes=value(ws,r,f7()?8:7);
        const goals=rawGoals===""?0:Number(rawGoals),minutes=rawMinutes===""?null:Number(rawMinutes);
        const duration=(Store.season().settings||{}).matchMinutes||90;
        if (!Number.isInteger(goals)||goals<0||goals>20||minutes!==null&&(!Number.isFinite(minutes)||minutes<0||minutes>duration))
          throw new Error("Goles o minutos inválidos en la fila "+r+".");
        rows.push({id,role:titular==="X"?"T":suplente==="X"?"S":null,goals,minutes,gk:portero==="X"});
      }
      if (rows.length !== players.length)
        throw new Error("Faltan jugadores convocados: aparecen "+rows.length+" de "+players.length+".");
      UI.actaImport={rows,matchId:m.id,seasonId:Store.sid,rosterKey:rosterKey(m)};
    } catch (e) {
      UI.actaImport={error:e.message||"No se pudo leer el archivo."};
    }
    render(true);
  };

  ACT.applyActaXlsx = () => {
    const m=acta(), data=UI.actaImport;
    if (!m || m.closed || Store.readOnly() || !data || !data.rows || data.matchId!==m.id || data.seasonId!==Store.sid || data.rosterKey!==rosterKey(m)) {
      toast("La temporada, la convocatoria o los permisos han cambiado. Vuelve a subir el Excel.", "err");
      UI.actaImport=null;
      return;
    }
    if (!confirm("¿Aplicar el Excel? Sustituirá los roles, minutos y goles de esta jornada. Comprueba primero los datos.")) return;
    const players={...(m.players||{})},scorers=[];
    data.rows.forEach(r=>{
      players[r.id]={...(players[r.id]||{}),role:r.role,min:r.minutes,gk:r.gk};
      for(let i=0;i<r.goals;i++)scorers.push(r.id);
    });
    m.players=players;m.scorers=scorers;m.ourGoals=scorers.length;
    Store.save("match",m);
    UI.actaImport=null;
    toast("Acta Excel importada. Comprueba el marcador rival.", "ok");
  };
})();
