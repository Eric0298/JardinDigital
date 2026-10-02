import { describe, expect, it, vi } from "vitest";
import { createNode } from "../domain/node";
import { persistNodeEdit } from "./nodePersistence";
import { loadInbox } from "./loadInbox";

describe("loadInbox", () => {
  it("returns an empty Inbox", async () => {
    const list = vi.fn(async () => []);
    await expect(loadInbox({ list })).resolves.toEqual([]);
  });

  it("returns persisted Domain Nodes without changing their identity or order", async () => {
    const first = createNode("Alpha");
    const second = createNode("", "Beta content");
    const list = vi.fn(async () => [first, second]);

    const loaded = await loadInbox({ list });

    expect(loaded).toEqual([first, second]);
    expect(loaded[0]?.id).toBe(first.id);
    expect(loaded[1]?.id).toBe(second.id);
  });

  it("keeps Inbox membership while editing the same Node", async () => {
    const original = createNode("Original");
    const membership = new Set([original.id]);
    const save = vi.fn(async () => undefined);

    const edited = await persistNodeEdit(
      { save },
      original,
      "Updated",
      "New content",
    );

    expect(edited.id).toBe(original.id);
    expect(membership.has(edited.id)).toBe(true);
    expect(save).toHaveBeenCalledWith(edited);
  });
});
