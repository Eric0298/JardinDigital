import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { captureNode } from "../../application/captureNode";
import type { InboxPersistence } from "../../application/inboxPersistence";
import { loadInbox } from "../../application/loadInbox";
import type { NodePersistence } from "../../application/nodePersistence";
import { persistNodeEdit } from "../../application/nodePersistence";
import {
  placeInboxNodeInCanvas,
  type PlaceInboxNodeDependencies,
} from "../../application/placeInboxNodeInCanvas";
import type { Canvas, CanvasId } from "../../domain/canvas";
import type { Node, NodeId } from "../../domain/node";
import { CaptureForm } from "./CaptureForm";
import { InboxDebugPanel } from "./InboxDebugPanel";
import { InboxList } from "./InboxList";

interface InboxPageProps {
  readonly captureRequest: number;
  readonly dependencies: PlaceInboxNodeDependencies & {
    readonly inboxPersistence: InboxPersistence;
    readonly nodePersistence: NodePersistence;
  };
  readonly gardens: readonly Canvas[];
  readonly onCaptureRequestHandled: () => void;
  readonly onNewGarden: () => void;
  readonly onStatusChange: (status: string) => void;
}

interface EditDraft {
  readonly node: Node;
  readonly title: string;
  readonly content: string;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}

export function InboxPage({
  captureRequest,
  dependencies,
  gardens,
  onCaptureRequestHandled,
  onNewGarden,
  onStatusChange,
}: InboxPageProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [busyNodeId, setBusyNodeId] = useState<NodeId | null>(null);
  const [selectedGardens, setSelectedGardens] = useState<
    Record<string, string>
  >({});
  const editTitle = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    onStatusChange("Opening Inbox...");

    try {
      setNodes(await loadInbox(dependencies.inboxPersistence));
      onStatusChange("Inbox ready.");
    } catch (error) {
      setLoadFailed(true);
      onStatusChange(`Could not open Inbox: ${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [dependencies.inboxPersistence, onStatusChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (captureRequest > 0) {
      setCaptureOpen(true);
      onCaptureRequestHandled();
    }
  }, [captureRequest, onCaptureRequestHandled]);

  useEffect(() => {
    editTitle.current?.focus();
  }, [editDraft?.node.id]);

  async function submitCapture(title: string, content: string) {
    onStatusChange("Capturing idea...");
    try {
      const captured = await captureNode(
        dependencies.inboxPersistence,
        title,
        content,
      );
      setNodes((current) =>
        [...current, captured].sort((left, right) => {
          const leftLabel = (left.title || left.content).toLowerCase();
          const rightLabel = (right.title || right.content).toLowerCase();

          if (leftLabel < rightLabel) return -1;
          if (leftLabel > rightLabel) return 1;
          return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
        }),
      );
      setLoadFailed(false);
      setCaptureOpen(false);
      onStatusChange("Idea captured.");
      return true;
    } catch (error) {
      onStatusChange(`Could not capture idea: ${errorMessage(error)}`);
      return false;
    }
  }

  function saveEdit(event?: FormEvent) {
    event?.preventDefault();
    if (editDraft === null || busyNodeId !== null) {
      return;
    }

    const draft = editDraft;
    setBusyNodeId(draft.node.id);
    onStatusChange("Saving idea...");
    void persistNodeEdit(
      dependencies.nodePersistence,
      draft.node,
      draft.title,
      draft.content,
    )
      .then((edited) => {
        setNodes((current) =>
          current.map((node) => (node.id === edited.id ? edited : node)),
        );
        setEditDraft(null);
        onStatusChange("Idea updated.");
      })
      .catch((error: unknown) => {
        onStatusChange(`Could not update idea: ${errorMessage(error)}`);
        requestAnimationFrame(() => editTitle.current?.focus());
      })
      .finally(() => setBusyNodeId(null));
  }

  function place(node: Node) {
    if (busyNodeId !== null) {
      return;
    }

    const canvasId = (selectedGardens[node.id] ?? gardens[0]?.id) as
      | CanvasId
      | undefined;
    if (canvasId === undefined) {
      onStatusChange("No Gardens available.");
      return;
    }

    setBusyNodeId(node.id);
    onStatusChange("Placing idea...");
    void placeInboxNodeInCanvas(dependencies, node.id, canvasId, { x: 0, y: 0 })
      .then((result) => {
        setNodes((current) =>
          current.filter((candidate) => candidate.id !== node.id),
        );
        onStatusChange(
          result.outcome === "already-placed"
            ? "Already in this Garden. Removed from Inbox."
            : "Placed in Garden.",
        );
      })
      .catch((error: unknown) => {
        onStatusChange(`Could not place idea: ${errorMessage(error)}`);
      })
      .finally(() => setBusyNodeId(null));
  }

  return (
    <section className="inbox-page" aria-label="Inbox">
      <header className="inbox-header">
        <div>
          <p className="eyebrow">Inbox</p>
          <h2>Ideas waiting to be organized</h2>
          <p>Capture now, then place each idea in a Garden when you are ready.</p>
        </div>
        <button type="button" onClick={() => setCaptureOpen(true)}>
          Capture an idea
        </button>
      </header>

      {gardens.length === 0 ? (
        <div className="inbox-garden-notice">
          <div>
            <strong>No Gardens available</strong>
            <p>Create a Garden before placing captured ideas.</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={onNewGarden}
          >
            Create Garden
          </button>
        </div>
      ) : null}

      {loading ? <p className="inbox-loading">Opening Inbox...</p> : null}
      {!loading && loadFailed ? (
        <div className="inbox-empty">
          <h3>Your Inbox could not be opened.</h3>
          <p>Your ideas remain local. Try opening the Inbox again.</p>
          <button type="button" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      ) : null}
      {!loading && !loadFailed && nodes.length === 0 ? (
        <div className="inbox-empty">
          <h3>Nothing waiting to be organized.</h3>
          <p>New captures will stay here until you place them in a Garden.</p>
          <button type="button" onClick={() => setCaptureOpen(true)}>
            Capture an idea
          </button>
        </div>
      ) : null}
      {!loading && !loadFailed && nodes.length > 0 ? (
        <InboxList
          busyNodeId={busyNodeId}
          gardens={gardens}
          nodes={nodes}
          selectedGardens={selectedGardens}
          onEdit={(node) =>
            setEditDraft({ node, title: node.title, content: node.content })
          }
          onGardenChange={(nodeId, canvasId) =>
            setSelectedGardens((current) => ({
              ...current,
              [nodeId]: canvasId,
            }))
          }
          onPlace={place}
        />
      ) : null}

      {captureOpen ? (
        <CaptureForm
          onCancel={() => setCaptureOpen(false)}
          onCapture={submitCapture}
        />
      ) : null}

      {editDraft !== null ? (
        <div className="garden-form-backdrop" role="presentation">
          <section
            className="garden-form-panel capture-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inbox-edit-heading"
          >
            <p className="eyebrow">Inbox</p>
            <h2 id="inbox-edit-heading">Edit idea</h2>
            <form
              onSubmit={saveEdit}
              onKeyDown={(event) => {
                if (event.key === "Escape" && busyNodeId === null) {
                  event.preventDefault();
                  setEditDraft(null);
                } else if (event.key === "Enter" && event.ctrlKey) {
                  event.preventDefault();
                  saveEdit();
                }
              }}
            >
              <label htmlFor="inbox-edit-title">Title</label>
              <input
                id="inbox-edit-title"
                ref={editTitle}
                value={editDraft.title}
                onChange={(event) =>
                  setEditDraft({ ...editDraft, title: event.target.value })
                }
                disabled={busyNodeId !== null}
              />
              <label htmlFor="inbox-edit-content">Content</label>
              <textarea
                id="inbox-edit-content"
                value={editDraft.content}
                onChange={(event) =>
                  setEditDraft({ ...editDraft, content: event.target.value })
                }
                disabled={busyNodeId !== null}
                rows={8}
              />
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditDraft(null)}
                  disabled={busyNodeId !== null}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    busyNodeId !== null ||
                    (editDraft.title.trim().length === 0 &&
                      editDraft.content.trim().length === 0)
                  }
                >
                  Save
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {import.meta.env.DEV && nodes.length > 0 ? (
        <InboxDebugPanel nodes={nodes} />
      ) : null}
    </section>
  );
}
