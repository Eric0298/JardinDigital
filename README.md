# JardinDigital

JardinDigital is an open-source, local-first desktop application for visually
capturing, connecting, and developing ideas in a personal digital garden.

The project is in early development and is not ready for production use.

## Principles

- Local-first
- Offline-first
- Privacy-first
- Lightweight-first
- Open source

JardinDigital stores implemented persistent data locally and does not require
an account, cloud service, or remote server.

## Current state

Implemented:

- framework-independent domain models for Node, Edge, Canvas, Placement, and
  Resource;
- local SQLite persistence for Nodes, Canvases, Placements, and Edges while
  preserving their identities;
- Tauri 2 desktop foundation with React and TypeScript;
- a Garden workspace that opens existing Canvases without technical IDs and
  supports creating and switching Gardens;
- a React Flow Canvas for creating, editing, moving, and connecting ideas,
  including directed connections, connection deletion, and restart recovery.

Planned, but not implemented as product features yet:

- Capture and Library experiences;
- Resource management and Managed/Linked file behavior;
- backup, import/export, search, and other later capabilities.

## Technology

The current stack is Tauri 2, React, TypeScript, Vite, SQLite through the
official Tauri SQL plugin, and React Flow in Presentation/UI.

## Author and license

Created by Eric Mancebo.

Copyright © 2026 Eric Mancebo.

Licensed under GNU AGPL v3 (`AGPL-3.0-only`).
