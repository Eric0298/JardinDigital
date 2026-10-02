import { describe, expect, it } from "vitest";
import { createCanvas } from "../../domain/canvas";
import { composeGardenScene, deriveGardenGrowth, gardenVisualSeed, GARDEN_GROWTH_THRESHOLDS } from "./gardenGrowth";

const counts = (ideaCount: number, connectionCount = 0, resourceCount = 0) => ({ ideaCount, connectionCount, resourceCount });

describe("Derived garden growth", () => {
  it("weights ideas, visible relationships and attached resources independently", () => {
    expect(deriveGardenGrowth(counts(5, 3, 4))).toEqual({ score: 15, stage: 4 });
    expect(deriveGardenGrowth(counts(0, 2, 0)).score).toBe(4);
    expect(deriveGardenGrowth(counts(0, 0, 2)).score).toBe(2);
  });

  it("keeps an empty garden at the initial terrain stage", () => {
    const garden = createCanvas("Vacío");
    expect(deriveGardenGrowth(counts(0))).toEqual({ score: 0, stage: 0 });
    expect(composeGardenScene(garden.id, 0)).toMatchObject({ decorations: [], water: false, fauna: false });
  });

  it("honors all twelve stage boundaries without skipping or moving them", () => {
    GARDEN_GROWTH_THRESHOLDS.forEach((threshold, stage) => {
      expect(deriveGardenGrowth(counts(threshold)).stage).toBe(stage);
      if (stage > 0) expect(deriveGardenGrowth(counts(threshold - 1)).stage).toBe(stage - 1);
      if (stage < 11) expect(deriveGardenGrowth(counts(GARDEN_GROWTH_THRESHOLDS[stage + 1] - 1)).stage).toBe(stage);
    });
  });

  it("caps a large garden and its decorative objects without overflowing the score", () => {
    const garden = createCanvas("Grande");
    expect(deriveGardenGrowth(counts(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER))).toEqual({ score: Number.MAX_SAFE_INTEGER, stage: 11 });
    const scene = composeGardenScene(garden.id, 11);
    expect(scene.decorations).toHaveLength(18);
    expect(scene.water).toBe(true);
    expect(scene.fauna).toBe(true);
    expect(composeGardenScene(garden.id, 50)).toEqual(scene);
  });

  it("uses the garden identity as a stable seed and preserves the base composition as it grows", () => {
    const garden = createCanvas("Estable");
    const other = createCanvas("Otro");
    const initial = composeGardenScene(garden.id, 4);
    const later = composeGardenScene(garden.id, 8);
    expect(gardenVisualSeed(garden.id)).toBe(gardenVisualSeed(garden.id));
    expect(gardenVisualSeed(garden.id)).not.toBe(gardenVisualSeed(other.id));
    expect(initial).toEqual(composeGardenScene(garden.id, 4));
    expect(later.decorations[0]).toMatchObject({ kind: initial.decorations[0].kind, x: initial.decorations[0].x, y: initial.decorations[0].y, flipped: initial.decorations[0].flipped });
    expect(later.decorations[0].scale).toBeGreaterThan(initial.decorations[0].scale);
  });

  it("adds water and fauna only at their respective mature stages", () => {
    const garden = createCanvas("Paisaje");
    expect(composeGardenScene(garden.id, 8).water).toBe(false);
    expect(composeGardenScene(garden.id, 9).water).toBe(true);
    expect(composeGardenScene(garden.id, 10).fauna).toBe(false);
    expect(composeGardenScene(garden.id, 11).fauna).toBe(true);
  });
});
