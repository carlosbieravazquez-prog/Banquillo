/* Reglas puras del calendario de clubes. No accede a cuentas ni a bases de datos. */
const ClubPlanner = (() => {
  const validTime = value => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const validDate = value => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y,m,d] = value.split("-").map(Number);
    const actual = new Date(Date.UTC(y,m-1,d));
    return actual.getUTCFullYear() === y && actual.getUTCMonth()+1 === m && actual.getUTCDate() === d;
  };
  const resourceList = (facilities, modality) => {
    const out=[], f11 = Math.min(12,Math.max(0,Number(facilities?.f11)||0)),f7=Math.min(12,Math.max(0,Number(facilities?.f7)||0));
    for(let i=0;i<f11;i++){
      const id="f11-"+(i+1);
      if(modality==="F11")out.push({id,label:"Campo F11 · "+(i+1)});
      if(modality==="F7" && !!facilities?.divisible?.[i]){
        out.push({id:id+"-a",label:"Campo F7 · F11 "+(i+1)+" (A)"});
        out.push({id:id+"-b",label:"Campo F7 · F11 "+(i+1)+" (B)"});
      }
    }
    if(modality==="F7")for(let i=0;i<f7;i++)out.push({id:"f7-"+(i+1),label:"Campo F7 independiente · "+(i+1)});
    return out;
  };
  const validResource = (facilities, match) => !match.home ||
    resourceList(facilities,match.modality).some(r=>r.id===match.resource);
  const parent = id => String(id||"").replace(/-[ab]$/,"");
  const resourceConflict = (a,b) => {
    if(!a || !b) return false;
    if(a===b) return true;
    const pa=parent(a),pb=parent(b);
    return pa===pb && (a===pa || b===pb);
  };
  const overlaps = (a,b) => {
    if(!validTime(a.time)||!validTime(b.time))return false;
    const minutes=v=>Number(v.slice(0,2))*60+Number(v.slice(3,5));
    const da=Number(a.duration),db=Number(b.duration);
    if(!Number.isFinite(da)||da<=0||!Number.isFinite(db)||db<=0)return false;
    return minutes(a.time)<minutes(b.time)+db && minutes(b.time)<minutes(a.time)+da;
  };
  const conflicts = (candidate,matches,ignoreId) => {
    if(!validDate(candidate.date)||!validTime(candidate.time))return [];
    return (matches||[]).filter(m=>m.id!==ignoreId && m.date===candidate.date && validTime(m.time) && overlaps(candidate,m) &&
      ((candidate.teamId && m.teamId===candidate.teamId) ||
       (candidate.home && m.home && resourceConflict(candidate.resource,m.resource))));
  };
  const validate = (candidate,matches,facilities,ignoreId) => {
    if(!validDate(candidate.date))return "La fecha del partido no es válida.";
    if(!candidate.teamId || !["F7","F11"].includes(candidate.modality))return "Selecciona un equipo y su modalidad.";
    if(!Number.isInteger(Number(candidate.duration))||Number(candidate.duration)<30||Number(candidate.duration)>180)return "La duración debe estar entre 30 y 180 minutos.";
    if(candidate.home && candidate.resource && !validResource(facilities,candidate))return "El campo no está disponible para esta modalidad o instalación.";
    if(candidate.home && !candidate.resource)return "Selecciona una instalación para publicar el partido.";
    if(!validTime(candidate.time))return "Introduce una hora válida.";
    if(conflicts(candidate,matches,ignoreId).length)return "Hay un solapamiento con otro partido de este equipo o de la misma instalación.";
    return "";
  };
  return {validTime,validDate,resourceList,validResource,resourceConflict,overlaps,conflicts,validate};
})();
if (typeof module !== "undefined") module.exports = ClubPlanner;
