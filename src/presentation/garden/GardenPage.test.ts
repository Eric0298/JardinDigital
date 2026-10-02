import { describe, expect, it, vi } from "vitest";
import { createCanvas } from "../../domain/canvas";
import { createNode } from "../../domain/node";
import { createEdge } from "../../domain/edge";
import { createPlacement } from "../../domain/placement";
import { createResource } from "../../domain/resource";
import { deleteEdge } from "../../application/edgePersistence";
import { removeNodeFromCanvas } from "../../application/placementPersistence";
import { deleteGardenIdeaWithConfirmation, gardenWithoutIdea, gardenWithoutPlacement } from "./GardenPage";

function fixture() {
  const garden = createCanvas("Lecturas");
  const otherGarden = createCanvas("Investigación");
  const a = createNode("Idea A");
  const b = createNode("Idea B");
  const placementA = createPlacement(garden.id, a.id, { x: 0, y: 0 });
  const placementB = createPlacement(garden.id, b.id, { x: 280, y: 0 });
  const otherPlacementA = createPlacement(otherGarden.id, a.id, { x: 0, y: 0 });
  const edge = createEdge(a.id, b.id);
  const resource = createResource(a.id, "document", "Notas", "C:\\Lecturas\\notas.pdf", "local");
  return { a, b, placementA, placementB, otherPlacementA, edge, resource,
    view: { canvas: garden, nodes: [a, b], placements: [placementA, placementB], edges: [edge] } };
}

describe("Distinct actions on selected canvas content", () => {
  it("removes only the selected placement while retaining knowledge, connections, resources and pending membership", async () => {
    const context = fixture();
    const placements = new Map([context.placementA, context.placementB, context.otherPlacementA].map((placement) => [placement.id, placement]));
    const nodes = new Map([context.a, context.b].map((node) => [node.id, node]));
    const edges = new Map([[context.edge.id, context.edge]]);
    const resources = new Map([[context.resource.id, context.resource]]);
    const pending = new Set([context.a.id]);
    const remove = vi.fn(async (id: typeof context.placementA.id) => { placements.delete(id); });
    await removeNodeFromCanvas({ load: async (id) => placements.get(id) ?? null, delete: remove }, context.placementA.id);
    expect(remove).toHaveBeenCalledExactlyOnceWith(context.placementA.id);
    expect([...placements.values()]).toEqual([context.placementB, context.otherPlacementA]);
    expect([...nodes.values()]).toEqual([context.a, context.b]);
    expect([...edges.values()]).toEqual([context.edge]);
    expect([...resources.values()]).toEqual([context.resource]);
    expect(pending.has(context.a.id)).toBe(true);
    const visible = gardenWithoutPlacement(context.view, context.placementA.id);
    expect(visible.placements).toEqual([context.placementB]);
    expect(visible.nodes).toEqual([context.b]);
    expect(visible.edges).toEqual([]);
    expect(context.view.nodes).toEqual([context.a, context.b]);
    expect(context.view.edges).toEqual([context.edge]);
  });

  it("deletes only a connection and retains both ideas and their placements", async () => {
    const context = fixture();
    const otherEdge = createEdge(context.a.id, context.b.id);
    const edges = new Map([context.edge, otherEdge].map((edge) => [edge.id, edge]));
    const remove = vi.fn(async (id: typeof context.edge.id) => { edges.delete(id); });
    await deleteEdge({ delete: remove }, context.edge.id);
    expect(remove).toHaveBeenCalledExactlyOnceWith(context.edge.id);
    expect([...edges.values()]).toEqual([otherEdge]);
    expect(context.view.nodes).toEqual([context.a, context.b]);
    expect(context.view.placements).toEqual([context.placementA, context.placementB]);
    expect(context.resource.nodeId).toBe(context.a.id);
  });

  it("requires explicit destructive confirmation before invoking the existing native knowledge deletion", async () => {
    const context = fixture();
    const remove = vi.fn(async () => undefined);
    const confirm = vi.fn(async () => false);
    expect(await deleteGardenIdeaWithConfirmation(context.a, { deleteKnowledge: remove }, confirm)).toBe(false);
    expect(remove).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: "Eliminar «Idea A» definitivamente",
      description: "Se eliminará esta idea de todos los jardines y de pendientes junto con sus conexiones y referencias de recursos. Los archivos vinculados originales no se borrarán. Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar idea definitivamente",
      destructive: true,
    }));
  });

  it("passes the selected idea identity to native deletion and projects the surviving garden", async () => {
    const context = fixture();
    const remove = vi.fn(async () => undefined);
    expect(await deleteGardenIdeaWithConfirmation(context.a, { deleteKnowledge: remove }, async () => true)).toBe(true);
    expect(remove).toHaveBeenCalledExactlyOnceWith(context.a.id);
    const visible = gardenWithoutIdea(context.view, context.a.id);
    expect(visible.nodes).toEqual([context.b]);
    expect(visible.placements).toEqual([context.placementB]);
    expect(visible.edges).toEqual([]);
    expect(context.view.nodes).toEqual([context.a, context.b]);
  });

  it("does not delete after the garden changed or unmounted while confirmation was pending", async () => {
    const context = fixture();
    const remove = vi.fn(async () => undefined);
    let current = true;
    let answer: (accepted: boolean) => void = () => undefined;
    const pending = deleteGardenIdeaWithConfirmation(context.a, { deleteKnowledge: remove }, () => new Promise<boolean>((resolve) => { answer = resolve; }), () => current);
    current = false;
    answer(true);
    expect(await pending).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });

  it("propagates a native deletion failure without claiming the idea was deleted", async () => {
    const context = fixture();
    const failure = new Error("No se pudo eliminar");
    await expect(deleteGardenIdeaWithConfirmation(context.a, { deleteKnowledge: vi.fn(async () => { throw failure; }) }, async () => true)).rejects.toBe(failure);
    expect(context.view.nodes).toEqual([context.a, context.b]);
  });
});
