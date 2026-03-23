import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layers, Trash2 } from 'lucide-react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dockerEngine from '../engine/DockerEngine';
import { useDockerStore } from '../store/useDockerStore';
import ContainerNode from './ContainerNode';
import NetworkNode from './NetworkNode';

const nodeTypes = {
  container: ContainerNode,
  network: NetworkNode,
};

const Visualization = () => {
  const state = useDockerStore();

  const { nodes, edges } = useMemo(() => {
    const newNodes = [];
    const newEdges = [];

    // Layout networks at the top
    (state.networks || []).forEach((net, idx) => {
      const x = ((idx + 1) / ((state.networks || []).length + 1)) * 600;
      newNodes.push({
        id: net.id,
        type: 'network',
        position: { x, y: 50 },
        data: { name: net.name },
      });
    });

    // Layout containers below
    (state.containers || []).forEach((c, idx) => {
      const cols = 3;
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const x = ((col + 1) / (cols + 1)) * 600;
      const y = 150 + row * 100;

      newNodes.push({
        id: c.id,
        type: 'container',
        position: { x, y },
        data: { ...c },
      });

      // Create edges for network connections
      (c.networkIds || []).forEach((netId) => {
        newEdges.push({
          id: `e-${netId}-${c.id}`,
          source: netId,
          target: c.id,
          animated: c.status === 'Up',
          style: { stroke: 'var(--primary)', strokeWidth: 2, opacity: 0.6 },
        });
      });
    });

    return { nodes: newNodes, edges: newEdges };
  }, [state.containers, state.networks]);

  return (
    <div className="visualization-container">
      <div className="section" style={{ height: '300px', flex: 'none' }}>
        <h3><Layers size={18} /> Image Stack (Layers)</h3>
        <div className="horizontal-list">
          {state.images.map((img) => (
            <motion.div
              key={img.id}
              className="image-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="image-header">{img.name}:{img.tag}</div>
              <div className="layer-stack">
                {img.layers.map((layer, idx) => (
                  <div key={idx} className="layer">{layer}</div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="section" style={{ flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        <h3>Topology Mesh</h3>
        <div className="network-graph" style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            colorMode="dark"
            style={{ background: 'transparent' }}
          >
            <Background color="#334155" gap={20} />
            <Controls />
          </ReactFlow>
        </div>
      </div>

      <div className="section" style={{ flex: 'none' }}>
        <h3>Active Containers</h3>
        <div className="container-grid">
          {state.containers.map((container) => (
            <div key={container.id} className={`container-card ${container.status === 'Exited' ? 'stopped' : 'running'}`}>
              <b>{container.name}</b>
              <p>{container.imageName}</p>
              <div className="container-actions">
                <Trash2 size={14} className="action-icon" onClick={() => dockerEngine.execute(`docker rm ${container.id}`)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Visualization;
