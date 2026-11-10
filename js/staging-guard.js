/* Protección adicional: staging.html nunca se conecta al proyecto oficial.
   Este archivo solo se carga desde staging.html. */
(function ensureStagingOnly() {
  const cfg = window.BQ_CONFIG || {};
  const expected = "https://opfujvhgqrweyaaqquif.supabase.co";
  if (cfg.STAGING !== true || cfg.SUPABASE_URL !== expected || !String(cfg.SUPABASE_ANON_KEY || "").startsWith("sb_publishable_")) {
    window.BQ_CONFIG = {};
    document.documentElement.setAttribute("data-staging-config-error", "true");
    console.error("Configuración de pruebas incorrecta: conexión bloqueada.");
  }
})();
