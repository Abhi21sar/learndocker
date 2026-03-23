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
    
    const goalState = state.getGoalState();
    
    // Helper to add nodes with a specific style
    const addNodes = (stateToRender, isGoal = false) => {
      const offset = isGoal ? 20 : 0;
      const opacity = isGoal ? 0.3 : 1;
      const prefix = isGoal ? 'goal-' : '';

      (stateToRender.networks || []).forEach((net, idx) => {
        const x = ((idx + 1) / ((stateToRender.networks || []).length + 1)) * 600 + offset;
        newNodes.push({
          id: prefix + net.id,
          type: 'network',
          position: { x, y: 50 + offset },
          data: { name: net.name + (isGoal ? ' (Goal)' : ''), isGoal },
          style: { opacity }
        });
      });

      (stateToRender.containers || []).forEach((c, idx) => {
        const cols = 3;
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const x = ((col + 1) / (cols + 1)) * 600 + offset;
        const y = 150 + row * 100 + offset;

        newNodes.push({
          id: prefix + (c.id || c.name),
          type: 'container',
          position: { x, y },
          data: { ...c, isGoal },
          style: { opacity }
        });

        // Edges
        (c.networkIds || c.networks || []).forEach((netId) => {
          newEdges.push({
            id: `e-${prefix}-${netId}-${c.id || c.name}`,
            source: prefix + netId,
            target: prefix + (c.id || c.name),
            animated: !isGoal && c.status === 'Up',
            style: { stroke: isGoal ? '#64748b' : 'var(--primary)', strokeWidth: 2, opacity: isGoal ? 0.2 : 0.6 },
          });
        });
      });
    };

    addNodes(state); // Current state
    addNodes(goalState, true); // Target state (ghosted)

    return { nodes: newNodes, edges: newEdges };
  }, [state, state.getGoalState]);

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
