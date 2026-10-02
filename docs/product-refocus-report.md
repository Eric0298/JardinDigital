# Informe del bloque 1: estructura de producto, páginas de idea y recursos

Implementación finalizada el 1 de octubre de 2026. Este informe cubre exclusivamente el bloque 1 solicitado.

| Apartado | Resultado |
|---|---|
| A. Git | `git fetch origin` realizado. `HEAD == origin/main == 4a7c15420aff8b134c0e476d154962ce6b83b3b8`, ahead/behind `0/0`. El trabajo previo y esta ampliación permanecen sin commit. No se ha hecho push ni tag. |
| B. Inicio | Mis jardines es siempre la entrada. Admite 0, 1 y N jardines, recuentos de ideas y acciones Abrir, Renombrar, Eliminar y Nuevo jardín. No abre automáticamente el primero. |
| C. Navegación | Inicio y Jardín tienen protagonismo; Buscar, Pendientes, Todas las ideas y Ajustes siguen disponibles. Estado React local, sin router nuevo. |
| D. Castellano | Etiquetas, formularios, estados, errores, confirmaciones y accesibilidad propia en castellano. La terminología interna Domain se conserva. |
| E. Trabajo en lienzo | Crear, seleccionar, arrastrar, editar rápidamente, abrir página, conectar, eliminar conexión, quitar colocación, buscar y volver a Inicio. También se guardan los movimientos por teclado y el arrastre de varias ideas. |
| F. Página de idea | Información editable, Guardar, recursos, conexiones con apertura de ideas, jardines y eliminación definitiva. Doble clic abre la página; un clic selecciona. Guardar conserva el NodeId. Se protegen los borradores al navegar. |
| G. Resource Domain | Identidad propia, NodeId, tipo, nombre, localizador y ubicación. Cada recurso pertenece a una idea; varios recursos pueden referenciar el mismo archivo sin copiarlo. |
| H. Documentos | Selector nativo, referencia local absoluta, nombre/tipo, Abrir y Quitar de la idea. Quitar conserva el original. |
| I. Vídeos | Archivos locales vinculados y URLs http/https. Vista con icono, nombre y tipo; sin generación de miniaturas ni FFmpeg. |
| J. Enlaces | Validación http/https con host y sin credenciales; nombre opcional con dominio como alternativa. Apertura externa mediante el recurso persistido y validación nativa. |
| K. Recursos en lienzo | Iconos y cantidades de documentos, vídeos y enlaces. La tarjeta sigue compacta; no carga bytes ni listas completas de recursos. |
| L. Muchos-a-muchos | Se conservan Edges globales NodeId → NodeId. Entrantes y salientes múltiples, conexiones consigo misma y duplicadas; sin tabla redundante ni restricción 1:N. |
| M. Buscar | Conserva búsqueda parametrizada por título/contenido y caracteres literales. Resultados abren páginas de idea. Ctrl/Cmd+K disponible. |
| N. Pendientes y Todas las ideas | Se conservan captura, edición, recuperación y colocación de ideas existentes. Quitar de pendientes elimina sólo pertenencia. Borradores y foco modal protegidos. |
| O. Copias | Exportación v2 con metadata, identidades, asociaciones, rutas y URLs de recursos; sin bytes externos. Restauración atómica v2 y compatible con v1 sin recursos. Las referencias ausentes se conservan y se muestran como no disponibles. |
| P. Eliminaciones | Quitar del jardín elimina sólo Placement. Eliminar jardín elimina Canvas y sus Placements. Eliminar idea definitivamente elimina pertenencia, colocaciones, Edges incidentes, metadata de recursos y Node en una transacción. Nunca elimina archivos externos. |
| Q. Migraciones | v6 añade `resources` e índice por NodeId. v1–v5 conservadas. |
| R. Dependencias | Sólo se añaden dos dependencias directas Rust: `tauri-plugin-dialog` y `tauri-plugin-opener`. Sin dependencias npm nuevas para esta ampliación. Las capabilities del frontend siguen limitadas a core y SQL. |
| S. Pruebas | 191 pruebas TypeScript en 26 archivos y 20 pruebas Rust pasan. Cobertura de recursos, persistencia, archivos vinculados ausentes, identidad de página, conexiones, backup/restore y rollback completo ante errores de recursos. Se conservan las pruebas anteriores, ajustando el contrato de arranque y Resource. |
| T. Checks | Pasan `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, `cargo test --manifest-path src-tauri/Cargo.toml --locked`, `cargo check --manifest-path src-tauri/Cargo.toml --locked`, `cargo fmt --manifest-path src-tauri/Cargo.toml --check` y `git diff --check`. |
| U. Validación manual | Pendiente el recorrido en Tauri/WebView, especialmente selector nativo, apertura mediante asociaciones del sistema y reinicio sobre la base real. Véase la matriz enlazada más abajo. |

## Evidencia y límites de la revisión visual

Se probó la interfaz real en Chromium a 800 × 600 usando puertos de prueba en memoria, sin abrir ni modificar la base del usuario. Pasaron Inicio con 0/1/N jardines, selección, doble clic, edición, arrastre, recursos locales y web, rechazo de URL inválida, archivo ausente, conexiones duplicadas y consigo misma, búsqueda, eliminación de colocaciones/ideas/jardines y navegación con borradores.

También pasaron movimiento por teclado, arrastre de varias ideas y protección de borradores de creación y captura. No se detectaron errores JavaScript en estos recorridos. Se revisaron temas claro y oscuro y se comprobaron los colores del panel técnico DEV: texto claro sobre fondo oscuro, incluidos sus registros internos. El bundle de producción elimina la etiqueta del panel de desarrollo; sus IDs sólo se presentan bajo DEV.

Los puertos de prueba no verifican el diálogo nativo, asociaciones de archivos ni la escritura SQLite durante esos recorridos de navegador. Las operaciones SQLite y sus fallos se comprobaron por separado con tests Rust sobre las migraciones reales. La apertura externa depende de las aplicaciones asociadas instaladas en el sistema. Las rutas restauradas de otra plataforma conservan su metadata y pueden quedar no disponibles.

Los archivos temporales, perfil de navegador y servidor utilizados en la revisión se han retirado.

## Documentación

- [Arquitectura](./architecture.md)
- [Persistencia](./persistence-model.md)
- [Copia y restauración](./backup-restore.md)
- [Validación manual pendiente](./personal-v1-manual-validation.md)

PRODUCT STRUCTURE COMPLETE: YES

READY FOR 2.5D/UX PASS: YES

Este informe corresponde al cierre del bloque 1. El recorrido del bloque 2 se recoge por separado en la [matriz UX 2.5D](./ux-2-5d-manual-validation.md). Tras el feedback visual del usuario, los cambios 3A tienen su propia [validación final de escritorio](./final-product-manual-validation.md), pendiente.
