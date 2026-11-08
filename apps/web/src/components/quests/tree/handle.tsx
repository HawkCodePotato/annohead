import { Handle, Position } from '@xyflow/react'

type Props = {
  type: 'source' | 'target'
}

export function QuestHandle({ type }: Props) {
  return (
    <Handle
      className="invisible"
      isConnectable={false}
      position={type === 'target' ? Position.Left : Position.Right}
      type={type}
    />
  )
}
