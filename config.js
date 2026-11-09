/* ===== Configuración de Banquillo =====
   Estos dos valores los copias de Supabase: Project Settings → API.
   La clave "anon" es PÚBLICA por diseño (la seguridad la dan las reglas de la base de datos), así que puede estar aquí.
   NUNCA pegues aquí la clave "service_role" ni la clave de Anthropic. */
window.BQ_CONFIG = {
  SUPABASE_URL: "https://dsewztxveqgwhyuyyyoq.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_gkgXrDToGr-_dtZ27H1LdQ_e9LFv-wL",              // empieza por eyJ...
  CONTACT_EMAIL: "",                                         // correo de contacto (aparece en Mi cuenta y en los textos legales)
  PREMIUM_URL: ""                                            // (opcional) enlace de pago del plan premium; vacío = "próximamente"
};
