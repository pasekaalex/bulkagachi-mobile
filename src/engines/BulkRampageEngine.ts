import * as THREE from 'three'
import { BaseGameEngine } from './shared/BaseGameEngine'
import { loadGLBModel } from './shared/ModelLoader'
import { AudioManager } from './shared/AudioManager'
import { ASSET_PATHS } from '../constants'

// ─── Types ───────────────────────────────────────────────────────

interface EnemyType {
  name: string
  color: number
  speed: number
  damage: number
  health: number
  points: number
  xp: number
}

interface BossType {
  name: string
  color: number
  health: number
  damage: number
  points: number
  xp: number
}

interface PowerupType {
  name: string
  color: number
  emoji: string
  duration: number
}

interface PowerupState {
  active: boolean
  timer: number
}

interface BuildingData {
  isBuilding: boolean
  health: number
  maxHealth: number
  destroyed: boolean
  height: number
  width: number
  depth: number
}

interface CarData {
  isCar: boolean
  health: number
  destroyed: boolean
  points: number
  xp: number
}

interface EnemyData {
  type: EnemyType
  health: number
  maxHealth: number
  shootCooldown: number
  isEnemy: boolean
  isBoss?: boolean
  phase?: number
}

interface CivilianData {
  isCivilian: boolean
  velocity: THREE.Vector3
  panicTimer: number
}

interface ParticleData {
  velocity: THREE.Vector3
  lifetime: number
}

interface ProjectileData {
  velocity: THREE.Vector3
  damage: number
  lifetime: number
}

interface PowerupObjData {
  type: PowerupType
  bobOffset: number
  isPowerup: boolean
}

export interface RampageCallbacks {
  onScoreChange?: (score: number) => void
  onStateChange?: (state: 'title' | 'playing' | 'gameover' | 'win') => void
  onHealthChange?: (health: number, maxHealth: number) => void
  onRageChange?: (rage: number) => void
  onComboChange?: (combo: number, multiplier: number) => void
  onWaveChange?: (wave: number) => void
  onDestructionChange?: (percent: number) => void
  onLevelChange?: (level: number) => void
  onXPChange?: (xp: number, xpToLevel: number) => void
  onWantedLevelChange?: (level: number) => void
  onBossChange?: (boss: { name: string; healthPercent: number } | null) => void
  onPowerupChange?: (powerups: Record<string, PowerupState>) => void
  onWaveAnnouncement?: (wave: number, subtitle: string) => void
  onAnnouncement?: (text: string, type: string) => void
  onFloatingText?: (x: number, y: number, text: string, type: string) => void
  onScreenFlash?: (type: string) => void
  onTotalKillsChange?: (kills: number) => void
  onMaxComboChange?: (maxCombo: number) => void
  onDestroyedBuildingsChange?: (count: number) => void
}

// ─── Constants ───────────────────────────────────────────────────

const ENEMY_TYPES: EnemyType[] = [
  { name: 'SOLDIER', color: 0x3d5c3d, speed: 0.06, damage: 5, health: 30, points: 100, xp: 10 },
  { name: 'ROBIN HOOD', color: 0x228b22, speed: 0.09, damage: 12, health: 40, points: 500, xp: 30 },
  { name: 'PIRATE', color: 0x8b4513, speed: 0.05, damage: 10, health: 50, points: 300, xp: 25 },
  { name: 'ZEUS', color: 0xffd700, speed: 0.11, damage: 25, health: 80, points: 1000, xp: 50 },
  { name: 'RED BARON', color: 0xff0000, speed: 0.16, damage: 18, health: 60, points: 750, xp: 40 },
  { name: 'TANK', color: 0x556b2f, speed: 0.03, damage: 35, health: 150, points: 400, xp: 35 },
  { name: 'HELICOPTER', color: 0x333333, speed: 0.12, damage: 20, health: 100, points: 600, xp: 45 },
  { name: 'NINJA', color: 0x1a1a1a, speed: 0.2, damage: 15, health: 25, points: 800, xp: 55 },
]

const BOSS_TYPES: BossType[] = [
  { name: 'GENERAL DARWIN', color: 0x4a0000, health: 2000, damage: 50, points: 10000, xp: 500 },
  { name: 'DR. KANTLOVE', color: 0x660066, health: 3000, damage: 60, points: 15000, xp: 750 },
  { name: 'MEGA TANK', color: 0x2d4a2d, health: 5000, damage: 80, points: 25000, xp: 1000 },
]

const POWERUP_TYPES: PowerupType[] = [
  { name: 'schmeg', color: 0xff00ff, emoji: 'S', duration: 600 },
  { name: 'speed', color: 0x00ffff, emoji: 'Z', duration: 480 },
  { name: 'magnet', color: 0xffd700, emoji: 'M', duration: 420 },
  { name: 'shield', color: 0x00ff00, emoji: 'D', duration: 360 },
  { name: 'health', color: 0xff0000, emoji: 'H', duration: 0 },
  { name: 'nuke', color: 0xffff00, emoji: 'N', duration: 0 },
]

const WAVE_SUBTITLES = ['GET READY!', 'INCOMING!', 'BRACE YOURSELF!', 'HERE THEY COME!', 'SURVIVE!']

// ─── Engine ──────────────────────────────────────────────────────

export class BulkRampageEngine extends BaseGameEngine {
  private rampageCallbacks: RampageCallbacks

  // Three.js objects
  private bulk: THREE.Group = new THREE.Group()
  private bulkParts: Record<string, THREE.Object3D> = {}
  private bulkMixer: THREE.AnimationMixer | null = null
  private attackAction: THREE.AnimationAction | null = null
  private walkAction: THREE.AnimationAction | null = null
  private idleAction: THREE.AnimationAction | null = null
  private currentAnimation = 'idle'

  // Collections
  private buildings: THREE.Mesh[] = []
  private enemies: THREE.Object3D[] = []
  private projectiles: THREE.Mesh[] = []
  private particles: THREE.Mesh[] = []
  private powerups: THREE.Group[] = []
  private cars: THREE.Group[] = []
  private civilians: THREE.Group[] = []

  // Game state
  private gameStarted = false
  private gameOver = false
  private score = 0
  private rage = 100
  private bulkHealth = 100
  private maxHealth = 100
  private rageMode = false
  private destruction = 0
  private totalBuildings = 0
  private destroyedBuildings = 0

  // Combo / wave / progression
  private combo = 0
  private comboTimer = 0
  private maxCombo = 0
  private wave = 1
  private waveTimer = 0
  private enemiesThisWave = 0
  private enemiesKilledThisWave = 0
  private wantedLevel = 1
  private totalKills = 0
  private level = 1
  private xp = 0
  private xpToLevel = 100

  // Boss
  private bossActive = false
  private bossSpawnedThisWave = false
  private currentBoss: THREE.Object3D | null = null

  // Powerup states
  private powerupStates: Record<string, PowerupState> = {
    schmeg: { active: false, timer: 0 },
    speed: { active: false, timer: 0 },
    magnet: { active: false, timer: 0 },
    shield: { active: false, timer: 0 },
  }

  // Cooldowns
  private smashCooldown = 0
  private groundPoundCooldown = 0
  private tauntCooldown = 0
  private lastDamageTime = 0

  // Controls and movement
  private keys: Record<string, boolean> = {}
  private mobileKeys: Record<string, boolean> = {}
  private mouseX = 0
  private mouseY = 0
  private bulkVelocity = { x: 0, z: 0 }
  private walkCycle = 0

  // Minimap
  private minimapCanvas: HTMLCanvasElement | null = null
  private minimapCtx: CanvasRenderingContext2D | null = null

  // Audio
  private audio = new AudioManager()

  // Bound handlers
  private boundKeyDown: (e: KeyboardEvent) => void
  private boundKeyUp: (e: KeyboardEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundClick: () => void

  // Collapse intervals to clean up
  private collapseIntervals: ReturnType<typeof setInterval>[] = []

  constructor(container: HTMLElement, callbacks: RampageCallbacks) {
    super(container, {})
    this.rampageCallbacks = callbacks
    this.boundKeyDown = this.handleKeyDown.bind(this)
    this.boundKeyUp = this.handleKeyUp.bind(this)
    this.boundMouseMove = this.handleMouseMove.bind(this)
    this.boundClick = this.handleClick.bind(this)
  }

  // ─── Scene Setup ───────────────────────────────────────────────

  createScene(): void {
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 250)

    const cam = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000,
    )
    cam.position.set(0, 15, 30)
    this.camera = cam

    const isMobile = this.container.clientWidth < 768
    this.renderer.shadowMap.enabled = !isMobile

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, isMobile ? 0.8 : 0.6))

    const sun = new THREE.DirectionalLight(0xffffff, 1)
    sun.position.set(50, 100, 50)
    sun.castShadow = !isMobile
    sun.shadow.mapSize.width = 1024
    sun.shadow.mapSize.height = 1024
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 500
    sun.shadow.camera.left = -150
    sun.shadow.camera.right = 150
    sun.shadow.camera.top = 150
    sun.shadow.camera.bottom = -150
    this.scene.add(sun)

    const purpleLight = new THREE.PointLight(0x9b30ff, 0.5, 100)
    this.scene.add(purpleLight)

    this.createGround()
    this.createBulk()
    this.createCity()
    this.spawnCars()

    // Setup minimap
    this.minimapCanvas = document.createElement('canvas')
    this.minimapCanvas.width = 150
    this.minimapCanvas.height = 150
    this.minimapCtx = this.minimapCanvas.getContext('2d')

    // Audio
    this.audio.loadBGM(ASSET_PATHS.audio.bgm, 0.2)

    this.setupControls()
  }

  // ─── Ground ────────────────────────────────────────────────────

  private createGround(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
    for (let i = -250; i <= 250; i += 50) {
      const roadH = new THREE.Mesh(new THREE.PlaneGeometry(600, 12), roadMat)
      roadH.rotation.x = -Math.PI / 2
      roadH.position.set(0, 0.01, i)
      this.scene.add(roadH)

      const roadV = new THREE.Mesh(new THREE.PlaneGeometry(12, 600), roadMat)
      roadV.rotation.x = -Math.PI / 2
      roadV.position.set(i, 0.01, 0)
      this.scene.add(roadV)
    }
  }

  // ─── Bulk Character ────────────────────────────────────────────

  private createBulk(): void {
    this.bulk = new THREE.Group()
    this.bulk.position.set(0, 0, 0)
    this.scene.add(this.bulk)
    this.loadBulkModel()
  }

  private async loadBulkModel(): Promise<void> {
    try {
      const { scene: model, mixer } = await loadGLBModel(ASSET_PATHS.models.bulk, 8)
      if (this.disposed) return

      const scale = 1.25
      model.scale.multiplyScalar(scale)

      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      model.position.set(-center.x, -box.min.y, -center.z)

      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
        if (child.name && child.name.toLowerCase().includes('head')) {
          this.bulkParts.head = child
        }
      })
      if (!this.bulkParts.head) {
        this.bulkParts.head = model
      }

      this.bulkMixer = mixer

      if (mixer) {
        const clips = mixer.getRoot() as THREE.Object3D
        const animClips = (clips as unknown as { animations?: THREE.AnimationClip[] }).animations
        if (animClips && animClips.length > 0) {
          const attackAnim = animClips.find((a: THREE.AnimationClip) =>
            /attack|punch|smash|hit/i.test(a.name),
          )
          if (attackAnim) {
            this.attackAction = mixer.clipAction(attackAnim)
            this.attackAction.setLoop(THREE.LoopOnce, 1)
            this.attackAction.clampWhenFinished = true
          }
          const walkAnim = animClips.find((a: THREE.AnimationClip) =>
            /walk|run/i.test(a.name),
          )
          if (walkAnim) {
            this.walkAction = mixer.clipAction(walkAnim)
            this.walkAction.setLoop(THREE.LoopRepeat, Infinity)
          }
          const idleAnim = animClips.find((a: THREE.AnimationClip) =>
            /idle/i.test(a.name),
          )
          if (idleAnim) {
            this.idleAction = mixer.clipAction(idleAnim)
            this.idleAction.setLoop(THREE.LoopRepeat, Infinity)
            this.idleAction.play()
          }
        }
      }

      this.bulk.add(model)
      this.bulk.userData.model = model
      this.bulk.userData.isGLB = true

      const baseY = 0
      this.bulk.position.y = baseY
      this.bulk.userData.baseY = baseY
    } catch {
      this.createBulkFallback()
    }
  }

  private createBulkFallback(): void {
    const bulkGroup = new THREE.Group()
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9b30ff,
      roughness: 0.5,
      emissive: 0x4a0080,
      emissiveIntensity: 0.2,
    })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x6b0099, roughness: 0.5 })

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 2.5), mat)
    torso.position.y = 5
    torso.castShadow = true
    bulkGroup.add(torso)

    // Pecs
    const pecPositions: [number, number, number][] = [[-0.8, 5.5, 1.2], [0.8, 5.5, 1.2]]
    pecPositions.forEach((pos) => {
      const pec = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), mat)
      pec.position.set(pos[0], pos[1], pos[2])
      pec.scale.set(1.2, 0.8, 0.6)
      bulkGroup.add(pec)
    })

    // Waist
    const waist = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 2), darkMat)
    waist.position.y = 2.8
    waist.castShadow = true
    bulkGroup.add(waist)

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), mat)
    head.position.y = 7.8
    head.scale.set(0.9, 1, 0.85)
    head.castShadow = true
    bulkGroup.add(head)
    this.bulkParts.head = head

    // Brow
    const brow = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.5), mat)
    brow.position.set(0, 8.1, 0.6)
    brow.rotation.x = -0.3
    bulkGroup.add(brow)

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    const eyePositions: [number, number, number][] = [[-0.35, 7.9, 0.75], [0.35, 7.9, 0.75]]
    eyePositions.forEach((pos) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), eyeMat)
      eye.position.set(pos[0], pos[1], pos[2])
      bulkGroup.add(eye)
    })

    // Hair
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    for (let i = 0; i < 12; i++) {
      const hair = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.4 + Math.random() * 0.3, 4),
        hairMat,
      )
      const angle = (i / 12) * Math.PI * 2
      hair.position.set(
        Math.cos(angle) * 0.6,
        8.5 + Math.random() * 0.2,
        Math.sin(angle) * 0.5 - 0.2,
      )
      hair.rotation.set(Math.random() * 0.5 - 0.25, 0, Math.random() * 0.5 - 0.25)
      bulkGroup.add(hair)
    }

    // Shoulders
    const shoulderPositions: [number, number, number][] = [[-2.8, 6.2, 0], [2.8, 6.2, 0]]
    shoulderPositions.forEach((pos) => {
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), mat)
      shoulder.position.set(pos[0], pos[1], pos[2])
      shoulder.scale.set(1, 0.9, 0.8)
      shoulder.castShadow = true
      bulkGroup.add(shoulder)
    })

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.7, 0.9, 2.5, 8)
    const leftArm = new THREE.Mesh(armGeo, mat)
    leftArm.position.set(-3.2, 4.5, 0)
    leftArm.rotation.z = 0.3
    leftArm.castShadow = true
    bulkGroup.add(leftArm)
    this.bulkParts.leftArm = leftArm

    const rightArm = new THREE.Mesh(armGeo, mat)
    rightArm.position.set(3.2, 4.5, 0)
    rightArm.rotation.z = -0.3
    rightArm.castShadow = true
    bulkGroup.add(rightArm)
    this.bulkParts.rightArm = rightArm

    // Fists
    const fistGeo = new THREE.BoxGeometry(1, 1.2, 0.8)
    const leftFist = new THREE.Mesh(fistGeo, mat)
    leftFist.position.set(-4.2, 1.2, 0.8)
    leftFist.castShadow = true
    bulkGroup.add(leftFist)

    const rightFist = new THREE.Mesh(fistGeo, mat)
    rightFist.position.set(4.2, 1.2, 0.8)
    rightFist.castShadow = true
    bulkGroup.add(rightFist)

    // Legs
    const thighGeo = new THREE.CylinderGeometry(0.9, 0.7, 2.5, 8)
    const leftThigh = new THREE.Mesh(thighGeo, darkMat)
    leftThigh.position.set(-1, 1.5, 0)
    leftThigh.castShadow = true
    bulkGroup.add(leftThigh)
    this.bulkParts.leftThigh = leftThigh

    const rightThigh = new THREE.Mesh(thighGeo, darkMat)
    rightThigh.position.set(1, 1.5, 0)
    rightThigh.castShadow = true
    bulkGroup.add(rightThigh)
    this.bulkParts.rightThigh = rightThigh

    // Calves
    const calfPositions: [number, number, number][] = [[-1, -0.5, 0], [1, -0.5, 0]]
    calfPositions.forEach((pos) => {
      const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 2, 8), mat)
      calf.position.set(pos[0], pos[1], pos[2])
      calf.castShadow = true
      bulkGroup.add(calf)
    })

    // Feet
    const footPositions: [number, number, number][] = [[-1, -1.3, 0.3], [1, -1.3, 0.3]]
    footPositions.forEach((pos) => {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 1.4), mat)
      foot.position.set(pos[0], pos[1], pos[2])
      foot.castShadow = true
      bulkGroup.add(foot)
    })

    // Traps
    const traps = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.5, 1.2, 8), mat)
    traps.position.y = 6.8
    traps.castShadow = true
    bulkGroup.add(traps)

    // Replace bulk group
    this.scene.remove(this.bulk)
    this.bulk = bulkGroup
    const baseY = 1.5
    this.bulk.position.y = baseY
    this.bulk.userData.baseY = baseY
    this.bulk.userData.isGLB = false
    this.scene.add(this.bulk)
  }

  // ─── City Generation ───────────────────────────────────────────

  private createCity(): void {
    const colors = [0x666666, 0x888888, 0x555555, 0x777777, 0x996633, 0x446688]

    for (let x = -200; x <= 200; x += 30) {
      for (let z = -200; z <= 200; z += 30) {
        if (Math.abs(x) < 40 && Math.abs(z) < 40) continue

        const height = 8 + Math.random() * 30
        const width = 6 + Math.random() * 10
        const depth = 6 + Math.random() * 10

        const building = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, depth),
          new THREE.MeshStandardMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            roughness: 0.7,
          }),
        )
        building.position.set(
          x + (Math.random() - 0.5) * 15,
          height / 2,
          z + (Math.random() - 0.5) * 15,
        )
        building.castShadow = true
        building.receiveShadow = true

        // Windows
        const winMat = new THREE.MeshBasicMaterial({ color: 0xffff88 })
        for (let wy = -height / 2 + 2; wy < height / 2 - 1; wy += 2.5) {
          for (let wx = -width / 2 + 1; wx < width / 2 - 0.5; wx += 2) {
            if (Math.random() > 0.3) {
              const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), winMat)
              win.position.set(wx, wy, depth / 2 + 0.01)
              building.add(win)
            }
          }
        }

        const bData: BuildingData = {
          isBuilding: true,
          health: height * 15,
          maxHealth: height * 15,
          destroyed: false,
          height,
          width,
          depth,
        }
        building.userData = bData
        this.buildings.push(building)
        this.scene.add(building)
        this.totalBuildings++
      }
    }
  }

  // ─── Cars ──────────────────────────────────────────────────────

  private spawnCars(): void {
    const carColors = [0xff0000, 0x0000ff, 0xffff00, 0x00ff00, 0xffffff, 0x000000, 0xff6600]

    for (let i = 0; i < 50; i++) {
      const carGroup = new THREE.Group()
      const color = carColors[Math.floor(Math.random() * carColors.length)]

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.8, 4),
        new THREE.MeshStandardMaterial({ color, metalness: 0.3 }),
      )
      body.position.y = 0.6
      body.castShadow = true
      carGroup.add(body)

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.6, 2),
        new THREE.MeshStandardMaterial({ color: 0x333333 }),
      )
      cabin.position.y = 1.2
      carGroup.add(cabin)

      const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8)
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 })
      const wheelPositions: [number, number, number][] = [
        [-0.9, 0.3, 1.2], [0.9, 0.3, 1.2], [-0.9, 0.3, -1.2], [0.9, 0.3, -1.2],
      ]
      wheelPositions.forEach((pos) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat)
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(pos[0], pos[1], pos[2])
        carGroup.add(wheel)
      })

      const road = Math.floor(Math.random() * 10) - 5
      const isHorizontal = Math.random() > 0.5
      if (isHorizontal) {
        carGroup.position.set(
          Math.random() * 400 - 200,
          0,
          road * 50 + (Math.random() - 0.5) * 4,
        )
      } else {
        carGroup.rotation.y = Math.PI / 2
        carGroup.position.set(
          road * 50 + (Math.random() - 0.5) * 4,
          0,
          Math.random() * 400 - 200,
        )
      }

      const cData: CarData = { isCar: true, health: 50, destroyed: false, points: 150, xp: 15 }
      carGroup.userData = cData
      this.cars.push(carGroup)
      this.scene.add(carGroup)
    }
  }

  // ─── Civilians ─────────────────────────────────────────────────

  private spawnCivilian(): void {
    if (this.civilians.length >= 20) return

    const civGroup = new THREE.Group()
    const skinColors = [0xffcc99, 0x8b5a2b, 0xffd699]
    const skinColor = skinColors[Math.floor(Math.random() * 3)]
    const shirtColor = Math.random() * 0xffffff

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.3, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: shirtColor }),
    )
    body.position.y = 0.9
    civGroup.add(body)

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshStandardMaterial({ color: skinColor }),
    )
    head.position.y = 1.7
    civGroup.add(head)

    const angle = Math.random() * Math.PI * 2
    const dist = 40 + Math.random() * 60
    civGroup.position.set(
      this.bulk.position.x + Math.cos(angle) * dist,
      0,
      this.bulk.position.z + Math.sin(angle) * dist,
    )

    const cData: CivilianData = {
      isCivilian: true,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        0,
        (Math.random() - 0.5) * 0.1,
      ),
      panicTimer: 0,
    }
    civGroup.userData = cData
    this.civilians.push(civGroup)
    this.scene.add(civGroup)
  }

  // ─── Enemies ───────────────────────────────────────────────────

  private spawnEnemy(): void {
    const availableTypes = ENEMY_TYPES.filter(
      (_, i) => i <= Math.min(this.wave, ENEMY_TYPES.length - 1),
    )
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)]

    let spawnX = 0
    let spawnZ = 0
    let validSpawn = false
    let attempts = 0

    while (!validSpawn && attempts < 20) {
      const angle = Math.random() * Math.PI * 2
      const distance = 70 + Math.random() * 40
      spawnX = this.bulk.position.x + Math.cos(angle) * distance
      spawnZ = this.bulk.position.z + Math.sin(angle) * distance

      validSpawn = true
      for (const building of this.buildings) {
        const bd = building.userData as BuildingData
        if (bd.destroyed) continue
        const bw = bd.width / 2 + 3
        const bDepth = bd.depth / 2 + 3
        if (
          spawnX > building.position.x - bw &&
          spawnX < building.position.x + bw &&
          spawnZ > building.position.z - bDepth &&
          spawnZ < building.position.z + bDepth
        ) {
          validSpawn = false
          break
        }
      }
      attempts++
    }

    if (!validSpawn) return

    let enemyMesh: THREE.Object3D

    if (type.name === 'TANK') {
      const g = new THREE.Group()
      const tankBody = new THREE.Mesh(
        new THREE.BoxGeometry(3, 1.5, 4),
        new THREE.MeshStandardMaterial({ color: type.color }),
      )
      tankBody.castShadow = true
      g.add(tankBody)
      const turret = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 1, 8),
        new THREE.MeshStandardMaterial({ color: type.color }),
      )
      turret.position.y = 1
      g.add(turret)
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 2, 8),
        new THREE.MeshStandardMaterial({ color: 0x333333 }),
      )
      barrel.rotation.x = Math.PI / 2
      barrel.position.set(0, 1, 1.5)
      g.add(barrel)
      enemyMesh = g
    } else if (type.name === 'RED BARON' || type.name === 'HELICOPTER') {
      const g = new THREE.Group()
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 3, 8),
        new THREE.MeshStandardMaterial({ color: type.color }),
      )
      body.rotation.x = Math.PI / 2
      g.add(body)
      if (type.name === 'RED BARON') {
        const wing = new THREE.Mesh(
          new THREE.BoxGeometry(5, 0.1, 1),
          new THREE.MeshStandardMaterial({ color: type.color }),
        )
        g.add(wing)
      } else {
        const rotor = new THREE.Mesh(
          new THREE.BoxGeometry(4, 0.05, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x666666 }),
        )
        rotor.position.y = 0.5
        g.add(rotor)
      }
      g.position.y = 15 + Math.random() * 10
      enemyMesh = g
    } else if (type.name === 'ZEUS') {
      const g = new THREE.Group()
      const zeusBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1, 4, 8),
        new THREE.MeshStandardMaterial({
          color: type.color,
          emissive: 0xffff00,
          emissiveIntensity: 0.5,
        }),
      )
      g.add(zeusBody)
      const zeusHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffcc99 }),
      )
      zeusHead.position.y = 2.5
      g.add(zeusHead)
      g.position.y = 10
      enemyMesh = g
    } else if (type.name === 'NINJA') {
      const g = new THREE.Group()
      const ninjaBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 1.8, 8),
        new THREE.MeshStandardMaterial({ color: type.color }),
      )
      g.add(ninjaBody)
      const ninjaHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshStandardMaterial({ color: type.color }),
      )
      ninjaHead.position.y = 1.2
      g.add(ninjaHead)
      enemyMesh = g
    } else {
      const g = new THREE.Group()
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 2, 8),
        new THREE.MeshStandardMaterial({ color: type.color }),
      )
      g.add(body)
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffcc99 }),
      )
      head.position.y = 1.3
      g.add(head)
      enemyMesh = g
    }

    enemyMesh.position.x = spawnX
    enemyMesh.position.z = spawnZ
    if (enemyMesh.position.y === 0) enemyMesh.position.y = 1

    const waveMultiplier = 1 + (this.wave - 1) * 0.15
    const eData: EnemyData = {
      type: {
        ...type,
        health: type.health * waveMultiplier,
        damage: type.damage * waveMultiplier,
      },
      health: type.health * waveMultiplier,
      maxHealth: type.health * waveMultiplier,
      shootCooldown: Math.random() * 60,
      isEnemy: true,
    }
    enemyMesh.userData = eData

    this.enemies.push(enemyMesh)
    this.scene.add(enemyMesh)
    this.enemiesThisWave++
  }

  // ─── Boss ──────────────────────────────────────────────────────

  private spawnBoss(): void {
    const bossType = BOSS_TYPES[
      Math.min(Math.floor((this.wave - 5) / 5), BOSS_TYPES.length - 1)
    ]

    const bossGroup = new THREE.Group()

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(8, 4, 12),
      new THREE.MeshStandardMaterial({ color: bossType.color, metalness: 0.5 }),
    )
    body.castShadow = true
    bossGroup.add(body)

    for (let i = -1; i <= 1; i++) {
      const turret = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 2, 8),
        new THREE.MeshStandardMaterial({ color: 0x333333 }),
      )
      turret.position.set(i * 3, 3, 0)
      bossGroup.add(turret)

      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 3, 8),
        new THREE.MeshStandardMaterial({ color: 0x222222 }),
      )
      barrel.rotation.x = Math.PI / 2
      barrel.position.set(i * 3, 3, 2)
      bossGroup.add(barrel)
    }

    const angle = Math.random() * Math.PI * 2
    bossGroup.position.set(
      this.bulk.position.x + Math.cos(angle) * 80,
      2,
      this.bulk.position.z + Math.sin(angle) * 80,
    )

    const waveMultiplier = 1 + (this.wave - 5) * 0.2
    const bData: EnemyData = {
      isBoss: true,
      type: { ...bossType, speed: 0.04, xp: bossType.xp },
      health: bossType.health * waveMultiplier,
      maxHealth: bossType.health * waveMultiplier,
      shootCooldown: 0,
      isEnemy: true,
      phase: 1,
    }
    bossGroup.userData = bData

    this.currentBoss = bossGroup
    this.bossActive = true
    this.enemies.push(bossGroup)
    this.scene.add(bossGroup)

    this.rampageCallbacks.onBossChange?.({
      name: bossType.name,
      healthPercent: 100,
    })
    this.rampageCallbacks.onAnnouncement?.(`WARNING: ${bossType.name}`, 'kill-streak')
  }

  // ─── Powerups ──────────────────────────────────────────────────

  private spawnPowerup(): void {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]

    const group = new THREE.Group()

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 16, 16),
      new THREE.MeshBasicMaterial({ color: type.color, transparent: true, opacity: 0.8 }),
    )
    group.add(orb)

    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: type.color, transparent: true, opacity: 0.2 }),
    )
    group.add(aura)

    const angle = Math.random() * Math.PI * 2
    const dist = 30 + Math.random() * 50
    group.position.set(
      this.bulk.position.x + Math.cos(angle) * dist,
      2,
      this.bulk.position.z + Math.sin(angle) * dist,
    )

    const pData: PowerupObjData = {
      type,
      bobOffset: Math.random() * Math.PI * 2,
      isPowerup: true,
    }
    group.userData = pData
    this.powerups.push(group)
    this.scene.add(group)
  }

  private collectPowerup(powerup: THREE.Group): void {
    const pData = powerup.userData as PowerupObjData
    const type = pData.type

    if (type.name === 'health') {
      this.bulkHealth = Math.min(this.maxHealth, this.bulkHealth + 50)
      this.emitFloatingText(this.bulk.position, '+50 HP', 'heal')
      this.rampageCallbacks.onScreenFlash?.('heal')
    } else if (type.name === 'nuke') {
      const toRemove: THREE.Object3D[] = []
      this.enemies.forEach((enemy) => {
        const ed = enemy.userData as EnemyData
        if (!ed.isBoss) {
          this.createExplosion(enemy.position, ed.type?.color ?? 0xff6600, 15)
          this.addScore(ed.type?.points ?? 100)
          this.addXP(ed.type?.xp ?? 10)
          toRemove.push(enemy)
        }
      })
      toRemove.forEach((e) => {
        this.scene.remove(e)
      })
      this.enemies = this.enemies.filter((e) => (e.userData as EnemyData).isBoss)
      this.rampageCallbacks.onAnnouncement?.('NUCLEAR STRIKE!', 'power-up')
      this.rampageCallbacks.onScreenFlash?.('levelup')
    } else {
      this.powerupStates[type.name].active = true
      this.powerupStates[type.name].timer = type.duration
      this.rampageCallbacks.onAnnouncement?.(`${type.name.toUpperCase()}!`, 'power-up')
      if (type.name === 'schmeg') this.rampageCallbacks.onScreenFlash?.('schmeg')
    }

    this.addScore(500)
    this.rampageCallbacks.onPowerupChange?.({ ...this.powerupStates })
  }

  // ─── Explosions & Particles ────────────────────────────────────

  private createExplosion(position: THREE.Vector3, color = 0xff6600, count = 20): void {
    for (let i = 0; i < count; i++) {
      const size = 0.2 + Math.random() * 0.3
      const particle = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshBasicMaterial({ color }),
      )
      particle.position.copy(position)
      const pData: ParticleData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          Math.random() * 0.6,
          (Math.random() - 0.5) * 0.6,
        ),
        lifetime: 40 + Math.random() * 20,
      }
      particle.userData = pData
      this.particles.push(particle)
      this.scene.add(particle)
    }
  }

  private createProjectile(enemy: THREE.Object3D): void {
    const ed = enemy.userData as EnemyData
    const isBoss = ed.isBoss
    const projectile = new THREE.Mesh(
      new THREE.SphereGeometry(isBoss ? 0.5 : 0.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: isBoss ? 0xff0000 : 0xffff00 }),
    )

    projectile.position.copy(enemy.position)

    const target = new THREE.Vector3(
      this.bulk.position.x,
      this.bulk.position.y + 4,
      this.bulk.position.z,
    )
    const direction = target.clone().sub(projectile.position).normalize()

    const prData: ProjectileData = {
      velocity: direction.multiplyScalar(isBoss ? 0.8 : 0.5),
      damage: ed.type?.damage ?? 20,
      lifetime: 200,
    }
    projectile.userData = prData
    this.projectiles.push(projectile)
    this.scene.add(projectile)
  }

  // ─── Floating Text Helper ──────────────────────────────────────

  private emitFloatingText(position: THREE.Vector3, text: string, type: string): void {
    const screenPos = position.clone().project(this.camera)
    const x = (screenPos.x + 1) / 2 * this.container.clientWidth
    const y = (-screenPos.y + 1) / 2 * this.container.clientHeight
    this.rampageCallbacks.onFloatingText?.(x, y, text, type)
  }

  // ─── Score / XP / Combo ────────────────────────────────────────

  private addScore(points: number): number {
    const multiplier = 1 + this.combo * 0.1
    const finalPoints = Math.floor(
      points * multiplier * (this.powerupStates.schmeg.active ? 2 : 1),
    )
    this.score += finalPoints
    this.rampageCallbacks.onScoreChange?.(this.score)
    return finalPoints
  }

  private addXP(amount: number): void {
    this.xp += amount * (this.powerupStates.schmeg.active ? 2 : 1)
    if (this.xp >= this.xpToLevel) {
      this.levelUp()
    }
    this.rampageCallbacks.onXPChange?.(this.xp, this.xpToLevel)
  }

  private levelUp(): void {
    this.level++
    this.xp -= this.xpToLevel
    this.xpToLevel = Math.floor(this.xpToLevel * 1.5)
    this.maxHealth += 10
    this.bulkHealth = Math.min(this.bulkHealth + 25, this.maxHealth)

    this.rampageCallbacks.onLevelChange?.(this.level)
    this.rampageCallbacks.onAnnouncement?.(`LEVEL ${this.level}!`, 'power-up')
    this.emitFloatingText(this.bulk.position, 'LEVEL UP!', 'levelup')
    this.rampageCallbacks.onScreenFlash?.('levelup')
    this.rampageCallbacks.onHealthChange?.(this.bulkHealth, this.maxHealth)
  }

  private addCombo(): void {
    this.combo++
    this.comboTimer = 180
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo
      this.rampageCallbacks.onMaxComboChange?.(this.maxCombo)
    }
    this.rampageCallbacks.onComboChange?.(this.combo, 1 + this.combo * 0.1)

    if (this.combo === 10) this.rampageCallbacks.onAnnouncement?.('COMBO x10!', 'combo')
    if (this.combo === 25) this.rampageCallbacks.onAnnouncement?.('COMBO x25!', 'combo')
    if (this.combo === 50) this.rampageCallbacks.onAnnouncement?.('COMBO x50!', 'combo')
    if (this.combo === 100) this.rampageCallbacks.onAnnouncement?.('COMBO x100!', 'combo')
  }

  private resetCombo(): void {
    this.combo = 0
    this.comboTimer = 0
    this.rampageCallbacks.onComboChange?.(0, 1)
  }

  private updateWantedLevel(): void {
    const newLevel = Math.min(5, 1 + Math.floor(this.totalKills / 20))
    if (newLevel !== this.wantedLevel) {
      this.wantedLevel = newLevel
      this.rampageCallbacks.onWantedLevelChange?.(this.wantedLevel)
      if (this.wantedLevel > 1) {
        this.rampageCallbacks.onAnnouncement?.(`WANTED LEVEL ${this.wantedLevel}!`, 'kill-streak')
      }
    }
  }

  // ─── Combat Actions ────────────────────────────────────────────

  performSmash(): void {
    if (!this.gameStarted || this.gameOver) return
    if (this.smashCooldown > 0) return

    this.smashCooldown = this.powerupStates.schmeg.active ? 15 : 30

    const smashRange = this.powerupStates.schmeg.active ? 20 : this.rageMode ? 15 : 12
    const smashDamage = this.powerupStates.schmeg.active ? 200 : this.rageMode ? 120 : 60

    this.playAttackAnimation()

    const texts = ['BULK SMASH!', 'GRAAAH!', 'PURPLE RAGE!', 'BULK ANGRY!']
    this.emitFloatingText(
      this.bulk.position,
      texts[Math.floor(Math.random() * texts.length)],
      'combo',
    )

    // Ground crack effect
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const crack = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.2, 2 + Math.random()),
        new THREE.MeshBasicMaterial({ color: 0x9b30ff }),
      )
      crack.position.copy(this.bulk.position)
      crack.position.y = 0.1
      crack.rotation.y = angle
      const pd: ParticleData = {
        velocity: new THREE.Vector3(Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3),
        lifetime: 25,
      }
      crack.userData = pd
      this.particles.push(crack)
      this.scene.add(crack)
    }

    // Dust ring
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2
      const dust = new THREE.Mesh(
        new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.7 }),
      )
      dust.position.set(
        this.bulk.position.x + Math.cos(angle) * 3,
        0.5,
        this.bulk.position.z + Math.sin(angle) * 3,
      )
      const pd: ParticleData = {
        velocity: new THREE.Vector3(Math.cos(angle) * 0.2, 0.1, Math.sin(angle) * 0.2),
        lifetime: 30,
      }
      dust.userData = pd
      this.particles.push(dust)
      this.scene.add(dust)
    }

    // Damage buildings
    this.buildings.forEach((building) => {
      const bd = building.userData as BuildingData
      if (bd.destroyed) return
      const dist = this.bulk.position.distanceTo(building.position)
      if (dist < smashRange + 5) {
        const damage = smashDamage * (1 - dist / (smashRange + 5))
        bd.health -= damage
        if (bd.health <= 0) {
          this.destroyBuilding(building)
        } else {
          building.position.x += (Math.random() - 0.5) * 0.3
          building.position.z += (Math.random() - 0.5) * 0.3
        }
      }
    })

    // Damage enemies
    const enemiesToKill: number[] = []
    this.enemies.forEach((enemy, idx) => {
      const dist = this.bulk.position.distanceTo(enemy.position)
      if (dist < smashRange) {
        const ed = enemy.userData as EnemyData
        const damage = smashDamage * (1 - dist / smashRange)
        ed.health -= damage
        this.emitFloatingText(enemy.position, `-${Math.floor(damage)}`, 'damage')
        if (ed.health <= 0) {
          enemiesToKill.push(idx)
        }
      }
    })
    // Kill in reverse order to maintain index validity
    for (let i = enemiesToKill.length - 1; i >= 0; i--) {
      this.killEnemy(enemiesToKill[i])
    }

    // Damage cars
    const carsToDestroy: number[] = []
    this.cars.forEach((car, idx) => {
      const cd = car.userData as CarData
      if (cd.destroyed) return
      const dist = this.bulk.position.distanceTo(car.position)
      if (dist < smashRange) {
        carsToDestroy.push(idx)
      }
    })
    for (let i = carsToDestroy.length - 1; i >= 0; i--) {
      this.destroyCar(carsToDestroy[i])
    }

    // Screen shake
    this.camera.position.x += (Math.random() - 0.5) * 3
    this.camera.position.y += (Math.random() - 0.5) * 2

    this.rampageCallbacks.onScreenFlash?.('damage')
    this.audio.synthTone(100, 0.3, 'sawtooth', 0.2)
  }

  performGroundPound(): void {
    if (!this.gameStarted || this.gameOver) return
    if (this.groundPoundCooldown > 0) return
    this.groundPoundCooldown = 120

    this.rampageCallbacks.onAnnouncement?.('GROUND POUND!', 'kill-streak')

    const range = 25
    const damage = 150

    // Shockwave particles
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2
      const particle = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.5, 1),
        new THREE.MeshBasicMaterial({ color: 0x9b30ff }),
      )
      particle.position.copy(this.bulk.position)
      particle.position.y = 0.5
      const pd: ParticleData = {
        velocity: new THREE.Vector3(Math.cos(angle) * 0.5, 0.2, Math.sin(angle) * 0.5),
        lifetime: 30,
      }
      particle.userData = pd
      this.particles.push(particle)
      this.scene.add(particle)
    }

    // Damage enemies
    const enemiesToKill: number[] = []
    this.enemies.forEach((enemy, idx) => {
      const dist = this.bulk.position.distanceTo(enemy.position)
      if (dist < range) {
        const ed = enemy.userData as EnemyData
        ed.health -= damage
        if (ed.health <= 0) enemiesToKill.push(idx)
      }
    })
    for (let i = enemiesToKill.length - 1; i >= 0; i--) {
      this.killEnemy(enemiesToKill[i])
    }

    // Damage buildings
    this.buildings.forEach((building) => {
      const bd = building.userData as BuildingData
      if (bd.destroyed) return
      const dist = this.bulk.position.distanceTo(building.position)
      if (dist < range) {
        bd.health -= damage
        if (bd.health <= 0) this.destroyBuilding(building)
      }
    })

    // Damage cars
    const carsToDestroy: number[] = []
    this.cars.forEach((car, idx) => {
      const cd = car.userData as CarData
      if (cd.destroyed) return
      const dist = this.bulk.position.distanceTo(car.position)
      if (dist < range) carsToDestroy.push(idx)
    })
    for (let i = carsToDestroy.length - 1; i >= 0; i--) {
      this.destroyCar(carsToDestroy[i])
    }

    this.camera.position.y += 5
    this.audio.synthSweep(200, 50, 0.4, 'sawtooth', 0.3)
  }

  performTaunt(): void {
    if (!this.gameStarted || this.gameOver) return
    if (this.tauntCooldown > 0) return
    this.tauntCooldown = 180

    const taunts = ['BULK IS STRONGEST!', 'COME AT BULK!', 'BULK UNSTOPPABLE!', 'PUNY HUMANS!']
    this.rampageCallbacks.onAnnouncement?.(
      taunts[Math.floor(Math.random() * taunts.length)],
      'power-up',
    )

    this.addScore(100)
    this.rage = Math.min(100, this.rage + 20)
    this.rampageCallbacks.onRageChange?.(this.rage)

    this.enemies.forEach((enemy) => {
      const ed = enemy.userData as EnemyData
      ed.shootCooldown = 0
    })
  }

  setRageMode(active: boolean): void {
    if (active && this.rage > 0) {
      this.mobileKeys['ShiftLeft'] = true
    } else {
      this.mobileKeys['ShiftLeft'] = false
    }
  }

  // ─── Attack Animation ──────────────────────────────────────────

  private playAttackAnimation(): void {
    if (this.bulkMixer && this.attackAction) {
      if (this.walkAction) this.walkAction.stop()
      if (this.idleAction) this.idleAction.stop()
      this.attackAction.reset().play()
      this.currentAnimation = 'attack'
      const duration = this.attackAction.getClip().duration || 1
      setTimeout(() => {
        if (this.idleAction) {
          this.idleAction.play()
          this.currentAnimation = 'idle'
        }
      }, duration * 1000)
    } else if (this.bulk.userData.isGLB && this.bulk.userData.model) {
      this.animateGLBAttack()
    } else {
      this.animatePrimitiveAttack()
    }
  }

  private animateGLBAttack(): void {
    const model = this.bulk.userData.model as THREE.Object3D
    if (!model) return

    const originalRotation = model.rotation.clone()
    const originalPosition = model.position.clone()
    const originalScale = model.scale.clone()

    const spinDuration = 0.8
    const totalRotations = 3
    const startTime = Date.now()

    const animate = () => {
      if (this.disposed) return
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min(elapsed / spinDuration, 1)

      const rotationY = progress * totalRotations * Math.PI * 2
      model.rotation.y = originalRotation.y + rotationY
      model.rotation.x = originalRotation.x
      model.rotation.z = originalRotation.z
      model.position.y = originalPosition.y
      model.scale.copy(originalScale)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        model.position.copy(originalPosition)
        model.rotation.copy(originalRotation)
        model.scale.copy(originalScale)
      }
    }
    animate()
  }

  private animatePrimitiveAttack(): void {
    const originalRotationY = this.bulk.rotation.y
    const originalRotationX = this.bulk.rotation.x
    const originalRotationZ = this.bulk.rotation.z
    const originalScale = this.bulk.scale.clone()
    const originalBulkY = this.bulk.position.y

    const spinDuration = 0.8
    const totalRotations = 3
    const startTime = Date.now()

    const animate = () => {
      if (this.disposed) return
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min(elapsed / spinDuration, 1)

      const rotationY = progress * totalRotations * Math.PI * 2
      this.bulk.rotation.y = originalRotationY + rotationY
      this.bulk.rotation.x = originalRotationX
      this.bulk.rotation.z = originalRotationZ
      this.bulk.position.y = originalBulkY
      this.bulk.scale.copy(originalScale)

      if (this.bulkParts.leftArm && this.bulkParts.rightArm) {
        const armSpin = progress * totalRotations * Math.PI * 2
        this.bulkParts.leftArm.rotation.y = armSpin
        this.bulkParts.rightArm.rotation.y = -armSpin
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        this.bulk.position.y = originalBulkY
        this.bulk.rotation.y = originalRotationY
        this.bulk.rotation.x = originalRotationX
        this.bulk.rotation.z = originalRotationZ
        this.bulk.scale.copy(originalScale)
        if (this.bulkParts.leftArm) {
          this.bulkParts.leftArm.rotation.y = 0
          this.bulkParts.leftArm.rotation.z = 0.3
        }
        if (this.bulkParts.rightArm) {
          this.bulkParts.rightArm.rotation.y = 0
          this.bulkParts.rightArm.rotation.z = -0.3
        }
      }
    }
    animate()
  }

  // ─── Destruction ───────────────────────────────────────────────

  private destroyBuilding(building: THREE.Mesh): void {
    const bd = building.userData as BuildingData
    if (bd.destroyed) return
    bd.destroyed = true
    this.destroyedBuildings++

    const points = this.addScore(Math.floor(bd.maxHealth))
    this.addXP(Math.floor(bd.maxHealth / 10))
    this.addCombo()

    this.emitFloatingText(building.position, `+${points}`, 'score')
    this.createExplosion(building.position, 0x888888, 40)

    const interval = setInterval(() => {
      building.scale.y *= 0.85
      building.position.y = building.scale.y * bd.height / 2
      if (building.scale.y < 0.1) {
        clearInterval(interval)
        this.scene.remove(building)
        const idx = this.collapseIntervals.indexOf(interval)
        if (idx >= 0) this.collapseIntervals.splice(idx, 1)
      }
    }, 40)
    this.collapseIntervals.push(interval)

    this.destruction = Math.floor((this.destroyedBuildings / this.totalBuildings) * 100)
    this.rampageCallbacks.onDestructionChange?.(this.destruction)
    this.rampageCallbacks.onDestroyedBuildingsChange?.(this.destroyedBuildings)
  }

  private destroyCar(idx: number): void {
    const car = this.cars[idx]
    if (!car) return
    const cd = car.userData as CarData
    cd.destroyed = true

    const points = this.addScore(cd.points)
    this.addXP(cd.xp)
    this.addCombo()

    this.emitFloatingText(car.position, `+${points}`, 'score')
    this.createExplosion(car.position, 0xff6600, 25)

    this.disposeObject(car)
    this.cars.splice(idx, 1)
  }

  private killEnemy(idx: number): void {
    const enemy = this.enemies[idx]
    if (!enemy) return
    const ed = enemy.userData as EnemyData
    const type = ed.type

    if (ed.isBoss) {
      this.bossActive = false
      this.currentBoss = null
      this.rampageCallbacks.onBossChange?.(null)
      this.rampageCallbacks.onAnnouncement?.('BOSS DEFEATED!', 'achievement')
    }

    const points = this.addScore(type?.points ?? 100)
    this.addXP(type?.xp ?? 10)
    this.addCombo()
    this.totalKills++
    this.enemiesKilledThisWave++

    this.emitFloatingText(enemy.position, `+${points}`, 'score')
    this.createExplosion(enemy.position, type?.color ?? 0xff6600, 20)

    this.disposeObject(enemy)
    this.enemies.splice(idx, 1)

    this.updateWantedLevel()
    this.rampageCallbacks.onTotalKillsChange?.(this.totalKills)

    if (this.totalKills % 10 === 0) {
      this.rampageCallbacks.onAnnouncement?.(`${this.totalKills} KILLS!`, 'kill-streak')
    }
  }

  // ─── Update Functions ──────────────────────────────────────────

  private updateBulk(): void {
    const baseSpeed = 0.12
    const speed =
      baseSpeed *
      (this.powerupStates.speed.active ? 1.5 : 1) *
      (this.rageMode ? 1.3 : 1) *
      (this.powerupStates.schmeg.active ? 1.2 : 1)
    let isMoving = false

    if (this.keys['KeyW'] || this.keys['ArrowUp'] || this.mobileKeys['KeyW']) {
      this.bulkVelocity.z -= speed
      isMoving = true
    }
    if (this.keys['KeyS'] || this.keys['ArrowDown'] || this.mobileKeys['KeyS']) {
      this.bulkVelocity.z += speed
      isMoving = true
    }
    if (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.mobileKeys['KeyA']) {
      this.bulkVelocity.x -= speed
      isMoving = true
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight'] || this.mobileKeys['KeyD']) {
      this.bulkVelocity.x += speed
      isMoving = true
    }

    this.bulk.position.x += this.bulkVelocity.x
    this.bulk.position.z += this.bulkVelocity.z

    // Building collision
    const bulkRadius = 3
    this.buildings.forEach((building) => {
      const bd = building.userData as BuildingData
      if (bd.destroyed) return

      const bw = bd.width / 2 + bulkRadius
      const bDepth = bd.depth / 2 + bulkRadius
      const bx = building.position.x
      const bz = building.position.z

      if (
        this.bulk.position.x > bx - bw &&
        this.bulk.position.x < bx + bw &&
        this.bulk.position.z > bz - bDepth &&
        this.bulk.position.z < bz + bDepth
      ) {
        const overlapLeft = (bx - bw) - this.bulk.position.x
        const overlapRight = this.bulk.position.x - (bx + bw)
        const overlapBack = (bz - bDepth) - this.bulk.position.z
        const overlapFront = this.bulk.position.z - (bz + bDepth)

        const minOverlapX =
          Math.abs(overlapLeft) < Math.abs(overlapRight) ? overlapLeft : overlapRight
        const minOverlapZ =
          Math.abs(overlapBack) < Math.abs(overlapFront) ? overlapBack : overlapFront

        if (Math.abs(minOverlapX) < Math.abs(minOverlapZ)) {
          this.bulk.position.x += minOverlapX
          this.bulkVelocity.x = 0
          if (Math.abs(this.bulkVelocity.z) > 0.1 || this.rageMode) {
            bd.health -= this.rageMode ? 15 : 5
            if (bd.health <= 0) this.destroyBuilding(building)
            else {
              building.position.x += (Math.random() - 0.5) * 0.2
              building.position.z += (Math.random() - 0.5) * 0.2
            }
          }
        } else {
          this.bulk.position.z += minOverlapZ
          this.bulkVelocity.z = 0
          if (Math.abs(this.bulkVelocity.x) > 0.1 || this.rageMode) {
            bd.health -= this.rageMode ? 15 : 5
            if (bd.health <= 0) this.destroyBuilding(building)
            else {
              building.position.x += (Math.random() - 0.5) * 0.2
              building.position.z += (Math.random() - 0.5) * 0.2
            }
          }
        }
      }
    })

    // Car collision
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i]
      const cd = car.userData as CarData
      if (cd.destroyed) continue
      const dist = this.bulk.position.distanceTo(car.position)
      if (dist < 4) {
        if (this.rageMode || this.powerupStates.schmeg.active) {
          this.destroyCar(i)
        } else {
          const pushDir = new THREE.Vector3()
            .subVectors(car.position, this.bulk.position)
            .normalize()
          car.position.x += pushDir.x * 0.5
          car.position.z += pushDir.z * 0.5
          cd.health -= 10
          if (cd.health <= 0) this.destroyCar(i)
        }
      }
    }

    this.bulkVelocity.x *= 0.85
    this.bulkVelocity.z *= 0.85

    // World boundaries
    const worldBound = 280
    this.bulk.position.x = Math.max(-worldBound, Math.min(worldBound, this.bulk.position.x))
    this.bulk.position.z = Math.max(-worldBound, Math.min(worldBound, this.bulk.position.z))

    // Footstep particles
    if (isMoving && Math.random() < 0.1) {
      const foot = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0x666666 }),
      )
      foot.position.set(
        this.bulk.position.x + (Math.random() - 0.5) * 2,
        0.1,
        this.bulk.position.z + (Math.random() - 0.5) * 2,
      )
      const pd: ParticleData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          0.05,
          (Math.random() - 0.5) * 0.05,
        ),
        lifetime: 20,
      }
      foot.userData = pd
      this.particles.push(foot)
      this.scene.add(foot)
    }

    // Walk animation (primitive model)
    if (!this.bulk.userData.isGLB) {
      if (isMoving) {
        this.walkCycle += 0.12
        const swing = Math.sin(this.walkCycle) * 0.4
        if (this.bulkParts.leftArm) this.bulkParts.leftArm.rotation.x = swing
        if (this.bulkParts.rightArm) this.bulkParts.rightArm.rotation.x = -swing
        if (this.bulkParts.leftThigh) this.bulkParts.leftThigh.rotation.x = swing * 0.5
        if (this.bulkParts.rightThigh) this.bulkParts.rightThigh.rotation.x = -swing * 0.5
        const baseY = (this.bulk.userData.baseY as number) ?? 1.5
        this.bulk.position.y = baseY + Math.abs(Math.sin(this.walkCycle * 2)) * 0.2
      } else {
        const baseY = (this.bulk.userData.baseY as number) ?? 2.0
        this.bulk.position.y = baseY + Math.sin(Date.now() * 0.002) * 0.1
      }
    } else {
      // GLB idle bob
      if (!isMoving) {
        const baseY = (this.bulk.userData.baseY as number) ?? 4.0
        this.bulk.position.y = baseY + Math.sin(Date.now() * 0.002) * 0.1
      } else {
        const baseY = (this.bulk.userData.baseY as number) ?? 4.0
        this.walkCycle += 0.12
        this.bulk.position.y = baseY + Math.abs(Math.sin(this.walkCycle * 2)) * 0.2
      }
    }

    // Facing direction
    if (Math.abs(this.bulkVelocity.x) > 0.01 || Math.abs(this.bulkVelocity.z) > 0.01) {
      const target = Math.atan2(this.bulkVelocity.x, this.bulkVelocity.z)
      this.bulk.rotation.y = THREE.MathUtils.lerp(this.bulk.rotation.y, target, 0.1)
    }

    // Rage mode
    if (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.mobileKeys['ShiftLeft']) {
      if (this.rage > 0) {
        this.rageMode = true
        this.rage -= this.powerupStates.schmeg.active ? 0.15 : 0.4

        if (Math.random() > 0.7) {
          const p = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xff00ff }),
          )
          p.position.copy(this.bulk.position)
          p.position.y += Math.random() * 8
          const pd: ParticleData = {
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 0.2,
              0.2,
              (Math.random() - 0.5) * 0.2,
            ),
            lifetime: 30,
          }
          p.userData = pd
          this.particles.push(p)
          this.scene.add(p)
        }
      } else {
        this.rageMode = false
      }
    } else {
      this.rageMode = false
      this.rage = Math.min(100, this.rage + 0.08)
    }

    // Key-triggered abilities
    if (this.keys['Space'] && this.smashCooldown <= 0) this.performSmash()
    if (this.keys['KeyE']) this.performGroundPound()
    if (this.keys['KeyR']) this.performTaunt()

    if (this.smashCooldown > 0) this.smashCooldown--
    if (this.groundPoundCooldown > 0) this.groundPoundCooldown--
    if (this.tauntCooldown > 0) this.tauntCooldown--

    // Scale pulse in rage/schmeg
    if (this.rageMode || this.powerupStates.schmeg.active) {
      const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.08
      this.bulk.scale.set(pulse, pulse, pulse)
    } else {
      this.bulk.scale.set(1, 1, 1)
    }

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer--
      if (this.comboTimer <= 0) this.resetCombo()
    }

    // Emit state updates
    this.rampageCallbacks.onRageChange?.(this.rage)
    this.rampageCallbacks.onHealthChange?.(this.bulkHealth, this.maxHealth)
  }

  private updateCamera(): void {
    const cam = this.camera as THREE.PerspectiveCamera
    const targetX = this.bulk.position.x + this.mouseX * 10
    const targetZ = this.bulk.position.z + 40
    const targetY = 20 + this.mouseY * 5

    cam.position.x = THREE.MathUtils.lerp(cam.position.x, targetX, 0.04)
    cam.position.z = THREE.MathUtils.lerp(cam.position.z, targetZ, 0.04)
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, targetY, 0.04)

    cam.lookAt(this.bulk.position.x, 4, this.bulk.position.z)
  }

  private updateEnemies(): void {
    const enemiesToKill: number[] = []

    this.enemies.forEach((enemy, idx) => {
      const ed = enemy.userData as EnemyData
      const type = ed.type
      const isBoss = ed.isBoss

      // Move towards bulk
      const dir = new THREE.Vector3(
        this.bulk.position.x - enemy.position.x,
        0,
        this.bulk.position.z - enemy.position.z,
      ).normalize()
      const speed = isBoss ? 0.04 : (type?.speed ?? 0.05)

      const isFlying =
        type?.name === 'RED BARON' || type?.name === 'HELICOPTER' || type?.name === 'ZEUS'

      if (!isFlying) {
        let canMoveX = true
        let canMoveZ = true
        const testX = enemy.position.x + dir.x * speed * 10
        const testZ = enemy.position.z + dir.z * speed * 10

        for (const building of this.buildings) {
          const bd = building.userData as BuildingData
          if (bd.destroyed) continue
          const bw = bd.width / 2 + 2
          const bDepth = bd.depth / 2 + 2

          if (
            testX > building.position.x - bw &&
            testX < building.position.x + bw &&
            enemy.position.z > building.position.z - bDepth &&
            enemy.position.z < building.position.z + bDepth
          ) {
            canMoveX = false
          }
          if (
            enemy.position.x > building.position.x - bw &&
            enemy.position.x < building.position.x + bw &&
            testZ > building.position.z - bDepth &&
            testZ < building.position.z + bDepth
          ) {
            canMoveZ = false
          }
        }

        if (canMoveX) enemy.position.x += dir.x * speed
        else enemy.position.x += (Math.random() - 0.5) * speed * 2

        if (canMoveZ) enemy.position.z += dir.z * speed
        else enemy.position.z += (Math.random() - 0.5) * speed * 2
      } else {
        enemy.position.x += dir.x * speed
        enemy.position.z += dir.z * speed
      }

      enemy.lookAt(this.bulk.position.x, enemy.position.y, this.bulk.position.z)

      // Flying enemy bobbing
      if (type?.name === 'RED BARON' || type?.name === 'HELICOPTER') {
        enemy.position.y = 15 + Math.sin(Date.now() * 0.003 + idx) * 3
      } else if (type?.name === 'ZEUS') {
        enemy.position.y = 10 + Math.sin(Date.now() * 0.002) * 2
      }

      // Shooting
      ed.shootCooldown--
      if (ed.shootCooldown <= 0) {
        const dist = enemy.position.distanceTo(this.bulk.position)
        if (dist < (isBoss ? 80 : 50)) {
          this.createProjectile(enemy)
          ed.shootCooldown = isBoss ? 30 : 60 + Math.random() * 60

          if (isBoss) {
            setTimeout(() => {
              if (!this.disposed) this.createProjectile(enemy)
            }, 200)
            setTimeout(() => {
              if (!this.disposed) this.createProjectile(enemy)
            }, 400)
          }
        }
      }

      // Collision with bulk
      const dist = enemy.position.distanceTo(this.bulk.position)
      const collisionDist = isBoss ? 10 : 5
      if (dist < collisionDist) {
        if (
          !this.rageMode &&
          !this.powerupStates.shield.active &&
          !this.powerupStates.schmeg.active
        ) {
          const damage = (type?.damage ?? 10) * 0.15
          this.bulkHealth -= damage
          this.lastDamageTime = Date.now()
          this.emitFloatingText(this.bulk.position, `-${Math.floor(damage)}`, 'damage')
        }

        if (!isBoss) {
          ed.health -= 30
          if (ed.health <= 0) {
            enemiesToKill.push(idx)
          }
        }
      }
    })

    for (let i = enemiesToKill.length - 1; i >= 0; i--) {
      this.killEnemy(enemiesToKill[i])
    }

    // Boss health bar
    if (this.bossActive && this.currentBoss) {
      const bd = this.currentBoss.userData as EnemyData
      const healthPercent = (bd.health / bd.maxHealth) * 100
      this.rampageCallbacks.onBossChange?.({
        name: bd.type?.name ?? 'BOSS',
        healthPercent,
      })
    }
  }

  private updateProjectiles(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]
      const pd = proj.userData as ProjectileData
      proj.position.add(pd.velocity)
      pd.lifetime--

      const targetPos = new THREE.Vector3(
        this.bulk.position.x,
        this.bulk.position.y + 4,
        this.bulk.position.z,
      )
      const dist = proj.position.distanceTo(targetPos)
      if (dist < 4) {
        if (
          !this.rageMode &&
          !this.powerupStates.shield.active &&
          !this.powerupStates.schmeg.active
        ) {
          this.bulkHealth -= pd.damage
          this.lastDamageTime = Date.now()
          this.emitFloatingText(this.bulk.position, `-${Math.floor(pd.damage)}`, 'damage')
          this.rampageCallbacks.onScreenFlash?.('damage')
        }
        this.createExplosion(proj.position, 0xff0000, 5)
        this.disposeObject(proj)
        this.projectiles.splice(i, 1)
        continue
      }

      if (pd.lifetime <= 0 || proj.position.y < 0) {
        this.disposeObject(proj)
        this.projectiles.splice(i, 1)
      }
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      const pd = p.userData as ParticleData
      p.position.add(pd.velocity)
      pd.velocity.y -= 0.015
      pd.lifetime--
      p.scale.multiplyScalar(0.97)

      if (pd.lifetime <= 0) {
        this.disposeObject(p)
        this.particles.splice(i, 1)
      }
    }
  }

  private updatePowerups(): void {
    if (Math.random() < 0.004 && this.powerups.length < 5) this.spawnPowerup()

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i]
      const pd = p.userData as PowerupObjData
      p.position.y = 2 + Math.sin(Date.now() * 0.003 + pd.bobOffset) * 0.5
      p.rotation.y += 0.03

      let collectDist = 5
      if (this.powerupStates.magnet.active) {
        collectDist = 15
        const dir = new THREE.Vector3()
          .subVectors(this.bulk.position, p.position)
          .normalize()
        p.position.add(dir.multiplyScalar(0.2))
      }

      if (this.bulk.position.distanceTo(p.position) < collectDist) {
        this.collectPowerup(p)
        this.disposeObject(p)
        this.powerups.splice(i, 1)
      }
    }

    // Update powerup timers
    let changed = false
    Object.keys(this.powerupStates).forEach((key) => {
      const state = this.powerupStates[key]
      if (state.active) {
        state.timer--
        if (state.timer <= 0) {
          state.active = false
          changed = true
        } else {
          changed = true
        }
      }
    })
    if (changed) {
      this.rampageCallbacks.onPowerupChange?.({ ...this.powerupStates })
    }
  }

  private updateCivilians(): void {
    if (Math.random() < 0.02) this.spawnCivilian()

    for (let i = this.civilians.length - 1; i >= 0; i--) {
      const civ = this.civilians[i]
      const cd = civ.userData as CivilianData
      const distToBulk = this.bulk.position.distanceTo(civ.position)

      if (distToBulk < 30) {
        cd.panicTimer = 120
        const awayDir = new THREE.Vector3()
          .subVectors(civ.position, this.bulk.position)
          .normalize()
        cd.velocity.x = awayDir.x * 0.15
        cd.velocity.z = awayDir.z * 0.15
      }

      if (cd.panicTimer > 0) {
        cd.panicTimer--
      } else {
        cd.velocity.x += (Math.random() - 0.5) * 0.01
        cd.velocity.z += (Math.random() - 0.5) * 0.01
        cd.velocity.x *= 0.95
        cd.velocity.z *= 0.95
      }

      civ.position.add(cd.velocity)

      if (Math.abs(cd.velocity.x) > 0.01 || Math.abs(cd.velocity.z) > 0.01) {
        civ.rotation.y = Math.atan2(cd.velocity.x, cd.velocity.z)
      }

      if (civ.position.distanceTo(this.bulk.position) > 100) {
        this.disposeObject(civ)
        this.civilians.splice(i, 1)
        continue
      }

      if (distToBulk < 3) {
        this.createExplosion(civ.position, 0xff0000, 5)
        this.disposeObject(civ)
        this.civilians.splice(i, 1)
        this.addScore(50)
      }
    }
  }

  private updateWave(): void {
    this.waveTimer++

    const spawnRate = Math.max(60, 180 - this.wave * 10)
    if (this.waveTimer % spawnRate === 0 && this.enemies.length < 15 + this.wave * 2) {
      this.spawnEnemy()
    }

    const targetKills = 10 + this.wave * 5
    if (this.enemiesKilledThisWave >= targetKills && !this.bossActive) {
      this.startNextWave()
    }

    if (
      this.wave % 5 === 0 &&
      !this.bossActive &&
      !this.bossSpawnedThisWave &&
      this.enemiesKilledThisWave >= targetKills - 5
    ) {
      this.bossSpawnedThisWave = true
      this.spawnBoss()
    }
  }

  private startNextWave(): void {
    this.wave++
    this.enemiesThisWave = 0
    this.enemiesKilledThisWave = 0
    this.bossSpawnedThisWave = false

    const subtitle = WAVE_SUBTITLES[Math.floor(Math.random() * WAVE_SUBTITLES.length)]
    this.rampageCallbacks.onWaveChange?.(this.wave)
    this.rampageCallbacks.onWaveAnnouncement?.(this.wave, subtitle)

    const bonus = this.wave * 500
    this.addScore(bonus)
    this.rampageCallbacks.onAnnouncement?.(`+${bonus} WAVE BONUS!`, 'achievement')

    this.bulkHealth = Math.min(this.maxHealth, this.bulkHealth + 10)
  }

  private checkGameOver(): void {
    if (this.bulkHealth <= 0) {
      this.gameOver = true
      this.audio.pauseBGM()
      this.rampageCallbacks.onStateChange?.('gameover')
      return
    }

    // Passive regen
    if (!this.lastDamageTime) this.lastDamageTime = Date.now()
    if (Date.now() - this.lastDamageTime > 3000) {
      this.bulkHealth = Math.min(this.maxHealth, this.bulkHealth + 0.05)
    }
  }

  // ─── Minimap ───────────────────────────────────────────────────

  private updateMinimap(): void {
    if (!this.minimapCtx) return
    const ctx = this.minimapCtx
    const scale = 0.25
    const centerX = 75
    const centerY = 75

    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, 150, 150)

    // Buildings
    ctx.fillStyle = '#444'
    this.buildings.forEach((b) => {
      const bd = b.userData as BuildingData
      if (bd.destroyed) return
      const x = centerX + (b.position.x - this.bulk.position.x) * scale
      const y = centerY + (b.position.z - this.bulk.position.z) * scale
      if (x > 0 && x < 150 && y > 0 && y < 150) {
        ctx.fillRect(x - 2, y - 2, 4, 4)
      }
    })

    // Powerups
    this.powerups.forEach((p) => {
      const pd = p.userData as PowerupObjData
      const x = centerX + (p.position.x - this.bulk.position.x) * scale
      const y = centerY + (p.position.z - this.bulk.position.z) * scale
      if (x > 0 && x < 150 && y > 0 && y < 150) {
        ctx.fillStyle = '#' + pd.type.color.toString(16).padStart(6, '0')
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // Enemies
    ctx.fillStyle = '#f00'
    this.enemies.forEach((e) => {
      const ed = e.userData as EnemyData
      const x = centerX + (e.position.x - this.bulk.position.x) * scale
      const y = centerY + (e.position.z - this.bulk.position.z) * scale
      if (x > 0 && x < 150 && y > 0 && y < 150) {
        const size = ed.isBoss ? 6 : 3
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // Bulk (purple center dot + direction)
    ctx.fillStyle = '#9b30ff'
    ctx.beginPath()
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#ff00ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(
      centerX + Math.sin(this.bulk.rotation.y) * 10,
      centerY + Math.cos(this.bulk.rotation.y) * 10,
    )
    ctx.stroke()

    ctx.strokeStyle = '#9b30ff'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, 150, 150)
  }

  // ─── Controls ──────────────────────────────────────────────────

  private setupControls(): void {
    document.addEventListener('keydown', this.boundKeyDown)
    document.addEventListener('keyup', this.boundKeyUp)
    document.addEventListener('mousemove', this.boundMouseMove)
    document.addEventListener('click', this.boundClick)
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.keys[e.code] = true
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys[e.code] = false
  }

  private handleMouseMove(e: MouseEvent): void {
    this.mouseX = (e.clientX / window.innerWidth) * 2 - 1
    this.mouseY = (e.clientY / window.innerHeight) * 2 - 1
  }

  private handleClick(): void {
    if (this.gameStarted && !this.gameOver && this.smashCooldown <= 0) {
      this.performSmash()
    }
  }

  // Mobile joystick input
  setMobileMovement(dx: number, dy: number): void {
    const threshold = 0.2
    this.mobileKeys['KeyW'] = dy < -threshold
    this.mobileKeys['KeyS'] = dy > threshold
    this.mobileKeys['KeyA'] = dx < -threshold
    this.mobileKeys['KeyD'] = dx > threshold
  }

  resetMobileMovement(): void {
    this.mobileKeys['KeyW'] = false
    this.mobileKeys['KeyS'] = false
    this.mobileKeys['KeyA'] = false
    this.mobileKeys['KeyD'] = false
  }

  // Camera touch
  applyCameraOffset(dx: number, dy: number): void {
    this.mouseX += dx
    this.mouseY -= dy
    this.mouseX = Math.max(-1, Math.min(1, this.mouseX))
    this.mouseY = Math.max(-1, Math.min(1, this.mouseY))
  }

  // ─── Public API ────────────────────────────────────────────────

  start(): void {
    this.gameStarted = true
    this.gameOver = false
    this.rampageCallbacks.onStateChange?.('playing')

    const subtitle = WAVE_SUBTITLES[Math.floor(Math.random() * WAVE_SUBTITLES.length)]
    this.rampageCallbacks.onWaveAnnouncement?.(1, subtitle)

    this.audio.playBGM()

    // Emit initial state
    this.rampageCallbacks.onScoreChange?.(0)
    this.rampageCallbacks.onHealthChange?.(this.bulkHealth, this.maxHealth)
    this.rampageCallbacks.onRageChange?.(this.rage)
    this.rampageCallbacks.onComboChange?.(0, 1)
    this.rampageCallbacks.onWaveChange?.(1)
    this.rampageCallbacks.onLevelChange?.(1)
    this.rampageCallbacks.onXPChange?.(0, 100)
    this.rampageCallbacks.onWantedLevelChange?.(1)
    this.rampageCallbacks.onDestructionChange?.(0)
    this.rampageCallbacks.onPowerupChange?.({ ...this.powerupStates })
  }

  restart(): void {
    // Clear scene objects
    this.enemies.forEach((e) => this.scene.remove(e))
    this.enemies = []
    this.projectiles.forEach((p) => this.scene.remove(p))
    this.projectiles = []
    this.particles.forEach((p) => this.scene.remove(p))
    this.particles = []
    this.powerups.forEach((p) => this.scene.remove(p))
    this.powerups = []
    this.civilians.forEach((c) => this.scene.remove(c))
    this.civilians = []

    // Clear collapse intervals
    this.collapseIntervals.forEach((id) => clearInterval(id))
    this.collapseIntervals = []

    // Rebuild city and cars
    this.buildings.forEach((b) => this.scene.remove(b))
    this.buildings = []
    this.cars.forEach((c) => this.scene.remove(c))
    this.cars = []
    this.totalBuildings = 0
    this.createCity()
    this.spawnCars()

    // Reset bulk
    this.bulk.position.set(0, (this.bulk.userData.baseY as number) ?? 1.5, 0)
    this.bulkVelocity = { x: 0, z: 0 }

    // Reset state
    this.gameOver = false
    this.score = 0
    this.rage = 100
    this.bulkHealth = 100
    this.maxHealth = 100
    this.destruction = 0
    this.destroyedBuildings = 0
    this.combo = 0
    this.maxCombo = 0
    this.comboTimer = 0
    this.wave = 1
    this.waveTimer = 0
    this.enemiesThisWave = 0
    this.enemiesKilledThisWave = 0
    this.wantedLevel = 1
    this.totalKills = 0
    this.level = 1
    this.xp = 0
    this.xpToLevel = 100
    this.bossActive = false
    this.bossSpawnedThisWave = false
    this.currentBoss = null
    this.lastDamageTime = 0
    this.smashCooldown = 0
    this.groundPoundCooldown = 0
    this.tauntCooldown = 0
    this.rageMode = false

    this.powerupStates = {
      schmeg: { active: false, timer: 0 },
      speed: { active: false, timer: 0 },
      magnet: { active: false, timer: 0 },
      shield: { active: false, timer: 0 },
    }

    this.start()
  }

  getMinimapCanvas(): HTMLCanvasElement | null {
    return this.minimapCanvas
  }

  // ─── Main Update Loop ─────────────────────────────────────────

  update(delta: number): void {
    if (this.bulkMixer) {
      this.bulkMixer.update(delta)

      // Animation state management for GLB with mixer
      if (this.gameStarted && !this.gameOver) {
        const isMoving =
          Math.abs(this.bulkVelocity.x) > 0.01 || Math.abs(this.bulkVelocity.z) > 0.01
        const attackPlaying = this.attackAction && this.attackAction.isRunning()

        if (isMoving && this.currentAnimation !== 'walk' && this.walkAction && !attackPlaying) {
          if (this.idleAction) this.idleAction.stop()
          this.walkAction.play()
          this.currentAnimation = 'walk'
        } else if (
          !isMoving &&
          this.currentAnimation === 'walk' &&
          this.idleAction &&
          !attackPlaying
        ) {
          if (this.walkAction) this.walkAction.stop()
          this.idleAction.play()
          this.currentAnimation = 'idle'
        }
      }
    }

    // Always update particles (visible during gameover)
    this.updateParticles()

    if (!this.gameStarted || this.gameOver) return

    this.updateBulk()
    this.updateCamera()
    this.updateEnemies()
    this.updateProjectiles()
    this.updatePowerups()
    this.updateCivilians()
    this.updateWave()
    this.updateMinimap()
    this.checkGameOver()
  }

  // ─── Cleanup ───────────────────────────────────────────────────

  dispose(): void {
    document.removeEventListener('keydown', this.boundKeyDown)
    document.removeEventListener('keyup', this.boundKeyUp)
    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('click', this.boundClick)

    this.collapseIntervals.forEach((id) => clearInterval(id))
    this.collapseIntervals = []

    this.audio.dispose()
    this.bulkMixer = null
    this.minimapCanvas = null
    this.minimapCtx = null

    super.dispose()
  }
}
