import { describe, expect, it } from "vitest";
import { createCanvas } from "../../domain/canvas";
import { createEdge } from "../../domain/edge";
import { createNode } from "../../domain/node";
import { createPlacement } from "../../domain/placement";
import { createResource } from "../../domain/resource";
import { toReactFlowEdges, toReactFlowNode, toReactFlowNodes } from "./reactFlowAdapter";

describe("React Flow canvas adapter", () => {
  it("summarizes resources of the same idea without loading file content into cards", () => {
    const node = createNode("Con recursos");
    const other = createNode("Otra idea");
    const garden = createCanvas("Principal");
    const placements = [createPlacement(garden.id, node.id, { x: 0, y: 0 }), createPlacement(garden.id, other.id, { x: 250, y: 0 })];
    const resources = [
      createResource(node.id, "document", "Notas", "C:/notes.pdf", "local"),
      createResource(node.id, "video", "Vídeo", "C:/video.mp4", "local"),
      createResource(node.id, "link", "Referencia", "https://example.com", "url"),
      createResource(node.id, "link", "Otra referencia", "https://example.org", "url"),
    ];
    const visual = toReactFlowNodes([node, other], placements, resources);
    expect(visual[0].data.resourceCounts).toEqual({ document: 1, video: 1, link: 2 });
    expect(visual[1].data).not.toHaveProperty("resourceCounts");
    expect(visual[0].data).not.toHaveProperty("resources");
    expect(visual[0].data.nodeId).toBe(node.id);
  });
  it("maps a Domain Node and Placement to a visual node", () => {
    const node = createNode("Idea", "Develop this thought");
    const canvas = createCanvas("Principal");
    const placement = createPlacement(canvas.id, node.id, {
      x: -45.5,
      y: 210.25,
    });

    const visualNode = toReactFlowNode(node, placement);

    expect(visualNode.id).toBe(placement.id);
    expect(visualNode.type).toBe("knowledge");
    expect(visualNode.position).toEqual(placement.position);
    expect(visualNode.data).toEqual({
      title: node.title,
      content: node.content,
      nodeId: node.id,
      placementId: placement.id,
    });
  });

  it("rejects a Node that does not belong to the Placement", () => {
    const node = createNode("Idea");
    const otherNode = createNode("Other idea");
    const canvas = createCanvas("Principal");
    const placement = createPlacement(canvas.id, otherNode.id, { x: 0, y: 0 });

    expect(() => toReactFlowNode(node, placement)).toThrow(
      "Node and Placement identities do not match.",
    );
  });
});

describe("React Flow Edge adapter", () => {
  it("maps persistent Edge and Node identities to visual Placement identities", () => {
    const canvas = createCanvas("Principal");
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
    const edge = createEdge(sourceNode.id, targetNode.id);

    const [visualEdge] = toReactFlowEdges(
      [edge],
      [sourcePlacement, targetPlacement],
    );

    expect(visualEdge).toEqual({
      id: edge.id,
      source: sourcePlacement.id,
      target: targetPlacement.id,
      sourceHandle: "source",
      targetHandle: "target",
      className: "garden-connection",
      interactionWidth: 22,
      markerEnd: { type: "arrowclosed", color: "var(--connection)" },
      selected: false,
      ariaLabel: "Conexión entre ideas",
      domAttributes: { "aria-roledescription": "conexión" },
    });
    expect(visualEdge.source).not.toBe(sourceNode.id);
    expect(visualEdge.target).not.toBe(targetNode.id);
    expect(visualEdge).not.toHaveProperty("position");
  });

  it("keeps duplicate relationships visually distinct by EdgeId", () => {
    const canvas = createCanvas("Principal");
    const sourceNode = createNode("Source");
    const targetNode = createNode("Target");
    const placements = [
      createPlacement(canvas.id, sourceNode.id, { x: 0, y: 0 }),
      createPlacement(canvas.id, targetNode.id, { x: 300, y: 0 }),
    ];
    const first = createEdge(sourceNode.id, targetNode.id);
    const second = createEdge(sourceNode.id, targetNode.id);

    const visualEdges = toReactFlowEdges([first, second], placements);

    expect(visualEdges).toHaveLength(2);
    expect(visualEdges.map((edge) => edge.id)).toEqual([first.id, second.id]);
  });

  it("omits an Edge when either endpoint has no Placement in the Canvas", () => {
    const canvas = createCanvas("Principal");
    const sourceNode = createNode("Source");
    const targetNode = createNode("Target");
    const sourcePlacement = createPlacement(canvas.id, sourceNode.id, {
      x: 0,
      y: 0,
    });
    const targetPlacement = createPlacement(canvas.id, targetNode.id, {
      x: 300,
      y: 0,
    });
    const edge = createEdge(sourceNode.id, targetNode.id);

    expect(toReactFlowEdges([edge], [sourcePlacement])).toEqual([]);
    expect(toReactFlowEdges([edge], [targetPlacement])).toEqual([]);
  });

  it("keeps an Edge projectable in another Garden after one endpoint is removed here", () => {
    const gardenA = createCanvas("Garden A");
    const gardenB = createCanvas("Garden B");
    const sourceNode = createNode("Source");
    const targetNode = createNode("Target");
    const sourceA = createPlacement(gardenA.id, sourceNode.id, { x: 0, y: 0 });
    const sourceB = createPlacement(gardenB.id, sourceNode.id, { x: 0, y: 0 });
    const targetB = createPlacement(gardenB.id, targetNode.id, { x: 300, y: 0 });
    const edge = createEdge(sourceNode.id, targetNode.id);

    expect(toReactFlowEdges([edge], [sourceA])).toEqual([]);
    expect(toReactFlowEdges([edge], [sourceB, targetB])).toHaveLength(1);
    expect(edge).toMatchObject({
      sourceNodeId: sourceNode.id,
      targetNodeId: targetNode.id,
    });
  });

  it("maps a self-edge to the same visual Placement at both ends", () => {
    const canvas = createCanvas("Principal");
    const node = createNode("Self");
    const placement = createPlacement(canvas.id, node.id, { x: 0, y: 0 });
    const edge = createEdge(node.id, node.id);

    const [visualEdge] = toReactFlowEdges([edge], [placement]);

    expect(visualEdge.source).toBe(placement.id);
    expect(visualEdge.target).toBe(placement.id);
  });

  it("marks the selected directed Edge for Presentation", () => {
    const canvas = createCanvas("Principal");
    const sourceNode = createNode("Source");
    const targetNode = createNode("Target");
    const placements = [
      createPlacement(canvas.id, sourceNode.id, { x: 0, y: 0 }),
      createPlacement(canvas.id, targetNode.id, { x: 300, y: 0 }),
    ];
    const edge = createEdge(sourceNode.id, targetNode.id);

    const [visualEdge] = toReactFlowEdges([edge], placements, edge.id);

    expect(visualEdge.selected).toBe(true);
    expect(visualEdge.markerEnd).toEqual({ type: "arrowclosed", color: "var(--primary)" });
  });
});
