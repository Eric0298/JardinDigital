# Copia de seguridad y restauración

## Qué guarda la copia

**Ajustes → Guardar copia de seguridad** genera un archivo JSON de versión 2 desde una instantánea consistente de la base de datos local. Incluye ideas, jardines, colocaciones y posiciones, conexiones, pendientes, apariencia y metadata de recursos.

Los documentos y vídeos locales están vinculados a sus archivos originales. Para cada recurso se guardan identidad, asociación con la idea, tipo, nombre, ruta o URL y ubicación. **Los bytes de los archivos externos no se incluyen, no se copian y no se leen durante la exportación.** Conserva esos archivos por separado: disponer sólo del JSON no permite reconstruir un documento o vídeo perdido.

Se usa el selector de guardado del WebView cuando está disponible; en caso contrario se inicia una descarga. El nombre propuesto empieza por `JardinDigital-copia-` y termina en la fecha y `.json`. Comprueba que se haya creado en la ubicación elegida o en Descargas antes de depender de la copia.

## Contrato JSON

El exportador escribe los siguientes campos superiores:

| Campo | Contenido |
|---|---|
| `format` | `"jardindigital"` |
| `version` | `2` |
| `nodes` | `id`, `title`, `content` |
| `canvases` | `id`, `title` |
| `placements` | `id`, `canvas_id`, `node_id`, `x`, `y` |
| `edges` | `id`, `source_node_id`, `target_node_id` |
| `inbox_items` | `node_id` |
| `appearance` | `theme`, `canvas_background` |
| `resources` | `id`, `node_id`, `kind`, `title`, `locator`, `location` |

Las identidades son UUIDs de la aplicación y se mantienen al restaurar. Los tipos de recurso son `document`, `video` y `link`; la ubicación es `local` o `url`. Un enlace usa siempre `url`. Las URLs admitidas son `http`/`https`, con host y sin credenciales. Una referencia local requiere una ruta absoluta; no requiere que el archivo exista durante la restauración.

El archivo contiene datos en texto claro, incluidas las rutas locales y URLs. No contiene imágenes de previsualización, documentos, vídeo, datos de nube ni contenido extraído de archivos. No hay cifrado ni compresión automática.

## Restaurar

1. Guarda una copia actual si necesitas conservar el estado previo.
2. Abre **Ajustes → Restaurar copia** y elige el archivo JSON.
3. Lee la confirmación: restaurar sustituye las ideas, jardines, posiciones, conexiones, pendientes, apariencia y referencias a recursos actuales.
4. Confirma o cancela. Tras confirmar y restaurar, la aplicación recarga los datos y vuelve a Inicio.

Cancelar no cambia datos. Los archivos externos originales tampoco se modifican al confirmar. La restauración no combina dos espacios de trabajo ni añade solamente los registros que falten: sustituye el contenido estructurado completo.

Rust deserializa y valida el marcador, la versión, los campos permitidos, UUIDs, contenido mínimo, coordenadas finitas, apariencia y localizadores. Luego reemplaza los registros en una sola transacción sobre el mismo pool SQLite del plugin SQL. Las claves foráneas, restricciones y `PRAGMA foreign_key_check` validan la integridad antes del commit. Cualquier fallo revierte todo, incluida la metadata de recursos, y conserva los datos previos.

Si la transacción se confirma pero falla la recarga de interfaz, los datos ya están restaurados. El mensaje pide cerrar y abrir la aplicación; no afirma que los datos anteriores se hayan conservado en ese caso.

## Compatibilidad v1 y recursos ausentes

El restaurador acepta versiones 1 y 2. Las copias v1 anteriores no contienen recursos y se interpretan con un conjunto vacío; restaurar una v1 elimina la metadata de recursos que exista actualmente junto con el resto de datos sustituidos. Una copia declarada v1 con recursos no vacíos se rechaza. El exportador actual siempre genera v2; las versiones no compatibles se rechazan.

Una copia v2 puede contener rutas a archivos movidos o ausentes, incluso al restaurar en otro equipo. La metadata se restaura y la idea sigue funcionando. Al abrir su página, el recurso muestra **Archivo no disponible** y se desactiva su apertura si se confirma la ausencia. No se elimina automáticamente la referencia. Si el archivo vuelve a estar accesible en esa ruta, la comprobación posterior puede recuperarlo; también se puede quitar la referencia y añadir el archivo desde su nueva ubicación.

Los enlaces se abren en el navegador externo y requieren la conectividad necesaria para su destino. La comprobación de disponibilidad de enlaces no verifica el servidor remoto ni descarga contenido.

## Límites y comprobación

Las copias son manuales, sin programación, historial, retención ni sincronización automática. Mantén el JSON y los archivos vinculados en ubicaciones seguras de tu elección. Si se pierden la base y la única copia, JardinDigital no puede recuperarlas.

La [matriz manual](./personal-v1-manual-validation.md) incluye exportación/restauración v2, compatibilidad v1, archivos ausentes, cancelación e intentos inválidos. Sus resultados deben registrarse en Tauri/WebView; los tests automáticos no acreditan que se haya completado ese recorrido interactivo.
