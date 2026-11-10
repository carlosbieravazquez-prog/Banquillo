# Revisión de privacidad y preparación de lanzamiento — Banquillo Beta
Fecha: 10 noviembre 2026
Ámbito: revisión técnica de los documentos existentes; **no constituye asesoramiento legal ni certifica cumplimiento RGPD**.

## Hallazgos comprobados
1. Los textos de `legal/privacidad.html` y `legal/aviso-legal.html` aún incluyen marcadores `[ ]` para identificar al responsable o titular y su contacto. **Bloqueante para el lanzamiento público**. No inventar NIF, dirección o correo del titular.
2. Los archivos antiguos `privacidad.html` y `aviso-legal.html` conservan el nombre anterior y también contienen marcadores. Antes de publicar hay que decidir cuál es la ruta canónica, corregir enlaces y redirigir o retirar versiones obsoletas.
3. La app recomienda registrar nombre de pila e inicial y evitar datos de salud y fotografías: mantener la minimización por defecto, límites de campo y evitar notas libres identificativas.
4. El acceso por código a temporadas y los roles requieren pruebas positivas y negativas por API; un aviso legal no sustituye controles técnicos.
5. Se emplean Supabase y un servicio externo de IA en algunas funciones. Hay que identificar responsables/encargados, finalidades, alojamiento y posibles transferencias internacionales según las condiciones reales de cada proveedor y la configuración final.
6. El uso por clubes con menores exige documentar quién proporciona las instrucciones de tratamiento, legitimación, información a familias, controles de acceso, plazos de conservación y gestión de derechos. No basta con marcar una casilla genérica.
7. Registrar mecanismos de borrado y exportación y sus limitaciones: la supresión en app no significa necesariamente borrado inmediato de todas las copias de respaldo o registros; verificar retenciones efectivas.
8. Definir un canal de contacto real y un procedimiento de incidentes antes de admitir datos reales. No añadir información personal privada a repositorios públicos.

## Pruebas necesarias antes de lanzamiento
- Identificación del titular y correo de contacto funcional.
- Texto revisado con un adulto responsable del proyecto y, cuando proceda, asesoramiento profesional de protección de datos.
- Alta, exportación, baja y eliminación de cuentas ficticias con verificación de las relaciones y dependencias.
- Revisión de captación de consentimientos o de la base jurídica aplicable sin asumir que siempre sea «consentimiento».
- Comprobar acceso a datos de otros equipos, permisos del director deportivo y aislamiento por temporada.
- Revisar textos y política de privacidad de proveedores externos y el acuerdo de encargo de tratamiento que corresponda.

## Decisión
**No declarar listo para producción con datos de menores mientras estos puntos sigan abiertos.**
Cambios de código y pruebas se realizan solo en la rama Beta y proyecto Supabase-Staging.
