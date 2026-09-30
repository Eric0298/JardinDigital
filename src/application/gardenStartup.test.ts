import { describe, expect, it, vi } from "vitest";
import { createCanvas, type Canvas } from "../domain/canvas";
import { createGarden, loadGardenStartup } from "./gardenStartup";

describe("loadGardenStartup", () => {
  it("returns an empty state when there are no Gardens", async () => {
    const list = vi.fn(async (): Promise<Canvas[]> => []);

    await expect(loadGardenStartup({ list })).resolves.toEqual({
      gardens: [],
      initialGarden: null,
    });
  });

  it("opens the only Garden automatically", async () => {
    const garden = createCanvas("Main garden");
    const list = vi.fn(async () => [garden]);

    await expect(loadGardenStartup({ list })).resolves.toEqual({
      gardens: [garden],
      initialGarden: garden,
    });
  });

  it("uses the first Garden from the deterministic persistence order", async () => {
    const first = createCanvas("Alpha");
    const second = createCanvas("Beta");
    const list = vi.fn(async () => [first, second]);

    await expect(loadGardenStartup({ list })).resolves.toEqual({
      gardens: [first, second],
      initialGarden: first,
    });
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
