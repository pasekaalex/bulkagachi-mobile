import * as THREE from 'three'
import { BaseGameEngine, type GameCallbacks } from './shared/BaseGameEngine'
import { AudioManager } from './shared/AudioManager'

interface Brick {
  mesh: THREE.Mesh
  x: number
  y: number
  width: number
  height: number
  health: number
  maxHealth: number
  destroyed: boolean
  type: 'normal' | 'hard' | 'indestructible' | 'powerup'
  color: number
}

interface Ball {
  mesh: THREE.Mesh
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  speed: number
  trail: THREE.Mesh[]
  isFireball?: boolean
}

interface Paddle {
  mesh: THREE.Group
  x: number
  y: number
  width: number
  height: number
}

interface PowerUp {
  mesh: THREE.Mesh
  x: number
  y: number
  vy: number
  type: 'multiball' | 'bigpaddle' | 'slowball' | 'extralife' | 'fireball'
  active: boolean
}

interface Particle {
  mesh: THREE.Mesh
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

interface FloatingText {
  mesh: THREE.Mesh
  x: number
  y: number
  vy: number
  life: number
  maxLife: number
  type: 'combo' | 'points'
}

export class BulkBreakerEngine extends BaseGameEngine {
  private bricks: Brick[] = []
  private balls: Ball[] = []
  private paddle!: Paddle
  private powerUps: PowerUp[] = []
  private particles: Particle[] = []
  private floatingTexts: FloatingText[] = []

  // Game state
  private score = 0
  private level = 1
  private lives = 3
  private gameStarted = false
  private gameOver = false
  private combo = 0
  private comboTimer = 0
  private readonly COMBO_TIMEOUT = 120 // frames

  // Ball trail
  private ballTrails: Map<Ball, { x: number; y: number; alpha: number }[]> = new Map()

  // Dimensions
  private readonly PADDLE_WIDTH = 120
  private readonly PADDLE_HEIGHT = 20
  private readonly BALL_RADIUS = 8
  private readonly BRICK_WIDTH = 60
  private readonly BRICK_HEIGHT = 25
  private readonly GAME_WIDTH = 800
  private readonly GAME_HEIGHT = 600

  // Audio
  private audio = new AudioManager()

  // Camera view dimensions (set in createScene)
  private viewWidth = 400
  private viewHeight = 300

  // Callbacks (extended)
  declare protected callbacks: GameCallbacks & {
    onLevelChange?: (level: number) => void
    onLivesChange?: (lives: number) => void
  }

  constructor(container: HTMLElement, callbacks: GameCallbacks & {
    onLevelChange?: (level: number) => void
    onLivesChange?: (lives: number) => void
  }) {
    super(container, callbacks)
    this.callbacks = callbacks
  }

  createScene(): void {
    // Setup orthographic camera - maintain consistent game view
    // Use fixed game dimensions and add letterboxing if needed
    const aspect = this.container.clientWidth / this.container.clientHeight
    const targetAspect = this.GAME_WIDTH / this.GAME_HEIGHT // 800/600 = 1.333
    
    this.viewWidth = this.GAME_WIDTH / 2  // 400
    this.viewHeight = this.GAME_HEIGHT / 2 // 300
    
    // Adjust to maintain aspect ratio (letterbox if needed)
    if (aspect < targetAspect) {
      // Portrait/mobile - constrain width, keep height
      this.viewWidth = (this.GAME_HEIGHT * aspect) / 2
    } else {
      // Landscape/desktop - constrain height, keep width
      this.viewHeight = (this.GAME_WIDTH / aspect) / 2
    }
    
    this.camera = new THREE.OrthographicCamera(
      -this.viewWidth, this.viewWidth, this.viewHeight, -this.viewHeight, 1, 1000
    )
    this.camera.position.z = 500

    this.setupScene()
    this.createPaddle()
    this.createLevel(1)
    this.setupInput()
  }

  private setupScene(): void {
    // Dark gradient background
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#0a0a15')
    gradient.addColorStop(0.5, '#1a1025')
    gradient.addColorStop(1, '#0d0d18')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 512)

    const bgTexture = new THREE.CanvasTexture(canvas)
    this.scene.background = bgTexture

    // Grid lines for retro effect
    const gridGeo = new THREE.PlaneGeometry(this.GAME_WIDTH * 2, this.GAME_HEIGHT * 2)
    const gridCanvas = document.createElement('canvas')
    gridCanvas.width = 512
    gridCanvas.height = 512
    const gridCtx = gridCanvas.getContext('2d')!
    gridCtx.strokeStyle = 'rgba(155, 77, 202, 0.1)'
    gridCtx.lineWidth = 1
    for (let i = 0; i <= 512; i += 32) {
      gridCtx.beginPath()
      gridCtx.moveTo(i, 0)
      gridCtx.lineTo(i, 512)
      gridCtx.stroke()
      gridCtx.beginPath()
      gridCtx.moveTo(0, i)
      gridCtx.lineTo(512, i)
      gridCtx.stroke()
    }
    const gridTex = new THREE.CanvasTexture(gridCanvas)
    gridTex.wrapS = THREE.RepeatWrapping
    gridTex.wrapT = THREE.RepeatWrapping
    const gridMat = new THREE.MeshBasicMaterial({ 
      map: gridTex, 
      transparent: true, 
      opacity: 0.3 
    })
    const grid = new THREE.Mesh(gridGeo, gridMat)
    grid.position.z = -50
    this.scene.add(grid)
  }

  private createPaddle(): void {
    const group = new THREE.Group()

    // Purple soda cup (Schmeg) paddle
    const cupCanvas = document.createElement('canvas')
    cupCanvas.width = 120
    cupCanvas.height = 60
    const ctx = cupCanvas.getContext('2d')!

    // Cup body - purple with rounded bottom
    ctx.fillStyle = '#9932CC' // Purple
    ctx.beginPath()
    ctx.roundRect(10, 10, 100, 45, 8)
    ctx.fill()

    // Lighter purple highlight
    ctx.fillStyle = '#BA55D3'
    ctx.fillRect(20, 15, 25, 35)

    // White stripe
    ctx.fillStyle = '#FFF'
    ctx.fillRect(55, 15, 8, 35)

    // "S" for Schmeg
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 20px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('S', 85, 32)

    // Straw
    ctx.strokeStyle = '#FF69B4' // Pink straw
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(95, 10)
    ctx.lineTo(100, -5)
    ctx.stroke()

    // Cup rim
    ctx.fillStyle = '#7B1FA2' // Darker purple rim
    ctx.fillRect(8, 8, 104, 6)

    const cupTex = new THREE.CanvasTexture(cupCanvas)
    cupTex.magFilter = THREE.NearestFilter
    const cupGeo = new THREE.PlaneGeometry(this.PADDLE_WIDTH, this.PADDLE_HEIGHT * 3)
    const cupMat = new THREE.MeshBasicMaterial({ map: cupTex, transparent: true })
    const cup = new THREE.Mesh(cupGeo, cupMat)
    group.add(cup)

    // Purple glow effect
    const glowGeo = new THREE.PlaneGeometry(this.PADDLE_WIDTH + 20, this.PADDLE_HEIGHT * 3 + 20)
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: 0x9932CC, 
      transparent: true, 
      opacity: 0.3 
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.z = -5
    group.add(glow)

    // Position paddle near bottom of visible area
    const paddleY = -this.viewHeight + 80
    group.position.set(0, paddleY, 0)
    this.scene.add(group)

    this.paddle = {
      mesh: group,
      x: 0,
      y: paddleY,
      width: this.PADDLE_WIDTH,
      height: this.PADDLE_HEIGHT,
    }
  }

  private createBall(x: number, y: number, vx: number, vy: number, isFireball = false): Ball {
    const ballSize = isFireball ? 42 : 36 // Bigger ball for Bulk
    
    // Create ball with pixelbulk texture (or fireball texture)
    let mat: THREE.MeshBasicMaterial
    
    if (isFireball) {
      mat = new THREE.MeshBasicMaterial({ 
        color: 0xff4400,
        transparent: true,
      })
    } else {
      const loader = new THREE.TextureLoader()
      const texture = loader.load('/images/pixelbulk.png')
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
      mat = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true,
        alphaTest: 0.1,
      })
    }

    const geo = new THREE.PlaneGeometry(ballSize, ballSize)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, 5)
    this.scene.add(mesh)

    const ball: Ball = {
      mesh,
      x, y,
      vx: isFireball ? vx * 1.3 : vx,
      vy: isFireball ? vy * 1.3 : vy,
      radius: ballSize / 2,
      speed: Math.sqrt(vx * vx + vy * vy) * (isFireball ? 1.3 : 1),
      trail: [],
      isFireball,
    }

    this.ballTrails.set(ball, [])
    return ball
  }

  private updateBallTrail(ball: Ball): void {
    const trail = this.ballTrails.get(ball)
    if (!trail) return

    // Add current position to trail
    trail.unshift({ x: ball.x, y: ball.y, alpha: 0.6 })

    // Limit trail length
    if (trail.length > 8) {
      trail.pop()
    }

    // Fade trail
    for (let i = 0; i < trail.length; i++) {
      trail[i].alpha = 0.6 * (1 - i / trail.length)
    }
  }

  private drawBallTrails(): void {
    // Remove old trail meshes
    this.balls.forEach(ball => {
      ball.trail.forEach(t => this.scene.remove(t))
      ball.trail = []
    })

    // Draw new trails
    this.balls.forEach(ball => {
      const trail = this.ballTrails.get(ball)
      if (!trail) return

      trail.forEach((point, i) => {
        if (i === 0) return // Skip first (current position)
        
        const size = 36 - i * 3
        const geo = new THREE.PlaneGeometry(size, size)
        const mat = new THREE.MeshBasicMaterial({
          color: 0x4ade80,
          transparent: true,
          opacity: point.alpha * 0.5,
        })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(point.x, point.y, 4 - i * 0.5)
        this.scene.add(mesh)
        ball.trail.push(mesh)
      })
    })
  }

  private createBrick(x: number, y: number, type: Brick['type'] = 'normal'): Brick {
    const colors: Record<Brick['type'], { main: string; highlight: string; icon?: string }> = {
      normal: { main: '#ff4444', highlight: '#ff6666' },
      hard: { main: '#8844ff', highlight: '#aa66ff' },
      indestructible: { main: '#444444', highlight: '#666666' },
      powerup: { main: '#ffd700', highlight: '#ffee44', icon: 'S' },
    }

    const health = type === 'hard' ? 2 : type === 'indestructible' ? 999 : 1

    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 32
    const ctx = canvas.getContext('2d')!

    const color = colors[type]

    // Main brick body
    ctx.fillStyle = color.main
    ctx.fillRect(0, 0, 64, 32)
    
    // Inner highlight (bevel effect)
    ctx.fillStyle = color.highlight
    ctx.fillRect(2, 2, 60, 12)
    ctx.fillStyle = color.main
    ctx.fillRect(2, 14, 60, 16)

    // Border
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, 64, 32)

    // Cracks for hard bricks
    if (type === 'hard') {
      ctx.strokeStyle = '#4422aa'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(10, 8)
      ctx.lineTo(20, 16)
      ctx.lineTo(15, 24)
      ctx.moveTo(50, 6)
      ctx.lineTo(45, 14)
      ctx.stroke()
    }

    // Metal texture for indestructible
    if (type === 'indestructible') {
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      for (let i = 0; i < 64; i += 8) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, 32)
        ctx.stroke()
      }
      // Bolts in corners
      ctx.fillStyle = '#888'
      ctx.beginPath()
      ctx.arc(6, 6, 3, 0, Math.PI * 2)
      ctx.arc(58, 6, 3, 0, Math.PI * 2)
      ctx.arc(6, 26, 3, 0, Math.PI * 2)
      ctx.arc(58, 26, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Powerup icon - Schmeg S
    if (type === 'powerup' && color.icon) {
      ctx.fillStyle = '#9932CC'
      ctx.font = 'bold 16px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(color.icon, 32, 16)
      // Glow effect
      ctx.shadowColor = '#9932CC'
      ctx.shadowBlur = 10
      ctx.fillText(color.icon, 32, 16)
      ctx.shadowBlur = 0
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.magFilter = THREE.NearestFilter
    const geo = new THREE.PlaneGeometry(this.BRICK_WIDTH, this.BRICK_HEIGHT)
    const mat = new THREE.MeshBasicMaterial({ map: tex })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, 0)
    this.scene.add(mesh)

    return {
      mesh, x, y,
      width: this.BRICK_WIDTH,
      height: this.BRICK_HEIGHT,
      health, maxHealth: health,
      destroyed: false,
      type,
      color: parseInt(color.main.replace('#', ''), 16),
    }
  }

  private createLevel(levelNum: number): void {
    // Clear existing bricks
    this.bricks.forEach(b => this.scene.remove(b.mesh))
    this.bricks = []

    const rows = Math.min(4 + Math.floor(levelNum / 2), 8)
    const cols = 10
    const startX = -((cols - 1) * this.BRICK_WIDTH) / 2
    const startY = 150

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * (this.BRICK_WIDTH + 5)
        const y = startY - row * (this.BRICK_HEIGHT + 8)

        let type: Brick['type'] = 'normal'
        
        // Level patterns
        if (levelNum === 1) {
          if (row >= 2) type = 'hard'
        } else if (levelNum === 2) {
          if (col === 0 || col === cols - 1) type = 'indestructible'
          if (row === 0 && col > 2 && col < cols - 3) type = 'powerup'
        } else if (levelNum >= 3) {
          if ((row + col) % 3 === 0) type = 'hard'
          if (Math.random() < 0.1) type = 'powerup'
        }

        this.bricks.push(this.createBrick(x, y, type))
      }
    }
  }

  private spawnPowerUp(x: number, y: number): void {
    const types: PowerUp['type'][] = ['multiball', 'bigpaddle', 'slowball', 'extralife', 'fireball']
    const type = types[Math.floor(Math.random() * types.length)]

    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!

    const colors = {
      multiball: '#ff6600',
      bigpaddle: '#00ff66',
      slowball: '#00ccff',
      extralife: '#ff0066',
      fireball: '#ff3300',
    }

    // Glow effect
    ctx.shadowColor = colors[type]
    ctx.shadowBlur = 15
    ctx.fillStyle = colors[type]
    ctx.beginPath()
    ctx.arc(16, 16, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const icons = { multiball: '●', bigpaddle: '═', slowball: '○', extralife: '♥', fireball: '🔥' }
    ctx.fillText(icons[type], 16, 16)

    const tex = new THREE.CanvasTexture(canvas)
    const geo = new THREE.PlaneGeometry(28, 28)
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, 10)
    this.scene.add(mesh)

    this.powerUps.push({
      mesh, x, y,
      vy: -3,
      type,
      active: true,
    })
  }

  private createFloatingText(x: number, y: number, text: string, type: 'combo' | 'points' = 'points'): void {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 60
    const ctx = canvas.getContext('2d')!

    ctx.font = 'bold 32px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    if (type === 'combo') {
      // Yellow/orange gradient for combos
      ctx.fillStyle = '#FFD700'
      ctx.shadowColor = '#FF6B00'
      ctx.shadowBlur = 10
      ctx.fillText(text, 100, 30)
    } else {
      // White with shadow for points
      ctx.fillStyle = '#FFFFFF'
      ctx.shadowColor = '#000000'
      ctx.shadowBlur = 4
      ctx.fillText(text, 100, 30)
    }
    ctx.shadowBlur = 0

    const tex = new THREE.CanvasTexture(canvas)
    const geo = new THREE.PlaneGeometry(100, 30)
    const mat = new THREE.MeshBasicMaterial({ 
      map: tex, 
      transparent: true,
      opacity: 1 
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, 20)
    this.scene.add(mesh)

    this.floatingTexts.push({
      mesh, x, y,
      vy: 2,
      life: 60,
      maxLife: 60,
      type,
    })
  }

  private createParticles(x: number, y: number, color: number, count = 8): void {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.PlaneGeometry(4, 4)
      const mat = new THREE.MeshBasicMaterial({ color })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, 5)
      this.scene.add(mesh)

      const angle = (Math.PI * 2 * i) / count
      const speed = 3 + Math.random() * 4

      this.particles.push({
        mesh, x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        maxLife: 30,
      })
    }
  }

  private setupInput(): void {
    const canvas = this.renderer.domElement
    
    const handleMove = (clientX: number) => {
      if (!this.gameStarted || this.gameOver) return
      const rect = canvas.getBoundingClientRect()
      // Map touch position to camera view coordinates
      const x = ((clientX - rect.left) / rect.width) * 2 - 1
      this.paddle.x = x * this.viewWidth
      // Clamp to game bounds (slightly less than full width to keep paddle on screen)
      this.paddle.x = Math.max(-this.viewWidth + this.PADDLE_WIDTH/2, Math.min(this.viewWidth - this.PADDLE_WIDTH/2, this.paddle.x))
      this.paddle.mesh.position.x = this.paddle.x
    }

    // Mouse
    canvas.addEventListener('mousemove', (e) => handleMove(e.clientX))
    
    // Touch - prevent default to avoid scrolling
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      if (e.touches[0]) handleMove(e.touches[0].clientX)
    }, { passive: false })

    // Launch ball on click/tap
    const launch = (e: Event) => {
      e.preventDefault()
      if (!this.gameStarted || this.gameOver) return
      this.balls.forEach(ball => {
        if (Math.abs(ball.vy) < 0.1) {
          ball.vy = 8
          ball.vx = (Math.random() - 0.5) * 4
        }
      })
    }
    
    canvas.addEventListener('click', launch)
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      launch(e)
    }, { passive: false })
  }

  start(): void {
    this.gameStarted = true
    this.gameOver = false
    this.score = 0
    this.level = 1
    this.lives = 3
    this.callbacks.onScoreChange?.(0)
    this.callbacks.onLevelChange?.(1)
    this.callbacks.onLivesChange?.(3)
    this.callbacks.onStateChange?.('playing')

    // Create initial ball above paddle
    const ballStartY = this.paddle.y + 50
    this.balls.push(this.createBall(0, ballStartY, 0, 0))
  }

  stop(): void {
    this.gameOver = true
    this.callbacks.onStateChange?.('gameover')
  }

  restart(): void {
    // Clear everything
    this.balls.forEach(b => this.scene.remove(b.mesh))
    this.balls = []
    this.powerUps.forEach(p => this.scene.remove(p.mesh))
    this.powerUps = []
    this.particles.forEach(p => this.scene.remove(p.mesh))
    this.particles = []
    this.floatingTexts.forEach(ft => this.scene.remove(ft.mesh))
    this.floatingTexts = []

    this.createLevel(1)
    this.start()
  }

  private screenShake = 0
  private readonly MAX_SHAKE = 10

  private applyScreenShake(): void {
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake
      const shakeY = (Math.random() - 0.5) * this.screenShake
      this.camera.position.x = shakeX
      this.camera.position.y = shakeY
      this.screenShake *= 0.9 // Decay
      if (this.screenShake < 0.5) {
        this.screenShake = 0
        this.camera.position.x = 0
        this.camera.position.y = 0
      }
    }
  }

  update(): void {
    if (!this.gameStarted || this.gameOver) return

    // Update combo timer
    if (this.combo > 0) {
      this.comboTimer--
      if (this.comboTimer <= 0) {
        this.combo = 0
      }
    }

    // Apply screen shake
    this.applyScreenShake()

    // Update ball trails
    this.balls.forEach(ball => this.updateBallTrail(ball))
    this.drawBallTrails()

    // Update balls
    let bricksDestroyedThisFrame = 0
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i]
      
      // Move ball
      ball.x += ball.vx
      ball.y += ball.vy
      ball.mesh.position.set(ball.x, ball.y, 5)

      // Wall collisions - use view dimensions so ball bounces off screen edges
      if (ball.x <= -this.viewWidth + ball.radius || ball.x >= this.viewWidth - ball.radius) {
        ball.vx *= -1
        ball.x = Math.max(-this.viewWidth + ball.radius, Math.min(this.viewWidth - ball.radius, ball.x))
        this.audio.synthTone(400, 0.05, 'square', 0.2)
      }
      // Ceiling collision
      if (ball.y >= this.viewHeight - ball.radius) {
        ball.vy *= -1
        ball.y = this.viewHeight - ball.radius
        this.audio.synthTone(400, 0.05, 'square', 0.2)
      }

      // Ball lost (fell below paddle)
      if (ball.y < -this.viewHeight) {
        this.scene.remove(ball.mesh)
        this.balls.splice(i, 1)
        this.combo = 0 // Reset combo on ball loss
        continue
      }

      // Paddle collision
      if (ball.y - ball.radius <= this.paddle.y + this.paddle.height / 2 &&
          ball.y + ball.radius >= this.paddle.y - this.paddle.height / 2 &&
          ball.x >= this.paddle.x - this.paddle.width / 2 &&
          ball.x <= this.paddle.x + this.paddle.width / 2 &&
          ball.vy < 0) {
        
        // Angle based on hit position
        const hitPos = (ball.x - this.paddle.x) / (this.paddle.width / 2)
        ball.vx = hitPos * 8
        ball.vy = Math.abs(ball.vy)
        ball.speed = Math.min(ball.speed * 1.02, 15) // Cap speed
        
        this.audio.synthTone(300, 0.08, 'square', 0.3)
      }

      // Brick collisions
      for (const brick of this.bricks) {
        if (brick.destroyed) continue

        if (ball.x + ball.radius > brick.x - brick.width / 2 &&
            ball.x - ball.radius < brick.x + brick.width / 2 &&
            ball.y + ball.radius > brick.y - brick.height / 2 &&
            ball.y - ball.radius < brick.y + brick.height / 2) {
          
          // Fireball destroys any brick instantly including indestructible
          if (ball.isFireball) {
            brick.destroyed = true
            this.scene.remove(brick.mesh)
            
            // Combo system
            this.combo++
            this.comboTimer = this.COMBO_TIMEOUT
            const comboBonus = Math.min(this.combo * 5, 50)
            const basePoints = brick.type === 'hard' ? 20 : brick.type === 'powerup' ? 50 : brick.type === 'indestructible' ? 30 : 10
            this.score += basePoints + comboBonus
            
            this.callbacks.onScoreChange?.(this.score)
            // Fire particles
            this.createParticles(brick.x, brick.y, 0xff4400)

            this.screenShake = Math.min(this.combo * 2, this.MAX_SHAKE)

            if (brick.type === 'powerup') {
              this.spawnPowerUp(brick.x, brick.y)
            }

            this.audio.synthTone(800, 0.15, 'sawtooth', 0.3)
            bricksDestroyedThisFrame++

            // Show combo text
            if (this.combo > 1) {
              this.createFloatingText(brick.x, brick.y - 30, `${this.combo}x COMBO!`, 'combo')
            }
          } else if (brick.type !== 'indestructible') {
            brick.health--
            if (brick.health <= 0) {
              brick.destroyed = true
              this.scene.remove(brick.mesh)
              
              // Combo system
              this.combo++
              this.comboTimer = this.COMBO_TIMEOUT
              const comboBonus = Math.min(this.combo * 5, 50) // Cap combo bonus
              const basePoints = brick.type === 'hard' ? 20 : brick.type === 'powerup' ? 50 : 10
              this.score += basePoints + comboBonus
              
              this.callbacks.onScoreChange?.(this.score)
              this.createParticles(brick.x, brick.y, brick.color)

              // Screen shake on brick destroy
              this.screenShake = Math.min(this.combo * 2, this.MAX_SHAKE)

              if (brick.type === 'powerup') {
                this.spawnPowerUp(brick.x, brick.y)
              }

              this.audio.synthTone(600 + Math.min(this.combo * 50, 400), 0.1, 'square', 0.25)
              bricksDestroyedThisFrame++

              // Show combo text
              if (this.combo > 1) {
                this.createFloatingText(brick.x, brick.y - 30, `${this.combo}x COMBO!`, 'combo')
              }
            } else {
              // Damaged but not destroyed
              this.audio.synthTone(500, 0.05, 'square', 0.2)
            }
          }

          // Bounce
          ball.vy *= -1
          break
        }
      }
    }

    // Check for life lost
    if (this.balls.length === 0) {
      this.lives--
      this.callbacks.onLivesChange?.(this.lives)
      
      if (this.lives <= 0) {
        this.gameOver = true
        this.callbacks.onStateChange?.('gameover')
      } else {
        // New ball above paddle
        this.balls.push(this.createBall(this.paddle.x, this.paddle.y + 50, 0, 0))
      }
    }

    // Check level complete
    const breakableBricks = this.bricks.filter(b => !b.destroyed && b.type !== 'indestructible')
    if (breakableBricks.length === 0) {
      this.level++
      this.callbacks.onLevelChange?.(this.level)
      this.createLevel(this.level)
      this.balls.forEach(b => this.scene.remove(b.mesh))
      this.balls = []
      this.balls.push(this.createBall(0, this.paddle.y + 50, 0, 0))
      this.score += 100 // Level bonus
      this.callbacks.onScoreChange?.(this.score)
    }

    // Update powerups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i]
      pu.y += pu.vy
      pu.mesh.position.y = pu.y

      // Collect check
      if (pu.y <= this.paddle.y + this.paddle.height / 2 &&
          pu.y >= this.paddle.y - this.paddle.height / 2 &&
          pu.x >= this.paddle.x - this.paddle.width / 2 &&
          pu.x <= this.paddle.x + this.paddle.width / 2) {
        
        this.applyPowerUp(pu.type)
        this.scene.remove(pu.mesh)
        this.powerUps.splice(i, 1)
        this.audio.synthSweep(400, 800, 0.2, 'square', 0.4)
        continue
      }

      // Missed
      if (pu.y < -this.GAME_HEIGHT / 2) {
        this.scene.remove(pu.mesh)
        this.powerUps.splice(i, 1)
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy -= 0.2 // Gravity
      p.life--
      p.mesh.position.set(p.x, p.y, 5)
      p.mesh.rotation.z += 0.1
      
      const alpha = p.life / p.maxLife
      ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha

      if (p.life <= 0) {
        this.scene.remove(p.mesh)
        this.particles.splice(i, 1)
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]
      ft.y += ft.vy
      ft.life--
      ft.mesh.position.y = ft.y
      
      const alpha = ft.life / ft.maxLife
      ;(ft.mesh.material as THREE.MeshBasicMaterial).opacity = alpha

      if (ft.life <= 0) {
        this.scene.remove(ft.mesh)
        this.floatingTexts.splice(i, 1)
      }
    }
  }

  private applyPowerUp(type: PowerUp['type']): void {
    switch (type) {
      case 'multiball':
        const newBalls: Ball[] = []
        this.balls.forEach(ball => {
          newBalls.push(this.createBall(ball.x, ball.y, ball.vx * 0.8, ball.vy))
          newBalls.push(this.createBall(ball.x, ball.y, -ball.vx * 0.8, ball.vy))
        })
        this.balls.push(...newBalls)
        break
      case 'bigpaddle':
        this.paddle.width = 180
        const scale = this.paddle.mesh.scale
        scale.set(1.5, 1, 1)
        setTimeout(() => {
          this.paddle.width = this.PADDLE_WIDTH
          scale.set(1, 1, 1)
        }, 10000)
        break
      case 'slowball':
        this.balls.forEach(b => {
          b.vx *= 0.6
          b.vy *= 0.6
        })
        break
      case 'extralife':
        this.lives = Math.min(this.lives + 1, 5)
        this.callbacks.onLivesChange?.(this.lives)
        break
      case 'fireball':
        // Convert all balls to fireballs - destroy bricks instantly
        this.balls.forEach(ball => {
          ball.isFireball = true
          // Change ball appearance to fire
          ;(ball.mesh.material as THREE.MeshBasicMaterial).color.setHex(0xff4400)
        })
        setTimeout(() => {
          this.balls.forEach(ball => {
            ball.isFireball = false
            // Revert ball appearance
            const loader = new THREE.TextureLoader()
            const texture = loader.load('/images/pixelbulk.png')
            texture.magFilter = THREE.NearestFilter
            texture.minFilter = THREE.NearestFilter
            ;(ball.mesh.material as THREE.MeshBasicMaterial).map = texture
            ;(ball.mesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff)
          })
        }, 8000)
        break
    }
  }

  dispose(): void {
    super.dispose()
    this.bricks.forEach(b => this.scene.remove(b.mesh))
    this.balls.forEach(b => this.scene.remove(b.mesh))
    this.powerUps.forEach(p => this.scene.remove(p.mesh))
    this.particles.forEach(p => this.scene.remove(p.mesh))
    this.floatingTexts.forEach(ft => this.scene.remove(ft.mesh))
  }
}
