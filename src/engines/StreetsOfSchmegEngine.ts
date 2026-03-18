import * as THREE from 'three'
import { BaseGameEngine, type GameCallbacks } from './shared/BaseGameEngine'
import { AudioManager } from './shared/AudioManager'

// Sprite loader
const spriteCache = new Map<string, THREE.Texture>()
async function loadSprite(url: string): Promise<THREE.Texture> {
  if (spriteCache.has(url)) return spriteCache.get(url)!
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader()
    loader.load(url, (tex) => {
      tex.magFilter = THREE.NearestFilter
      tex.minFilter = THREE.NearestFilter
      spriteCache.set(url, tex)
      resolve(tex)
    })
  })
}

interface Enemy {
  id: number
  type: 'thug' | 'knife' | 'scientist' | 'boss'
  x: number
  y: number
  health: number
  maxHealth: number
  state: 'idle' | 'walk' | 'attack' | 'hurt' | 'dead'
  direction: -1 | 1
  attackCooldown: number
  hurtTimer: number
  vx: number
  vy: number
}

interface Orb {
  x: number
  y: number
  vx: number
  type: 'ground' | 'air'
}

interface LevelConfig {
  enemies: { type: Enemy['type']; x: number; health: number }[]
}

export class StreetsOfSchmegEngine extends BaseGameEngine {
  private gameState: 'menu' | 'playing' | 'gameover' | 'win' = 'menu'
  private score = 0
  private combo = 0
  private comboTimer = 0
  private level = 1
  private enemies: Enemy[] = []
  private orbs: Orb[] = []
  private nextEnemyId = 0
  private projectiles: { x: number; y: number; vx: number; vy: number; type: string }[] = []
  
  private playerX = 200
  private playerY = 0
  private playerHealth = 100
  private playerMaxHealth = 100
  private playerState: 'idle' | 'walk' | 'punch' | 'kick' | 'jump' | 'hurt' | 'block' | 'orb' = 'idle'
  private playerDirection: -1 | 1 = 1
  private playerHurtTimer = 0
  private playerInvincible = 0
  
  private GROUND_Y = -80
  private PLAYER_SPEED = 3
  private ENEMY_SPEED = 1
  private lastAttackTime = 0
  
  private keys: Set<string> = new Set()
  private touchButtons: Map<string, boolean> = new Map()
  private audio: AudioManager | null = null
  
  private levels: LevelConfig[] = [
    { enemies: [{ type: 'thug', x: 500, health: 30 }, { type: 'thug', x: 700, health: 30 }, { type: 'thug', x: 900, health: 30 }] },
    { enemies: [{ type: 'thug', x: 400, health: 30 }, { type: 'thug', x: 600, health: 30 }, { type: 'thug', x: 800, health: 30 }, { type: 'thug', x: 1000, health: 30 }] },
    { enemies: [{ type: 'thug', x: 400, health: 30 }, { type: 'knife', x: 600, health: 25 }, { type: 'thug', x: 800, health: 30 }, { type: 'knife', x: 1000, health: 25 }] },
    { enemies: [{ type: 'knife', x: 400, health: 25 }, { type: 'knife', x: 600, health: 25 }, { type: 'thug', x: 800, health: 30 }, { type: 'knife', x: 1000, health: 25 }, { type: 'thug', x: 1200, health: 30 }] },
    { enemies: [{ type: 'scientist', x: 400, health: 20 }, { type: 'knife', x: 600, health: 25 }, { type: 'scientist', x: 800, health: 20 }, { type: 'knife', x: 1000, health: 25 }] },
    { enemies: [{ type: 'scientist', x: 400, health: 20 }, { type: 'knife', x: 600, health: 25 }, { type: 'scientist', x: 800, health: 20 }, { type: 'knife', x: 1000, health: 25 }, { type: 'scientist', x: 1200, health: 20 }] },
    { enemies: [{ type: 'thug', x: 400, health: 35 }, { type: 'knife', x: 600, health: 30 }, { type: 'scientist', x: 800, health: 25 }, { type: 'knife', x: 1000, health: 30 }, { type: 'thug', x: 1200, health: 35 }] },
    { enemies: [{ type: 'boss', x: 900, health: 200 }] },
  ]
  
  private levelComplete = false
  private levelTransitionTimer = 0
  
  // Meshes
  private playerMesh!: THREE.Mesh
  private enemyMeshes: Map<number, THREE.Mesh> = new Map()
  private orbMeshes: THREE.Mesh[] = []
  
  // Textures
  private texPlayerIdle!: THREE.Texture
  private texPlayerPunch!: THREE.Texture
  private texPlayerRun!: THREE.Texture
  private texPlayerJump!: THREE.Texture
  private texPlayerHurt!: THREE.Texture
  private texOrbGround!: THREE.Texture
  private texOrbAir!: THREE.Texture
  private texThug!: THREE.Texture
  private texThugPunch!: THREE.Texture
  private texThugHurt!: THREE.Texture
  private texKnife!: THREE.Texture
  private texKnifeAttack!: THREE.Texture
  private texScientist!: THREE.Texture
  private texScientistHurt!: THREE.Texture
  private texBoss!: THREE.Texture
  private loaded = false
  
  constructor(container: HTMLElement, callbacks: GameCallbacks = {}) {
    super(container, callbacks)
    this.playerY = this.GROUND_Y
    this.setupInput()
    this.initAudio()
  }
  
  private initAudio() {
    try {
      this.audio = new AudioManager()
    } catch (e) { console.warn('Audio not available') }
  }
  
  private playSound(type: string) {
    if (!this.audio) return
    switch (type) {
      case 'punch': this.audio.synthTone(150, 0.1, 'square', 0.2); break
      case 'hit': this.audio.synthTone(100, 0.08, 'sawtooth', 0.3); break
      case 'shoot': this.audio.synthTone(400, 0.15, 'square', 0.15); break
      case 'jump': this.audio.synthTone(200, 0.1, 'sine', 0.2); break
      case 'hurt': this.audio.synthTone(80, 0.2, 'sawtooth', 0.3); break
      case 'block': this.audio.synthTone(300, 0.05, 'sine', 0.2); break
      case 'enemy_attack': this.audio.synthTone(120, 0.1, 'square', 0.15); break
      case 'enemy_death': this.audio.synthTone(60, 0.15, 'sawtooth', 0.25); break
      case 'level_up': this.audio.synthTone(400, 0.1, 'sine', 0.2); this.audio.synthTone(600, 0.15, 'sine', 0.15); break
      case 'gameover': this.audio.synthTone(100, 0.3, 'sawtooth', 0.3); break
      case 'win': this.audio.synthTone(400, 0.1, 'sine', 0.2); this.audio.synthTone(500, 0.1, 'sine', 0.2); this.audio.synthTone(600, 0.2, 'sine', 0.2); break
    }
  }
  
  async createScene(): Promise<void> {
    this.camera = new THREE.OrthographicCamera(-200, 200, 150, -150, 0.1, 1000)
    this.camera.position.z = 10
    this.scene.background = new THREE.Color(0x1a1a2e)
    
    // Load all textures in parallel
    await Promise.all([
      loadSprite('/images/pixelbulk.png').then(t => this.texPlayerIdle = t),
      loadSprite('/images/pixelbulk-punch.png').then(t => this.texPlayerPunch = t),
      loadSprite('/images/pixelbulk-run.png').then(t => this.texPlayerRun = t),
      loadSprite('/images/pixelbulk-jump.png').then(t => this.texPlayerJump = t),
      loadSprite('/images/pixelbulk-damage.png').then(t => this.texPlayerHurt = t),
      loadSprite('/images/orb-ground.png').then(t => this.texOrbGround = t),
      loadSprite('/images/orb-air.png').then(t => this.texOrbAir = t),
      loadSprite('/images/pixelthug.png').then(t => this.texThug = t),
      loadSprite('/images/pixelthug-punch.png').then(t => this.texThugPunch = t),
      loadSprite('/images/pixelthug-damage.png').then(t => this.texThugHurt = t),
      loadSprite('/images/pixelthug-knife.png').then(t => this.texKnife = t),
      loadSprite('/images/pixelthug-knife-attack.png').then(t => this.texKnifeAttack = t),
      loadSprite('/images/pixelscientist.png').then(t => this.texScientist = t),
      loadSprite('/images/pixelscientist-damage.png').then(t => this.texScientistHurt = t),
      loadSprite('/images/pixelthug.png').then(t => this.texBoss = t),
    ])
    this.loaded = true
    
    // Ground
    const groundGeo = new THREE.PlaneGeometry(500, 60)
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x2d2d44 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.position.y = this.GROUND_Y - 30
    this.scene.add(ground)
    
    // Player sprite
    const playerGeo = new THREE.PlaneGeometry(48, 64)
    const playerMat = new THREE.MeshBasicMaterial({ map: this.texPlayerIdle, transparent: true })
    this.playerMesh = new THREE.Mesh(playerGeo, playerMat)
    this.playerMesh.position.set(this.playerX, this.playerY, 0)
    this.scene.add(this.playerMesh)
    
    this.spawnEnemies()
  }
  
  private spawnEnemies() {
    const config = this.levels[this.level - 1]
    for (const e of config.enemies) {
      const enemy: Enemy = {
        id: this.nextEnemyId++,
        type: e.type,
        x: e.x,
        y: this.GROUND_Y,
        health: e.health,
        maxHealth: e.health,
        state: 'idle',
        direction: -1,
        attackCooldown: 60,
        hurtTimer: 0,
        vx: 0,
        vy: 0
      }
      this.enemies.push(enemy)
      
      const mesh = this.createEnemyMesh(e.type)
      mesh.position.set(e.x, this.GROUND_Y, 0)
      this.enemyMeshes.set(enemy.id, mesh)
      this.scene.add(mesh)
    }
  }
  
  private createEnemyMesh(type: string): THREE.Mesh {
    let tex: THREE.Texture
    switch (type) {
      case 'thug': tex = this.texThug; break
      case 'knife': tex = this.texKnife; break
      case 'scientist': tex = this.texScientist; break
      case 'boss': tex = this.texBoss; break
      default: tex = this.texThug
    }
    const size = type === 'boss' ? 80 : 48
    const geo = new THREE.PlaneGeometry(size, size)
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    return new THREE.Mesh(geo, mat)
  }
  
  private setupInput() {
    window.addEventListener('keydown', (e) => { this.keys.add(e.key.toLowerCase()); if (e.key === ' ') e.preventDefault() })
    window.addEventListener('keyup', (e) => { this.keys.delete(e.key.toLowerCase()) })
  }
  
  registerTouchButton(id: string, active: boolean) { this.touchButtons.set(id, active) }
  
  private isInputActive(action: string): boolean {
    switch (action) {
      case 'left': return this.keys.has('arrowleft') || this.keys.has('a') || !!this.touchButtons.get('left')
      case 'right': return this.keys.has('arrowright') || this.keys.has('d') || !!this.touchButtons.get('right')
      case 'jump': return this.keys.has('arrowup') || this.keys.has('w') || this.keys.has(' ') || !!this.touchButtons.get('jump')
      case 'punch': return this.keys.has('z') || this.keys.has('j') || !!this.touchButtons.get('punch')
      case 'block': return this.keys.has('b') || this.keys.has('l') || !!this.touchButtons.get('block')
      case 'orb': return this.keys.has('c') || this.keys.has('i') || !!this.touchButtons.get('orb')
      case 'start': return this.keys.has('enter') || !!this.touchButtons.get('start')
    }
    return false
  }
  
  update(delta: number): void {
    if (!this.loaded) return
    
    if (this.gameState === 'menu' || this.gameState === 'gameover' || this.gameState === 'win') {
      if (this.isInputActive('start')) this.start()
      return
    }
    
    const dt = delta * 60
    
    if (this.levelComplete) {
      this.levelTransitionTimer += delta
      if (this.levelTransitionTimer > 2) this.nextLevel()
      return
    }
    
    if (this.enemies.filter(e => e.state !== 'dead').length === 0) {
      this.levelComplete = true
      this.levelTransitionTimer = 0
      if (this.level >= 8) {
        this.gameState = 'win'
        this.playSound('win')
        this.callbacks.onStateChange?.('win')
      }
    }
    
    this.updatePlayer(dt)
    this.updateEnemies(dt)
    this.updateOrbs(dt)
    
    if (this.comboTimer > 0) { this.comboTimer -= delta; if (this.comboTimer <= 0) this.combo = 0 }
    if (this.playerHurtTimer > 0) this.playerHurtTimer -= dt
    if (this.playerInvincible > 0) this.playerInvincible -= dt
    
    this.callbacks.onScoreChange?.(this.score)
    this.callbacks.onComboChange?.(this.combo)
    this.callbacks.onWaveChange?.(this.level)
    this.callbacks.onHealthChange?.(this.playerHealth)
  }
  
  private updatePlayer(dt: number) {
    if (this.playerState === 'hurt') {
      this.playerHurtTimer -= dt
      if (this.playerHurtTimer <= 0) this.playerState = 'idle'
      this.updatePlayerSprite()
      return
    }
    
    if (this.isInputActive('block')) {
      this.playerState = 'block'
    } else if (this.isInputActive('punch') && this.playerState !== 'punch') {
      this.playerState = 'punch'
      this.lastAttackTime = Date.now()
      this.playSound('punch')
      this.checkAttackHit(50, 30, 15)
      setTimeout(() => { if (this.playerState === 'punch') this.playerState = 'idle' }, 200)
    } else if (this.isInputActive('orb') && this.playerState !== 'orb') {
      this.playerState = 'orb'
      this.lastAttackTime = Date.now()
      this.playSound('shoot')
      this.shootOrb()
      setTimeout(() => { if (this.playerState === 'orb') this.playerState = 'idle' }, 150)
    } else if (this.isInputActive('jump') && this.playerY >= this.GROUND_Y - 5) {
      this.playerY = this.GROUND_Y - 20
      this.playerState = 'jump'
      this.playSound('jump')
    } else if (this.isInputActive('left')) {
      this.playerX -= this.PLAYER_SPEED * dt
      this.playerDirection = -1
      this.playerState = 'walk'
    } else if (this.isInputActive('right')) {
      this.playerX += this.PLAYER_SPEED * dt
      this.playerDirection = 1
      this.playerState = 'walk'
    } else {
      if (this.playerState === 'walk' || this.playerState === 'jump') this.playerState = 'idle'
    }
    
    // Gravity
    if (this.playerY < this.GROUND_Y) {
      this.playerY += 0.5 * dt
      if (this.playerY > this.GROUND_Y) {
        this.playerY = this.GROUND_Y
        if (this.playerState === 'jump') this.playerState = 'idle'
      }
    }
    
    this.playerX = Math.max(50, Math.min(350, this.playerX))
    this.playerMesh.position.x = this.playerX
    this.playerMesh.position.y = this.playerY
    this.playerMesh.scale.x = this.playerDirection
    
    this.updatePlayerSprite()
  }
  
  private updatePlayerSprite() {
    const mat = this.playerMesh.material as THREE.MeshBasicMaterial
    if (this.playerState === 'hurt') mat.map = this.texPlayerHurt
    else if (this.playerState === 'punch' || this.playerState === 'orb') mat.map = this.texPlayerPunch
    else if (this.playerState === 'walk') mat.map = this.texPlayerRun
    else if (this.playerState === 'jump') mat.map = this.texPlayerJump
    else mat.map = this.texPlayerIdle
    mat.needsUpdate = true
  }
  
  private shootOrb() {
    const now = Date.now()
    if (now - this.lastAttackTime < 400) return
    
    const orbType = this.playerY < this.GROUND_Y - 10 ? 'air' : 'ground'
    this.orbs.push({ x: this.playerX + (this.playerDirection === 1 ? 30 : -30), y: this.playerY - 25, vx: this.playerDirection * 8, type: orbType })
    
    const geo = new THREE.PlaneGeometry(24, 24)
    const mat = new THREE.MeshBasicMaterial({ map: orbType === 'air' ? this.texOrbAir : this.texOrbGround, transparent: true })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(this.playerX, this.playerY - 25, 0)
    this.orbMeshes.push(mesh)
    this.scene.add(mesh)
  }
  
  private updateOrbs(dt: number) {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i]
      orb.x += orb.vx * dt
      
      for (const enemy of this.enemies) {
        if (enemy.state === 'dead') continue
        const dx = orb.x - enemy.x
        const dy = orb.y - enemy.y
        if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
          this.damageEnemy(enemy, 20)
          this.orbs.splice(i, 1)
          if (this.orbMeshes[i]) { this.scene.remove(this.orbMeshes[i]); this.orbMeshes.splice(i, 1) }
          break
        }
      }
      
      if (orb.x < -50 || orb.x > 450) {
        this.orbs.splice(i, 1)
        if (this.orbMeshes[i]) { this.scene.remove(this.orbMeshes[i]); this.orbMeshes.splice(i, 1) }
      }
    }
    
    for (let i = 0; i < this.orbs.length && i < this.orbMeshes.length; i++) {
      this.orbMeshes[i].position.x = this.orbs[i].x
      this.orbMeshes[i].position.y = this.orbs[i].y
    }
  }
  
  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue
      const mesh = this.enemyMeshes.get(enemy.id)
      
      if (enemy.state === 'hurt') {
        enemy.hurtTimer -= dt
        enemy.x += enemy.vx * dt
        if (enemy.hurtTimer <= 0) enemy.state = 'idle'
        if (mesh) { mesh.position.x = enemy.x; this.updateEnemySprite(mesh, enemy) }
        continue
      }
      
      const dx = this.playerX - enemy.x
      const dist = Math.abs(dx)
      
      if (dist > 80) {
        enemy.direction = dx > 0 ? 1 : -1
        enemy.x += this.ENEMY_SPEED * dt * enemy.direction
        enemy.state = 'walk'
      } else if (dist < 60 && enemy.attackCooldown <= 0) {
        enemy.state = 'attack'
        enemy.attackCooldown = 120
        this.playSound('enemy_attack')
        
        if (enemy.type === 'knife' || enemy.type === 'scientist') {
          this.projectiles.push({ x: enemy.x, y: enemy.y - 25, vx: enemy.direction * 5, vy: enemy.type === 'scientist' ? -2 : 0, type: enemy.type })
        }
        setTimeout(() => { if (enemy.state === 'attack') enemy.state = 'idle' }, 400)
      } else {
        enemy.state = 'idle'
      }
      
      if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt
      if (mesh) { mesh.position.x = enemy.x; mesh.scale.x = enemy.direction; this.updateEnemySprite(mesh, enemy) }
    }
    
    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]
      proj.x += proj.vx * dt
      proj.y += proj.vy * dt
      if (proj.type === 'scientist') proj.vy += 0.2 * dt
      
      if (this.playerInvincible <= 0 && this.playerState !== 'block') {
        const dx = proj.x - this.playerX
        const dy = proj.y - this.playerY
        if (Math.abs(dx) < 25 && Math.abs(dy) < 30) {
          this.damagePlayer(15)
          this.playSound('hurt')
          this.projectiles.splice(i, 1)
          continue
        }
      } else if (this.playerState === 'block') {
        const dx = proj.x - this.playerX
        if (Math.abs(dx) < 30) {
          this.projectiles.splice(i, 1)
          this.playSound('block')
          this.score += 50
          continue
        }
      }
      
      if (proj.x < -50 || proj.x > 450 || proj.y > this.GROUND_Y + 50) this.projectiles.splice(i, 1)
    }
  }
  
  private updateEnemySprite(mesh: THREE.Mesh, enemy: Enemy) {
    const mat = mesh.material as THREE.MeshBasicMaterial
    if (enemy.state === 'hurt') {
      mat.map = enemy.type === 'scientist' ? this.texScientistHurt : this.texThugHurt
    } else if (enemy.state === 'attack') {
      mat.map = enemy.type === 'knife' ? this.texKnifeAttack : this.texThugPunch
    } else {
      switch (enemy.type) {
        case 'thug': mat.map = this.texThug; break
        case 'knife': mat.map = this.texKnife; break
        case 'scientist': mat.map = this.texScientist; break
        case 'boss': mat.map = this.texBoss; break
      }
    }
    mat.needsUpdate = true
  }
  
  private checkAttackHit(range: number, height: number, damage: number) {
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead' || enemy.state === 'hurt') continue
      const dx = enemy.x - this.playerX
      const dy = Math.abs(enemy.y - this.playerY)
      if (Math.abs(dx) < range && dy < height && Math.sign(dx) === this.playerDirection) {
        this.damageEnemy(enemy, damage)
      }
    }
  }
  
  private damageEnemy(enemy: Enemy, damage: number) {
    enemy.health -= damage
    enemy.state = 'hurt'
    enemy.hurtTimer = 15
    enemy.vx = this.playerDirection * 2
    this.playSound('hit')
    
    this.score += 100 + this.combo * 50
    this.combo++
    this.comboTimer = 1.5
    
    if (enemy.health <= 0) {
      enemy.state = 'dead'
      this.score += 500
      this.playSound('enemy_death')
      const mesh = this.enemyMeshes.get(enemy.id)
      if (mesh) this.scene.remove(mesh)
    }
  }
  
  private damagePlayer(damage: number) {
    if (this.playerInvincible > 0 || this.playerState === 'block') return
    
    this.playerHealth -= damage
    this.playerHurtTimer = 20
    this.playerState = 'hurt'
    this.playerInvincible = 60
    this.playerX -= this.playerDirection * 20
    
    if (this.playerHealth <= 0) {
      this.gameState = 'gameover'
      this.playSound('gameover')
      this.callbacks.onStateChange?.('gameover')
    }
  }
  
  private nextLevel() {
    this.level++
    this.levelComplete = false
    this.levelTransitionTimer = 0
    this.enemies = []
    this.projectiles = []
    this.orbs = []
    for (const mesh of this.orbMeshes) this.scene.remove(mesh)
    this.orbMeshes = []
    for (const [, mesh] of this.enemyMeshes) this.scene.remove(mesh)
    this.enemyMeshes.clear()
    
    if (this.level > 8) { this.gameState = 'win'; this.callbacks.onStateChange?.('win'); return }
    
    const bgColors = [0x1a1a2e, 0x1e3a5f, 0x2d1b4e, 0x1a1a2e]
    this.scene.background = new THREE.Color(bgColors[Math.min(Math.ceil(this.level / 2) - 1, 3)])
    this.spawnEnemies()
    this.playerX = 200
    this.playerHealth = Math.min(this.playerHealth + 30, this.playerMaxHealth)
    this.playSound('level_up')
  }
  
  start(): void {
    this.score = 0; this.combo = 0; this.level = 1; this.playerHealth = 100; this.playerX = 200; this.playerY = this.GROUND_Y; this.playerState = 'idle'
    this.enemies = []; this.projectiles = []; this.orbs = []; this.levelComplete = false; this.gameState = 'playing'
    for (const [, mesh] of this.enemyMeshes) this.scene.remove(mesh); this.enemyMeshes.clear()
    for (const mesh of this.orbMeshes) this.scene.remove(mesh); this.orbMeshes = []
    this.scene.background = new THREE.Color(0x1a1a2e)
    this.spawnEnemies()
    this.callbacks.onStateChange?.('playing')
    this.callbacks.onScoreChange?.(0)
    this.callbacks.onHealthChange?.(100)
  }
  
  restart(): void { this.start() }
  punch() { if (this.playerState !== 'punch' && this.playerState !== 'hurt') { this.playerState = 'punch'; this.lastAttackTime = Date.now(); this.playSound('punch'); this.checkAttackHit(50, 30, 15); setTimeout(() => { if (this.playerState === 'punch') this.playerState = 'idle' }, 200) } }
  shootOrbAttack() { if (this.playerState !== 'orb' && this.playerState !== 'hurt') { this.playerState = 'orb'; this.playSound('shoot'); this.shootOrb(); setTimeout(() => { if (this.playerState === 'orb') this.playerState = 'idle' }, 150) } }
  jump() { if (this.playerY >= this.GROUND_Y - 5) { this.playerY = this.GROUND_Y - 20; this.playerState = 'jump'; this.playSound('jump') } }
  block() { if (this.playerState !== 'hurt') this.playerState = 'block' }
  moveLeft() { this.playerDirection = -1; this.playerX = Math.max(50, this.playerX - 10) }
  moveRight() { this.playerDirection = 1; this.playerX = Math.min(350, this.playerX + 10) }
  stopMove() { if (this.playerState === 'walk') this.playerState = 'idle' }
  getScore() { return this.score }
  getLevel() { return this.level }
  isGameOver() { return this.gameState === 'gameover' }
  isWin() { return this.gameState === 'win' }
}
