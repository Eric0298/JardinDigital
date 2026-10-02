import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReactFlowProvider } from "@xyflow/react";
import { createCanvas } from "../domain/canvas";
import { createNode } from "../domain/node";
import { createPlacement } from "../domain/placement";
import { HomePage } from "./home/HomePage";
import { ProductShell } from "./shell/ProductShell";
import { KnowledgeNode } from "./canvas/KnowledgeNode";
import { DevDebugPanel } from "./canvas/DevDebugPanel";
import { createRef } from "react";
import { LibraryList } from "./library/LibraryList";
import { InboxList } from "./inbox/InboxList";
import { NodeEditor } from "./canvas/NodeEditor";
import { SettingsPage } from "./settings/SettingsPage";
import { ConfirmationDialog, ConfirmationProvider } from "./shared/ConfirmationDialog";
import { defaultAppearance } from "../application/settings";

afterEach(() => vi.unstubAllEnvs());

describe("Spanish product surfaces", () => {
  it("offers Home and garden management with zero, one, and multiple gardens", () => {
    const gardens = [createCanvas("Investigación"), createCanvas("Lecturas")];
    for (const count of [0, 1, 2]) {
      const html = renderToStaticMarkup(<HomePage gardens={gardens.slice(0, count)} summaryQuery={{ load: async () => [] }} onOpen={vi.fn()} onNew={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />);
      expect(html).toContain("Mis jardines");
      expect(html).toContain("Nuevo jardín");
      if (count === 0) expect(html).toContain("Crea tu primer jardín y empieza a conectar tus ideas.");
      else {
        expect(html).toContain("Renombrar");
        expect(html).toContain("Eliminar");
        expect(html).toContain("Investigación");
      }
    }
  });

  it("keeps Inicio and Buscar primary and groups the secondary navigation", () => {
    const html = renderToStaticMarkup(<ProductShell activeSurface="home" onCapture={vi.fn()} onSurfaceChange={vi.fn()} status="Jardines listos"><p>Contenido</p></ProductShell>);
    for (const label of ["Inicio", "Buscar", "Pendientes", "Todas las ideas", "Ajustes", "Nueva idea"]) expect(html).toContain(label);
    expect(html.match(/nav-button--primary/g)).toHaveLength(2);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('aria-label="Más opciones de navegación"');
    expect(html).not.toContain('>Jardín</button>');
  });

  it("gives the garden toolbar its own idea creation action without duplicating it in the shell", () => {
    const html = renderToStaticMarkup(<ProductShell activeSurface="garden" onCapture={vi.fn()} onSurfaceChange={vi.fn()} status="Idea guardada."><p>Jardín abierto</p></ProductShell>);
    expect(html).not.toContain("Nueva idea");
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Idea guardada.");
  });

  it("distinguishes permanent deletion from removing an idea from a garden or pendientes", () => {
    const garden = createCanvas("Lecturas");
    const node = createNode("Una idea", "Contenido breve");
    const placement = createPlacement(garden.id, node.id, { x: 0, y: 0 });
    const library = renderToStaticMarkup(<LibraryList busyAction={null} entries={[{ node, inInbox: true, gardens: [{ garden, placement }] }]} gardens={[garden]} selectedGardens={{}} onEdit={vi.fn()} onGardenChange={vi.fn()} onPlace={vi.fn()} onRemove={vi.fn()} onDelete={vi.fn()} onOpenIdea={vi.fn()} />);
    const inbox = renderToStaticMarkup(<InboxList busyNodeId={null} gardens={[garden]} nodes={[node]} selectedGardens={{}} onEdit={vi.fn()} onGardenChange={vi.fn()} onPlace={vi.fn()} onRemove={vi.fn()} onOpenIdea={vi.fn()} />);
    const editor = renderToStaticMarkup(<NodeEditor contentRef={createRef()} titleRef={createRef()} draft={{ nodeId: node.id, placementId: placement.id, title: node.title, content: node.content }} saving={false} onCancel={vi.fn()} onChange={vi.fn()} onSave={vi.fn()} onRemove={vi.fn()} />);
    const buttons = library.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
    expect(buttons.find((button) => button.includes("Eliminar idea definitivamente"))).toContain('class="danger-button"');
    expect(buttons.find((button) => button.includes("Quitar del jardín"))).toContain("secondary-button");
    expect(inbox).not.toContain("danger-button");
    expect(editor).not.toContain("danger-button");
    expect(library).toContain("Abrir idea");
    expect(library).toContain("Lecturas");
    expect(library).not.toContain(node.id);
    expect(library).not.toContain(placement.id);
  });

  it("offers Spanish appearance and background choices and explains linked backup files", () => {
    const html = renderToStaticMarkup(<ConfirmationProvider><SettingsPage appearance={defaultAppearance} persistence={{ load: async () => defaultAppearance, save: async () => {} }} nativeOperations={{ exportBackup: async () => "{}", restoreBackup: async () => {} }} onAppearanceChange={vi.fn()} onRestored={async () => {}} /></ConfirmationProvider>);
    for (const label of ["Apariencia", "Sistema", "Claro", "Oscuro", "Liso", "Puntos", "Cuadrícula", "Guardar copia de seguridad", "Restaurar copia", "pero no los archivos"]) expect(html).toContain(label);
    expect(html).not.toContain('class="danger-button"');
  });

  it("uses explicit Spanish consequence and cancel controls in destructive confirmation", () => {
    const html = renderToStaticMarkup(<ConfirmationDialog title="Eliminar jardín" description="Sus ideas seguirán disponibles en Todas las ideas." confirmLabel="Eliminar jardín" destructive onAnswer={vi.fn()} />);
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain("Cancelar");
    expect(html).toContain("Sus ideas seguirán disponibles");
    expect(html).toContain('class="danger-button"');
  });

  it("renders compact resource badges and a Spanish title fallback", () => {
    const node = createNode("", "Contenido");
    const garden = createCanvas("Principal");
    const placement = createPlacement(garden.id, node.id, { x: 0, y: 0 });
    const html = renderToStaticMarkup(<ReactFlowProvider><KnowledgeNode id={placement.id} type="knowledge" data={{ title: "", content: node.content, nodeId: node.id, placementId: placement.id, resourceCounts: { document: 2, video: 1, link: 3 } }} selected={false} isConnectable={false} dragging={false} draggable={false} selectable={true} deletable={false} zIndex={0} positionAbsoluteX={0} positionAbsoluteY={0} /></ReactFlowProvider>);
    expect(html).toContain("Idea sin título");
    for (const label of ["2 documentos", "1 vídeo", "3 enlaces"]) expect(html).toContain(label);
    expect(html).not.toContain(node.id);
  });

  it("excludes the technical panel and identities when DEV is disabled", () => {
    vi.stubEnv("DEV", false);
    const node = createNode("Idea privada");
    const canvas = createCanvas("Principal");
    const placement = createPlacement(canvas.id, node.id, { x: 0, y: 0 });
    expect(renderToStaticMarkup(<DevDebugPanel view={{ canvas, nodes: [node], placements: [placement], edges: [] }} />)).toBe("");
  });
});
