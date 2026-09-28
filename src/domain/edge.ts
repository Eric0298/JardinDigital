import type { NodeId } from "./node";

declare const edgeIdBrand: unique symbol;

export type EdgeId = string & { readonly [edgeIdBrand]: "EdgeId" };

export interface Edge {
  readonly id: EdgeId;
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
}

export function createEdge(sourceNodeId: NodeId, targetNodeId: NodeId): Edge {
  if (sourceNodeId.trim().length === 0) {
    throw new Error("Edge sourceNodeId must not be empty.");
  }

  if (targetNodeId.trim().length === 0) {
    throw new Error("Edge targetNodeId must not be empty.");
  }

  return {
    id: globalThis.crypto.randomUUID() as EdgeId,
    sourceNodeId,
    targetNodeId,
  };
}
