import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Globe } from 'lucide-react';

const NetworkNode = ({ data }) => {
  return (
    <div className="network-node">
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <div className="node-header">
        <Globe size={14} color="#3b82f6" />
        <span>{data.name}</span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
};

export default NetworkNode;
