// Supabase Edge Function "ai-report" (Deno). La clave de Anthropic vive SOLO aquí, como secreto del servidor.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { handle } from "./handler.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve((req) => handle(req, { admin: admin as any, fetch, env: (k) => Deno.env.get(k) }));
