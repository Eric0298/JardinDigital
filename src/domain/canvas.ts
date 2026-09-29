declare const canvasIdBrand: unique symbol;

export type CanvasId = string & { readonly [canvasIdBrand]: "CanvasId" };

export interface Canvas {
  readonly id: CanvasId;
  readonly title: string;
}

const CANVAS_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeCanvasTitle(title: string) {
  const normalizedTitle = title.trim();

  if (normalizedTitle.length === 0) {
    throw new Error("Canvas title must not be empty.");
  }

  return normalizedTitle;
}

export function createCanvas(title: string): Canvas {
  return {
    id: globalThis.crypto.randomUUID() as CanvasId,
    title: normalizeCanvasTitle(title),
  };
}

export function rehydrateCanvas(id: string, title: string): Canvas {
  if (!CANVAS_ID_PATTERN.test(id)) {
    throw new Error("Canvas id must be a valid application UUID.");
  }

  return {
    id: id as CanvasId,
    title: normalizeCanvasTitle(title),
  };
}
