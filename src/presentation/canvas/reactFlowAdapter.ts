import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { Edge, EdgeId } from "../../domain/edge";
import type { Node, NodeId } from "../../domain/node";
import type { Placement, PlacementId } from "../../domain/placement";
import type { Resource } from "../../domain/resource";

export interface CanvasNodeData extends Record<string, unknown> {
  title: string;
  content: string;
  nodeId: NodeId;
  placementId: PlacementId;
  resourceCounts?: { document: number; video: number; link: number };
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
    ariaLabel: `Idea: ${node.title || node.content.slice(0, 80) || "Idea sin título"}`,
    domAttributes: { "aria-roledescription": "idea" },
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
  resources: readonly Resource[] = [],
): CanvasFlowNode[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const counts = new Map<NodeId, { document: number; video: number; link: number }>();
  for (const resource of resources) {
    const summary = counts.get(resource.nodeId) ?? { document: 0, video: 0, link: 0 };
    summary[resource.kind] += 1;
    counts.set(resource.nodeId, summary);
  }

  return placements.map((placement) => {
    const node = nodesById.get(placement.nodeId);

    if (node === undefined) {
      throw new Error(`Node ${placement.nodeId} has no loaded Domain entity.`);
    }

    const visual = toReactFlowNode(node, placement);
    const summary = counts.get(node.id);
    return summary === undefined ? visual : { ...visual, data: { ...visual.data, resourceCounts: summary } };
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
        className: "garden-connection",
        interactionWidth: 22,
        markerEnd: { type: MarkerType.ArrowClosed, color: edge.id === selectedEdgeId ? "var(--primary)" : "var(--connection)" },
        selected: edge.id === selectedEdgeId,
        ariaLabel: "Conexión entre ideas",
        domAttributes: { "aria-roledescription": "conexión" },
      },
    ];
  });
}
