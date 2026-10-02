import type { Canvas } from "../domain/canvas";
import { createEdge, type Edge, type EdgeId } from "../domain/edge";
import type { Node, NodeId } from "../domain/node";
import type { Placement, PlacementId } from "../domain/placement";
import type { Resource } from "../domain/resource";
import type { CanvasPersistence } from "./canvasPersistence";
import type { EdgePersistence } from "./edgePersistence";
import type { InboxPersistence } from "./inboxPersistence";
import type { NativeOperations } from "./nativeOperations";
import { persistNodeEdit, type NodePersistence } from "./nodePersistence";
import type { PlacementPersistence } from "./placementPersistence";
import type { NativeResourceFiles } from "./resourceFiles";
import type { ResourcePersistence } from "./resourcePersistence";

export interface IdeaGarden {
  readonly garden: Canvas;
  readonly placement: Placement;
}

export interface IdeaConnection {
  readonly edge: Edge;
  readonly idea: Node;
  readonly direction: "incoming" | "outgoing" | "self";
}

export interface IdeaPageView {
  readonly node: Node;
  readonly allIdeas: Node[];
  readonly inInbox: boolean;
  readonly gardens: IdeaGarden[];
  readonly resources: Resource[];
  readonly connections: IdeaConnection[];
}

export interface IdeaPageDependencies {
  readonly canvasPersistence: Pick<CanvasPersistence, "list">;
  readonly nodePersistence: Pick<NodePersistence, "load" | "list" | "save">;
  readonly edgePersistence: EdgePersistence;
  readonly placementPersistence: Pick<PlacementPersistence, "list" | "load" | "delete">;
  readonly inboxPersistence: Pick<InboxPersistence, "contains">;
  readonly resourcePersistence: ResourcePersistence;
  readonly resourceFiles: NativeResourceFiles;
  readonly nativeOperations: Pick<NativeOperations, "deleteKnowledge">;
}

export function ideaLabel(node: Node): string {
  return node.title || node.content.slice(0, 80) || "Idea sin título";
}

export function connectionForIdea(
  edge: Edge,
  nodeId: NodeId,
  allIdeas: readonly Node[],
): IdeaConnection {
  const isSource = edge.sourceNodeId === nodeId;
  const isTarget = edge.targetNodeId === nodeId;
  if (!isSource && !isTarget) {
    throw new Error("La conexión no pertenece a esta idea.");
  }

  const peerId = isSource ? edge.targetNodeId : edge.sourceNodeId;
  const idea = allIdeas.find((candidate) => candidate.id === peerId);
  if (idea === undefined) {
    throw new Error("No se encontró una idea conectada.");
  }

  return {
    edge,
    idea,
    direction: isSource && isTarget ? "self" : isSource ? "outgoing" : "incoming",
  };
}

export async function loadIdeaPage(
  dependencies: IdeaPageDependencies,
  nodeId: NodeId,
): Promise<IdeaPageView | null> {
  const [node, allIdeas, gardens, placements, inInbox, resources] = await Promise.all([
    dependencies.nodePersistence.load(nodeId),
    dependencies.nodePersistence.list(),
    dependencies.canvasPersistence.list(),
    dependencies.placementPersistence.list(),
    dependencies.inboxPersistence.contains(nodeId),
    dependencies.resourcePersistence.listByNode(nodeId),
  ]);

  if (node === null) return null;

  const knownIdeas = allIdeas.some((idea) => idea.id === nodeId)
    ? allIdeas.map((idea) => idea.id === nodeId ? node : idea)
    : [...allIdeas, node];
  const edges = await dependencies.edgePersistence.loadBetweenNodes(
    knownIdeas.map((idea) => idea.id),
  );
  const gardensById = new Map(gardens.map((garden) => [garden.id, garden]));
  const ideaGardens = placements
    .filter((placement) => placement.nodeId === nodeId)
    .map((placement) => {
      const garden = gardensById.get(placement.canvasId);
      if (garden === undefined) {
        throw new Error("No se encontró un jardín de esta idea.");
      }
      return { garden, placement };
    })
    .sort((left, right) => left.garden.title.localeCompare(right.garden.title, "es"));
  const connections = edges
    .filter((edge) => edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId)
    .map((edge) => connectionForIdea(edge, nodeId, knownIdeas))
    .sort((left, right) => ideaLabel(left.idea).localeCompare(ideaLabel(right.idea), "es"));

  return {
    node,
    allIdeas: [...knownIdeas].sort((left, right) => ideaLabel(left).localeCompare(ideaLabel(right), "es")),
    inInbox,
    gardens: ideaGardens,
    resources,
    connections,
  };
}

export async function saveIdeaPage(
  persistence: Pick<NodePersistence, "load" | "save">,
  nodeId: NodeId,
  title: string,
  content: string,
): Promise<Node> {
  if (title.trim() === "" && content.trim() === "") {
    throw new Error("Escribe un título o contenido para la idea.");
  }
  const node = await persistence.load(nodeId);
  if (node === null) throw new Error("La idea ya no está disponible.");
  return persistNodeEdit(persistence, node, title, content);
}

export async function connectIdeas(
  dependencies: Pick<IdeaPageDependencies, "nodePersistence" | "edgePersistence">,
  sourceNodeId: NodeId,
  targetNodeId: NodeId,
): Promise<Edge> {
  const [source, target] = await Promise.all([
    dependencies.nodePersistence.load(sourceNodeId),
    dependencies.nodePersistence.load(targetNodeId),
  ]);
  if (source === null || target === null) {
    throw new Error("Una de las ideas ya no está disponible.");
  }
  const edge = createEdge(source.id, target.id);
  await dependencies.edgePersistence.save(edge);
  return edge;
}

export async function removeIdeaConnection(
  dependencies: Pick<IdeaPageDependencies, "nodePersistence" | "edgePersistence">,
  nodeId: NodeId,
  edgeId: EdgeId,
): Promise<void> {
  const nodes = await dependencies.nodePersistence.list();
  const edges = await dependencies.edgePersistence.loadBetweenNodes(nodes.map((node) => node.id));
  const edge = edges.find((candidate) => candidate.id === edgeId);
  if (edge === undefined || (edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId)) {
    throw new Error("La conexión no pertenece a esta idea.");
  }
  await dependencies.edgePersistence.delete(edgeId);
}

export async function removeIdeaFromGarden(
  persistence: Pick<PlacementPersistence, "load" | "delete">,
  nodeId: NodeId,
  placementId: PlacementId,
): Promise<Placement> {
  const placement = await persistence.load(placementId);
  if (placement === null || placement.nodeId !== nodeId) {
    throw new Error("La idea ya no está en este jardín.");
  }
  await persistence.delete(placement.id);
  return placement;
}

export type ResourceAvailability = "available" | "missing" | "unknown";

export async function loadIdeaResourceAvailability(
  files: Pick<NativeResourceFiles, "exists">,
  resources: readonly Resource[],
): Promise<Record<string, ResourceAvailability>> {
  const statuses = await Promise.all(resources.map(async (resource) => {
    if (resource.location === "url") return [resource.id, "available"] as const;
    try {
      const exists = await files.exists(resource.locator);
      return [resource.id, exists ? "available" : "missing"] as const;
    } catch {
      return [resource.id, "unknown"] as const;
    }
  }));
  return Object.fromEntries(statuses);
}
