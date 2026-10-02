import type { CanvasFlowEdge, CanvasFlowNode } from "./reactFlowAdapter";

export type CanvasHover =
  | { readonly kind: "idea"; readonly id: string }
  | { readonly kind: "connection"; readonly id: string }
  | null;

interface IdeaAdjacency {
  readonly connections: Set<string>;
  readonly neighbors: Set<string>;
}

export interface CanvasAdjacency {
  readonly ideas: ReadonlyMap<string, IdeaAdjacency>;
  readonly connections: ReadonlyMap<string, readonly [string, string]>;
}

/** Index visual Placement IDs, preserving every directed Edge ID. No model writes. */
export function buildCanvasAdjacency(edges: readonly CanvasFlowEdge[]): CanvasAdjacency {
  const ideas = new Map<string, IdeaAdjacency>();
  const connections = new Map<string, readonly [string, string]>();

  for (const edge of edges) {
    connections.set(edge.id, [edge.source, edge.target]);
    for (const [id, neighbor] of [[edge.source, edge.target], [edge.target, edge.source]]) {
      const adjacency = ideas.get(id) ?? { connections: new Set<string>(), neighbors: new Set<string>() };
      adjacency.connections.add(edge.id);
      if (id !== neighbor) adjacency.neighbors.add(neighbor);
      ideas.set(id, adjacency);
    }
  }

  return { ideas, connections };
}

/** A late leave event from a previous target must not clear the new target. */
export function leaveCanvasHover(current: CanvasHover, target: Exclude<CanvasHover, null>): CanvasHover {
  return current?.kind === target.kind && current.id === target.id ? null : current;
}

/** Project transient classes only; positions, selection and resource data remain untouched. */
export function projectCanvasHover(
  nodes: CanvasFlowNode[],
  edges: CanvasFlowEdge[],
  adjacency: CanvasAdjacency,
  hover: CanvasHover,
): { nodes: CanvasFlowNode[]; edges: CanvasFlowEdge[] } {
  if (hover === null) return { nodes, edges };

  const incident = hover.kind === "idea" ? adjacency.ideas.get(hover.id) : undefined;
  const endpoints = hover.kind === "connection" ? adjacency.connections.get(hover.id) : undefined;

  return {
    nodes: nodes.map((node) => {
      const emphasized = hover.kind === "idea" && node.id === hover.id;
      const related = incident?.neighbors.has(node.id) || endpoints?.includes(node.id);
      if (!emphasized && !related) return node;
      return { ...node, className: [node.className, emphasized ? "garden-idea--hovered" : "garden-idea--related"].filter(Boolean).join(" ") };
    }),
    edges: edges.map((edge) => {
      const emphasized = hover.kind === "connection" && endpoints !== undefined && edge.id === hover.id;
      const related = incident?.connections.has(edge.id);
      if (!emphasized && !related) return edge;
      const markerEnd = typeof edge.markerEnd === "object" ? { ...edge.markerEnd, color: edge.selected ? "var(--primary)" : "var(--accent)" } : edge.markerEnd;
      return { ...edge, markerEnd, className: [edge.className, emphasized ? "garden-connection--hovered" : "garden-connection--highlighted"].filter(Boolean).join(" ") };
    }),
  };
}
