import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Layers, Play, StopCircle, Trash2 } from 'lucide-react';
import dockerEngine from '../engine/DockerEngine';

const Visualization = () => {
  const [state, setState] = useState({
    images: dockerEngine.images,
    containers: dockerEngine.containers,
    networks: dockerEngine.networks || [],
    volumes: dockerEngine.volumes || []
  });

  useEffect(() => {
    dockerEngine.setStateChangeHandler((newState) => {
      setState({ ...newState });
    });
  }, []);

  const networkNameById = new Map((state.networks || []).map((n) => [n.id, n.name]));

  const containerPositionById = (() => {
    const W = 600;
    const cols = 3;
    const cardTop = 120;
    const rowH = 72;
    const xForCol = (col) => ((col + 1) / (cols + 1)) * W;

    const map = {};
    (state.containers || []).forEach((c, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      map[c.id] = { x: xForCol(col), y: cardTop + row * rowH };
    });
    return map;
  })();

  return (
    <div className="visualization-container">
      <div className="section">
        <h3><Layers size={18} /> Image Stack (Layers)</h3>
        <div className="vertical-image-list">
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

      <div className="section">
        <h3><Box size={18} /> Networks</h3>

        <div className="network-graph">
          <svg viewBox="0 0 600 260" className="network-svg" preserveAspectRatio="xMidYMid meet">
            {(state.networks || []).map((net, netIdx) => {
              const x = ((netIdx + 1) / ((state.networks || []).length + 1)) * 600;
              const y = 40;
              return (
                <g key={net.id}>
                  {(state.containers || []).map((c) => {
                    const pos = containerPositionById[c.id];
                    if (!pos) return null;
                    if (!c.networkIds?.includes(net.id)) return null;
                    return (
                      <line
                        key={`${net.id}-${c.id}`}
                        x1={x}
                        y1={y}
                        x2={pos.x}
                        y2={pos.y}
                        stroke="rgba(59,130,246,0.65)"
                        strokeWidth="2"
                      />
                    );
                  })}
                  <circle cx={x} cy={y} r="10" fill="rgba(59,130,246,0.25)" stroke="rgba(59,130,246,0.85)" />
                  <text x={x} y={y + 26} textAnchor="middle" fill="rgba(248,250,252,0.85)" fontSize="12">
                    {net.name}
                  </text>
                </g>
              );
            })}

            {(state.containers || []).map((c) => {
              const pos = containerPositionById[c.id];
              if (!pos) return null;
              return (
                <g key={c.id}>
                  <circle cx={pos.x} cy={pos.y} r="7" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.35)" />
                  <text x={pos.x} y={pos.y + 20} textAnchor="middle" fill="rgba(248,250,252,0.85)" fontSize="11">
                    {c.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="network-cards">
          {(state.networks || []).map((net) => {
            const connectedNames = (state.containers || [])
              .filter((c) => c.networkIds?.includes(net.id))
              .map((c) => c.name);

            return (
              <div key={net.id} className="network-card">
                <b>{net.name}</b>
                <p>{connectedNames.length ? connectedNames.join(', ') : 'No connected containers'}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section">
        <h3><Box size={18} /> Active Containers</h3>
        <div className="container-grid">
          <AnimatePresence>
            {state.containers.map((container) => (
              <motion.div
                key={container.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`container-card ${container.status === 'Exited' ? 'stopped' : 'running'}`}
              >
                <div className="container-status-badge">
                  {container.status === 'Up' ? <Play size={12} fill="#10b981" /> : <StopCircle size={12} fill="#ef4444" />}
                </div>
                <b>{container.name}</b>
                <p>{container.imageName}</p>
                {(container.networkIds || []).length > 0 && (
                  <p>
                    Networks:{' '}
                    {container.networkIds
                      .map((id) => networkNameById.get(id))
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                {(container.mounts || []).length > 0 && (
                  <p>
                    Mounts:{' '}
                    {container.mounts
                      .map((m) => `${m.volumeName}:${m.containerPath}`)
                      .join(', ')}
                  </p>
                )}
                <div className="container-actions">
                  <Trash2 size={14} className="action-icon" onClick={() => dockerEngine.execute(`docker rm ${container.id}`)} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Visualization;
