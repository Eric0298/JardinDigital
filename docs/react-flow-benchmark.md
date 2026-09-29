# React Flow Benchmark

## 1. Objective

Evaluate whether React Flow can remain outside JardinDigital's domain while
supporting the essential interactions and approximate graph sizes expected of a
future two-dimensional Canvas. This is an isolated technical experiment, not a
technology adoption decision.

## 2. Evaluated version and license

- Package: `@xyflow/react`
- Version: `12.12.0`
- License: MIT, confirmed in the installed package metadata and license file
- React Flow Pro packages or paid features: none

## 3. Experimental architecture

During the evaluation, the experiment lived in
`src/experiments/react-flow-benchmark`. Synthetic domain-shaped data was
generated deterministically in memory and passed through a small adapter before
it reached React Flow. The experimental source was removed after the benchmark
closed because it did not solve a current production need.

```text
JardinDigital Node + Placement -> React Flow Node
JardinDigital Edge             -> React Flow Edge
```

React Flow position changes update an in-memory copy of `Placement.position`.
Connections are validated through `createEdge` and then mapped back to React
Flow. Reconnection is represented experimentally as replacing the old domain
Edge with a newly validated Edge. No React Flow types or imports exist in
`src/domain`.

## 4. Domain separation

No domain entity, domain invariant, or domain test was changed. Node does not
gain position or UI state; Edge does not gain visual properties; Placement
remains the conceptual owner of persistent position. The experiment uses the
public domain contracts but the domain does not depend on the experiment.

## 5. Functionalities tested

Automated in headless Microsoft Edge through the browser's built-in DevTools
Protocol, without an added browser-testing dependency:

- custom editable nodes and handles;
- single selection and Ctrl multi-selection;
- Shift marquee selection;
- individual and multi-node drag;
- zoom and fit-view controls;
- connection creation and edge reconnection;
- edge deletion with Delete and node deletion with Backspace;
- double-click detection;
- Tab focus, Enter/Space selection, Escape clearing, and arrow-key movement;
- text editing and text selection without moving the node;
- deterministic scenario loading and approximate render timing;
- viewport-dependent CSS level of detail.

The positive interaction evidence was collected across repeated fresh 50-node
sessions. The runs produced no application runtime exceptions, React warnings,
or React Flow warnings.

## 6. Functionalities not tested

- reliable mouse pan in a visible interactive browser window;
- Meta multi-selection on macOS;
- manual interaction quality at 250, 500, or 1000 nodes;
- Tauri WebView interaction as opposed to Edge;
- memory consumption and frame rate;
- touch interaction;
- groups/subflows in the prototype;
- persistence, undo/redo, product shortcuts, or product-specific behavior.

## 7. Scale scenarios

Each scenario uses a deterministic grid, a chain edge between consecutive
nodes, and one skip edge for every fourth node. This avoids an unrealistic
disconnected graph and avoids O(n²) density.

The figures below are one-run measurements in Edge headless. “First usable
render” is the interval from scenario generation start until two animation
frames after React committed the graph. It is an approximation, not a full
page-load metric or statistical benchmark.

| Nodes | Edges | Generation | First usable render | Result |
|---:|---:|---:|---:|---|
| 50 | 62 | 0.10 ms | 114.60 ms | Measured |
| 250 | 312 | 0.50 ms | 231.20 ms | Measured |
| 500 | 624 | 0.70 ms | 311.10 ms | Measured |
| 1000 | 1249 | 1.40 ms | 465.70 ms | Measured |

With `onlyRenderVisibleElements` enabled, the 1000-node scenario retained
1000 nodes and 1249 edges in controlled state while the inspected DOM contained
775 nodes and 1048 edges at the fitted viewport and minimum zoom. This is
evidence of the official visibility optimization, not proof of general
virtualization or smooth interaction.

## 8. Interaction observations

No observation is labeled manual because the environment did not provide a
reliable visible interactive session. Automated evidence on the 50-node
scenario confirmed selection, multi-selection, marquee selection of 40 nodes,
individual drag, movement of two selected nodes, editing, keyboard movement,
connection, reconnection, and deletion. Zoom and fit view changed the viewport.

Pan is implemented by the standard React Flow viewport but could not be made to
produce reliable evidence through headless pointer simulation. It remains not
verified in this benchmark environment.

## 9. Level of detail

LOD was prototyped with three CSS states selected after viewport movement:

- far: compact marker;
- medium: title editor;
- near: title and content editors.

The custom nodes do not subscribe individually to zoom. One root `data-lod`
attribute changes after movement ends, so the mechanism avoids per-node React
state updates. Its visual behavior was inspected at far and medium levels, but
its performance impact was not separately measured.

## 10. Groups and subflows

Official React Flow support exists through `parentId`, relative child
coordinates, `extent: "parent"`, and the built-in `group` node type. Groups
were not prototyped because doing so would not answer the core adapter and scale
questions. No Group concept was added to the JardinDigital domain.

**GRUPOS NO PROTOTIPADOS**

## 11. Rendering choices

Only simple official recommendations were applied:

- custom node component wrapped in `React.memo`;
- stable `nodeTypes` outside the parent component;
- memoized event handlers;
- `onlyRenderVisibleElements` enabled;
- simple node and edge styling without animation or gradients.

No custom virtualization, WebGL, Canvas API, worker, or profiling library was
introduced.

## 12. Problems and warnings

- Edge headless could not reliably automate pan, so pan quality is unknown.
- A request for `/favicon.ico` returned 404 during the browser audit. It is not
  a React or React Flow exception and was not hidden or changed in this scope.
- Edge emitted internal task-manager, sync, and updater diagnostics in some
  headless runs. They did not originate from application JavaScript.
- `cargo check` continues to emit the known path-canonicalization warning for
  `C:\Users\Usuario`.

## 13. Architectural impact

The experiment demonstrates that a React Flow controlled graph can be derived
from JardinDigital entities and that UI position, selection, dragging, and
editing do not need to enter the domain model. A future production adapter
would still need explicit application use cases for persisting position and
edge changes.

## 14. Reversibility

Replacing `@xyflow/react` would affect the Presentation/UI dependency and any
future Canvas adapter, but not Domain code, domain tests, Rust/Tauri, or the
persistent model. The synthetic benchmark source and its temporary `App.tsx`
integration were removed when the evaluation closed.

## 15. Original provisional technical conclusion (#06)

**CANDIDATO CON RESERVAS**

The architecture, core interaction APIs, custom-node editing, deterministic
rendering, and one-run scale results justify continued evaluation. Adoption is
not justified yet because pan was not verified in a reliable visible session,
interaction quality above 50 nodes was not exercised, memory/FPS were not
measured, and the Tauri WebView was not tested interactively.

## 16. Validación interactiva en Tauri (#06.1)

La validación manual se realizó en Windows dentro de la aplicación real de
JardinDigital, arrancada mediante `pnpm tauri dev`, sobre Tauri/WebView2, React
y React Flow. Eric manipuló los escenarios de 250, 500 y 1000 Nodes. El
escenario de 50 Nodes se mantuvo como referencia y no formó parte de esta
valoración manual.

| Interacción | 250 Nodes | 500 Nodes | 1000 Nodes |
|---|---|---|---|
| Pan | BIEN | BIEN | BIEN |
| Zoom | BIEN | BIEN | BIEN |
| Selección | BIEN | BIEN | BIEN |
| Marquee | BIEN | BIEN | BIEN |
| Multiselección | BIEN | BIEN | BIEN |
| Drag | BIEN | BIEN | BIEN |
| Multi-node drag | BIEN | BIEN | BIEN |
| Edición | BIEN | BIEN | BIEN |
| Conexión | BIEN | BIEN | BIEN |
| Impresión general | BIEN | BIEN | BIEN |

Eric no detectó problemas relevantes durante la prueba. La navegación,
selección, movimiento, edición y conexión se comportaron correctamente en los
tres escenarios. Tampoco se observaron errores visibles, bloqueos, Nodes que
desapareciesen incorrectamente, Edges incorrectos, clicks perdidos ni problemas
de foco. La salida disponible de la sesión de Tauri no mostró errores runtime,
warnings de React o React Flow ni excepciones durante la validación.

Esta prueba aporta evidencia humana cualitativa de usabilidad, no una medición
instrumentada ni una garantía para cualquier grafo futuro. Se mantiene lo
siguiente:

- FPS: **NO MEDIDO**.
- Memoria: **NO MEDIDO**.
- Rendimiento temporal instrumentado: únicamente las mediciones de un solo run
  realizadas en #06 y recogidas en la sección 7.
- Touch y Meta multiselect en macOS: no probados.

La validación cierra las reservas principales de #06 sobre pan, interacción
real por encima de 50 Nodes y comportamiento dentro de Tauri/WebView2. La
separación arquitectónica y la reversibilidad descritas anteriormente se
mantienen. El resultado actualizado del benchmark es:

**CANDIDATO VIABLE**

## 17. Conclusión final del benchmark

**CANDIDATO VIABLE**

La evidencia automatizada de #06 y la validación humana de #06.1 permiten
cerrar la evaluación técnica con React Flow como candidato viable. Esta
conclusión conserva las limitaciones indicadas: FPS y memoria no fueron
medidos, y los resultados no garantizan el comportamiento de cualquier grafo
futuro.

## 18. Decisión posterior (#06.2)

**DECISIÓN POSTERIOR: `@xyflow/react` adoptado como implementación inicial del
Canvas 2D.**

La adopción corresponde exclusivamente a Presentation/UI. React Flow no define
el modelo persistente y continúa separado del Domain mediante una adaptación
externa, por lo que sigue siendo sustituible.
