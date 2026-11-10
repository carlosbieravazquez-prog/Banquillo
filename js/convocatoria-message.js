/* Mensajes de convocatoria: se crean localmente sin enviar datos al proveedor de IA. */
const ConvocatoriaMessage = (() => {
  const reasons = {DT:"Decisión técnica",LS:"Lesión",MP:"Motivos personales",SA:"Sanción deportiva"};
  const clean = text => String(text??"").replace(/[\r\n\t]+/g," ").replace(/\s{2,}/g," ").trim();
  const list = (players, match, mode) => {
    const nonCalled = new Map((match.noCall||[]).map(x=>[String(x.p),x.m]));
    return (players||[]).filter(p=>p.active!==false && (mode==="absent"?nonCalled.has(String(p.id)):!nonCalled.has(String(p.id))))
      .map(p=>{
        const name=clean(p.name);
        const dorsal=p.dorsal != null && p.dorsal!=="" ? "#"+clean(p.dorsal)+" · " : "";
        const code=nonCalled.get(String(p.id));
        return "• "+dorsal+name+(mode==="absent"?" — "+(reasons[code]||"No convocado"):"");
      });
  };
  const build = (season,match,players,{mode="called",kit="first"}={}) => {
    if(!match||match.rest) return "";
    const title=mode==="absent"?"NO CONVOCADOS":"CONVOCATORIA";
    const lines=["⚽ "+title+" · JORNADA "+clean(match.n),clean(season?.club||"Nuestro equipo")];
    if(match.rival)lines.push("🆚 Rival: "+clean(match.rival));
    if(match.date)lines.push("📅 Fecha: "+clean(match.date));
    lines.push(match.home===true?"🏠 Jugamos en casa":match.home===false?"✈️ Jugamos fuera":"📍 Local/visitante por confirmar");
    if(match.time)lines.push("🕒 Hora: "+clean(match.time));
    lines.push("👕 Equipación: "+(kit==="second"?"Segunda":kit==="third"?"Tercera":"Primera"));
    lines.push("");
    const items=list(players,match,mode);
    lines.push(...(items.length?items:["Sin jugadores en esta selección."]));
    lines.push("","— "+clean(season?.club||"Cuerpo técnico"));
    return lines.join("\n");
  };
  return {build,list,reasons};
})();
if(typeof module!=="undefined")module.exports=ConvocatoriaMessage;
