import type { Node as ReactFlowNode } from "@xyflow/react";
import type { Node } from "../../domain/node";
import type { Placement, PlacementId } from "../../domain/placement";

export type CanvasFlowNode = ReactFlowNode<{
  label: string;
  content: string;
  nodeId: string;
  placementId: PlacementId;
}>;

export function toReactFlowNode(
  node: Node,
  placement: Placement,
): CanvasFlowNode {
  if (node.id !== placement.nodeId) {
    throw new Error("Node and Placement identities do not match.");
  }

  return {
    id: placement.id,
    position: {
      x: placement.position.x,
      y: placement.position.y,
    },
    data: {
      label: node.title || node.content,
      content: node.content,
      nodeId: node.id,
      placementId: placement.id,
    },
  };
}

export function toReactFlowNodes(
  nodes: readonly Node[],
  placements: readonly Placement[],
): CanvasFlowNode[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  return placements.map((placement) => {
    const node = nodesById.get(placement.nodeId);

    if (node === undefined) {
      throw new Error(`Node ${placement.nodeId} has no loaded Domain entity.`);
    }

    return toReactFlowNode(node, placement);
  });
}
