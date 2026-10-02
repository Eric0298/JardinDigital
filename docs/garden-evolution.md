# Evolución visual del jardín

El crecimiento pertenece a Presentation y se deriva del contenido actual. No añade entidades de plantas, coordenadas decorativas, migraciones ni estado persistido.

La fórmula es **ideas + 2 × conexiones + recursos**. Cuenta ideas distintas colocadas en el jardín, conexiones cuyos dos extremos están colocados allí y referencias de recursos de esas ideas. Una idea compartida contribuye a cada jardín donde está colocada; una conexión con un extremo fuera no cuenta en ese jardín. Las conexiones duplicadas conservan sus identidades y los autorrelacionamientos cuentan una vez. No se leen archivos externos para calcular crecimiento.

Los doce estados comienzan en las puntuaciones **0, 1, 3, 6, 10, 16, 24, 36, 52, 76, 108 y 150**. La progresión añade brotes, arbustos, árboles, agua y pequeños indicios de fauna; el último estado permanece para cantidades mayores. No hay puntuaciones, niveles ni recompensas visibles. Al quitar conocimiento, la apariencia vuelve al estado correspondiente al contenido restante.

Inicio obtiene todos los recuentos con una consulta SQLite agregada a través de un puerto de Application. No carga contenido de ideas ni consulta por cada tarjeta. Las escrituras que cambian el crecimiento invalidan ese resumen tras completarse, incluso si se ha vuelto a Inicio antes de terminar; no reactivan consultas de la pantalla anterior. El canvas reutiliza las ideas, conexiones y referencias de recursos ya cargadas; hover no recalcula ni consulta persistencia.

La composición base deriva de una semilla estable del identificador del jardín. Los SVG son originales, pequeños y reutilizan símbolos; no hay assets descargados, generación ni servicios en runtime. Higgsfield no se utiliza porque SVG/CSS permite una progresión coherente, ligera y adaptada a ambos temas.

La separación es:

- **Conocimiento:** Ideas, Conexiones, Recursos y Colocaciones conservan sus semánticas e identidades.
- **Presentación del jardín:** recuentos derivados, estado visual, semilla y composición ambiental sin interacción.
- **Renderer actual:** React Flow para el grafo y CSS/SVG para material y ambiente 2.5D. Las funciones de crecimiento y composición no dependen de React Flow; otro renderer podría reutilizarlas. No se implementa 3D.

`GardenEnvironment` coloca pocos elementos en la periferia, con `pointer-events: none` y ocultos para tecnologías de asistencia. No son nodos, no se seleccionan ni se arrastran. No hay bucles de animación. El glass usa transparencia, bordes y sombras con fallback legible; se respeta `prefers-reduced-motion`. Liso, Puntos y la Cuadrícula fina se conservan.

Buscar actualiza resultados mientras se escribe. Todas las ideas usa el mismo criterio de título/contenido con consultas parametrizadas y páginas de 20; cambiar la búsqueda vuelve a la primera página. SQLite conserva su comportamiento de comparación de texto, sin FTS ni motor externo. Pendientes permanece en Más como flujo auxiliar: una idea pendiente puede estar también en jardines hasta quitar su condición de pendiente.
