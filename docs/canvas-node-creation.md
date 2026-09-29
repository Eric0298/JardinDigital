# Canvas Node Creation

## Scope

This slice adds the first persistent knowledge-creation interaction to the
temporary Canvas UI. With a Canvas loaded, a double click on empty pane space
opens a small title input at that point. Enter confirms and Escape cancels.
Double clicks on Nodes or other interactive elements do not use the pane
handler and therefore do not begin creation.

## Coordinates and presentation

The pane event supplies client coordinates only as input to React Flow's
official `screenToFlowPosition()` API. The converted Flow coordinates are sent
to Application and become `Placement.position`; raw `clientX`/`clientY` values
are never persisted. The conversion accounts for the current pan and zoom.

The input's screen-relative coordinates are temporary UI state used only to
draw it next to the selected point. After successful persistence, the new
Domain Node and Placement pass through the existing `toReactFlowNode()` mapping
and are appended to the loaded view. React does not create an alternative
React Flow representation or become another persistent source of truth.

## Application flow

`createNodeInCanvas(dependencies, canvasId, title, position)` performs this
sequence:

1. `createNode(title, "")` applies Domain normalization and invariants.
2. `NodePersistence.save(node)` persists the Node.
3. `createPlacement(canvasId, node.id, position)` creates the Placement in
   Domain.
4. `PlacementPersistence.save(placement)` persists the Placement.
5. The use case returns the Domain `{ node, placement }` pair.

The use case has no React Flow or SQL dependency. Whitespace-only input is
rejected by `createNode()` and creates no persisted data. Escape closes the
ephemeral input without invoking the use case or writing to SQLite.

## Failure and atomicity

The UI reports `Creating...`, `Created.`, or the propagated error and only adds
the visual Node after both saves succeed. A failed creation is never shown as
successful.

The two writes are sequential and are **not transactional**. If saving the Node
fails, no Placement is created or saved. If saving the Placement fails after
the Node save succeeds, the Node may remain persisted without a Placement and
will therefore not appear in the Canvas view. No compensating delete is
attempted because deletion does not exist yet. A small Infrastructure-local
transaction could be evaluated in a future slice, but the current narrow
persistence ports expose no transaction boundary and were not redesigned here.
