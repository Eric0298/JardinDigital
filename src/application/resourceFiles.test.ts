import { describe, expect, it, vi } from "vitest";
import { createNode } from "../domain/node";
import { createResource } from "../domain/resource";
import { addLinkedResource, openResource } from "./resourceFiles";
import { addResource } from "./resourcePersistence";

function files(path: string | null = "C:/docs/original.pdf", available = true) {
  return { chooseFile: vi.fn(async () => path), exists: vi.fn(async () => available), open: vi.fn(async () => undefined) };
}

describe("Resource application operations", () => {
  it("cancellation leaves the idea and resource metadata unchanged", async () => {
    const native = files(null);
    const save = vi.fn();
    expect(await addLinkedResource({ save }, native, createNode("Idea").id, "document")).toBeNull();
    expect(save).not.toHaveBeenCalled();
    expect(native.exists).not.toHaveBeenCalled();
  });

  it("saves only the original path and the same idea association after file selection", async () => {
    const native = files();
    const save = vi.fn();
    const node = createNode("Idea");
    const resource = await addLinkedResource({ save }, native, node.id, "document");
    expect(resource).toMatchObject({ nodeId: node.id, title: "original.pdf", locator: "C:/docs/original.pdf", location: "local" });
    expect(save).toHaveBeenCalledWith(resource);
  });

  it("reports missing files before persisting or opening while preserving existing metadata", async () => {
    const native = files("C:/missing/file.pdf", false);
    const save = vi.fn();
    const node = createNode("Idea");
    await expect(addLinkedResource({ save }, native, node.id, "document")).rejects.toThrow("Archivo no disponible");
    const resource = createResource(node.id, "document", "File", "C:/missing/file.pdf", "local");
    await expect(openResource(native, resource)).rejects.toThrow("Archivo no disponible");
    expect(save).not.toHaveBeenCalled();
    expect(native.open).not.toHaveBeenCalled();
    expect(resource.locator).toBe("C:/missing/file.pdf");
  });

  it("opens URL resources without checking the local filesystem", async () => {
    const native = files();
    const resource = createResource(createNode("Idea").id, "video", "Vídeo", "https://example.com/watch", "url");
    await openResource(native, resource);
    expect(native.open).toHaveBeenCalledWith(resource);
    expect(native.exists).not.toHaveBeenCalled();
  });

  it("validation rejects unsafe links before persistence and propagates save failures", async () => {
    const save = vi.fn().mockRejectedValue(new Error("Sin espacio"));
    const node = createNode("Idea");
    await expect(addResource({ save }, node.id, "link", "Link", "javascript:alert(1)", "url")).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
    await expect(addResource({ save }, node.id, "link", "Link", "https://example.com", "url")).rejects.toThrow("Sin espacio");
  });
});
