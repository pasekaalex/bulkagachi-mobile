import * as THREE from 'three'
import { BaseGameEngine, type GameCallbacks } from './shared/BaseGameEngine'
import { AudioManager } from './shared/AudioManager'

interface Platform {
  mesh: THREE.Mesh
  x: number
  y: number
  width: number
  height: number
  type: 'normal' | 'moving' | 'crumbling' | 'bounce'
  originalY: number
  vx?: number
}

interface Collectible {
  mesh: THREE.Mesh
  x: number
  y: number
  collected: boolean
  type: 'coin' | 'gem'
}

interface Hazard {
  mesh: THREE.Mesh
  x: number
  y: number
  vx: number
  vy: number
  type: 'spike' | 'bird' | 'drone'
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

export class BulkClimbEngine extends BaseGameEngine {
  // Player state
  private bulk: THREE.Group | null = null
  private bulkX = 0
  private bulkY = 0
  private velocityX = 0
  private velocityY = 0
  private facingRight = true
  private isGrounded = false
  private jumpCount = 0
  private maxJumps = 2
  private gameStarted = false
  private gameOver = false
  private score = 0
  private height = 0
  private highestY = 0
  private cameraY = 0

  // Physics constants
  private readonly GRAVITY = -0.5
  private readonly JUMP_STRENGTH = 14
  private readonly MOVE_SPEED = 8
  private readonly AIR_CONTROL = 0.3
  private readonly FRICTION = 0.88

  // World
  private platforms: Platform[] = []
  private collectibles: Collectible[] = []
  private hazards: Hazard[] = []
  private particles: Particle[] = []
  private lastPlatformY = 0

  // Input
  private keys = { left: false, right: false, jump: false }
  private wasJumpPressed = false
  private touchStartX = 0

  // Audio
  private audio = new AudioManager()

  // Sprite textures
  private idleTexture: THREE.Texture | null = null
  private runTexture: THREE.Texture | null = null
  private jumpTexture: THREE.Texture | null = null

  // Mobile touch controls
  private touchControls: {
    joystick?: {
      container: HTMLDivElement
      stick: HTMLDivElement
      active: boolean
      centerX: number
      centerY: number
      touchId: number | null
    }
    jumpBtn?: HTMLButtonElement
    overlay?: HTMLDivElement
  } = {}
  private isMobile = false

  // Bound handlers
  private boundKeyDown: (e: KeyboardEvent) => void
  private boundKeyUp: (e: KeyboardEvent) => void
  private boundTouchStart: (e: TouchEvent) => void
  private boundTouchMove: (e: TouchEvent) => void
  private boundTouchEnd: (e: TouchEvent) => void

  constructor(container: HTMLElement, callbacks: GameCallbacks) {
    super(container, callbacks)
    this.boundKeyDown = this.handleKeyDown.bind(this)
    this.boundKeyUp = this.handleKeyUp.bind(this)
    this.boundTouchStart = this.handleTouchStart.bind(this)
    this.boundTouchMove = this.handleTouchMove.bind(this)
    this.boundTouchEnd = this.handleTouchEnd.bind(this)
  }

  createScene(): void {
    this.setupBackground()
    this.loadSprite()
    this.setupControls()
    this.audio.loadBGM('/audio/bgm.mp3', 0.3)
  }

  private setupBackground(): void {
    // Sky gradient - sunset vibes
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#1a0a2e')
    gradient.addColorStop(0.3, '#16213e')
    gradient.addColorStop(0.6, '#0f3460')
    gradient.addColorStop(1, '#e94560')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 512)

    const bgTexture = new THREE.CanvasTexture(canvas)
    this.scene.background = bgTexture

    // Orthographic camera
    const aspect = this.container.clientWidth / this.container.clientHeight
    const viewSize = 400
    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      1,
      2000,
    )
    this.camera.position.z = 500

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7)
    this.scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xffd700, 0.8)
    sun.position.set(100, 500, 200)
    this.scene.add(sun)
  }

  private loadSprite(): void {
    const loader = new THREE.TextureLoader()
    let loadedCount = 0
    const totalSprites = 3
    const onLoad = () => {
      loadedCount++
      if (loadedCount >= totalSprites && !this.bulk) {
        this.createPlayer()
        this.generateInitialPlatforms()
      }
    }
    
    // Load idle sprite
    loader.load(
      '/images/pixelbulk.png',
      (texture) => {
        texture.magFilter = THREE.NearestFilter
        texture.minFilter = THREE.NearestFilter
        this.idleTexture = texture
        onLoad()
      },
      undefined,
      () => {
        console.warn('Failed to load pixelbulk.png')
        onLoad()
      }
    )
    
    // Load run sprite
    loader.load(
      '/images/pixelbulk-run.png',
      (texture) => {
        texture.magFilter = THREE.NearestFilter
        texture.minFilter = THREE.NearestFilter
        this.runTexture = texture
        onLoad()
      },
      undefined,
      () => {
        console.warn('Failed to load pixelbulk-run.png')
        onLoad()
      }
    )
    
    // Load jump sprite
    loader.load(
      '/images/pixelbulk-jump.png',
      (texture) => {
        texture.magFilter = THREE.NearestFilter
        texture.minFilter = THREE.NearestFilter
        this.jumpTexture = texture
        onLoad()
      },
      undefined,
      () => {
        console.warn('Failed to load pixelbulk-jump.png')
        onLoad()
      }
    )
  }

  private createPlayer(): void {
    const group = new THREE.Group()

    // Create sprite with idle texture - 60x60 (20% smaller than 75)
    const geometry = new THREE.PlaneGeometry(60, 60)
    const material = new THREE.MeshBasicMaterial({
      map: this.idleTexture,
      transparent: true,
      alphaTest: 0.1,
    })
    const sprite = new THREE.Mesh(geometry, material)
    sprite.name = 'sprite'
    group.add(sprite)

    // Shadow - sized to match player
    const shadowGeo = new THREE.CircleGeometry(24, 16)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    })
    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -30
    shadow.position.z = -5
    shadow.name = 'shadow'
    group.add(shadow)

    // Don't add to scene yet - wait for start()
    this.bulk = group
  }

  private createPlayerFallback(): void {
    // Fallback: green box character
    const group = new THREE.Group()

    const geometry = new THREE.BoxGeometry(40, 50, 10)
    const material = new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = 'sprite'
    group.add(mesh)

    // Eyes
    const eyeGeo = new THREE.PlaneGeometry(8, 8)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
    leftEye.position.set(-10, 10, 6)
    group.add(leftEye)
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
    rightEye.position.set(10, 10, 6)
    group.add(rightEye)

    // Shadow
    const shadowGeo = new THREE.CircleGeometry(20, 16)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    })
    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -25
    shadow.position.z = -5
    shadow.name = 'shadow'
    group.add(shadow)

    this.bulk = group
  }

  private generateInitialPlatforms(): void {
    // Starting platform at y=0 with player standing on it
    // Platform height is 30, so top is at y=15
    // Player half-height is 37.5 (75px tall), so player center should be at platformTop + 37.5
    this.createPlatform(0, 0, 180, 'normal')
    this.lastPlatformY = 0

    // Generate initial set going upward
    for (let i = 0; i < 12; i++) {
      this.spawnPlatformAbove()
    }
  }

  private createPlatform(x: number, y: number, width: number, type: Platform['type']): Platform {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 32
    const ctx = canvas.getContext('2d')!

    const colors = {
      normal: { main: '#4a5568', highlight: '#718096' },
      moving: { main: '#553c9a', highlight: '#805ad5' },
      crumbling: { main: '#744210', highlight: '#d69e2e' },
      bounce: { main: '#276749', highlight: '#48bb78' },
    }

    const color = colors[type]

    // Platform body
    ctx.fillStyle = color.main
    ctx.fillRect(0, 0, 128, 32)
    ctx.fillStyle = color.highlight
    ctx.fillRect(0, 0, 128, 8)

    // Border
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, 128, 32)

    // Type indicator
    if (type === 'moving') {
      ctx.fillStyle = '#fff'
      ctx.fillRect(56, 12, 16, 8)
    } else if (type === 'bounce') {
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.moveTo(64, 10)
      ctx.lineTo(70, 20)
      ctx.lineTo(58, 20)
      ctx.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.NearestFilter

    const geometry = new THREE.PlaneGeometry(width, 30)
    const material = new THREE.MeshBasicMaterial({ map: texture })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, 0)
    this.scene.add(mesh)

    return {
      mesh, x, y,
      width, height: 30,
      type, originalY: y,
      vx: type === 'moving' ? (Math.random() > 0.5 ? 2.5 : -2.5) : 0,
    }
  }

  private spawnPlatformAbove(): void {
    const minGap = 70
    const maxGap = 130
    const gap = minGap + Math.random() * (maxGap - minGap)
    const y = this.lastPlatformY + gap

    // Determine platform type - more moving platforms!
    let type: Platform['type'] = 'normal'
    const rand = Math.random()

    if (this.height > 300 && rand < 0.12) {
      type = 'bounce'
    } else if (this.height > 100 && rand < 0.35) {
      // 35% chance for moving platforms after 100m
      type = 'moving'
    } else if (this.height > 500 && rand < 0.08) {
      type = 'crumbling'
    }

    // Platform width first so we can constrain X properly
    const width = 80 + Math.random() * 60 // 80-140px width
    const halfWidth = width / 2
    
    // Screen bounds - keep platform fully on screen
    // View width is around 320-400 depending on aspect ratio
    const screenBound = 300
    const minX = -screenBound + halfWidth
    const maxX = screenBound - halfWidth
    
    let x = minX + Math.random() * (maxX - minX)

    // Ensure reachable from previous platform
    const prevPlatform = this.platforms[this.platforms.length - 1]
    if (prevPlatform) {
      const maxReach = 160 // Max horizontal distance player can reach
      const dist = Math.abs(x - prevPlatform.x)
      if (dist > maxReach) {
        x = prevPlatform.x + (x > prevPlatform.x ? 1 : -1) * maxReach * 0.7
      }
      // Clamp to screen bounds after reach adjustment
      x = Math.max(minX, Math.min(maxX, x))
    }

    // For moving platforms, constrain further so they don't move off screen
    if (type === 'moving') {
      const movementRoom = 100 // How much they can move each direction
      x = Math.max(minX + movementRoom, Math.min(maxX - movementRoom, x))
    }

    const platform = this.createPlatform(x, y, width, type)
    this.platforms.push(platform)
    this.lastPlatformY = y

    // Chance to spawn collectible
    if (Math.random() < 0.25) {
      this.spawnCollectible(x, y + 35)
    }

    // Chance to spawn hazard at higher heights
    if (this.height > 150 && Math.random() < 0.15) {
      this.spawnHazard(x + (Math.random() - 0.5) * 100, y + 60)
    }
  }

  private spawnCollectible(x: number, y: number): void {
    // Create purple schmeg soda cup
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 40
    const ctx = canvas.getContext('2d')!
    
    // Cup body - purple
    ctx.fillStyle = '#9932CC'
    ctx.beginPath()
    ctx.roundRect(4, 10, 24, 25, 4)
    ctx.fill()
    
    // Lighter highlight
    ctx.fillStyle = '#BA55D3'
    ctx.fillRect(8, 14, 8, 18)
    
    // White stripe
    ctx.fillStyle = '#FFF'
    ctx.fillRect(18, 14, 4, 18)
    
    // "S" logo
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('S', 22, 26)
    
    // Pink straw
    ctx.strokeStyle = '#FF69B4'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(22, 10)
    ctx.lineTo(26, 2)
    ctx.stroke()
    
    // Cup rim
    ctx.fillStyle = '#7B1FA2'
    ctx.fillRect(2, 8, 28, 5)

    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.NearestFilter
    
    const geometry = new THREE.PlaneGeometry(30, 37)
    const material = new THREE.MeshBasicMaterial({ 
      map: texture, 
      transparent: true,
      alphaTest: 0.1,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, 5)
    this.scene.add(mesh)

    this.collectibles.push({
      mesh, x, y,
      collected: false,
      type: 'coin',
    })
  }

  private spawnHazard(x: number, y: number): void {
    const geometry = new THREE.PlaneGeometry(36, 36)
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    
    // Dark metal base
    ctx.fillStyle = '#331111'
    ctx.beginPath()
    ctx.arc(32, 32, 26, 0, Math.PI * 2)
    ctx.fill()
    
    // Spikes around the edge
    ctx.fillStyle = '#cc0000'
    const spikeCount = 12
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2
      const x1 = 32 + Math.cos(angle) * 18
      const y1 = 32 + Math.sin(angle) * 18
      const x2 = 32 + Math.cos(angle - 0.2) * 30
      const y2 = 32 + Math.sin(angle - 0.2) * 30
      const x3 = 32 + Math.cos(angle + 0.2) * 30
      const y3 = 32 + Math.sin(angle + 0.2) * 30
      
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.lineTo(x3, y3)
      ctx.fill()
    }
    
    // Inner circle (darker)
    ctx.fillStyle = '#441111'
    ctx.beginPath()
    ctx.arc(32, 32, 18, 0, Math.PI * 2)
    ctx.fill()
    
    // Angry eyes
    ctx.fillStyle = '#ff0000'
    // Left eye
    ctx.beginPath()
    ctx.moveTo(22, 26)
    ctx.lineTo(28, 30)
    ctx.lineTo(22, 32)
    ctx.fill()
    // Right eye
    ctx.beginPath()
    ctx.moveTo(42, 26)
    ctx.lineTo(36, 30)
    ctx.lineTo(42, 32)
    ctx.fill()
    
    // Angry eyebrows
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(18, 24)
    ctx.lineTo(28, 28)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(46, 24)
    ctx.lineTo(36, 28)
    ctx.stroke()
    
    // Sharp teeth/jaw
    ctx.fillStyle = '#ff4444'
    for (let i = 0; i < 5; i++) {
      const tx = 24 + i * 4
      ctx.beginPath()
      ctx.moveTo(tx, 38)
      ctx.lineTo(tx + 2, 44)
      ctx.lineTo(tx + 4, 38)
      ctx.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.MeshBasicMaterial({ 
      map: texture, 
      transparent: true,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, 5)
    this.scene.add(mesh)

    this.hazards.push({
      mesh, x, y,
      vx: (Math.random() - 0.5) * 3,
      vy: 0,
      type: 'spike',
    })
  }

  private setupControls(): void {
    window.addEventListener('keydown', this.boundKeyDown)
    window.addEventListener('keyup', this.boundKeyUp)
    
    const canvas = this.renderer.domElement
    // Use capture phase and add to both canvas and document for mobile reliability
    canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false, capture: true })
    canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false, capture: true })
    canvas.addEventListener('touchend', this.boundTouchEnd, { passive: false, capture: true })
    canvas.addEventListener('touchcancel', this.boundTouchEnd, { passive: false, capture: true })

    // Detect mobile and create touch buttons
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (this.isMobile) {
      this.createTouchControls()
    }
  }

  private createTouchControls(): void {
    // Create overlay container
    const overlay = document.createElement('div')
    overlay.id = 'climb-touch-controls'
    overlay.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 180px;
      pointer-events: none;
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 20px;
      box-sizing: border-box;
    `

    // Create joystick
    const joystickContainer = document.createElement('div')
    joystickContainer.style.cssText = `
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: rgba(155, 77, 202, 0.3);
      border: 3px solid rgba(255,255,255,0.3);
      position: relative;
      pointer-events: auto;
      touch-action: none;
    `

    const joystickStick = document.createElement('div')
    joystickStick.style.cssText = `
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(155, 77, 202, 0.7);
      border: 2px solid rgba(255,255,255,0.5);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `
    joystickContainer.appendChild(joystickStick)

    // Jump button (bottom right)
    const jumpBtn = document.createElement('button')
    jumpBtn.style.cssText = `
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.3);
      background: rgba(255, 215, 0, 0.5);
      color: white;
      font-size: 32px;
      font-weight: bold;
      pointer-events: auto;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      transition: transform 0.1s, opacity 0.1s;
      opacity: 0.8;
    `
    jumpBtn.innerHTML = '⬆'

    overlay.appendChild(joystickContainer)
    overlay.appendChild(jumpBtn)
    document.body.appendChild(overlay)

    this.touchControls = { 
      joystick: {
        container: joystickContainer,
        stick: joystickStick,
        active: false,
        centerX: 0,
        centerY: 0,
        touchId: null
      },
      jumpBtn, 
      overlay 
    }

    // Joystick handlers
    const joystick = this.touchControls.joystick!
    
    const handleJoystickStart = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.changedTouches[0]
      const rect = joystick.container.getBoundingClientRect()
      joystick.centerX = rect.left + rect.width / 2
      joystick.centerY = rect.top + rect.height / 2
      joystick.active = true
      joystick.touchId = touch.identifier
      updateJoystick(touch.clientX, touch.clientY)
    }

    const handleJoystickMove = (e: TouchEvent) => {
      if (!joystick.active) return
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystick.touchId) {
          updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY)
          break
        }
      }
    }

    const handleJoystickEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystick.touchId) {
          joystick.active = false
          joystick.touchId = null
          joystick.stick.style.transform = 'translate(-50%, -50%)'
          this.keys.left = false
          this.keys.right = false
          break
        }
      }
    }

    const updateJoystick = (clientX: number, clientY: number) => {
      const maxDist = 35
      const dx = clientX - joystick.centerX
      const dy = clientY - joystick.centerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const clampedDist = Math.min(dist, maxDist)
      const angle = Math.atan2(dy, dx)
      
      const stickX = Math.cos(angle) * clampedDist
      const stickY = Math.sin(angle) * clampedDist
      
      joystick.stick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`
      
      // Set keys based on horizontal position
      const normalizedX = dx / maxDist
      this.keys.left = normalizedX < -0.3
      this.keys.right = normalizedX > 0.3
    }

    joystick.container.addEventListener('touchstart', handleJoystickStart, { passive: false })
    window.addEventListener('touchmove', handleJoystickMove, { passive: false })
    window.addEventListener('touchend', handleJoystickEnd, { passive: false })
    window.addEventListener('touchcancel', handleJoystickEnd, { passive: false })

    // Jump button handlers
    const jumpStart = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      jumpBtn.style.opacity = '1'
      jumpBtn.style.transform = 'scale(0.9)'
      this.keys.jump = true
      this.handleJump()
    }
    
    const jumpEnd = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      jumpBtn.style.opacity = '0.8'
      jumpBtn.style.transform = 'scale(1)'
      this.keys.jump = false
    }

    jumpBtn.addEventListener('touchstart', jumpStart, { passive: false })
    jumpBtn.addEventListener('touchend', jumpEnd, { passive: false })
    jumpBtn.addEventListener('touchcancel', jumpEnd, { passive: false })
    jumpBtn.addEventListener('mousedown', jumpStart)
    jumpBtn.addEventListener('mouseup', jumpEnd)
    jumpBtn.addEventListener('mouseleave', jumpEnd)
  }

  private removeTouchControls(): void {
    if (this.touchControls.overlay) {
      this.touchControls.overlay.remove()
      this.touchControls = {}
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      if (!this.keys.jump) {
        this.keys.jump = true
        this.handleJump()
      }
      e.preventDefault()
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      this.keys.jump = false
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = this.renderer.domElement.getBoundingClientRect()
    const x = touch.clientX - rect.left
    
    this.touchStartX = x
    
    // Left/right zones
    const width = rect.width
    if (x < width * 0.3) {
      this.keys.left = true
      this.keys.right = false
    } else if (x > width * 0.7) {
      this.keys.right = true
      this.keys.left = false
    } else {
      // Center = jump
      this.keys.jump = true
      this.handleJump()
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault()
    if (e.touches.length !== 1) return

    const touch = e.touches[0]
    const rect = this.renderer.domElement.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const width = rect.width

    // Update direction based on position
    if (x < width * 0.3) {
      this.keys.left = true
      this.keys.right = false
    } else if (x > width * 0.7) {
      this.keys.right = true
      this.keys.left = false
    } else {
      this.keys.left = false
      this.keys.right = false
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault()
    this.keys.left = false
    this.keys.right = false
    this.keys.jump = false
  }

  private handleJump(): void {
    if (!this.gameStarted || this.gameOver) return
    if (!this.isGrounded && this.jumpCount >= this.maxJumps) return

    this.velocityY = this.JUMP_STRENGTH
    this.isGrounded = false
    this.jumpCount++

    // Particles
    this.createParticles(this.bulkX, this.bulkY - 30, 6)

    this.audio.synthTone(400, 0.08, 'sine', 0.25)
  }

  private createParticles(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.PlaneGeometry(5, 5)
      const material = new THREE.MeshBasicMaterial({
        color: 0xaaaaaa,
        transparent: true,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x, y, 5)
      this.scene.add(mesh)

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 2 + Math.random() * 3

      this.particles.push({
        mesh, x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25,
        maxLife: 25,
      })
    }
  }

  private updateSprite(): void {
    if (!this.bulk) return
    const sprite = this.bulk.getObjectByName('sprite') as THREE.Mesh
    if (!sprite) return

    const material = sprite.material as THREE.MeshBasicMaterial
    
    // Change texture and scale based on state
    if (!this.isGrounded && this.jumpTexture) {
      // Jumping/falling - use jump sprite (33% bigger)
      material.map = this.jumpTexture
      sprite.scale.y = 1.33
    } else if (this.isGrounded && Math.abs(this.velocityX) > 1 && this.runTexture) {
      // Running - use run sprite
      material.map = this.runTexture
      sprite.scale.y = 1
    } else if (this.idleTexture) {
      // Idle - use idle sprite
      material.map = this.idleTexture
      sprite.scale.y = 1
    }
    material.needsUpdate = true

    // Flip based on direction (preserve X scale sign, maintain Y scale)
    const absScaleX = Math.abs(sprite.scale.x) || 1
    sprite.scale.x = this.facingRight ? absScaleX : -absScaleX
  }

  start(): void {
    // Reset state
    this.gameStarted = true
    this.gameOver = false
    this.score = 0
    this.height = 0
    this.velocityX = 0
    this.velocityY = 0
    this.isGrounded = false // Will be set true when we check platform collision
    this.jumpCount = 0
    this.highestY = 0
    this.cameraY = 0

    // Clear and regenerate world FIRST
    this.platforms.forEach(p => this.scene.remove(p.mesh))
    this.collectibles.forEach(c => this.scene.remove(c.mesh))
    this.hazards.forEach(h => this.scene.remove(h.mesh))
    this.platforms = []
    this.collectibles = []
    this.hazards = []
    this.lastPlatformY = 0
    this.generateInitialPlatforms()

    // NOW position player on the starting platform (platforms[0])
    const startPlatform = this.platforms[0]
    this.bulkX = startPlatform.x
    // Platform top + player half-height (30)
    this.bulkY = (startPlatform.y + startPlatform.height/2) + 30

    if (this.bulk) {
      this.bulk.position.set(this.bulkX, this.bulkY, 0)
      if (!this.bulk.parent) {
        this.scene.add(this.bulk)
      }
    }

    // Force grounded
    this.isGrounded = true

    // Reset camera
    if (this.camera instanceof THREE.OrthographicCamera) {
      this.camera.top = 400
      this.camera.bottom = -400
      this.camera.updateProjectionMatrix()
    }

    this.audio.playBGM()
    this.callbacks.onScoreChange?.(0)
    this.callbacks.onHeightChange?.(0)
    this.callbacks.onStateChange?.('playing')
  }

  restart(): void {
    this.start()
  }

  update(_delta: number): void {
    if (!this.gameStarted || this.gameOver) return
    if (!this.bulk) return

    // Horizontal movement
    const moveAccel = this.isGrounded ? 0.8 : this.AIR_CONTROL
    if (this.keys.left) {
      this.velocityX -= moveAccel
      this.facingRight = false
    }
    if (this.keys.right) {
      this.velocityX += moveAccel
      this.facingRight = true
    }

    // Friction
    this.velocityX *= this.FRICTION

    // Clamp speed
    this.velocityX = Math.max(-this.MOVE_SPEED, Math.min(this.MOVE_SPEED, this.velocityX))

    // Gravity
    this.velocityY += this.GRAVITY

    // Update position
    this.bulkX += this.velocityX
    this.bulkY += this.velocityY

    // Screen wrap
    const screenWidth = 320
    if (this.bulkX < -screenWidth) this.bulkX = screenWidth
    if (this.bulkX > screenWidth) this.bulkX = -screenWidth

    // Platform collisions - Doodle Jump style
    this.isGrounded = false
    const playerHalfWidth = 16
    const playerHalfHeight = 30
    
    for (const platform of this.platforms) {
      const platformHalfWidth = platform.width / 2
      const platformHalfHeight = platform.height / 2
      const platformTop = platform.y + platformHalfHeight
      const platformBottom = platform.y - platformHalfHeight
      
      // Horizontal overlap check
      const horizontalOverlap = 
        this.bulkX + playerHalfWidth > platform.x - platformHalfWidth &&
        this.bulkX - playerHalfWidth < platform.x + platformHalfWidth
      
      if (!horizontalOverlap) continue
      
      // Check if landing on top (Doodle Jump style)
      // Player must be falling (velocityY < 0)
      // Player's bottom must be near the platform top
      const playerBottom = this.bulkY - playerHalfHeight
      const previousPlayerBottom = (this.bulkY - this.velocityY) - playerHalfHeight
      
      // Landing: was above platform top in previous frame, now at or below it
      const wasAbove = previousPlayerBottom >= platformTop - 10
      const isNowAtPlatform = playerBottom >= platformTop - 15 && playerBottom <= platformTop + 10
      
      if (wasAbove && isNowAtPlatform && this.velocityY <= 0) {
        // Land on platform
        this.bulkY = platformTop + 30
        
        // Bounce platforms
        if (platform.type === 'bounce') {
          this.velocityY = this.JUMP_STRENGTH * 1.3
          this.createParticles(this.bulkX, this.bulkY - 37.5, 8)
          this.audio.synthTone(500, 0.1, 'sine', 0.3)
        } else {
          // Normal landing
          this.velocityY = 0
          this.isGrounded = true
          this.jumpCount = 0
        }
        
        // Moving platforms carry player
        if (platform.type === 'moving' && platform.vx) {
          this.bulkX += platform.vx
        }
        
        break
      }
    }

    // Update moving platforms
    for (const platform of this.platforms) {
      if (platform.type === 'moving' && platform.vx) {
        platform.x += platform.vx
        platform.mesh.position.x = platform.x
        
        // Bounce at edges
        if (platform.x > 280 || platform.x < -280) {
          platform.vx *= -1
        }
      }
    }

    // Update player visual
    this.bulk.position.set(this.bulkX, this.bulkY, 0)
    this.updateSprite()

    // Track height score
    if (this.bulkY > this.highestY) {
      const newHeight = Math.floor(this.bulkY / 10)
      if (newHeight > this.height) {
        this.height = newHeight
        this.score += (this.height - Math.floor(this.highestY / 10)) * 10
      }
      this.highestY = this.bulkY
    }

    // Camera follow (smooth)
    const targetCameraY = this.bulkY + 100
    this.cameraY += (targetCameraY - this.cameraY) * 0.08

    // Update camera
    if (this.camera instanceof THREE.OrthographicCamera) {
      this.camera.top = this.cameraY + 400
      this.camera.bottom = this.cameraY - 400
      this.camera.updateProjectionMatrix()
    }

    // Spawn new platforms
    while (this.lastPlatformY < this.cameraY + 500) {
      this.spawnPlatformAbove()
    }

    // Cleanup below
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i]
      if (p.y < this.cameraY - 450) {
        this.scene.remove(p.mesh)
        this.platforms.splice(i, 1)
      }
    }

    // Update collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i]
      
      // Bob animation
      const bobOffset = Math.sin(Date.now() * 0.005 + c.x) * 3
      c.mesh.position.y = c.y + bobOffset

      // Collection
      const dist = Math.hypot(c.x - this.bulkX, c.y - this.bulkY)
      if (dist < 50 && !c.collected) {
        c.collected = true
        this.score += 50
        this.scene.remove(c.mesh)
        this.collectibles.splice(i, 1)
        this.audio.synthTone(600, 0.1, 'sine', 0.2)
        continue
      }

      if (c.y < this.cameraY - 450) {
        this.scene.remove(c.mesh)
        this.collectibles.splice(i, 1)
      }
    }

    // Update hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]
      h.x += h.vx
      h.mesh.position.x = h.x

      // Wrap
      if (h.x < -320) h.x = 320
      if (h.x > 320) h.x = -320

      // Collision
      const dist = Math.hypot(h.x - this.bulkX, h.y - this.bulkY)
      if (dist < 36) {
        this.endGame()
        return
      }

      if (h.y < this.cameraY - 450) {
        this.scene.remove(h.mesh)
        this.hazards.splice(i, 1)
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy -= 0.15
      p.life--

      p.mesh.position.set(p.x, p.y, 5)
      ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life / p.maxLife

      if (p.life <= 0) {
        this.scene.remove(p.mesh)
        this.particles.splice(i, 1)
      }
    }

    // Fall death
    if (this.bulkY < this.cameraY - 400) {
      this.endGame()
      return
    }

    this.callbacks.onScoreChange?.(this.score)
    this.callbacks.onHeightChange?.(this.height)
  }

  private endGame(): void {
    this.gameOver = true
    this.audio.pauseBGM()
    this.callbacks.onStateChange?.('gameover')
  }

  protected onResize(width: number, height: number): void {
    if (this.camera instanceof THREE.OrthographicCamera) {
      const aspect = width / height
      const viewSize = 400
      this.camera.left = -viewSize * aspect
      this.camera.right = viewSize * aspect
      this.camera.updateProjectionMatrix()
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.boundKeyDown)
    window.removeEventListener('keyup', this.boundKeyUp)
    this.renderer.domElement.removeEventListener('touchstart', this.boundTouchStart)
    this.renderer.domElement.removeEventListener('touchmove', this.boundTouchMove)
    this.renderer.domElement.removeEventListener('touchend', this.boundTouchEnd)
    this.removeTouchControls()
    this.audio.dispose()
    super.dispose()
  }
}
