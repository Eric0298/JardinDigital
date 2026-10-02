import { isValidElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createCanvas } from "../../domain/canvas";
import { GardenToolbar } from "./GardenToolbar";

function toolbarProps(overrides: Partial<ComponentProps<typeof GardenToolbar>> = {}): ComponentProps<typeof GardenToolbar> {
  const activeGarden = createCanvas("Investigación");
  return {
    activeGarden, gardens: [activeGarden], disabled: false, hasSelectedEdge: false, hasSelectedIdea: false,
    onDeleteConnection: vi.fn(), onFitView: vi.fn(), onGardenChange: vi.fn(), onNewGarden: vi.fn(),
    onNewIdea: vi.fn(), onRenameGarden: vi.fn(), onDeleteGarden: vi.fn(), onEditIdea: vi.fn(),
    onOpenIdea: vi.fn(), onRemoveIdea: vi.fn(), onDeleteIdea: vi.fn(), onHome: vi.fn(), ...overrides,
  };
}

function toolbar(overrides: Partial<ComponentProps<typeof GardenToolbar>> = {}) {
  return renderToStaticMarkup(<GardenToolbar {...toolbarProps(overrides)} />);
}

function buttonWithText(tree: ReactNode, label: string): (() => void) | undefined {
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const action = buttonWithText(child, label);
      if (action !== undefined) return action;
    }
    return undefined;
  }
  if (!isValidElement<{ readonly children?: ReactNode; readonly onClick?: () => void }>(tree)) return undefined;
  if (tree.type === "button" && renderToStaticMarkup(tree).includes(label)) return tree.props.onClick;
  return buttonWithText(tree.props.children, label);
}

describe("Compact Spanish garden toolbar", () => {
  it("keeps the title, back, create and fit controls visible with secondary actions grouped", () => {
    const html = toolbar();
    const visibleToolbar = html.split("<details")[0];
    for (const label of ["Mis jardines", "Investigación", "Nueva idea", "Encajar"]) expect(visibleToolbar).toContain(label);
    expect(html).toContain('aria-label="Más acciones del jardín"');
    expect(visibleToolbar).not.toContain("Renombrar jardín");
    expect(visibleToolbar).not.toContain("Eliminar jardín");
    expect(html).not.toContain("Buscar");
    expect(html).not.toContain("Arrastra entre");
    expect(html).not.toContain("Abrir idea");
  });

  it("distinguishes connection deletion and garden removal from permanent idea deletion", () => {
    const html = toolbar({ hasSelectedEdge: true, hasSelectedIdea: true });
    const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
    const removeConnection = buttons.find((button) => button.includes("Eliminar conexión"));
    const removeIdea = buttons.find((button) => button.includes("Quitar del jardín"));
    const deleteIdea = buttons.find((button) => button.includes("Eliminar idea definitivamente"));
    const deleteGarden = buttons.find((button) => button.includes("Eliminar jardín"));
    expect(removeConnection).toContain('class="secondary-button"');
    expect(removeConnection).not.toContain("danger-button");
    expect(removeIdea).toContain('class="secondary-button"');
    expect(removeIdea).not.toContain("danger-button");
    expect(deleteIdea).toContain('class="danger-button"');
    expect(deleteIdea).toContain("lucide-trash");
    expect(deleteGarden).toContain('class="danger-button"');
    expect(html).toContain("Abrir idea");
    expect(html).toContain("Editar idea");
  });

  it("routes each selected action to its own callback and hides them without selection", () => {
    const onDeleteConnection = vi.fn();
    const onRemoveIdea = vi.fn();
    const onDeleteIdea = vi.fn();
    const tree = GardenToolbar(toolbarProps({ hasSelectedEdge: true, hasSelectedIdea: true, onDeleteConnection, onRemoveIdea, onDeleteIdea }));
    buttonWithText(tree, "Eliminar conexión")?.();
    expect(onDeleteConnection).toHaveBeenCalledOnce();
    expect(onRemoveIdea).not.toHaveBeenCalled();
    expect(onDeleteIdea).not.toHaveBeenCalled();
    buttonWithText(tree, "Quitar del jardín")?.();
    expect(onRemoveIdea).toHaveBeenCalledOnce();
    expect(onDeleteIdea).not.toHaveBeenCalled();
    buttonWithText(tree, "Eliminar idea definitivamente")?.();
    expect(onDeleteIdea).toHaveBeenCalledOnce();
    const unselected = toolbar();
    for (const label of ["Eliminar conexión", "Quitar del jardín", "Eliminar idea definitivamente"]) expect(unselected).not.toContain(label);
  });

  it("keeps actions disabled while an existing edit or persistence operation is active", () => {
    const html = toolbar({ disabled: true, hasSelectedEdge: true, hasSelectedIdea: true });
    const buttons = html.match(/<button\b[^>]*>/g) ?? [];
    expect(buttons.length).toBeGreaterThan(4);
    expect(buttons.every((button) => button.includes('disabled=""'))).toBe(true);
  });
});
