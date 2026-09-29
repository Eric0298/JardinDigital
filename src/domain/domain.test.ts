import { describe, expect, it, vi } from "vitest";
import { createCanvas, rehydrateCanvas, type CanvasId } from "./canvas";
import { createEdge } from "./edge";
import { createNode, editNode, rehydrateNode, type NodeId } from "./node";
import {
  createPlacement,
  movePlacement,
  rehydratePlacement,
} from "./placement";
import { createResource } from "./resource";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("Node", () => {
  it("creates a node with title and content", () => {
    const node = createNode("Título", "Contenido");

    expect(node.title).toBe("Título");
    expect(node.content).toBe("Contenido");
  });

  it("creates a node with only a title", () => {
    const node = createNode("Título", "");

    expect(node.title).toBe("Título");
    expect(node.content).toBe("");
  });

  it("creates a node with only content", () => {
    const node = createNode("", "Contenido");

    expect(node.title).toBe("");
    expect(node.content).toBe("Contenido");
  });

  it("rejects an empty title and empty content", () => {
    expect(() => createNode("", "")).toThrow(
      "Node title and content must not both be empty.",
    );
  });

  it("rejects a whitespace-only title and content", () => {
    expect(() => createNode("   ", "   ")).toThrow(
      "Node title and content must not both be empty.",
    );
  });

  it("normalizes title and content", () => {
    const node = createNode("  Título  ", "  Contenido  ");

    expect(node.title).toBe("Título");
    expect(node.content).toBe("Contenido");
  });

  it("generates a distinct UUID for each node", () => {
    const first = createNode("Primero");
    const second = createNode("Segundo");

    expect(first.id).toMatch(UUID_PATTERN);
    expect(second.id).toMatch(UUID_PATTERN);
    expect(first.id).not.toBe(second.id);
  });

  it("edits a node without changing its identity", () => {
    const node = createNode("Original", "Content");

    const edited = editNode(node, "  Updated  ", "  New content  ");

    expect(edited).toEqual({
      id: node.id,
      title: "Updated",
      content: "New content",
    });
  });

  describe("rehydration", () => {
    const storedId = "d76f7bb8-9f8f-4f5c-b8a4-4d46202ce34a";

    it("preserves exactly the provided identity", () => {
      const node = rehydrateNode(storedId, "Title", "Content");

      expect(node.id).toBe(storedId);
    });

    it("normalizes the title", () => {
      const node = rehydrateNode(storedId, "  Title  ", "Content");

      expect(node.title).toBe("Title");
    });

    it("normalizes the content", () => {
      const node = rehydrateNode(storedId, "Title", "  Content  ");

      expect(node.content).toBe("Content");
    });

    it("allows an empty title when content has a value", () => {
      const node = rehydrateNode(storedId, "   ", "Content");

      expect(node.title).toBe("");
      expect(node.content).toBe("Content");
    });

    it("allows empty content when the title has a value", () => {
      const node = rehydrateNode(storedId, "Title", "   ");

      expect(node.title).toBe("Title");
      expect(node.content).toBe("");
    });

    it("rejects an empty or whitespace-only title and content", () => {
      expect(() => rehydrateNode(storedId, "", "")).toThrow(
        "Node title and content must not both be empty.",
      );
      expect(() => rehydrateNode(storedId, "   ", "   ")).toThrow(
        "Node title and content must not both be empty.",
      );
    });

    it("rejects an invalid stored identity", () => {
      expect(() => rehydrateNode("not-a-uuid", "Title", "Content")).toThrow(
        "Node id must be a valid application UUID.",
      );
    });

    it("does not generate a new identity", () => {
      const randomUuid = vi.spyOn(globalThis.crypto, "randomUUID");

      const node = rehydrateNode(storedId, "Title");

      expect(randomUuid).not.toHaveBeenCalled();
      expect(node.id).toBe(storedId);
      randomUuid.mockRestore();
    });
  });
});

describe("Edge", () => {
  it("creates an edge with its source and target nodes", () => {
    const source = createNode("Origen");
    const target = createNode("Destino");
    const edge = createEdge(source.id, target.id);

    expect(edge.sourceNodeId).toBe(source.id);
    expect(edge.targetNodeId).toBe(target.id);
  });

  it("generates its own identity", () => {
    const source = createNode("Origen");
    const target = createNode("Destino");
    const edge = createEdge(source.id, target.id);

    expect(edge.id).toMatch(UUID_PATTERN);
    expect(edge.id).not.toBe(source.id);
    expect(edge.id).not.toBe(target.id);
  });

  it("rejects an empty source node identity", () => {
    const target = createNode("Destino");

    expect(() => createEdge("" as NodeId, target.id)).toThrow(
      "Edge sourceNodeId must not be empty.",
    );
  });

  it("rejects an empty target node identity", () => {
    const source = createNode("Origen");

    expect(() => createEdge(source.id, "" as NodeId)).toThrow(
      "Edge targetNodeId must not be empty.",
    );
  });

  it("allows a node to connect to itself", () => {
    const node = createNode("Autorreferencia");
    const edge = createEdge(node.id, node.id);

    expect(edge.sourceNodeId).toBe(node.id);
    expect(edge.targetNodeId).toBe(node.id);
  });
});

describe("Resource", () => {
  it("normalizes its title and generates distinct identities", () => {
    const first = createResource("  Referencia  ");
    const second = createResource("Otra referencia");

    expect(first.title).toBe("Referencia");
    expect(first.id).toMatch(UUID_PATTERN);
    expect(second.id).toMatch(UUID_PATTERN);
    expect(first.id).not.toBe(second.id);
  });

  it("rejects an empty or whitespace-only title", () => {
    expect(() => createResource("")).toThrow(
      "Resource title must not be empty.",
    );
    expect(() => createResource("   ")).toThrow(
      "Resource title must not be empty.",
    );
  });
});

describe("Canvas", () => {
  it("normalizes its title and generates distinct identities", () => {
    const first = createCanvas("  Investigación  ");
    const second = createCanvas("Escritura");

    expect(first.title).toBe("Investigación");
    expect(first.id).toMatch(UUID_PATTERN);
    expect(second.id).toMatch(UUID_PATTERN);
    expect(first.id).not.toBe(second.id);
  });

  it("rejects an empty or whitespace-only title", () => {
    expect(() => createCanvas("")).toThrow(
      "Canvas title must not be empty.",
    );
    expect(() => createCanvas("   ")).toThrow(
      "Canvas title must not be empty.",
    );
  });

  describe("rehydration", () => {
    const storedId = "30a50c27-b1f4-48ae-a9b4-ece2c2da2d31";

    it("preserves the stored identity and normalizes the title", () => {
      const canvas = rehydrateCanvas(storedId, "  Principal  ");

      expect(canvas).toEqual({ id: storedId, title: "Principal" });
    });

    it("rejects an invalid stored identity", () => {
      expect(() => rehydrateCanvas("not-a-uuid", "Principal")).toThrow(
        "Canvas id must be a valid application UUID.",
      );
    });

    it("keeps the existing title invariant", () => {
      expect(() => rehydrateCanvas(storedId, "   ")).toThrow(
        "Canvas title must not be empty.",
      );
    });

    it("does not generate a new identity", () => {
      const randomUuid = vi.spyOn(globalThis.crypto, "randomUUID");

      const canvas = rehydrateCanvas(storedId, "Principal");

      expect(randomUuid).not.toHaveBeenCalled();
      expect(canvas.id).toBe(storedId);
      randomUuid.mockRestore();
    });
  });
});

describe("Placement", () => {
  it("creates a placement with its references and position", () => {
    const node = createNode("Conocimiento");
    const canvas = createCanvas("Principal");
    const placement = createPlacement(canvas.id, node.id, { x: 100, y: 200 });

    expect(placement.id).toMatch(UUID_PATTERN);
    expect(placement.canvasId).toBe(canvas.id);
    expect(placement.nodeId).toBe(node.id);
    expect(placement.position).toEqual({ x: 100, y: 200 });
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("rejects %s coordinates", (_label, coordinate) => {
    const node = createNode("Conocimiento");
    const canvas = createCanvas("Principal");

    expect(() =>
      createPlacement(canvas.id, node.id, { x: coordinate, y: 0 }),
    ).toThrow("Placement coordinates must be finite numbers.");
    expect(() =>
      createPlacement(canvas.id, node.id, { x: 0, y: coordinate }),
    ).toThrow("Placement coordinates must be finite numbers.");
  });

  it("rejects an empty canvas identity", () => {
    const node = createNode("Conocimiento");

    expect(() =>
      createPlacement("" as CanvasId, node.id, { x: 0, y: 0 }),
    ).toThrow("Placement canvasId must not be empty.");
  });

  it("rejects an empty node identity", () => {
    const canvas = createCanvas("Principal");

    expect(() =>
      createPlacement(canvas.id, "" as NodeId, { x: 0, y: 0 }),
    ).toThrow("Placement nodeId must not be empty.");
  });

  it("places the same node in different canvases and positions", () => {
    const node = createNode("Conocimiento compartido");
    const firstCanvas = createCanvas("Investigación");
    const secondCanvas = createCanvas("Escritura");
    const firstPlacement = createPlacement(firstCanvas.id, node.id, {
      x: 100,
      y: 200,
    });
    const secondPlacement = createPlacement(secondCanvas.id, node.id, {
      x: 500,
      y: 100,
    });

    expect(firstPlacement.nodeId).toBe(node.id);
    expect(secondPlacement.nodeId).toBe(node.id);
    expect(firstPlacement.canvasId).not.toBe(secondPlacement.canvasId);
    expect(firstPlacement.position).not.toEqual(secondPlacement.position);
  });

  it("allows negative coordinates", () => {
    const node = createNode("Conocimiento");
    const canvas = createCanvas("Principal");

    const placement = createPlacement(canvas.id, node.id, {
      x: -125.5,
      y: -80.25,
    });

    expect(placement.position).toEqual({ x: -125.5, y: -80.25 });
  });

  describe("rehydration", () => {
    const placementId = "e0be9022-d56c-402a-a4f3-632f57d9363f";
    const canvasId = "30a50c27-b1f4-48ae-a9b4-ece2c2da2d31";
    const nodeId = "d76f7bb8-9f8f-4f5c-b8a4-4d46202ce34a";

    it("preserves all identities and the stored position", () => {
      const placement = rehydratePlacement(
        placementId,
        canvasId,
        nodeId,
        { x: -10.5, y: 42.25 },
      );

      expect(placement).toEqual({
        id: placementId,
        canvasId,
        nodeId,
        position: { x: -10.5, y: 42.25 },
      });
    });

    it.each([
      ["placement", "invalid", canvasId, nodeId],
      ["canvas", placementId, "invalid", nodeId],
      ["node", placementId, canvasId, "invalid"],
    ])("rejects an invalid %s identity", (_label, id, canvas, node) => {
      expect(() =>
        rehydratePlacement(id, canvas, node, { x: 0, y: 0 }),
      ).toThrow("must be a valid application UUID.");
    });

    it.each([
      ["NaN", Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY],
      ["-Infinity", Number.NEGATIVE_INFINITY],
    ])("rejects %s coordinates", (_label, coordinate) => {
      expect(() =>
        rehydratePlacement(placementId, canvasId, nodeId, {
          x: coordinate,
          y: 0,
        }),
      ).toThrow("Placement coordinates must be finite numbers.");
      expect(() =>
        rehydratePlacement(placementId, canvasId, nodeId, {
          x: 0,
          y: coordinate,
        }),
      ).toThrow("Placement coordinates must be finite numbers.");
    });

    it("does not generate a new identity", () => {
      const randomUuid = vi.spyOn(globalThis.crypto, "randomUUID");

      const placement = rehydratePlacement(
        placementId,
        canvasId,
        nodeId,
        { x: 0, y: 0 },
      );

      expect(randomUuid).not.toHaveBeenCalled();
      expect(placement.id).toBe(placementId);
      randomUuid.mockRestore();
    });
  });

  describe("movement", () => {
    it("changes only position and preserves every identity", () => {
      const node = createNode("Conocimiento");
      const canvas = createCanvas("Principal");
      const placement = createPlacement(canvas.id, node.id, { x: 0, y: 0 });

      const moved = movePlacement(placement, { x: -40.5, y: 330.25 });

      expect(moved).toEqual({
        id: placement.id,
        canvasId: placement.canvasId,
        nodeId: placement.nodeId,
        position: { x: -40.5, y: 330.25 },
      });
    });

    it.each([
      ["NaN", Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY],
      ["-Infinity", Number.NEGATIVE_INFINITY],
    ])("rejects %s coordinates", (_label, coordinate) => {
      const node = createNode("Conocimiento");
      const canvas = createCanvas("Principal");
      const placement = createPlacement(canvas.id, node.id, { x: 0, y: 0 });

      expect(() => movePlacement(placement, { x: coordinate, y: 0 })).toThrow(
        "Placement coordinates must be finite numbers.",
      );
      expect(() => movePlacement(placement, { x: 0, y: coordinate })).toThrow(
        "Placement coordinates must be finite numbers.",
      );
    });
  });
});
