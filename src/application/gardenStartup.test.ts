import { describe, expect, it, vi } from "vitest";
import { createCanvas, type Canvas } from "../domain/canvas";
import { createGarden, loadGardenStartup, renameGarden } from "./gardenStartup";

describe("loadGardenStartup", () => {
  it("returns an empty state when there are no Gardens", async () => {
    const list = vi.fn(async (): Promise<Canvas[]> => []);

    await expect(loadGardenStartup({ list })).resolves.toEqual({
      gardens: [],
      initialGarden: null,
    });
  });

  it("keeps Home as the entrypoint with one Garden", async () => {
    const garden = createCanvas("Main garden");
    const list = vi.fn(async () => [garden]);

    await expect(loadGardenStartup({ list })).resolves.toEqual({
      gardens: [garden],
      initialGarden: null,
    });
  });

  it("lists all Gardens without automatically opening one", async () => {
    const first = createCanvas("Alpha");
    const second = createCanvas("Beta");
    const list = vi.fn(async () => [first, second]);

    await expect(loadGardenStartup({ list })).resolves.toEqual({
      gardens: [first, second],
      initialGarden: null,
    });
  });
});

describe("renameGarden", () => {
  it("preserves Garden identity and saves its normalized title", async () => {
    const original = createCanvas("Before");
    const save = vi.fn(async (_garden: Canvas) => undefined);
    const renamed = await renameGarden({ save }, original, "  After  ");
    expect(renamed).toEqual({ id: original.id, title: "After" });
    expect(save).toHaveBeenCalledWith(renamed);
  });

  it("does not write an empty title", async () => {
    const save = vi.fn(async (_garden: Canvas) => undefined);
    await expect(renameGarden({ save }, createCanvas("Before"), " ")).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
  });
});

describe("createGarden", () => {
  it("creates and persists an empty Domain Canvas", async () => {
    const save = vi.fn(async (_garden: Canvas) => undefined);

    const garden = await createGarden({ save }, "  Research  ");

    expect(garden.title).toBe("Research");
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith(garden);
  });

  it("does not persist an invalid title", async () => {
    const save = vi.fn(async (_garden: Canvas) => undefined);

    await expect(createGarden({ save }, "   ")).rejects.toThrow(
      "Canvas title must not be empty.",
    );
    expect(save).not.toHaveBeenCalled();
  });
});
