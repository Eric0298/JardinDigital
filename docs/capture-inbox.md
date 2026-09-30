# Capture and Inbox

## Product flow

Capture solves one need: save an idea before deciding where it belongs. It
creates the existing Domain `Node` from a title, content, or both and marks
that Node as waiting in Inbox. Inbox is a product surface for those pending
Nodes; it is not a second knowledge model and does not own copied content.

Editing from Inbox calls the same `persistNodeEdit()` application function as
Garden editing. The Node ID and Inbox membership remain unchanged. Placing an
idea creates a `Placement` that references that same Node ID and then removes
only its Inbox membership. The Node remains stored and becomes visible in the
chosen Garden.

## Persistence decision

Migration v4 adds one narrow relation:

```text
inbox_items
-----------
node_id PK, FK -> nodes.id
```

A boolean or lifecycle value on `nodes` would couple the knowledge record to
one product workflow and make future states such as Library concerns part of
the Node schema. A membership table keeps Node independent, permits a future
Node to return to Inbox without losing Placements, provides foreign-key
integrity, and expresses the current requirement with one column. No Inbox
Domain entity is introduced. The foreign key uses SQLite's default `NO
ACTION`; Node deletion is not currently a product operation and no cascade
policy is being invented ahead of it.

Inbox order is deterministic by its visible label (title, or content when the
title is empty), case-insensitively, then Node ID. No timestamp or sort field
exists solely to simulate capture order.

## Atomic operations

The Tauri SQL JavaScript API exposes independent `select` and `execute`
operations but no transaction handle. Sending `BEGIN`, several operations,
and `COMMIT` from Presentation would not guarantee that one pooled connection
owns the sequence.

Migration v4 therefore defines two write-only SQLite views with `INSTEAD OF
INSERT` triggers. Each adapter call sends one parameterized SQL statement:

- `capture_operations` inserts the Node and its `inbox_items` membership;
- `inbox_placement_operations` inserts the Placement (or accepts the existing
  unique `(canvas_id, node_id)` Placement) and removes Inbox membership.

Each trigger body runs in SQLite's implicit transaction for its one statement.
Failure rolls back the complete transition, so Presentation never coordinates
two independent writes. These are specific persistence commands, not a generic
transaction manager or repository abstraction.

These operational views and triggers are a localized solution for the two
atomic transitions introduced here. They must not become an automatic pattern.
If several additional transactional operations appear, the project must
reevaluate a narrow Rust transaction boundary before adding more operational
views or triggers.

Duplicate placement detection is read immediately before the atomic command.
If the selected Garden already contains the Node, the trigger preserves the
existing Placement, removes Inbox membership, and Application returns
`already-placed` for clear product feedback.

## Position and multiple Gardens

Inbox is not a Canvas and stores no coordinates. Placement from Inbox uses the
deterministic initial position `{ x: 0, y: 0 }`; the user can then move it with
the existing Garden interaction. Every available Garden is selectable. One is
preselected when present; with zero Gardens the UI says `No Gardens available`
and reuses the existing Create Garden flow. Capture never creates a Garden.

## Scope and maintained debt

This slice adds no router, state library, UI kit, generic transaction layer,
new npm package, or Rust dependency. ProductShell uses local state for the two
current surfaces. Resource handling, Library, Create/output, search, tags,
attachments, deletion, returning a Node to Inbox, automatic layout, and mobile
polish remain outside scope.

The older direct Garden operation `createNodeInCanvas()` still saves Node and
Placement in two non-transactional calls. That known debt is not generalized
or silently changed by the focused Inbox transaction boundary.

## Manual validation

The user completed this matrix in the real Tauri/WebView2 application on
2026-09-30 and confirmed that Capture, Inbox persistence, editing, Garden
selection, placement with the same Node identity, continued work in Garden,
restart recovery, and the relevant existing Garden interactions all work
correctly. These are user-performed interactive checks; they are not attributed
to automation.

1. Open the existing app and enter Inbox.
2. Capture a title-only idea, a content-only idea, and an idea with both.
3. Restart and confirm all three remain in Inbox.
4. Edit one in Inbox and confirm the update without a changed Node ID.
5. Place it in a Garden and confirm it disappears from Inbox.
6. Compare the Inbox and Garden Development details and confirm the same Node
   ID.
7. Move and edit it in Garden, restart, and confirm identity, content, and
   position remain.
8. With multiple Gardens, choose a non-default destination and confirm the
   placement there.
9. For a Node already present in the chosen Garden, process its Inbox
   membership and confirm no duplicate Placement is created.
10. Recheck Garden creation and selection, New idea, double-click creation,
    edit, move, connect, directed Edge display, Edge selection/deletion, Fit
    view, and restart recovery.

The real user database must not be deleted to reproduce a clean installation.
