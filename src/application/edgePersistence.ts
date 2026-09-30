import type { Edge, EdgeId } from "../domain/edge";
import type { NodeId } from "../domain/node";

export interface EdgePersistence {
  save(edge: Edge): Promise<void>;
  loadBetweenNodes(nodeIds: readonly NodeId[]): Promise<Edge[]>;
  delete(id: EdgeId): Promise<void>;
}

export class EdgePersistenceError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "EdgePersistenceError";
    this.cause = cause;
  }
}

export class InvalidPersistedEdgeError extends EdgePersistenceError {
  constructor(cause: unknown) {
    super("Persisted Edge data is invalid.", cause);
    this.name = "InvalidPersistedEdgeError";
  }
}

export async function deleteEdge(
  persistence: Pick<EdgePersistence, "delete">,
  edgeId: EdgeId,
): Promise<void> {
  await persistence.delete(edgeId);
}
