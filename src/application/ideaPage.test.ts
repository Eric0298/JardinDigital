import { describe, expect, it, vi } from "vitest";
import { createCanvas } from "../domain/canvas";
import { createEdge, type Edge, type EdgeId } from "../domain/edge";
import { createNode, type Node, type NodeId } from "../domain/node";
import { createPlacement, type Placement, type PlacementId } from "../domain/placement";
import { createResource, type Resource, type ResourceId } from "../domain/resource";
import {
  connectIdeas,
  loadIdeaPage,
  loadIdeaResourceAvailability,
  removeIdeaConnection,
  removeIdeaFromGarden,
  saveIdeaPage,
  type IdeaPageDependencies,
} from "./ideaPage";

function setup() {
  const a = createNode("Idea A", "Contenido A");
  const b = createNode("Idea B");
  const c = createNode("", "Idea C sin título");
  const d = createNode("Idea D");
  const gardenA = createCanvas("Alfa");
  const gardenB = createCanvas("Beta");
  const nodes = new Map<NodeId, Node>([a, b, c, d].map((node) => [node.id, node]));
  const edges = new Map<EdgeId, Edge>();
  const placementA = createPlacement(gardenA.id, a.id, { x: 20, y: 10 });
  const placementB = createPlacement(gardenB.id, a.id, { x: 50, y: 40 });
  const placements = new Map<PlacementId, Placement>([placementA, placementB].map((placement) => [placement.id, placement]));
  const document = createResource(a.id, "document", "Notas.pdf", "C:\\conocimiento\\Notas.pdf", "local");
  const resources = new Map<ResourceId, Resource>([[document.id, document]]);
  const dependencies = {
    nodePersistence: {
      load: vi.fn(async (id: NodeId) => nodes.get(id) ?? null),
      list: vi.fn(async () => [...nodes.values()]),
      save: vi.fn(async (node: Node) => { nodes.set(node.id, node); }),
    },
    edgePersistence: {
      loadBetweenNodes: vi.fn(async (ids: readonly NodeId[]) => {
        const included = new Set(ids);
        return [...edges.values()].filter((edge) => included.has(edge.sourceNodeId) && included.has(edge.targetNodeId));
      }),
      save: vi.fn(async (edge: Edge) => { edges.set(edge.id, edge); }),
      delete: vi.fn(async (id: EdgeId) => { edges.delete(id); }),
    },
    canvasPersistence: { list: vi.fn(async () => [gardenB, gardenA]) },
    placementPersistence: {
      list: vi.fn(async () => [...placements.values()]),
      load: vi.fn(async (id: PlacementId) => placements.get(id) ?? null),
      delete: vi.fn(async (id: PlacementId) => { placements.delete(id); }),
    },
    inboxPersistence: { contains: vi.fn(async () => true) },
    resourcePersistence: {
      listByNode: vi.fn(async (id: NodeId) => [...resources.values()].filter((resource) => resource.nodeId === id)),
      listByNodes: vi.fn(async (ids: readonly NodeId[]) => [...resources.values()].filter((resource) => ids.includes(resource.nodeId))),
      save: vi.fn(async (resource: Resource) => { resources.set(resource.id, resource); }),
      remove: vi.fn(async (id: ResourceId) => { resources.delete(id); }),
    },
    resourceFiles: {
      exists: vi.fn(async (_path: string) => true),
      chooseFile: vi.fn(async (_kind: "document" | "video"): Promise<string | null> => null),
      open: vi.fn(async (_resource: Resource) => undefined),
    },
    nativeOperations: { deleteKnowledge: vi.fn(async (_id: NodeId) => undefined) },
  } satisfies IdeaPageDependencies;
  return { a, b, c, d, gardenA, gardenB, nodes, edges, placements, placementA, placementB, document, resources, dependencies };
}

describe("Idea page use cases", () => {
  it("opens the existing identity with its resources, pending membership and all gardens without writing anything", async () => {
    const context = setup();
    const view = await loadIdeaPage(context.dependencies, context.a.id);

    expect(view?.node).toEqual(context.a);
    expect(view?.node.id).toBe(context.a.id);
    expect(view?.inInbox).toBe(true);
    expect(view?.resources).toEqual([context.document]);
    expect(view?.gardens.map(({ garden }) => garden.title)).toEqual(["Alfa", "Beta"]);
    expect(view?.allIdeas).toHaveLength(4);
    expect(context.dependencies.nodePersistence.save).not.toHaveBeenCalled();
    expect(context.dependencies.edgePersistence.save).not.toHaveBeenCalled();
    expect(context.dependencies.resourcePersistence.save).not.toHaveBeenCalled();
    expect(context.dependencies.resourceFiles.chooseFile).not.toHaveBeenCalled();
  });

  it("returns no view for a deleted idea without creating a replacement", async () => {
    const context = setup();
    context.nodes.delete(context.a.id);
    await expect(loadIdeaPage(context.dependencies, context.a.id)).resolves.toBeNull();
    expect(context.dependencies.nodePersistence.save).not.toHaveBeenCalled();
    expect(context.dependencies.edgePersistence.loadBetweenNodes).not.toHaveBeenCalled();
  });

  it("loads incoming, outgoing, duplicate and self connections independently of garden placement", async () => {
    const context = setup();
    const outgoing = createEdge(context.a.id, context.b.id);
    const incoming = createEdge(context.d.id, context.a.id);
    const self = createEdge(context.a.id, context.a.id);
    const duplicate = createEdge(context.a.id, context.b.id);
    const unrelated = createEdge(context.b.id, context.d.id);
    for (const edge of [outgoing, incoming, self, duplicate, unrelated]) context.edges.set(edge.id, edge);

    const view = await loadIdeaPage(context.dependencies, context.a.id);
    expect(view?.connections).toHaveLength(4);
    expect(view?.connections.find(({ edge }) => edge.id === outgoing.id)).toMatchObject({ idea: context.b, direction: "outgoing" });
    expect(view?.connections.find(({ edge }) => edge.id === incoming.id)).toMatchObject({ idea: context.d, direction: "incoming" });
    expect(view?.connections.find(({ edge }) => edge.id === self.id)).toMatchObject({ idea: context.a, direction: "self" });
    expect(view?.connections.some(({ edge }) => edge.id === unrelated.id)).toBe(false);
    expect(context.dependencies.edgePersistence.loadBetweenNodes).toHaveBeenCalledWith([context.a.id, context.b.id, context.c.id, context.d.id]);
  });

  it("reports an orphaned garden rather than silently dropping its placement", async () => {
    const context = setup();
    context.dependencies.canvasPersistence.list.mockResolvedValueOnce([context.gardenA]);
    await expect(loadIdeaPage(context.dependencies, context.a.id)).rejects.toThrow("No se encontró un jardín de esta idea.");
  });

  it("propagates a resource read failure instead of presenting an empty resource list", async () => {
    const context = setup();
    const failure = new Error("Resource read failed");
    context.dependencies.resourcePersistence.listByNode.mockRejectedValueOnce(failure);
    await expect(loadIdeaPage(context.dependencies, context.a.id)).rejects.toBe(failure);
  });

  it("saves normalized information with the same NodeId and keeps every association intact", async () => {
    const context = setup();
    const edge = createEdge(context.a.id, context.b.id);
    context.edges.set(edge.id, edge);
    const saved = await saveIdeaPage(context.dependencies.nodePersistence, context.a.id, "  Título actualizado  ", "  Nuevo contenido  ");

    expect(saved).toEqual({ id: context.a.id, title: "Título actualizado", content: "Nuevo contenido" });
    expect(context.nodes.size).toBe(4);
    expect(context.resources.get(context.document.id)?.nodeId).toBe(saved.id);
    expect(context.placements.get(context.placementA.id)?.nodeId).toBe(saved.id);
    expect(context.edges.get(edge.id)?.sourceNodeId).toBe(saved.id);
    expect(context.dependencies.resourcePersistence.save).not.toHaveBeenCalled();
  });

  it("rejects empty or deleted idea edits before any write", async () => {
    const context = setup();
    await expect(saveIdeaPage(context.dependencies.nodePersistence, context.a.id, " ", " ")).rejects.toThrow("Escribe un título o contenido");
    context.nodes.delete(context.a.id);
    await expect(saveIdeaPage(context.dependencies.nodePersistence, context.a.id, "Recuperar", "")).rejects.toThrow("La idea ya no está disponible.");
    expect(context.dependencies.nodePersistence.save).not.toHaveBeenCalled();
  });

  it("allows the many-to-many topology A→B, A→C, D→A and B→D without creating Nodes", async () => {
    const context = setup();
    for (const [source, target] of [[context.a, context.b], [context.a, context.c], [context.d, context.a], [context.b, context.d]]) {
      await connectIdeas(context.dependencies, source.id, target.id);
    }
    expect([...context.edges.values()].map(({ sourceNodeId, targetNodeId }) => [sourceNodeId, targetNodeId])).toEqual([
      [context.a.id, context.b.id], [context.a.id, context.c.id], [context.d.id, context.a.id], [context.b.id, context.d.id],
    ]);
    expect(context.nodes.size).toBe(4);
    expect(context.dependencies.nodePersistence.save).not.toHaveBeenCalled();
  });

  it("allows self and duplicate connections with independent Edge identities", async () => {
    const context = setup();
    const first = await connectIdeas(context.dependencies, context.a.id, context.a.id);
    const second = await connectIdeas(context.dependencies, context.a.id, context.a.id);
    expect(first.id).not.toBe(second.id);
    expect(context.edges.size).toBe(2);
    expect(first.sourceNodeId).toBe(first.targetNodeId);
  });

  it("rejects connection to a missing idea and preserves state after a failed edge save", async () => {
    const context = setup();
    context.nodes.delete(context.b.id);
    await expect(connectIdeas(context.dependencies, context.a.id, context.b.id)).rejects.toThrow("Una de las ideas ya no está disponible.");
    expect(context.dependencies.edgePersistence.save).not.toHaveBeenCalled();
    context.nodes.set(context.b.id, context.b);
    const failure = new Error("Write failed");
    context.dependencies.edgePersistence.save.mockRejectedValueOnce(failure);
    await expect(connectIdeas(context.dependencies, context.a.id, context.b.id)).rejects.toBe(failure);
    expect(context.edges.size).toBe(0);
  });

  it("removes only the selected connection and rejects an unrelated connection", async () => {
    const context = setup();
    const first = createEdge(context.a.id, context.b.id);
    const duplicate = createEdge(context.a.id, context.b.id);
    const unrelated = createEdge(context.b.id, context.d.id);
    for (const edge of [first, duplicate, unrelated]) context.edges.set(edge.id, edge);
    await expect(removeIdeaConnection(context.dependencies, context.a.id, unrelated.id)).rejects.toThrow("La conexión no pertenece a esta idea.");
    await removeIdeaConnection(context.dependencies, context.a.id, first.id);
    expect([...context.edges.keys()]).toEqual([duplicate.id, unrelated.id]);
    expect(context.nodes.size).toBe(4);
    expect(context.resources.size).toBe(1);
  });

  it("removes only a garden placement, keeping the idea, resources, connections and other placements", async () => {
    const context = setup();
    const edge = createEdge(context.a.id, context.b.id);
    context.edges.set(edge.id, edge);
    await removeIdeaFromGarden(context.dependencies.placementPersistence, context.a.id, context.placementA.id);

    expect([...context.placements.keys()]).toEqual([context.placementB.id]);
    expect(context.nodes.get(context.a.id)).toEqual(context.a);
    expect(context.edges.get(edge.id)).toEqual(edge);
    expect(context.resources.get(context.document.id)).toEqual(context.document);
    expect(context.dependencies.nativeOperations.deleteKnowledge).not.toHaveBeenCalled();
    expect(context.dependencies.resourceFiles.open).not.toHaveBeenCalled();
  });

  it("rejects placement removal for another idea and propagates a deletion failure", async () => {
    const context = setup();
    await expect(removeIdeaFromGarden(context.dependencies.placementPersistence, context.b.id, context.placementA.id)).rejects.toThrow("La idea ya no está en este jardín.");
    expect(context.dependencies.placementPersistence.delete).not.toHaveBeenCalled();
    const failure = new Error("Delete failed");
    context.dependencies.placementPersistence.delete.mockRejectedValueOnce(failure);
    await expect(removeIdeaFromGarden(context.dependencies.placementPersistence, context.a.id, context.placementA.id)).rejects.toBe(failure);
    expect(context.placements.size).toBe(2);
  });
});

describe("Idea resource availability", () => {
  it("marks a missing linked file without removing its metadata or the idea", async () => {
    const context = setup();
    context.dependencies.resourceFiles.exists.mockResolvedValue(false);
    const status = await loadIdeaResourceAvailability(context.dependencies.resourceFiles, [context.document]);
    expect(status[context.document.id]).toBe("missing");
    expect(context.resources.get(context.document.id)).toEqual(context.document);
    expect(context.nodes.get(context.a.id)).toEqual(context.a);
    expect(context.dependencies.resourcePersistence.remove).not.toHaveBeenCalled();
  });

  it("checks local video and document paths while leaving web links independent of the filesystem", async () => {
    const context = setup();
    const video = createResource(context.a.id, "video", "Clase.mp4", "C:\\videos\\Clase.mp4", "local");
    const link = createResource(context.a.id, "link", "Referencia", "https://example.org/referencia", "url");
    const status = await loadIdeaResourceAvailability(context.dependencies.resourceFiles, [context.document, video, link]);
    expect(Object.values(status)).toEqual(["available", "available", "available"]);
    expect(context.dependencies.resourceFiles.exists.mock.calls).toEqual([[context.document.locator], [video.locator]]);
  });

  it("isolates a failed availability check so other resources can still be opened", async () => {
    const context = setup();
    const second = createResource(context.a.id, "document", "Otra.pdf", "C:\\conocimiento\\Otra.pdf", "local");
    context.dependencies.resourceFiles.exists.mockRejectedValueOnce(new Error("Access denied"));
    const status = await loadIdeaResourceAvailability(context.dependencies.resourceFiles, [context.document, second]);
    expect(status).toEqual({ [context.document.id]: "unknown", [second.id]: "available" });
  });
});
