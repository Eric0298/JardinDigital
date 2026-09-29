import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CanvasFlowNode } from "./reactFlowAdapter";

export function KnowledgeNode({
  data,
  selected,
  isConnectable,
}: NodeProps<CanvasFlowNode>) {
  return (
    <article
      className={`knowledge-node${selected ? " knowledge-node--selected" : ""}`}
    >
      <Handle
        id="target"
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <strong className="knowledge-node__title">
        {data.title || "Untitled idea"}
      </strong>
      {data.content.length > 0 ? (
        <p className="knowledge-node__preview">{data.content}</p>
      ) : null}
      <Handle
        id="source"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </article>
  );
}
