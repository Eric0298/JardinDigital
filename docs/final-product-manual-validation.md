# Validación final de producto 3A

Recorrido corto en **Tauri/WebView2**, pendiente de la validación visual del usuario. Usa un jardín de prueba y conserva una copia antes de eliminar conocimiento. Anota tema y versión probada. El feedback del pase anterior ya confirmó hover, cuadrícula, selección, recursos, conexiones y modo oscuro; esta lista se centra en los cambios nuevos.

| # | Comprobar | Resultado esperado | Resultado |
|---|---|---|---|
| 1 | Inicio con jardines pequeños y desarrollados; añadir ideas, conexiones y recursos y volver. | Cada tarjeta representa su contenido con una progresión vegetal clara; el mismo jardín conserva su composición base. | Pendiente |
| 2 | Menú de tres puntos en primera tarjeta, intermedia y última, también tras desplazar Inicio. | Se abre delante de las tarjetas vecinas; acciones accesibles y Escape cierra. | Pendiente |
| 3 | Abrir un jardín, observar tarjetas y barra, volver a Inicio. | Mayor separación del fondo y profundidad física sin movimiento continuo; nombre y acciones claros. | Pendiente |
| 4 | Observar tarjetas, menús y diálogos. | Cristal/acrílico discreto, texto legible y foco visible. | Pendiente |
| 5 | Recorrer Inicio, jardín, Buscar y página de Idea en Claro. | Base salvia/vegetal, sin blanco dominante ni verde saturado. | Pendiente |
| 6 | Repetir en Oscuro y seleccionar Sistema. | Calidad nocturna conservada; Sistema sigue la preferencia del SO. | Pendiente |
| 7 | Alternar Liso, Puntos y Cuadrícula. | La cuadrícula sigue fina y secundaria; el ambiente no invade el área central. | Pendiente |
| 8 | Hover de idea/conexión, salida y selección. | Sólo conexiones y vecinos directos; extremos identificables; selección azul diferente del hover verde. | Pendiente |
| 9 | Seleccionar una conexión y usar Eliminar conexión. | Sólo desaparece esa conexión; ambas ideas permanecen. | Pendiente |
| 10 | Seleccionar una idea y usar Quitar del jardín. | Desaparece sólo de ese jardín; permanece en Todas las ideas con recursos y conexiones. | Pendiente |
| 11 | Eliminar idea definitivamente desde el canvas; cancelar primero. | Confirmación explica todos los jardines y recursos. Cancelar conserva datos; confirmar elimina conocimiento y conserva archivos originales. | Pendiente |
| 12 | Buscar escribiendo título o contenido; borrar el campo; probar texto sin coincidencias y abrir resultado. | Resultados en directo, estado inicial vacío, mensaje sin resultados y misma página de Idea. | Pendiente |
| 13 | Buscar en Todas las ideas. | Coinciden título/contenido; limpiar recupera el listado. | Pendiente |
| 14 | Con más de 20 ideas, usar Anterior/Siguiente; buscar desde una página posterior. | Página y total correctos, límites deshabilitados; búsqueda vuelve a página 1. | Pendiente |
| 15 | Abrir Pendientes desde Más y crear una idea directamente en un jardín. | Explicación comprensible; Pendientes es auxiliar y no obligatorio. | Pendiente |
| 16 | Abrir una idea con documento, vídeo y enlace; abrirlos y quitar una referencia de prueba. | Recursos legibles y apertura correcta; siguen vinculados y los archivos originales se conservan. | Pendiente |
| 17 | Cerrar y abrir Tauri. | Conocimiento y apariencia persisten; crecimiento se deriva de los mismos datos sin variar aleatoriamente. | Pendiente |

Las pruebas automatizadas y el navegador con puertos simulados no sustituyen este recorrido de escritorio. Este bloque no incluye hardening, installer ni release v1.0.0.

Comprobaciones automatizadas ejecutadas el 2 de octubre de 2026: `pnpm test` (239 pruebas en 34 archivos), `pnpm exec tsc --noEmit`, `pnpm build`, `cargo test --manifest-path src-tauri\Cargo.toml --locked` (20 pruebas), `cargo check --manifest-path src-tauri\Cargo.toml --locked`, `cargo fmt --manifest-path src-tauri\Cargo.toml --check` y `git diff --check`: **PASS**. Agregados y paginación se prueban además con SQLite real en memoria. El build mantiene un aviso no bloqueante por el JS principal de 521,50 kB (157,93 kB gzip); no se añadieron dependencias en 3A.

Navegador con la App real y puertos simulados: **92/92 PASS**, cero errores de ejecución; 82 comprobaciones del recorrido completo repetidas tras los últimos cambios y 10 casos de escrituras retardadas. Se comprobaron 1360×900 y 900×680; Inicio con 0/1/14 jardines, doce estados y capturas representativas 0/bajo/medio/alto/máximo; menús de primera/intermedia/última tarjeta y menú largo limitado al contenedor desplazable; ambiente, material, toolbar y diálogos en Claro/Oscuro/Sistema y fallback sin `backdrop-filter`; cuadrícula de 0,5 px y opacidad 9 %/8 %; hover y selección sin llamadas a persistencia; acciones del canvas; búsqueda live y paginación 20/20/3 sobre 43 ideas; navegación con respuestas obsoletas y actualización del crecimiento tras volver a Inicio antes de completar una escritura. Las capturas representativas de crecimiento y superficies se inspeccionaron visualmente. No se probaron en este pase selectores nativos, apertura real de archivos/enlaces ni reinicio/persistencia de WebView2; permanecen pendientes en la tabla.
