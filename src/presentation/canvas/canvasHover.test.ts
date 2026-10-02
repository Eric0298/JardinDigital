import { describe, expect, it } from "vitest";
import { MarkerType } from "@xyflow/react";
import type { CanvasFlowEdge, CanvasFlowNode } from "./reactFlowAdapter";
import { buildCanvasAdjacency, leaveCanvasHover, projectCanvasHover } from "./canvasHover";

function idea(id: string, selected = false): CanvasFlowNode {
  return { id, type: "knowledge", position: { x: 15, y: 20 }, selected, data: { title: id, content: "", nodeId: id as CanvasFlowNode["data"]["nodeId"], placementId: id as CanvasFlowNode["data"]["placementId"] } };
}

function connection(id: string, source: string, target: string, selected = false): CanvasFlowEdge {
  return { id, source, target, selected, className: "garden-connection", markerEnd: { type: MarkerType.ArrowClosed, color: selected ? "var(--primary)" : "var(--connection)" } };
}

describe("Presentation-only garden hover", () => {
  it("highlights incident connections and direct neighbors without traversing the next level", () => {
    const nodes = [idea("a"), idea("b"), idea("c"), idea("d")];
    const edges = [connection("ab", "a", "b"), connection("ca", "c", "a"), connection("bd", "b", "d")];
    const visual = projectCanvasHover(nodes, edges, buildCanvasAdjacency(edges), { kind: "idea", id: "a" });

    expect(visual.nodes[0].className).toBe("garden-idea--hovered");
    expect(visual.nodes[1].className).toBe("garden-idea--related");
    expect(visual.nodes[2].className).toBe("garden-idea--related");
    expect(visual.nodes[3]).toBe(nodes[3]);
    expect(visual.edges[0].className).toContain("garden-connection--highlighted");
    expect(visual.edges[0].markerEnd).toEqual({ type: MarkerType.ArrowClosed, color: "var(--accent)" });
    expect(visual.edges[1].className).toContain("garden-connection--highlighted");
    expect(visual.edges[2]).toBe(edges[2]);
  });

  it("highlights one hovered connection and both endpoints, preserving arrow direction and selection", () => {
    const nodes = [idea("a", true), idea("b"), idea("c")];
    const edges = [connection("ab", "a", "b", true), connection("bc", "b", "c")];
    const visual = projectCanvasHover(nodes, edges, buildCanvasAdjacency(edges), { kind: "connection", id: "ab" });

    expect(visual.nodes[0].selected).toBe(true);
    expect(visual.nodes[0].data).toBe(nodes[0].data);
    expect(visual.nodes[0].position).toBe(nodes[0].position);
    expect(visual.nodes[0].className).toBe("garden-idea--related");
    expect(visual.nodes[1].className).toBe("garden-idea--related");
    expect(visual.nodes[2]).toBe(nodes[2]);
    expect(visual.edges[0]).toMatchObject({ selected: true, source: "a", target: "b", markerEnd: edges[0].markerEnd });
    expect(visual.edges[0].className).toContain("garden-connection--hovered");
    expect(visual.edges[1]).toBe(edges[1]);
    expect(nodes[0].className).toBeUndefined();
    expect(edges[0].className).toBe("garden-connection");
  });

  it("restores the exact loaded objects on leave without dropping active selection", () => {
    const nodes = [idea("a", true), idea("b")];
    const edges = [connection("ab", "a", "b", true)];
    const target = { kind: "connection", id: "ab" } as const;
    const cleared = leaveCanvasHover(target, target);
    const restored = projectCanvasHover(nodes, edges, buildCanvasAdjacency(edges), cleared);

    expect(cleared).toBeNull();
    expect(restored.nodes).toBe(nodes);
    expect(restored.edges).toBe(edges);
    expect(restored.nodes[0].selected).toBe(true);
    expect(restored.edges[0].selected).toBe(true);
  });

  it("preserves distinct duplicate and reverse connections and handles a self-connection once", () => {
    const nodes = [idea("a"), idea("b")];
    const edges = [connection("ab1", "a", "b"), connection("ab2", "a", "b"), connection("ba", "b", "a"), connection("aa", "a", "a")];
    const adjacency = buildCanvasAdjacency(edges);
    const visual = projectCanvasHover(nodes, edges, adjacency, { kind: "idea", id: "a" });

    expect(adjacency.ideas.get("a")?.connections.size).toBe(4);
    expect([...adjacency.ideas.get("a")!.neighbors]).toEqual(["b"]);
    expect(visual.edges.map((edge) => edge.id)).toEqual(["ab1", "ab2", "ba", "aa"]);
    expect(visual.edges.every((edge) => edge.className?.includes("garden-connection--highlighted"))).toBe(true);
    expect(visual.nodes[0].className).toBe("garden-idea--hovered");
    const self = projectCanvasHover(nodes, edges, adjacency, { kind: "connection", id: "aa" });
    expect(self.nodes[0].className).toBe("garden-idea--related");
    expect(self.nodes[1]).toBe(nodes[1]);
  });

  it("supports isolated ideas and stale targets without selecting or changing unrelated elements", () => {
    const nodes = [idea("a"), idea("b", true)];
    const edges: CanvasFlowEdge[] = [];
    const adjacency = buildCanvasAdjacency(edges);
    expect(projectCanvasHover(nodes, edges, adjacency, { kind: "idea", id: "a" }).nodes[0].className).toBe("garden-idea--hovered");
    const stale = projectCanvasHover(nodes, edges, adjacency, { kind: "connection", id: "removed" });
    expect(stale.nodes[0]).toBe(nodes[0]);
    expect(stale.nodes[1]).toBe(nodes[1]);
    const next = { kind: "idea", id: "b" } as const;
    expect(leaveCanvasHover(next, { kind: "connection", id: "removed" })).toBe(next);
  });
});
