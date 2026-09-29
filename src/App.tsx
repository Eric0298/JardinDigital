import { useState, type FormEvent } from "react";
import {
  createPersistedNode,
  InvalidPersistedNodeError,
  loadPersistedNode,
  NodePersistenceError,
  persistNodeEdit,
  type NodePersistence,
} from "./application/nodePersistence";
import type { Node, NodeId } from "./domain/node";
import "./App.css";

interface AppProps {
  nodePersistence: NodePersistence;
}

function errorMessage(error: unknown) {
  if (error instanceof InvalidPersistedNodeError) {
    return "Invalid persisted data: the stored row is not a valid Node.";
  }

  if (error instanceof NodePersistenceError) {
    return `Persistence error: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error.";
}

function App({ nodePersistence }: AppProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loadId, setLoadId] = useState("");
  const [currentNode, setCurrentNode] = useState<Node | null>(null);
  const [status, setStatus] = useState("Ready.");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function create(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const node = await createPersistedNode(nodePersistence, title, content);
      setCurrentNode(node);
      setLoadId(node.id);
      setTitle(node.title);
      setContent(node.content);
      setStatus("Node created and persisted.");
    });
  }

  function load(id: string) {
    void run(async () => {
      const normalizedId = id.trim();
      if (normalizedId.length === 0) {
        throw new Error("Enter a Node ID to load.");
      }

      const node = await loadPersistedNode(
        nodePersistence,
        normalizedId as NodeId,
      );

      if (node === null) {
        setCurrentNode(null);
        setStatus("Node not found.");
        return;
      }

      setCurrentNode(node);
      setLoadId(node.id);
      setTitle(node.title);
      setContent(node.content);
      setStatus("Node loaded from SQLite.");
    });
  }

  function saveEdit() {
    if (currentNode === null) {
      setStatus("Load or create a Node before saving an edit.");
      return;
    }

    void run(async () => {
      const node = await persistNodeEdit(
        nodePersistence,
        currentNode,
        title,
        content,
      );
      setCurrentNode(node);
      setStatus("Node edit persisted.");
    });
  }

  return (
    <main className="slice">
      <header>
        <p className="eyebrow">Technical validation</p>
        <h1>Persistence Vertical Slice</h1>
        <p>Create, save, reload, edit, and reload one JardinDigital Node.</p>
      </header>

      <section aria-labelledby="node-editor-heading">
        <h2 id="node-editor-heading">Node values</h2>
        <form onSubmit={create}>
          <label>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            Content
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={busy}
              rows={5}
            />
          </label>
          <div className="actions">
            <button type="submit" disabled={busy}>
              Create and persist new Node
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={busy || currentNode === null}
            >
              Persist edit
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="node-loader-heading">
        <h2 id="node-loader-heading">Load from SQLite</h2>
        <label>
          Node ID
          <input
            value={loadId}
            onChange={(event) => setLoadId(event.target.value)}
            disabled={busy}
            placeholder="Paste the ID after restarting"
          />
        </label>
        <div className="actions">
          <button type="button" onClick={() => load(loadId)} disabled={busy}>
            Load by ID
          </button>
          <button
            type="button"
            onClick={() => currentNode && load(currentNode.id)}
            disabled={busy || currentNode === null}
          >
            Reload current Node
          </button>
        </div>
      </section>

      <section className="result" aria-live="polite">
        <h2>Observed result</h2>
        <p>
          <strong>Status:</strong> {status}
        </p>
        <p>
          <strong>Current ID:</strong>{" "}
          <output>{currentNode?.id ?? "None"}</output>
        </p>
      </section>
    </main>
  );
}

export default App;
