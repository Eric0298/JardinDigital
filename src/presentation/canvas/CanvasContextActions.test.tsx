import { isValidElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { EdgeId } from "../../domain/edge";
import type { NodeId } from "../../domain/node";
import type { PlacementId } from "../../domain/placement";
import { CanvasContextActions, type CanvasContextTarget } from "./CanvasContextActions";

const ideaTarget: CanvasContextTarget = {
  kind: "idea",
  nodeId: "11111111-1111-4111-8111-111111111111" as NodeId,
  placementId: "22222222-2222-4222-8222-222222222222" as PlacementId,
};
const connectionTarget: CanvasContextTarget = {
  kind: "connection",
  edgeId: "33333333-3333-4333-8333-333333333333" as EdgeId,
};
const paneTarget: CanvasContextTarget = {
  kind: "pane",
  position: { x: -210.5, y: 81.25 },
  inputPosition: { x: 400, y: 290 },
};

function props(target: CanvasContextTarget): ComponentProps<typeof CanvasContextActions> {
  return {
    target, onOpenIdea: vi.fn(), onEditIdea: vi.fn(), onRemoveIdea: vi.fn(),
    onDeleteIdea: vi.fn(), onDeleteConnection: vi.fn(), onRequestCreate: vi.fn(),
  };
}

function actionWithText(tree: ReactNode, label: string): (() => void) | undefined {
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const action = actionWithText(child, label);
      if (action !== undefined) return action;
    }
    return undefined;
  }
  if (!isValidElement<{ readonly children?: ReactNode; readonly onClick?: () => void }>(tree)) return undefined;
  if (tree.type === "button" && renderToStaticMarkup(tree).includes(label)) return tree.props.onClick;
  return actionWithText(tree.props.children, label);
}

describe("Canvas context actions", () => {
  it("shows the four idea actions with neutral removal, destructive deletion and the existing separator", () => {
    const html = renderToStaticMarkup(<CanvasContextActions {...props(ideaTarget)} />);
    const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
    expect(buttons).toHaveLength(4);
    for (const label of ["Abrir idea", "Editar", "Quitar del jardín", "Eliminar definitivamente"]) {
      expect(buttons.find((button) => button.includes(label))).toContain('role="menuitem"');
    }
    for (const label of ["Abrir idea", "Editar", "Quitar del jardín"]) {
      expect(buttons.find((button) => button.includes(label))).toContain('class="secondary-button"');
    }
    const deleteButton = buttons.find((button) => button.includes("Eliminar definitivamente"));
    expect(deleteButton).toContain('class="danger-button"');
    expect(deleteButton).toContain("lucide-trash");
    expect(html.match(/class="action-menu__section"/g)).toHaveLength(2);
    expect(html).not.toContain("Eliminar conexión");
    expect(html).not.toContain("Nueva idea aquí");
  });

  it("routes idea actions to captured Node and Placement IDs without invoking other targets", () => {
    const handlers = props(ideaTarget);
    const tree = CanvasContextActions(handlers);
    const expected = [
      ["Abrir idea", handlers.onOpenIdea, ideaTarget.nodeId],
      ["Editar", handlers.onEditIdea, ideaTarget.placementId],
      ["Quitar del jardín", handlers.onRemoveIdea, ideaTarget.placementId],
      ["Eliminar definitivamente", handlers.onDeleteIdea, ideaTarget.nodeId],
    ] as const;
    for (const [label, handler, id] of expected) {
      const action = actionWithText(tree, label);
      expect(action).toBeDefined();
      action?.();
      expect(handler).toHaveBeenCalledExactlyOnceWith(id);
    }
    expect(handlers.onDeleteConnection).not.toHaveBeenCalled();
    expect(handlers.onRequestCreate).not.toHaveBeenCalled();
  });

  it("shows only neutral connection deletion for a connection target", () => {
    const html = renderToStaticMarkup(<CanvasContextActions {...props(connectionTarget)} />);
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).toContain("Eliminar conexión");
    expect(html).toContain('role="menuitem"');
    expect(html).toContain('class="secondary-button"');
    expect(html).not.toContain("danger-button");
    expect(html).not.toContain("Abrir idea");
    expect(html).not.toContain("Nueva idea aquí");
  });

  it("routes connection deletion only to the captured Edge ID", () => {
    const handlers = props(connectionTarget);
    const action = actionWithText(CanvasContextActions(handlers), "Eliminar conexión");
    expect(action).toBeDefined();
    action?.();
    expect(handlers.onDeleteConnection).toHaveBeenCalledExactlyOnceWith(connectionTarget.edgeId);
    for (const handler of [handlers.onOpenIdea, handlers.onEditIdea, handlers.onRemoveIdea, handlers.onDeleteIdea, handlers.onRequestCreate]) {
      expect(handler).not.toHaveBeenCalled();
    }
  });

  it("shows only creation in the empty canvas menu", () => {
    const html = renderToStaticMarkup(<CanvasContextActions {...props(paneTarget)} />);
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).toContain("Nueva idea aquí");
    expect(html).toContain('role="menuitem"');
    expect(html).not.toContain("Eliminar");
    expect(html).not.toContain("Abrir idea");
  });

  it("forwards the captured Flow coordinates and input position unchanged to existing creation", () => {
    const handlers = props(paneTarget);
    const action = actionWithText(CanvasContextActions(handlers), "Nueva idea aquí");
    expect(action).toBeDefined();
    action?.();
    expect(handlers.onRequestCreate).toHaveBeenCalledExactlyOnceWith(paneTarget.position, paneTarget.inputPosition);
    expect(vi.mocked(handlers.onRequestCreate).mock.calls[0][0]).toBe(paneTarget.position);
    expect(vi.mocked(handlers.onRequestCreate).mock.calls[0][1]).toBe(paneTarget.inputPosition);
    for (const handler of [handlers.onOpenIdea, handlers.onEditIdea, handlers.onRemoveIdea, handlers.onDeleteIdea, handlers.onDeleteConnection]) {
      expect(handler).not.toHaveBeenCalled();
    }
  });
});
