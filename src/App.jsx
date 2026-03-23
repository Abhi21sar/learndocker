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

          {/* Why This Matters — Progressive Disclosure */}
          {currentLevel?.why && (
            <details style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-dim)', borderRadius: '8px', padding: '8px 12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <summary style={{ cursor: 'pointer', color: '#818cf8', fontWeight: 600 }}>💡 Why this matters in production</summary>
              <p style={{ margin: '6px 0 0 0' }}>{currentLevel.why}</p>
            </details>
          )}

          {/* Hint — shown after 3+ commands */}
          {currentLevel?.hint && commandCount >= 3 && !levelStatus.done && (
            <details open style={{ marginTop: '8px', fontSize: '0.78rem', borderRadius: '8px', padding: '8px 12px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <summary style={{ cursor: 'pointer', color: '#fbbf24', fontWeight: 600 }}>🔎 Hint</summary>
              <p style={{ margin: '6px 0 0 0', color: 'var(--text-dim)' }}>{currentLevel.hint}</p>
            </details>
          )}

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
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Quick Reference</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: '1.8', columns: 2 }}>
            <li><code>docker run</code> — Start container</li>
            <li><code>docker ps</code> — List containers</li>
            <li><code>docker images</code> — List images</li>
            <li><code>docker build -t</code> — Build image</li>
            <li><code>docker stop</code> — Stop container</li>
            <li><code>docker rm</code> — Remove container</li>
            <li><code>docker rmi</code> — Remove image</li>
            <li><code>docker pull</code> — Pull image</li>
            <li><code>docker logs</code> — View logs</li>
            <li><code>docker inspect</code> — Inspect resource</li>
            <li><code>docker stats</code> — Live resource usage</li>
            <li><code>docker scout</code> — Scan for CVEs</li>
            <li><code>docker init</code> — Scaffold project</li>
            <li><code>docker network create</code> — New network</li>
            <li><code>docker volume create</code> — New volume</li>
            <li><code>docker compose up</code> — Start stack</li>
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
