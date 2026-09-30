import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { Edge, EdgeId } from "../../domain/edge";
import type { Node, NodeId } from "../../domain/node";
import type { Placement, PlacementId } from "../../domain/placement";

export interface CanvasNodeData extends Record<string, unknown> {
  title: string;
  content: string;
  nodeId: NodeId;
  placementId: PlacementId;
}

export type CanvasFlowNode = ReactFlowNode<CanvasNodeData, "knowledge">;
export type CanvasFlowEdge = ReactFlowEdge;

export function toReactFlowNode(
  node: Node,
  placement: Placement,
): CanvasFlowNode {
  if (node.id !== placement.nodeId) {
    throw new Error("Node and Placement identities do not match.");
  }

  return {
    id: placement.id,
    type: "knowledge",
    position: {
      x: placement.position.x,
      y: placement.position.y,
    },
    data: {
      title: node.title,
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

export function toReactFlowEdges(
  edges: readonly Edge[],
  placements: readonly Placement[],
  selectedEdgeId: EdgeId | null = null,
): CanvasFlowEdge[] {
  const placementsByNodeId = new Map(
    placements.map((placement) => [placement.nodeId, placement]),
  );

  return edges.flatMap((edge) => {
    const sourcePlacement = placementsByNodeId.get(edge.sourceNodeId);
    const targetPlacement = placementsByNodeId.get(edge.targetNodeId);

    if (sourcePlacement === undefined || targetPlacement === undefined) {
      return [];
    }

    return [
      {
        id: edge.id,
        source: sourcePlacement.id,
        target: targetPlacement.id,
        sourceHandle: "source",
        targetHandle: "target",
        markerEnd: { type: MarkerType.ArrowClosed },
        selected: edge.id === selectedEdgeId,
      },
    ];
  });
}
