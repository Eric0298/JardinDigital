# Canvas Edge Connection

## Scope

This slice implements the first complete persistent `Capture -> Connect` flow.
A user can drag from one KnowledgeNode handle to another, persist the resulting
Domain Edge in SQLite, see it immediately, and recover the same relationship
after loading the Canvas again.

## Identity boundary

A Domain Edge connects knowledge identities:

```text
EdgeId
sourceNodeId -> targetNodeId
```

React Flow renders one visual Node per Placement, so its connection callback
uses Placement identities instead:

```text
source PlacementId -> target PlacementId
```

`createEdgeInCanvas()` protects the boundary explicitly. It loads both
Placements, verifies that each belongs to the active Canvas, takes their
`nodeId` values, calls Domain `createEdge()`, and persists the resulting Edge.
No Placement ID is cast or stored as a Node ID. A failed save is propagated and
Presentation does not add a visual edge.

## Visibility in a Canvas

Edge does not contain `CanvasId` and is not copied per Canvas. Its visibility is
derived from Placements: an Edge is shown only when both endpoint Nodes have a
Placement in the loaded Canvas. The Edge persistence adapter queries only
relationships whose source and target Node IDs are both in the current
Placement set.

The Presentation adapter then performs the inverse lookup:

```text
Domain Edge sourceNodeId -> source PlacementId
Domain Edge targetNodeId -> target PlacementId
```

If either Placement is missing, it emits no invalid React Flow Edge. The visual
edge uses the persistent `EdgeId` as its stable ID. It contains no position;
React Flow redraws the line automatically while either Placement moves.

## SQLite

Migration v3 adds exactly one table:

```sql
CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  FOREIGN KEY(source_node_id) REFERENCES nodes(id),
  FOREIGN KEY(target_node_id) REFERENCES nodes(id)
);
```

The table stores Domain identity only. It has no Canvas ID, Placement ID,
React Flow data, geometry, label, type, timestamps, metadata, or uniqueness
constraint on the endpoint pair. SQLx 0.8.6 enables SQLite foreign keys by
default for the plugin connection.

`rehydrateEdge()` validates stored UUIDs and restores the original `EdgeId`,
`sourceNodeId`, and `targetNodeId` without generating a replacement identity.
`loadCanvasView()` now returns `{ canvas, nodes, placements, edges }` as Domain
objects.

## Interaction

KnowledgeNode uses the official React Flow `Handle` component: target on the
left and source on the right. The official `onConnect` callback starts the
Application use case. Presentation displays `Connecting...`, `Connected.`, or
the propagated error. An Edge appears only after SQLite save succeeds.

Node selection, double-click editing, quick creation on a pane double click,
and Placement drag persistence remain separate interactions. Connecting is
disabled while another persistent interaction or the Node editor is active.

## Duplicates and self-edges

Domain and Application allow duplicate relationships. Two connections with the
same endpoints have distinct Edge IDs and the adapter passes both to React
Flow. There is no endpoint-pair deduplication in Application or SQLite.

Domain and Application also allow self-edges. The current source and target
handles expose the natural React Flow self-connection interaction. Its exact
pointer ergonomics remain subject to real WebView2 validation; no Domain rule
is weakened to accommodate a UI limitation.

## Manual validation

The complete connection flow was validated in the real Tauri/WebView2 runtime
on 2026-09-29. The test covered an existing Canvas, visible handles, connection
creation and feedback, visual Edge rendering while moving Nodes, Node editing,
new Node creation and connection, real SQLite persistence, a complete process
restart, recovery of the same Canvas and Edges, and preservation of Edge, Node,
Placement, position, and content identities. The existing drag, creation, and
editing interactions from slices #09, #10, and #11 remained correct.

Duplicate-Edge and self-edge pointer interactions were not part of that
reported manual matrix. Their Domain, Application, persistence, and adapter
behavior remains covered automatically without claiming unobserved UI results.

## Deferred

Edge deletion, reconnection, editing, labels, types, colors, weights,
bidirectionality, semantic metadata, and per-Canvas Edge copies are not part of
this slice.
