import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layers, Trash2, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import { ReactFlow, Background, Controls, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dockerEngine from '../engine/DockerEngine';
import { useDockerStore } from '../store/useDockerStore';
import ContainerNode from './ContainerNode';
import NetworkNode from './NetworkNode';

const nodeTypes = {
  container: ContainerNode,
  network: NetworkNode,
};

// Per the architectural brief: classify networks to teach isolation concepts.
const isUserDefined = (netName) => netName !== 'bridge';

const NetworkBadge = ({ name }) => {
  const safe = isUserDefined(name);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem',
      background: safe ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
      color: safe ? '#4ade80' : '#f87171',
      border: `1px solid ${safe ? '#4ade8044' : '#f8717144'}`,
    }}>
      {safe ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
      {safe ? 'Isolated' : 'No Isolation'}
    </span>
  );
};

const Visualization = () => {
  const state = useDockerStore();

  const { nodes, edges } = useMemo(() => {
    const newNodes = [];
    const newEdges = [];
    const goalState = state.getGoalState();

    const addNodes = (stateToRender, isGoal = false) => {
      const offset = isGoal ? 20 : 0;
      const opacity = isGoal ? 0.3 : 1;
      const prefix = isGoal ? 'goal-' : '';

      (stateToRender.networks || []).forEach((net, idx) => {
        const x = ((idx + 1) / ((stateToRender.networks || []).length + 1)) * 600 + offset;
        // Color-code: user-defined = green tint, default bridge = red tint
        const borderColor = isGoal ? '#334155' : isUserDefined(net.name) ? '#4ade80' : '#f87171';
        newNodes.push({
          id: prefix + net.id,
          type: 'network',
          position: { x, y: 50 + offset },
          data: { name: net.name + (isGoal ? ' (Goal)' : ''), isGoal },
          style: { opacity, borderColor, boxShadow: isGoal ? 'none' : `0 0 12px ${borderColor}44` }
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

        (c.networkIds || c.networks || []).forEach((netId) => {
          const net = (stateToRender.networks || []).find(n => n.id === netId);
          const isolated = net ? isUserDefined(net.name) : false;
          newEdges.push({
            id: `e-${prefix}-${netId}-${c.id || c.name}`,
            source: prefix + netId,
            target: prefix + (c.id || c.name),
            animated: !isGoal && c.status === 'Up',
            style: {
              stroke: isGoal ? '#64748b' : isolated ? '#4ade80' : '#f87171',
              strokeWidth: 2,
              opacity: isGoal ? 0.2 : 0.7,
            },
          });
        });
      });
    };

    addNodes(state);
    addNodes(goalState, true);

    return { nodes: newNodes, edges: newEdges };
  }, [state, state.getGoalState]);

  const userDefinedNets = (state.networks || []).filter(n => isUserDefined(n.name));
  const defaultNets = (state.networks || []).filter(n => !isUserDefined(n.name));

  return (
    <div className="visualization-container">
      {/* Image Layer Stack */}
      <div className="section" style={{ maxHeight: '220px', flex: 'none', overflowY: 'auto' }}>
        <h3><Layers size={18} /> Image Stack</h3>
        <div className="horizontal-list">
          {state.images.map((img) => (
            <motion.div
              key={img.id}
              className="image-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="image-header">
                {img.name}:{img.tag}
                {img.target && <span style={{ marginLeft: '6px', fontSize: '0.65rem', color: '#4ade80' }}>⚡ multi-stage</span>}
              </div>
              <div className="layer-stack">
                {img.layers.map((layer, idx) => (
                  <div key={idx} className="layer">{layer}</div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Network Isolation Summary */}
      <div style={{ padding: '8px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {defaultNets.map(n => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <NetworkBadge name={n.name} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{n.name}</span>
          </div>
        ))}
        {userDefinedNets.map(n => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <NetworkBadge name={n.name} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{n.name}</span>
          </div>
        ))}
      </div>

      {/* Topology Mesh */}
      <div className="section" style={{ flex: 1, minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
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
            <Panel position="bottom-left">
              <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ color: '#4ade80' }}>● User-Defined Network (DNS isolated)</span>
                <span style={{ color: '#f87171' }}>● Default Bridge (no isolation)</span>
                <span style={{ color: '#64748b' }}>● Ghosted = goal state</span>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Container Cards */}
      <div className="section" style={{ flex: 'none' }}>
        <h3>Active Containers</h3>
        <div className="container-grid">
          {state.containers.map((container) => (
            <div key={container.id} className={`container-card ${container.status === 'Exited' ? 'stopped' : 'running'}`}>
              <b>{container.name}</b>
              <p>{container.imageName}</p>
              {container.userId && container.userId !== 'root' && (
                <span style={{ fontSize: '0.7rem', color: '#4ade80' }}>
                  <ShieldCheck size={10} /> uid:{container.userId}
                </span>
              )}
              {container.userId === 'root' && (
                <span style={{ fontSize: '0.7rem', color: '#f87171' }}>
                  <ShieldAlert size={10} /> running as root
                </span>
              )}
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



