import { useState, useEffect, useRef } from 'react'
import { BulkagachiEngine } from './BulkagachiEngine'
import './App.css'

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BulkagachiEngine | null>(null)
  
  const [stats, setStats] = useState({ hunger: 100, happiness: 100, cleanliness: 100, energy: 100 })
  const [_stage, setStage] = useState('EGG')
  const [age, setAge] = useState('0h')
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [xpNeeded, setXpNeeded] = useState(75)
  const [poopCount, setPoopCount] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [isSleeping, setIsSleeping] = useState(false)
  const [isGhost, setIsGhost] = useState(false)
  const [isSick, setIsSick] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const engine = new BulkagachiEngine(containerRef.current, {
      onStatsChange: (hunger, happiness, cleanliness, energy) => {
        setStats({ hunger, happiness, cleanliness, energy })
      },
      onAgeChange: (ageStr) => setAge(ageStr),
      onLevelChange: (lvl, x, xpn) => {
        setLevel(lvl)
        setXp(x)
        setXpNeeded(xpn)
      },
      onPoopCountChange: (count) => setPoopCount(count),
      onMessageChange: (msg) => setMessage(msg),
      onSleepChange: (sleeping) => setIsSleeping(sleeping),
      onGhostModeChange: (ghost) => setIsGhost(ghost),
      onSicknessChange: (sick) => setIsSick(sick),
      onGrowthStageChange: (s) => setStage(s),
    })

    engine.init()
    engineRef.current = engine

    return () => {
      engine.dispose()
    }
  }, [])

  const feed = () => engineRef.current?.feedBulk()
  const play = () => engineRef.current?.playWithBulk()
  const clean = () => engineRef.current?.cleanBulk()
  const sleep = () => engineRef.current?.toggleSleep()
  const medicine = () => engineRef.current?.giveMedicine()

  return (
    <div className="app">
      <header>
        <h1>🐣 Bulkagachi</h1>
        <p className="age">Age: {age} • Level {level}</p>
      </header>
      
      <main>
        {/* Game Canvas */}
        <div ref={containerRef} className="game-container" />
        
        {/* Message Toast */}
        {message && (
          <div className="message-toast">
            {message}
          </div>
        )}
        
        {/* Stats */}
        <div className="stats">
          <div className="stat">
            <span>🍗 {Math.round(stats.hunger)}</span>
            <div className="bar"><div style={{width: `${stats.hunger}%`, background: stats.hunger < 30 ? '#ff4444' : '#4ecdc4'}}></div></div>
          </div>
          <div className="stat">
            <span>💛 {Math.round(stats.happiness)}</span>
            <div className="bar"><div style={{width: `${stats.happiness}%`, background: stats.happiness < 30 ? '#ff4444' : '#ff6b6b'}}></div></div>
          </div>
          <div className="stat">
            <span>✨ {Math.round(stats.cleanliness)}</span>
            <div className="bar"><div style={{width: `${stats.cleanliness}%`, background: stats.cleanliness < 30 ? '#ff4444' : '#45b7d1'}}></div></div>
          </div>
          <div className="stat">
            <span>⚡ {Math.round(stats.energy)}</span>
            <div className="bar"><div style={{width: `${stats.energy}%`, background: stats.energy < 30 ? '#ff4444' : '#f9ca24'}}></div></div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="xp-bar">
          <span>XP: {xp} / {xpNeeded}</span>
          <div className="bar"><div style={{width: `${(xp/xpNeeded)*100}%`}}></div></div>
        </div>

        {/* Status Indicators */}
        <div className="status-indicators">
          {poopCount > 0 && <span className="status-poop">💩 {poopCount}</span>}
          {isSleeping && <span className="status-sleep">💤</span>}
          {isSick && <span className="status-sick">🤒</span>}
          {isGhost && <span className="status-ghost">👻</span>}
        </div>
        
        {/* Actions */}
        <div className="actions">
          <button onClick={feed} disabled={isSleeping || isGhost}>🍗</button>
          <button onClick={play} disabled={isSleeping || isGhost}>🎾</button>
          <button onClick={clean} disabled={isSleeping || isGhost}>🧼</button>
          <button onClick={medicine} disabled={!isSick || isGhost}>💊</button>
          <button onClick={sleep}>{isSleeping ? '☀️' : '💤'}</button>
        </div>

        <p className="hint">Tap Bulk to pet!</p>
      </main>
    </div>
  )
}

export default App
