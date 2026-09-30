import { describe, expect, it, vi } from "vitest";
import type { Node } from "../domain/node";
import { captureNode } from "./captureNode";

function persistence() {
  return { capture: vi.fn(async (_node: Node) => undefined) };
}

describe("captureNode", () => {
  it.each([
    ["  A title  ", "", "A title", ""],
    ["", "  Useful content  ", "", "Useful content"],
    ["  A title  ", "  Useful content  ", "A title", "Useful content"],
  ])(
    "captures valid title/content combinations through one atomic persistence operation",
    async (title, content, expectedTitle, expectedContent) => {
      const inboxPersistence = persistence();

      const node = await captureNode(inboxPersistence, title, content);

      expect(node).toMatchObject({
        title: expectedTitle,
        content: expectedContent,
      });
      expect(inboxPersistence.capture).toHaveBeenCalledOnce();
      expect(inboxPersistence.capture).toHaveBeenCalledWith(node);
    },
  );

  it("rejects whitespace without calling persistence", async () => {
    const inboxPersistence = persistence();

    await expect(captureNode(inboxPersistence, "  ", "\n ")).rejects.toThrow(
      "Node title and content must not both be empty.",
    );

    expect(inboxPersistence.capture).not.toHaveBeenCalled();
  });

  it("returns the exact Node identity received by Inbox persistence", async () => {
    const inboxPersistence = persistence();

    const node = await captureNode(inboxPersistence, "Identity", "");

    expect(inboxPersistence.capture.mock.calls[0]?.[0].id).toBe(node.id);
  });

  it("propagates atomic persistence failure without returning false success", async () => {
    const inboxPersistence = persistence();
    const failure = new Error("atomic capture failed");
    inboxPersistence.capture.mockRejectedValueOnce(failure);

    await expect(captureNode(inboxPersistence, "Idea", "")).rejects.toBe(failure);
  });
});
