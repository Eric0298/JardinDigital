import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { createSqliteNodePersistence } from "./infrastructure/sqliteNodePersistence";

const nodePersistence = createSqliteNodePersistence();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App nodePersistence={nodePersistence} />
  </React.StrictMode>,
);
