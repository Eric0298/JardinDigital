import { describe, expect, it, vi } from "vitest";
import { createNode } from "./node";
import { createResource, rehydrateResource, type ResourceKind } from "./resource";

describe("Resource linked metadata", () => {
  it.each(["document", "video"] as const)("associates %s to the same idea without requiring or copying file bytes", (kind) => {
    const node = createNode("Idea");
    const resource = createResource(node.id, kind, "  Original  ", "  C:/missing/original.pdf  ", "local");
    expect(resource).toMatchObject({ nodeId: node.id, kind, title: "Original", locator: "C:/missing/original.pdf", location: "local" });
    expect(Object.keys(resource).sort()).toEqual(["id", "kind", "location", "locator", "nodeId", "title"]);
  });

  it("rehydrates identities exactly without creating another resource", () => {
    const node = createNode("Idea");
    const resource = createResource(node.id, "video", "Vídeo", "https://example.com/watch", "url");
    const randomUUID = vi.spyOn(globalThis.crypto, "randomUUID");
    expect(rehydrateResource(resource.id, node.id, resource.kind, resource.title, resource.locator, resource.location)).toEqual(resource);
    expect(randomUUID).not.toHaveBeenCalled();
    randomUUID.mockRestore();
  });

  it.each(["javascript:alert(1)", "file:///C:/private.pdf", "ftp://example.com", "https://user:pass@example.com", "http://", "https://example.com\ninvalid"])("rejects unsafe URL %s", (url) => {
    expect(() => createResource(createNode("Idea").id, "link", "Enlace", url, "url")).toThrow();
  });

  it("accepts valid http and https links", () => {
    const node = createNode("Idea");
    for (const url of ["http://localhost:3000", "https://example.com/path?q=hola#title"]) {
      expect(createResource(node.id, "link", "Enlace", url, "url").locator).toBe(url);
    }
  });

  it("rejects invalid stored identities, kind and relative local paths", () => {
    const node = createNode("Idea");
    expect(() => rehydrateResource("invalid", node.id, "document", "Doc", "C:/doc.pdf", "local")).toThrow();
    expect(() => createResource("invalid" as never, "document", "Doc", "C:/doc.pdf", "local")).toThrow();
    expect(() => createResource(node.id, "other" as ResourceKind, "Doc", "C:/doc.pdf", "local")).toThrow();
    expect(() => createResource(node.id, "document", "Doc", "relative/doc.pdf", "local")).toThrow();
    expect(() => createResource(node.id, "link", "Doc", "C:/doc.pdf", "local")).toThrow();
  });
});
