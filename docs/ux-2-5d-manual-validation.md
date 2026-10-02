# Validación visual y UX 2.5D

Recorrido para Eric de unos **5–10 minutos** en la aplicación real de **Tauri/WebView2**. **Pendiente de ejecución manual.** Anota versión probada, tema y resultado; añade una captura o nota sólo si algo falla.

Personal v1 usa un jardín **2.5D**, con superficies, bordes, sombras y capas; el 3D real queda fuera de v1. El hover pertenece exclusivamente a Presentation: no escribe en la base de datos ni cambia ideas, posiciones o conexiones. El lenguaje visible es castellano. Los recursos locales siguen vinculados a sus originales: no se copian y quitar un recurso o eliminar una idea nunca borra esos archivos.

Usa un jardín de prueba con tres ideas A, B y C, conexiones A→B y A→C, y un documento/vídeo prescindible. Conserva una copia antes de probar restauración o eliminaciones. Para Inicio vacío usa una base desechable; no borres la base real para simularlo. Marca cada fila como ✓, fallo o pendiente.

| # | Comprobar | Resultado esperado | Resultado |
|---|---|---|---|
| 1 | Inicio con cero, uno y varios jardines. | «Mis jardines» es la entrada; vacío cuidado, nombres y Abrir evidentes, Renombrar/Eliminar en opciones. | Pendiente |
| 2 | Crear un jardín y abrirlo. | Nombre visible y lienzo con espacio amplio; volver a Mis jardines está accesible. | Pendiente |
| 3 | Observar el jardín y sus ideas. | Profundidad sutil, contenido protagonista, sin degradados ni decoración pesada. | Pendiente |
| 4 | Cambiar Liso, Puntos y Cuadrícula en Ajustes. | Liso limpio; puntos discretos; líneas finas que no compiten con conexiones. | Pendiente |
| 5 | Recorrer Inicio, jardín, idea y Ajustes en Claro/Oscuro; elegir Sistema. | Texto, foco, botones y superficies legibles; Sistema sigue la preferencia del SO. | Pendiente |
| 6 | Crear una idea con Nueva idea y otra con doble clic en el fondo; cancelar una. | Creación clara, Intro funciona y cancelar no deja una idea nueva. | Pendiente |
| 7 | Pasar el puntero por A y retirarlo. | A se eleva; sólo sus conexiones directas se resaltan. El efecto desaparece al salir. | Pendiente |
| 8 | Pasar el puntero por la conexión A→B. | La conexión se distingue con color/grosor; al salir recupera su apariencia. | Pendiente |
| 9 | Seleccionar A; mover el puntero a otra idea y seleccionar una conexión. | Selección y hover se distinguen; los controles de conexión son descubribles y alcanzables. | Pendiente |
| 10 | Conectar B→C, arrastrar una idea, hacer pan/zoom y Encajar. | Interacciones fluidas; flechas y contenido siguen claros. | Pendiente |
| 11 | Abrir una idea mediante doble clic y Abrir idea. | Página clara con Información, Recursos, Conexiones y contexto de Jardines. | Pendiente |
| 12 | Editar, Guardar y usar Ctrl/Cmd+Intro; intentar salir con cambios sin guardar. | Guardar azul con icono, feedback breve; Cancelar el descarte conserva el borrador. | Pendiente |
| 13 | Añadir y abrir un documento local; cancelar otra selección. | Selector nativo funcional; nombre/tipo claros; abre la aplicación asociada y cancelar no añade recurso. | Pendiente |
| 14 | Añadir y abrir un vídeo local y uno por URL. | Icono/vista compacta; apertura externa correcta, sin depender de miniaturas generadas. | Pendiente |
| 15 | Añadir, abrir y quitar un enlace. | Nombre y dominio identificables; apertura en navegador; quitar conserva la idea. | Pendiente |
| 16 | Volver al jardín después de editar y añadir recursos. | Retorno al jardín correcto, cambios visibles y cantidades compactas por tipo de recurso. | Pendiente |
| 17 | Abrir Buscar con Ctrl/Cmd+K, buscar, abrir un resultado y probar Escape. | Foco inicial en el campo; resultado abre la misma idea; Escape vuelve al origen y respeta menús/diálogos abiertos. | Pendiente |
| 18 | Recorrer Pendientes, Todas las ideas y Ajustes desde el menú; navegar con Tab. | Castellano coherente, Abrir prioritario, foco visible, sin IDs ni etiquetas técnicas fuera de DEV. | Pendiente |
| 19 | Revisar Eliminar idea, Eliminar jardín y Restaurar copia; cancelar primero. Probar quitar del jardín/pendientes y quitar una conexión en los datos de prueba. | Eliminación definitiva roja, papelera y consecuencia explícita; Cancelar no cambia datos. Quitar usa tratamiento neutral. Restaurar exige confirmación y los archivos originales se conservan. | Pendiente |
| 20 | Cerrar y abrir la aplicación real. | Inicio se recupera; títulos, contenido, posiciones, conexiones, referencias a recursos y apariencia guardada permanecen. | Pendiente |

Evidencia automatizada del 2 de octubre de 2026: **209 tests TypeScript y 20 Rust pasan**, junto con TypeScript, build frontend, cargo check, formato Rust y diff-check. La App real con puertos simulados pasó **65 comprobaciones de navegador**, sin errores JavaScript, en Claro/Oscuro/Sistema y tamaños 1360×900 y 900×680. Hover de idea, conexión y salida registró **cero llamadas a puertos**; la cuadrícula usa líneas de **0,5 px**, con opacidad 9 % en claro y 8 % en oscuro. Se generaron 55 capturas y se revisó su apariencia. El build conserva un aviso no bloqueante por el bundle JavaScript principal de 508,41 kB.

La validación automatizada de componentes y el navegador con datos aislados (**fixture**) acreditan sólo esos recorridos. **No sustituyen esta revisión manual en Tauri/WebView2 ni acreditan apertura de archivos reales.** Siguen pendientes, hasta registrar este recorrido: selectores nativos, apertura mediante el sistema operativo y reinicio con datos reales. Las comprobaciones funcionales extensas del bloque anterior siguen en la [matriz personal v1](./personal-v1-manual-validation.md).
