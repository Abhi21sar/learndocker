import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Box, Play, StopCircle } from 'lucide-react';

const ContainerNode = ({ data }) => {
  const isRunning = data.status === 'Up';
  
  return (
    <div className={`container-node ${isRunning ? 'running' : 'stopped'}`}>
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <div className="node-header">
        <Box size={14} />
        <span>{data.name}</span>
        <div className="status-indicator">
          {isRunning ? <Play size={10} fill="#10b981" color="#10b981" /> : <StopCircle size={10} fill="#ef4444" color="#ef4444" />}
        </div>
      </div>
      <div className="node-body">
        <div className="image-tag">{data.imageName}</div>
        {data.ports && <div className="detail">Ports: {data.ports}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
};

export default ContainerNode;
