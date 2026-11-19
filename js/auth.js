/* ===== Cuentas: entrar, registrarse, recuperar contraseña, unirse con código, compartir y Mi cuenta ===== */
const Auth = { state: "loading", uid: null, eventSeq: 0, sessionEpoch: 0, recovery: null, signingOut: false, ui: { mode: "welcome", busy: false, msg: null, email: "", name: "" } };
const FORM = {};

(function () {
  const A = Auth;
  const redirectUrl = () => location.origin + location.pathname;
  const MSG = {
    "Invalid login credentials": "El correo o la contraseña no son correctos.",
    "Email not confirmed": "Aún no has confirmado tu correo. Abre el mensaje que te enviamos y pulsa el enlace.",
    "User already registered": "Ya existe una cuenta con ese correo. Prueba a entrar o a recuperar la contraseña.",
    "Password should be at least": "La contraseña no cumple la longitud mínima exigida.",
    "over_request_rate_limit": "Demasiados intentos de acceso. Por seguridad, inténtalo más tarde.",
    "over_email_send_rate_limit": "Demasiadas solicitudes de correo. Inténtalo más tarde.",
    "captcha_failed": "No se ha podido verificar el control antirrobots. Vuelve a intentarlo.",
    "Unable to validate email address": "Ese correo no parece válido.",
    "email rate limit exceeded": "Se han pedido demasiados correos. Espera unos minutos e inténtalo de nuevo.",
    "over_email_send_rate_limit": "Se han pedido demasiados correos. Espera unos minutos e inténtalo de nuevo.",
    "New password should be different": "La contraseña nueva debe ser distinta de la anterior.",
    "weak_password": "La contraseña es demasiado fácil de adivinar. Usa una más larga o más variada.",
  };
  const friendly = e => {
    const m = String((e && (e.message || e.msg)) || e || "");
    if ((e && e.status === 429) || /rate.?limit|too many requests|too many attempts/i.test(m)) return "Demasiados intentos. Por seguridad, espera antes de volver a intentarlo.";
    const k = Object.keys(MSG).find(x => m.includes(x) || (e && e.code === x));
    if (k) return MSG[k];
    if (/failed to fetch|network|load failed/i.test(m)) return "No hay conexión con el servidor. Comprueba tu internet e inténtalo de nuevo.";
    return "No se ha podido completar la operación. Inténtalo de nuevo.";
  };
  const setMsg = (type, text) => { A.ui.msg = text ? { type, text } : null; };
  const rerender = () => render(true);
  const throttle = typeof AuthThrottle !== "undefined" ? AuthThrottle : null;
  // El cronómetro es informativo; Supabase decide cuándo termina el límite real.
  const cooldownNotice = kind => throttle
    ? `<p class="auth-wait small" role="status" data-auth-cooldown="${kind}"${throttle.remaining(kind) ? "" : " hidden"}>${esc(throttle.message(kind))}</p>`
    : "";
  const updateFeedback = (f,kind,text,type="err") => {
    const output=f?.querySelector?.("[data-auth-inline]");
    // Un único aviso: mensaje integrado o fallback, nunca los dos.
    setMsg(output ? null : type,text && !output ? text : null);
    if(output){
      output.textContent=text;
      output.hidden=!text;
      output.className=(type==="err"?"err":"okm")+" small";
    }
    throttle?.sync();
  };
  const setBusy = (f,busy,busyLabel,normalLabel) => {
    A.ui.busy=busy;
    const button=f?.querySelector?.("[data-auth-submit]");
    if(button){
      button.dataset.authBusy=busy?"true":"";
      button.disabled=busy||!!throttle?.remaining(button.dataset.authKind);
      button.textContent=busy?busyLabel:normalLabel;
    }
  };
  const allowed = (f,kind) => {
    if(A.ui.busy)return false;
    if(throttle?.remaining(kind)){
      updateFeedback(f,kind,"");
      throttle.sync();
      return false;
    }
    return true;
  };
  const authFailure = (f,kind,error) => {
    const verdict=throttle?.observe(error,kind);
    if(verdict && verdict.seconds){
      // El contador ya explica el límite; ocultar avisos anteriores duplicados.
      updateFeedback(f,kind,"");
      throttle.sync();
      return;
    }
    if(verdict?.kind==="captcha"){
      updateFeedback(f,kind,"No se ha podido completar la verificación antirrobots. Compruébala antes de intentarlo de nuevo.");
      return;
    }
    updateFeedback(f,kind,kind==="login"?loginFeedback(error):friendly(error));
  };

  /* ---------- pantalla de entrada (dentro de la página de inicio) ---------- */
  A.render = () => {
    const slot = $("#authSlot"); if (!slot) return;
    document.body.classList.remove("in-app");
    $("#app").innerHTML = ""; $("#sheetRoot").innerHTML = ""; document.body.classList.remove("noscroll");
    const u = A.ui;
    let html;
    if (!Cloud.configured()) {
      html = `<div class="auth-card"><h2>Falta configurar la conexión</h2><p class="muted">Abre el archivo <code>config.js</code> y pega la URL y la clave pública (anon) de tu proyecto de Supabase. Los pasos están en la guía.</p></div>`;
    } else if (A.state === "loading") {
      html = `<div class="auth-card"><div class="loading"><div class="spin"></div><p>Comprobando tu sesión…</p></div></div>`;
    } else if (A.state === "recovery") {
      html = card("Elige una contraseña nueva", `<form data-form="authNewPass" class="form" novalidate>
        <p class="muted small">Solo puedes modificar la contraseña después de abrir un enlace de recuperación válido enviado a tu correo.</p>
        <label class="fld"><span>Contraseña nueva (mínimo 12 caracteres)</span>${passwordInput("new-password", 12)}<small class="muted">Utiliza una contraseña única. Puedes usar un gestor de contraseñas.</small></label>
        <label class="fld"><span>Confirmar contraseña nueva</span>${passwordInput("new-password", 12, "confirm_password")}</label>
        ${msgHtml()}<button class="btn primary block" type="submit" ${u.busy ? "disabled" : ""}>${u.busy ? "Guardando…" : "Guardar contraseña"}</button></form>`);
    } else if (u.mode === "check") {
      html = card("Comprueba tu correo o inicia sesión", `<p>Si acabas de crear la cuenta, revisa el correo de <b>${esc(u.email)}</b> para confirmar el registro.</p>
        <div class="auth-check-notice" role="status"><strong>¿El correo ya estaba registrado?</strong><p>Entonces no se enviará otra confirmación. Utiliza «Iniciar sesión» con tu contraseña anterior.</p></div>
        <p class="muted small">Si no aparece, revisa spam. Si has indicado un código de equipo, el acceso se intentará completar al confirmar el correo en este mismo navegador. En otro dispositivo, podrás añadirlo después desde «Unirme con un código».</p>
        <button class="btn primary block" type="button" data-act="authMode" data-v="login">Iniciar sesión</button>
         <button class="btn ghost block" type="button" data-act="authMode" data-v="forgot">No recuerdo mi contraseña</button>`);
    } else if (u.mode === "welcome") {
      html = card("Empieza con Banquillo", `<p class="muted small">Gestiona un equipo, crea una cuenta o entra con el código que te ha dado tu director deportivo.</p><div class="auth-choices">
        <button type="button" class="auth-choice" data-act="authMode" data-v="login"><b>Iniciar sesión</b><small>Ya tengo una cuenta</small></button>
        <button type="button" class="auth-choice" data-act="authMode" data-v="signup"><b>Registrarme</b><small>Crear mi cuenta gratuitamente</small></button>
        <button type="button" class="auth-choice emphasized" data-act="authMode" data-v="join"><b>Unirme a mi club</b><small>Crear cuenta con código de mi equipo</small></button>
       </div>`);
    } else if (u.mode === "signup" || u.mode === "join") {
      html = card(u.mode === "join" ? "Únete a tu equipo" : "Crea tu cuenta", `${tabs()}${u.mode === "join" ? `<p class="auth-join-guide">Introduce el código específico de tu equipo. Primero confirmaremos tu correo; después se solicitará el acceso automáticamente desde este navegador.</p>` : ""}<form data-form="authSignup" class="form" novalidate>
        <label class="fld"><span>Tu nombre</span><input class="inp" type="text" name="name" autocomplete="given-name" maxlength="60" value="${esc(u.name)}" required></label>
        <label class="fld"><span>Correo electrónico</span><input class="inp" type="email" name="email" autocomplete="email" inputmode="email" value="${esc(u.email)}" required></label>
        ${typeof PhoneCountry !== "undefined" ? PhoneCountry.render(u.phoneCountry || "ES",u.phoneNumber || "") : ""}
        <label class="fld"><span>Contraseña (mínimo 12 caracteres)</span>${passwordInput("new-password", 12)}<small class="muted">Utiliza una contraseña única y evita reutilizar la de tu correo.</small></label>
        <label class="fld"><span>Repetir contraseña</span>${passwordInput("new-password", 12, "confirm_password")}</label>
        <p class="err small" role="alert" data-signup-password-mismatch hidden>Las contraseñas no coinciden. Escríbelas igual para continuar.</p>
        ${u.mode === "join" ? `<label class="fld"><span>Código de mi equipo</span><input class="inp code-inp" name="join_code" type="text" required maxlength="12" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="XXXX-XXXX" value="${esc(u.joinCode || "")}" data-inp="authJoinCode"><small class="muted">Si prefieres registrarte sin código, puedes añadirlo después en «Unirme con un código».</small></label>` : ""}
        <label class="chk"><input type="checkbox" name="accept" required><span>He leído y acepto la <a href="legal/privacidad.html" target="_blank" rel="noopener">política de privacidad</a> y el <a href="legal/aviso-legal.html" target="_blank" rel="noopener">aviso legal</a>. Me comprometo a usar solo nombres de pila (o inicial del apellido) de los menores y a contar con la autorización de sus familias.</span></label>
        ${TurnstileGuard.placeholder()}${msgHtml()}<p class="err small" role="alert" data-auth-inline hidden></p>${cooldownNotice("signup")}<button class="btn primary block" type="submit" data-auth-submit data-auth-kind="signup" ${u.busy || throttle?.remaining("signup") ? "disabled" : ""}>${u.busy ? "Creando…" : "Crear cuenta"}</button>${loginHelp()}</form>`);
    } else if (u.mode === "forgot") {
      html = card("Recuperar contraseña", `<form data-form="authForgot" class="form" novalidate>
        <p class="muted small">Escribe tu correo y te enviaremos un enlace para elegir una contraseña nueva.</p>
        <label class="fld"><span>Correo electrónico</span><input class="inp" type="email" name="email" autocomplete="email" inputmode="email" value="${esc(u.email)}" required></label>
        ${TurnstileGuard.placeholder()}${msgHtml()}<p class="err small" role="alert" data-auth-inline hidden></p>${cooldownNotice("forgot")}<button class="btn primary block" type="submit" data-auth-submit data-auth-kind="forgot" ${u.busy || throttle?.remaining("forgot") ? "disabled" : ""}>${u.busy ? "Enviando…" : "Enviar enlace"}</button>
        <button class="btn ghost block" type="button" data-act="authMode" data-v="login">Volver</button></form>`);
    } else {
      html = card("Entrar", `${tabs()}<form data-form="authLogin" class="form" novalidate>
        <label class="fld"><span>Correo electrónico</span><input class="inp" type="email" name="email" autocomplete="email" inputmode="email" value="${esc(u.email)}" required></label>
        <label class="fld"><span>Contraseña</span>${passwordInput("current-password")}</label>
        ${TurnstileGuard.placeholder()}${msgHtml()}<p class="err small" role="alert" data-auth-inline hidden></p>${cooldownNotice("login")}<button class="btn primary block" type="submit" data-auth-submit data-auth-kind="login" ${u.busy || throttle?.remaining("login") ? "disabled" : ""}>${u.busy ? "Entrando…" : "Entrar"}</button>
        <button class="link center-t" type="button" data-act="authMode" data-v="forgot">¿Has olvidado la contraseña?</button></form>`);
    }
    if (slot.dataset.h !== html) { slot.innerHTML = html; slot.dataset.h = html; }
    TurnstileGuard.mount();
    throttle?.sync();
  };
  const card = (t, inner) => `<div class="auth-card"><h2>${t}</h2>${inner}</div>`;
  const tabs = () => `<div class="seg auth-tabs" role="group" aria-label="Acceso a Banquillo"><button type="button" class="${A.ui.mode === "login" ? "on" : ""}" data-act="authMode" data-v="login">Entrar</button><button type="button" class="${A.ui.mode === "signup" ? "on" : ""}" data-act="authMode" data-v="signup">Crear cuenta</button><button type="button" class="${A.ui.mode === "join" ? "on" : ""}" data-act="authMode" data-v="join">Unirme a un club</button></div>`;
  const msgHtml = () => A.ui.msg ? `<p class="${A.ui.msg.type === "ok" ? "okm" : "err"} small" role="alert">${esc(A.ui.msg.text)}</p>` : "";
  const existingSignupError = error => !!error && (error.code === "user_already_exists" || /user already registered|already exists|already registered/i.test(String(error.message || "")));
  const loginHelp = () => `<div class="auth-login-help"><strong>¿Ya tienes una cuenta?</strong>
    <span>Si el correo ya estaba registrado, no recibirás otro mensaje de confirmación.</span>
    <button class="btn ghost block" type="button" data-act="authMode" data-v="login">Iniciar sesión</button>
    <button class="link center-t" type="button" data-act="authMode" data-v="forgot">Recuperar contraseña</button></div>`;
  const passwordInput = (autocomplete, minimum = 0, name = "password") => `<div class="auth-password-wrap">
      <input class="inp" type="password" data-password-control name="${name}" autocomplete="${autocomplete}"${minimum ? ` minlength="${minimum}"` : ""} required>
      <button class="auth-password-toggle" type="button" data-password-toggle aria-label="Mostrar contraseña" title="Mostrar contraseña" aria-pressed="false">
        <svg class="auth-eye-open" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3.2"/>
        </svg>
        <svg class="auth-eye-closed" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">
          <path d="M3 3 21 21"/><path d="M9.9 5.3A11.1 11.1 0 0 1 12 5c6.5 0 10 7 10 7a15.7 15.7 0 0 1-3 3.8M6.3 6.3A17.7 17.7 0 0 0 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.9-1.2"/><path d="M10 10a3.2 3.2 0 0 0 4 4"/>
        </svg>
      </button>
    </div>`;
  const loginFeedback = err => {
    const generic = friendly(err);
    if (err?.code === "invalid_credentials" || /invalid login credentials/i.test(String(err?.message || ""))) {
      return "El correo o la contraseña no son correctos. Revisa los datos o utiliza «¿Has olvidado la contraseña?».";
    }
    return generic;
  };
  document.addEventListener("click", event => {
    const button = event.target.closest?.("[data-password-toggle]");
    if (!button) return;
    const field = button.parentElement?.querySelector("input[data-password-control]");
    if (!field || field.disabled) return;
    const visible = field.type === "password";
    field.type = visible ? "text" : "password";
    button.setAttribute("aria-label", visible ? "Ocultar contraseña" : "Mostrar contraseña");
    button.setAttribute("title", visible ? "Ocultar contraseña" : "Mostrar contraseña");
    button.setAttribute("aria-pressed", String(visible));
  });
  const val = (f, n) => (f.elements[n] ? String(f.elements[n].value || "").trim() : "");
  const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  const captchaForSubmit = (f,kind) => {
    const captchaToken = TurnstileGuard.token();
    if (captchaToken === "") {
      updateFeedback(f,kind,"Completa la verificación de seguridad antes de continuar.");
      return false;
    }
    return captchaToken;
  };

  ACT.authMode = el => { A.ui.mode = el.dataset.v; A.ui.msg = null; };
  INP.authJoinCode = el => { A.ui.joinCode = el.value; };
  INP.authPhoneNumber = el => { A.ui.phoneNumber = el.value.replace(/[^0-9 ()-]/g,"").slice(0,20); };
  // Código temporal (máximo 1 h) en este navegador: permite completar la confirmación en otra pestaña.
  const PENDING_KEY = "bq.pending-team-code.v1." + String(Cloud.cfg?.SUPABASE_URL || "not-configured").replace(/[^a-z0-9]/gi,"_").slice(0,100);
  const validCode = value => /^[A-Z0-9]{8}$/.test(String(value || "").toUpperCase().replace(/[^A-Z0-9]/g,""));
  const setPendingJoin = (code,email) => {
    try { localStorage.setItem(PENDING_KEY,JSON.stringify({code:code.toUpperCase().replace(/[^A-Z0-9]/g,""),email:email.toLowerCase(),expires:Date.now()+3600000})); } catch (_) { /* sesión sin almacenamiento */ }
  };
  const clearPendingJoin = () => { try { localStorage.removeItem(PENDING_KEY); } catch (_) {} };
  const consumePendingJoin = async (sessionUser) => {
    let pending;
    try {pending=JSON.parse(localStorage.getItem(PENDING_KEY)||"null");}catch(_){clearPendingJoin();return;}
    if(!pending)return;
    if(pending.expires<Date.now()){clearPendingJoin();return;}
    if(String(sessionUser.email||"").toLowerCase()!==pending.email)return;
    clearPendingJoin();
    try {
      const result=await Cloud.rpc("join_season",{p_code:pending.code});
      if(result?.ok && A.uid===sessionUser.id && A.state==="in"){
        await Store.afterJoin(result.season_id);
        go("inicio"); toast("Ya tienes acceso a tu equipo. ¡Bienvenido!","ok");
      } else if(A.uid===sessionUser.id) toast("No se pudo aplicar el código. Puedes introducirlo en Temporadas → Unirme con un código.","err");
    }catch(_){if(A.uid===sessionUser.id)toast("No se pudo aplicar el código. Introduce el código desde Temporadas.","err");}
  };
  FORM.authLogin = async f => {
    if(!allowed(f,"login"))return;
    const email=val(f,"email"),password=f.elements.password?.value||"";
    A.ui.email=email;
    if(!validEmail(email)||!password){
      updateFeedback(f,"login","Escribe tu correo y tu contraseña.");
      return;
    }
    const captchaToken=captchaForSubmit(f,"login");if(captchaToken===false)return;
    updateFeedback(f,"login","");
    setBusy(f,true,"Entrando…","Entrar");
    try {
      const {error}=await Cloud.sb.auth.signInWithPassword({email,password,...(captchaToken?{options:{captchaToken}}:{})});
      if(error)authFailure(f,"login",error);
    }catch(_){
      updateFeedback(f,"login","No se ha podido contactar con el servicio de acceso. Revisa tu conexión y vuelve a intentarlo.");
    }finally{setBusy(f,false,"Entrando…","Entrar");throttle?.sync();}
  };
  FORM.authSignup = async f => {
    if(!allowed(f,"signup"))return;
    const name=val(f,"name"),email=val(f,"email"),password=f.elements.password?.value||"";
    const code=A.ui.mode==="join"?val(f,"join_code"):"";
    const phone=val(f,"phone_optional"),country=A.ui.phoneCountry||"ES";
    A.ui.name=name;A.ui.email=email;A.ui.joinCode=code;A.ui.phoneNumber=phone;
    if(A.ui.mode==="join"&&!validCode(code)){
      updateFeedback(f,"signup","Introduce las 8 letras o números del código de tu equipo.");return;
    }
    if(!name){updateFeedback(f,"signup","Escribe tu nombre.");return;}
    if(!validEmail(email)){updateFeedback(f,"signup","Ese correo no parece válido.");return;}
    if(!(typeof PhoneCountry!=="undefined"&&PhoneCountry.validNumber(phone,country))){
      updateFeedback(f,"signup","Escribe un número de teléfono válido con su país y prefijo. Este dato aún no se guarda ni verifica.");
      f.elements.phone_optional?.focus?.();return;
    }
    if(password.length<12){updateFeedback(f,"signup","La contraseña debe tener al menos 12 caracteres.");return;}
    const confirmPassword=f.elements.confirm_password;
    if(!confirmPassword||password!==confirmPassword.value){
      const notice=f.querySelector?.("[data-signup-password-mismatch]");
      if(notice){notice.hidden=false;notice.textContent="Las contraseñas no coinciden. Escríbelas igual para continuar.";}
      confirmPassword?.setAttribute?.("aria-invalid","true");
      confirmPassword?.focus?.();
      return;
    }
    confirmPassword.removeAttribute?.("aria-invalid");
    if(!f.elements.accept?.checked){updateFeedback(f,"signup","Para crear la cuenta tienes que aceptar la política de privacidad.");return;}
    const captchaToken=captchaForSubmit(f,"signup");if(captchaToken===false)return;
    if(code)setPendingJoin(code,email);
    updateFeedback(f,"signup","");
    setBusy(f,true,"Creando…","Crear cuenta");
    try{
      const {data,error}=await Cloud.sb.auth.signUp({
        email,password,options:{data:{name},emailRedirectTo:redirectUrl(),...(captchaToken?{captchaToken}:{})}
      });
      if(error){
        if(code)clearPendingJoin();
        if(existingSignupError(error)){updateFeedback(f,"signup","Esta cuenta ya existe. Debes iniciar sesión o recuperar tu contraseña.");}
        else authFailure(f,"signup",error);
        return;
      }
      if(data?.session)return;
      A.ui.mode="check";rerender();
    }catch(_){
      if(code)clearPendingJoin();
      updateFeedback(f,"signup","No se ha podido contactar con el servidor de registro. Comprueba la conexión e inténtalo de nuevo.");
    }finally{setBusy(f,false,"Creando…","Crear cuenta");throttle?.sync();}
  };
  FORM.authForgot = async f => {
    if(!allowed(f,"forgot"))return;
    const email=val(f,"email");A.ui.email=email;
    if(!validEmail(email)){updateFeedback(f,"forgot","Escribe un correo válido.");return;}
    const captchaToken=captchaForSubmit(f,"forgot");if(captchaToken===false)return;
    updateFeedback(f,"forgot","");
    setBusy(f,true,"Enviando…","Enviar enlace");
    try{
      const {error}=await Cloud.sb.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl(),...(captchaToken?{captchaToken}:{})});
      if(error){authFailure(f,"forgot",error);return;}
      updateFeedback(f,"forgot","Si ese correo tiene cuenta, recibirás un enlace en unos minutos.","ok");
    }catch(_){
      updateFeedback(f,"forgot","No hemos podido solicitar el enlace. Comprueba la conexión antes de volver a intentarlo.");
    }finally{setBusy(f,false,"Enviando…","Enviar enlace");throttle?.sync();}
  };
  FORM.authNewPass = async f => {
    const password = f.elements.password.value;
    const confirmation = f.elements.confirm_password?.value || "";
    if (A.state !== "recovery" || !A.recovery?.uid) {
      setMsg("err", "La recuperación no está verificada. Solicita un enlace nuevo desde «Recuperar contraseña».");
      A.state = "out"; A.ui.mode = "forgot"; return rerender();
    }
    if (password.length < 12) { setMsg("err", "La contraseña debe tener al menos 12 caracteres."); return rerender(); }
    if (password !== confirmation) { setMsg("err", "Las dos contraseñas deben coincidir."); return rerender(); }
    if (A.ui.busy) return;
    const recoveryUid=A.recovery.uid, epoch=A.sessionEpoch;
    A.ui.busy=true; setMsg(); rerender();
    try {
      const { data: verified, error: verifyError } = await Cloud.sb.auth.getUser();
      if (verifyError || !verified?.user || verified.user.id !== recoveryUid || A.state !== "recovery" || epoch !== A.sessionEpoch)
        throw new Error("recovery_not_verified");
      const { error } = await Cloud.sb.auth.updateUser({ password });
      if (error) throw error;
      // No dejar una sesión abierta tras recuperar la contraseña.
      try { await Cloud.sb.auth.signOut({scope:"local"}); } catch (_) { /* el cambio ya se realizó */ }
      A.leave();
      A.ui.mode="login";
      setMsg("ok","Contraseña actualizada. Inicia sesión con tu contraseña nueva.");
      try { history.replaceState(null,"",location.pathname); } catch (_) {}
    } catch (error) {
      if (error?.message==="recovery_not_verified"){
        A.recovery=null; A.state="out"; A.ui.mode="forgot";
        setMsg("err","El enlace no es válido o la sesión de recuperación ha cambiado. Solicita un enlace nuevo.");
      } else setMsg("err",friendly(error));
    } finally {
      A.ui.busy=false; rerender();
    }
  };
  document.addEventListener("submit", e => {
    const f = e.target.closest && e.target.closest("form[data-form]"); if (!f) return;
    e.preventDefault();
    const fn = FORM[f.dataset.form]; if (fn) fn(f);
  });

  /* ---------- sesión ---------- */
  A.start = () => {
    if (!Cloud.init()) { A.state = "out"; render(true); return; }
    Cloud.sb.auth.onAuthStateChange((event, session) => {
      // El callback de Supabase nunca realiza trabajo asíncrono. Descartamos
      // eventos antiguos (p. ej. SIGNED_OUT de la sesión anterior).
      const eventSeq=++A.eventSeq;
      setTimeout(() => {
        if(eventSeq!==A.eventSeq)return;
        if (event === "PASSWORD_RECOVERY") {
          if (!session?.user?.id) { A.leave(); A.ui.mode="forgot"; setMsg("err","Solicita un enlace de recuperación nuevo."); render(true); return; }
          A.sessionEpoch++;
          A.recovery={uid:session.user.id};
          A.uid=null; Cloud.profile=null; Store.reset();
          A.state="recovery"; A.ui.busy=false; setMsg(); render(true);
          return;
        }
        if (event === "SIGNED_OUT") {
          if (A.state!=="out") A.leave();
          return;
        }
        if(session?.user && A.state!=="recovery") {
          if(A.uid!==session.user.id || A.state!=="in") A.enter(session);
        } else if(event==="INITIAL_SESSION" && !session && A.state==="loading"){
          A.state="out"; render(true);
        }
      }, 0);
    });
  };
  A.enter = async session => {
    const sessionUser = session.user.id, epoch=++A.sessionEpoch;
    A.recovery=null;
    if (typeof CoachInbox !== "undefined") CoachInbox.reset();
    if (typeof TeamRequests !== "undefined") TeamRequests.reset();
    A.uid = sessionUser; A.state = "in";
    Cloud.profileEpoch = (Cloud.profileEpoch || 0) + 1;
    Cloud.profile = null;
    document.body.classList.add("in-app");
    Store.connecting = true; render(true);
    Store.reset(); Store.user = { uid: sessionUser, email: session.user.email };
    try {
      await Store.init(Cloud.db, { uid: sessionUser, email: session.user.email });
      if (A.uid !== sessionUser || A.state !== "in" || epoch!==A.sessionEpoch) return;
      Store.connecting = false;
      await Cloud.loadProfile();
      if (A.uid === sessionUser && A.state === "in" && epoch===A.sessionEpoch) await consumePendingJoin(session.user);
      if (A.uid === sessionUser && A.state === "in" && epoch===A.sessionEpoch) render(true);
    } catch (e) {
      if (A.uid === sessionUser && A.state === "in" && epoch===A.sessionEpoch) { Store.connecting = false; render(true); }
    }
  };
  A.leave = () => {
    A.sessionEpoch++; A.recovery=null;
    Cloud.profileEpoch = (Cloud.profileEpoch || 0) + 1;
    if (typeof CoachInbox !== "undefined") CoachInbox.reset();
    if (typeof TeamRequests !== "undefined") TeamRequests.reset();
    A.uid = null; A.state = "out"; Cloud.profile = null; Cloud.aiPrivacyAccepted = false;
    Store.reset(); Store.connecting = false;
    UI.sheet = null; UI.wiz = null; UI.ai = {};
    A.ui = { mode: "welcome", busy: false, msg: null, email: "", name: "" };
    const slot = $("#authSlot"); if (slot) slot.dataset.h = "";
    render(true);
  };
  ACT.signOut = async () => {
    if(A.signingOut)return;
    A.signingOut=true; UI.sheet=null;
    try {
      const { error } = await Cloud.sb.auth.signOut({ scope: "local" });
      if(error){toast("No se ha podido cerrar la sesión. Comprueba tu conexión y vuelve a intentarlo.","err");return;}
      if(A.state!=="out")A.leave();
    } catch (_) {
      toast("No se ha podido cerrar la sesión. Comprueba tu conexión y vuelve a intentarlo.","err");
    } finally {A.signingOut=false;}
  };

  /* ---------- Mi cuenta y Silbatos ---------- */
  const fmtD = iso => { try { return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; } };
  ACT.openAccount = () => { UI.sheet = { type: "account" }; Cloud.loadProfile().then(() => { if (UI.sheet && UI.sheet.type === "account") render(true); }); };
  ACT.openSilbatos = ACT.openAccount;
  V.sheet.account = () => {
    const p = Cloud.profile || { tokens: 0, plan: "free", name: "", email: "" }, prem = p.plan === "premium";
    const mail = Cloud.cfg.CONTACT_EMAIL;
    return `<h2>Mi cuenta</h2>
      <p class="muted">${esc(p.name || "")}${p.name && p.email ? " · " : ""}${esc(p.email || "")}</p>
      <section class="card flat tokcard"><div class="tok-n"><b>${p.tokens}</b><span>Silbatos</span></div>
        <div class="tok-t"><b>${prem ? "Plan premium" : "Plan gratuito"}</b>
        <p class="muted small">Los Silbatos son la moneda de la IA: redactar un informe o una crónica cuesta <b>1 Silbato</b>. Todo lo demás de la app es gratis.${prem ? ` Cada mes se recargan hasta ${p.plan_tokens}${p.renews_at ? ` (próxima recarga: ${esc(fmtD(p.renews_at))})` : ""}.` : ` Con el plan premium se recargan ${p.plan_tokens || 100} cada mes.`}</p>
        ${prem ? "" : Cloud.cfg.PREMIUM_URL ? `<a class="btn primary small" href="${esc(Cloud.cfg.PREMIUM_URL)}" target="_blank" rel="noopener">Pasar a premium</a>` : `<p class="small"><b>Plan premium: próximamente.</b>${mail ? ` Escríbenos a ${esc(mail)} si quieres más Silbatos.` : ""}</p>`}</div></section>
      <div class="row gap wrap"><a class="btn ghost small" href="legal/privacidad.html" target="_blank" rel="noopener">Privacidad</a><a class="btn ghost small" href="legal/aviso-legal.html" target="_blank" rel="noopener">Aviso legal</a></div>
      <div class="row between gap wrap foot">${btn("Eliminar mi cuenta", "deleteAccountAsk", {}, "ghost danger-t")}${btn("Cerrar sesión", "signOut", {}, "primary", "lock")}</div>`;
  };
  ACT.deleteAccountAsk = () => confirmSheet("¿Eliminar tu cuenta?", "Se borrará tu cuenta y tus Silbatos. Las temporadas que has creado se borrarán por completo, salvo las que compartes con otros entrenadores, que pasarán a otra persona. No se puede deshacer.", "Eliminar mi cuenta", "deleteAccount", {}, true);
  ACT.deleteAccount = async () => {
    UI.sheet = null;
    try { await Cloud.rpc("delete_my_account"); } catch (e) { toast("No se ha podido eliminar la cuenta. Inténtalo de nuevo.", "err"); return; }
    try { await Cloud.sb.auth.signOut(); } catch (e) { /* noop */ }
    A.leave(); toast("Tu cuenta se ha eliminado.", "ok");
  };

  /* ---------- Unirse con un código ---------- */
  const fmtCode = c => (c || "").replace(/^(.{4})(.{4})$/, "$1-$2");
  ACT.openJoin = () => { UI.sheet = { type: "join", code: "", busy: false, err: null }; };
  V.sheet.join = sh => `<h2>Unirme a una temporada</h2>
    <p class="muted">Pídele el código al entrenador que creó la temporada. Tiene 8 letras y números, por ejemplo <b>K7M2-XQ9P</b>.</p>
    <form data-form="joinForm" class="form" novalidate><label class="fld"><span>Código de la temporada</span>
      <input class="inp code-inp" type="text" name="code" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" placeholder="XXXX-XXXX" value="${esc(sh.code)}" data-inp="joinCode"></label>
      ${sh.err ? `<p class="err small" role="alert">${esc(sh.err)}</p>` : ""}
      <div class="row end gap foot">${btn("Cancelar", "closeSheet", {}, "ghost")}<button class="btn primary" type="submit" ${sh.busy ? "disabled" : ""}>${sh.busy ? "Comprobando…" : "Unirme"}</button></div></form>`;
  INP.joinCode = el => { UI.sheet.code = el.value; };
  FORM.joinForm = async f => {
    const sh = UI.sheet; if (!sh || sh.type !== "join" || sh.busy) return;
    const code = String(f.elements.code.value || "").trim();
    if (code.replace(/[^A-Za-z0-9]/g, "").length < 8) { sh.err = "El código tiene 8 letras y números."; return render(true); }
    sh.busy = true; sh.err = null; render(true);
    let r;
    try { r = await Cloud.rpc("join_season", { p_code: code }); } catch (e) { sh.busy = false; sh.err = "No se ha podido comprobar el código. Revisa tu conexión."; return render(true); }
    sh.busy = false;
    if (!r || !r.ok) {
      sh.err = r && r.error === "too_many_attempts" ? "Demasiados intentos fallidos. Espera unos minutos antes de volver a probar." : "Ese código no existe o el responsable lo ha desactivado.";
      return render(true);
    }
    UI.sheet = null; render(true);
    await Store.afterJoin(r.season_id);
    go("inicio"); toast("Te has unido a la temporada.", "ok");
  };

  /* ---------- Código individual asignado por un director deportivo ---------- */
  ACT.openTeamJoin = () => { UI.sheet = { type: "teamJoin", code: "", busy: false, err: null }; };
  V.sheet.teamJoin = sh => '<h2>Entrar en un equipo de mi club</h2>'+
    '<p class="muted">Escribe el código de 8 caracteres que te ha dado el director deportivo de ese equipo. Tu solicitud quedará pendiente hasta que el director te apruebe y asigne un cargo.</p>'+
    '<form data-form="teamJoinForm" class="form" novalidate><label class="fld"><span>Código de acceso del equipo</span>'+
    '<input class="inp code-inp" type="text" name="code" maxlength="40" minlength="8" autocomplete="off" spellcheck="false" placeholder="ABCD-EFGH (8 caracteres)" value="'+esc(sh.code||"")+'"></label>'+
    (sh.err?'<p class="err small" role="alert">'+esc(sh.err)+'</p>':"")+
    '<div class="row end gap foot">'+btn("Cancelar","closeSheet",{},"ghost")+'<button class="btn primary" type="submit" '+(sh.busy?"disabled":"")+'>'+(sh.busy?"Comprobando…":"Unirme al equipo")+'</button></div></form>';
  FORM.teamJoinForm = async f => {
    const sh = UI.sheet;if(!sh||sh.type!=="teamJoin"||sh.busy)return;
    const code=String(f.elements.code.value||"").trim().toLowerCase().replace(/[\s-]/g,"");
    sh.code=code;
    if(!/^(?:[abcdefghjklmnpqrstuvwxyz23456789]{8}|[a-f0-9]{32})$/.test(code)){sh.err="Introduce el código de 8 caracteres de tu equipo (también se aceptan códigos antiguos).";return render(true);}
    sh.busy=true;sh.err=null;render(true);
    try {
      const result=await Cloud.rpc("banquillo_join_team",{p_code:code});
      sh.busy=false;
      if(!result?.ok){
        const messages={too_many_attempts:"Has introducido varios códigos de equipo incorrectos. Espera 10 minutos antes de intentarlo de nuevo.",
          email_not_verified:"Confirma tu correo electrónico antes de solicitar un puesto.",
          invalid_or_inactive_code:"Este código no corresponde a un equipo activo. Comprueba los 8 caracteres o pide un nuevo código al director.",
          team_season_missing:"El equipo aún no tiene su temporada configurada. Avisa a Dirección Deportiva.",
          season_owner_cannot_request:"Ya eres responsable de esta temporada. No necesitas solicitar acceso como entrenador."};
        sh.err=messages[result?.error]||"No se ha podido vincular la cuenta con el equipo.";
        return render(true);
      }
      UI.sheet=null;go("inicio");
      if(result.status==="active"&&result.season_id){await Store.afterJoin(result.season_id);toast("Cuenta vinculada al equipo.","ok");}
      else {
        toast("Solicitud recibida por "+(result.team_name||"tu equipo")+". Dirección Deportiva debe aprobarte y asignarte el cargo.","ok");
        if(typeof TeamRequests!=="undefined")TeamRequests.fetch(true);
      }
    } catch(e){sh.busy=false;sh.err="No se ha podido comprobar el código. Revisa la conexión e inténtalo de nuevo.";render(true);}
  };

  /* ---------- Compartir y miembros ---------- */
  const ROLE = { owner: "Responsable", editor: "Entrenador", viewer: "Solo lectura" };
  A.roleLabel = r => ROLE[r] || "";
  ACT.openShare = async () => {
    const sid = Store.sid; if (!sid) return;
    UI.sheet = { type: "share", sid, loading: true, members: [], share: null, wide: true, err: null }; render(true);
    try {
      const members = await Cloud.rpc("season_members_list", { sid });
      const share = Store.role() === "owner" ? await Cloud.rpc("season_share", { sid }) : null;
      if (UI.sheet && UI.sheet.type === "share") Object.assign(UI.sheet, { members: members || [], share, loading: false });
    } catch (e) { if (UI.sheet && UI.sheet.type === "share") Object.assign(UI.sheet, { loading: false, err: "No se ha podido cargar la lista. Inténtalo de nuevo." }); }
    render(true);
  };
  V.sheet.share = sh => {
    const owner = Store.role() === "owner", s = Store.season();
    if (sh.loading) return `<h2>Compartir temporada</h2><div class="loading"><div class="spin"></div></div>`;
    const rows = (sh.members || []).map(m => `<li class="mrow2"><div><b>${esc(m.name || (m.email ? m.email.split("@")[0] : "Entrenador"))}${m.is_me ? " (tú)" : ""}</b><small>${esc(m.email || "")}</small></div>
      <div class="mr-a">${owner && m.role !== "owner" ? `<select class="inp small" data-chg="memberRole" data-u="${esc(m.user_id)}" aria-label="Permiso de ${esc(m.name || "")}"><option value="editor" ${m.role === "editor" ? "selected" : ""}>Entrenador (edita)</option><option value="viewer" ${m.role === "viewer" ? "selected" : ""}>Solo lectura</option></select>${btn("Quitar", "memberRemove", { u: m.user_id }, "ghost small")}` : `<span class="tag ${m.role === "owner" ? "info" : ""}">${ROLE[m.role]}</span>`}</div></li>`).join("");
    const code = sh.share && sh.share.code;
    return `<h2>Compartir «${esc(s ? s.name : "")}»</h2>
      ${owner && sh.share ? `<section class="card flat"><div class="card-h"><h3>Código de la temporada</h3>${sh.share.enabled ? `<span class="tag ok">Activo</span>` : `<span class="tag">Desactivado</span>`}</div>
        <div class="codebox" aria-live="polite">${esc(fmtCode(code))}</div>
        <p class="muted small">El otro entrenador crea su cuenta en esta web, pulsa «Unirme con un código» y escribe esto. Entra como <b>Entrenador</b> (puede editar). Tú puedes dejarle solo en lectura o quitarle cuando quieras.</p>
        <div class="row gap wrap">${UI.copyFlash==="share"?btn("✓ Copiado", "copyCode", {}, "primary small bq-copied-success"):btn("Copiar código", "copyCode", {}, "primary small")}${btn("Código nuevo", "codeNewAsk", {}, "ghost small")}${btn(sh.share.enabled ? "Desactivar código" : "Activar código", "codeToggle", {}, "ghost small")}</div></section>` : ""}
      <section class="card flat"><div class="card-h"><h3>Quién tiene acceso</h3><span class="count">${(sh.members || []).length}</span></div>
        <ul class="mlist">${rows}</ul>${sh.err ? `<p class="err small">${esc(sh.err)}</p>` : ""}</section>
      <div class="row between gap wrap foot">${owner ? btn("Eliminar temporada", "seasonDelAsk", {}, "ghost danger-t") : btn("Salir de esta temporada", "leaveAsk", {}, "ghost danger-t")}${btn("Cerrar", "closeSheet", {}, "primary")}</div>`;
  };
  ACT.copyCode = async () => {
    const c = UI.sheet?.share?.code;if(!c)return;
    try {
      await navigator.clipboard.writeText(fmtCode(c));
      UI.copyFlash="share";render(true);
      toast("✓ Código copiado al portapapeles.","ok");
      setTimeout(()=>{
        if(UI.copyFlash==="share"){UI.copyFlash=null;render(true);}
      },1900);
    }catch(e){
      toast("Tu navegador no ha permitido copiar. Selecciona el código de la pantalla para copiarlo.","err");
    }
  };
  ACT.codeNewAsk = () => { UI.sheet.confirmNew = true; };
  ACT.codeToggle = async () => {
    const sh = UI.sheet; try { await Cloud.rpc("set_code_enabled", { sid: sh.sid, p_enabled: !sh.share.enabled }); sh.share.enabled = !sh.share.enabled; toast(sh.share.enabled ? "Código activado." : "Código desactivado: nadie más podrá unirse.", "ok"); }
    catch (e) { toast("No se ha podido cambiar.", "err"); } render(true);
  };
  const origShare = V.sheet.share;
  V.sheet.share = sh => sh.confirmNew ? `<h2>¿Generar un código nuevo?</h2><p>El código anterior dejará de funcionar. Quienes ya están dentro siguen dentro.</p><div class="row end gap">${btn("Cancelar", "codeNewNo", {}, "ghost")}${btn("Generar código nuevo", "codeNew", {}, "primary")}</div>` : origShare(sh);
  ACT.codeNewNo = () => { UI.sheet.confirmNew = false; };
  ACT.codeNew = async () => {
    const sh = UI.sheet; sh.confirmNew = false;
    try { const c = await Cloud.rpc("regenerate_join_code", { sid: sh.sid }); sh.share.code = c; sh.share.enabled = true; toast("Código nuevo generado.", "ok"); } catch (e) { toast("No se ha podido generar.", "err"); } render(true);
  };
  CHG.memberRole = async el => {
    const sh = UI.sheet;
    try { await Cloud.rpc("set_member_role", { sid: sh.sid, uid: el.dataset.u, p_role: el.value }); const m = sh.members.find(x => x.user_id === el.dataset.u); if (m) m.role = el.value; toast("Permiso cambiado.", "ok"); }
    catch (e) { toast("No se ha podido cambiar el permiso.", "err"); }
  };
  ACT.memberRemove = async el => {
    const sh = UI.sheet;
    try { await Cloud.rpc("remove_member", { sid: sh.sid, uid: el.dataset.u }); sh.members = sh.members.filter(x => x.user_id !== el.dataset.u); toast("Persona quitada de la temporada.", "ok"); }
    catch (e) { toast("No se ha podido quitar.", "err"); } render(true);
  };
  async function refreshAfterSeparation(sid) {
    if(Store.sid===sid){
      Store.subscribeSeason(null);
      try{localStorage.removeItem("bq.season");}catch(e){}
    }
    await Store.loadRoles();
    await Store.loadClubLinks();
    await Store.db.refreshNow("seasons");
    go("temporadas");
  }
  ACT.leaveAsk = el => {
    const sid=el?.dataset?.id||Store.sid;
    const link=Store.clubLinks.find(x=>x.season_id===sid);
    if(link){if(link.manager)return toast("Los directores abandonan el club desde Dirección Deportiva.","err");
      return ACT.leaveTeamAsk({dataset:{id:link.team_id,sid}});
    }
    confirmSheet("¿Abandonar este equipo independiente?","Se retirará tu acceso, pero no se eliminarán sus jugadores ni sus actas. Podrás volver a entrar si recibes otra invitación.","Abandonar equipo","leaveSeason",{id:sid});
  };
  ACT.leaveSeason = async el => {
    const sid=el?.dataset?.id||Store.sid;UI.sheet=null;
    try{
      await Cloud.rpc("leave_season",{sid});
      await refreshAfterSeparation(sid);
      toast("Has abandonado el equipo independiente.","ok");
    }catch(e){toast(/managed_team/.test(String(e?.message||e))?"Un equipo de club se abandona con su opción específica.":"No se ha podido abandonar el equipo.","err");}
  };
  ACT.leaveTeamAsk = el => {
    const tid=el?.dataset?.id,link=Store.clubLinks.find(x=>x.team_id===tid);
    if(!link||link.manager)return toast("No puedes abandonar este equipo desde aquí.","err");
    confirmSheet("¿Abandonar "+(link.team_name||"equipo")+"?",
      "Perderás el acceso a su plantilla, jornadas y avisos. Los datos deportivos se conservarán para el club.",
      "Abandonar equipo","leaveTeamConfirmed",{id:tid,sid:link.season_id});
  };
  ACT.leaveTeamConfirmed = async el => {
    const tid=el.dataset.id,sid=el.dataset.sid;
    UI.sheet=null;
    try{
      const r=await Cloud.rpc("banquillo_leave_team",{p_team_id:tid});
      if(!r?.ok)throw Error("No se ha podido revocar el acceso.");
      await refreshAfterSeparation(sid);
      if(typeof TeamRequests!=="undefined")TeamRequests.fetch(true);
      toast("Has abandonado el equipo. Ya no tienes acceso a sus datos.","ok");
    }catch(e){toast("No se ha podido abandonar el equipo. Comprueba que sigues vinculado y vuelve a intentarlo.","err");}
  };
  ACT.withdrawTeamRequest = async el => {
    const tid=el.dataset.teamId;
    if(!tid)return;
    try{
      await Cloud.rpc("banquillo_leave_team",{p_team_id:tid});
      if(typeof TeamRequests!=="undefined")await TeamRequests.fetch(true);
      toast("Has retirado la solicitud.","ok");
    }catch(e){toast("No se ha podido retirar la solicitud.","err");}
  };
  ACT.leaveClubFromSeasonAsk = el => {
    const cid=el.dataset.id;
    if(!Store.clubLinks.some(x=>x.club_id===cid&&x.manager))
      return toast("No tienes permisos de dirección para este club.","err");
    confirmSheet("¿Abandonar el club?",
      "Si eres titular, la dirección pasará al segundo director. Si eres el único responsable, antes tendrás que invitar a otro o cerrar el club. Tus permisos se revocarán.",
      "Abandonar club","leaveClubFromSeasonConfirmed",{id:cid});
  };
  ACT.leaveClubFromSeasonConfirmed = async el => {
    const cid=el.dataset.id;UI.sheet=null;
    try{
      const ok=await Cloud.rpc("banquillo_leave_club",{p_club_id:cid});
      if(ok!==true)throw Error("leave_failed");
      await Store.loadRoles();await Store.loadClubLinks();await Store.db.refreshNow("seasons");
      go("temporadas");toast("Has abandonado el club. Permisos actualizados.","ok");
    }catch(e){toast(/owner_must_close_or_delete/.test(String(e?.message||e))?
      "No puedes abandonar el club siendo su único director. Puedes cerrarlo o invitar a un segundo responsable.":
      "No se ha podido abandonar el club.","err");}
  };
  ACT.archiveTeamFromSeasonAsk = el => {
    const tid=el.dataset.id,link=Store.clubLinks.find(x=>x.team_id===tid&&x.manager);
    if(!link||link.archived)return toast("No se puede retirar este equipo desde esta cuenta.","err");
    confirmSheet("¿Retirar "+link.team_name+" del club?",
      "Se archivará el equipo y su código dejará de admitir incorporaciones. Los datos, las actas y las estadísticas se conservarán; podrás restaurarlo desde Dirección Deportiva.",
      "Retirar equipo","archiveTeamFromSeasonConfirmed",{id:tid});
  };
  ACT.archiveTeamFromSeasonConfirmed = async el => {
    UI.sheet=null;
    try{
      const r=await Cloud.rpc("banquillo_archive_club_team",{p_team_id:el.dataset.id});
      if(!r?.ok)throw Error("archive_failed");
      await Store.loadClubLinks();
      go("temporadas");toast("Equipo archivado sin perder sus datos.","ok");
    }catch(e){toast("No se ha podido retirar el equipo. Inténtalo desde Dirección Deportiva.","err");}
  };
  ACT.seasonDelAsk = el => {
    const sid=el?.dataset?.id||Store.sid,season=Store.seasons.find(x=>x.id===sid);
    if(!Store.clubLinksReady||Store.clubLinks.some(x=>x.season_id===sid)||Store.roles[sid]!=="owner")
      return toast("Las temporadas de club se gestionan desde Dirección Deportiva.","err");
    if(!season)return toast("No se ha encontrado ese equipo.","err");
    UI.sheet={type:"deleteSoloConfirm",sid,seasonName:season.name,busy:false,err:null};
  };
  V.sheet.deleteSoloConfirm = sh => '<h2>Eliminar equipo independiente</h2>'+
    '<p>Esta operación <b>elimina permanentemente</b> los jugadores, las jornadas, los entrenamientos y los informes de <b>'+esc(sh.seasonName)+'</b>. No puede deshacerse.</p>'+
    '<p class="muted">Si solo quieres dejarlo sin actividad, utiliza «Cerrar temporada» en vez de eliminarlo.</p>'+
    '<form data-form="deleteSoloConfirm" class="form" novalidate>'+
    '<label class="fld"><span>Escribe exactamente el nombre del equipo para confirmar</span>'+
    '<input class="inp" type="text" name="confirm" autocomplete="off" required></label>'+
    (sh.err?'<p class="err small">'+esc(sh.err)+'</p>':"")+
    '<div class="row end gap foot">'+btn("Cancelar","closeSheet",{},"ghost")+
    '<button type="submit" class="btn danger" '+(sh.busy?"disabled":"")+'>Eliminar definitivamente</button></div></form>';
  FORM.deleteSoloConfirm = async form => {
    const sh=UI.sheet;if(sh?.type!=="deleteSoloConfirm"||sh.busy)return;
    if(String(form.elements.confirm.value).trim()!==sh.seasonName){
      sh.err="El nombre no coincide. No se ha eliminado nada.";return render(true);
    }
    sh.busy=true;sh.err=null;render(true);
    try{
      await Cloud.rpc("delete_season",{sid:sh.sid});
      UI.sheet=null;await refreshAfterSeparation(sh.sid);
      toast("Equipo independiente eliminado.","ok");
    }catch(e){sh.busy=false;sh.err="No se ha podido eliminar el equipo. Revisa tus permisos e inténtalo de nuevo.";render(true);}
  };
  ACT.seasonDel = ACT.seasonDelAsk;
  ACT.deleteClubFromSeasonAsk = el => {
    const cid=el.dataset.id,link=Store.clubLinks.find(x=>x.club_id===cid&&x.manager&&Store.roles[x.season_id]==="owner");
    if(!link)return toast("Solo el propietario puede eliminar el club.","err");
    UI.sheet={type:"deleteClubConfirm",clubId:cid,clubName:link.club_name,busy:false,err:null};
  };
  V.sheet.deleteClubConfirm = sh => '<h2>Eliminar club</h2>'+
    '<p>Se retirará <b>'+esc(sh.clubName)+'</b> de Dirección Deportiva, se cerrará su temporada y se desactivarán los códigos. Las actas e información deportiva quedarán conservadas para una posible recuperación.</p>'+
    '<form data-form="deleteClubConfirm" class="form" novalidate>'+
    '<label class="fld"><span>Escribe exactamente el nombre del club</span>'+
    '<input class="inp" type="text" name="confirm" autocomplete="off" required></label>'+
    (sh.err?'<p class="err small">'+esc(sh.err)+'</p>':"")+
    '<div class="row end gap foot">'+btn("Cancelar","closeSheet",{},"ghost")+
    '<button type="submit" class="btn danger" '+(sh.busy?"disabled":"")+'>Eliminar club</button></div></form>';
  FORM.deleteClubConfirm = async form => {
    const sh=UI.sheet;if(sh?.type!=="deleteClubConfirm"||sh.busy)return;
    if(String(form.elements.confirm.value).trim()!==sh.clubName){
      sh.err="El nombre del club no coincide. No se ha modificado nada.";return render(true);
    }
    sh.busy=true;sh.err=null;render(true);
    try{
      const response=await Cloud.rpc("banquillo_delete_club",{p_club_id:sh.clubId,p_confirm_name:sh.clubName});
      if(response!==true)throw Error("failed");
      UI.sheet=null;await Store.loadClubLinks();await Store.loadRoles();
      await Store.db.refreshNow("seasons");go("temporadas");
      toast("Club retirado. Los datos deportivos se conservan.","ok");
    }catch(e){sh.busy=false;sh.err="No se ha podido eliminar el club. Solo puede hacerlo su propietario.";render(true);}
  };
})();
