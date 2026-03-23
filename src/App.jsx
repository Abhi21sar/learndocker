import React, { useMemo, useState } from 'react'
import Terminal from './components/Terminal'
import Visualization from './components/Visualization'
import { Ship } from 'lucide-react'
import { useDockerStore } from './store/useDockerStore'
import LevelManager from './levels/LevelManager'
import tutorialLevels from './levels/tutorial.json'

function App() {
  const levelManager = useMemo(() => new LevelManager(tutorialLevels), [])
  const { xp, lvlIndex, commandCount, setLevelIndex: setStoreLvlIndex, addXP } = useDockerStore()
  const [levelStatus, setLevelStatus] = useState({ done: false, message: '' })

  const currentLevel = tutorialLevels[lvlIndex]
  const totalLevels = tutorialLevels.length
  const isLastLevel = lvlIndex === totalLevels - 1
  const canAdvance = levelStatus.done && !isLastLevel

  const handleCommandExecuted = (command) => {
    const store = useDockerStore.getState()
    const result = levelManager.checkCurrentLevel(store, store.getHistory())

    if (result.done) {
      if (result.justCompleted) {
        let earnedXP = 100
        const par = currentLevel?.par || 1
        if (store.commandCount <= par) {
          earnedXP += 50 // Bonus for par completion
          result.message += " (Perfect Score! Bonus XP awarded)"
        }
        addXP(earnedXP)
      }
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
    setStoreLvlIndex(levelManager.getCurrentIndex())
    setLevelStatus({ done: false, message: '' })
  }

  return (
    <div className="app-container">
      <div className="left-panel">
        <header style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '8px' }}>
              <Ship size={24} color="white" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Docker Explorer</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>Interactive Simulator</p>
            </div>
          </div>
          <div className="xp-badge">
            <span className="xp-label">XP</span>
            <span className="xp-value">{xp}</span>
          </div>
        </header>

        <div className="level-panel">
          <div className="level-panel-header">
            <span className="level-progress">
              Level {Math.min(lvlIndex + 1, totalLevels)} of {totalLevels}
            </span>
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${((lvlIndex + (levelStatus.done ? 1 : 0)) / totalLevels) * 100}%` }}
              ></div>
            </div>
          </div>

          <hgroup>
            <h3 className="level-title">{currentLevel?.title || 'All levels complete'}</h3>
            <div className="command-stats">
              Commands: {commandCount} / Par: {currentLevel?.par || '-'}
            </div>
          </hgroup>
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
