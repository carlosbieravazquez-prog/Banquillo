# Banquillo · Protocolo de pruebas RLS y recuperación
**Solo entorno de pruebas (staging). No ejecutar DML de esta guía en la base oficial.**

## 1. Antes de probar
- Crear un proyecto Supabase separado y configurarlo como staging; no copiar correos ni datos personales de menores.
- Aplicar el esquema que corresponda a la rama de pruebas, verificando las políticas RLS y los RPC.
- Preparar dos cuentas de prueba controladas y verificar su correo sin compartir contraseñas.
- Crear dos temporadas ficticias: A y B; añadir un jugador inventado en cada una.
- Crear membresías de prueba: propietario A, editor A, solo-lectura A; propietario B. Un usuario sin membresía en B será el sujeto negativo.
- Capturar el estado inicial de las tablas con recuentos y verificar una restauración en un proyecto de pruebas. **Un archivo SQL sin prueba de restauración no se considera una copia verificada.**
- No publicar la URL de staging con claves privadas ni reutilizar la clave `service_role` en frontend, documentos o commits.

## 2. Matriz de acceso esperada
| Sesión | Temporada A | Temporada B | Datos de jugador |
|---|---|---|---|
| Sin sesión | Sin acceso | Sin acceso | No visibles |
| Propietario A | Leer, editar y administrar | Sin acceso (si no es miembro B) | Solo A |
| Editor A | Leer y editar | Sin acceso (si no es miembro B) | Solo A |
| Viewer A | Leer, sin escribir | Sin acceso | Solo A |
| Propietario B | Sin acceso (si no es miembro A) | Leer, editar y administrar | Solo B |

## 3. Pruebas de escritura, exclusivamente en staging
Para cada operación usar un objeto ficticio previamente identificado, sin datos personales:
1. Como viewer A, confirmar que `SELECT` de documento A funciona. Intentar `INSERT` nuevo, `UPDATE` y `DELETE` de A: todos deben denegarse o afectar 0 filas. **Verificar luego desde propietario que no hubo cambios.**
2. Como editor A, confirmar `INSERT`, `UPDATE` y `DELETE` sobre documentos secundarios de A. No probar `DELETE` sobre raíz de temporada. Intentar `set_member_role`, `remove_member`, `season_share`, `delete_season` para A: deben denegarse (sin alterar miembros ni temporada).
3. Como editor A, intentar `SELECT`, `INSERT`, `UPDATE` y `DELETE` en B: denegar o 0 filas. Confirmar desde propietario B que nada cambió.
4. Como propietario A, verificar que puede administrar A pero no B; comprobar también que no puede autoasignar la propiedad por `set_member_role`.
5. Como cuenta sin membresías, comprobar que no ve ninguna temporada ni perfil ajeno.
6. Como usuario expulsado de A, comprobar después de renovar token que deja de poder leer y escribir A; verificar acceso con JWT vigente según el modelo de RLS, sin depender de ocultar botones.
7. Verificar que las exportaciones Excel y PDF solo incluyen la temporada autorizada y que al cerrar sesión dejan de poder generarse con datos ajenos.
8. Tras los tests, eliminar exclusivamente los registros y las cuentas ficticias del proyecto staging.

## 4. Controles específicos para menores
- No subir imágenes, apellidos completos, fecha de nacimiento ni diagnósticos a entornos públicos de pruebas.
- Revisar si notas libres contienen datos de salud o familiares. No enviarlas a proveedores de IA.
- Mantener la exportación manual dentro de los permisos y advertir de que quien descarga un fichero asume su custodia.
- Documentar responsables del tratamiento, finalidades, plazo de conservación y ejercicio de derechos; antes de usar datos reales obtener revisión legal adecuada.

## 5. Evidencias que hay que conservar
Registrar fecha, versión, entorno, rol, operación, resultado esperado, resultado obtenido, ID de incidencia (sin IDs de personas), y decisión final. No adjuntar tokens, cabeceras Authorization, claves ni JSON de plantillas.

## 6. Antes de publicar
- [ ] Restauración de copia de seguridad comprobada.
- [ ] Pruebas negativas de escritura superadas por rol y temporada.
- [ ] Cambios de permisos en funciones internas probados en staging.
- [ ] Nueva auditoría con Supabase Security Advisors sin hallazgos críticos sin resolver.
- [ ] Pruebas de cierre/cambio de sesión, reconciliación offline y exportaciones.
- [ ] Revisar RGPD, privacidad de menores y proveedores externos.
- [ ] Aprobación expresa para cualquier cambio de base oficial o merge a main.
