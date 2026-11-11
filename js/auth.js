/* ===== Cuentas: entrar, registrarse, recuperar contraseña, unirse con código, compartir y Mi cuenta ===== */
const Auth = { state: "loading", uid: null, ui: { mode: "login", busy: false, msg: null, email: "", name: "" } };
const FORM = {};

(function () {
  const A = Auth;
  const redirectUrl = () => location.origin + location.pathname;
  const MSG = {
    "Invalid login credentials": "El correo o la contraseña no son correctos.",
    "Email not confirmed": "Aún no has confirmado tu correo. Abre el mensaje que te enviamos y pulsa el enlace.",
    "User already registered": "Ya existe una cuenta con ese correo. Prueba a entrar o a recuperar la contraseña.",
    "Password should be at least": "La contraseña debe tener al menos 8 caracteres.",
    "Unable to validate email address": "Ese correo no parece válido.",
    "email rate limit exceeded": "Se han pedido demasiados correos. Espera unos minutos e inténtalo de nuevo.",
    "over_email_send_rate_limit": "Se han pedido demasiados correos. Espera unos minutos e inténtalo de nuevo.",
    "New password should be different": "La contraseña nueva debe ser distinta de la anterior.",
    "weak_password": "La contraseña es demasiado fácil de adivinar. Usa una más larga o más variada.",
  };
  const friendly = e => {
    const m = String((e && (e.message || e.msg)) || e || "");
    const k = Object.keys(MSG).find(x => m.includes(x) || (e && e.code === x));
    if (k) return MSG[k];
    if (/failed to fetch|network|load failed/i.test(m)) return "No hay conexión con el servidor. Comprueba tu internet e inténtalo de nuevo.";
    return "No se ha podido completar la operación. Inténtalo de nuevo.";
  };
  const setMsg = (type, text) => { A.ui.msg = text ? { type, text } : null; };
  const rerender = () => render(true);

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
        <label class="fld"><span>Contraseña nueva</span><input class="inp" type="password" name="password" autocomplete="new-password" minlength="8" required></label>
        ${msgHtml()}<button class="btn primary block" type="submit" ${u.busy ? "disabled" : ""}>${u.busy ? "Guardando…" : "Guardar contraseña"}</button></form>`);
    } else if (u.mode === "check") {
      html = card("Revisa tu correo", `<p>Te hemos enviado un mensaje a <b>${esc(u.email)}</b>. Pulsa el enlace que contiene para confirmar tu cuenta y vuelve aquí.</p>
        <p class="muted small">Si no aparece, mira en la carpeta de spam. El enlace caduca en una hora.</p>
        <button class="btn ghost block" type="button" data-act="authMode" data-v="login">Ya lo he confirmado: entrar</button>`);
    } else if (u.mode === "signup") {
      html = card("Crea tu cuenta", `${tabs()}<form data-form="authSignup" class="form" novalidate>
        <label class="fld"><span>Tu nombre</span><input class="inp" type="text" name="name" autocomplete="given-name" maxlength="60" value="${esc(u.name)}" required></label>
        <label class="fld"><span>Correo electrónico</span><input class="inp" type="email" name="email" autocomplete="email" inputmode="email" value="${esc(u.email)}" required></label>
        <label class="fld"><span>Contraseña (mínimo 8 caracteres)</span><input class="inp" type="password" name="password" autocomplete="new-password" minlength="8" required></label>
        <label class="chk"><input type="checkbox" name="accept" required><span>He leído y acepto la <a href="legal/privacidad.html" target="_blank" rel="noopener">política de privacidad</a> y el <a href="legal/aviso-legal.html" target="_blank" rel="noopener">aviso legal</a>. Me comprometo a usar solo nombres de pila (o inicial del apellido) de los menores y a contar con la autorización de sus familias.</span></label>
        ${msgHtml()}<button class="btn primary block" type="submit" ${u.busy ? "disabled" : ""}>${u.busy ? "Creando…" : "Crear cuenta"}</button></form>`);
    } else if (u.mode === "forgot") {
      html = card("Recuperar contraseña", `<form data-form="authForgot" class="form" novalidate>
        <p class="muted small">Escribe tu correo y te enviaremos un enlace para elegir una contraseña nueva.</p>
        <label class="fld"><span>Correo electrónico</span><input class="inp" type="email" name="email" autocomplete="email" inputmode="email" value="${esc(u.email)}" required></label>
        ${msgHtml()}<button class="btn primary block" type="submit" ${u.busy ? "disabled" : ""}>${u.busy ? "Enviando…" : "Enviar enlace"}</button>
        <button class="btn ghost block" type="button" data-act="authMode" data-v="login">Volver</button></form>`);
    } else {
      html = card("Entrar", `${tabs()}<form data-form="authLogin" class="form" novalidate>
        <label class="fld"><span>Correo electrónico</span><input class="inp" type="email" name="email" autocomplete="email" inputmode="email" value="${esc(u.email)}" required></label>
        <label class="fld"><span>Contraseña</span><input class="inp" type="password" name="password" autocomplete="current-password" required></label>
        ${msgHtml()}<button class="btn primary block" type="submit" ${u.busy ? "disabled" : ""}>${u.busy ? "Entrando…" : "Entrar"}</button>
        <button class="link center-t" type="button" data-act="authMode" data-v="forgot">¿Has olvidado la contraseña?</button></form>`);
    }
    if (slot.dataset.h !== html) { slot.innerHTML = html; slot.dataset.h = html; }
  };
  const card = (t, inner) => `<div class="auth-card"><h2>${t}</h2>${inner}</div>`;
  const tabs = () => `<div class="seg auth-tabs" role="tablist"><button type="button" class="${A.ui.mode === "login" ? "on" : ""}" data-act="authMode" data-v="login">Entrar</button><button type="button" class="${A.ui.mode === "signup" ? "on" : ""}" data-act="authMode" data-v="signup">Crear cuenta</button></div>`;
  const msgHtml = () => A.ui.msg ? `<p class="${A.ui.msg.type === "ok" ? "okm" : "err"} small" role="alert">${esc(A.ui.msg.text)}</p>` : "";
  const val = (f, n) => (f.elements[n] ? String(f.elements[n].value || "").trim() : "");
  const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

  ACT.authMode = el => { A.ui.mode = el.dataset.v; A.ui.msg = null; };
  FORM.authLogin = async f => {
    const email = val(f, "email"), password = f.elements.password.value; A.ui.email = email;
    if (!validEmail(email) || !password) { setMsg("err", "Escribe tu correo y tu contraseña."); return rerender(); }
    A.ui.busy = true; setMsg(); rerender();
    const { error } = await Cloud.sb.auth.signInWithPassword({ email, password });
    A.ui.busy = false;
    if (error) { setMsg("err", friendly(error)); rerender(); }
  };
  FORM.authSignup = async f => {
    const name = val(f, "name"), email = val(f, "email"), password = f.elements.password.value;
    A.ui.name = name; A.ui.email = email;
    if (!name) { setMsg("err", "Escribe tu nombre."); return rerender(); }
    if (!validEmail(email)) { setMsg("err", "Ese correo no parece válido."); return rerender(); }
    if (password.length < 8) { setMsg("err", "La contraseña debe tener al menos 8 caracteres."); return rerender(); }
    if (!f.elements.accept.checked) { setMsg("err", "Para crear la cuenta tienes que aceptar la política de privacidad."); return rerender(); }
    A.ui.busy = true; setMsg(); rerender();
    const { data, error } = await Cloud.sb.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: redirectUrl() } });
    A.ui.busy = false;
    if (error) { setMsg("err", friendly(error)); return rerender(); }
    if (data && data.session) return;                       // entra solo (si el proyecto no exige confirmar el correo)
    A.ui.mode = "check"; rerender();
  };
  FORM.authForgot = async f => {
    const email = val(f, "email"); A.ui.email = email;
    if (!validEmail(email)) { setMsg("err", "Escribe un correo válido."); return rerender(); }
    A.ui.busy = true; setMsg(); rerender();
    const { error } = await Cloud.sb.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
    A.ui.busy = false;
    if (error && /rate limit/i.test(error.message || "")) setMsg("err", friendly(error));
    else setMsg("ok", "Si ese correo tiene cuenta, recibirás un enlace en unos minutos.");
    rerender();
  };
  FORM.authNewPass = async f => {
    const password = f.elements.password.value;
    if (password.length < 8) { setMsg("err", "La contraseña debe tener al menos 8 caracteres."); return rerender(); }
    A.ui.busy = true; setMsg(); rerender();
    const { error } = await Cloud.sb.auth.updateUser({ password });
    A.ui.busy = false;
    if (error) { setMsg("err", friendly(error)); return rerender(); }
    history.replaceState(null, "", location.pathname);
    A.state = "in-pending"; const { data } = await Cloud.sb.auth.getSession(); if (data.session) A.enter(data.session); else { A.state = "out"; rerender(); }
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
      // no se hace nada pesado dentro del propio aviso (evita bloqueos de la librería)
      setTimeout(() => {
        if (event === "PASSWORD_RECOVERY") { A.state = "recovery"; render(true); return; }
        if (event === "SIGNED_OUT") { A.leave(); return; }
        if (session && session.user && A.state !== "recovery") { if (A.uid !== session.user.id) A.enter(session); }
        else if (!session && event === "INITIAL_SESSION") { A.state = "out"; render(true); }
      }, 0);
    });
  };
  A.enter = async session => {
    A.uid = session.user.id; A.state = "in";
    document.body.classList.add("in-app");
    Store.connecting = true; render(true);
    Store.reset(); Store.user = { uid: session.user.id, email: session.user.email };
    await Store.init(Cloud.db, { uid: session.user.id, email: session.user.email });
    Store.connecting = false;
    await Cloud.loadProfile();
    render(true);
  };
  A.leave = () => {
    if(typeof CoachInbox!=="undefined")CoachInbox.reset();
    if(typeof TeamRequests!=="undefined")TeamRequests.reset();
    A.uid = null; A.state = "out"; Cloud.profile = null; Store.reset(); Store.connecting = false;
    UI.sheet = null; UI.wiz = null; UI.ai = {};
    A.ui = { mode: "login", busy: false, msg: null, email: "", name: "" };
    const slot = $("#authSlot"); if (slot) slot.dataset.h = "";
    render(true);
  };
  ACT.signOut = async () => { UI.sheet = null; await Cloud.sb.auth.signOut(); A.leave(); };

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
  V.sheet.teamJoin = sh => '<h2>Unirme a mi equipo</h2>'+
    '<p class="muted">Introduce el código específico de tu equipo. Se enviará una solicitud con tu cuenta registrada. Dirección Deportiva deberá aprobarla y asignarte un cargo antes de poder trabajar con la plantilla y las actas.</p>'+
    '<form data-form="teamJoinForm" class="form" novalidate><label class="fld"><span>Código del equipo</span>'+
    '<input class="inp code-inp" type="text" name="code" maxlength="32" minlength="32" autocomplete="off" spellcheck="false" placeholder="32 caracteres" value="'+esc(sh.code||"")+'"></label>'+
    (sh.err?'<p class="err small" role="alert">'+esc(sh.err)+'</p>':"")+
    '<div class="row end gap foot">'+btn("Cancelar","closeSheet",{},"ghost")+'<button class="btn primary" type="submit" '+(sh.busy?"disabled":"")+'>'+(sh.busy?"Comprobando…":"Unirme al equipo")+'</button></div></form>';
  FORM.teamJoinForm = async f => {
    const sh = UI.sheet;if(!sh||sh.type!=="teamJoin"||sh.busy)return;
    const code=String(f.elements.code.value||"").trim().toLowerCase().replace(/[\s-]/g,"");
    sh.code=code;
    if(!/^[a-f0-9]{32}$/.test(code)){sh.err="Este código debe tener 32 caracteres válidos.";return render(true);}
    sh.busy=true;sh.err=null;render(true);
    try {
      const result=await Cloud.rpc("banquillo_join_team",{p_code:code});
      sh.busy=false;
      if(!result?.ok){
        const messages={too_many_attempts:"Demasiados intentos. Inténtalo más tarde.",
          email_not_verified:"Confirma tu correo electrónico antes de solicitar un puesto.",
          invalid_or_inactive_code:"Código incorrecto, revocado o perteneciente a un equipo no activo.",
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
        <div class="row gap wrap">${btn("Copiar código", "copyCode", {}, "primary small")}${btn("Código nuevo", "codeNewAsk", {}, "ghost small")}${btn(sh.share.enabled ? "Desactivar código" : "Activar código", "codeToggle", {}, "ghost small")}</div></section>` : ""}
      <section class="card flat"><div class="card-h"><h3>Quién tiene acceso</h3><span class="count">${(sh.members || []).length}</span></div>
        <ul class="mlist">${rows}</ul>${sh.err ? `<p class="err small">${esc(sh.err)}</p>` : ""}</section>
      <div class="row between gap wrap foot">${owner ? btn("Eliminar temporada", "seasonDelAsk", {}, "ghost danger-t") : btn("Salir de esta temporada", "leaveAsk", {}, "ghost danger-t")}${btn("Cerrar", "closeSheet", {}, "primary")}</div>`;
  };
  ACT.copyCode = async () => {
    const c = UI.sheet && UI.sheet.share && UI.sheet.share.code; if (!c) return;
    try { await navigator.clipboard.writeText(fmtCode(c)); toast("Código copiado.", "ok"); } catch (e) { toast("Selecciona el código y cópialo.", ""); }
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
  ACT.leaveAsk = () => confirmSheet("¿Salir de esta temporada?", "Dejarás de ver sus datos. Para volver a entrar necesitarás el código otra vez.", "Salir", "leaveSeason", {}, true);
  ACT.leaveSeason = async () => {
    const sid = Store.sid; UI.sheet = null;
    try { await Cloud.rpc("leave_season", { sid }); } catch (e) { toast("No se ha podido salir de la temporada.", "err"); return; }
    delete Store.roles[sid]; Store.subscribeSeason(null); try { localStorage.removeItem("bq.season"); } catch (e) { /* noop */ }
    await Store.db.refreshNow("seasons"); go("inicio"); toast("Has salido de la temporada.", "ok");
  };
  ACT.seasonDelAsk = () => confirmSheet("¿Eliminar la temporada entera?", "Se borrarán para todos sus jugadores, partidos, entrenos e informes. No se puede deshacer. Antes puedes descargar el Excel desde Temporadas.", "Eliminar temporada", "seasonDel", {}, true);
  ACT.seasonDel = async () => {
    const sid = Store.sid; UI.sheet = null;
    try { await Cloud.rpc("delete_season", { sid }); } catch (e) { toast("No se ha podido eliminar la temporada.", "err"); return; }
    delete Store.roles[sid]; Store.subscribeSeason(null); try { localStorage.removeItem("bq.season"); } catch (e) { /* noop */ }
    await Store.db.refreshNow("seasons"); go("inicio"); toast("Temporada eliminada.", "ok");
  };
})();
