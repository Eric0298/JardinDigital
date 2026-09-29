import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { createSqliteCanvasPersistence } from "./infrastructure/sqliteCanvasPersistence";
import { createSqliteNodePersistence } from "./infrastructure/sqliteNodePersistence";
import { createSqlitePlacementPersistence } from "./infrastructure/sqlitePlacementPersistence";

const canvasPersistence = createSqliteCanvasPersistence();
const nodePersistence = createSqliteNodePersistence();
const placementPersistence = createSqlitePlacementPersistence();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App
      canvasPersistence={canvasPersistence}
      nodePersistence={nodePersistence}
      placementPersistence={placementPersistence}
    />
  </React.StrictMode>,
);
