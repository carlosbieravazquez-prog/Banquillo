/* Solo pruebas: este archivo conecta staging.html a un proyecto Supabase SIN DATOS REALES.
   TURNSTILE_SITE_KEY vacía hasta que el widget y la validación estén probados.
   NUNCA colocar claves secretas o service_role en el navegador. */
window.BQ_CONFIG = Object.freeze({
  SUPABASE_URL: "https://opfujvhgqrweyaaqquif.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_p0kIHcqH_LdvW2JwBRhtew_wadytaAw",
  TURNSTILE_SITE_KEY: "",
  CONTACT_EMAIL: "",
  PREMIUM_URL: "",
  STAGING: true
});
