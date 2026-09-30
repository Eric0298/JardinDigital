import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from "react";
import {
  Background,
  ReactFlow,
  type NodeChange,
  type NodeMouseHandler,
  type NodeTypes,
  type OnConnect,
  type OnNodeDrag,
  type ReactFlowInstance,
} from "@xyflow/react";
import type { Position } from "../../domain/placement";
import { KnowledgeNode } from "./KnowledgeNode";
import type {
  CanvasFlowEdge,
  CanvasFlowNode,
} from "./reactFlowAdapter";

const nodeTypes = {
  knowledge: KnowledgeNode,
} satisfies NodeTypes;

export interface CanvasSurfaceHandle {
  fitView(): void;
  startIdea(): void;
}

interface CanvasSurfaceProps {
  readonly canInteract: boolean;
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
  ) => void;
  readonly onSelectEdge: (edgeId: string) => void;
}

export const CanvasSurface = forwardRef<
  CanvasSurfaceHandle,
  CanvasSurfaceProps
>(function CanvasSurface(
  {
    canInteract,
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
  },
  ref,
) {
  const flowInstance = useRef<ReactFlowInstance<CanvasFlowNode> | null>(null);
  const canvasElement = useRef<HTMLDivElement | null>(null);

  function requestCreationAt(clientX: number, clientY: number) {
    const instance = flowInstance.current;
    const bounds = canvasElement.current?.getBoundingClientRect();

    if (instance === null || bounds === undefined || !canInteract || editorOpen) {
      return;
    }

    onRequestCreate(
      instance.screenToFlowPosition({ x: clientX, y: clientY }),
      { x: clientX - bounds.left, y: clientY - bounds.top },
    );
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
    <div className="canvas-surface" ref={canvasElement}>
      <ReactFlow<CanvasFlowNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          flowInstance.current = instance;
        }}
        onNodesChange={onNodesChange}
        onNodeClick={onClearEdgeSelection}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgeClick={(event, edge) => {
          event.stopPropagation();
          onSelectEdge(edge.id);
        }}
        onPaneClick={(event) => {
          onClearEdgeSelection();

          if (event.detail === 2) {
            requestCreationAt(event.clientX, event.clientY);
          }
        }}
        nodesDraggable={canInteract && !editorOpen}
        nodesConnectable={canInteract && !editorOpen}
        edgesFocusable
        elementsSelectable
        deleteKeyCode={null}
        fitView
        zoomOnDoubleClick={false}
      >
        <Background />
      </ReactFlow>
      {nodes.length === 0 ? (
        <div className="canvas-empty-hint" aria-hidden="true">
          <strong>Plant your first idea</strong>
          <span>Choose New idea or double-click anywhere.</span>
        </div>
      ) : null}
      {children}
    </div>
  );
});
