/* Lectura local de calendarios deportivos pegados. Sin servicios externos. */
const MatchListImport = (() => {
  const months={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,
    agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
  const strip = x => String(x||"").replace(/\u00a0/g," ").replace(/\*\*|__/g,"")
    .replace(/^\s*[-*•▪]\s+/,"").trim();
  const simple = x => String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const dateKey=(y,m,d)=>{
    if(!Number.isInteger(y)||y<2000||y>2100||m<1||m>12||d<1||d>31)return null;
    const dt=new Date(Date.UTC(y,m-1,d));
    if(dt.getUTCFullYear()!==y||dt.getUTCMonth()+1!==m||dt.getUTCDate()!==d)return null;
    return String(y)+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");
  };
  const parseDate=value=>{
    let t=simple(strip(value)).replace(/^fecha\s*:\s*/,"");
    t=t.replace(/^(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s*,?\s+/,"");
    let m=t.match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);
    if(m)return dateKey(Number(m[3]),months[m[2]],Number(m[1]));
    m=t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/);
    if(m){let y=Number(m[3]);if(y<100)y+=2000;return dateKey(y,Number(m[2]),Number(m[1]));}
    m=t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?dateKey(Number(m[1]),Number(m[2]),Number(m[3])):null;
  };
  const side=value=>{
    const v=simple(value).replace(/[.]/g,"");
    if(/^(?:local|l|casa|en casa)$/.test(v))return true;
    if(/^(?:visitante|v|fuera|a domicilio)$/.test(v))return false;
    return null;
  };
  const isRest=value=>/^(?:descansa|descanso|jornada de descanso|libre)$/i.test(simple(value));
  const parse=text=>{
    const lines=String(text||"").split(/\r?\n/).map(strip).filter(Boolean);
    const matches=[],errors=[];
    let current=null,structured=false,auto=1;
    const finish=()=>{
      if(!current)return;
      if(!current.rest && !current.rival){
        errors.push("Jornada "+(current.n||auto)+": falta el rival o indicar DESCANSA.");
      } else {
        matches.push({...current});
        auto=Math.max(auto,(current.n||auto)+1);
      }
      current=null;
    };
    for(const line of lines){
      const m=line.match(/^(?:jornada\s*(?:n[º°o]\.?\s*)?|j\s*)(\d{1,3})\s*:?\s*$/i);
      if(m){
        finish();structured=true;
        current={n:Number(m[1]),date:"",rival:"",home:null,rest:false};
        continue;
      }
      const label=line.match(/^(fecha|rival|local(?:idad)?|visitante|condici[oó]n|campo|sede|descanso)\s*:\s*(.*)$/i);
      if(label){
        if(!current){errors.push("Línea fuera de una jornada: "+line.slice(0,80));continue;}
        const field=simple(label[1]),v=label[2].trim();
        if(field==="fecha"){
          const parsed=parseDate(v);
          if(!parsed)errors.push("Jornada "+(current.n||auto)+": fecha no reconocida ("+v.slice(0,50)+").");
          else current.date=parsed;
        }else if(field==="rival"){
          current.rest=isRest(v);
          current.rival=current.rest?"":v;
        }else if(field==="descanso"){
          if(/^(?:si|sí|true|1)$/i.test(v)||isRest(v)){current.rest=true;current.rival="";}
        }else{
          const parsed=side(v);
          if(parsed===null)errors.push("Jornada "+(current.n||auto)+": no se reconoce local/visitante ("+v.slice(0,40)+").");
          else current.home=parsed;
        }
        continue;
      }
      // Mantener compatibilidad: fecha; rival; L/V, con DESCANSA opcional.
      const cols=line.split(/\s*[;\t]\s*/);
      if(cols.length>=2){
        finish();
        const date=parseDate(cols[0]),rest=isRest(cols[1]),v=cols[2]||"";
        if(!date){errors.push("Fecha no reconocida: "+cols[0].slice(0,50));continue;}
        if(!rest&&!cols[1].trim()){errors.push("Falta el rival en "+line.slice(0,70));continue;}
        const home=v?side(v):null;
        if(v&&home===null){errors.push("Local/visitante no reconocido: "+v.slice(0,40));continue;}
        matches.push({n:null,date,rival:rest?"":cols[1].trim(),home:rest?null:home,rest});
        auto++;
        continue;
      }
      if(current && isRest(line)){current.rest=true;current.rival="";continue;}
      if(structured)errors.push("Línea de jornada no reconocida: "+line.slice(0,80));
      else errors.push("Línea no reconocida: "+line.slice(0,80));
    }
    finish();
    if(!matches.length&&!errors.length)errors.push("Pega al menos una jornada.");
    return {matches,errors};
  };
  return {parse,parseDate,side};
})();
if(typeof module!=="undefined")module.exports=MatchListImport;
