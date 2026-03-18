import * as THREE from 'three'
import { BaseGameEngine, type GameCallbacks } from './shared/BaseGameEngine'
import { loadGLBModel } from './shared/ModelLoader'
import { AudioManager } from './shared/AudioManager'
import { ASSET_PATHS } from '../constants'

interface ObstacleData {
  type: 'building' | 'car' | 'bus'
  scored: boolean
  destroyed: boolean
  height: number
}

interface ParticleData {
  life: number
  vx: number
  vy: number
}

interface PowerUpData {
  collected: boolean
  pulse: number
}

export class FlappyBulkEngine extends BaseGameEngine {
  // Physics constants
  private readonly GRAVITY = -0.45
  private readonly JUMP_STRENGTH = 12
  private readonly SCROLL_SPEED = 3
  private readonly GROUND_Y = -380
  private readonly MAX_HEIGHT = 420

  // Game state
  private gameStarted = false
  private gameOverFlag = false
  private score = 0
  private highScore = 0

  // Bulk character
  private bulk: THREE.Group | null = null
  private bulkModel: THREE.Object3D | null = null
  private mixer: THREE.AnimationMixer | null = null
  private bulkY = 0
  private bulkVelocity = 0
  private bulkRotation = 0

  // Game objects
  private obstacles: THREE.Group[] = []
  private powerUps: THREE.Mesh[] = []
  private particles: THREE.Mesh[] = []

  // Rage mode
  private rageMeter = 0
  private isRaging = false
  private rageTimer = 0

  // Timers
  private obstacleSpawnTimer = 0
  private animationTime = 0

  // Audio
  private audio = new AudioManager()

  // Bound event handlers
  private boundKeyDown: (e: KeyboardEvent) => void
  private boundClick: (e: MouseEvent) => void
  private boundTouchStart: (e: TouchEvent) => void

  constructor(container: HTMLElement, callbacks: GameCallbacks) {
    super(container, callbacks)
    this.bulkY = this.GROUND_Y + 75
    try { this.highScore = parseInt(localStorage.getItem('flappyBulkHighScore') || '0', 10) } catch { /* storage disabled */ }

    this.boundKeyDown = this.handleKeyDown.bind(this)
    this.boundClick = this.handleClick.bind(this)
    this.boundTouchStart = this.handleTouchStart.bind(this)
  }

  createScene(): void {
    // Gradient sky background
    const bgCanvas = document.createElement('canvas')
    bgCanvas.width = 512
    bgCanvas.height = 512
    const ctx = bgCanvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(0.6, '#B0E0E6')
    gradient.addColorStop(1, '#E0F6FF')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)
    const bgTexture = new THREE.CanvasTexture(bgCanvas)
    this.scene.background = bgTexture

    // Orthographic camera for 2D side-scroller look
    const aspect = this.container.clientWidth / this.container.clientHeight
    const viewSize = 500
    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      1000
    )
    this.camera.position.z = 500
    this.camera.lookAt(0, 0, 0)

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)
    const directional = new THREE.DirectionalLight(0xffffff, 0.4)
    directional.position.set(100, 100, 100)
    this.scene.add(directional)

    // Audio
    this.audio.loadBGM(ASSET_PATHS.audio.bgm, 0.3)
    this.audio.loadSFX('rage', ASSET_PATHS.audio.nuke, 0.5)
    this.audio.loadSFX('destroy', ASSET_PATHS.audio.nuke, 0.4)
    this.audio.loadSFX('gameOver', ASSET_PATHS.audio.nuke, 0.4)

    // Build the scene
    this.createGround()
    this.createBackground()
    this.createBulk()
    this.setupControls()

    // Communicate initial high score
    this.callbacks.onHighScoreChange?.(this.highScore)
  }

  // ─── Ground / road ────────────────────────────────────────────────

  private createGround(): void {
    // Road base (gray asphalt)
    const roadGeo = new THREE.PlaneGeometry(2000, 150)
    const roadMat = new THREE.MeshBasicMaterial({ color: 0x4a4a4a })
    const road = new THREE.Mesh(roadGeo, roadMat)
    road.position.set(0, this.GROUND_Y, -10)
    this.scene.add(road)

    // Road edge lines (white)
    const edgeGeo = new THREE.PlaneGeometry(2000, 6)
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    })
    const edge1 = new THREE.Mesh(edgeGeo, edgeMat)
    edge1.position.set(0, this.GROUND_Y + 75, -8)
    this.scene.add(edge1)
    const edge2 = new THREE.Mesh(edgeGeo, edgeMat)
    edge2.position.set(0, this.GROUND_Y - 75, -8)
    this.scene.add(edge2)

    // Road stripes (white dashed)
    for (let i = -1000; i < 1000; i += 100) {
      const stripeGeo = new THREE.PlaneGeometry(60, 6)
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
      const stripe = new THREE.Mesh(stripeGeo, stripeMat)
      stripe.position.set(i, this.GROUND_Y, -9)
      stripe.userData.scrollSpeed = this.SCROLL_SPEED
      this.scene.add(stripe)
    }

    // Center line (yellow)
    const lineGeo = new THREE.PlaneGeometry(2000, 4)
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.9,
    })
    const line = new THREE.Mesh(lineGeo, lineMat)
    line.position.set(0, this.GROUND_Y + 75, -8.5)
    this.scene.add(line)

    // Road texture pattern (darker spots)
    for (let i = -1000; i < 1000; i += 40) {
      for (let j = -60; j < 60; j += 30) {
        if (Math.abs(j) > 10 && Math.random() > 0.7) {
          const dotGeo = new THREE.PlaneGeometry(3, 3)
          const dotMat = new THREE.MeshBasicMaterial({
            color: 0x3a3a3a,
            transparent: true,
            opacity: 0.6,
          })
          const dot = new THREE.Mesh(dotGeo, dotMat)
          dot.position.set(i, this.GROUND_Y + j, -9.5)
          this.scene.add(dot)
        }
      }
    }
  }

  // ─── Background (sun, clouds, buildings) ──────────────────────────

  private createBackground(): void {
    // Sun
    const sunGeo = new THREE.CircleGeometry(60, 32)
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
    })
    const sun = new THREE.Mesh(sunGeo, sunMat)
    sun.position.set(400, 250, -150)
    this.scene.add(sun)

    // Sun glow
    const sunGlowGeo = new THREE.CircleGeometry(80, 32)
    const sunGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.3,
    })
    const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat)
    sunGlow.position.set(400, 250, -151)
    this.scene.add(sunGlow)

    // Clouds
    for (let i = 0; i < 15; i++) {
      const cloudGroup = new THREE.Group()
      for (let c = 0; c < 4; c++) {
        const cloudSize = 20 + Math.random() * 25
        const cloudGeo = new THREE.CircleGeometry(cloudSize, 16)
        const cloudMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.7,
        })
        const cloudPart = new THREE.Mesh(cloudGeo, cloudMat)
        cloudPart.position.set(c * 30 - 45, Math.random() * 10 - 5, 0)
        cloudGroup.add(cloudPart)
      }
      cloudGroup.position.set(
        -600 + Math.random() * 1200,
        100 + Math.random() * 200,
        -120 - Math.random() * 30
      )
      this.scene.add(cloudGroup)
    }

    // Background buildings with windows
    const buildingColors = [0x8b9dc3, 0xa8b8d8, 0xc9d4e8, 0xb0c4de]
    for (let i = 0; i < 10; i++) {
      const width = 80 + Math.random() * 60
      const height = 150 + Math.random() * 200
      const building = new THREE.Group()

      const buildingGeo = new THREE.PlaneGeometry(width, height)
      const buildingMat = new THREE.MeshBasicMaterial({
        color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
        opacity: 0.6,
        transparent: true,
      })
      const buildingMesh = new THREE.Mesh(buildingGeo, buildingMat)
      building.add(buildingMesh)

      // Add windows
      const numWindows = Math.floor(height / 30)
      for (let w = 0; w < numWindows; w++) {
        if (Math.random() > 0.6) {
          const windowGeo = new THREE.PlaneGeometry(width * 0.6, 8)
          const windowMat = new THREE.MeshBasicMaterial({
            color: 0x4a5a6a,
            transparent: true,
            opacity: 0.5,
          })
          const windowMesh = new THREE.Mesh(windowGeo, windowMat)
          windowMesh.position.set(0, -height / 2 + w * 30 + 15, 0.1)
          building.add(windowMesh)
        }
      }

      building.position.set(
        -500 + i * 120,
        this.GROUND_Y + height / 2 + 75,
        -50
      )
      this.scene.add(building)
    }
  }

  // ─── Bulk character ───────────────────────────────────────────────

  private createBulk(): void {
    this.bulk = new THREE.Group()
    this.bulk.position.set(-200, this.bulkY, 0)
    this.scene.add(this.bulk)

    // Glow effect behind Bulk
    const glowGeo = new THREE.CircleGeometry(80, 32)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffdd88,
      transparent: true,
      opacity: 0.4,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.z = -5
    glow.userData.isGlow = true
    this.bulk.add(glow)

    // Load GLB model
    this.loadBulkModel()
  }

  private async loadBulkModel(): Promise<void> {
    try {
      const { scene: model, mixer } = await loadGLBModel(ASSET_PATHS.models.run, 130)
      if (this.disposed) return
      model.rotation.y = Math.PI / 2 // Face right
      this.bulkModel = model
      this.mixer = mixer
      this.bulk!.add(model)
    } catch (err) {
      console.error('Error loading model:', err)
      this.createFallbackBulk()
    }
  }

  private createFallbackBulk(): void {
    const bulkGeo = new THREE.PlaneGeometry(100, 100)
    const bulkMat = new THREE.MeshBasicMaterial({ color: 0x9b4dca })
    const fallback = new THREE.Mesh(bulkGeo, bulkMat)

    // Eyes
    const eyeGeo = new THREE.PlaneGeometry(18, 18)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const eye1 = new THREE.Mesh(eyeGeo, eyeMat)
    const eye2 = new THREE.Mesh(eyeGeo, eyeMat)
    eye1.position.set(-25, 18, 1)
    eye2.position.set(25, 18, 1)
    fallback.add(eye1, eye2)

    this.bulkModel = fallback
    this.bulk!.add(fallback)
  }

  // ─── Controls ─────────────────────────────────────────────────────

  private setupControls(): void {
    document.addEventListener('keydown', this.boundKeyDown)
    this.renderer.domElement.addEventListener('click', this.boundClick)
    this.renderer.domElement.addEventListener('touchstart', this.boundTouchStart)
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault()
      this.handleJump()
    }
  }

  private handleClick(): void {
    if (this.gameStarted && !this.gameOverFlag) {
      this.handleJump()
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault()
    if (this.gameStarted && !this.gameOverFlag) {
      this.handleJump()
    }
  }

  private handleJump(): void {
    if (!this.gameStarted || this.gameOverFlag) return
    this.bulkVelocity = this.JUMP_STRENGTH
    this.playJumpSound()
  }

  // ─── Resize ───────────────────────────────────────────────────────

  protected override onResize(width: number, height: number): void {
    if (this.camera instanceof THREE.OrthographicCamera) {
      const aspect = width / height
      const viewSize = 500
      this.camera.left = -viewSize * aspect
      this.camera.right = viewSize * aspect
      this.camera.top = viewSize
      this.camera.bottom = -viewSize
      this.camera.updateProjectionMatrix()
    }
  }

  // ─── Sound helpers ────────────────────────────────────────────────

  private playJumpSound(): void {
    this.audio.synthSweep(400, 600, 0.1, 'sine', 0.3)
  }

  private playScoreSound(): void {
    // Two-tone rising beep
    this.audio.synthTone(800, 0.05, 'square', 0.2)
    setTimeout(() => {
      this.audio.synthTone(1000, 0.05, 'square', 0.2)
    }, 50)
  }

  private playSound(name: string): void {
    if (name === 'jump') {
      this.playJumpSound()
    } else if (name === 'score') {
      this.playScoreSound()
    } else {
      this.audio.playSFX(name)
    }
  }

  // ─── Obstacle spawning ───────────────────────────────────────────

  private spawnObstacle(): void {
    const rand = Math.random()

    if (rand > 0.65) {
      this.spawnBuilding()
    } else if (rand > 0.35) {
      this.spawnCar()
    } else {
      this.spawnBus()
    }

    // Sometimes spawn a power-up
    if (Math.random() > 0.85) {
      this.spawnPowerUp()
    }
  }

  private spawnBuilding(): void {
    const height = 220 + Math.random() * 180
    const width = 70 + Math.random() * 50
    const obstacle = new THREE.Group()
    obstacle.position.set(600, this.GROUND_Y + height / 2 + 75, 0)
    const data: ObstacleData = { type: 'building', scored: false, destroyed: false, height }
    obstacle.userData = data

    // Main body
    const buildingColors = [0x6a8caf, 0x8faadc, 0x7fb3d5, 0xa8c5e2]
    const bodyGeo = new THREE.PlaneGeometry(width, height)
    const bodyMat = new THREE.MeshBasicMaterial({
      color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
    })
    obstacle.add(new THREE.Mesh(bodyGeo, bodyMat))

    // Outline
    const outlineGeo = new THREE.PlaneGeometry(width + 3, height + 3)
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x4a5a70 })
    const outline = new THREE.Mesh(outlineGeo, outlineMat)
    outline.position.z = -0.1
    obstacle.add(outline)

    // Rooftop details
    const roofGeo = new THREE.PlaneGeometry(width + 2, 15)
    const roofMat = new THREE.MeshBasicMaterial({ color: 0x5a6a80 })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.set(0, height / 2 - 7.5, 0.1)
    obstacle.add(roof)

    // AC unit
    if (Math.random() > 0.3) {
      const acGeo = new THREE.PlaneGeometry(12, 8)
      const acMat = new THREE.MeshBasicMaterial({ color: 0x444444 })
      const ac = new THREE.Mesh(acGeo, acMat)
      ac.position.set(width / 4, height / 2 + 4, 0.2)
      obstacle.add(ac)
    }

    // Antenna with red light
    if (Math.random() > 0.4) {
      const antennaGeo = new THREE.PlaneGeometry(2, 20)
      const antennaMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
      const antenna = new THREE.Mesh(antennaGeo, antennaMat)
      antenna.position.set(-width / 4, height / 2 + 10, 0.2)
      obstacle.add(antenna)

      const lightGeo = new THREE.CircleGeometry(3, 8)
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
      const light = new THREE.Mesh(lightGeo, lightMat)
      light.position.set(-width / 4, height / 2 + 20, 0.3)
      obstacle.add(light)
    }

    // Window grid
    const windowCols = Math.floor(width / 18)
    const windowRows = Math.floor(height / 25)
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const winGeo = new THREE.PlaneGeometry(10, 14)
        const winMat = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0x87ceeb : 0x5a8aaa,
        })
        const win = new THREE.Mesh(winGeo, winMat)
        const xPos = -width / 2 + (col + 0.5) * (width / windowCols)
        const yPos = -height / 2 + (row + 0.5) * (height / windowRows)
        win.position.set(xPos, yPos, 0.1)
        obstacle.add(win)

        // Window frame
        const frameGeo = new THREE.PlaneGeometry(11, 15)
        const frameMat = new THREE.MeshBasicMaterial({ color: 0xddeeff })
        const frame = new THREE.Mesh(frameGeo, frameMat)
        frame.position.set(xPos, yPos, 0.09)
        obstacle.add(frame)
      }
    }

    // Shadow under building
    const shadowGeo = new THREE.PlaneGeometry(width + 10, 20)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
    })
    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    shadow.position.set(0, -height / 2 - 10, -0.2)
    obstacle.add(shadow)

    this.scene.add(obstacle)
    this.obstacles.push(obstacle)
  }

  private spawnCar(): void {
    const height = 45 + Math.random() * 15
    const width = 90 + Math.random() * 30
    const obstacle = new THREE.Group()
    obstacle.position.set(600, this.GROUND_Y + height / 2 + 75, 0)
    const data: ObstacleData = { type: 'car', scored: false, destroyed: false, height }
    obstacle.userData = data

    const colors = [0xff0000, 0x0000ff, 0x00aa00, 0xffff00, 0xff00ff]
    const carColor = colors[Math.floor(Math.random() * colors.length)]

    // Car body
    const bodyGeo = new THREE.PlaneGeometry(width, height * 0.6)
    const bodyMat = new THREE.MeshBasicMaterial({ color: carColor })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.set(0, -height * 0.15, 0)
    obstacle.add(body)

    // Car roof/cabin
    const roofWidth = width * 0.55
    const roofHeight = height * 0.5
    const roofGeo = new THREE.PlaneGeometry(roofWidth, roofHeight)
    const roofMat = new THREE.MeshBasicMaterial({ color: carColor })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.set(width * 0.05, height * 0.15, 0.1)
    obstacle.add(roof)

    // Windshield
    const windshieldGeo = new THREE.PlaneGeometry(roofWidth * 0.4, roofHeight * 0.7)
    const windshieldMat = new THREE.MeshBasicMaterial({ color: 0x6ec9ff })
    const windshield = new THREE.Mesh(windshieldGeo, windshieldMat)
    windshield.position.set(width * 0.15, height * 0.15, 0.2)
    obstacle.add(windshield)

    // Headlights
    const headlightGeo = new THREE.PlaneGeometry(8, 6)
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffff99 })
    const hl1 = new THREE.Mesh(headlightGeo, headlightMat)
    const hl2 = new THREE.Mesh(headlightGeo, headlightMat)
    hl1.position.set(width / 2 - 4, -height * 0.25, 0.2)
    hl2.position.set(width / 2 - 4, height * 0.05, 0.2)
    obstacle.add(hl1, hl2)

    // Taillights
    const tailGeo = new THREE.PlaneGeometry(6, 5)
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    const tl1 = new THREE.Mesh(tailGeo, tailMat)
    const tl2 = new THREE.Mesh(tailGeo, tailMat)
    tl1.position.set(-width / 2 + 3, -height * 0.25, 0.2)
    tl2.position.set(-width / 2 + 3, height * 0.05, 0.2)
    obstacle.add(tl1, tl2)

    // Wheels with rims
    const wheelRadius = 10
    const wheelGeo = new THREE.CircleGeometry(wheelRadius, 16)
    const wheelMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
    const rimGeo = new THREE.CircleGeometry(wheelRadius * 0.6, 16)
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x666666 })

    const w1 = new THREE.Mesh(wheelGeo, wheelMat)
    w1.position.set(width * 0.25, -height / 2 + 2, 0.3)
    obstacle.add(w1)
    const r1 = new THREE.Mesh(rimGeo, rimMat)
    r1.position.set(width * 0.25, -height / 2 + 2, 0.4)
    obstacle.add(r1)

    const w2 = new THREE.Mesh(wheelGeo, wheelMat)
    w2.position.set(-width * 0.28, -height / 2 + 2, 0.3)
    obstacle.add(w2)
    const r2 = new THREE.Mesh(rimGeo, rimMat)
    r2.position.set(-width * 0.28, -height / 2 + 2, 0.4)
    obstacle.add(r2)

    // Door outline
    const doorGeo = new THREE.PlaneGeometry(width * 0.35, height * 0.5)
    const doorMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      opacity: 0.1,
      transparent: true,
    })
    const door = new THREE.Mesh(doorGeo, doorMat)
    door.position.set(-width * 0.1, -height * 0.15, 0.15)
    obstacle.add(door)

    // Shadow
    const shadowGeo = new THREE.PlaneGeometry(width + 5, 15)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
    })
    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    shadow.position.set(0, -height / 2 - 8, -0.2)
    obstacle.add(shadow)

    this.scene.add(obstacle)
    this.obstacles.push(obstacle)
  }

  private spawnBus(): void {
    const height = 70 + Math.random() * 10
    const width = 140 + Math.random() * 30
    const obstacle = new THREE.Group()
    obstacle.position.set(600, this.GROUND_Y + height / 2 + 75, 0)
    const data: ObstacleData = { type: 'bus', scored: false, destroyed: false, height }
    obstacle.userData = data

    const busColors = [0xff6600, 0xffff00, 0x00aaff, 0xaa00aa]
    const busColor = busColors[Math.floor(Math.random() * busColors.length)]

    // Bus body
    const bodyGeo = new THREE.PlaneGeometry(width, height)
    const bodyMat = new THREE.MeshBasicMaterial({ color: busColor })
    obstacle.add(new THREE.Mesh(bodyGeo, bodyMat))

    // Stripe
    const stripeGeo = new THREE.PlaneGeometry(width + 2, height * 0.15)
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const stripe = new THREE.Mesh(stripeGeo, stripeMat)
    stripe.position.set(0, 0, 0.1)
    obstacle.add(stripe)

    // Windows
    const numWindows = 6
    const windowWidth = width / (numWindows + 1)
    for (let i = 0; i < numWindows; i++) {
      const winGeo = new THREE.PlaneGeometry(windowWidth * 0.7, height * 0.35)
      const winMat = new THREE.MeshBasicMaterial({ color: 0x6ec9ff })
      const win = new THREE.Mesh(winGeo, winMat)
      const xPos = -width / 2 + (i + 1) * windowWidth
      win.position.set(xPos, height * 0.15, 0.2)
      obstacle.add(win)

      // Window frame
      const frameGeo = new THREE.PlaneGeometry(windowWidth * 0.75, height * 0.38)
      const frameMat = new THREE.MeshBasicMaterial({ color: 0x222222 })
      const frame = new THREE.Mesh(frameGeo, frameMat)
      frame.position.set(xPos, height * 0.15, 0.19)
      obstacle.add(frame)
    }

    // Front windshield
    const frontGeo = new THREE.PlaneGeometry(width * 0.12, height * 0.5)
    const frontMat = new THREE.MeshBasicMaterial({ color: 0x88ddff })
    const frontWin = new THREE.Mesh(frontGeo, frontMat)
    frontWin.position.set(width / 2 - width * 0.06, height * 0.15, 0.2)
    obstacle.add(frontWin)

    // Headlights
    const hlGeo = new THREE.PlaneGeometry(10, 8)
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffaa })
    const hl1 = new THREE.Mesh(hlGeo, hlMat)
    const hl2 = new THREE.Mesh(hlGeo, hlMat)
    hl1.position.set(width / 2 - 5, -height * 0.25, 0.3)
    hl2.position.set(width / 2 - 5, height * 0.25, 0.3)
    obstacle.add(hl1, hl2)

    // Bus number sign
    const signGeo = new THREE.PlaneGeometry(width * 0.15, height * 0.12)
    const signMat = new THREE.MeshBasicMaterial({ color: 0xff6600 })
    const sign = new THREE.Mesh(signGeo, signMat)
    sign.position.set(width / 2 - width * 0.075, height / 2 - height * 0.06, 0.3)
    obstacle.add(sign)

    // Wheels (3 pairs for a bus)
    const wheelRadius = 12
    const wheelGeo = new THREE.CircleGeometry(wheelRadius, 16)
    const wheelMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
    const rimGeo = new THREE.CircleGeometry(wheelRadius * 0.5, 16)
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x555555 })

    const wheelPositions = [width * 0.32, 0, -width * 0.32]
    for (const xp of wheelPositions) {
      const w = new THREE.Mesh(wheelGeo, wheelMat)
      w.position.set(xp, -height / 2 + 3, 0.4)
      obstacle.add(w)
      const r = new THREE.Mesh(rimGeo, rimMat)
      r.position.set(xp, -height / 2 + 3, 0.5)
      obstacle.add(r)
    }

    // Door
    const doorGeo = new THREE.PlaneGeometry(width * 0.15, height * 0.65)
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x333333 })
    const door = new THREE.Mesh(doorGeo, doorMat)
    door.position.set(width * 0.35, -height * 0.1, 0.15)
    obstacle.add(door)

    // Shadow
    const shadowGeo = new THREE.PlaneGeometry(width + 8, 18)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
    })
    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    shadow.position.set(0, -height / 2 - 9, -0.2)
    obstacle.add(shadow)

    this.scene.add(obstacle)
    this.obstacles.push(obstacle)
  }

  // ─── Power-ups ────────────────────────────────────────────────────

  private spawnPowerUp(): void {
    const geo = new THREE.CircleGeometry(15, 32)
    const mat = new THREE.MeshBasicMaterial({ color: 0x9b30ff })
    const powerUp = new THREE.Mesh(geo, mat)
    powerUp.position.set(600, this.GROUND_Y + 150 + Math.random() * 200, 5)
    const data: PowerUpData = { collected: false, pulse: 0 }
    powerUp.userData = data
    this.scene.add(powerUp)
    this.powerUps.push(powerUp)
  }

  private updatePowerUps(): void {
    if (!this.bulk) return

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i]
      const puData = powerUp.userData as PowerUpData
      powerUp.position.x -= this.SCROLL_SPEED
      puData.pulse += 0.1
      powerUp.scale.setScalar(1 + Math.sin(puData.pulse) * 0.2)

      // Check collection
      const distX = Math.abs(powerUp.position.x - this.bulk.position.x)
      const distY = Math.abs(powerUp.position.y - this.bulkY)
      if (distX < 40 && distY < 40 && !puData.collected) {
        puData.collected = true
        this.collectPowerUp(powerUp)
        this.disposeObject(powerUp)
        this.powerUps.splice(i, 1)
        continue
      }

      // Remove off-screen
      if (powerUp.position.x < -600) {
        this.disposeObject(powerUp)
        this.powerUps.splice(i, 1)
      }
    }
  }

  private collectPowerUp(powerUp: THREE.Mesh): void {
    this.rageMeter = 100
    this.activateRageMode()
    this.callbacks.onRageChange?.(this.rageMeter)
    this.createExplosion(powerUp.position.x, powerUp.position.y, 0x9b30ff)
  }

  // ─── Rage mode ────────────────────────────────────────────────────

  private activateRageMode(): void {
    this.isRaging = true
    this.rageTimer = 600 // 10 seconds at 60fps
    this.playSound('rage')
    this.callbacks.onRageChange?.(100)

    if (this.bulkModel) {
      this.bulkModel.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial
          if (mat.emissive !== undefined) {
            mat.emissive = new THREE.Color(0xff00ff)
            mat.emissiveIntensity = 0.8
          }
        }
      })
    }
  }

  private deactivateRageMode(): void {
    this.isRaging = false
    this.rageMeter = 0
    this.callbacks.onRageChange?.(0)

    if (this.bulkModel) {
      this.bulkModel.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial
          if (mat.emissive !== undefined) {
            mat.emissive = new THREE.Color(0x000000)
            mat.emissiveIntensity = 0
          }
        }
      })
    }
  }

  private updateRageMode(): void {
    if (!this.isRaging) return

    this.rageTimer--

    // Create particle trail
    if (this.bulk && Math.random() > 0.7) {
      this.createParticle(this.bulk.position.x, this.bulkY, 0xff00ff)
    }

    // Update rage meter proportionally
    const ragePct = Math.max(0, (this.rageTimer / 600) * 100)
    this.rageMeter = ragePct
    this.callbacks.onRageChange?.(ragePct)

    if (this.rageTimer <= 0) {
      this.deactivateRageMode()
    }
  }

  // ─── Particles ────────────────────────────────────────────────────

  private createParticle(x: number, y: number, color: number): void {
    const geo = new THREE.CircleGeometry(5, 8)
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true })
    const particle = new THREE.Mesh(geo, mat)
    particle.position.set(x, y, 10)
    const data: ParticleData = {
      life: 1,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
    }
    particle.userData = data
    this.scene.add(particle)
    this.particles.push(particle)
  }

  private createExplosion(x: number, y: number, color = 0xff0000): void {
    for (let i = 0; i < 15; i++) {
      this.createParticle(x, y, color)
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      const data = particle.userData as ParticleData
      data.life -= 0.02
      particle.position.x += data.vx
      particle.position.y += data.vy
      ;(particle.material as THREE.MeshBasicMaterial).opacity = data.life

      if (data.life <= 0) {
        this.disposeObject(particle)
        this.particles.splice(i, 1)
      }
    }
  }

  // ─── Score ────────────────────────────────────────────────────────

  private addScore(points: number): void {
    this.score += points
    this.callbacks.onScoreChange?.(this.score)

    if (points > 1) {
      this.playSound('destroy')
    } else {
      this.playSound('score')
    }

    if (this.score > this.highScore) {
      this.highScore = this.score
      try { localStorage.setItem('flappyBulkHighScore', String(this.highScore)) } catch { /* storage full/disabled */ }
      this.callbacks.onHighScoreChange?.(this.highScore)
    }
  }

  // ─── Core update methods ──────────────────────────────────────────

  private updateBulk(): void {
    if (!this.bulk) return

    // Apply gravity
    this.bulkVelocity += this.GRAVITY

    // Update position
    this.bulkY += this.bulkVelocity
    this.bulk.position.y = this.bulkY

    // Ground collision - land safely, don't end game
    if (this.bulkY <= this.GROUND_Y + 75) {
      this.bulkY = this.GROUND_Y + 75
      this.bulkVelocity = 0
      this.bulkRotation = 0
    }

    // Ceiling - fly too high = game over
    if (this.bulkY > this.MAX_HEIGHT) {
      this.endGame('flew')
      return
    }

    // Rotation based on velocity
    if (this.bulkY > this.GROUND_Y + 75) {
      const targetRotation = this.bulkVelocity * 0.04
      this.bulkRotation += (targetRotation - this.bulkRotation) * 0.1
    } else {
      this.bulkRotation += (0 - this.bulkRotation) * 0.2
    }

    if (this.bulkModel) {
      this.bulkModel.rotation.z = this.bulkRotation
    }
  }

  private updateObstacles(): void {
    if (!this.bulk) return

    // Spawn obstacles
    this.obstacleSpawnTimer++
    if (this.obstacleSpawnTimer > 150) {
      this.spawnObstacle()
      this.obstacleSpawnTimer = 0
    }

    // Move and check obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i]
      const obsData = obs.userData as ObstacleData
      obs.position.x -= this.SCROLL_SPEED

      // Score when passed
      if (!obsData.scored && obs.position.x < this.bulk.position.x - 50) {
        obsData.scored = true
        if (!this.isRaging) {
          this.addScore(1)
        }
      }

      // Check collision
      if (!obsData.destroyed) {
        const distX = Math.abs(obs.position.x - this.bulk.position.x)
        const distY = Math.abs(obs.position.y - this.bulkY)

        let collisionWidth = 70
        let collisionHeight = obsData.height / 2 + 40

        if (obsData.type === 'bus') {
          collisionWidth = 85
          collisionHeight = obsData.height / 2 + 45
        } else if (obsData.type === 'car') {
          collisionWidth = 60
          collisionHeight = obsData.height / 2 + 35
        }

        if (distX < collisionWidth && distY < collisionHeight) {
          if (this.isRaging) {
            // Destroy in rage mode
            obsData.destroyed = true
            this.addScore(5)
            this.createExplosion(obs.position.x, obs.position.y)
            this.disposeObject(obs)
            this.obstacles.splice(i, 1)
          } else {
            // Game over
            this.endGame('crashed')
          }
        }
      }

      // Remove off-screen
      if (obs.position.x < -600) {
        this.disposeObject(obs)
        this.obstacles.splice(i, 1)
      }
    }
  }

  // ─── Game flow ────────────────────────────────────────────────────

  start(): void {
    this.gameStarted = true
    this.gameOverFlag = false
    this.score = 0
    this.bulkY = this.GROUND_Y + 75
    this.bulkVelocity = 0
    this.bulkRotation = 0
    this.obstacleSpawnTimer = 0

    // Clear existing objects
    for (const obs of this.obstacles) this.scene.remove(obs)
    for (const p of this.powerUps) this.scene.remove(p)
    for (const p of this.particles) this.scene.remove(p)
    this.obstacles = []
    this.powerUps = []
    this.particles = []

    this.rageMeter = 0
    this.isRaging = false

    if (this.bulk) {
      this.bulk.position.y = this.bulkY
    }

    this.audio.playBGM()

    this.callbacks.onScoreChange?.(0)
    this.callbacks.onRageChange?.(0)
    this.callbacks.onHighScoreChange?.(this.highScore)
    this.callbacks.onStateChange?.('playing')
  }

  restart(): void {
    this.callbacks.onStateChange?.('title')
    this.gameStarted = false
    this.gameOverFlag = false
    this.score = 0
  }

  private endGame(reason: 'crashed' | 'flew' = 'crashed'): void {
    if (this.gameOverFlag) return
    this.gameOverFlag = true

    this.audio.pauseBGM()
    this.playSound('gameOver')
    this.deactivateRageMode()

    // Notify React with the reason encoded in the state
    // The React wrapper can query lastDeathReason for display text
    this.lastDeathReason = reason
    this.callbacks.onStateChange?.('gameover')
  }

  /** Exposed so the React wrapper can display "BULK CRASHED!" vs "BULK FLEW AWAY!" */
  public lastDeathReason: 'crashed' | 'flew' = 'crashed'

  // ─── Main update loop ─────────────────────────────────────────────

  update(delta: number): void {
    this.animationTime += delta

    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(delta)
    }

    // Pulse glow on Bulk
    if (this.bulk) {
      this.bulk.children.forEach((child) => {
        if (child.userData.isGlow && child instanceof THREE.Mesh) {
          const pulseScale = 1 + Math.sin(this.animationTime * 3) * 0.15
          child.scale.set(pulseScale, pulseScale, 1)
          ;(child.material as THREE.MeshBasicMaterial).opacity =
            0.25 + Math.sin(this.animationTime * 3) * 0.1
        }
      })
    }

    if (this.gameStarted && !this.gameOverFlag) {
      this.updateBulk()
      this.updateObstacles()
      this.updatePowerUps()
      this.updateParticles()
      this.updateRageMode()
    }
  }

  // ─── Cleanup ──────────────────────────────────────────────────────

  dispose(): void {
    document.removeEventListener('keydown', this.boundKeyDown)
    this.renderer.domElement.removeEventListener('click', this.boundClick)
    this.renderer.domElement.removeEventListener('touchstart', this.boundTouchStart)
    this.audio.dispose()
    super.dispose()
  }
}
