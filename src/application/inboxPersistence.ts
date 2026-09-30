import type { Node, NodeId } from "../domain/node";
import type { Placement } from "../domain/placement";

export type PlaceInboxNodePersistenceResult = "placed" | "already-placed";

export interface InboxPersistence {
  capture(node: Node): Promise<void>;
  list(): Promise<Node[]>;
  contains(nodeId: NodeId): Promise<boolean>;
  place(placement: Placement): Promise<PlaceInboxNodePersistenceResult>;
}

export class InboxPersistenceError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "InboxPersistenceError";
    this.cause = cause;
  }
}
