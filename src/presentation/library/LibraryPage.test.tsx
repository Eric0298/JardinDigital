import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { ConfirmationProvider } from "../shared/ConfirmationDialog";
import { LibraryPage, LibraryPagination } from "./LibraryPage";

function props(mode: "search" | "library"): ComponentProps<typeof LibraryPage> {
  return {
    mode, gardens: [], onNewGarden: vi.fn(), onOpenIdea: vi.fn(), onStatusChange: vi.fn(), onBack: vi.fn(),
    dependencies: {
      nodePersistence: {
        load: async () => null, save: async () => {}, list: async () => [], loadMany: async () => [], search: async () => [],
        queryPage: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
      },
      canvasPersistence: { load: async () => null, list: async () => [] },
      inboxPersistence: { list: async () => [] },
      placementPersistence: {
        load: async () => null, save: async () => {}, list: async () => [], loadForCanvas: async () => [], place: async () => "placed", delete: async () => {},
      },
      nativeOperations: { deleteKnowledge: async () => {} },
    },
  };
}

describe("Library search and pagination surfaces", () => {
  it("starts empty Buscar with a labelled live input and no mandatory submit button", () => {
    const html = renderToStaticMarkup(<ConfirmationProvider><LibraryPage {...props("search")} /></ConfirmationProvider>);
    expect(html).toContain("Escribe para buscar entre tus ideas.");
    expect(html).toContain('id="search-query"');
    expect(html).toContain('type="search"');
    expect(html).toContain('for="search-query"');
    expect(html).not.toContain('type="submit"');
    expect(html).not.toContain("Paginación de ideas");
  });

  it("gives Todas las ideas its own clearly labelled search", () => {
    const html = renderToStaticMarkup(<ConfirmationProvider><LibraryPage {...props("library")} /></ConfirmationProvider>);
    expect(html).toContain("Buscar entre todas las ideas…");
    expect(html).toContain('id="library-query"');
    expect(html).toContain('for="library-query"');
    expect(html).not.toContain('type="submit"');
  });

  it("exposes Spanish page position and disables navigation at either boundary", () => {
    const render = (page: number, busy = false) => renderToStaticMarkup(<LibraryPagination total={43} page={page} pageSize={20} busy={busy} onPageChange={vi.fn()} />);
    const first = render(1).match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
    const middle = render(2).match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
    const last = render(3).match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
    expect(first[0]).toContain("disabled");
    expect(first[1]).not.toContain("disabled");
    expect(middle.every((button) => !button.includes("disabled"))).toBe(true);
    expect(last[0]).not.toContain("disabled");
    expect(last[1]).toContain("disabled");
    expect(render(3)).toContain("Página 3 de 3");
    expect(render(2, true).match(/disabled=""/g)).toHaveLength(2);
  });
});
