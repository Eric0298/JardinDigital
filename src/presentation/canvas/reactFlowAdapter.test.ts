import { describe, expect, it } from "vitest";
import { createCanvas } from "../../domain/canvas";
import { createNode } from "../../domain/node";
import { createPlacement } from "../../domain/placement";
import { toReactFlowNode } from "./reactFlowAdapter";

describe("React Flow canvas adapter", () => {
  it("maps a Domain Node and Placement to a visual node", () => {
    const node = createNode("Idea", "Develop this thought");
    const canvas = createCanvas("Principal");
    const placement = createPlacement(canvas.id, node.id, {
      x: -45.5,
      y: 210.25,
    });

    const visualNode = toReactFlowNode(node, placement);

    expect(visualNode.id).toBe(placement.id);
    expect(visualNode.position).toEqual(placement.position);
    expect(visualNode.data).toEqual({
      label: node.title,
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
