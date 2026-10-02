import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { clampQuickNodeInputPosition, QuickNodeCreator, type QuickNodeDraft } from "./QuickNodeCreator";

const canvas = { left: 24, top: 112, right: 900, bottom: 680 };
const viewport = { width: 900, height: 680 };

describe("Contextual quick idea creation bounds", () => {
  it("keeps an input already inside the canvas at the requested point", () => {
    const inputPosition = { x: 300, y: 240 };
    expect(clampQuickNodeInputPosition(inputPosition, { left: 332, top: 277, width: 236, height: 150 }, canvas, viewport)).toBe(inputPosition);
  });

  it("moves only the input into the bottom-right bounds, accounting for its measured transform", () => {
    const draft: QuickNodeDraft = {
      position: { x: -145.5, y: 320.25 },
      inputPosition: { x: 844, y: 563 },
      keepInputInBounds: true,
    };
    const position = clampQuickNodeInputPosition(draft.inputPosition, { left: 876, top: 600, width: 236, height: 150 }, canvas, viewport);
    expect(position).toEqual({ x: 624, y: 485 });
    expect(draft.position).toEqual({ x: -145.5, y: 320.25 });
    expect(draft.inputPosition).toEqual({ x: 844, y: 563 });
  });

  it("uses the canvas boundary at the top-left and the viewport when the canvas extends past it", () => {
    expect(clampQuickNodeInputPosition({ x: -42, y: 33 }, { left: -10, top: 70, width: 236, height: 150 }, canvas, viewport)).toEqual({ x: 0, y: 83 });
    expect(clampQuickNodeInputPosition({ x: 880, y: 640 }, { left: 912, top: 677, width: 236, height: 150 }, { ...canvas, right: 1200, bottom: 1000 }, viewport)).toEqual({ x: 624, y: 485 });
  });

  it("preserves ordinary creation autofocus and delays contextual autofocus until after placement", () => {
    const render = (keepInputInBounds?: boolean) => renderToStaticMarkup(<QuickNodeCreator
      draft={{ position: { x: -100, y: 80 }, inputPosition: { x: 200, y: 250 }, keepInputInBounds }}
      inputRef={createRef<HTMLInputElement>()} submitting={false} title="" onCancel={vi.fn()} onSubmit={vi.fn()} onTitleChange={vi.fn()}
    />);
    expect(render()).toContain('autofocus=""');
    expect(render(true)).not.toContain("autofocus");
    expect(render(true)).toContain("z-index:45");
    expect(render()).not.toContain("z-index");
    expect(render()).toContain('style="left:200px;top:250px"');
  });
});
