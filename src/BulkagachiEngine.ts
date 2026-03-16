// Bulkagachi Engine - Tamagotchi-style pet game
export interface BulkagachiCallbacks {
  onStatsChange?: (hunger: number, happiness: number, cleanliness: number, energy: number) => void
  onMoodChange?: (mood: 'happy' | 'ok' | 'sad' | 'miserable') => void
  onSleepChange?: (sleeping: boolean) => void
  onGhostModeChange?: (isGhost: boolean) => void
  onSicknessChange?: (isSick: boolean) => void
  onLevelChange?: (level: number, xp: number, xpNeeded: number) => void
  onAgeChange?: (ageString: string) => void
  onGrowthStageChange?: (stage: string) => void
  onEvolutionReady?: (fromStage: string, toStage: string) => void
  onPoopCountChange?: (count: number) => void
  onComboChange?: (combo: number) => void
  onMessageChange?: (message: string | null) => void
  onAchievementUnlocked?: (id: string, title: string) => void
  onCollectionChange?: (collection: CollectionStats) => void
  onToySpawned?: (toy: ToyInstance | null) => void
  onMusicEnabledChange?: (enabled: boolean) => void
  onNotificationsEnabledChange?: (enabled: boolean) => void
  onDeath?: (ageMinutes: number) => void  // Called when Bulk becomes ghost (death)
  onAutoSubmit?: (ageMinutes: number) => void  // Called every hour for auto leaderboard submit
}

export interface CollectionStats {
  totalPlays: number
  totalFeeds: number
  totalCleans: number
  goldenPoopsFound: number
  maxCombo: number
  achievementCount: number
}

export interface ToyInstance {
  type: string
  x: number
  y: number
}

export interface AchievementDef {
  id: string
  title: string
  desc: string
  icon: string
}

export interface PoopData {
  x: number
  y: number
  age: number
  isGolden: boolean
}

interface SavedState {
  hunger: number
  happiness: number
  cleanliness: number
  energy: number
  lastUpdateTime: number
  lastAutoSubmitTime: number
  birthTime: number
  achievements: Record<string, boolean>
  level: number
  xp: number
  poopCount: number
  comboCount: number
  lastActionTime: number
  poops: PoopData[]
  collection: CollectionStats
  musicEnabled: boolean
  notificationsEnabled: boolean
  isSick: boolean
  selectedBackground: string
  isGhost: boolean
  ghostSince: number
  sicknessCured: number
  medicinesGiven: number
  sleepCount: number
  visitedLocations: string[]
  bulkName: string
  teenType: 'good' | 'bad' | null
  isSleeping: boolean
  sleepStartTime: number
  lastSchmegTime: number
  lastRestTime: number
  lastGreetingTime: number
  totalTimePlayed: number
  hasEgg: boolean
  eggStartTime: number
  eggHatchAt: number
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_feed', title: 'First Snack', desc: 'Feed Bulk for the first time', icon: '🍼' },
  { id: 'first_play', title: 'Playtime!', desc: 'Play with Bulk for the first time', icon: '🎾' },
  { id: 'first_clean', title: 'Sparkle Clean', desc: 'Clean Bulk for the first time', icon: '🧼' },
  { id: 'first_medicine', title: 'Doctor Bulk', desc: 'Cure sickness for the first time', icon: '💊' },
  { id: 'first_sleep', title: 'Nap Time', desc: 'Put Bulk to sleep', icon: '😴' },
  { id: 'level5', title: 'Growing Up', desc: 'Reach Level 5', icon: '⭐' },
  { id: 'level10', title: 'Teen Bulk', desc: 'Reach Level 10', icon: '🌟' },
  { id: 'level25', title: 'Bulk Adult', desc: 'Reach Level 25', icon: '🌠' },
  { id: 'level50', title: 'Legendary Bulk', desc: 'Reach Level 50', icon: '👑' },
  { id: 'level99', title: 'MAXIMUM BULK', desc: 'Reach Level 99', icon: '💎' },
  { id: 'combo10', title: 'Combo Master', desc: 'Get a 10x combo', icon: '🔥' },
  { id: 'combo50', title: 'Combo King', desc: 'Get a 50x combo', icon: '💥' },
  { id: 'poop50', title: 'Poop Master', desc: 'Clean 50 poops', icon: '💩' },
  { id: 'poop100', title: 'Poop Legend', desc: 'Clean 100 poops', icon: '🚽' },
  { id: 'rebirth1', title: 'New Beginning', desc: 'Rebirth for the first time', icon: '🔄' },
  { id: 'golden', title: 'Lucky Find', desc: 'Find a golden poop', icon: '✨' },
  { id: 'all_stats_max', title: 'Perfect Care', desc: 'Have all stats at 100%', icon: '💖' },
  { id: 'age24h', title: 'Day Old', desc: 'Keep Bulk alive for 24 hours', icon: '🎂' },
  { id: 'age7d', title: 'Week Old', desc: 'Keep Bulk alive for 1 week', icon: '📅' },
  { id: 'travel_camp', title: 'Camper', desc: 'Visit the camp', icon: '⛺' },
  { id: 'travel_city', title: 'City Slicker', desc: 'Visit the city', icon: '🏙️' },
  { id: 'travel_beach', title: 'Beachgoer', desc: 'Visit the beach', icon: '🏖️' },
  { id: 'travel_mountain', title: 'Mountain Climber', desc: 'Visit the mountain', icon: '🏔️' },
  { id: 'feed100', title: 'Well Fed', desc: 'Feed Bulk 100 times', icon: '🍖' },
  { id: 'play100', title: 'Playful', desc: 'Play with Bulk 100 times', icon: '🎮' },
  { id: 'sick_cured', title: 'Healer', desc: 'Cure sickness 5 times', icon: '🩺' },
  { id: 'teenGood', title: 'Good Boy', desc: 'Choose the good path', icon: '😇' },
  { id: 'teenBad', title: 'Bad Boy', desc: 'Choose the bad path', icon: '😈' },
  { id: 'elder', title: 'Elder Bulk', desc: 'Reach 1 week old', icon: '🧓' },
  { id: 'ghostOneHour', title: 'Ghost Hour', desc: 'Spend 1 hour as ghost', icon: '👻' },
  { id: 'ghostOneDay', title: 'Ghost Day', desc: 'Spend 1 day as ghost', icon: '🌙' },
  { id: 'ghostWeek', title: 'Ghost Week', desc: 'Spend 1 week as ghost', icon: '💀' },
]

type WeatherType = 'sunny' | 'rain' | 'snow' | 'storm'

export class BulkagachiEngine {
  private container: HTMLElement
  private callbacks: BulkagachiCallbacks
  
  // Game state
  private hunger = 100
  private happiness = 100
  private energy = 100
  private cleanliness = 100
  private lastUpdateTime = Date.now()
  private lastAutoSubmitTime = Date.now()  // Track last auto-submit
  private birthTime = Date.now()
  
  private isGhost = false  // Ghost mode after death
  private ghostSince = 0  // Timestamp when became ghost
  private bulkName = 'Bulk'  // Name of your Bulk
  private totalTimePlayed = 0  // Total time played in ms
  private teenType: 'good' | 'bad' | null = null  // Randomly assigned when egg received
  private hasEgg = false  // Egg phase
  private eggStartTime = 0  // Timestamp when egg received
  private eggHatchAt = 0  // Target hatch timestamp
  private evolutionPending: string | null = null
  private isSleeping = false
  private sleepStartTime = 0
  private wakeUpAngry = false
  private isSick = false
  private sicknessChance = 0.02  // 2% chance per action to get sick
  private sleepDuration = 8 * 60 * 60 * 1000  // 8 hours in ms
  private lastGreetingTime = 0
  private lastSchmegTime = 0
  private lastRestTime = 0
  private greetingCooldown = 60 * 60 * 1000  // 1 hour between greetings
  private achievements: Record<string, boolean> = {}
  private level = 1
  private xp = 0
  private poopCount = 0
  private comboCount = 0
  private medicinesGiven = 0
  private sleepCount = 0
  private sicknessCured = 0
  private visitedLocations: Set<string> = new Set()
  private _lastEmitTime = 0
  private _lastNotificationTime = 0
  private lastActionTime = 0
  private _resizeHandler: (() => void) | null = null
  private lastActionType: 'feed' | 'play' | 'clean' | 'pet' | null = null
  private poops: PoopData[] = []
  private floatingHearts: { x: number; y: number; alpha: number; offset: number }[] = []
  private floatingSchmegs: { x: number; y: number; alpha: number; offset: number }[] = []
  private floatingMedicines: { x: number; y: number; alpha: number; offset: number }[] = []
  private floatingFoods: { x: number; y: number; alpha: number; offset: number; type: string }[] = []
  private collection: CollectionStats = {
    totalPlays: 0,
    totalFeeds: 0,
    totalCleans: 0,
    goldenPoopsFound: 0,
    maxCombo: 0,
    achievementCount: 0,
  }
  private musicEnabled = false
  private audioCtx: AudioContext | null = null
  
  private playSound(type: 'feed' | 'play' | 'clean' | 'pet' | 'happy'): void {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext()
    }
    
    const ctx = this.audioCtx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    // Different sounds for different actions
    switch (type) {
      case 'feed':
        osc.frequency.setValueAtTime(440, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
        osc.start()
        osc.stop(ctx.currentTime + 0.2)
        break
      case 'play':
        osc.frequency.setValueAtTime(523, ctx.currentTime)
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
        break
      case 'clean':
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
        osc.start()
        osc.stop(ctx.currentTime + 0.15)
        break
      case 'pet':
        osc.frequency.setValueAtTime(300, ctx.currentTime)
        osc.frequency.setValueAtTime(400, ctx.currentTime + 0.05)
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
        osc.start()
        osc.stop(ctx.currentTime + 0.1)
        break
      case 'happy':
        osc.frequency.setValueAtTime(523, ctx.currentTime)
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
        osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.3)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
        break
    }
  }
  private backgroundMusic: HTMLAudioElement | null = null
  private notificationsEnabled = false
  
  // 2D Canvas
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private animationFrameId: number = 0
  
  // Sprites
  private sprites: Record<string, HTMLImageElement> = {}
  private currentSprite: HTMLImageElement | null = null
  private background: HTMLImageElement | null = null
  private schmegImage: HTMLImageElement | null = null
  private medicineImage: HTMLImageElement | null = null
  private heartImage: HTMLImageElement | null = null
  private milkImage: HTMLImageElement | null = null
  private hotdogImage: HTMLImageElement | null = null
  private nightBackground: HTMLImageElement | null = null
  private campBackground: HTMLImageElement | null = null
  private campNightBackground: HTMLImageElement | null = null
  private cityBackground: HTMLImageElement | null = null
  private cityNightBackground: HTMLImageElement | null = null
  private beachBackground: HTMLImageElement | null = null
  private mountainBackground: HTMLImageElement | null = null
  private clubBackground: HTMLImageElement | null = null
  private tombBackground: HTMLImageElement | null = null
  private tombNightBackground: HTMLImageElement | null = null
  private selectedBackground = 'cabin'  // cabin, camp, city, beach, mountain, club, tomb
  
  // Weather system
  private weather: WeatherType = 'sunny'
  private weatherTimer = 0
  private weatherChangeInterval = 300000 // 5 minutes - less frequent
  private rainDrops: { x: number; y: number; speed: number; length: number }[] = []
  private snowflakes: { x: number; y: number; speed: number; size: number; drift: number }[] = []
  private lightningFlash = 0
  
  // Locations that support weather
  private weatherLocations = ['camp', 'city', 'mountain']
  
  // Get current background based on time
  private getCurrentBackground(): HTMLImageElement | null {
    const hour = new Date().getHours()
    const isNight = hour >= 18 || hour < 6
    
    // Ghost mode - show location background (with tomb overlay rendered separately)
    // But keep tomb as fallback for cabin
    if (this.isGhost) {
      if (this.selectedBackground === 'cabin') {
        return isNight ? this.tombNightBackground : this.tombBackground
      }
      // For other locations, show the actual location background
      switch (this.selectedBackground) {
        case 'camp':
          return isNight ? this.campNightBackground : this.campBackground
        case 'city':
          return isNight ? this.cityNightBackground : this.cityBackground
        case 'beach':
          return this.beachBackground
        case 'mountain':
          return this.mountainBackground
        case 'club':
          return this.clubBackground
        default:
          return isNight ? this.tombNightBackground : this.tombBackground
      }
    }
    
    // Day-only locations: beach and mountain send to camp at night
    if (isNight && (this.selectedBackground === 'beach' || this.selectedBackground === 'mountain')) {
      this.showMessage('🌙 CLOSING TIME! TO CAMP')
      this.selectedBackground = 'camp'
      return this.campNightBackground
    }
    
    // Club - only open 6pm-2am
    const isClubHours = hour >= 18 || hour < 2
    if (this.selectedBackground === 'club' && !isClubHours) {
      this.showMessage('🌙 CLUB CLOSED!')
      this.selectedBackground = 'cabin'
      return this.nightBackground
    }
    
    switch (this.selectedBackground) {
      case 'camp':
        return isNight ? this.campNightBackground : this.campBackground
      case 'city':
        return isNight ? this.cityNightBackground : this.cityBackground
      case 'beach':
        return this.beachBackground
      case 'mountain':
        return this.mountainBackground
      case 'club':
        return this.clubBackground
      default: // cabin
        return isNight ? this.nightBackground : this.background
    }
  }
  
  // Sprite paths
  private spritePaths: Record<string, Record<string, string>> = {
    EGG: {
      neutral: '/images/gachi-s/egg.png',
      cracked: '/images/gachi-s/egg-cracked.png',
    },
    BABY: {
      neutral: '/images/gachi-s/baby-bulk.png',
      happy: '/images/gachi-s/baby-happy.png',
      sad: '/images/gachi-s/baby-sad.png',
      cry: '/images/gachi-s/baby-cry.png',
      tired: '/images/gachi-s/baby-tired.png',
      sick: '/images/gachi-s/baby-sick.png',
      sleep: '/images/gachi-s/baby-sleep.png',
      play: '/images/gachi-s/baby-play.png',
      hungry: '/images/gachi-s/baby-hungry.png',
      angry: '/images/gachi-s/baby-angry.png',
      clean: '/images/gachi-s/baby-clean.png',
      ghost: '/images/gachi-s/baby-ghost.png',
    },
    GOOD_BOY: {
      neutral: '/images/gachi-s/teen-good-neutral.png',
      happy: '/images/gachi-s/teen-good-happy.png',
      sad: '/images/gachi-s/teen-good-sad.png',
      cry: '/images/gachi-s/teen-good-cry.png',
      tired: '/images/gachi-s/teen-good-tired.png',
      sick: '/images/gachi-s/teen-good-sick.png',
      sleep: '/images/gachi-s/teen-good-sleep.png',
      play: '/images/gachi-s/teen-good-play.png',
      hungry: '/images/gachi-s/teen-good-hungry.png',
      angry: '/images/gachi-s/teen-good-angry.png',
      clean: '/images/gachi-s/teen-good-clean.png',
      ghost: '/images/gachi-s/teen-good-ghost.png',
    },
    BAD_BOY: {
      neutral: '/images/gachi-s/teen-bad-neutral.png',
      happy: '/images/gachi-s/teen-bad-happy.png',
      sad: '/images/gachi-s/teen-bad-sad.png',
      cry: '/images/gachi-s/teen-bad-cry.png',
      tired: '/images/gachi-s/teen-bad-tired.png',
      sick: '/images/gachi-s/teen-bad-sick.png',
      sleep: '/images/gachi-s/teen-bad-sleep.png',
      play: '/images/gachi-s/teen-bad-play.png',
      hungry: '/images/gachi-s/teen-bad-hungry.png',
      angry: '/images/gachi-s/teen-bad-angry.png',
      clean: '/images/gachi-s/teen-bad-clean.png',
      ghost: '/images/gachi-s/teen-bad-ghost.png',
    },
    ADULT: {
      neutral: '/images/pixelbulk.png',
      happy: '/images/gachi-s/bulk-happy.png',
      sad: '/images/gachi-s/bulk-sad.png',
      cry: '/images/gachi-s/bulk-cry.png',
      tired: '/images/gachi-s/bulk-tired.png',
      sick: '/images/gachi-s/bulk-sick.png',
      sleep: '/images/gachi-s/bulk-sleep.png',
      play: '/images/gachi-s/bulk-play.png',
      hungry: '/images/gachi-s/bulk-hungry.png',
      angry: '/images/gachi-s/bulk-angry.png',
      clean: '/images/gachi-s/bulk-clean.png',
      ghost: '/images/gachi-s/bulk-ghost.png',
    },
    ELDER: {
      neutral: '/images/gachi-s/elder.png',
      happy: '/images/gachi-s/elder-happy.png',
      sad: '/images/gachi-s/elder-sad.png',
      cry: '/images/gachi-s/elder-cry.png',
      tired: '/images/gachi-s/elder-tired.png',
      sick: '/images/gachi-s/elder-sick.png',
      sleep: '/images/gachi-s/elder-sleep.png',
      play: '/images/gachi-s/elder-play.png',
      hungry: '/images/gachi-s/elder-hungry.png',
      angry: '/images/gachi-s/elder-angry.png',
      clean: '/images/gachi-s/elder-clean.png',
      ghost: '/images/gachi-s/elder-ghost.png',
    },
  }
  
  // Animation
  private bobOffset = 0
  private flipOffset = 1  // 1 = normal, -1 = flipped horizontally
  private eggTilt = 0  // Egg tilt angle for side-to-side rocking
  private eggPetCount = 0  // Track consecutive pets for roll
  private eggRollAngle = 0  // Egg roll rotation
  private paceOffset = 0
  private paceDirection = 1  // 1 = right, -1 = left
  private paceTimer = 0
  private isPacing = true
  private lastFlipTime = 0
  private isAnimatingBounce = false
  private bounceStartTime = 0
  private isLookingAround = false
  private lookAroundTimer = 0
  private moodReactionTimer = 0
  private tiredSpriteTimer = 0
  private showTiredSprite = false
  private currentMoodReaction = ''

  constructor(container: HTMLElement, callbacks: BulkagachiCallbacks = {}) {
    this.container = container
    this.callbacks = callbacks
    
    // Create canvas
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.style.display = 'block'
    container.appendChild(this.canvas)
    
    this.ctx = this.canvas.getContext('2d')!
    
    // Handle resize
    this.resize()
    this._resizeHandler = () => this.resize()
    window.addEventListener('resize', this._resizeHandler)
    
    // Click handler
    this.canvas.addEventListener('click', (e) => this.onClick(e))
  }
  
  private resize(): void {
    const rect = this.container.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      this.canvas.width = rect.width
      this.canvas.height = rect.height
      this.render()
    }
  }
  
  private loadImage(src: string): HTMLImageElement {
    const img = new Image()
    img.src = src
    return img
  }
  
  init(): void {
    // Load background
    this.background = this.loadImage('/images/bg-cabin.png')
    this.background.onload = () => this.render()
    
    // Load night background
    this.nightBackground = this.loadImage('/images/gachi-s/bg-night.png')
    this.nightBackground.onload = () => this.render()
    
    // Load camp backgrounds
    this.campBackground = this.loadImage('/images/gachi-s/bg-camp-day.png')
    this.campNightBackground = this.loadImage('/images/gachi-s/bg-camp-night.png')
    this.campBackground.onload = () => this.render()
    
    // Load city backgrounds
    this.cityBackground = this.loadImage('/images/gachi-s/bg-city-day.png')
    this.cityNightBackground = this.loadImage('/images/gachi-s/bg-city-night.png')
    this.cityBackground.onload = () => this.render()
    
    // Load beach (day only)
    this.beachBackground = this.loadImage('/images/gachi-s/bg-beach.png')
    this.beachBackground.onload = () => this.render()
    
    // Load mountain (day only)
    this.mountainBackground = this.loadImage('/images/gachi-s/bg-mountain.png')
    this.mountainBackground.onload = () => this.render()
    
    // Load club (night only - 6pm-2am)
    this.clubBackground = this.loadImage('/images/gachi-s/bg-club.png')
    this.clubBackground.onload = () => this.render()
    
    // Load tomb (ghost mode home)
    this.tombBackground = this.loadImage('/images/gachi-s/bg-tomb-day.png')
    this.tombNightBackground = this.loadImage('/images/gachi-s/bg-tomb-night.png')
    this.tombBackground.onload = () => this.render()
    this.tombNightBackground.onload = () => this.render()
    
    // Load schmeg image for effects
    this.schmegImage = this.loadImage('/images/gachi-s/schmeg-can.png')
    this.schmegImage.onload = () => this.render()
    
    // Load medicine image for effects
    this.medicineImage = this.loadImage('/images/gachi-s/schmeg-shot.png')
    this.medicineImage.onload = () => this.render()
    
    // Load heart image for pet effect
    this.heartImage = this.loadImage('/images/heart.png')
    this.heartImage.onload = () => this.render()
    
    // Load food images
    this.milkImage = this.loadImage('/images/gachi-s/food-milk.png')
    this.hotdogImage = this.loadImage('/images/gachi-s/food-hotdog.png')
    this.milkImage.onload = () => this.render()
    this.hotdogImage.onload = () => this.render()
    
    // Load all sprites
    for (const age of Object.values(this.spritePaths)) {
      for (const path of Object.values(age)) {
        this.sprites[path] = this.loadImage(path)
      }
    }
    
    // Load saved state
    this.loadState()
    
    // Start game loop
    this.gameLoop()
  }
  
  getAgeInHours(): number {
    return (Date.now() - this.birthTime) / (1000 * 60 * 60)
  }
  
  getEggProgress(): number {
    if (!this.hasEgg || this.eggHatchAt === 0) return 100
    const elapsed = Date.now() - this.eggStartTime
    const total = this.eggHatchAt - this.eggStartTime
    return Math.min(100, (elapsed / total) * 100)
  }
  
  private getGrowthStage(): string {
    // Egg phase - check hatch timer
    if (this.hasEgg) {
      const now = Date.now()
      if (now >= this.eggHatchAt) {
        // Egg hatches!
        this.hasEgg = false
        this.birthTime = Date.now()  // Reset age
        this.showMessage('🥚 THE EGG HATCHED!')
      } else {
        return 'EGG'
      }
    }
    // If evolution is pending to TEEN, stay at BABY until they choose (can't render 'TEEN' sprite)
    if (this.evolutionPending === 'TEEN') return 'BABY'
    // If other evolution pending, stay at current stage
    if (this.evolutionPending) return this.evolutionPending
    
    const ageInHours = (Date.now() - this.birthTime) / (1000 * 60 * 60)
    if (ageInHours < 8) return 'BABY'  // First 8 hours
    if (ageInHours < 24) {
      // After 8 hours but before choosing teen path, stay at BABY (user must choose first)
      if (!this.teenType) return 'BABY'
      // Handle legacy saved names (NICE_TEEN/REBEL_TEEN were temporarily saved)
      const teenType = this.teenType as string
      if (teenType === 'NICE_TEEN') return 'GOOD_BOY'
      if (teenType === 'REBEL_TEEN') return 'BAD_BOY'
      // Once teenType is chosen, show the appropriate teen sprite
      return teenType === 'good' ? 'GOOD_BOY' : 'BAD_BOY'
    }
    if (ageInHours < 24) return 'ADULT'  // 24-168 hours
    if (ageInHours < 168) return 'ELDER'  // 168+ hours
    return 'ELDER'
  }
  
  private getCurrentStage(): string {
    // Get actual stage without pending - this is the "true" stage based on age
    const ageInHours = (Date.now() - this.birthTime) / (1000 * 60 * 60)
    if (ageInHours < 8) return 'BABY'
    if (ageInHours < 24) {
      // If we've passed 8 hours but haven't chosen teen type yet, return TEEN
      // This triggers the evolution prompt
    // Handle legacy saved names
    const teenType = this.teenType as string
    if (teenType === 'NICE_TEEN') return 'GOOD_BOY'
    if (teenType === 'REBEL_TEEN') return 'BAD_BOY'
    if (!teenType) return 'TEEN'
    // Otherwise return based on teenType
    return teenType === 'good' ? 'GOOD_BOY' : 'BAD_BOY'
    }
    if (ageInHours < 168) return 'ADULT'
    return 'ELDER'
  }
  
  private canEvolve(): boolean {
    // Check if age has reached evolution threshold
    const ageInHours = (Date.now() - this.birthTime) / (1000 * 60 * 60)
    // Check if evolution is available based on age
    if (ageInHours >= 8 && ageInHours < 24 && this.teenType) return true
    if (ageInHours >= 24 && this.teenType) return true
    return false
  }
  
  // Called from UI button to check if evolution available
  tryEvolve(): boolean {
    const ageInHours = (Date.now() - this.birthTime) / (1000 * 60 * 60)
    // Check if TEEN evolution is available (age >= 8 but teenType not chosen yet)
    if (ageInHours >= 8 && ageInHours < 24 && !this.teenType && !this.evolutionPending) {
      this.evolutionPending = 'TEEN'
      this.callbacks.onEvolutionReady?.('BABY', 'TEEN')
      this.showMessage('✨ TEEN READY! CHOOSE YOUR PATH!')
      return true
    }
    // Check for ADULT evolution
    if (ageInHours >= 24 && ageInHours < 168 && !this.evolutionPending && this.teenType) {
      this.evolutionPending = 'ADULT'
      const fromStage = this.teenType === 'good' ? 'GOOD_BOY' : 'BAD_BOY'
      this.callbacks.onEvolutionReady?.(fromStage, 'ADULT')
      this.showMessage('✨ ADULT READY! PRESS EVOLVE!')
      return true
    }
    // Check for ELDER evolution
    if (ageInHours >= 168 && !this.evolutionPending) {
      this.evolutionPending = 'ELDER'
      this.callbacks.onEvolutionReady?.('ADULT', 'ELDER')
      this.showMessage('✨ ELDER READY! PRESS EVOLVE!')
      return true
    }
    // Not ready yet - show message with time remaining
    if (ageInHours < 8) {
      // Baby phase - show time until teen (even if teenType already assigned)
      const hoursLeft = Math.max(0, 8 - ageInHours).toFixed(1)
      this.showMessage(`⏳ NOT READY YET! ${hoursLeft}h UNTIL TEEN!`)
    } else if (ageInHours < 24) {
      // Teen phase - show time until adult
      const hoursLeft = Math.max(0, 24 - ageInHours).toFixed(1)
      this.showMessage(`⏳ NOT READY YET! ${hoursLeft}h UNTIL ADULT!`)
    } else if (ageInHours < 168) {
      this.showMessage('⏳ NOT READY YET! UNTIL ELDER!')
    } else {
      this.showMessage('⏳ EVOLUTION NOT READY!')
    }
    return false
  }
  
  // Get pending evolution (if any)
  getEvolutionPending(): string | null {
    return this.evolutionPending
  }
  
  confirmEvolution(): void {
    // Can't confirm TEEN - must use chooseTeenType instead!
    if (this.evolutionPending === 'TEEN') {
      this.showMessage('YOU MUST CHOOSE!')
      return
    }
    
    if (this.evolutionPending) {
      // Push back birth time so evolution doesn't trigger again immediately
      // This ensures user stays at new stage for a bit
      if (this.evolutionPending === 'ADULT') {
        this.birthTime = Date.now() - 35 * 60 * 60 * 1000  // Just before 36 hours
      } else if (this.evolutionPending === 'ELDER') {
        this.birthTime = Date.now() - 167 * 60 * 60 * 1000  // Just before 168 hours
      }
      
      this.callbacks.onGrowthStageChange?.(this.evolutionPending)
      this.showMessage(`✨ EVOLVED TO ${this.evolutionPending}!`)
      this.evolutionPending = null
      this.saveState()
    }
  }
  
  cancelEvolution(): void {
    // Push back birth time so evolution doesn't trigger again immediately
    // This lets the user "wait" before evolving
    const ageInHours = Date.now() - this.birthTime
    if (this.evolutionPending === 'ADULT') {
      this.birthTime = Date.now() - 35 * 60 * 60 * 1000  // Just before 36 hours
    } else if (this.evolutionPending === 'ELDER') {
      this.birthTime = Date.now() - 167 * 60 * 60 * 1000  // Just before 168 hours
    } else if (this.evolutionPending === 'TEEN') {
      // Push back to just before 8 hours
      this.birthTime = Date.now() - 7 * 60 * 60 * 1000  // Just before 8 hours
    }
    this.evolutionPending = null
    this.showMessage('EVOLUTION WAITED')
    this.saveState()
  }
  
  // Choose teen type (good or bad) - must be called when evolving from BABY to TEEN
  chooseTeenType(type: 'good' | 'bad'): void {
    if (this.evolutionPending !== 'TEEN') {
      this.showMessage('NOT TIME TO CHOOSE!')
      return
    }
    
    this.teenType = type
    this.evolutionPending = null
    const stageName = type === 'good' ? 'GOOD BOY' : 'BAD BOY'
    this.callbacks.onGrowthStageChange?.(type === 'good' ? 'GOOD_BOY' : 'BAD_BOY')
    
    // Unlock teen achievement
    if (type === 'good') {
      this.unlockAchievement('teenGood')
    } else {
      this.unlockAchievement('teenBad')
    }
    
    this.showMessage(`✨ BECAME ${stageName}!`)
    this.saveState()
  }
  
  // Get current teen type
  getTeenType(): 'good' | 'bad' | null {
    return this.teenType
  }
  
  private getEmotion(): string {
    // Egg phase - return cracked or uncracked based on time
    if (this.hasEgg) {
      const elapsed = Date.now() - this.eggStartTime
      const totalHatchTime = 60 * 60 * 1000  // 60 minutes max
      const crackedThreshold = 20 * 60 * 1000  // 20 minutes
      if (elapsed >= crackedThreshold) return 'cracked'
      return 'neutral'
    }
    // Ghost mode - ALWAYS show ghost sprite only (no clean, no sleep, no other sprites)
    if (this.isGhost) return 'ghost'
    // If waking up angry, show angry
    if (this.wakeUpAngry) return 'angry'
    
    // Show action-specific expression - but not if sleeping (can't show happy while sleeping!)
    const actionHour = new Date().getHours()
    const isActionTired = actionHour >= 18 || actionHour < 6
    if (!this.isSleeping && Date.now() - this.lastActionTime < 2000) {
      if (this.lastActionType === 'clean') return 'clean'
      if (this.lastActionType === 'feed') return isActionTired ? 'neutral' : 'happy'
      if (this.lastActionType === 'play' && !this.isGhost) return 'play'
      if (this.lastActionType === 'pet') return 'happy'
    }
    
    // If sick, show sick (unless sleeping)
    if (this.isSick && !this.isSleeping) return 'sick'
    // If sleeping, show sleep sprite (can't show happy while sleeping)
    if (this.isSleeping) return 'sleep'
    // Night time (6pm-6am) - show tired intermittently for living Bulk
    const hour = new Date().getHours()
    if (!this.isGhost && hour >= 18 && hour < 6 && this.showTiredSprite) return 'tired'
    // Hunger warning - very hungry
    if (this.hunger < 20) return 'hungry'
    if (this.hunger < 30) return 'hungry'
    if (this.happiness < 30) return 'sad'
    
    if (this.cleanliness < 30) return 'cry'
    
    // At night (6pm-6am), even with high happiness show tired sometimes
    const nightHour = new Date().getHours()
    const isNight = nightHour >= 18 || nightHour < 6
    if (isNight && !this.isGhost && this.showTiredSprite) return 'tired'
    
    if (this.happiness > 70 && this.hunger > 50) return 'happy'
    return 'neutral'
  }
  
  private updateSprite(): void {
    const age = this.getGrowthStage()
    const emotion = this.getEmotion()
    const path = this.spritePaths[age]?.[emotion] || this.spritePaths.BABY.neutral
    this.currentSprite = this.sprites[path] || null
  }
  
  private gameLoop(): void {

    // Track total time played
    this.totalTimePlayed += 16 // ~60fps
    
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop())
    
    // Update stats over time
    this.updateStats()
    
    // Auto-submit every hour OR on app reopen (once per session)
    const now = Date.now()
    const hourSinceLastSubmit = (now - this.lastAutoSubmitTime) / (1000 * 60 * 60)
    if (hourSinceLastSubmit >= 1) {
      this.lastAutoSubmitTime = now
      const ageMinutes = Math.floor((now - this.birthTime) / 60000)
      this.callbacks.onAutoSubmit?.(ageMinutes)
    }
    
    // Update sprite
    this.updateSprite()
    
    // Animate bobbing and wandering
    const nowMs = Date.now()
    this.paceTimer += 16 // ~60fps
    
    // Mood reaction timer - every 5-10 seconds, do a mood-based reaction
    this.moodReactionTimer += 16
    if (this.moodReactionTimer > 5000 + Math.random() * 5000 && !this.isSleeping && !this.isLookingAround) {
      // Time-based greetings
      const hour = new Date().getHours()
      const nowMs = Date.now()
      if (this.lastGreetingTime === 0 || nowMs - this.lastGreetingTime > this.greetingCooldown) {
        let greeting = ''
        if (hour >= 5 && hour < 8) greeting = '🌅 Good morning!'
        else if (hour >= 8 && hour < 12) greeting = '☀️ Good morning!'
        else if (hour >= 12 && hour < 14) greeting = '🌞 Good afternoon!'
        else if (hour >= 14 && hour < 17) greeting = '🌤️ Good afternoon!'
        else if (hour >= 17 && hour < 21) greeting = '🌆 Good evening!'
        else if (hour >= 21 || hour < 5) greeting = '🌙 Good night!'
        
        if (greeting && Math.random() > 0.7) { // Only show 30% of the time
          this.showMessage(greeting)
          this.lastGreetingTime = nowMs
        }
      }
      
      // Pick a reaction based on mood (compute inline)
      const avgStats = (this.hunger + this.happiness + this.cleanliness) / 3
      let mood: 'happy' | 'ok' | 'sad' | 'miserable' = avgStats >= 70 ? 'happy' : avgStats < 40 ? 'miserable' : avgStats < 60 ? 'sad' : 'ok'
      if (mood === 'happy' && Math.random() > 0.5) {
        this.isAnimatingBounce = true
        this.bounceStartTime = nowMs
        this.currentMoodReaction = 'bounce'
      } else if (mood === 'sad' || mood === 'miserable') {
        // Slightly bow head - just a small bob change
        this.currentMoodReaction = 'sad'
      }
      this.moodReactionTimer = 0
    }
    
    // Tired sprite alternation - only for living Bulk at night
    // Show tired every 2-4 seconds for 1 second, then switch back
    if (!this.isGhost && !this.isSleeping) {
      const hour = new Date().getHours()
      const isNight = hour >= 18 || hour < 6
      if (isNight) {
        this.tiredSpriteTimer += 16
        if (this.showTiredSprite && this.tiredSpriteTimer > 1000) {
          // Been showing tired, now switch back to normal
          this.showTiredSprite = false
          this.tiredSpriteTimer = 0
        } else if (!this.showTiredSprite && this.tiredSpriteTimer > 2000 + Math.random() * 2000) {
          // Been normal, show tired now
          this.showTiredSprite = true
          this.tiredSpriteTimer = 0
        }
      } else {
        this.showTiredSprite = false
        this.tiredSpriteTimer = 0
      }
    }
    
    // Look around during pauses - every 3-5 seconds
    this.lookAroundTimer += 16
    if (this.lookAroundTimer > 3000 + Math.random() * 2000 && !this.isPacing && !this.isSleeping && !this.isAnimatingBounce) {
      this.isLookingAround = true
      this.lookAroundTimer = 0
      // Look around for 500ms then return to normal
      setTimeout(() => {
        this.isLookingAround = false
      }, 500)
    }
    
    // Every 4-6 seconds, pause or change direction
    if (this.paceTimer > 4000 + Math.random() * 2000) {
      if (this.isPacing) {
        // Pause for 1-2 seconds
        this.isPacing = false
        this.paceTimer = 0
      } else {
        // Resume walking in new direction
        this.isPacing = true
        this.paceDirection = Math.random() > 0.5 ? 1 : -1
        this.paceTimer = 0
      }
    }
    
    // Move horizontally when pacing (only if not sleeping)
    if (this.isPacing && !this.isSleeping) {
      // Ghost floats more ethereally - slower horizontal, more vertical bob
      // Club dance - faster, wider movement
      let moveSpeed = this.isGhost ? 0.1 : 0.15
      let maxRange = 10
      
      if (this.selectedBackground === 'club' && !this.isGhost) {
        moveSpeed = 0.8  // Dance speed!
        maxRange = 40  // Wide dance range
        // Dance direction switches faster
        if (Math.random() < 0.02) this.paceDirection *= -1
      }
      
      this.paceOffset += this.paceDirection * moveSpeed
      // Clamp to small zone - stays within logical center area
      if (Math.abs(this.paceOffset) > maxRange) {
        this.paceDirection *= -1
      }
    } else {
      // Gentle drift back to center when paused
      this.paceOffset *= 0.95
    }
    
    // When sleeping, center and don't move
    if (this.isSleeping) {
      this.paceOffset = 0
    }
    
    // Handle mood reaction bounce
    let bounceOffset = 0
    if (this.isAnimatingBounce && !this.isSleeping) {
      const bounceElapsed = nowMs - this.bounceStartTime
      if (bounceElapsed < 500) {
        // Bouncy jump motion
        bounceOffset = Math.sin(bounceElapsed / 500 * Math.PI) * -8
      } else {
        this.isAnimatingBounce = false
        this.currentMoodReaction = ''
      }
    }
    
    // Ghost floats with vertical bobbing - living bulk stays still
    // Egg wiggles based on how close to hatching
    if (!this.isSleeping && !this.isAnimatingBounce) {
      if (this.isGhost) {
        // Ethereal floating - slower wave (0.002), bigger amplitude (6px)
        this.bobOffset = Math.sin(nowMs * 0.002) * 6
      } else if (this.hasEgg) {
        // Egg tilt - slow pendulum rock only, no sliding/bobbing
        const elapsed = nowMs - this.eggStartTime
        const totalHatchTime = 60 * 60 * 1000  // 60 minutes max
        const progress = Math.min(elapsed / totalHatchTime, 1)
        // Slow tilt: pendulum rock, amplitude increases with progress
        const tiltAmp = 0.04 + progress * 0.04  // 0.04 to 0.08 radians
        this.eggTilt = Math.sin(nowMs * 0.0005) * tiltAmp
        // No bobOffset for egg - just rock
      } else {
        // Living bulk - no bobbing/floating
        this.bobOffset = 0
      }
    } else if (this.isAnimatingBounce) {
      this.bobOffset = bounceOffset
    } else {
      this.bobOffset = 0
    }
    
    // Animate idle look left/right (flip every 2-4 seconds)
    if (nowMs - this.lastFlipTime > 2000 + Math.random() * 2000) {
      this.flipOffset = this.flipOffset * -1  // Flip direction
      this.lastFlipTime = nowMs
    }
    
    // Render
    // Update weather
    this.updateWeather()
    
    this.render()
  }
  
  private updateWeather(): void {
    // Only update weather at supported locations
    if (!this.weatherLocations.includes(this.selectedBackground)) {
      if (this.weather !== 'sunny') {
        this.weather = 'sunny'
        this.rainDrops = []
        this.snowflakes = []
      }
      return
    }
    
    // Don't update if canvas not ready
    if (!this.canvas || !this.canvas.width) return
    
    const nowMs = Date.now()
    this.weatherTimer += 16
    
    // Change weather every 2-4 minutes (less frequent but lasts longer)
      if (this.weatherTimer > this.weatherChangeInterval) {
        this.weatherTimer = 0
        this.weatherChangeInterval = 300000 + Math.random() * 300000  // 5-10 minutes
      
      // Randomly pick new weather
      const rand = Math.random()
      if (rand < 0.5) {
        this.weather = 'sunny'
      } else if (rand < 0.7) {
        this.weather = 'rain'
      } else if (rand < 0.85) {
        this.weather = 'storm'
      } else {
        this.weather = 'snow'
      }
      
      // Clear particles when switching to sunny
      if (this.weather === 'sunny') {
        this.rainDrops = []
        this.snowflakes = []
      }
    }
    
    // Update rain drops
    if (this.weather === 'rain' || this.weather === 'storm') {
      // Add new drops
      if (this.rainDrops.length < 100) {
        this.rainDrops.push({
          x: Math.random() * this.canvas.width,
          y: -20,
          speed: 8 + Math.random() * 4,
          length: 8 + Math.random() * 8
        })
      }
      
      // Update existing drops
      for (let i = this.rainDrops.length - 1; i >= 0; i--) {
        this.rainDrops[i].y += this.rainDrops[i].speed
        if (this.rainDrops[i].y > this.canvas.height) {
          this.rainDrops.splice(i, 1)
        }
      }
    }
    
    // Update snowflakes
    if (this.weather === 'snow') {
      // Add new snowflakes
      if (this.snowflakes.length < 80) {
        this.snowflakes.push({
          x: Math.random() * this.canvas.width,
          y: -10,
          speed: 1 + Math.random() * 2,
          size: 2 + Math.random() * 2,
          drift: Math.random() * 2 - 1
        })
      }
      
      // Update existing snowflakes
      for (let i = this.snowflakes.length - 1; i >= 0; i--) {
        const flake = this.snowflakes[i]
        flake.y += flake.speed
        flake.x += Math.sin(flake.y * 0.02) * flake.drift
        if (flake.y > this.canvas.height) {
          this.snowflakes.splice(i, 1)
        }
      }
    }
    
    // Lightning for storms
    if (this.weather === 'storm' && Math.random() < 0.002) {
      this.lightningFlash = 5 // frames to flash
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash--
    }
  }
  
  private _lastStatUpdate = 0
  
  private updateStats(): void {
    const nowMs = Date.now()
    // Throttle to once per second max
    if (nowMs - this._lastStatUpdate < 1000) return
    this._lastStatUpdate = nowMs
    
    const elapsed = nowMs - this.lastUpdateTime
    const minutes = elapsed / 60000
    
    if (minutes > 0) {
      // Don't decay stats while sleeping
      if (!this.isSleeping) {
        // Target: hunger empty in 18h, happiness 14h, cleanliness 36h, energy 16h
        let hungerDecay = minutes * (100 / 10 / 60)  // 10 hours to empty from 100%
        let happinessDecay = minutes * (100 / 14 / 60)  // 14 hours to empty
        let cleanlinessDecay = minutes * (100 / 36 / 60)  // 36 hours to empty
        let energyDecay = minutes * (100 / 16 / 60)  // 16 hours to empty
        let sicknessChance = this.sicknessChance // 0.02 default
        
        const hour = new Date().getHours()
        // Night: 6pm-6am = slower decay
        if (hour >= 18 || hour < 6) {
          hungerDecay *= 0.7  // 30% slower at night
          happinessDecay *= 0.7  // 30% slower at night
          cleanlinessDecay *= 0.7  // 30% slower at night
          energyDecay *= 0.7  // 30% slower at night
        }
        
        switch (this.selectedBackground) {
          case 'camp':
            // Camping: peaceful, slower happiness decay, but more bugs = higher sickness
            happinessDecay *= 0.7  // 30% slower decay
            sicknessChance *= 2    // 2x sickness chance (bugs)
            break
          case 'city':
            // City: pollution = faster cleanliness decay, but fun = XP bonus handled elsewhere
            cleanlinessDecay *= 1.5  // 50% faster decay
            energyDecay *= 1.5  // 50% faster energy drain (exhausting)
            break
          case 'beach':
            // Beach: sand = faster cleanliness, but happy
            cleanlinessDecay *= 1.3
            happinessDecay *= 0.8  // 20% slower decay
            energyDecay *= 0.8  // 20% slower drain (relaxing)
            break
          case 'mountain':
            // Mountain: peaceful = slower hunger decay
            hungerDecay *= 0.7  // 30% slower decay
            happinessDecay *= 0.6  // 40% slower decay
            energyDecay *= 0.7  // 30% slower drain (peaceful)
            break
        }
        
        // Dirty penalty - more poops = faster happiness decay
        const poopPenalty = this.poops.length * 0.02
        
        // Ghost mode - hunger stays at 100%, cleanliness doesn't decay
        if (this.isGhost) {
          hungerDecay = 0
          cleanlinessDecay = 0
          this.hunger = 100  // Always full
        }
        
        // Decrease stats over time with location modifiers
        this.hunger = Math.max(this.isGhost ? 100 : 0, this.hunger - hungerDecay)
        this.happiness = Math.max(0, this.happiness - happinessDecay - poopPenalty)
        this.cleanliness = Math.max(0, this.cleanliness - cleanlinessDecay)
        this.energy = Math.max(0, this.energy - energyDecay)
        
        // Ghost mode - auto sleep when exhausted, wake at 25%
        if (this.isGhost) {
          if (this.energy === 0 && !this.isSleeping) {
            this.isSleeping = true
            this.sleepStartTime = Date.now()
            this.showMessage('👻 GHOST PASSED OUT...')
            this.callbacks.onSleepChange?.(true)
          } else if (this.isSleeping && this.energy >= 25) {
            // Wake up automatically at 25%
            this.isSleeping = false
            this.showMessage('👻 GHOST AWOKE...')
            this.callbacks.onSleepChange?.(false)
          }
        }
        
        // Ghost mode - regenerate energy while sleeping (outside the if/else so it always runs)
        if (this.isGhost && this.isSleeping) {
          const hour = new Date().getHours()
          let energyRegen = minutes * (100 / 10 / 60)  // Base: recover in 10 hours
          
          // Night bonus: 6pm-6am = 3x faster recovery
          if (hour >= 18 || hour < 6) {
            energyRegen *= 3  // Recover in ~3.3 hours at night
          }
          
          this.energy = Math.min(100, this.energy + energyRegen)
        }
      } else {
        // While sleeping - regenerate energy!
        const hour = new Date().getHours()
        let energyRegen = minutes * (100 / 10 / 60)  // Base: recover in 10 hours
        
        // Night bonus: 6pm-6am = 3x faster recovery
        if (hour >= 18 || hour < 6) {
          energyRegen *= 3  // Recover in ~3.3 hours at night
        }
        
        this.energy = Math.min(100, this.energy + energyRegen)
      }
      
      // Birthday events - celebration at milestones
      const ageInHours = (nowMs - this.birthTime) / (1000 * 60 * 60)
      const lastAgeCheck = this.lastUpdateTime / (1000 * 60 * 60)
      
      // 1 day birthday (24 hours)
      if (ageInHours >= 24 && lastAgeCheck < 24) {
        this.showMessage('🎂 HAPPY 1ST BIRTHDAY!')
        this.happiness = 100
        this.unlockAchievement('age24h')
      }
      // 1 week birthday (168 hours)
      if (ageInHours >= 96 && lastAgeCheck < 96) {
        this.showMessage('🎉 1 WEEK OLD!')
        this.happiness = 100
        this.unlockAchievement('age7d')
        this.unlockAchievement('elder')  // Elder achievement
      }
      
      // Ghost achievements
      if (this.isGhost) {
        const ghostHours = this.getTimeAsGhostHours()
        if (ghostHours >= 1 && !this.achievements['ghostOneHour']) {
          this.unlockAchievement('ghostOneHour')
        }
        if (ghostHours >= 24 && !this.achievements['ghostOneDay']) {
          this.unlockAchievement('ghostOneDay')
        }
        if (ghostHours >= 168 && !this.achievements['ghostWeek']) {
          this.unlockAchievement('ghostWeek')
        }
      }
      
      // Poop chance (not in ghost mode or egg)
      if (!this.isGhost && !this.hasEgg && Math.random() < minutes * 0.1) {
        this.spawnPoop()
      }
      
      // Ghost mode - auto sleep from 11am-2pm (forced nap time), awake at night
      if (this.isGhost) {
        const hour = new Date().getHours()
        const isNapTime = hour >= 11 && hour < 14  // 11am-2pm forced nap
        
        if (isNapTime && !this.isSleeping) {
          // Force sleep during nap time
          this.isSleeping = true
          this.sleepStartTime = Date.now()
          this.showMessage('👻 GHOST NAP TIME...')
          this.callbacks.onSleepChange?.(true)
        } else if (!isNapTime && this.isSleeping && this.energy >= 25) {
          // Wake up after nap time if not exhausted
          this.isSleeping = false
          this.showMessage('👻 GHOST AWAKE...')
          this.callbacks.onSleepChange?.(false)
        }
      }
      
      this.lastUpdateTime = nowMs
      this.emitStats()
      this.checkDeath()
      this.saveState()
    }
  }
  
  private spawnPoop(): void {
    if (this.poops.length < 10) {
      this.poops.push({
        x: Math.random() * 200 + 50,
        y: Math.random() * 100 + 200,
        age: 0,
        isGolden: Math.random() < 0.05,
      })
      this.poopCount++
      this.callbacks.onPoopCountChange?.(this.poops.length)
    }
  }
  
  
  private drawWeather(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Storm overlay (dark)
    if (this.weather === 'storm') {
      ctx.fillStyle = 'rgba(20, 20, 40, 0.4)'
      ctx.fillRect(0, 0, w, h)
    }
    
    // Rain overlay (slightly dark)
    if (this.weather === 'rain') {
      ctx.fillStyle = 'rgba(30, 30, 50, 0.2)'
      ctx.fillRect(0, 0, w, h)
    }
    
    // Snow overlay (bright/white)
    if (this.weather === 'snow') {
      ctx.fillStyle = 'rgba(200, 220, 255, 0.15)'
      ctx.fillRect(0, 0, w, h)
    }
    
    // Draw rain drops
    if (this.weather === 'rain' || this.weather === 'storm') {
      ctx.strokeStyle = this.weather === 'storm' ? 'rgba(150, 180, 255, 0.6)' : 'rgba(150, 180, 255, 0.4)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (const drop of this.rainDrops) {
        ctx.moveTo(drop.x, drop.y)
        ctx.lineTo(drop.x - 1, drop.y + drop.length)
      }
      ctx.stroke()
    }
    
    // Draw snowflakes
    if (this.weather === 'snow') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      for (const flake of this.snowflakes) {
        ctx.beginPath()
        ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    // Lightning flash
    if (this.lightningFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.lightningFlash * 0.15})`
      ctx.fillRect(0, 0, w, h)
    }
  }
  
  private render(): void {
    const { ctx, canvas } = this
    const w = canvas.width
    const h = canvas.height
    
    // Clear
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, w, h)
    
    // Draw background (day or night based on time)
    const currentBg = this.getCurrentBackground()
    if (currentBg) {
      // Always use contain to show full background
      const scale = Math.min(w / currentBg.width, h / currentBg.height)
      const bw = currentBg.width * scale
      const bh = currentBg.height * scale
      const bx = (w - bw) / 2
      const by = (h - bh) / 2
      ctx.drawImage(currentBg, bx, by, bw, bh)
    }
    
    // Draw weather effects
    this.drawWeather(ctx, w, h)
    

    
    // Draw character (centered)
    if (this.currentSprite) {
      // Different sizes for different ages
      // Egg: 40% smaller | Baby: 5% smaller | Teen: baseline | Adult/Elder: 10% bigger
      const stage = this.getGrowthStage()
      const baseSize = stage === 'EGG' ? 0.26 : stage === 'BABY' ? 0.33 : stage === 'ADULT' ? 0.47 : stage === 'ELDER' ? 0.47 : 0.42
      const size = Math.min(w, h) * baseSize
      const cx = w / 2 + this.paceOffset
      const cy = h / 2 + 20 + (stage === 'EGG' ? 50 : 0) + this.bobOffset
      
      ctx.save()
      ctx.translate(cx, cy)
      if (this.hasEgg) ctx.rotate(this.eggTilt + this.eggRollAngle)  // Tilt + roll for egg
      ctx.scale(this.flipOffset, 1)  // Flip horizontally for idle look
      ctx.drawImage(
        this.currentSprite,
        -size / 2,
        -size / 2,
        size,
        size
      )
      ctx.restore()
    }
    
    // Draw poops
    for (const poop of this.poops) {
      const px = (w / 300) * poop.x
      const py = (h / 300) * poop.y
      ctx.font = '24px sans-serif'
      ctx.fillText(poop.isGolden ? '✨💩' : '💩', px, py)
    }
    
    // Draw floating hearts
    for (const heart of this.floatingHearts) {
      ctx.globalAlpha = heart.alpha
      if (this.heartImage) {
        const heartSize = 32
        ctx.drawImage(this.heartImage, heart.x - heartSize/2, heart.y - heart.offset - heartSize, heartSize, heartSize)
      }
    }
    
    // Draw floating schmegs (being consumed)
    for (const schmeg of this.floatingSchmegs) {
      ctx.globalAlpha = schmeg.alpha
      if (this.schmegImage) {
        // Maintain aspect ratio (image is ~1:2.2 tall)
        const w = 30
        const h = w * (this.schmegImage.height / this.schmegImage.width)
        ctx.drawImage(this.schmegImage, schmeg.x - w/2, schmeg.y - schmeg.offset - h, w, h)
      }
    }
    
    // Draw floating medicines (being consumed)
    for (const medicine of this.floatingMedicines) {
      ctx.globalAlpha = medicine.alpha
      if (this.medicineImage) {
        const w = 30
        const h = w * (this.medicineImage.height / this.medicineImage.width)
        ctx.drawImage(this.medicineImage, medicine.x - w/2, medicine.y - medicine.offset - h, w, h)
      }
    }
    
    // Draw floating foods (being consumed)
    for (const food of this.floatingFoods) {
      ctx.globalAlpha = food.alpha
      if (food.type === 'milk' && this.milkImage) {
        ctx.drawImage(this.milkImage, food.x - 20, food.y - food.offset - 50, 40, 40)
      } else if (food.type === 'hotdog' && this.hotdogImage) {
        ctx.drawImage(this.hotdogImage, food.x - 20, food.y - food.offset - 50, 40, 40)
      }
    }
    ctx.globalAlpha = 1
    
    // Update floating hearts
    this.floatingHearts = this.floatingHearts.filter(h => {
      h.offset += 1.5
      h.alpha -= 0.02
      return h.alpha > 0
    })
    
    // Update floating schmegs
    this.floatingSchmegs = this.floatingSchmegs.filter(s => {
      s.offset += 2
      s.alpha -= 0.025
      return s.alpha > 0
    })
    
    // Update floating medicines
    this.floatingMedicines = this.floatingMedicines.filter(m => {
      m.offset += 2
      m.alpha -= 0.025
      return m.alpha > 0
    })
    
    // Update floating foods
    this.floatingFoods = this.floatingFoods.filter(f => {
      f.offset += 2
      f.alpha -= 0.025
      return f.alpha > 0
    })
  }
  
  private onClick(e: MouseEvent): void {

    
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    
    // Check if clicked on character (adjust for size)
    const stage = this.getGrowthStage()
    const clickRadius = stage === 'BABY' ? 0.15 : stage === 'ADULT' ? 0.2 : 0.25
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    if (dist < rect.width * clickRadius) {
      // Add floating heart at click position
      this.floatingHearts.push({ x, y, alpha: 1, offset: 0 })
      this.petBulk()
    }
  }
  
  // Helper to check if ghost can interact (not napping and not exhausted)
  private canGhostInteract(): boolean {
    if (!this.isGhost) return true
    const hour = new Date().getHours()
    const isNapTime = hour >= 11 && hour < 14  // 11am-2pm nap
    if (isNapTime) return false
    if (this.energy < 25) return false
    return true
  }
  
  private petBulk(): void {
    // Egg phase - petting reduces hatch timer
    if (this.hasEgg) {
      // Reduce hatch time by 1 second
      this.eggHatchAt = Math.max(this.eggStartTime + 1000, this.eggHatchAt - 1000)
      this.playSound('pet')
      
      // Track consecutive pets for roll
      this.eggPetCount++
      if (this.eggPetCount >= 10) {
        this.eggPetCount = 0
        // Roll animation - will be handled in game loop
        this.bobOffset = -20  // Big hop
      }
      
      // Check if hatched
      if (Date.now() >= this.eggHatchAt) {
        this.hasEgg = false
        this.eggTilt = 0
        this.eggPetCount = 0
        this.birthTime = Date.now()
        this.showMessage('🥚 THE EGG HATCHED!')
        this.callbacks.onGrowthStageChange?.('BABY')
      }
      return
    } else {
      this.eggPetCount = 0
    }
    
    // If sleeping, wake up mad (just like waking early from sleep button)
    if (this.isSleeping) {
      this.toggleSleep()
      return
    }
    
    // Ghost mode - if napping or exhausted, can't interact
    if (this.isGhost && !this.canGhostInteract()) {
      this.showMessage('👻 GHOST IS NAPPING...')
      return
    }
    // Too many poops - refuse to do anything!
    if (this.poops.length >= 5) {
      this.showMessage('💩 TOO DIRTY! CLEAN FIRST!')
      return
    }
    
    this.lastActionTime = Date.now()
    this.lastActionType = 'pet'
    this.flipOffset = 1  // Face forward when interacting
    this.paceOffset = 0  // Center when interacting
    this.happiness = Math.min(100, this.happiness + 10)
    if (!this.isGhost) {
      this.cleanliness = Math.max(0, this.cleanliness - 1)  // Petting gets you dirty!
    }
    this.comboCount++
    this.collection.maxCombo = Math.max(this.collection.maxCombo, this.comboCount)
    
    if (this.comboCount >= 10 && !this.achievements['combo10']) {
      this.unlockAchievement('combo10')
    }
    if (this.comboCount >= 50 && !this.achievements['combo50']) {
      this.unlockAchievement('combo50')
    }
    
    // Check for greeting
    this.checkGreeting()
    
    this.playSound('pet')
    this.showMessage('❤️')
    this.addXP(5)
    this.checkSickness()
    this.callbacks.onComboChange?.(this.comboCount)
    this.emitStats()
    this.saveState()
  }
  
  private checkGreeting(): void {
    const nowMs = Date.now()
    if (nowMs - this.lastGreetingTime > this.greetingCooldown) {
      const hour = new Date().getHours()
      if (hour >= 6 && hour < 12) {
        this.showMessage('☀️ GOOD MORNING!')
        this.playSound('happy')
      } else if (hour >= 12 && hour < 17) {
        this.showMessage('🌤️ HELLO!')
        this.playSound('happy')
      } else if (hour >= 17 && hour < 21) {
        this.showMessage('🌅 GOOD EVENING!')
        this.playSound('happy')
      } else {
        this.showMessage('🌙 HELLO THERE!')
        this.playSound('happy')
      }
      this.lastGreetingTime = nowMs
    }
  }
  
  feedBulk(): void {
    // Can't interact with egg!
    if (this.hasEgg) {
      this.showMessage('🥚 STILL AN EGG!')
      return
    }
    // Can't do anything while sick!
    if (this.isSick) {
      this.showMessage('🤒 TOO SICK! NEED MEDS!')
      return
    }
    // Ghost mode - if exhausted (energy 0), can't interact until 25%
    if (this.isGhost && !this.canGhostInteract()) {
      this.showMessage('👻 CANT INTERACT...')
      return
    }
    // Too many poops - refuse to do anything!
    if (!this.isGhost && this.poops.length >= 5) {
      this.showMessage('💩 TOO DIRTY! CLEAN FIRST!')
      return
    }
    this.lastActionTime = Date.now()
    this.lastActionType = 'feed'
    this.flipOffset = 1  // Face forward when interacting
    // Ghost mode - hunger stays at 100, but feeding gives happiness
    if (this.isGhost) {
      this.happiness = Math.min(100, this.happiness + 15)
    }
    // If already full, force feeding makes them dirty!
    if (this.hunger >= 100) {
      this.hunger = 100
      this.cleanliness = Math.max(0, this.cleanliness - 15)
      this.happiness = Math.max(0, this.happiness - 10)
      this.showMessage('🤮 TOO FULL! -DIRTY')
    } else {
      this.hunger = Math.min(100, this.hunger + 30)
      this.cleanliness = Math.max(0, this.cleanliness - 5)
    }
    
    this.collection.totalFeeds++
    
    if (!this.achievements['first_feed']) {
      this.unlockAchievement('first_feed')
    }
    if (this.collection.totalFeeds >= 100 && !this.achievements['feed100']) {
      this.unlockAchievement('feed100')
    }
    
    // Spawn food effect based on age
    const stage = this.getGrowthStage()
    const foodType = stage === 'BABY' ? 'milk' : 'hotdog'
    const canvas = this.canvas
    const x = canvas.width / 2 + (Math.random() - 0.5) * 50
    const y = canvas.height / 2
    this.floatingFoods.push({ x, y, alpha: 1, offset: 0, type: foodType })
    
    const foodIcon = foodType === 'milk' ? '🍼' : '🌭'
    this.showMessage(`${foodIcon} YUM!`)
    this.playSound('feed')
    this.addXP(10)
    this.checkSickness()
    this.emitStats()
    this.saveState()
  }
  
  playWithBulk(): void {
    // Can't interact with egg!
    if (this.hasEgg) {
      this.showMessage('🥚 STILL AN EGG!')
      return
    }
    // Can't do anything while sick!
    if (this.isSick) {
      this.showMessage('🤒 TOO SICK! NEED MEDS!')
      return
    }

    // Ghost mode - if exhausted (energy 0), can't interact until 25%
    if (this.isGhost && !this.canGhostInteract()) {
      this.showMessage('👻 CANT INTERACT...')
      return
    }
    // Too many poops - refuse to do anything!
    if (this.poops.length >= 5) {
      this.showMessage('💩 TOO DIRTY! CLEAN FIRST!')
      return
    }
    if (this.energy < 30) {
      this.showMessage('😴 TOO TIRED!')
      return
    }
    this.lastActionTime = Date.now()
    this.lastActionType = 'play'
    this.flipOffset = 1  // Face forward when interacting
    this.happiness = Math.min(100, this.happiness + 25)
    this.energy = Math.max(0, this.energy - 8)  // Playing costs 8 energy
    this.hunger = Math.max(0, this.hunger - 10)
    this.cleanliness = Math.max(0, this.cleanliness - 5)  // Playing gets you dirty!
    
    this.collection.totalPlays++
    
    if (!this.achievements['first_play']) {
      this.unlockAchievement('first_play')
    }
    if (this.collection.totalPlays >= 100 && !this.achievements['play100']) {
      this.unlockAchievement('play100')
    }
    
    this.showMessage('🎾 FUN!')
    this.playSound('play')
    this.addXP(15)
    this.checkSickness()
    this.emitStats()
    this.saveState()
  }
  
  cleanBulk(): void {
    // Can't interact with egg!
    if (this.hasEgg) {
      this.showMessage('🥚 STILL AN EGG!')
      return
    }
    // Can't do anything while sick!
    if (this.isSick) {
      this.showMessage('🤒 TOO SICK! NEED MEDS!')
      return
    }

    // Ghost mode - if exhausted (energy 0), can't interact until 25%
    if (this.isGhost && !this.canGhostInteract()) {
      this.showMessage('👻 CANT INTERACT...')
      return
    }
    this.lastActionTime = Date.now()
    this.lastActionType = 'clean'
    this.cleanliness = Math.min(100, this.cleanliness + 40)
    this.energy = Math.max(0, this.energy - 2)  // Cleaning costs 2 energy
    
    // Check for golden poops before clearing
    const goldenPoops = this.poops.filter(p => p.isGolden)
    if (goldenPoops.length > 0) {
      this.collection.goldenPoopsFound += goldenPoops.length
      this.showMessage(`✨ FOUND ${goldenPoops.length} GOLDEN POOP${goldenPoops.length > 1 ? 'S' : ''}!`)
      if (this.collection.goldenPoopsFound >= 1 && !this.achievements['golden']) {
        this.unlockAchievement('golden')
      }
    }
    
    this.poops = []
    
    this.collection.totalCleans++
    this.showMessage('✨ SPARKLING CLEAN!')
    
    if (!this.achievements['first_clean']) {
      this.unlockAchievement('first_clean')
    }
    if (this.collection.totalCleans >= 50 && !this.achievements['poop50']) {
      this.unlockAchievement('poop50')
    }
    if (this.collection.totalCleans >= 100 && !this.achievements['poop100']) {
      this.unlockAchievement('poop100')
    }
    
    this.showMessage('✨ CLEAN!')
    this.playSound('clean')
    this.addXP(10)
    this.checkSickness()
    this.callbacks.onPoopCountChange?.(0)
    this.emitStats()
    this.saveState()
  }
  
  private showMessage(text: string): void {
    this.callbacks.onMessageChange?.(text)
    setTimeout(() => this.callbacks.onMessageChange?.(null), 4000)
  }
  
  private emitStats(): void {
    // Throttle UI updates to every 500ms
    const now = Date.now()
    if (this._lastEmitTime && now - this._lastEmitTime < 500) return
    this._lastEmitTime = now
    
    this.callbacks.onStatsChange?.(this.hunger, this.happiness, this.cleanliness, this.energy)
    
    // Send notifications for low stats
    if (this.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      // Throttle notifications - only notify if we haven't recently
      const now = Date.now()
      if (!this._lastNotificationTime || now - this._lastNotificationTime > 60000) { // 1 min cooldown
        if (this.hunger < 20) {
          new Notification('Bulk Needs You!', { body: '😰 Bulk is starving!', icon: '/images/cover-baby.png' })
          this._lastNotificationTime = now
        } else if (this.energy < 20) {
          new Notification('Bulk Needs You!', { body: '😴 Bulk is exhausted!', icon: '/images/cover-baby.png' })
          this._lastNotificationTime = now
        } else if (this.happiness < 20) {
          new Notification('Bulk Needs You!', { body: '💔 Bulk is very sad!', icon: '/images/cover-baby.png' })
          this._lastNotificationTime = now
        }
      }
    }
    
    let mood: 'happy' | 'ok' | 'sad' | 'miserable' = 'ok'
    let weatherModifier = 0
    // Weather affects mood slightly
    if (this.weather === 'rain' || this.weather === 'storm') {
      weatherModifier = -5 // Rain makes slightly sadder
    } else if (this.weather === 'snow') {
      weatherModifier = -3 // Snow makes slightly sadder
    } else if (this.weather === 'sunny') {
      weatherModifier = 3 // Sunny makes slightly happier
    }
    const avg = (this.hunger + this.happiness + this.cleanliness) / 3 + weatherModifier
    if (avg >= 70) mood = 'happy'
    else if (avg < 40) mood = 'miserable'
    else if (avg < 60) mood = 'sad'
    this.callbacks.onMoodChange?.(mood)
    
    const ageInHours = (Date.now() - this.birthTime) / (1000 * 60 * 60)
    const ageString = ageInHours < 24 
      ? `${Math.floor(ageInHours)}h`
      : `${Math.floor(ageInHours / 24)}d`
    this.callbacks.onAgeChange?.(ageString)
    
    // Check for evolution (reuse ageInHours from above)
    // Evolution is now manual - only triggered by user pressing evolve button in age menu
    // Auto-evolution disabled
    /*
    if (ageInHours >= 8 && ageInHours < 22 && !this.teenType && !this.evolutionPending) {
      this.evolutionPending = 'TEEN'
      this.callbacks.onEvolutionReady?.('BABY', 'TEEN')
    }
    else if (ageInHours >= 22 && ageInHours < 96 && !this.evolutionPending && this.teenType) {
      this.evolutionPending = 'ADULT'
      const fromStage = this.teenType === 'good' ? 'GOOD_BOY' : 'BAD_BOY'
      this.callbacks.onEvolutionReady?.(fromStage, 'ADULT')
    }
    else if (ageInHours >= 96 && !this.evolutionPending) {
      this.evolutionPending = 'ELDER'
      this.callbacks.onEvolutionReady?.('ADULT', 'ELDER')
    }
    */
    // Use getGrowthStage for display - it stays at current stage until evolution is confirmed
    // For TEEN, it returns 'BABY' until they choose good or bad
    this.callbacks.onGrowthStageChange?.(this.getGrowthStage())
    
    const xpNeeded = this.getXPForLevel(this.level)
    this.callbacks.onLevelChange?.(this.level, this.xp, xpNeeded)
    
    this.callbacks.onCollectionChange?.({ ...this.collection })
  }
  
  private getXPForLevel(lvl: number): number {
    return 50 + lvl * 25
  }
  
  private addXP(amount: number): void {
    // City bonus: 50% more XP (exciting!)
    if (this.selectedBackground === 'city') {
      amount = Math.floor(amount * 1.5)
    }
    
    this.xp += amount
    let xpNeeded = this.getXPForLevel(this.level)
    
    while (this.xp >= xpNeeded) {
      this.xp -= xpNeeded
      this.level++
      this.showMessage(`LEVEL UP! LV ${this.level}`)
      
      if (this.level >= 5 && !this.achievements['level5']) {
        this.unlockAchievement('level5')
      }
      if (this.level >= 10 && !this.achievements['level10']) {
        this.unlockAchievement('level10')
      }
      if (this.level >= 25 && !this.achievements['level25']) {
        this.unlockAchievement('level25')
      }
      if (this.level >= 50 && !this.achievements['level50']) {
        this.unlockAchievement('level50')
      }
      if (this.level >= 99 && !this.achievements['level99']) {
        this.unlockAchievement('level99')
      }
    }
    
    this.callbacks.onLevelChange?.(this.level, this.xp, xpNeeded)
  }
  
  // Check for random sickness after actions
  private checkSickness(): void {
    if (this.isSick) return
    if (this.isGhost) return  // Ghosts can't get sick
    
    // Calculate location-based sickness chance
    let chance = 0.02 // 2% base chance
    if (this.selectedBackground === 'camp') {
      chance *= 2 // 4% at camp (bugs)
    }
    
    if (Math.random() < chance) {
      this.isSick = true
      this.showMessage('🤢 BULK IS SICK!')
      this.playSound('happy') // Use existing sound
      this.callbacks.onSicknessChange?.(true)
    }
  }
  
  // Cure sickness with medicine
  giveMedicine(): void {
    // Can't interact with egg!
    if (this.hasEgg) {
      this.showMessage('🥚 STILL AN EGG!')
      return
    }

    if (this.isGhost) {
      this.showMessage('👻 GHOSTS CANT GET SICK')
      return
    }
    if (!this.isSick) {
      this.showMessage('NOT SICK')
      return
    }
    this.isSick = false
    this.callbacks.onSicknessChange?.(false)
    this.medicinesGiven++
    this.sicknessCured++
    this.happiness = Math.min(100, this.happiness + 20)
    this.showMessage('💊 CURED!')
    this.playSound('happy')
    
    // Spawn floating medicine effect
    const rect = this.canvas.getBoundingClientRect()
    const x = rect.width / 2 + (Math.random() - 0.5) * 40
    const y = rect.height / 2
    this.floatingMedicines.push({ x, y, alpha: 1, offset: 0 })
    
    // Check achievements
    if (this.medicinesGiven === 1) {
      this.unlockAchievement('first_medicine')
    }
    if (this.sicknessCured >= 5) {
      this.unlockAchievement('sick_cured')
    }
    
    this.emitStats()
    this.saveState()
  }
  
  // Use energy drink (schmeg) - 5 min cooldown
  drinkSchmeg(): void {
    // Can't interact with egg!
    if (this.hasEgg) {
      this.showMessage('🥚 STILL AN EGG!')
      return
    }

    const now = Date.now()
    if (now - this.lastSchmegTime < 5 * 60 * 1000) {
      this.showMessage('⏳ COOLDOWN...')
      return
    }
    this.lastSchmegTime = now
    this.energy = Math.min(100, this.energy + 30)
    this.showMessage('⚡ ENERGY! +30')
    this.playSound('happy')
    
    // Spawn floating schmeg effect
    const canvas = this.canvas
    const x = canvas.width / 2 + (Math.random() - 0.5) * 50
    const y = canvas.height / 2
    this.floatingSchmegs.push({ x, y, alpha: 1, offset: 0 })
    
    this.emitStats()
    this.saveState()
  }
  
  // Quick rest - restores small energy, takes 1 minute
  restBulk(): void {
    // Can't interact with egg!
    if (this.hasEgg) {
      this.showMessage('🥚 STILL AN EGG!')
      return
    }

    const now = Date.now()
    if (now - this.lastRestTime < 30 * 1000) {
      this.showMessage('⏳ COOLDOWN...')
      return
    }
    this.lastRestTime = now
    this.energy = Math.min(100, this.energy + 10)
    this.showMessage('🪑 RESTED! +10')
    this.playSound('happy')
    this.emitStats()
    this.saveState()
  }
  
  private unlockAchievement(id: string): void {
    if (this.achievements[id]) return
    
    this.achievements[id] = true
    const achievement = ACHIEVEMENTS.find(a => a.id === id)
    if (achievement) {
      this.collection.achievementCount = Object.keys(this.achievements).length
      this.callbacks.onAchievementUnlocked?.(id, achievement.title)
    }
    this.saveState()
  }
  
  private checkDeath(): void {
    // Ghost mode - don't die, become ghost
    if (this.isGhost) return
    
    // Hunger warnings
    if (this.hunger <= 0) {
      // Instead of dying, become a ghost!
      this.isGhost = true
      this.ghostSince = Date.now()  // Track when became ghost
      this.birthTime = Date.now()  // Reset age - ghosts don't age!
      
      this.showMessage('👻 BULK BECAME A GHOST!')
      this.happiness = 100
      this.cleanliness = 100
      this.energy = 100
      this.callbacks.onGhostModeChange?.(true)
      
      // Calculate age in minutes and trigger death callback for leaderboard submission
      const ageMinutes = Math.floor((Date.now() - this.birthTime) / 60000)
      this.callbacks.onDeath?.(ageMinutes)
    } else if (this.hunger < 10) {
      this.showMessage('😰 STARVING!')
    } else if (this.hunger < 20) {
      this.showMessage('😩 SO HUNGRY!')
    }
    
    // Sad warning
    if (this.happiness < 10 && this.hunger > 20) {
      this.showMessage('💔 VERY SAD!')
    }
    
    // Dirty warning
    if (this.cleanliness < 10) {
      this.showMessage('💩 SO DIRTY!')
    }
  }
  
  reviveBulk(): void {
    this.hunger = 50
    this.happiness = 50
    this.cleanliness = 50
    this.energy = 100
    
    this.isGhost = false
    this.ghostSince = 0
    this.lastUpdateTime = Date.now()
    
    this.callbacks.onGhostModeChange?.(false)
    this.emitStats()
    this.saveState()
    
    // Restart game loop
    this.gameLoop()
  }
  
  fullReset(): void {
    // Complete reset - starts with egg
    localStorage.removeItem('bulkagachi')
    this.hunger = 100
    this.happiness = 100
    this.cleanliness = 100
    this.energy = 100
    this.lastUpdateTime = Date.now()
    this.birthTime = Date.now()
    
    this.isGhost = false
    this.ghostSince = 0
    this.evolutionPending = null
    this.isSleeping = false
    this.sleepStartTime = 0
    this.wakeUpAngry = false
    this.level = 1
    this.xp = 0
    this.poops = []
    this.achievements = {}
    this.collection = {
      totalPlays: 0,
      totalFeeds: 0,
      totalCleans: 0,
      goldenPoopsFound: 0,
      maxCombo: 0,
      achievementCount: 0,
    }
    this.comboCount = 0
    this.lastActionTime = 0
    this.lastGreetingTime = 0
    this.lastSchmegTime = 0
    this.lastRestTime = 0
    this.poopCount = 0
    this.sicknessCured = 0
    this.medicinesGiven = 0
    this.sleepCount = 0
    this.visitedLocations = new Set()
    this.bulkName = 'Bulk'
    
    // Start with egg - randomly assign teen type
    this.hasEgg = true
    this.eggStartTime = Date.now()
    this.eggHatchAt = Date.now() + 60 * 60 * 1000  // 60 minutes
    this.teenType = Math.random() < 0.5 ? 'good' : 'bad'
    
    this.isSick = false
    this.callbacks.onGhostModeChange?.(false)
    this.callbacks.onSicknessChange?.(false)
    this.callbacks.onGrowthStageChange?.('EGG')
    this.emitStats()
    this.saveState()
    this.gameLoop()
  }
  
  toggleMusic(): void {
    this.musicEnabled = !this.musicEnabled
    
    if (this.musicEnabled) {
      // Start playing music - different track for beach
      const musicFile = this.selectedBackground === 'beach' ? '/audio/bgm.mp3' : '/audio/jazz.mp3'
      if (!this.backgroundMusic || this.backgroundMusic.src !== musicFile) {
        if (this.backgroundMusic) {
          this.backgroundMusic.pause()
        }
        this.backgroundMusic = new Audio(musicFile)
        this.backgroundMusic.loop = true
        this.backgroundMusic.volume = 0.3
      }
      this.backgroundMusic.play().catch(() => {
        // If autoplay fails, try on user interaction
        this.musicEnabled = false
      })
    } else {
      // Stop music
      if (this.backgroundMusic) {
        this.backgroundMusic.pause()
      }
    }
    
    this.callbacks.onMusicEnabledChange?.(this.musicEnabled)
    this.saveState()
  }
  
  setBackground(bg: string): void {
    // Can't travel while in egg
    if (this.hasEgg) {
      this.showMessage('🥚 CANT TRAVEL YET!')
      return
    }
    // Level requirements for travel
    if (bg === 'city' && this.level < 5) {
      this.showMessage('🔒 CITY UNLOCKS AT LEVEL 5!')
      return
    }
    if (bg === 'camp' && this.level < 10) {
      this.showMessage('🔒 CAMP UNLOCKS AT LEVEL 10!')
      return
    }
    if (bg === 'beach' && this.level < 15) {
      this.showMessage('🔒 BEACH UNLOCKS AT LEVEL 15!')
      return
    }
    if (bg === 'mountain' && this.level < 25) {
      this.showMessage('🔒 MOUNTAIN UNLOCKS AT LEVEL 25!')
      return
    }
    
    // Club - only teen+ and 6pm-2am
    if (bg === 'club') {
      const ageInHours = (Date.now() - this.birthTime) / (1000 * 60 * 60)
      const hour = new Date().getHours()
      const isTeenOrAbove = ageInHours >= 8
      const isClubHours = hour >= 18 || hour < 2  // 6pm-2am
      
      // Can't go to club while in egg
      if (this.hasEgg) {
        this.showMessage('🥚 CANT TRAVEL YET!')
        return
      }
      // Ghosts can only go to club if teen+ ghost (8+ hours as ghost)
      if (this.isGhost) {
        const ghostAgeHours = (Date.now() - this.ghostSince) / (1000 * 60 * 60)
        if (ghostAgeHours < 8) {
          this.showMessage('👻 CLUB NEEDS TEEN+!')
          return
        }
      } else if (!isTeenOrAbove) {
        this.showMessage('🔒 CLUB NEEDS TEEN+!')
        return
      }
      if (!isClubHours) {
        this.showMessage('🔒 CLUB OPENS 6PM-2AM!')
        return
      }
    }
    
    // Ghost mode restrictions
    if (this.isGhost) {
      const hour = new Date().getHours()
      const isNight = hour >= 18 || hour < 6
      
      // Ghost can only go to city or camp (forest) at night
      if (bg !== 'cabin' && bg !== 'city' && bg !== 'camp') {
        this.showMessage('👻 GHOST CAN ONLY VISIT CITY OR CAMP AT NIGHT')
        return
      }
      if ((bg === 'city' || bg === 'camp') && !isNight) {
        this.showMessage('👻 GHOST CAN ONLY VISIT CITY OR CAMP AT NIGHT')
        return
      }
    }
    
    this.selectedBackground = bg
    
    // Reset weather when going to non-weather locations
    if (!this.weatherLocations.includes(bg)) {
      this.weather = 'sunny'
      this.rainDrops = []
      this.snowflakes = []
      this.weatherTimer = 0
    }
    
    // Track visited locations for achievements
    if (!this.visitedLocations.has(bg)) {
      this.visitedLocations.add(bg)
      if (bg === 'camp') this.unlockAchievement('travel_camp')
      if (bg === 'city') this.unlockAchievement('travel_city')
      if (bg === 'beach') this.unlockAchievement('travel_beach')
      if (bg === 'mountain') this.unlockAchievement('travel_mountain')
    }
    
    // Show appropriate message for ghost vs normal mode
    if (this.isGhost && bg === 'cabin') {
      this.showMessage('BG: TOMB')
    } else {
      this.showMessage(`BG: ${bg.toUpperCase()}`)
    }
    this.render()
    this.saveState()
  }
  
  getBackground(): string {
    return this.selectedBackground
  }
  
  setBulkName(name: string): void {
    this.bulkName = name.substring(0, 12)  // Max 12 chars
    this.showMessage(`📛 NAMED: ${this.bulkName.toUpperCase()}`)
    this.saveState()
  }
  
  getBulkName(): string {
    return this.bulkName
  }
  
  getGhostAgeHours(): number {
    if (!this.ghostSince) return 0
    return (this.ghostSince - this.birthTime) / (1000 * 60 * 60)
  }
  
  getTimeAsGhostHours(): number {
    if (!this.ghostSince) return 0
    return (Date.now() - this.ghostSince) / (1000 * 60 * 60)
  }
  
  getTotalTimePlayed(): number {
    return this.totalTimePlayed
  }
  
  isGhostMode(): boolean {
    return this.isGhost
  }
  
  getIsSick(): boolean {
    return this.isSick
  }
  
  requestNotifications(): void {
    // iOS Safari doesn't support Web Notifications API
    // Users need to add to home screen and enable in iOS Settings
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    
    if (!('Notification' in window) || isIOS) {
      // Do nothing on iOS or unsupported browsers
      return
    }
    
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        this.notificationsEnabled = true
        this.callbacks.onNotificationsEnabledChange?.(true)
        this.showMessage('NOTIFS ON')
      } else {
        this.showMessage('NOTIFS OFF')
      }
    })
  }
  
  tapToWakeUp(): void {
    if (!this.isSleeping) return
    
    const sleepTime = Date.now() - this.sleepStartTime
    
    // Ghost mode - no angry wake up
    if (this.isGhost) {
      this.wakeUpAngry = false
      this.happiness = Math.max(0, this.happiness - 5)
      this.showMessage('👻 GHOST AWAKE')
      // Clear immediately for ghosts
      this.wakeUpAngry = false
      this.isSleeping = false
      this.callbacks.onSleepChange?.(false)
      this.emitStats()
    } else if (sleepTime < this.sleepDuration * 0.5) {
      // Woke up too early - ANGRY!
      this.wakeUpAngry = true
      this.happiness = Math.max(0, this.happiness - 5)
      this.showMessage('😠 WOKE UP EARLY!')
      // Clear angry after 5 seconds
      setTimeout(() => {
        this.wakeUpAngry = false
        this.isSleeping = false
        this.callbacks.onSleepChange?.(false)
        this.emitStats()
      }, 5000)
    } else {
      // Woke up after enough sleep - happy!
      this.wakeUpAngry = false
      this.happiness = Math.min(100, this.happiness + 20)
      this.energy = Math.min(100, this.energy + 50)  // Restore 50 energy
      this.showMessage('✨ WELL RESTED!')
      this.isSleeping = false
    }
    
    this.callbacks.onSleepChange?.(this.isSleeping)
    this.emitStats()
    this.saveState()
  }
  
  toggleSleep(): void {
    // Can't interact with egg!
    if (this.hasEgg) {
      this.showMessage('🥚 STILL AN EGG!')
      return
    }
    // Ghost mode - prefer sleeping in day, awake at night
    const hour = new Date().getHours()
    const isDaytime = hour >= 6 && hour < 18
    
    // Can only sleep at Home or Camp (or tomb in ghost mode)
    const canSleepLocations = this.isGhost 
      ? ['cabin', 'tomb']  // Ghost can only sleep at "tomb" (home)
      : ['cabin', 'camp']
    
    if (!this.isSleeping && !canSleepLocations.includes(this.selectedBackground)) {
      this.showMessage('⛺ CAN ONLY SLEEP AT HOME')
      return
    }
    
    if (this.isSleeping) {
      // Already sleeping - wake up
      this.tapToWakeUp()
    } else {
      // Go to sleep
      this.isSleeping = true
      this.sleepStartTime = Date.now()
      this.sleepCount++
      if (this.sleepCount === 1) {
        this.unlockAchievement('first_sleep')
      }
      this.showMessage('💤 SLEEPING...')
      this.callbacks.onSleepChange?.(true)
      this.emitStats()
      this.saveState()
    }
  }
  
  playWithToy(): void {
    this.playWithBulk()
  }
  
  private loadState(): void {
    try {
      const saved = localStorage.getItem('bulkagachi')
      if (!saved) {
        // New player - start with egg!
        this.hasEgg = true
        this.eggStartTime = Date.now()
        this.eggHatchAt = Date.now() + 60 * 60 * 1000  // 60 minutes
        this.teenType = Math.random() < 0.5 ? 'good' : 'bad'
        this.callbacks.onGrowthStageChange?.('EGG')
        return
      }
      
      const state: SavedState = JSON.parse(saved)
      this.hunger = state.hunger ?? 100
      this.happiness = state.happiness ?? 100
      this.cleanliness = state.cleanliness ?? 100
      this.energy = state.energy ?? 100
      this.lastUpdateTime = state.lastUpdateTime ?? Date.now()
      this.lastAutoSubmitTime = state.lastAutoSubmitTime ?? Date.now()
      this.birthTime = state.birthTime ?? Date.now()
      this.achievements = state.achievements ?? {}
      this.level = state.level ?? 1
      this.xp = state.xp ?? 0
      this.poopCount = state.poopCount ?? 0
      this.comboCount = state.comboCount ?? 0
      this.lastActionTime = state.lastActionTime ?? 0
      this.poops = state.poops ?? []
      this.collection = state.collection ?? {
        totalPlays: 0,
        totalFeeds: 0,
        totalCleans: 0,
        goldenPoopsFound: 0,
        maxCombo: 0,
        achievementCount: 0,
      }
      this.musicEnabled = state.musicEnabled ?? false
      this.notificationsEnabled = state.notificationsEnabled ?? false
      // Sync callbacks with loaded state
      this.callbacks.onMusicEnabledChange?.(this.musicEnabled)
      this.callbacks.onNotificationsEnabledChange?.(this.notificationsEnabled)
      this.isSick = state.isSick ?? false
      this.selectedBackground = state.selectedBackground ?? 'cabin'
      this.isGhost = state.isGhost ?? false
      this.ghostSince = state.ghostSince ?? 0
      this.sicknessCured = state.sicknessCured ?? 0
      this.medicinesGiven = state.medicinesGiven ?? 0
      this.sleepCount = state.sleepCount ?? 0
      this.visitedLocations = new Set(state.visitedLocations ?? [])
      this.bulkName = state.bulkName ?? 'Bulk'
      this.teenType = state.teenType ?? null
      this.isSleeping = state.isSleeping ?? false
      this.sleepStartTime = state.sleepStartTime ?? 0
      this.lastSchmegTime = state.lastSchmegTime ?? 0
      this.lastRestTime = state.lastRestTime ?? 0
      this.lastGreetingTime = state.lastGreetingTime ?? 0
      this.totalTimePlayed = state.totalTimePlayed ?? 0
      
      // Load egg state (or convert old saves)
      if (state.hasEgg !== undefined) {
        this.hasEgg = state.hasEgg
        this.eggStartTime = state.eggStartTime ?? Date.now()
        this.eggHatchAt = state.eggHatchAt ?? (Date.now() + 60 * 60 * 1000)
        // If egg should have already hatched, hatch it
        if (this.hasEgg && Date.now() >= this.eggHatchAt) {
          this.hasEgg = false
          this.birthTime = state.birthTime ?? Date.now()
        }
      } else {
        // Old save - convert to egg phase with random teenType
        this.hasEgg = true
        this.eggStartTime = Date.now()
        this.eggHatchAt = Date.now() + 60 * 60 * 1000  // 60 minutes
        // Randomly assign teen type (50/50)
        this.teenType = Math.random() < 0.5 ? 'good' : 'bad'
      }
      
      // If was sleeping when saved, restart sleep timer
      if (this.isSleeping && this.sleepStartTime > 0) {
        // Sleep continues from where it left off
      }
      
      // If ghost mode was active, trigger the callback
      if (this.isGhost) {
        this.callbacks.onGhostModeChange?.(true)
        
      }
    } catch {
      // Ignore errors
    }
    
    this.emitStats()
    this.callbacks.onPoopCountChange?.(this.poops.length)
  }
  
  saveState(): void {
    try {
      const state: SavedState = {
        hunger: this.hunger,
        happiness: this.happiness,
        cleanliness: this.cleanliness,
        energy: this.energy,
        lastUpdateTime: this.lastUpdateTime,
        lastAutoSubmitTime: this.lastAutoSubmitTime,
        birthTime: this.birthTime,
        achievements: this.achievements,
        level: this.level,
        xp: this.xp,
        poopCount: this.poopCount,
        comboCount: this.comboCount,
        lastActionTime: this.lastActionTime,
        poops: this.poops,
        collection: this.collection,
        musicEnabled: this.musicEnabled,
        notificationsEnabled: this.notificationsEnabled,
        isSick: this.isSick,
        selectedBackground: this.selectedBackground,
        isGhost: this.isGhost,
        ghostSince: this.ghostSince,
        sicknessCured: this.sicknessCured,
        medicinesGiven: this.medicinesGiven,
        sleepCount: this.sleepCount,
        visitedLocations: Array.from(this.visitedLocations),
        bulkName: this.bulkName,
        teenType: this.teenType,
        isSleeping: this.isSleeping,
        sleepStartTime: this.sleepStartTime,
        lastSchmegTime: this.lastSchmegTime,
        lastRestTime: this.lastRestTime,
        lastGreetingTime: this.lastGreetingTime,
        totalTimePlayed: this.totalTimePlayed,
        hasEgg: this.hasEgg,
        eggStartTime: this.eggStartTime,
        eggHatchAt: this.eggHatchAt,
      }
      localStorage.setItem('bulkagachi', JSON.stringify(state))
    } catch {
      // Ignore errors
    }
  }
  
  getPoops(): PoopData[] {
    return this.poops
  }
  
  // Get food type based on growth stage
  getFoodType(): 'milk' | 'hotdog' {
    const stage = this.getGrowthStage()
    if (stage === 'EGG' || stage === 'BABY') return 'milk'
    return 'hotdog'
  }
  
  getAchievements(): Record<string, boolean> {
    return this.achievements
  }
  
  getAchievementsList(): AchievementDef[] {
    return ACHIEVEMENTS
  }
  
  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler)
      this._resizeHandler = null
    }
    this.canvas.remove()
  }
}
