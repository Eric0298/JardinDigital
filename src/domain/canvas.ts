declare const canvasIdBrand: unique symbol;

export type CanvasId = string & { readonly [canvasIdBrand]: "CanvasId" };

export interface Canvas {
  readonly id: CanvasId;
  readonly title: string;
}

export function createCanvas(title: string): Canvas {
  const normalizedTitle = title.trim();

  if (normalizedTitle.length === 0) {
    throw new Error("Canvas title must not be empty.");
  }

  return {
    id: globalThis.crypto.randomUUID() as CanvasId,
    title: normalizedTitle,
  };
}
