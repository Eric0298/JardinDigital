import type { Canvas } from "../domain/canvas";
import type { Node } from "../domain/node";
import type { Placement } from "../domain/placement";
import type { CanvasPersistence } from "./canvasPersistence";
import type { InboxPersistence } from "./inboxPersistence";
import { normalizeNodePageQuery, type NodePageQuery, type NodePersistence } from "./nodePersistence";
import type { PlacementPersistence } from "./placementPersistence";

export interface LibraryGardenContext {
  readonly garden: Canvas;
  readonly placement: Placement;
}

export interface LibraryEntry {
  readonly node: Node;
  readonly inInbox: boolean;
  readonly gardens: LibraryGardenContext[];
}

export interface LoadLibraryDependencies {
  readonly canvasPersistence: Pick<CanvasPersistence, "list">;
  readonly inboxPersistence: Pick<InboxPersistence, "list">;
  readonly nodePersistence: Pick<NodePersistence, "list">;
  readonly placementPersistence: Pick<PlacementPersistence, "list">;
}

export interface LibraryPageResult {
  readonly items: LibraryEntry[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export async function loadLibraryPage(
  dependencies: Omit<LoadLibraryDependencies, "nodePersistence"> & { readonly nodePersistence: Pick<NodePersistence, "queryPage"> },
  request: NodePageQuery,
): Promise<LibraryPageResult> {
  const nodes = await dependencies.nodePersistence.queryPage(normalizeNodePageQuery(request));
  if (nodes.items.length === 0) return { ...nodes, items: [] };
  const items = await loadLibrary({ ...dependencies, nodePersistence: { list: async () => nodes.items } }, nodes.items);
  return { ...nodes, items };
}

export async function loadLibrary(
  dependencies: LoadLibraryDependencies,
  matchingNodes?: Node[],
): Promise<LibraryEntry[]> {
  const [nodes, inboxNodes, canvases, placements] = await Promise.all([
    matchingNodes === undefined
      ? dependencies.nodePersistence.list()
      : Promise.resolve(matchingNodes),
    dependencies.inboxPersistence.list(),
    dependencies.canvasPersistence.list(),
    dependencies.placementPersistence.list(),
  ]);
  const inboxNodeIds = new Set(inboxNodes.map((node) => node.id));
  const canvasesById = new Map(canvases.map((canvas) => [canvas.id, canvas]));
  const placementsByNodeId = new Map<string, LibraryGardenContext[]>();

  for (const placement of placements) {
    const garden = canvasesById.get(placement.canvasId);
    if (garden === undefined) {
      throw new Error("A Garden referenced by a placed idea could not be found.");
    }

    const contexts = placementsByNodeId.get(placement.nodeId) ?? [];
    contexts.push({ garden, placement });
    placementsByNodeId.set(placement.nodeId, contexts);
  }

  for (const contexts of placementsByNodeId.values()) {
    contexts.sort((left, right) => {
      const byTitle = left.garden.title.localeCompare(
        right.garden.title,
        undefined,
        { sensitivity: "base" },
      );
      return byTitle !== 0
        ? byTitle
        : left.garden.id.localeCompare(right.garden.id);
    });
  }

  return nodes.map((node) => ({
    node,
    inInbox: inboxNodeIds.has(node.id),
    gardens: placementsByNodeId.get(node.id) ?? [],
  }));
}
