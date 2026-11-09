# Puesta en marcha de Banquillo (10 pasos)

La web NO funciona hasta completar los pasos 2-5: sin base de datos solo se ve la página de inicio.

1. **Subir los archivos a GitHub**: en el repositorio `Banquillo` → Add file → Upload files → arrastra TODO el contenido de la carpeta (no el ZIP) → Commit.
2. **Supabase → SQL Editor** → New query → pega todo `supabase/schema.sql` → Run (debe decir "Success").
3. **Supabase → Authentication → URL Configuration**: Site URL = `https://carlosbieravazquez-prog.github.io/Banquillo/` y añade la misma URL en Redirect URLs. En Providers → Email deja activada la confirmación de correo y pon longitud mínima de contraseña 8.
4. **Supabase → Project Settings → API**: copia *Project URL* y la clave *anon public*. Edita `config.js` en GitHub (lápiz) y pégalas. Nunca pegues la clave service_role.
5. **GitHub → Settings → Pages** → Source: Deploy from a branch → `main` / `/ (root)` → Save. En 1-2 minutos la web estará en la URL del paso 3.
6. **IA (opcional)**: Supabase → Edge Functions → crea `ai-report` y pega `supabase/functions/ai-report/index.ts` y `handler.ts` (o usa la CLI: `supabase functions deploy ai-report`). En Edge Functions → Secrets: `ANTHROPIC_API_KEY` (tu clave de pago de Anthropic) y `ALLOWED_ORIGINS` = `https://carlosbieravazquez-prog.github.io`.
7. **Premium manual**: SQL Editor → `update profiles set plan='premium', plan_renews_at=now()+interval '1 month', tokens=100 where user_id=(select id from auth.users where email='correo@ejemplo.com');`
8. **Legal**: edita `legal/privacidad.html` y `legal/aviso-legal.html` con tus datos ([ ]). Pon tu correo en `CONTACT_EMAIL` de `config.js`.
9. **Google**: entra en search.google.com/search-console, añade la URL y pide indexarla (tarda días).
10. **Prueba**: regístrate, crea la temporada, copia el código desde «Compartir y miembros» y entra con otra cuenta.
