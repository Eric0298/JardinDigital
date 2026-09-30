import type { Canvas, CanvasId } from "../domain/canvas";

export interface CanvasPersistence {
  save(canvas: Canvas): Promise<void>;
  load(id: CanvasId): Promise<Canvas | null>;
  list(): Promise<Canvas[]>;
}

export class CanvasPersistenceError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "CanvasPersistenceError";
    this.cause = cause;
  }
}

export class InvalidPersistedCanvasError extends CanvasPersistenceError {
  constructor(cause: unknown) {
    super("Persisted Canvas data is invalid.", cause);
    this.name = "InvalidPersistedCanvasError";
  }
}
