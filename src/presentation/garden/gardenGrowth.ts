import type { CanvasId } from "../../domain/canvas";

export interface GardenGrowthCounts {
  readonly ideaCount: number;
  readonly connectionCount: number;
  readonly resourceCount: number;
}

export interface GardenGrowth {
  readonly score: number;
  readonly stage: number;
}

/** Ideas + 2 × visible connections + resources attached to placed ideas. */
export const GARDEN_GROWTH_THRESHOLDS = [0, 1, 3, 6, 10, 16, 24, 36, 52, 76, 108, 150] as const;

function safeCount(count: number): number {
  return Number.isFinite(count) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.trunc(count))) : 0;
}

export function deriveGardenGrowth(counts: GardenGrowthCounts): GardenGrowth {
  const score = Math.min(Number.MAX_SAFE_INTEGER, safeCount(counts.ideaCount) + 2 * safeCount(counts.connectionCount) + safeCount(counts.resourceCount));
  let stage = 0;
  for (let index = 1; index < GARDEN_GROWTH_THRESHOLDS.length; index += 1) {
    if (score < GARDEN_GROWTH_THRESHOLDS[index]) break;
    stage = index;
  }
  return { score, stage };
}

/** Stable FNV-1a seed; decorative composition never calls Math.random. */
export function gardenVisualSeed(gardenId: CanvasId): number {
  let hash = 2166136261;
  for (let index = 0; index < gardenId.length; index += 1) {
    hash = Math.imul(hash ^ gardenId.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

interface Decoration {
  readonly kind: "sprout" | "bush" | "tree";
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly flipped: boolean;
}

export interface GardenSceneModel {
  readonly seed: number;
  readonly decorations: readonly Decoration[];
  readonly water: boolean;
  readonly fauna: boolean;
}

const profiles = [
  [0, 0, 0], [1, 0, 0], [3, 0, 0], [3, 1, 0], [2, 1, 1], [4, 1, 1],
  [5, 3, 1], [5, 3, 2], [5, 4, 4], [5, 4, 4], [7, 5, 5], [7, 5, 6],
] as const;

function seededOffset(seed: number, index: number, salt: number): number {
  let value = Math.imul(seed ^ salt, 1597334677) ^ Math.imul(index + 1, 3812015801);
  value = Math.imul(value ^ (value >>> 16), 2246822507);
  return ((value >>> 0) % 1000) / 1000;
}

/** Renderer-independent decorative description. No React Flow or persisted objects. */
export function composeGardenScene(gardenId: CanvasId, growthStage: number): GardenSceneModel {
  const stage = Math.max(0, Math.min(11, Math.trunc(Number.isFinite(growthStage) ? growthStage : 0)));
  const seed = gardenVisualSeed(gardenId);
  const [sprouts, bushes, trees] = profiles[stage];
  const decorations: Decoration[] = [];
  const treeSlots = [246, 116, 300, 64, 174, 218];
  for (let index = 0; index < trees; index += 1) {
    decorations.push({ kind: "tree", x: treeSlots[index] + (seededOffset(seed, index, 11) - 0.5) * 18, y: 124 + seededOffset(seed, index, 13) * 10,
      scale: (stage === 4 ? 0.63 : stage === 5 ? 0.8 : 0.93) + seededOffset(seed, index, 17) * 0.09, flipped: seededOffset(seed, index, 19) > 0.5 });
  }
  const bushSlots = [196, 90, 284, 144, 46];
  for (let index = 0; index < bushes; index += 1) {
    decorations.push({ kind: "bush", x: bushSlots[index] + (seededOffset(seed, index, 23) - 0.5) * 20, y: 140 + seededOffset(seed, index, 29) * 8,
      scale: 0.8 + seededOffset(seed, index, 31) * 0.28, flipped: seededOffset(seed, index, 37) > 0.5 });
  }
  const sproutSlots = [169, 132, 228, 64, 303, 106, 254];
  for (let index = 0; index < sprouts; index += 1) {
    decorations.push({ kind: "sprout", x: sproutSlots[index] + (seededOffset(seed, index, 41) - 0.5) * 12, y: 150 + seededOffset(seed, index, 43) * 7,
      scale: 0.72 + seededOffset(seed, index, 47) * 0.26, flipped: seededOffset(seed, index, 53) > 0.5 });
  }
  return { seed, decorations, water: stage >= 9, fauna: stage >= 11 };
}
