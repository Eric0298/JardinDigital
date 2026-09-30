import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { createSqliteCanvasPersistence } from "./infrastructure/sqliteCanvasPersistence";
import { createSqliteEdgePersistence } from "./infrastructure/sqliteEdgePersistence";
import { createSqliteInboxPersistence } from "./infrastructure/sqliteInboxPersistence";
import { createSqliteNodePersistence } from "./infrastructure/sqliteNodePersistence";
import { createSqlitePlacementPersistence } from "./infrastructure/sqlitePlacementPersistence";

const canvasPersistence = createSqliteCanvasPersistence();
const edgePersistence = createSqliteEdgePersistence();
const inboxPersistence = createSqliteInboxPersistence();
const nodePersistence = createSqliteNodePersistence();
const placementPersistence = createSqlitePlacementPersistence();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App
      canvasPersistence={canvasPersistence}
      edgePersistence={edgePersistence}
      inboxPersistence={inboxPersistence}
      nodePersistence={nodePersistence}
      placementPersistence={placementPersistence}
    />
  </React.StrictMode>,
);
