# Persistencia de JardinDigital personal v1

## Base de datos y migraciones

La aplicación utiliza una sola base, `sqlite:jardindigital.db`, gestionada por `tauri-plugin-sql` en el directorio AppConfig del sistema operativo. Los adaptadores comparten una carga diferida `Database.load()` en `src/infrastructure/sqliteDatabase.ts`. Los comandos Rust toman el pool `DbInstances` del plugin usando esa misma URL; no abren otra base de datos.

Las migraciones v1–v5 permanecen intactas. La migración v6 se añade al final:

| Migración | Tablas y comportamiento |
|---|---|
| v1 | `nodes(id, title, content)`; título y contenido no pueden estar ambos vacíos. |
| v2 | `canvases(id, title)` y `placements(id, canvas_id, node_id, x, y)`; claves foráneas y una colocación por idea y jardín. |
| v3 | `edges(id, source_node_id, target_node_id)`; referencias a ideas, duplicados y conexiones consigo misma permitidos. |
| v4 | `inbox_items(node_id)` y vistas/triggers específicos para capturar una idea y procesar pendientes de forma atómica. |
| v5 | Una fila en `appearance_settings`; tema `system/light/dark` y fondo `plain/dots/grid`, con comprobaciones de valores permitidos. |
| v6 | `resources(id, node_id, kind, title, locator, location)` e índice `resources_node_id`; sólo metadata y referencias. |

Todas las ideas no tiene tabla ni entidad propia: consulta cada `Node` existente. Pendientes almacena pertenencia, sin copiar el contenido de la idea. SQLite activa las claves foráneas mediante SQLx. Las eliminaciones usan sentencias ordenadas y transacciones explícitas, sin `ON DELETE CASCADE` general.

## Contrato de recursos v6

```sql
CREATE TABLE resources (
  id TEXT PRIMARY KEY NOT NULL,
  node_id TEXT NOT NULL REFERENCES nodes(id),
  kind TEXT NOT NULL CHECK (kind IN ('document', 'video', 'link')),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  locator TEXT NOT NULL CHECK (length(trim(locator)) > 0),
  location TEXT NOT NULL CHECK (location IN ('local', 'url')),
  CHECK (kind != 'link' OR location = 'url')
);
CREATE INDEX resources_node_id ON resources(node_id);
```

`ResourceId` identifica cada registro; `node_id` lo asocia a una idea. Una idea puede tener varios recursos. No existe restricción de unicidad sobre la ruta o URL ni una biblioteca global: un mismo archivo puede referenciarse mediante recursos diferentes sin copiar sus bytes.

Domain normaliza el nombre/localizador, valida identidad, tipo y ubicación, exige rutas locales absolutas y restringe las URLs a `http`/`https` con host y sin credenciales. Los adaptadores rehidratan con la identidad original y rechazan registros inválidos. Rust repite la validación del localizador al restaurar y abrir.

Los documentos y vídeos locales son vinculados desde el inicio: `locator` contiene la ruta del archivo original y `location` vale `local`. Los vídeos por enlace y los enlaces normales usan `url`. La tabla no contiene BLOBs, contenido extraído, bytes de vídeo, embeddings, OCR ni metadata de IA.

La existencia del archivo no es una restricción de persistencia. Se consulta al presentar o abrir el recurso; si falta, se conserva su metadata y aparece **Archivo no disponible**. Restaurar una copia no exige que esos archivos existan ni los recrea. Quitar un recurso elimina únicamente su fila.

## Ciclo de vida e integridad

| Acción | Cambios | Se conserva |
|---|---|---|
| Nueva idea en pendientes | Inserta `Node` y pertenencia mediante un trigger atómico. | Jardines, conexiones y recursos existentes. |
| Añadir pendiente a jardín | Añade una colocación si falta y quita pendientes mediante un trigger atómico. | Idea, conexiones y recursos. |
| Añadir desde Todas las ideas | Añade una colocación si falta. | Idea, pendientes, conexiones y recursos. |
| Quitar de pendientes | Elimina sólo `inbox_items`. | Idea, colocaciones, conexiones y recursos. |
| Quitar del jardín | Elimina sólo esa colocación. | Idea, pendientes, conexiones y recursos. |
| Crear en jardín | Inserta idea y colocación en una transacción Rust. | Datos existentes. |
| Guardar página o edición rápida | Actualiza título/contenido del mismo `NodeId`. | Identidades, colocaciones, conexiones, pendientes y recursos. |
| Añadir recurso | Inserta metadata asociada al `NodeId`. | Idea y archivo original; no se copia el archivo. |
| Quitar recurso | Elimina una fila de `resources`. | Idea, demás relaciones y archivo original. |
| Eliminar jardín | Elimina sus colocaciones y el lienzo en una transacción Rust. | Ideas, conexiones, pendientes y recursos. |
| Eliminar idea definitivamente | Elimina pendientes, todas sus colocaciones, conexiones entrantes/salientes, recursos y el `Node`, en una transacción Rust. | Otras ideas, relaciones ajenas y archivos externos originales. |

Eliminar idea definitivamente ordena las sentencias sobre `inbox_items`, `placements`, `edges`, `resources` y `nodes`, y confirma una sola transacción. Si cualquier operación falla, se revierte la secuencia completa, incluida la metadata de recursos. Eliminar jardín sólo opera sobre `placements` y `canvases`; no escribe en `resources`.

## Conexiones, jardines e identidad

`Edge` relaciona `NodeId → NodeId` globalmente. No existe una restricción artificial 1:N: una idea admite varios orígenes y destinos, auto-conexiones y pares duplicados con `EdgeId` distinto. No se añade una tabla muchos-a-muchos redundante.

Una conexión sólo se proyecta en un jardín si sus dos extremos tienen colocación allí. Puede conservarse en SQLite después de quitar una colocación o eliminar un jardín y volver a aparecer en otro jardín con ambos extremos colocados.

`loadCanvasView()` carga las ideas colocadas por lotes, sin una consulta por colocación. Los recursos del lienzo se consultan mediante `listByNodes()` y se reducen a cantidades por tipo en Presentation. La página de idea recupera el mismo `Node` con su contexto. Cargar, abrir, editar y reiniciar conserva las identidades de ideas, jardines, colocaciones, conexiones y recursos.

## Buscar

El adaptador de ideas busca en todos los títulos y contenidos mediante `LIKE` parametrizado. Escapa `%`, `_` y `\` de la entrada como caracteres literales. Se aplica el comportamiento de mayúsculas/minúsculas propio de SQLite. No hay búsqueda semántica, vectorial ni dentro de documentos o vídeos externos. Los resultados abren páginas de idea con la identidad existente.

Buscar actualiza resultados al escribir. Buscar y Todas las ideas usan `queryPage()` con COUNT filtrado y SELECT con LIMIT/OFFSET parametrizados; las páginas contienen 20 ideas. Cambiar el texto vuelve a página 1 y las respuestas antiguas se ignoran. No se añade un índice independiente, FTS ni migración. El resumen visual de jardines también usa una consulta agregada de datos existentes, sin persistir estados de crecimiento.

## Copia y restauración

La exportación actual genera JSON con `format: "jardindigital"` y `version: 2`. Incluye `nodes`, `canvases`, `placements`, `edges`, `inbox_items`, `appearance` y `resources`, leídos desde una transacción coherente. La metadata de recursos contiene identidad, asociación, tipo, nombre, ruta/URL y ubicación; los archivos externos no se incluyen.

Restaurar valida el formato, versión, campos, UUIDs, contenido, coordenadas finitas, apariencia y localizadores. Las restricciones SQLite y `PRAGMA foreign_key_check` verifican las relaciones antes de confirmar la transacción. Un error conserva todos los datos actuales. La interfaz vuelve a Inicio y carga los jardines y la apariencia restaurados.

Se mantienen compatibles las copias v1 sin `resources`; restaurarlas sustituye también los recursos actuales por un conjunto vacío. Una copia que declara v1 y contiene recursos no vacíos se rechaza. Las referencias a archivos ausentes son válidas en v2 y se muestran como no disponibles al abrir la página.

El [documento de copia y restauración](./backup-restore.md) detalla el uso, contrato y límites. El JSON es legible y no está cifrado; la exportación es manual, sin programación ni retención.

## Antecedentes

Las notas anteriores de slices explican el origen de los puertos y migraciones, y mantienen el registro de validaciones históricas. Este documento describe el contrato actual, incluida la página de idea y los recursos vinculados. La [matriz manual actual](./personal-v1-manual-validation.md) debe ejecutarse sin eliminar la base real del usuario para simular una instalación vacía.
