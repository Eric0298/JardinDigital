# Arquitectura de JardinDigital

## Principios y experiencia

JardinDigital prioriza el trabajo local, el uso sin conexión, la privacidad, una aplicación ligera, el código abierto y la ausencia de infraestructura obligatoria con coste.

La entrada del producto es **Inicio → Mis jardines**. Cada jardín abre su lienzo de ideas conectadas. Un clic selecciona una idea; un doble clic abre su página completa; la edición rápida sigue disponible mediante una acción explícita. Pendientes y Todas las ideas conservan sus funciones como superficies secundarias. Buscar recupera ideas por título o contenido y abre la misma página de idea.

La página de idea muestra información editable, recursos, conexiones y jardines. Abrirla y guardar cambios conserva el `NodeId`. Los recursos y las conexiones se asocian a esa identidad compartida, sin crear copias por jardín o por pantalla.

## Límites de responsabilidad

Los límites siguientes describen responsabilidades y dirección de dependencias. Se crea un directorio físico cuando contiene código que resuelve una necesidad actual.

- **Domain** representa los conceptos y sus reglas. No depende de React, React Flow, SQLite, Tauri, APIs del sistema operativo ni de la interfaz.
- **Application** coordina las acciones del usuario y depende de Domain. Define puertos pequeños para persistencia y capacidades nativas; no contiene React Flow ni SQL.
- **Infrastructure** implementa los adaptadores SQLite y los puentes a comandos Tauri.
- **Presentation** contiene vistas React, componentes, estilos, interacciones y el adaptador a React Flow. No define el modelo persistente ni ejecuta SQL.

```text
Presentation → Application → Domain
Infrastructure → puertos de Application y modelos de Domain
```

No se permiten dependencias circulares. Los nombres técnicos `Node`, `Canvas`, `Placement`, `Edge` y `Resource` siguen siendo internos; la interfaz habla de ideas, jardines, conexiones y recursos.

## Composición y puertos

El modelo real está en `src/domain`. Los puertos y casos de uso específicos están en `src/application`; sus adaptadores viven en `src/infrastructure` y comparten una carga diferida de la base de datos. `src/main.tsx` inyecta las implementaciones concretas. `src/App.tsx` coordina el arranque, Inicio, la navegación, la apariencia y el origen de la página de idea.

La navegación utiliza estado React local. No se introduce un router, Redux, Zustand, contenedor de inyección ni un framework de repositorios. El alias `@` sigue diferido porque los imports actuales no lo requieren.

`src/presentation/garden` contiene el espacio de jardín; `src/presentation/canvas` encapsula React Flow. `src/presentation/home` muestra los jardines y su gestión. `src/presentation/idea` contiene la página de idea. Buscar y Todas las ideas reutilizan `src/presentation/library`: `loadLibraryPage()` consulta una página y combina sus ideas con el contexto de pendientes y jardines mediante el helper existente. El puerto `NodePersistence.queryPage()` devuelve items, total, página y tamaño; su adaptador realiza COUNT y SELECT paginado parametrizados. Esta vista de lectura no crea una entidad, tabla ni una segunda copia del conocimiento.

El [crecimiento visual del jardín](./garden-evolution.md) deriva recuentos, estado y composición en Presentation. Inicio usa un puerto de resumen agregado y el canvas reutiliza datos cargados. `GardenEnvironment` y las funciones de composición no dependen de React Flow ni persisten decoración; el renderer actual sigue siendo 2.5D mediante CSS/SVG, sin implementar 3D.

`loadIdeaPage()` combina la idea existente, sus recursos, pertenencia a pendientes, colocaciones y conexiones con otras ideas existentes. Los casos de uso de guardado, conexión y retirada verifican las identidades y mantienen los puertos existentes.

## Independencia del lienzo

`@xyflow/react` es la implementación inicial del lienzo bidimensional y pertenece sólo a Presentation. Un `Node` de JardinDigital no es un nodo de React Flow; `Edge`, `Canvas` y `Placement` también son modelos propios. La posición persistente pertenece a `Placement`.

```text
Domain → adaptador de Presentation → React Flow
```

El adaptador usa `PlacementId` como identidad visual y copia la posición de la colocación. Resuelve los extremos `NodeId` de cada conexión hacia las colocaciones del jardín activo. Las flechas y la selección son presentación efímera. Al finalizar un arrastre, Application aplica `movePlacement()` y guarda la colocación; nunca se persiste un objeto de React Flow.

Una idea puede colocarse en varios jardines. La restricción `(canvas_id, node_id)` permite una colocación por idea dentro de cada jardín, sin limitar sus demás jardines. Una conexión es global y sólo se proyecta en un jardín cuando ambos extremos están colocados allí.

## Conexiones e identidad

`Edge` almacena `sourceNodeId → targetNodeId`. No impone una relación 1:N: una idea puede tener varias conexiones entrantes y salientes. Se permiten `A → B`, `A → C`, `D → A` y `B → D`, así como una conexión consigo misma y varias conexiones con el mismo par de extremos. Cada conexión tiene su propio `EdgeId`; eliminar una no elimina las demás ni las ideas. No se necesita una tabla muchos-a-muchos adicional.

Las identidades generadas por la aplicación se conservan al cargar, editar, reiniciar y restaurar. Las invariantes de Domain se validan también al rehidratar datos persistidos.

## Recursos vinculados

`Resource` tiene identidad propia, `nodeId`, nombre, tipo (`document`, `video`, `link`), localizador y ubicación (`local`, `url`). Cada registro pertenece a una idea; una idea puede tener varios recursos. El modelo no necesita una biblioteca global de recursos ni una relación adicional.

Los documentos y vídeos locales referencian una ruta absoluta al archivo original. Añadir un recurso no copia el archivo, y SQLite no almacena su contenido. Quitar el recurso o eliminar definitivamente la idea elimina metadata y asociaciones, sin borrar archivos externos. Los enlaces y vídeos por URL se limitan a `http`/`https` y se abren mediante el sistema operativo.

La disponibilidad de un archivo es un estado calculado al consultar su ruta, no una nueva identidad ni una condición necesaria para restaurar la metadata. Si falta, la página muestra **Archivo no disponible** y conserva idea y recurso. La tarjeta del lienzo usa iconos y cantidades por tipo; no carga documentos o vídeos completos. No se introduce FFmpeg ni un servicio de miniaturas.

## Estado persistente y estado de interfaz

Persisten ideas, contenido, conexiones, recursos vinculados, jardines, posiciones, pertenencia a pendientes y apariencia. La selección, hover, borradores de formulario, menús, diálogos, página abierta y estados visuales temporales son estado de interfaz. No se guardan sólo porque React o React Flow los utilicen.

## Persistencia y transacciones

Existe una sola base SQLite, `sqlite:jardindigital.db`, gestionada por el plugin SQL oficial de Tauri en el directorio AppConfig del sistema operativo. Los adaptadores comparten `Database.load()`. Los comandos Rust toman el mismo pool `DbInstances`; no abren otra base ni una ruta paralela.

Las migraciones v1–v5 mantienen ideas, lienzos/colocaciones, conexiones, pendientes y apariencia. La migración v6 añade `resources` e índice por `node_id`; no modifica las anteriores. El [modelo de persistencia](./persistence-model.md) detalla el contrato.

`nativeOperations.ts` define el puerto transaccional estrecho y su adaptador invoca `src-tauri/src/operations.rs`. Crear idea y colocación en un jardín, eliminar jardín, eliminar idea definitivamente y restaurar una copia usan transacciones Rust. Las dos operaciones de captura/procesado de pendientes mantienen los triggers atómicos específicos de v4. No se generaliza este mecanismo a un gestor de transacciones.

La exportación JSON v2 obtiene una instantánea coherente mediante una transacción de lectura e incluye metadata/rutas/URLs de recursos. Restaurar acepta v1 y v2, valida datos y relaciones y confirma todo en una transacción; los archivos externos no se leen, copian ni borran durante la operación. Véase [copia y restauración](./backup-restore.md).

## Límite nativo y permisos

Los permisos del frontend se mantienen en `core:default`, `sql:default` y `sql:allow-execute`. Los plugins Rust oficiales `tauri-plugin-dialog` y `tauri-plugin-opener` se utilizan desde comandos específicos:

- `choose_resource_file(kind)` selecciona un documento o vídeo local mediante un diálogo nativo.
- `resource_file_exists(path)` comprueba si una ruta local apunta a un archivo.
- `open_resource(resourceId)` lee la referencia guardada desde SQLite, valida el localizador y abre ese recurso.

No se conceden permisos generales de diálogo, apertura, shell, HTTP o filesystem al frontend. La apertura por identidad evita que la interfaz envíe directamente una URL o ruta arbitraria al plugin. Rust vuelve a validar las URLs, las rutas y la existencia del archivo, y rechaza tipos ejecutables, scripts y accesos directos cubiertos por su comprobación. No se añaden bindings npm de los plugins.

## Abstracciones y decisiones diferidas

Antes de añadir una abstracción se debe identificar el problema actual, por qué la solución existente no basta y el coste añadido. Se mantiene el diseño de funciones y puertos concretos, sin repositorio genérico, CQRS, bus de eventos, ORM ni microservicios.

Siguen diferidos la copia gestionada de archivos, un vault visible, las copias programadas/cifradas, sincronización, edición avanzada de conexiones, persistencia del viewport, Markdown renderizado, lectores PDF y funciones de IA.

## Notas históricas y validación

Las notas de slices describen su estado en el momento de implementación y pueden contener interacciones o decisiones ya sustituidas. La documentación principal actual es este documento, [persistencia](./persistence-model.md), [copia y restauración](./backup-restore.md) y la [matriz manual](./personal-v1-manual-validation.md).

Se conservan como antecedentes las notas de [SQLite inicial](./sqlite-vertical-slice.md), [Canvas/Placement](./canvas-placement-vertical-slice.md), [edición inicial](./canvas-node-editing.md), [creación de conexiones](./canvas-edge-connection.md), [base de jardines](./garden-usable-foundation.md), [captura y pendientes](./capture-inbox.md) y [ciclo de conocimiento](./library-knowledge-lifecycle.md).

Los paneles de desarrollo e IDs sólo aparecen en DEV y deben ser legibles en tema claro y oscuro. El usuario aportó feedback del pase 2.5D anterior. Los cambios 3A requieren su [validación final en Tauri/WebView2](./final-product-manual-validation.md); las pruebas de navegador con puertos simulados no la sustituyen.
