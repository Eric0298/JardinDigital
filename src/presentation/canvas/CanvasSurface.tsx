import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  type NodeChange,
  type NodeMouseHandler,
  type NodeTypes,
  type OnConnect,
  type OnNodeDrag,
  type ReactFlowInstance,
} from "@xyflow/react";
import type { PlacementId, Position } from "../../domain/placement";
import type { EdgeId } from "../../domain/edge";
import type { NodeId } from "../../domain/node";
import type { CanvasBackground } from "../../application/settings";
import { KnowledgeNode } from "./KnowledgeNode";
import { CanvasContextActions, type CanvasContextTarget } from "./CanvasContextActions";
import { ContextActionMenu } from "../shared/ActionMenu";
import { buildCanvasAdjacency, leaveCanvasHover, projectCanvasHover, type CanvasHover } from "./canvasHover";
import type {
  CanvasFlowEdge,
  CanvasFlowNode,
} from "./reactFlowAdapter";

const nodeTypes = {
  knowledge: KnowledgeNode,
} satisfies NodeTypes;
const panButtons = [0, 1];

export interface CanvasSurfaceHandle {
  fitView(): void;
  startIdea(): void;
}

interface CanvasSurfaceProps {
  readonly canInteract: boolean;
  readonly background: CanvasBackground;
  readonly children?: ReactNode;
  readonly editorOpen: boolean;
  readonly edges: CanvasFlowEdge[];
  readonly nodes: CanvasFlowNode[];
  readonly onClearEdgeSelection: () => void;
  readonly onConnect: OnConnect;
  readonly onNodeDoubleClick: NodeMouseHandler<CanvasFlowNode>;
  readonly onNodeDragStop: OnNodeDrag<CanvasFlowNode>;
  readonly onNodesChange: (changes: NodeChange<CanvasFlowNode>[]) => void;
  readonly onRequestCreate: (
    position: Position,
    inputPosition: Position,
    keepInputInBounds?: boolean,
  ) => void;
  readonly onSelectEdge: (edgeId: string) => void;
  readonly onOpenIdea: (nodeId: NodeId) => void;
  readonly onEditIdea: (placementId: PlacementId) => void;
  readonly onRemoveIdea: (placementId: PlacementId) => void;
  readonly onDeleteIdea: (nodeId: NodeId) => void;
  readonly onDeleteConnection: (edgeId: EdgeId) => void;
}

export const CanvasSurface = forwardRef<
  CanvasSurfaceHandle,
  CanvasSurfaceProps
>(function CanvasSurface(
  {
    canInteract,
    background,
    children,
    editorOpen,
    edges,
    nodes,
    onClearEdgeSelection,
    onConnect,
    onNodeDoubleClick,
    onNodeDragStop,
    onNodesChange,
    onRequestCreate,
    onSelectEdge,
    onOpenIdea,
    onEditIdea,
    onRemoveIdea,
    onDeleteIdea,
    onDeleteConnection,
  },
  ref,
) {
  const flowInstance = useRef<ReactFlowInstance<CanvasFlowNode> | null>(null);
  const canvasElement = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<CanvasHover>(null);
  const [contextMenu, setContextMenu] = useState<{ target: CanvasContextTarget; position: Position; key: number } | null>(null);
  const contextSequence = useRef(0);
  const adjacency = useMemo(() => buildCanvasAdjacency(edges), [edges]);
  const visual = useMemo(() => projectCanvasHover(nodes, edges, adjacency, hover), [nodes, edges, adjacency, hover]);
  const enterIdea = useCallback<NodeMouseHandler<CanvasFlowNode>>((_event, node) => setHover({ kind: "idea", id: node.id }), []);
  const leaveIdea = useCallback<NodeMouseHandler<CanvasFlowNode>>((_event, node) => setHover((current) => leaveCanvasHover(current, { kind: "idea", id: node.id })), []);

  useEffect(() => {
    if (!canInteract || editorOpen) setContextMenu(null);
  }, [canInteract, editorOpen]);

  function creationAt(clientX: number, clientY: number) {
    const instance = flowInstance.current;
    const bounds = canvasElement.current?.getBoundingClientRect();

    if (instance === null || bounds === undefined || !canInteract || editorOpen) {
      return null;
    }

    return {
      position: instance.screenToFlowPosition({ x: clientX, y: clientY }),
      inputPosition: { x: clientX - bounds.left, y: clientY - bounds.top },
    };
  }

  function requestCreationAt(clientX: number, clientY: number) {
    const location = creationAt(clientX, clientY);
    if (location !== null) onRequestCreate(location.position, location.inputPosition);
  }

  function openContextMenu(target: CanvasContextTarget, position: Position) {
    setContextMenu({ target, position, key: ++contextSequence.current });
  }

  function selectContextIdea(id: string | null) {
    const changes: NodeChange<CanvasFlowNode>[] = nodes
      .filter((node) => Boolean(node.selected) !== (node.id === id))
      .map((node) => ({ type: "select", id: node.id, selected: node.id === id }));
    if (changes.length > 0) onNodesChange(changes);
  }

  useImperativeHandle(
    ref,
    () => ({
      fitView() {
        void flowInstance.current?.fitView({ padding: 0.2 });
      },
      startIdea() {
        const bounds = canvasElement.current?.getBoundingClientRect();

        if (bounds === undefined) {
          return;
        }

        requestCreationAt(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        );
      },
    }),
    [canInteract, editorOpen, onRequestCreate],
  );

  return (
    <div className="canvas-surface" ref={canvasElement} tabIndex={-1} aria-label="Lienzo del jardín" onPointerLeave={() => setHover(null)}>
      <ReactFlow<CanvasFlowNode>
        nodes={visual.nodes}
        edges={visual.edges}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          flowInstance.current = instance;
          canvasElement.current?.querySelector(".react-flow__attribution a")?.setAttribute("aria-label", "Información sobre React Flow");
        }}
        onNodesChange={onNodesChange}
        onNodeClick={onClearEdgeSelection}
        onNodeMouseEnter={enterIdea}
        onNodeMouseLeave={leaveIdea}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={(event, node) => {
          event.preventDefault();
          event.stopPropagation();
          if (!canInteract || editorOpen) return;
          if (event.currentTarget instanceof HTMLElement || event.currentTarget instanceof SVGElement) event.currentTarget.focus();
          onClearEdgeSelection();
          selectContextIdea(node.id);
          openContextMenu({ kind: "idea", nodeId: node.data.nodeId, placementId: node.data.placementId }, { x: event.clientX, y: event.clientY });
        }}
        onNodeDragStart={() => setContextMenu(null)}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onConnectStart={() => setContextMenu(null)}
        onEdgesChange={(changes) => {
          const selected = changes.filter((change) => change.type === "select").find((change) => change.selected);
          if (selected !== undefined) onSelectEdge(selected.id);
          else if (changes.some((change) => change.type === "select" && !change.selected && edges.some((edge) => edge.id === change.id && edge.selected))) onClearEdgeSelection();
        }}
        onEdgeMouseEnter={(_event, edge) => setHover({ kind: "connection", id: edge.id })}
        onEdgeMouseLeave={(_event, edge) => setHover((current) => leaveCanvasHover(current, { kind: "connection", id: edge.id }))}
        onEdgeClick={(event, edge) => {
          event.stopPropagation();
          onSelectEdge(edge.id);
        }}
        onEdgeContextMenu={(event, edge) => {
          event.preventDefault();
          event.stopPropagation();
          if (!canInteract || editorOpen) return;
          if (event.currentTarget instanceof HTMLElement || event.currentTarget instanceof SVGElement) event.currentTarget.focus();
          selectContextIdea(null);
          onSelectEdge(edge.id);
          openContextMenu({ kind: "connection", edgeId: edge.id as EdgeId }, { x: event.clientX, y: event.clientY });
        }}
        onPaneContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const location = creationAt(event.clientX, event.clientY);
          if (location === null) return;
          onClearEdgeSelection();
          selectContextIdea(null);
          canvasElement.current?.focus();
          openContextMenu({ kind: "pane", ...location }, { x: event.clientX, y: event.clientY });
        }}
        onMoveStart={() => setContextMenu(null)}
        onPaneClick={(event) => {
          onClearEdgeSelection();

          if (event.detail === 2) {
            requestCreationAt(event.clientX, event.clientY);
          }
        }}
        nodesDraggable={canInteract && !editorOpen}
        nodesConnectable={canInteract && !editorOpen}
        edgesFocusable
        elevateEdgesOnSelect
        elementsSelectable
        panOnDrag={panButtons}
        deleteKeyCode={null}
        fitView
        zoomOnDoubleClick={false}
        ariaLabelConfig={{
          "node.a11yDescription.default": "Pulsa Intro o Espacio para seleccionar una idea. Abre la idea desde la barra del jardín.",
          "node.a11yDescription.keyboardDisabled": "Pulsa Intro o Espacio para seleccionar una idea.",
          "edge.a11yDescription.default": "Pulsa Intro o Espacio para seleccionar una conexión.",
          "node.a11yDescription.ariaLiveMessage": ({ direction, x, y }) => `Idea movida hacia ${direction === "left" ? "la izquierda" : direction === "right" ? "la derecha" : direction === "up" ? "arriba" : "abajo"}. Posición ${x}, ${y}.`,
        }}
      >
        {background !== "plain" ? <Background variant={background === "grid" ? BackgroundVariant.Lines : BackgroundVariant.Dots} gap={background === "grid" ? 32 : 28} size={0.8} lineWidth={0.5} color={background === "grid" ? "var(--garden-grid)" : "var(--garden-dots)"} /> : null}
      </ReactFlow>
      {nodes.length === 0 ? (
        <div className="canvas-empty-hint" aria-hidden="true">
          <strong>Empieza creando tu primera idea.</strong>
          <span>Elige Nueva idea o haz doble clic en el lienzo.</span>
        </div>
      ) : null}
      {children}
      {contextMenu !== null && canInteract && !editorOpen ? <ContextActionMenu
        key={contextMenu.key}
        label={contextMenu.target.kind === "idea" ? "Acciones de la idea" : contextMenu.target.kind === "connection" ? "Acciones de la conexión" : "Acciones del lienzo"}
        position={contextMenu.position}
        onClose={() => setContextMenu(null)}>
        <CanvasContextActions target={contextMenu.target} onOpenIdea={onOpenIdea} onEditIdea={onEditIdea}
          onRemoveIdea={onRemoveIdea} onDeleteIdea={onDeleteIdea} onDeleteConnection={onDeleteConnection}
          onRequestCreate={(position, inputPosition) => onRequestCreate(position, inputPosition, true)} />
      </ContextActionMenu> : null}
    </div>
  );
});
