# Canvas + Placement Vertical Slice

## Objective

This slice connects Domain, Application, SQLite Infrastructure, Presentation,
and React Flow. It persists one Canvas, three Nodes, and one Placement per Node;
loads them by Canvas ID; renders them from Domain data; and saves a changed
position only when a drag ends. The earlier Node-only record remains unchanged
in [`sqlite-vertical-slice.md`](./sqlite-vertical-slice.md).

## Domain identity and position

Creation and rehydration remain distinct. `createCanvas` and
`createPlacement` generate Web Crypto UUIDs. `rehydrateCanvas` and
`rehydratePlacement` validate stored UUIDs and invariants while preserving all
stored identities exactly. They never generate replacement IDs.

`movePlacement` preserves `PlacementId`, `CanvasId`, and `NodeId` and changes
only `position`. Both coordinates must be finite numbers; negative and
fractional coordinates are valid. `Placement.position` is the sole persistent
source of truth for Node position.

## Migration v2

Migration v1 is unchanged and continues to create only `nodes`. Migration v2
creates only:

```sql
CREATE TABLE IF NOT EXISTS canvases (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS placements (
  id TEXT PRIMARY KEY NOT NULL,
  canvas_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  FOREIGN KEY(canvas_id) REFERENCES canvases(id),
  FOREIGN KEY(node_id) REFERENCES nodes(id),
  UNIQUE(canvas_id, node_id)
);
```

The unique pair permits one Node to appear in different Canvases but prevents
two Placements for the same Node inside one Canvas. IDs remain
application-generated TEXT UUIDs. There are no timestamps, JSON, metadata,
deletion fields, viewport fields, Edge fields, or Resource fields.

The plugin currently resolves SQLx SQLite 0.8.6. Its
`SqliteConnectOptions::new()` explicitly installs `PRAGMA foreign_keys=ON`, and
the plugin parses each SQLite URL through those options. Foreign-key
enforcement is therefore enabled for the plugin connections without an
additional UI command or capability.

## Application and persistence

The Canvas port provides `save/load`. The Placement port provides
`save/load/loadForCanvas`. The existing Node port remains unchanged. No generic
repository was added.

`loadCanvasView(canvasId)` loads the Canvas, then its Placements, then resolves
only the Node IDs referenced by those Placements. It returns Domain Canvas,
Nodes, and Placements—never React Flow values.

`createDemoCanvas()` explicitly creates one Canvas, three Nodes, and their
Placements through Domain functions and saves parents before Placements.
Nothing is seeded by a migration and no fixed UUID is used. These writes are
intentionally sequential and are not wrapped in a transaction in this slice;
atomic multi-entity creation remains a documented deferred decision.

`moveNodeInCanvas(placementId, newPosition)` loads the Placement, delegates the
change to Domain `movePlacement`, saves the returned Placement, and returns it.
React never issues an UPDATE directly.

The SQLite adapters share one lazy `Database.load("sqlite:jardindigital.db")`.
All statements and row validation remain in Infrastructure.

## React Flow adapter and UI

The Presentation adapter performs the explicit conversion:

```text
Domain Node + Domain Placement -> React Flow Node
```

The visual Node ID is the Placement ID, its label/content come from Node, and
its `position.x/y` come from `Placement.position.x/y`. The adapter neither
mutates Domain nor persists its output.

The temporary UI offers a demo creation action in the empty state and a Canvas
ID loader for restart validation. A loaded Canvas displays its title, the three
React Flow Nodes, and the Canvas/Node/Placement identities plus persisted
positions. React Flow owns transient drag state. `onNodeDragStop` sends the
final coordinates through Application and displays `Saving...`, `Saved.`, or
an error. A failed save restores the last Domain position.

The real Tauri/WebView2 application was validated across two complete process
close/reopen cycles on 2026-09-29. The same Canvas ID, all three Node IDs, all
three Placement IDs, and the moved SQLite REAL coordinates were recovered on
both reloads. Two Nodes were moved before the first restart and the remaining
Node after it. Temporary UUIDs were intentionally not recorded in this tracked
document.

Edges are an empty array. Edge persistence and UI, Resource persistence,
viewport persistence, and the production Home/Canvas design remain outside
this slice. Initial `fitView` is presentation behavior and is not stored.

## Security and scope

Capabilities remain exactly `core:default`, `sql:default`, and
`sql:allow-execute`. React components contain no SQL and never call
`Database.load`, `db.execute`, or `db.select`. No npm or Rust dependency, ORM,
state library, router, filesystem permission, or additional framework was
added.
