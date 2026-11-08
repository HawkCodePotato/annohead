import { Handle, Position } from '@xyflow/react'

export function CenterHandles() {
  return (
    <>
      <Handle
        className="invisible"
        isConnectable={false}
        position={Position.Top}
        style={{
          top: '50%',
        }}
        type="target"
      />

      <Handle
        className="invisible"
        isConnectable={false}
        position={Position.Top}
        style={{
          top: '50%',
        }}
        type="source"
      />
    </>
  )
}
