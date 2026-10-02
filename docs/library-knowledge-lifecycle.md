# Library and Safe Knowledge Lifecycle

> Historical #15 implementation note. For current Personal v1 behavior,
> including Search, permanent deletion, and backup/restore, see
> [persistence-model.md](./persistence-model.md) and
> [personal-v1-manual-validation.md](./personal-v1-manual-validation.md).

## Product model

Library is the product surface for every existing Domain `Node`. It is a query,
not another copy or membership relation:

```text
Node exists -> Node appears in Library
```

A Node may simultaneously be pending in Inbox and placed in one or more
Gardens. A Node with no Inbox membership and no Placement is also valid and
remains discoverable in Library. There is no Library entity, Library item,
Library table, `addToLibrary()` operation, or Library state on Node.

Inbox answers whether a Node is still waiting to be processed. Garden is the
product name for a Canvas and shows a Node through a Placement. Library answers
which Nodes exist independently of either state.

## Read model and query strategy

`loadLibrary()` builds an Application read model:

```text
LibraryEntry
  node: Node
  inInbox: boolean
  gardens:
    garden: Canvas
    placement: Placement
```

The read model is not Domain and is never persisted. Infrastructure still
returns validated and rehydrated Domain entities rather than SQL rows.

Library loading issues four queries in parallel: all Nodes, pending Inbox
Nodes, all Canvases, and all Placements. Application composes them in memory.
The query count remains constant as the Library grows, avoiding a Node-by-Node
Inbox/Placement/Canvas N+1 without introducing a Library repository, query
framework, or SQL-shaped read model. This also reuses the existing narrow
persistence ports.

Nodes are ordered by their visible label: title, or content when the title is
empty, using SQLite `COLLATE NOCASE`, then Node ID as a stable tie-breaker.
Garden context is ordered case-insensitively by Garden title and then Canvas
ID. No recent, created, or modified order is claimed because timestamps do not
exist.

## Editing and identity

Editing from Library reuses `editNode()` through `persistNodeEdit()`. The same
Node ID is saved. Inbox membership, Placements, and Edges are not written and
therefore remain unchanged. A content-only Node receives a Presentation-only
heading fallback; that fallback is never persisted as its title.

## Place from Library versus Process Inbox

Place from Library validates that the Node and Canvas exist, creates a
Placement for the same Node ID, and asks Placement persistence to insert it.
The initial position is `{ x: 0, y: 0 }`. The existing
`UNIQUE(canvas_id, node_id)` constraint and `ON CONFLICT ... DO NOTHING`
produce the explicit results `placed` and `already-placed` without a second
Placement.

Place from Library does not call the migration-v4 Inbox operational view and
does not remove Inbox membership. This is intentionally different from Process
Inbox:

- Process Inbox creates or accepts the Placement and removes membership in one
  atomic v4 operation.
- Place from Library creates or accepts only the Placement; the Node remains
  pending until the user processes it through Inbox.

Migration-v4 views and triggers remain unchanged and localized to Capture and
Process Inbox.

## Remove from Garden

Remove from Garden loads the requested Placement by its persistent ID and then
executes one parameterized `DELETE FROM placements WHERE id = $1`. It does not
delete or update the Node, Inbox membership, Edge, Canvas, or any Resource.
Failure is propagated, and Presentation removes the Garden context only after
the delete succeeds.

An Edge relates `NodeId` to `NodeId`, never Placement to Placement. Removing a
Placement therefore leaves every Edge stored. `loadCanvasView()` asks for
Edges whose two Node endpoints are among that Canvas's current Placements, and
the React Flow adapter independently omits an Edge if either visual Placement
is absent. The same Edge may consequently disappear from one Garden while
remaining visible in another where both Nodes are placed.

Deleting knowledge remains outside scope. There is no Delete Node, Trash,
Archive, cascade policy, or Resource cleanup decision in this slice.

## Persistence and migrations

This slice adds zero migrations and no columns or tables. It uses the existing
`nodes`, `canvases`, `placements`, `edges`, and `inbox_items` structures. Node
persistence gains `list()`. Placement persistence gains a complete list query,
the duplicate-aware insert used by Library, and deletion by Placement ID.

No new atomic multi-write operation is needed: placing is one insert and
removing is one delete. No operational view, trigger, Rust command, transaction
manager, or unit-of-work abstraction is added.

## Manual validation matrix

Use the real Tauri application and preserve the existing database.

1. Open the app with current data.
2. Open Library and confirm it is reachable beside Garden and Inbox.
3. Confirm Nodes currently visible in a Garden also appear in Library.
4. Confirm Nodes pending in Inbox also appear in Library with that context.
5. Capture a content-only Node and confirm Library shows a useful fallback.
6. Edit a Node from Library.
7. Restart and confirm the edit and Node identity persist.
8. Place a Library Node in Garden A.
9. Confirm Garden A shows the same Node rather than a copy.
10. Try placing it in Garden A again and confirm `Already in this Garden`.
11. Place the same Node in Garden B.
12. Confirm Library lists both Gardens and each Garden shows the Node.
13. Remove the Node from Garden A through Library.
14. Confirm it disappears from Garden A only.
15. Confirm it remains in Garden B.
16. Confirm it remains in Library.
17. If it was pending, confirm it remains in Inbox throughout Library place and
    remove actions.
18. For an Edge whose endpoint was removed, confirm Garden A does not render a
    dangling connection.
19. Restart the app.
20. Confirm identity, content, remaining Placements, Inbox membership, and Edge
    behavior persist.
21. Recheck Capture -> Inbox -> Process Inbox, including duplicate placement.
22. Recheck Garden creation/selection, create/edit/move Node, create/select/delete
    Edge, Fit view, and restart recovery.

The manual matrix is intentionally pending until a user runs it in the desktop
WebView. Automated checks do not claim interactive validation.

## Scope maintained

This slice adds no dependency, router, global state, search, filter/sort UI,
pagination, Resource support, tags, folders, lifecycle status, filesystem
behavior, sync, account, AI feature, or final visual design system.
