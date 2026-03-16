import { useState, useEffect } from 'react'
import './App.css'

interface PetState {
  name: string
  hunger: number
  happiness: number
  energy: number
  stage: 'egg' | 'baby' | 'teen' | 'adult'
}

function App() {
  const [pet, setPet] = useState<PetState>(() => {
    const saved = localStorage.getItem('bulkagachi')
    return saved ? JSON.parse(saved) : {
      name: 'Bulk',
      hunger: 100,
      happiness: 100,
      energy: 100,
      stage: 'egg' as const
    }
  })

  useEffect(() => {
    localStorage.setItem('bulkagachi', JSON.stringify(pet))
  }, [pet])

  const feed = () => setPet(p => ({ ...p, hunger: Math.min(100, p.hunger + 20) }))
  const play = () => setPet(p => ({ ...p, happiness: Math.min(100, p.happiness + 15), energy: Math.max(0, p.energy - 10) }))
  const sleep = () => setPet(p => ({ ...p, energy: Math.min(100, p.energy + 30) }))

  return (
    <div className="app">
      <header>
        <h1>🐣 Bulkagachi</h1>
      </header>
      
      <main>
        <div className="pet-display">
          <div className="pet-emoji">
            {pet.stage === 'egg' ? '🥚' : pet.stage === 'baby' ? '🐣' : pet.stage === 'teen' ? '🐥' : '🐓'}
          </div>
          <h2>{pet.name}</h2>
          <p className="stage">{pet.stage.toUpperCase()}</p>
        </div>

        <div className="stats">
          <div className="stat">
            <span>🍗 Hunger</span>
            <div className="bar"><div style={{width: `${pet.hunger}%`}}></div></div>
          </div>
          <div className="stat">
            <span>💛 Happiness</span>
            <div className="bar"><div style={{width: `${pet.happiness}%`}}></div></div>
          </div>
          <div className="stat">
            <span>⚡ Energy</span>
            <div className="bar"><div style={{width: `${pet.energy}%`}}></div></div>
          </div>
        </div>

        <div className="actions">
          <button onClick={feed}>🍗 Feed</button>
          <button onClick={play}>🎾 Play</button>
          <button onClick={sleep}>💤 Sleep</button>
        </div>
      </main>
    </div>
  )
}

export default App
