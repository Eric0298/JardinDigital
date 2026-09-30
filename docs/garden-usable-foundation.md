# Garden Usable Foundation

## Scope

This block turns the persisted Canvas slices into the first product-facing
Garden workspace. Garden is the UI name for a visual knowledge space; Canvas
remains the Domain entity and persisted model. No Garden entity, table,
migration, or mass rename is introduced.

## Startup

`CanvasPersistence.list()` returns rehydrated Domain Canvases in deterministic
`title, id` order. Application startup applies one temporary policy:

- zero Canvases: show a product empty state;
- one Canvas: open it automatically;
- multiple Canvases: open the first deterministic result and show a title
  selector in the toolbar.

No UUID is required from the user and no last-opened preference is persisted.
Creating a Garden creates and saves one empty Domain Canvas, refreshes the
list, and opens it. `createDemoCanvas()` remains only as a development helper;
it is not part of the product flow.

## Product shell and workspace

`App.tsx` now coordinates startup and the minimal product shell.
`GardenPage` owns the active CanvasView and persistent interactions.
`GardenToolbar` exposes the current Garden, multi-Garden selection, New Garden,
New idea, and Fit view. `CanvasSurface` owns the React Flow boundary and fills
the available workspace.

The visible New idea action invokes the same `createNodeInCanvas()` use case as
double-click creation. It asks the React Flow instance to translate the screen
center through `screenToFlowPosition()`; it does not invent a second coordinate
model. Fit view uses the React Flow instance and does not persist the viewport.

## Directed and deletable connections

The Presentation adapter adds a target arrow to each directed Domain Edge and
marks only the selected Edge as selected. Selection is Presentation state and
is not stored.

Deleting a selected connection calls the Application `deleteEdge()` use case,
which delegates to the narrow Edge persistence port. SQLite executes a
parameterized hard delete by Edge ID. The local CanvasView changes only after
persistence succeeds; failure leaves the connection visible and selected.

Duplicates and self-edges remain allowed in Domain, Application, SQLite, and
Presentation. Removing a Placement and deleting a Node remain outside scope.

## Development details

Canvas, Node, Placement, Edge identities and positions remain inspectable in a
collapsed development panel rendered only when `import.meta.env.DEV` is true.
No product flow depends on that panel.

## Persistence and known debt

The schema remains at three migrations and four tables: `nodes`, `canvases`,
`placements`, and `edges`. No timestamp, setting, last-opened value, viewport,
or selection is persisted.

Node creation followed by Placement creation remains deliberately
non-transactional. Canvas loading still resolves one Node per Placement. Those
known debts were not expanded into a transaction framework or query redesign
in this product block.

## Manual validation

The user completed the #13 interactive matrix in the real Tauri/WebView2
application on 2026-09-30 and confirmed that it works correctly. The validated
flows include startup with existing data without copying a UUID, recovery of
the existing Nodes, positions, and Edges, idea creation and editing, movement,
connection creation, Fit view, Edge selection and deletion, restart recovery
without the deleted Edge, creation of a second Garden, title-based Garden
selection, and re-entry after restart without a UUID.

The zero-Garden decision is covered automatically by the startup tests. The
real local database was not deleted to reproduce a clean installation. This
section records user-performed manual validation; it does not attribute those
interactive checks to automation.
