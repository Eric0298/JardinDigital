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
- local SQLite persistence for creating, loading, and editing Nodes while
  preserving their identity;
- Tauri 2 desktop foundation with React and TypeScript;
- React Flow adopted as the initial Presentation/UI implementation for the
  future two-dimensional Canvas.

Planned, but not implemented as product features yet:

- the production Canvas and persistent Placement workflow;
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
