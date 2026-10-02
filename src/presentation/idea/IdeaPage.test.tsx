import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createNode } from "../../domain/node";
import { createResource } from "../../domain/resource";
import { ConfirmationDialog } from "../shared/ConfirmationDialog";
import { IdeaResourceList } from "./IdeaPage";

describe("Idea resource presentation", () => {
  it("shows document and video extensions and link domains without exposing identities or full locations", () => {
    const node = createNode("Lecturas");
    const resources = [
      createResource(node.id, "document", "Informe", "C:\\Lecturas\\informe.pdf", "local"),
      createResource(node.id, "video", "Conferencia", "/videos/conferencia.mp4", "local"),
      createResource(node.id, "link", "Referencia", "https://example.org/referencia?capitulo=2", "url"),
    ];
    const html = renderToStaticMarkup(<IdeaResourceList resources={resources} availability={{}} locked={false} onOpen={vi.fn()} onRemove={vi.fn()} />);
    for (const label of ["Informe", "Documento · Archivo local · PDF", "Conferencia", "Vídeo · Archivo local · MP4", "Referencia", "Enlace · example.org"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('aria-label="Abrir Informe"');
    expect(html).toContain('aria-label="Quitar Informe de la idea"');
    for (const resource of resources) {
      expect(html).not.toContain(resource.id);
      expect(html).not.toContain(resource.locator);
    }
    expect(html).not.toContain(node.id);
    expect(html).not.toContain("danger-button");
  });

  it("keeps an unavailable file removable while preventing its opening", () => {
    const node = createNode("Lecturas");
    const resource = createResource(node.id, "document", "Informe", "C:\\Lecturas\\informe.pdf", "local");
    const html = renderToStaticMarkup(<IdeaResourceList resources={[resource]} availability={{ [resource.id]: "missing" }} locked={false} onOpen={vi.fn()} onRemove={vi.fn()} />);
    expect(html).toContain('role="status">Archivo no disponible');
    expect(html.match(/<button[^>]*aria-label="Abrir Informe"[^>]*>/)?.[0]).toContain("disabled");
    expect(html.match(/<button[^>]*aria-label="Quitar Informe de la idea"[^>]*>/)?.[0]).not.toContain("disabled");
  });

  it("reports an uncertain availability and locks both actions during work", () => {
    const node = createNode("Lecturas");
    const resource = createResource(node.id, "document", "Informe", "C:\\Lecturas\\informe.pdf", "local");
    const html = renderToStaticMarkup(<IdeaResourceList resources={[resource]} availability={{ [resource.id]: "unknown" }} locked={true} onOpen={vi.fn()} onRemove={vi.fn()} />);
    expect(html).toContain("No se pudo comprobar el archivo.");
    expect(html.match(/<button[^>]*aria-label="Abrir Informe"[^>]*>/)?.[0]).toContain("disabled");
    expect(html.match(/<button[^>]*aria-label="Quitar Informe de la idea"[^>]*>/)?.[0]).toContain("disabled");
  });

  it("explains the empty resource section in Spanish", () => {
    const html = renderToStaticMarkup(<IdeaResourceList resources={[]} availability={{}} locked={false} onOpen={vi.fn()} onRemove={vi.fn()} />);
    expect(html).toContain("Añade documentos, vídeos o enlaces a esta idea.");
  });
});

describe("Knowledge deletion confirmation", () => {
  it("communicates permanent deletion with a cancellable, labelled destructive dialog", () => {
    const html = renderToStaticMarkup(<ConfirmationDialog title="Eliminar idea definitivamente" description="Esta acción no se puede deshacer. Los archivos originales se conservarán." confirmLabel="Eliminar idea definitivamente" destructive onAnswer={vi.fn()} />);
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("aria-labelledby=");
    expect(html).toContain("aria-describedby=");
    expect(html).toContain("Esta acción no se puede deshacer. Los archivos originales se conservarán.");
    expect(html).toContain("Cancelar");
    expect(html).toContain('class="danger-button"');
    expect(html).toContain("Eliminar idea definitivamente");
  });

  it("keeps an ordinary confirmation distinct from permanent deletion", () => {
    const html = renderToStaticMarkup(<ConfirmationDialog title="Confirmar" description="Continuar con la acción." confirmLabel="Confirmar" onAnswer={vi.fn()} />);
    expect(html).toContain("Cancelar");
    expect(html).toContain('class="button--primary"');
    expect(html).not.toContain("danger-button");
  });
});
