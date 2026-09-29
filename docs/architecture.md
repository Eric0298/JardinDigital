# JardinDigital Architecture

## Principles

- Local-first
- Offline-first
- Privacy-first
- Lightweight-first
- Open source
- Zero mandatory infrastructure cost

## Architectural boundaries

The following boundaries describe responsibilities and dependency direction.
They are conceptual: a physical directory is created only when it contains
code that solves a current problem.

- **Domain** represents JardinDigital concepts and business rules. It remains
  independent of frameworks, storage, operating-system APIs, and UI concerns.
- **Application** coordinates user-facing actions and may depend on Domain. It
  does not contain Canvas-specific presentation logic.
- **Infrastructure** contains technical implementations such as persistence,
  filesystem access, imports, backups, and Tauri integration when those needs
  become real.
- **UI** is the React presentation layer: views, components, styles, and user
  interaction. It must not define JardinDigital's persistent model.

The real domain model lives in `src/domain`. The first Node persistence flow now
justifies `src/application`, containing its narrow persistence port and use-case
functions, and `src/infrastructure`, containing the SQLite implementation.
`src/App.tsx` remains the UI root and `src/main.tsx` is both the frontend entry
point and the composition root that injects the concrete adapter. The `@` alias
is intentionally deferred because there are no deep imports to simplify.

## Dependency rules

The intended dependency direction is:

```text
UI -> Application -> Domain
```

- Domain is independent.
- Application may depend on Domain.
- UI uses Application when real use cases exist.
- Infrastructure provides technical implementations required by Application.
- Infrastructure may depend inward; Domain never depends on Infrastructure.
- Domain does not depend on UI, React, Tauri, SQLite, or React Flow.
- No dependency cycles are allowed.

## Canvas independence

`@xyflow/react` is the initial implementation selected for JardinDigital's
two-dimensional Canvas. It belongs exclusively to Presentation/UI and does not
define the Domain or the persistent model.

JardinDigital's Node, Edge, Canvas, and Placement remain its own models. A
JardinDigital Node is not a React Flow Node, a JardinDigital Edge is not a
React Flow Edge, a JardinDigital Canvas is not a React Flow instance, and a
Placement is not React Flow visual state. Persistent position belongs
conceptually to Placement.

The conceptual translation direction is:

```text
Domain -> Canvas adapter -> React Flow
```

The adapter lives outside Domain. React Flow objects must never be persisted
directly. These boundaries keep React Flow replaceable without requiring a
Domain or stored-data migration.

## Persistent state vs UI state

Persistent state belongs to the user's garden and survives sessions. Future
examples include nodes, connections, resources, content, persistent positions,
and persistent settings.

UI state is temporary interaction state. Examples include hover, an open
context menu or modal, current selection, active tools, and transient visual
states. UI state must not be persisted merely because the interface uses it.
No global state library is justified at this stage.

## Persistence direction

Local persistence separates structured state from file content. The first
implemented slice stores Node data in SQLite through the official Tauri 2 SQL
plugin. Future slices may add justified entities, relationships, positions,
and structured metadata. Binary Resource content belongs on the filesystem and
large files must not be stored as SQLite BLOBs. Linked Resources are the
lightweight-first default; a Managed copy is an explicit user choice.

Application-generated IDs must survive rehydration unchanged, and domain
invariants remain valid at the load boundary. Internal App Data is sufficient
for the initial product; a user-visible Vault is a distinct, deferred feature.
The database uses the plugin's OS-specific AppConfig location and an official
versioned migration. The detailed general model is recorded in
[`persistence-model.md`](./persistence-model.md); the implemented Node slice is
recorded in [`sqlite-vertical-slice.md`](./sqlite-vertical-slice.md).

## Native boundary

Tauri capabilities must be narrow, explicit, and aligned with real
JardinDigital behavior. The Node slice grants only the official SQL plugin's
default load/select/close set and execute permission. React components do not
import the plugin or contain SQL; SQL is centralized in the infrastructure
adapter. The plugin permissions are command-granular, so future behavior that
needs a narrower security boundary may justify dedicated native commands. No
filesystem, shell, HTTP, or dialog capability is granted.

## Abstraction rule

Before adding an abstraction, answer:

1. What real problem does this solve now?
2. Why is the current solution no longer sufficient?
3. What cost does this abstraction add?

An abstraction is introduced only when the answers justify its immediate cost.

## Decisions intentionally deferred

- Schemas and migrations beyond the implemented Node table
- Physical storage layout and path representation beyond the plugin-managed
  Node database
- User-visible Vault and portable Workspace behavior
- Resource associations, types, and storage metadata
- Backup, import/export, previews, and cache implementation
- Production Canvas composition and interactions
- Global state management
- Router
- Testing beyond the current domain unit tests
- Markdown
- PDF
- Search
- AI
