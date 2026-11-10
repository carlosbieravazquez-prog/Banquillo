# Archivo histórico: versiones antiguas de la raíz

La carpeta `legacy-root/` conserva **copias históricas** de scripts y estilos que estuvieron anteriormente en la raíz del repositorio. Se guardan para facilitar la comparación y recuperación de cambios, **no para su uso actual**.

La web activa debe utilizar **únicamente**:

- `../js/` para JavaScript.
- `../css/app.css` para CSS.
- `../legal/` para páginas legales.
- `../supabase/schema.sql` y `../supabase/functions/` para base de datos y funciones remotas.

No uses los archivos de `archive/legacy-root/` para corregir errores actuales: sus nombres son iguales o similares a los de `js/`, pero su contenido puede ser antiguo.

Un archivo SQL de importación que incluía información identificable de jugadores se retiró de la **rama Beta** en lugar de archivarse. Puede seguir existiendo en otras ramas o en el historial anterior: su eliminación completa requiere una revisión separada de esas referencias y del historial de GitHub, con autorización antes de modificar la versión oficial.
