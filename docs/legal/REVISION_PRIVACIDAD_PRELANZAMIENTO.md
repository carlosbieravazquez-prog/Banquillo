# Revisión de privacidad y preparación de lanzamiento — Banquillo Beta
Fecha: 10 noviembre 2026
Ámbito: revisión técnica de los documentos existentes; **no constituye asesoramiento legal ni certifica cumplimiento RGPD**.

## Hallazgos comprobados
1. **Actualizado:** `legal/privacidad.html` y `legal/aviso-legal.html` ya tienen estructura accesible, diseño responsive y textos más completos. No se han inventado identificaciones personales: la identidad jurídica del titular y el correo oficial permanecen **pendientes de validar antes del lanzamiento público**. El bloqueo legal continúa abierto.
2. **Actualizado:** `privacidad.html` y `aviso-legal.html` se han convertido en redirecciones a las rutas canónicas `legal/privacidad.html` y `legal/aviso-legal.html`, manteniendo los enlaces existentes.
3. La app recomienda registrar nombre de pila e inicial y evitar datos de salud y fotografías: mantener la minimización por defecto, límites de campo y evitar notas libres identificativas.
4. El acceso por código a temporadas y los roles requieren pruebas positivas y negativas por API; un aviso legal no sustituye controles técnicos.
5. Se emplean Supabase y un servicio externo de IA en algunas funciones. Hay que identificar responsables/encargados, finalidades, alojamiento y posibles transferencias internacionales según las condiciones reales de cada proveedor y la configuración final.
6. El uso por clubes con menores exige documentar quién proporciona las instrucciones de tratamiento, legitimación, información a familias, controles de acceso, plazos de conservación y gestión de derechos. No basta con marcar una casilla genérica. En España, cuando el consentimiento sea la base jurídica, el consentimiento de menores de 14 años debe provenir de quienes ostenten la patria potestad o tutela.
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


## Avances de presentación y estructura — 10 noviembre 2026

- Páginas legales independientes con hoja `legal/legal.css`, navegación entre avisos, índice accesible, jerarquía de encabezados, texto legible y adaptación móvil.
- Portadas de privacidad y aviso legal explican visiblemente que siguen en revisión y que los datos personales de menores **no deben utilizarse durante las pruebas**.
- Información reorganizada por finalidades, categorías de datos, acceso por roles, proveedores, plazos, derechos, seguridad y condiciones de uso.
- El servicio no declara falsamente que los borrados sean instantáneos en backups, que existan garantías absolutas ni que no haya transferencias internacionales sin verificarlas.
- La identidad formal del responsable, domicilio profesional exigible, correo y procedimiento de reclamaciones permanecen pendientes de completar; el sitio y las operaciones no pueden considerarse legalmente finalizados.

Fuentes oficiales de orientación:
- https://www.aepd.es/derechos-y-deberes/conoce-tus-derechos/derecho-de-informacion
- https://www.aepd.es/preguntas-frecuentes/10-menores-y-educacion/FAQ-1001-cual-es-la-edad-para-que-los-menores-puedan-prestar-consentimiento-para-tratar-sus-datos-personales
- https://lssi.digital.gob.es/lssi/la-ley/aspectos-basicos/obligaciones-y-responsabilidades-de-los-prestadores
