/* Identidad visual profesional: los colores de la camiseta inspiran una paleta sobria,
   no se copian literalmente como fondo ni como botones fluorescentes. */
const ClubTheme=(()=>{
 const presets={
  oceano:{name:"Océano",primary:"#18618B",accent:"#2C708A"},
  bosque:{name:"Bosque",primary:"#23834C",accent:"#417D63"},
  clasico:{name:"Azul clásico",primary:"#17365D",accent:"#2F75B5"},
  granate:{name:"Granate",primary:"#9B293C",accent:"#A05267"},
  amatista:{name:"Amatista",primary:"#664AA4",accent:"#8361A3"},
  cobre:{name:"Cobre",primary:"#A96A27",accent:"#9A7851"},
  pizarra:{name:"Pizarra",primary:"#43596E",accent:"#526B76"},
  oliva:{name:"Oliva",primary:"#7D8A2D",accent:"#68804B"}
 };
 const validHex=v=>typeof v==="string"&&/^#[0-9a-f]{6}$/i.test(v);
 const safe=(v,fallback)=>validHex(v)?v.toUpperCase():fallback;
 const defaults={
  first:{shirt:"#17365D",shorts:"#17365D",socks:"#FFFFFF"},
  second:{shirt:"#FFFFFF",shorts:"#17365D",socks:"#17365D"}
 };
 const normalizeKits=k=>{
  const piece=(v,key)=>Object.fromEntries(["shirt","shorts","socks"].map(p=>[p,safe(v?.[p],defaults[key][p])]));
  const result={first:piece(k?.first,"first"),second:piece(k?.second,"second")};
  if(k?.third)result.third=piece(k.third,"second");
  return result;
 };
 const cleanPalette=p=>({
  mode:["auto","preset","custom"].includes(p?.mode)?p.mode:"auto",
  preset:presets[p?.preset]?p.preset:"clasico",
  customPrimary:safe(p?.customPrimary,"#17365D"),
  customAccent:safe(p?.customAccent,"#2F75B5")
 });
 const hslOf=hex=>{
  const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;
  if(!d)return {h:215,s:0,l};
  let h;
  if(max===r)h=((g-b)/d)%6;
  else if(max===g)h=(b-r)/d+2;
  else h=(r-g)/d+4;
  h=(h*60+360)%360;
  return {h:Math.round(h),s:d/(1-Math.abs(2*l-1)),l};
 };
 const hsl=(h,s,l)=>"hsl("+Math.round(h)+", "+s+"%, "+l+"%)";
 const derive=(kits,source)=>{
  const k=normalizeKits(kits),p=cleanPalette(source);
  const primary=p.mode==="preset"?presets[p.preset].primary:p.mode==="custom"?p.customPrimary:k.first.shirt;
  const secondary=p.mode==="preset"?presets[p.preset].accent:p.mode==="custom"?p.customAccent:k.second.shirt;
  const a=hslOf(primary),b=hslOf(secondary);
  // Gris, negro o blanco: usar azul petróleo profesional, no un botón gris ilegible.
  const hue=a.s<0.10?210:a.h;
  // Si la camiseta secundaria es neutra, conservar una armonía monocromática.
  const secondaryHue=b.s<0.18?hue:b.h;
  return {hue,secondaryHue,mode:p.mode,source:primary,
    light:{"--brand":hsl(hue,28,25),"--brand-ink":"#FFFFFF",
      "--accent":hsl(hue,36,31),"--accent-ink":"#FFFFFF",
      "--accent-soft":hsl(hue,30,93),
      "--info":hsl(secondaryHue,38,30),"--info-soft":hsl(secondaryHue,35,92)},
    dark:{"--brand":hsl(hue,24,19),"--brand-ink":"#FFFFFF",
      "--accent":hsl(hue,40,69),"--accent-ink":"#081C2A",
      "--accent-soft":hsl(hue,27,21),
      "--info":hsl(secondaryHue,48,73),"--info-soft":hsl(secondaryHue,30,23)}
  };
 };
 const keys=["--brand","--brand-ink","--accent","--accent-ink","--accent-soft","--info","--info-soft"];
 let previous="";
 const apply=season=>{
  if(typeof document==="undefined")return;
  const root=document.documentElement;
  const settings=season?.settings;
  const theme=root.getAttribute("data-theme");
  const dark=theme==="dark"||(theme!=="light"&&typeof window!=="undefined"&&
    typeof window.matchMedia==="function"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
  const config=settings ? JSON.stringify([settings.kits,settings.palette,dark]) : "";
  if(previous===config)return;
  previous=config;
  if(!settings){keys.forEach(k=>root.style.removeProperty(k));return;}
  const chosen=derive(settings.kits,settings.palette)[dark?"dark":"light"];
  keys.forEach(k=>root.style.setProperty(k,chosen[k]));
 };
 return {presets,normalizeKits,cleanPalette,derive,apply,validHex};
})();
if(typeof module!=="undefined")module.exports=ClubTheme;
