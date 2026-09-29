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

The real domain model now justifies `src/domain`. Application and Infrastructure
remain conceptual until they contain code that solves a current problem. The
existing `src/App.tsx` is the UI root and `src/main.tsx` remains the frontend
entry point. The `@` alias is intentionally deferred because there are no deep
imports to simplify.

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

## Native boundary

Tauri capabilities must be narrow, explicit, and aligned with real
JardinDigital behavior. The UI must not receive generic APIs for arbitrary SQL,
filesystem access, system commands, or unrestricted operating-system access.
Future native operations should express specific behavior, such as importing a
resource or creating a backup. No native operation is introduced yet.

## Abstraction rule

Before adding an abstraction, answer:

1. What real problem does this solve now?
2. Why is the current solution no longer sufficient?
3. What cost does this abstraction add?

An abstraction is introduced only when the answers justify its immediate cost.

## Decisions intentionally deferred

- SQLite and the SQLite library
- ORM and migrations
- Persistence strategy
- Managed Resource and Linked Resource
- Vault
- Production Canvas composition and interactions
- Global state management
- Router
- Testing beyond the current domain unit tests
- Markdown
- PDF
- Search
- AI
