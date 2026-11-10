/* Solo experiencia del cliente. Supabase impone los límites reales en el servidor.
   El navegador NO puede identificar con certeza un bot ni autorizar un desbloqueo.
 */
const AuthThrottle = (() => {
  const key="bq.auth-wait.v1."+String((typeof window!=="undefined"&&window.BQ_CONFIG?.SUPABASE_URL)||"unconfigured").replace(/[^a-z0-9]/gi,"_").slice(0,90);
  const kinds=["signup","login","forgot"];
  const deadlines={signup:0,login:0,forgot:0};
  const now=()=>Date.now();
  try{
    const saved=JSON.parse(localStorage.getItem(key)||"null");
    if(saved&&typeof saved==="object")for(const kind of kinds){
      const v=Number(saved[kind])||0;
      if(v>now()&&v<now()+86400000)deadlines[kind]=v;
    }
  }catch(_){}
  const save=()=>{try{localStorage.setItem(key,JSON.stringify(deadlines))}catch(_){}};
  const remaining=kind=>Math.max(0,Math.ceil(((deadlines[kind]||0)-now())/1000));
  const format=seconds=>Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");
  const retrySeconds=error=>{
    const h=error?.context?.headers;
    const raw=(h&&typeof h.get==="function"?h.get("Retry-After"):null)||error?.retryAfter||error?.retry_after;
    if(raw==null)return null;
    const seconds=/^\d+$/.test(String(raw))?Number(raw):Math.ceil((Date.parse(String(raw))-now())/1000);
    return Number.isFinite(seconds)?Math.min(3600,Math.max(1,seconds)):null;
  };
  const classify=error=>{
    if(!error)return "other";
    const code=String(error.code||"").toLowerCase(),msg=String(error.message||error.msg||"").toLowerCase();
    if(code==="captcha_failed"||/captcha|turnstile/.test(msg))return "captcha";
    if(code==="over_email_send_rate_limit"||/email.*rate.?limit|rate.?limit.*email/.test(msg))return "email";
    if(error.status===429||code==="over_request_rate_limit"||code==="too_many_requests"||/too many (requests|attempts)|demasiados intentos|rate.?limit/.test(msg))return "requests";
    if(code==="invalid_credentials"||/invalid login credentials/.test(msg))return "credentials";
    return "other";
  };
  const message=kind=>{
    const seconds=remaining(kind);
    if(!seconds)return "";
    const label=kind==="signup"?"registro":kind==="login"?"inicio de sesión":"recuperación de contraseña";
    return "Límite temporal de "+label+". Espera al menos "+format(seconds)+" antes de repetir la solicitud. El contador es orientativo: Supabase podría exigir más espera.";
  };
  const observe=(error,kind)=>{
    const cls=classify(error);
    if(!kinds.includes(kind)||!["email","requests"].includes(cls))return {kind:cls,seconds:0};
    // El servidor tiene la última palabra. Nunca inventar un desbloqueo exacto.
    const seconds=retrySeconds(error)??(cls==="email"?60:30);
    deadlines[kind]=Math.max(deadlines[kind],now()+seconds*1000);
    save();startTicker();
    return {kind:cls,seconds:remaining(kind)};
  };
  const sync=()=>{
    if(typeof document==="undefined"||!document.querySelectorAll)return;
    document.querySelectorAll("[data-auth-cooldown]").forEach(el=>{
      const kind=el.dataset.authCooldown;
      if(!kinds.includes(kind))return;
      const seconds=remaining(kind);
      el.hidden=!seconds;
      el.textContent=seconds?message(kind):"";
      const button=el.closest("form")?.querySelector("[data-auth-submit]");
      if(button){
        if(seconds)button.disabled=true;
        else if(!button.dataset.authBusy)button.disabled=false;
      }
    });
  };
  let interval=null;
  function startTicker(){
    if(interval!==null||typeof setInterval!=="function")return;
    interval=setInterval(()=>{
      sync();
      if(!kinds.some(k=>remaining(k)>0)){clearInterval(interval);interval=null;}
    },1000);
    interval?.unref?.();
  }
  if(kinds.some(k=>remaining(k)>0))startTicker();
  return {remaining,format,classify,message,observe,sync,retrySeconds};
})();
if(typeof module!=="undefined")module.exports=AuthThrottle;
