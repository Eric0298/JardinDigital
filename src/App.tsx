import { useCallback, useEffect, useMemo, useState } from "react";
import type { CanvasViewDependencies } from "./application/canvasView";
import {
  createGarden,
  loadGardenStartup,
} from "./application/gardenStartup";
import type { Canvas, CanvasId } from "./domain/canvas";
import { CreateGardenForm } from "./presentation/garden/CreateGardenForm";
import { GardenPage } from "./presentation/garden/GardenPage";
import { ProductShell } from "./presentation/shell/ProductShell";
import "@xyflow/react/dist/style.css";
import "./App.css";

interface AppProps extends CanvasViewDependencies {}

type StartupState = "loading" | "ready" | "error";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}

function App({
  canvasPersistence,
  edgePersistence,
  nodePersistence,
  placementPersistence,
}: AppProps) {
  const dependencies = useMemo(
    () => ({
      canvasPersistence,
      edgePersistence,
      nodePersistence,
      placementPersistence,
    }),
    [
      canvasPersistence,
      edgePersistence,
      nodePersistence,
      placementPersistence,
    ],
  );
  const [startupState, setStartupState] =
    useState<StartupState>("loading");
  const [gardens, setGardens] = useState<Canvas[]>([]);
  const [activeGarden, setActiveGarden] = useState<Canvas | null>(null);
  const [creatingGarden, setCreatingGarden] = useState(false);
  const [status, setStatus] = useState("Opening your Gardens…");

  const openStartup = useCallback(async () => {
    setStartupState("loading");
    setStatus("Opening your Gardens…");

    try {
      const startup = await loadGardenStartup(canvasPersistence);
      setGardens(startup.gardens);
      setActiveGarden(startup.initialGarden);
      setStartupState("ready");
      setStatus(
        startup.initialGarden === null
          ? "Ready for your first Garden."
          : "Garden found.",
      );
    } catch (error) {
      setStartupState("error");
      setStatus(`Could not open Gardens: ${errorMessage(error)}`);
    }
  }, [canvasPersistence]);

  useEffect(() => {
    void openStartup();
  }, [openStartup]);

  const updateStatus = useCallback((nextStatus: string) => {
    setStatus(nextStatus);
  }, []);

  function selectGarden(id: CanvasId) {
    const selected = gardens.find((garden) => garden.id === id);

    if (selected !== undefined) {
      setActiveGarden(selected);
    }
  }

  async function submitGarden(title: string) {
    setStatus("Creating Garden…");

    try {
      const created = await createGarden(canvasPersistence, title);
      const refreshed = await canvasPersistence.list();
      setGardens(refreshed);
      setActiveGarden(
        refreshed.find((garden) => garden.id === created.id) ?? created,
      );
      setCreatingGarden(false);
      setStatus("Garden created.");
      return true;
    } catch (error) {
      setStatus(`Could not create Garden: ${errorMessage(error)}`);
      return false;
    }
  }

  return (
    <ProductShell status={status}>
      {startupState === "loading" ? (
        <section className="startup-state" aria-live="polite">
          <p className="eyebrow">Garden</p>
          <h2>Opening your workspace…</h2>
        </section>
      ) : null}

      {startupState === "error" ? (
        <section className="startup-state">
          <p className="eyebrow">Garden</p>
          <h2>Your Gardens could not be opened</h2>
          <p>Your knowledge remains local. Try opening it again.</p>
          <button type="button" onClick={() => void openStartup()}>
            Try again
          </button>
        </section>
      ) : null}

      {startupState === "ready" && activeGarden === null ? (
        <section className="startup-state startup-state--empty">
          <p className="eyebrow">Garden</p>
          <h2>Your garden is empty</h2>
          <p>Create a visual space for the ideas you want to cultivate.</p>
          <button type="button" onClick={() => setCreatingGarden(true)}>
            Create my first Garden
          </button>
        </section>
      ) : null}

      {startupState === "ready" && activeGarden !== null ? (
        <GardenPage
          activeGarden={activeGarden}
          dependencies={dependencies}
          gardens={gardens}
          onGardenChange={selectGarden}
          onNewGarden={() => setCreatingGarden(true)}
          onStatusChange={updateStatus}
        />
      ) : null}

      {creatingGarden ? (
        <CreateGardenForm
          canCancel={gardens.length > 0}
          onCancel={() => setCreatingGarden(false)}
          onCreate={submitGarden}
        />
      ) : null}
    </ProductShell>
  );
}

export default App;
