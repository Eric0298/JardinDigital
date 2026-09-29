# Canvas Node Editing

## Scope

This slice turns a rendered Node into an editable piece of knowledge while
preserving the Canvas and Placement behavior already implemented. A click uses
React Flow's transient selection state. A double click on a Node opens the
title/content editor; a double click on empty pane space continues to open the
quick Node-creation input.

Selection and in-progress form values are Presentation state only. They are
not added to Domain, SQLite, or the React Flow adapter's persistent input.

## Editing flow

The editor uses a single-line `input` for `title` and a multiline `textarea`
for `content`. The explicit Save button and `Ctrl+Enter` both call the existing
Application `persistNodeEdit()` use case. Normal Enter in the textarea inserts
a newline. Escape closes the editor and discards its draft without calling
persistence.

```text
double click Node
  -> title/content draft in Presentation
  -> persistNodeEdit()
  -> Domain editNode()
  -> NodePersistence.save()
  -> update the Node in the local CanvasView
  -> existing React Flow adapter
  -> refreshed visual Node
```

If Domain rejects the edit or persistence fails, the persisted Node and the
loaded `CanvasView` remain unchanged. The editor stays open with the user's
draft and the UI reports the error.

## Identity and Placement

`editNode()` owns normalization and preserves the existing `NodeId`.
`persistNodeEdit()` saves that edited Node through the existing Node port. It
does not load, create, move, or save a Placement. Consequently `PlacementId`,
`CanvasId`, and `Placement.position` stay unchanged.

## Presentation

The Canvas uses a Presentation-only custom React Flow Node to show the title,
an optional short visual preview of the full content, and selected styling.
The preview is limited only by CSS; Domain and SQLite retain the complete
content. While the editor is open, Node dragging is disabled so selecting and
typing text cannot move a Placement accidentally.

Development-only loading controls, Canvas/Node/Placement identities, and
positions remain available under a collapsed `Debug / Technical details`
section so the active Canvas remains the visual focus.
