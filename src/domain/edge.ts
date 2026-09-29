import type { NodeId } from "./node";

declare const edgeIdBrand: unique symbol;

export type EdgeId = string & { readonly [edgeIdBrand]: "EdgeId" };

export interface Edge {
  readonly id: EdgeId;
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
}

const APPLICATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateReferences(sourceNodeId: string, targetNodeId: string) {
  if (sourceNodeId.trim().length === 0) {
    throw new Error("Edge sourceNodeId must not be empty.");
  }

  if (targetNodeId.trim().length === 0) {
    throw new Error("Edge targetNodeId must not be empty.");
  }
}

export function createEdge(sourceNodeId: NodeId, targetNodeId: NodeId): Edge {
  validateReferences(sourceNodeId, targetNodeId);

  return {
    id: globalThis.crypto.randomUUID() as EdgeId,
    sourceNodeId,
    targetNodeId,
  };
}

export function rehydrateEdge(
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
): Edge {
  if (!APPLICATION_ID_PATTERN.test(id)) {
    throw new Error("Edge id must be a valid application UUID.");
  }

  if (!APPLICATION_ID_PATTERN.test(sourceNodeId)) {
    throw new Error("Edge sourceNodeId must be a valid application UUID.");
  }

  if (!APPLICATION_ID_PATTERN.test(targetNodeId)) {
    throw new Error("Edge targetNodeId must be a valid application UUID.");
  }

  validateReferences(sourceNodeId, targetNodeId);

  return {
    id: id as EdgeId,
    sourceNodeId: sourceNodeId as NodeId,
    targetNodeId: targetNodeId as NodeId,
  };
}
