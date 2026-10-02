import { describe, expect, it, vi } from "vitest";
import { createCanvas } from "../domain/canvas";
import { createEdge } from "../domain/edge";
import { createNode, type Node } from "../domain/node";
import { createPlacement, type Placement, type PlacementId } from "../domain/placement";
import { loadLibrary } from "./loadLibrary";
import { persistNodeEdit } from "./nodePersistence";
import { removeNodeFromCanvas } from "./placementPersistence";

describe("removeNodeFromCanvas", () => {
  it("removes only one Placement while Node, Inbox, another Garden, and Edges survive", async () => {
    const node = createNode("Shared knowledge");
    const otherNode = createNode("Connected knowledge");
    const gardenA = createCanvas("Garden A");
    const gardenB = createCanvas("Garden B");
    const placementA = createPlacement(gardenA.id, node.id, { x: 0, y: 0 });
    const placementB = createPlacement(gardenB.id, node.id, { x: 10, y: 20 });
    const edge = createEdge(node.id, otherNode.id);
    const nodes = new Map([[node.id, node], [otherNode.id, otherNode]]);
    const placements = new Map<PlacementId, Placement>([
      [placementA.id, placementA],
      [placementB.id, placementB],
    ]);
    const inboxMembership = new Set([node.id]);
    const edges = new Map([[edge.id, edge]]);
    const persistence = {
      load: vi.fn(async (id: PlacementId) => placements.get(id) ?? null),
      delete: vi.fn(async (id: PlacementId) => {
        placements.delete(id);
      }),
    };

    const removed = await removeNodeFromCanvas(persistence, placementA.id);

    expect(removed).toBe(placementA);
    expect(placements.has(placementA.id)).toBe(false);
    expect(placements.get(placementB.id)).toBe(placementB);
    expect(nodes.get(node.id)).toBe(node);
    expect(inboxMembership.has(node.id)).toBe(true);
    expect(edges.get(edge.id)).toBe(edge);

    const library = await loadLibrary({
      nodePersistence: { list: vi.fn(async () => [...nodes.values()]) },
      inboxPersistence: {
        list: vi.fn(async () =>
          [...inboxMembership].map((id) => nodes.get(id) as Node),
        ),
      },
      canvasPersistence: { list: vi.fn(async () => [gardenA, gardenB]) },
      placementPersistence: {
        list: vi.fn(async () => [...placements.values()]),
      },
    });
    const libraryEntry = library.find((entry) => entry.node.id === node.id);
    expect(libraryEntry?.gardens.map((context) => context.garden.title)).toEqual([
      "Garden B",
    ]);
  });

  it("rejects a missing Placement without deleting anything", async () => {
    const missingId = "e0be9022-d56c-402a-a4f3-632f57d9363f" as PlacementId;
    const persistence = {
      load: vi.fn(async (_id: PlacementId) => null),
      delete: vi.fn(async (_id: PlacementId) => undefined),
    };

    await expect(removeNodeFromCanvas(persistence, missingId)).rejects.toThrow(
      "Placement not found.",
    );
    expect(persistence.delete).not.toHaveBeenCalled();
  });

  it("propagates delete failure so the caller can keep the Placement visible", async () => {
    const node = createNode("Knowledge");
    const garden = createCanvas("Garden");
    const placement = createPlacement(garden.id, node.id, { x: 0, y: 0 });
    const failure = new Error("Delete failed");
    const persistence = {
      load: vi.fn(async () => placement),
      delete: vi.fn(async () => {
        throw failure;
      }),
    };

    await expect(
      removeNodeFromCanvas(persistence, placement.id),
    ).rejects.toBe(failure);
  });
});

describe("Library editing lifecycle", () => {
  it("edits the same Node while Inbox, Placements, and Edges remain unchanged", async () => {
    const node = createNode("Original");
    const otherNode = createNode("Other");
    const garden = createCanvas("Garden");
    const placement = createPlacement(garden.id, node.id, { x: 1, y: 2 });
    const edge = createEdge(node.id, otherNode.id);
    const inboxMembership = new Set([node.id]);
    const placements = [placement];
    const edges = [edge];
    let storedNode = node;

    const edited = await persistNodeEdit(
      { save: vi.fn(async (next) => { storedNode = next; }) },
      node,
      "Updated",
      "New content",
    );

    expect(edited.id).toBe(node.id);
    expect(storedNode).toBe(edited);
    expect(inboxMembership.has(node.id)).toBe(true);
    expect(placements).toEqual([placement]);
    expect(edges).toEqual([edge]);
  });
});
