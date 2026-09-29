import { describe, expect, it, vi } from "vitest";
import { createCanvas } from "../domain/canvas";
import type { Edge } from "../domain/edge";
import { createNode } from "../domain/node";
import {
  createPlacement,
  type Placement,
  type PlacementId,
} from "../domain/placement";
import {
  createEdgeInCanvas,
  type CreateEdgeInCanvasDependencies,
} from "./createEdgeInCanvas";

function setup() {
  const canvas = createCanvas("Main");
  const sourceNode = createNode("Source");
  const targetNode = createNode("Target");
  const sourcePlacement = createPlacement(canvas.id, sourceNode.id, {
    x: 10,
    y: 20,
  });
  const targetPlacement = createPlacement(canvas.id, targetNode.id, {
    x: 300,
    y: 40,
  });
  const placements = new Map<PlacementId, Placement>([
    [sourcePlacement.id, sourcePlacement],
    [targetPlacement.id, targetPlacement],
  ]);
  const dependencies = {
    edgePersistence: {
      save: vi.fn(async (_edge: Edge) => undefined),
    },
    placementPersistence: {
      load: vi.fn(async (id: PlacementId) => placements.get(id) ?? null),
    },
  } satisfies CreateEdgeInCanvasDependencies;

  return {
    canvas,
    sourceNode,
    targetNode,
    sourcePlacement,
    targetPlacement,
    placements,
    dependencies,
  };
}

describe("createEdgeInCanvas", () => {
  it("resolves both Placements to their Domain Node identities", async () => {
    const context = setup();

    const edge = await createEdgeInCanvas(
      context.dependencies,
      context.canvas.id,
      context.sourcePlacement.id,
      context.targetPlacement.id,
    );

    expect(context.dependencies.placementPersistence.load).toHaveBeenNthCalledWith(
      1,
      context.sourcePlacement.id,
    );
    expect(context.dependencies.placementPersistence.load).toHaveBeenNthCalledWith(
      2,
      context.targetPlacement.id,
    );
    expect(edge.sourceNodeId).toBe(context.sourceNode.id);
    expect(edge.targetNodeId).toBe(context.targetNode.id);
    expect(edge.sourceNodeId).not.toBe(context.sourcePlacement.id);
    expect(edge.targetNodeId).not.toBe(context.targetPlacement.id);
  });

  it("persists and returns the same created Edge", async () => {
    const context = setup();

    const edge = await createEdgeInCanvas(
      context.dependencies,
      context.canvas.id,
      context.sourcePlacement.id,
      context.targetPlacement.id,
    );

    expect(context.dependencies.edgePersistence.save).toHaveBeenCalledOnce();
    expect(context.dependencies.edgePersistence.save).toHaveBeenCalledWith(edge);
    expect(edge.id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("rejects a missing source Placement before loading the target", async () => {
    const context = setup();
    context.placements.delete(context.sourcePlacement.id);

    await expect(
      createEdgeInCanvas(
        context.dependencies,
        context.canvas.id,
        context.sourcePlacement.id,
        context.targetPlacement.id,
      ),
    ).rejects.toThrow("Source Placement not found.");

    expect(context.dependencies.placementPersistence.load).toHaveBeenCalledOnce();
    expect(context.dependencies.edgePersistence.save).not.toHaveBeenCalled();
  });

  it("rejects a missing target Placement", async () => {
    const context = setup();
    context.placements.delete(context.targetPlacement.id);

    await expect(
      createEdgeInCanvas(
        context.dependencies,
        context.canvas.id,
        context.sourcePlacement.id,
        context.targetPlacement.id,
      ),
    ).rejects.toThrow("Target Placement not found.");

    expect(context.dependencies.edgePersistence.save).not.toHaveBeenCalled();
  });

  it("propagates a Placement load failure without persisting an Edge", async () => {
    const context = setup();
    const failure = new Error("Placement load failed");
    context.dependencies.placementPersistence.load.mockRejectedValueOnce(
      failure,
    );

    await expect(
      createEdgeInCanvas(
        context.dependencies,
        context.canvas.id,
        context.sourcePlacement.id,
        context.targetPlacement.id,
      ),
    ).rejects.toBe(failure);

    expect(context.dependencies.edgePersistence.save).not.toHaveBeenCalled();
  });

  it("rejects a source Placement from another Canvas", async () => {
    const context = setup();
    const otherCanvas = createCanvas("Other");
    const foreignPlacement = createPlacement(
      otherCanvas.id,
      context.sourceNode.id,
      { x: 0, y: 0 },
    );
    context.placements.set(foreignPlacement.id, foreignPlacement);

    await expect(
      createEdgeInCanvas(
        context.dependencies,
        context.canvas.id,
        foreignPlacement.id,
        context.targetPlacement.id,
      ),
    ).rejects.toThrow("Source Placement does not belong to the active Canvas.");

    expect(context.dependencies.edgePersistence.save).not.toHaveBeenCalled();
  });

  it("rejects a target Placement from another Canvas", async () => {
    const context = setup();
    const otherCanvas = createCanvas("Other");
    const foreignPlacement = createPlacement(
      otherCanvas.id,
      context.targetNode.id,
      { x: 0, y: 0 },
    );
    context.placements.set(foreignPlacement.id, foreignPlacement);

    await expect(
      createEdgeInCanvas(
        context.dependencies,
        context.canvas.id,
        context.sourcePlacement.id,
        foreignPlacement.id,
      ),
    ).rejects.toThrow("Target Placement does not belong to the active Canvas.");

    expect(context.dependencies.edgePersistence.save).not.toHaveBeenCalled();
  });

  it("propagates persistence failure and returns no Edge", async () => {
    const context = setup();
    const failure = new Error("Edge save failed");
    context.dependencies.edgePersistence.save.mockRejectedValueOnce(failure);

    await expect(
      createEdgeInCanvas(
        context.dependencies,
        context.canvas.id,
        context.sourcePlacement.id,
        context.targetPlacement.id,
      ),
    ).rejects.toBe(failure);
  });

  it("allows a self-edge through one Placement", async () => {
    const context = setup();

    const edge = await createEdgeInCanvas(
      context.dependencies,
      context.canvas.id,
      context.sourcePlacement.id,
      context.sourcePlacement.id,
    );

    expect(edge.sourceNodeId).toBe(context.sourceNode.id);
    expect(edge.targetNodeId).toBe(context.sourceNode.id);
  });

  it("allows duplicate relationships with independent Edge identities", async () => {
    const context = setup();

    const first = await createEdgeInCanvas(
      context.dependencies,
      context.canvas.id,
      context.sourcePlacement.id,
      context.targetPlacement.id,
    );
    const second = await createEdgeInCanvas(
      context.dependencies,
      context.canvas.id,
      context.sourcePlacement.id,
      context.targetPlacement.id,
    );

    expect(first.id).not.toBe(second.id);
    expect(context.dependencies.edgePersistence.save).toHaveBeenCalledTimes(2);
  });
});
