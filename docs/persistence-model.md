# JardinDigital Local Persistence Model

## 1. Objective

This document defines the minimum local-persistence architecture before any
database, filesystem adapter, repository, or native command is implemented. It
describes what must survive application sessions and the boundaries that will
keep Domain independent from storage and UI technology.

## 2. Principles

- JardinDigital is single-user, local-first, privacy-first, and usable offline
  whenever its referenced files are locally available.
- Application-generated identities are stable and independent from SQLite.
- Structured knowledge and binary files have different storage needs.
- Large files are never stored as SQLite BLOBs.
- React Flow objects and transient UI state are never the persistence model.
- Persistence is added in narrow vertical slices, driven by a current use case.
- Regenerable data is not treated as essential user data.
- No visible Vault, server, account, cloud, or local AI model is required.

## 3. Persistent inventory

All current properties describe user knowledge or stable relationships and
therefore belong to the initial persistent model. This is a conceptual
inventory, not a SQL schema.

| Entity | Property | Persist? | Reason |
|---|---|---:|---|
| Node | `id` | Yes | Stable identity is required across sessions and by references. |
| Node | `title` | Yes | It is user-authored knowledge. |
| Node | `content` | Yes | It is user-authored knowledge. |
| Edge | `id` | Yes | The relationship needs stable identity. |
| Edge | `sourceNodeId` | Yes | It identifies the relationship source. |
| Edge | `targetNodeId` | Yes | It identifies the relationship target. |
| Resource | `id` | Yes | The resource concept needs stable identity. |
| Resource | `title` | Yes | It is user-authored resource metadata. |
| Canvas | `id` | Yes | Canvases must remain distinguishable across sessions. |
| Canvas | `title` | Yes | It is user-authored organization metadata. |
| Placement | `id` | Yes | The placement needs stable identity. |
| Placement | `canvasId` | Yes | It associates the placement with a Canvas. |
| Placement | `nodeId` | Yes | It associates the placement with a Node. |
| Placement | `position.x` | Yes | It is durable organization chosen by the user. |
| Placement | `position.y` | Yes | It is durable organization chosen by the user. |

Future properties are not implied by this list. In particular, dates, deletion
state, file locations, and resource associations remain undecided.

## 4. Ephemeral state

Interaction state stays outside initial persistence: selection, dragging,
hover, focus, a temporary marquee, active handles, open context menus,
in-progress edits, form state, visual errors, loading state, calculated
dimensions, DOM references, and all React Flow objects. These values may exist
in UI memory; their presence in a library object does not make them user data.

Only a completed user action may produce a persistent domain change, such as a
confirmed Node edit or a final Placement position.

## 5. Identity and rehydration

Creation and rehydration are different operations:

```text
New entity: validated user input -> generate new application UUID -> entity
Rehydrated entity: stored identity + stored values -> validate -> same entity ID
```

The current `createNode`, `createEdge`, `createResource`, `createCanvas`, and
`createPlacement` functions generate identities for new entities. The
implemented Node, Edge, Canvas, and Placement load paths instead use
entity-specific rehydration functions so stored identities and references
survive unchanged.

Each rehydration function accepts existing IDs and current values, normalizes
or validates them with the entity's invariant rules, and returns those IDs
unchanged. `movePlacement` likewise preserves Placement, Canvas, and Node
identity while replacing only the validated finite position. These are not
generic factories; Resource rehydration remains deferred.

Domain invariants still apply during rehydration. Stored data can be old,
corrupt, manually altered, or produced by faulty code; turning invalid rows
into apparently valid domain entities would hide the problem. Invalid data
must produce an explicit load error rather than a new identity or silent
repair. Cross-entity existence checks, such as whether an Edge endpoint exists,
belong to the loading/use-case boundary once those rules are defined.

## 6. SQLite and filesystem responsibilities

| Responsibility | SQLite | Filesystem |
|---|---:|---:|
| Entities and scalar properties | Yes | No |
| Relationships and references | Yes | No |
| Placement coordinates | Yes | No |
| Future structured metadata/settings | When justified | No |
| Large binary files | No | Yes |
| Managed Resource contents | Metadata/reference only | Yes |
| Linked Resource contents | Reference only | External file remains in place |
| Regenerable previews and cache | Metadata only if needed | Yes |
| Future backups and exports | Source data | Destination/package contents |

SQLite is responsible for structured, queryable state and transactional
consistency. The filesystem is responsible for byte-oriented content. Large
files as SQLite BLOBs: **no**. Migration v1 contains the Node fields `id`,
`title`, and `content`. Migration v2 adds Canvas `id/title` and Placement
`id/canvas_id/node_id/x/y`, with foreign keys to Canvas and Node plus
`UNIQUE(canvas_id, node_id)`. Migration v3 adds Edge
`id/source_node_id/target_node_id`, with both endpoints referencing Node and no
Canvas or Placement identity. Migration v4 adds `inbox_items(node_id)` as a
foreign-key membership relation. It stores no duplicate Node content, status,
timestamp, position, or metadata; its atomic Capture and Inbox-to-Placement
commands are detailed in [`capture-inbox.md`](./capture-inbox.md).

## 7. Resource

The current domain `Resource` remains only `id` and `title`. That concept is
distinct from storage information.

- Domain owns the resource identity and the meaning currently expressed by its
  title.
- Infrastructure/persistence may later own how bytes are located, whether they
  are managed or linked, and the stored locator needed to open them.
- Application use cases will coordinate Resource behavior without exposing raw
  paths or storage primitives to Domain.

It remains undecided whether storage mode or any file metadata eventually has
domain meaning. A `Resource.path` property is not assumed. Resource kind,
Node/Resource association, metadata, and import behavior wait for real use
cases.

## 8. Managed and Linked Resources

| Aspect | Managed Resource | Linked Resource |
|---|---|---|
| File ownership | JardinDigital keeps a controlled copy | The original file remains externally owned |
| Storage use | Duplicates file bytes | Adds negligible storage overhead |
| Availability | Stable while app data is intact | Depends on the external path/device |
| Portability | Portable when its bytes are included | Reference may not resolve elsewhere |
| Backup | Straightforward to include | External bytes excluded by default |
| Main benefit | Reliability and self-contained data | Lightweight handling, especially for large files |
| Main cost | Increased storage | Broken or unavailable links require relink |

The distinction applies consistently to PDFs, images, videos, and other files;
there is no MIME-type rule matrix. Managed and Linked describe storage policy,
not separate domain Resource types at this stage.

## 9. Recommended default policy

**Proposed default: Linked.** Adding a file references it in place. The user
may explicitly choose a clear “copy into JardinDigital” action to make it
Managed.

This simple two-choice policy best serves lightweight-first and avoids silent
duplication, particularly for videos and large PDFs. Always asking would add
friction; Managed by default would consume storage unexpectedly; automatic
size- or type-based behavior would be hard to predict. The UI must explain
that a Linked file depends on its original location, while the explicit Managed
choice trades storage for reliability and portability. The default can be
revisited with observed usage, not speculative thresholds.

## 10. Relink

The minimum future behavior for an unavailable Linked Resource is:

```text
Stored reference cannot be resolved
  -> show Resource as unavailable without deleting it
  -> user chooses Relink
  -> native file picker selects a replacement
  -> validate the selection as required by that use case
  -> update the stored reference
  -> Resource becomes available
```

No whole-disk search, watcher, mass hashing, or synchronization is implied.
Cancellation leaves the prior reference and unavailable state intact.

## 11. internal App Data and a portable Vault

Internal App Data is the operating-system-appropriate private location for
JardinDigital's operational database and future managed files. The implemented
Node database is `jardindigital.db`, resolved by the official Tauri SQL plugin
below its AppConfig directory. The application chooses and controls it; users
should not need to manage it for normal use.

A visible Vault or portable Workspace would be a separate future product
capability for moving, exporting, or backing up a self-contained garden. It is
not automatically the live App Data directory.

**Does V0.1 need a visible Vault? Not yet.** It solves no current validated use
case and would force premature path, locking, portability, and migration
decisions.

## 12. Path rules

- Managed file references should be relative to a JardinDigital-controlled
  storage root so that the root can move without rewriting every reference.
- Linked files require an external locator capable of identifying the original
  local file. Persistence should treat it as platform-owned data and native
  code should resolve it; UI and Domain should not concatenate path strings.
- Stored data must not assume Windows separators or casing semantics where a
  platform-neutral representation is possible.
- Paths must be validated against the operation's allowed scope at the native
  boundary.

The exact locator format, normalization rules, directory names, custom URI
schemes, and filesystem abstractions are deliberately deferred.

## 13. Portability

Node, Edge, Canvas, Placement, and current Resource metadata are structurally
portable once an export format exists. Managed Resource bytes are portable
when included with their relative references. Linked Resource metadata can be
moved, but its external locator may be invalid on another computer or operating
system; its bytes are not portable unless the user explicitly includes or
relinks them. Cache and previews are unnecessary for portability.

## 14. Backup principles

A backup must represent one consistent point in time across essential data.

- With the application closed, copying a confirmed closed database and its
  Managed Resources can be safe once the physical layout is defined.
- With the application open, blindly copying `garden.sqlite` is not safe. The
  implementation must use a SQLite-supported backup/snapshot mechanism and
  coordinate Managed Resource changes.
- Essential backup content is structured data plus Managed Resources.
- Linked Resource references belong to structured data, but external file bytes
  are not copied by default without an explicit user decision.
- Regenerable previews and cache are excluded.

Backup format, UI, retention, scheduling, and restore behavior remain future
decisions.

## 15. Cache and previews

Future previews and caches are regenerable, non-essential, size-limitable,
deletable, and excluded from backup. No generation service, eviction algorithm,
worker, size limit, or scheduler is designed in this phase.

## 16. Tauri boundary

The frontend may request narrow operations that express JardinDigital use
cases. React calls Application functions through Node-, Edge-, Canvas-, and
Placement-specific persistence ports. Infrastructure adapters own the official
Tauri SQL binding, parameterized SQL, and row rehydration, while one small
Infrastructure module owns the shared lazy `Database.load()` and connection
URL. Filesystem operations and future resource behavior remain native boundary
concerns.

- Arbitrary SQL from UI: **no**.
- Arbitrary filesystem access from UI: **no**.
- Arbitrary system commands from UI: **no**.

Command names and payload shapes will be defined with their first real use
case. No native operation is introduced by this design.

## 17. Rule for repositories

Generic repositories: **no**. Current use cases justify four narrow ports:
Node and Canvas each expose only `save/load`; Placement exposes
`save/load/loadForCanvas`; Edge exposes `save/loadBetweenNodes`. They decouple
Application from SQLite without a base repository, factory, manager, or query
framework.
Before adding one, answer:

1. What current problem does it solve?
2. Why is the direct, narrow solution no longer sufficient?
3. What implementation and maintenance cost does it add?

The existence of five entities does not justify five repositories. Generic
repositories, base repositories, factories, and repository managers are not
planned.

## 18. First vertical persistence flow

```text
Create a valid Node
  -> persist it
  -> close and reopen JardinDigital
  -> load the same Node with the same ID
  -> edit it
  -> persist the change
  -> reload and verify the same ID and edited values
```

This flow is implemented and was validated across a complete application
close/reopen on 2026-09-29. SQLite storage, rehydration, invariant validation,
stable identity, upsert behavior, and reload succeeded. Implementation details
and the observed result are recorded in
[`sqlite-vertical-slice.md`](./sqlite-vertical-slice.md). Filesystem concerns
from that historical slice.

## 19. Incremental order after Edge

1. **Resource**: comes later because storage mode, file operations, and its
   relationship with Node still need validated use cases.

Each step should be a complete vertical slice with its own load/save behavior
and tests. Dependency order, not table count, determines sequencing.

## 20. Decisions deferred

The following remain open until a concrete use case supplies constraints:

- SQL schemas, indexes, foreign keys, and migrations beyond Node, Edge, Canvas,
  and Placement;
- transactional orchestration for multi-entity operations; the current demo
  Canvas creation is intentionally sequential and non-transactional;
- timestamps, lifecycle semantics, soft delete, deletion, and cascades;
- Edge editing/deletion and aggregate boundaries;
- Node/Resource association and cardinality;
- Resource kinds, whether storage mode has domain meaning, file metadata,
  import behavior, and exact storage records;
- hashing, deduplication, watchers, automatic relocation, and synchronization;
- preview generation, cache layout, and cache limits;
- physical App Data layout beyond the plugin-managed Node database and exact
  path representation for future resources;
- visible Vault/Workspace behavior;
- export/import formats, backup format/UI, and restore behavior;
- filesystem abstraction;
- cloud sync, accounts, servers, and conflict resolution;
- AI, embeddings, and local models.

Deferral is intentional: none is required to design or validate the first Node
persistence slice.
