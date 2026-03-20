import React, { useMemo, useState } from 'react'
import Terminal from './components/Terminal'
import Visualization from './components/Visualization'
import { Ship } from 'lucide-react'
import dockerEngine from './engine/DockerEngine'
import LevelManager from './levels/LevelManager'
import tutorialLevels from './levels/tutorial.json'

function App() {
  const levelManager = useMemo(() => new LevelManager(tutorialLevels), [])
  const [levelIndex, setLevelIndex] = useState(levelManager.getCurrentIndex())
  const [levelStatus, setLevelStatus] = useState({ done: false, message: '' })

  const currentLevel = levelManager.getCurrentLevel()
  const totalLevels = levelManager.levels.length
  const isLastLevel = levelManager.isLastLevel()
  const canAdvance = levelStatus.done && !isLastLevel

  const handleCommandExecuted = () => {
    const snapshot = dockerEngine.getSnapshot()
    const history = dockerEngine.getHistory()
    const result = levelManager.checkCurrentLevel(snapshot, history)

    if (result.done) {
      setLevelStatus((prev) => {
        const nextMessage = result.justCompleted ? result.message : prev.message
        return { done: true, message: nextMessage }
      })
      return result.justCompleted ? result.message : ''
    } else {
      setLevelStatus({ done: false, message: '' })
      return ''
    }
  }

  const handleNextLevel = () => {
    levelManager.advance()
    setLevelIndex(levelManager.getCurrentIndex())
    setLevelStatus({ done: false, message: '' })
  }

  return (
    <div className="app-container">
      <div className="left-panel">
        <header style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '8px' }}>
            <Ship size={24} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Docker Explorer</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>Interactive Simulator</p>
          </div>
        </header>

        <div className="level-panel">
          <div className="level-panel-header">
            <span className="level-progress">
              Level {Math.min(levelIndex + 1, totalLevels)} of {totalLevels}
            </span>
          </div>

          <h3 className="level-title">{currentLevel?.title || 'All levels complete'}</h3>
          <p className="level-description">{currentLevel?.objective || ''}</p>

          <div className={`level-badge ${levelStatus.done ? 'complete' : 'inprogress'}`}>
            {levelStatus.done ? levelStatus.message : 'In progress'}
          </div>

          <button
            className="level-next-btn"
            disabled={!canAdvance}
            onClick={handleNextLevel}
            type="button"
          >
            {isLastLevel ? (levelStatus.done ? 'All levels complete' : 'Last level') : 'Next level'}
          </button>
        </div>

        <Terminal onCommandExecuted={handleCommandExecuted} />

        <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Quick Tips</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.6' }}>
            <li><code>docker images</code> - View available images and their layers</li>
            <li><code>docker run [name]</code> - Create and start a new container</li>
            <li><code>docker ps</code> - List running containers</li>
            <li><code>docker stop [id]</code> - Gracefully stop a container</li>
          </ul>
        </div>
      </div>
      <div className="right-panel">
        <Visualization />
      </div>
    </div>
  )
}

export default App
