# Correo de registro y recuperación

El correo transaccional de Supabase confirma el registro y envía enlaces de recuperación. Banquillo conserva la confirmación de correo. Las plantillas en español usan el enlace de un solo uso generado por Supabase.

| Auth → Email Templates | Asunto | Plantilla |
| --- | --- | --- |
| Confirm signup | Confirma tu correo en Banquillo | `supabase/templates/confirmation.html` |
| Reset password | Restablece tu contraseña de Banquillo | `supabase/templates/recovery.html` |

## Activación en Banquillo-Staging

1. Dar de alta un servicio de correo transaccional como Brevo o Resend y verificar el remitente. Para el envío público, configurar el dominio del remitente con los registros que indique el proveedor.
2. En Auth → SMTP Settings de Banquillo-Staging, configurar el servidor, puerto TLS, remitente y credenciales de envío mediante los campos privados del panel. Mantener las credenciales fuera de Git y del navegador.
3. Configurar las plantillas y comprobar que Site URL y los destinos permitidos apuntan a la vista de Staging. Desactivar el seguimiento de clics para correos de autenticación.
4. Probar que llega el registro y que el enlace confirma la cuenta de prueba. Probar la recuperación y comprobar que el enlace abre el formulario correcto. Registrar el resultado antes de aprobar la publicación.

Pendiente: acceso al proveedor, remitente verificado y validación de entrega. Las plantillas están preparadas para instalarse cuando esté disponible la configuración de correo.

[SMTP de Supabase](https://supabase.com/docs/guides/auth/auth-smtp) · [Plantillas de Auth](https://supabase.com/docs/guides/auth/auth-email-templates)
