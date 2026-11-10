# Banquillo Beta — Clubes, códigos y dirección deportiva (pruebas manuales)

**Entorno:** exclusivamente \`staging.html\` conectado a Supabase-Staging \`opfujvhgqrweyaaqquif\`. La web oficial y Supabase oficial NO se han actualizado.

## Qué hace la Beta

- Inicio público con **Iniciar sesión**, **Registrarme** y **Unirme a mi club**.
- Código de **ocho caracteres por equipo**. Se genera al crear el equipo y es distinto para cada temporada/equipo.
- El director deportivo crea solo el equipo (nombre, modalidad y datos deportivos opcionales), no rellena los jugadores.
- El entrenador que confirma una cuenta y usa el código obtiene acceso **editor exclusivamente a esa temporada**; también puede introducirlo después desde **Temporadas → Unirme con un código**.
- Si se introduce código durante el alta, se almacena temporalmente en **este navegador durante como máximo 1 hora** para intentar la unión tras confirmar correo. Si se confirma en otro navegador/dispositivo, habrá que introducirlo después manualmente. Nunca va en metadata JWT o en el enlace del correo.
- Un segundo director, si ya tiene cuenta confirmada, puede añadirse **por correo y solo desde la cuenta responsable del club**, máximo dos. Ambos son responsables de los equipos del club; el entrenador solo consigue permiso editor de su propio equipo.
- El panel **Clubes** usa escudo, equipaciones (1.ª, 2.ª, 3.ª opcional), dos modos de identidad visual y campos F7/F11. Los **nuevos** equipos heredan estos ajustes. Actualizar el club NO reescribe a ciegas los ajustes de temporadas antiguas.
- La antigua página \`demo-club.html\` sigue siendo una demo local con datos ficticios, **sin conexión al backend**.

## Preparación (sin perder cambios)

1. Si tienes datos sin guardar en el asistente, guárdalos o cópialos antes de actualizar.
2. En otra ventana de PowerShell:
   \`\`\`powershell
   cd C:\Users\carlo\Banquillo-pruebas
   git status --short
   \`\`\`
3. Si no aparece nada modificado:
   \`\`\`powershell
   git pull --ff-only origin feature/actas-sanciones-f11-ocr
   \`\`\`
4. Sirve la carpeta correcta:
   \`\`\`powershell
   npx.cmd --yes http-server "C:\Users\carlo\Banquillo-pruebas" -p 5500 -a 127.0.0.1 -c-1
   \`\`\`
   Abre \`http://127.0.0.1:5500/staging.html\` (Ctrl+F5). No abras \`index.html\` para probar datos.

## Simulación 1 — Crear un club

Abre **Clubes → Crear un club**, e introduce:

| Campo | Dato de prueba |
| --- | --- |
| Nombre | Atlético Monteverde CF |
| Municipio | Dos Hermanas |
| Provincia | Sevilla |
| Temporada | 2026/27 |

Comprobar que aparece el panel del club sin cambiar la temporada de un solo equipo ya existente.

## Simulación 2 — Dos equipos y sus códigos diferentes

En **Clubes → Equipos → Añadir equipo**, crea:

| Campo | Equipo A | Equipo B |
| --- | --- | --- |
| Nombre | Benjamín · Liga Educa | Juvenil A |
| Modalidad | F7 | F11 |
| Categoría (opcional) | Benjamín | Juvenil |
| Competición (opcional) | Liga Educa | Liga Nacional |

**Resultado esperado:** los dos equipos aparecen y cada uno muestra su **propio código**. Deben ser diferentes. Copiar código, desactivarlo y regenerarlo afecta **solo al equipo elegido**, no al otro. Nunca pegues códigos reales en mensajes públicos ni en capturas.

## Simulación 3 — Entrenador con código

Utiliza **otra cuenta de pruebas confirmada** y un correo al que tengas acceso; no compartas contraseñas ni enlaces de verificación.

1. Desde la portada, pulsa **Unirme a mi club**.
2. Escribe un nombre ficticio, un correo de pruebas y el código de **Benjamín · Liga Educa**.
3. Confirma el correo y entra desde este navegador. Debe aparecer ese equipo automáticamente; si se confirma desde otro dispositivo, entra y usa **Temporadas → Unirme con un código**.
4. Comprueba que el entrenador **no puede ver el Juvenil A**, salvo que también se le entregue su código.
5. Prueba el acceso a **Plantilla → Añadir jugador**, usando los datos ficticios «Oliver Atom – 10» y «Benji Price – 1».

## Simulación 4 — Segundo director

El director principal entra en **Clubes → Dirección deportiva → Añadir segundo director** y escribe el correo de otra cuenta **ya registrada y confirmada**.

El nuevo director debe ver ambos equipos y poder configurar campos, códigos y sus temporadas. Los dos pueden entrar a cualquiera de los equipos. Solo la cuenta principal puede retirar al segundo director.

## Simulación 5 — Configuración y colores

En **Clubes → Configuración → Equipaciones**:

- Primera: camiseta \`#00FF00\`, pantalón \`#132D22\`, medias \`#FFFFFF\`.
- Segunda: camiseta \`#FFFFFF\`, pantalón \`#132D22\`, medias \`#132D22\`.
- Tercera: opcional.
- En **Identidad visual**, probar **Automática** y **Profesional → Bosque**.

La ilustración debe cambiar al elegir colores de camiseta, pantalón y medias. La web debe utilizar **tonos sobrios**, nunca el verde fluorescente como fondo principal. Guardar y recargar. Los cambios del club deben persistir en Staging.

En **Instalaciones**, simular 2 campos F11 (divisibles) y 1 campo F7 independiente. Capacidad teórica: 5 campos F7, pero solo si el uso simultáneo de los dos medios campos está permitido.

## Correo de confirmación

Se ha creado el archivo \`supabase/email/confirmacion-banquillo.html\`, pero **no se ha aplicado aún al proveedor de envío**. En proyecto Supabase alojado, se configura desde **Authentication → Email Templates → Confirm sign up**, sujeto a las restricciones del plan/proveedor SMTP.

Asunto sugerido: **Banquillo · Confirma tu correo electrónico**.

La plantilla usa la variable oficial \`{{ .ConfirmationURL }}\`, con botón y enlace alternativo. No inventar dominios remitentes ni eliminar el aviso de seguridad. En proyectos Free nuevos desde junio 2026, Supabase exige SMTP propio para personalizar correos si se usa su proveedor predeterminado. No habilitar correo de marca en producción sin dominio remitente verificado.

## Seguridad y límites

- Tablas nuevas \`bq_clubs\`, \`bq_club_directors\`, \`bq_club_teams\`: RLS habilitada y sin privilegios SELECT directos para \`anon\` o \`authenticated\`.
- Los RPCs hacen comprobaciones de usuario autenticado y de rol de director. La contraseña, códigos y enlaces no se escriben en el repositorio ni en logs públicos.
- El código de entrenador usa el RPC \`join_season\` existente, con límite de intentos. No concede privilegios de club.
- **No probado aún**: todo el flujo en navegador real con dos usuarios, confirmación desde distintos dispositivos, reglas RLS bajo diferentes identidades reales, copias de seguridad y entrega de correo.
- No trasladar a producción ni introducir jugadores reales de menores hasta terminar la validación y contar con permiso explícito.
