# Especificación funcional — Planificador de partidos e instalaciones

> Estado: diseño funcional acordado; pendiente de implementación.
> Club de demostración: Atlético Monteverde CF (datos ficticios).
> Fecha: 9 de noviembre de 2026.

## 1. Objetivo

Crear un módulo compartido para que uno o dos directores deportivos organicen los partidos como local de todos los equipos del club, asignando fecha, hora, instalación y campo/recurso. El módulo debe detectar conflictos, ayudar a proponer horarios y generar comunicaciones listas para los entrenadores.

No sustituye al calendario oficial de la competición: la jornada, rival, fecha base y condición local/visitante proceden del calendario del equipo. El planificador gestiona la logística de los partidos en casa.

## 2. Roles y permisos

- Un club puede tener uno o dos directores deportivos.
- Ambos tienen permisos idénticos, sin jerarquía entre ellos.
- Ambos pueden consultar y modificar todas las modalidades, equipos, instalaciones y horarios del club.
- Cada director puede guardar una modalidad inicial preferida (F7 o F11). Es solo un filtro/contexto visual; nunca limita el acceso.
- El cambio F7/F11 está siempre disponible en la barra superior.
- Las modificaciones quedan atribuidas a la cuenta que las realizó.
- Los entrenadores solo reciben/consultan la planificación publicada que corresponda a sus equipos; no editan la disponibilidad general del club salvo permiso específico futuro.

## 3. Instalaciones y capacidad

En el alta/ajustes del club se registran:
- Campos físicos, identificador y nombre.
- Modalidades que admite cada campo.
- Si un campo F11 se puede dividir realmente en dos campos F7.
- Disponibilidad semanal por día y franja horaria.
- Bloqueos por mantenimiento, eventos, entrenamientos o reservas externas.
- Duración y margen de cambio entre partidos, configurables por modalidad/categoría.

Regla de equivalencia de capacidad:
- Un campo F11 equivale a dos unidades de capacidad F7 únicamente para estimaciones y solo si el club confirma que se puede dividir y utilizar simultáneamente.
- Un campo F11 no se puede reservar a la vez para un partido F11 y dos partidos F7.
- Si no es divisible, solo ofrece una reserva simultánea.
- Cada subcampo F7 generado por división tiene su propia disponibilidad; bloquear el campo padre bloquea ambos subcampos.
- No se sumarán capacidades teóricas como si fueran instalaciones independientes cuando no se puedan usar simultáneamente.

Ejemplo: 2 campos F11 divisibles + 1 campo F7 = 5 unidades equivalentes F7 para una estimación de capacidad. La disponibilidad real depende de franjas, divisibilidad y bloqueos.

## 4. Calendario compartido

Vistas:
- Mensual, semanal y diaria.
- Por campo/instalación.
- Por modalidad (F7/F11).
- Por categoría/equipo.
- Lista de partidos pendientes de organizar.

Cada evento muestra equipo, rival, jornada, fecha, local/visitante, modalidad, instalación, campo, hora, estado y observaciones.

Los partidos visitantes aparecen como referencia informativa (✈️) pero no consumen instalaciones del club. Los partidos locales aparecen como pendientes (🏠/hora pendiente) hasta asignar un hueco.

Panel lateral:
- Lista de partidos en casa sin organizar.
- Filtros por semana, modalidad y categoría.
- Contador de pendientes y conflictos.
- Selección/arrastre al calendario en escritorio; flujo accesible de seleccionar fecha/hora/campo en móvil.

## 5. Estados y publicación

Estados del horario:
1. Pendiente: el calendario de competición indica partido en casa, aún sin propuesta.
2. Propuesto: tiene fecha/hora/campo sugeridos o asignados, pero no publicados.
3. Publicado: confirmado por dirección deportiva y visible para entrenadores.
4. Modificado: se cambió un dato tras publicar; exige republicación para generar el nuevo aviso.
5. Cancelado o aplazado: conserva el historial y no ocupa el campo en su franja.

Los dos directores pueden editar borradores. La publicación debe ser explícita y registrar quién la realiza y cuándo. Una modificación posterior no debe alterar silenciosamente un mensaje ya compartido.

## 6. Detección de conflictos

Bloquear o advertir ante:
- Dos reservas que se solapan en el mismo campo/recurso.
- Partido F11 coincidente con reservas F7 que dependen del mismo campo divisible.
- Partido que excede el horario disponible.
- Bloqueo de mantenimiento/evento/entrenamiento.
- Dos equipos del mismo club asignados a la misma hora si comparten recursos incompatibles.
- Duración o margen de cambio insuficiente.
- Partido sin campo o sin hora al intentar publicar.

Los avisos deben explicar el motivo y proponer alternativas. Nunca mover un partido publicado automáticamente sin confirmación de un director.

Para evitar ediciones simultáneas contradictorias, cada evento tendrá versión/updated_at. Si ambos directores editan a la vez, se detecta la versión desactualizada y se pide revisar/recargar antes de sobrescribir.

## 7. Asistente de planificación

La primera versión debe ofrecer propuestas explicables mediante reglas deterministas:
- Partidos locales pendientes del periodo seleccionado.
- Modalidad y recursos compatibles.
- Horarios y campos disponibles.
- Duración y márgenes.
- Preferencias del club por categoría.
- Bloqueos y reservas ya existentes.
- Distribución equilibrada de partidos a lo largo de los días/franjas.

El asistente muestra varias propuestas y sus razones/conflictos; el director elige y puede ajustar. No publica por sí solo.

La IA generativa podrá añadirse cuando exista un servicio de servidor desplegado y seguro. La auditoría del 9-11-2026 observó que la Edge Function IA existente no está desplegada en Supabase; no se debe fingir que existe ni exponer claves privadas en el navegador. Mientras tanto, el asistente de reglas funciona sin llamadas externas.

## 8. Compartir con entrenadores

Al terminar una semana o mes, generar:
- Mensaje de texto para copiar y enviar por WhatsApp/grupo.
- Imagen descargable atractiva con identidad visual del club.
- Selector de periodo: semana actual, semana elegida, mes o rango personalizado.
- Filtro opcional por modalidad o categoría.

Formato:
- 🏠 partido en casa, con campo, hora y rival.
- ✈️ partido fuera, con hora y rival si están disponibles.
- 🕒 horario pendiente de confirmar.
- Incluir fecha, jornada, equipo y modalidad.
- Excluir información no confirmada o marcarla claramente como pendiente.
- Cabecera con nombre/escudo/colores del club; diseño legible en móvil.
- La imagen y el texto deben reflejar exactamente los eventos incluidos y su estado de publicación.

La exportación nunca debe incluir datos personales de menores. Solo datos logísticos de equipos y partidos.

## 9. Modelo de datos objetivo (propuesta)

Entidades conceptuales:
- `clubs`: identidad, territorio, preferencias.
- `club_members`: usuario, club, rol; máximo dos miembros con rol director deportivo.
- `club_facilities`: instalaciones físicas del club.
- `facility_resources`: campo F11 o subcampo F7, modalidad y relación padre/hijo cuando un campo F11 es divisible.
- `facility_availability`: franjas semanales disponibles.
- `facility_blocks`: cierres, mantenimiento y reservas externas.
- `club_schedule_events`: vínculo con equipo/temporada/partido y reserva de recurso.
- `schedule_publications`: versiones publicadas, periodo, autor y fecha.
- `club_audit_log`: autor, fecha, entidad, campo y valores anterior/nuevo.

El calendario de competición sigue siendo la fuente del partido. La reserva de instalación se relaciona con el partido, sin duplicar jornada/rival/resultado.

No crear tablas ni alterar RLS hasta tener copia de seguridad verificable, diseño de migración, permisos por club y pruebas de aislamiento. Las reservas solapadas deben protegerse en el servidor/base de datos, no solo con validación visual.

## 10. Criterios de aceptación

- Un club puede declarar varios campos F11/F7 y su divisibilidad real.
- Un campo F11 divisible permite dos partidos F7 simultáneos, pero no un F11 simultáneo.
- Un campo F11 no divisible no permite dos reservas simultáneas.
- Los dos directores ven el mismo calendario y tienen idénticos permisos.
- Cambiar F7/F11 cambia filtros/vista, no autorizaciones.
- Los partidos visitantes no reservan instalaciones del club.
- Los partidos locales sin horario aparecen en la lista lateral.
- El sistema impide publicar reservas incompatibles y explica cada conflicto.
- Los borradores no se comunican como horarios definitivos.
- Los cambios posteriores a la publicación generan una nueva versión/aviso.
- El mensaje y la imagen semanal/mensual incluyen solo la selección elegida y los datos correctos.
- Se puede trabajar desde móvil sin depender de arrastrar y soltar.
- Todas las pruebas utilizan equipos, clubes y personas ficticias.

## 11. Orden de implementación

1. Acordar el modelo de clubes/equipos y membresías, sin romper temporadas existentes.
2. Añadir instalaciones, recursos F11/F7, divisibilidad y disponibilidad.
3. Crear calendario compartido y panel de pendientes.
4. Implementar validación de conflictos en cliente y servidor.
5. Añadir borradores, publicación, historial y sincronización entre directores.
6. Crear exportación de mensaje y tarjeta/imagen.
7. Añadir asistente de propuestas deterministas.
8. Integrar IA generativa solo después de desplegar y asegurar el servicio backend.
9. Probar móvil/escritorio, concurrencia, permisos y aislamiento entre clubes.

## 12. Límites de alcance

- No se cambia el límite de equipos por club (referencia existente: 12) por el hecho de que el club ficticio de demostración tenga 15 equipos; el límite real requiere decisión independiente.
- No se despliega a `main` ni se modifica GitHub Pages durante el desarrollo.
- No se escribe en Supabase de producción hasta aprobación del diseño de migración y respaldo.
- No se usan datos reales de menores en el club de demostración.
