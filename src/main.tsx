import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { createSqliteCanvasPersistence } from "./infrastructure/sqliteCanvasPersistence";
import { createSqliteEdgePersistence } from "./infrastructure/sqliteEdgePersistence";
import { createSqliteInboxPersistence } from "./infrastructure/sqliteInboxPersistence";
import { createSqliteNodePersistence } from "./infrastructure/sqliteNodePersistence";
import { createSqlitePlacementPersistence } from "./infrastructure/sqlitePlacementPersistence";
import { createNativeOperations } from "./infrastructure/nativeOperations";
import { createSqliteSettingsPersistence } from "./infrastructure/sqliteSettingsPersistence";
import { createSqliteResourcePersistence } from "./infrastructure/sqliteResourcePersistence";
import { createNativeResourceFiles } from "./infrastructure/nativeResourceFiles";
import { createSqliteGardenSummaryQuery } from "./infrastructure/sqliteGardenSummary";

const canvasPersistence = createSqliteCanvasPersistence();
const edgePersistence = createSqliteEdgePersistence();
const inboxPersistence = createSqliteInboxPersistence();
const nodePersistence = createSqliteNodePersistence();
const placementPersistence = createSqlitePlacementPersistence();
const nativeOperations = createNativeOperations();
const settingsPersistence = createSqliteSettingsPersistence();
const resourcePersistence = createSqliteResourcePersistence();
const resourceFiles = createNativeResourceFiles();
const gardenSummaryQuery = createSqliteGardenSummaryQuery();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App
      gardenSummaryQuery={gardenSummaryQuery}
      canvasPersistence={canvasPersistence}
      edgePersistence={edgePersistence}
      inboxPersistence={inboxPersistence}
      nodePersistence={nodePersistence}
      placementPersistence={placementPersistence}
      nativeOperations={nativeOperations}
      settingsPersistence={settingsPersistence}
      resourcePersistence={resourcePersistence}
      resourceFiles={resourceFiles}
    />
  </React.StrictMode>,
);
