# JardinDigital

JardinDigital es una aplicación de escritorio personal, local y visual para organizar conocimiento mediante jardines. Funciona sin cuenta ni servicio de nube obligatorio y tiene licencia AGPL-3.0-only.

## Experiencia personal v1

La aplicación se abre en **Inicio → Mis jardines**. Desde aquí se pueden crear, abrir, renombrar y eliminar jardines. Al arrancar no se abre automáticamente el primer jardín, aunque sólo exista uno.

El jardín y su lienzo son el centro del trabajo:

- **Ideas en el jardín:** crear con **Nueva idea** o con un doble clic en el fondo; seleccionar con un clic, arrastrar y conectar. Las opciones de selección permiten **Eliminar conexión**, **Quitar del jardín** o **Eliminar idea definitivamente** con confirmación. **Editar idea** abre la edición rápida; un doble clic en la tarjeta o **Abrir idea** abre su página completa.
- **Página de idea:** editar título y contenido, guardar, añadir documentos, vídeos y enlaces, gestionar conexiones y ver todos sus jardines. Abrir o editar la página conserva la identidad de la idea; no crea una copia.
- **Buscar:** actualiza resultados de título y contenido mientras escribes, sin enviar un formulario. Se abre desde la navegación o `Ctrl/Cmd+K`; sus resultados permiten abrir la página de cada idea. `Escape` vuelve al origen de la búsqueda.
- **Pendientes:** flujo auxiliar dentro de **Más** para guardar una idea rápidamente, editarla, abrir su página, añadirla a un jardín o quitar sólo su condición de pendiente. Crear ideas directamente en un jardín no exige pasar por aquí.
- **Todas las ideas:** listado buscable por título y contenido, paginado en grupos de 20. Recupera cualquier idea, incluso si no está en un jardín ni en pendientes; permite editar, abrir, colocar, quitar una colocación o eliminar definitivamente con confirmación.
- **Ajustes:** temas Sistema, Claro y Oscuro; fondo del jardín Liso, Puntos o Cuadrícula; copia de seguridad JSON y restauración.

Una idea puede estar en varios jardines con posiciones distintas. Las conexiones relacionan ideas globalmente y permiten muchos orígenes y destinos, conexiones consigo misma y conexiones duplicadas con identidad propia.

## Experiencia visual 2.5D

Personal v1 usa un jardín **2.5D**: objetos de cristal/acrílico, bordes translúcidos, reflejos interiores sólidos, sombras y capas aportan profundidad sin degradados. El modo claro usa una base salvia y el oscuro conserva su carácter nocturno. El 3D real no forma parte de v1. El hover de ideas y conexiones es estado de Presentation; no cambia ni persiste datos. La interfaz visible usa castellano, con temas Claro, Oscuro y Sistema.

Los jardines evolucionan visualmente según sus ideas, conexiones y recursos. Sus 12 estados se calculan a partir del contenido actual; la composición SVG original permanece estable para cada jardín, sin puntuaciones visibles ni datos decorativos persistidos. El [modelo visual de crecimiento](docs/garden-evolution.md) explica los pesos, límites y separación del conocimiento respecto al renderer.

La iconografía utiliza `lucide-react` 1.49.0 mediante importaciones explícitas de los iconos usados. Los colores y la profundidad se resuelven con tokens CSS compartidos; React Flow y las coordenadas persistidas se conservan. No se añade otra biblioteca UI ni un asset de Higgsfield.

El [recorrido final de los cambios 3A](docs/final-product-manual-validation.md) está pendiente de ejecución manual en Tauri/WebView2, tras el feedback del pase anterior. La validación de navegador con datos aislados no sustituye la aplicación de escritorio ni el reinicio con datos reales. Los recursos siguen vinculados a sus archivos originales: no se copian ni se eliminan al quitar una referencia o idea.

## Recursos vinculados

Desde la página de una idea se pueden añadir documentos locales, vídeos locales o por URL, y enlaces `http`/`https`. Los archivos locales se seleccionan mediante un diálogo nativo y se **vinculan a su ubicación original**: JardinDigital no los copia ni guarda sus bytes en SQLite. Abrir un documento o vídeo utiliza la aplicación asociada del sistema; los enlaces se abren en el navegador externo.

Cada recurso tiene identidad propia y guarda su tipo, nombre y ruta o URL, asociado a la misma idea. Si un archivo se mueve o deja de existir en su ruta, aparece **Archivo no disponible**; la idea y la referencia siguen guardadas. Quitar un recurso elimina su referencia de la idea y conserva el archivo original. Las tarjetas del lienzo muestran iconos y cantidades de documentos, vídeos y enlaces, sin cargar todos los archivos ni generar miniaturas con dependencias pesadas.

## Datos, copias y eliminación

Los datos estructurados se guardan en `jardindigital.db`, en el directorio AppConfig del sistema operativo gestionado por el plugin SQL de Tauri. Las migraciones v1–v5 conservan ideas, lienzos, colocaciones, conexiones, pendientes y apariencia; v6 añade la tabla `resources`. No hay una tabla para Todas las ideas: esta vista consulta todos los `Node` existentes.

**Ajustes → Guardar copia de seguridad** exporta una instantánea JSON de versión 2. Incluye los datos estructurados y la metadata de recursos con sus rutas y URLs. **No incluye los archivos externos originales**: hay que conservarlos por separado. Se utiliza el selector de guardado del WebView cuando está disponible; en caso contrario se inicia la descarga. Comprueba que el archivo existe antes de depender de él.

**Restaurar copia** pide confirmación y sustituye los datos actuales dentro de una transacción. El formato y las relaciones se validan antes de confirmar los cambios; un fallo conserva los datos actuales. Se admiten también las copias de versión 1, que restauran un conjunto vacío de recursos. La restauración recupera las referencias aunque los archivos externos ya no estén disponibles.

| Acción | Resultado |
|---|---|
| Quitar de pendientes | Elimina sólo la pertenencia a pendientes; conserva idea, jardines, conexiones y recursos. |
| Quitar del jardín | Elimina sólo esa colocación; conserva la idea y sus demás relaciones. |
| Eliminar jardín | Elimina el lienzo y sus colocaciones en una transacción; conserva ideas, conexiones, pendientes y recursos. |
| Quitar recurso de la idea | Elimina su metadata/referencia; conserva el archivo original. |
| Eliminar idea definitivamente | Elimina idea, pendientes, todas sus colocaciones, conexiones entrantes/salientes y metadata de recursos en una transacción; conserva los archivos externos. |

Consulta la [arquitectura](docs/architecture.md), el [modelo de persistencia](docs/persistence-model.md), la [copia y restauración](docs/backup-restore.md) y la [matriz de validación manual](docs/personal-v1-manual-validation.md).

## Desarrollo

Requiere Node.js, pnpm, Rust y los [requisitos de plataforma de Tauri 2](https://v2.tauri.app/start/prerequisites/).

```sh
pnpm install
pnpm tauri dev
```

La interfaz usa React y React Flow. SQLite se integra mediante el plugin oficial SQL de Tauri. Los plugins Rust oficiales `tauri-plugin-dialog` y `tauri-plugin-opener` cubren la selección de archivos y su apertura a través de comandos propios; no se conceden permisos generales de diálogo, apertura o filesystem al frontend. No se añaden dependencias npm para recursos.

Comprobaciones:

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo check --manifest-path src-tauri/Cargo.toml --locked
cargo fmt --manifest-path src-tauri/Cargo.toml --check
git diff --check
```

Los detalles técnicos y los identificadores internos sólo se muestran en modo DEV. La versión de producción no incluye esos paneles.

Las pruebas de consultas ejecutan SQLite en memoria mediante `node:sqlite`; se han validado con Node.js 22.20.0, sin añadir dependencias a la aplicación.

## Límites actuales

No hay sincronización, cuentas, colaboración, etiquetas, carpetas, IA ni estudio de salida. Los archivos se mantienen vinculados; no hay importación gestionada, lectura de documentos, OCR, scraping de enlaces ni generación de miniaturas de vídeo. Buscar utiliza `LIKE` parametrizado y el comportamiento de mayúsculas/minúsculas propio de SQLite; no busca dentro de los archivos externos. Las copias son manuales, sin cifrado, programación ni retención automática.

El último pase de producto requiere completar su recorrido manual en Tauri/WebView2 antes del hardening y release. Los resultados automatizados no sustituyen esa validación de escritorio.

Creado por Eric Mancebo. Copyright © 2026 Eric Mancebo. Licencia GNU AGPL v3 (`AGPL-3.0-only`).
