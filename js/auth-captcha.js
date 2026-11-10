/* CAPTCHA opcional: requiere TURNSTILE_SITE_KEY pública y protección activa en Supabase Auth.
   Si no está configurado, no modifica los formularios ni el acceso existente. */
const TurnstileGuard = (() => {
  let widgetId = null, element = null, loading = false;
  const key = () => String((window.BQ_CONFIG || {}).TURNSTILE_SITE_KEY || "").trim();
  const enabled = () => !!key();
  const placeholder = () => enabled()
    ? '<div class="auth-captcha" data-bq-turnstile aria-label="Verificación antirrobots"><p class="muted small">Cargando verificación de seguridad…</p></div>'
    : '';
  const mount = () => {
    if (!enabled()) return;
    const target = document.querySelector('#authSlot [data-bq-turnstile]');
    if (!target) return;
    if (target === element && widgetId !== null) return;
    if (widgetId !== null && window.turnstile) {
      try { window.turnstile.remove(widgetId); } catch (_) { /* widget anterior desmontado */ }
    }
    widgetId = null; element = null;
    if (!window.turnstile || typeof window.turnstile.render !== 'function') {
      if (!loading && !document.getElementById('bq-turnstile-script')) {
        loading = true;
        const script = document.createElement('script');
        script.id = 'bq-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true; script.defer = true;
        script.onload = () => { loading = false; mount(); };
        script.onerror = () => { loading = false; const p = document.querySelector('#authSlot [data-bq-turnstile]'); if (p) p.textContent = 'No se pudo cargar la verificación. Comprueba tu conexión.'; };
        document.head.appendChild(script);
      }
      return;
    }
    try {
      target.textContent = '';
      widgetId = window.turnstile.render(target, { sitekey: key(), theme: 'auto' });
      element = target;
    } catch (_) { target.textContent = 'No se pudo iniciar la verificación. Actualiza la página.'; }
  };
  const token = () => {
    if (!enabled()) return null;
    if (!window.turnstile || widgetId === null || !element || !element.isConnected) return '';
    try { return window.turnstile.getResponse(widgetId) || ''; } catch (_) { return ''; }
  };
  return { enabled, placeholder, mount, token };
})();
