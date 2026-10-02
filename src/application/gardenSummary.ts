import type { CanvasId } from "../domain/canvas";

/** Small read model: no idea content, file paths or decorative state. */
export interface GardenSummary {
  readonly gardenId: CanvasId;
  readonly ideaCount: number;
  readonly connectionCount: number;
  readonly resourceCount: number;
}

export interface GardenSummaryQuery {
  load(): Promise<readonly GardenSummary[]>;
}

export class GardenSummaryError extends Error {
  constructor(message: string, readonly cause: unknown) {
    super(message);
    this.name = "GardenSummaryError";
  }
}
