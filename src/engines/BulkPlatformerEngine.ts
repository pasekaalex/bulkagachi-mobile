import * as THREE from 'three'
import { BaseGameEngine, type GameCallbacks } from './shared/BaseGameEngine'
import { AudioManager } from './shared/AudioManager'
import { InputManager } from './shared/InputManager'
import { ASSET_PATHS } from '../constants'

interface Platform {
  mesh: THREE.Mesh
  x: number
  y: number
  width: number
  height: number
  type: 'ground' | 'platform' | 'brick' | 'question' | 'pswitch' | 'void'
  hit?: boolean
}

interface Orb {
  mesh: THREE.Mesh
  x: number
  y: number
  velocityX: number
  active: boolean
  distanceTraveled: number
}

interface Enemy {
  mesh: THREE.Group
  x: number
  y: number
  width: number
  height: number
  velocityX: number
  velocityY: number
  alive: boolean
  type: 'goomba' | 'boss' | 'paragoomba'
  squishTimer: number
  // Boss-specific properties
  health?: number
  maxHealth?: number
  jumpTimer?: number
  shootTimer?: number
  phase?: number
  invulnerable?: boolean
  invulnerableTimer?: number
  // Flying enemy properties
  baseY?: number
  flyTimer?: number
  swoopRange?: number
}

interface FallingHazard {
  mesh: THREE.Mesh
  x: number
  y: number
  baseY: number
  velocityY: number
  state: 'waiting' | 'falling' | 'rising'
  waitTimer: number
}

interface Coin {
  mesh: THREE.Mesh
  x: number
  y: number
  velocityY: number
  collectTimer: number
  collected: boolean
  fromBlock?: boolean
}

interface FloatingCoin {
  mesh: THREE.Mesh
  x: number
  y: number
  baseY: number
  collected: boolean
  bobTimer: number
}

interface PowerUp {
  mesh: THREE.Mesh
  x: number
  y: number
  velocityY: number
  type: 'schmeg'
  collected: boolean
}

// ─── Theme & Layout System ───────────────────────────────────────────

interface LevelTheme {
  name: string
  sky: { top: string; mid: string; bottom: string }
  ground: { surface: number; body: number; dirt: number }
  platform: { color: number; brick: number; brickDark: number }
  pipe: { body: number; top: number }
  decorations: 'grasslands' | 'desert' | 'countryside' | 'city' | 'moon' | 'fortress'
  enemySpeed: number
  gravity?: number
  isBossLevel?: boolean
}

interface LevelLayout {
  levelWidth: number
  groundSections: { start: number; end: number }[]
  floatingPlatforms: { x: number; y: number; w: number; type?: 'question' | 'brick' | 'pswitch' | 'void' }[]
  pipes: { x: number; height: number }[]
  coinArcs: { xs: number[]; y: number }[]
  groundEnemies: number[]
  platformEnemies: { x: number; y: number }[]
  aerialEnemies?: { x: number; y: number; range?: number }[]  // Flying enemies
  goalX: number
  // Boss level specific
  fallingHazards?: { x: number; y: number }[]
  hasBoss?: boolean
  bossX?: number
  bossY?: number
  // SMB3-style features
  secretPlatforms?: { x: number; y: number; w: number }[]  // Hidden cloud routes
  pSwitchBlocks?: { x: number; y: number }[]  // P-switch coin rows
  // Checkpoints
  checkpoints?: { x: number; y: number }[]
}

const LEVEL_THEMES: LevelTheme[] = [
  // World 1 - Grasslands
  {
    name: 'Grasslands',
    sky: { top: '#4a90d9', mid: '#87CEEB', bottom: '#B0E0E6' },
    ground: { surface: 0x5B8731, body: 0x5B8731, dirt: 0x8B5E3C },
    platform: { color: 0x5B8731, brick: 0xC84C09, brickDark: 0x8B3A06 },
    pipe: { body: 0x00AA00, top: 0x00CC00 },
    decorations: 'grasslands',
    enemySpeed: 1.0,
  },
  // World 2 - Desert
  {
    name: 'Desert',
    sky: { top: '#D4820A', mid: '#F4A460', bottom: '#FFDEAD' },
    ground: { surface: 0xD2B48C, body: 0xC4A575, dirt: 0xA08050 },
    platform: { color: 0xC8A060, brick: 0xB8860B, brickDark: 0x8B6508 },
    pipe: { body: 0xB8860B, top: 0xDAA520 },
    decorations: 'desert',
    enemySpeed: 1.1,
  },
  // World 3 - Countryside
  {
    name: 'Countryside',
    sky: { top: '#5B9BD5', mid: '#A8D8EA', bottom: '#D4EDDA' },
    ground: { surface: 0x3A7D2C, body: 0x3A7D2C, dirt: 0x6B4226 },
    platform: { color: 0x4A8D3C, brick: 0x8B4513, brickDark: 0x5C2E0A },
    pipe: { body: 0x556B2F, top: 0x6B8E23 },
    decorations: 'countryside',
    enemySpeed: 1.2,
  },
  // World 4 - City (Night)
  {
    name: 'City',
    sky: { top: '#0A0A2E', mid: '#1A1A4E', bottom: '#2A2A5E' },
    ground: { surface: 0x555555, body: 0x444444, dirt: 0x333333 },
    platform: { color: 0x666666, brick: 0x8B4513, brickDark: 0x5C2E0A },
    pipe: { body: 0x505050, top: 0x707070 },
    decorations: 'city',
    enemySpeed: 1.3,
  },
  // World 5 - Moon
  {
    name: 'Moon',
    sky: { top: '#000000', mid: '#050510', bottom: '#0A0A1A' },
    ground: { surface: 0x888888, body: 0x777777, dirt: 0x555555 },
    platform: { color: 0x999999, brick: 0x666666, brickDark: 0x444444 },
    pipe: { body: 0x707070, top: 0x909090 },
    decorations: 'moon',
    enemySpeed: 0.9,
    gravity: -0.3,
  },
  // World 6 - Dark Fortress (Boss Level)
  {
    name: 'Dark Fortress',
    sky: { top: '#1A001A', mid: '#330033', bottom: '#4A004A' },
    ground: { surface: 0x4A0000, body: 0x330000, dirt: 0x220000 },
    platform: { color: 0x660000, brick: 0x8B0000, brickDark: 0x5C0000 },
    pipe: { body: 0x440044, top: 0x660066 },
    decorations: 'fortress',
    enemySpeed: 1.4,
    isBossLevel: true,
  },
  // World 7 - SECRET KAIZO LEVEL (Hell difficulty)
  {
    name: 'The Void',
    sky: { top: '#000000', mid: '#0D000D', bottom: '#1A001A' },
    ground: { surface: 0xFF0000, body: 0x330000, dirt: 0x000000 },
    platform: { color: 0xFF0040, brick: 0xFF0066, brickDark: 0x990033 },
    pipe: { body: 0x660000, top: 0x990000 },
    decorations: 'fortress',
    enemySpeed: 2.0,
    gravity: -0.6,
  },
]

// ─── Level Layouts ────────────────────────────────────────────────────
// Design philosophy (SMB3-inspired):
//   Physics: running jump ~280u horizontal, jump height ~169u, player at ground y≈-275
//   Easy gap: 80-100u | Medium gap: 120-150u | Hard gap: 180-220u | Bridge needed: >250u
//   Each level follows: INTRO → TEACH → TEST → REWARD structure
//   Coins are breadcrumbs guiding jump trajectories
//   Enemies placed at decision points, not randomly scattered
//   Escalating difficulty within each level, not just between worlds

const LEVEL_LAYOUTS: LevelLayout[] = [
  // ══════════════════════════════════════════════════════════════════════
  // WORLD 1 — GRASSLANDS (Tutorial)
  //   INTRO: Flat safe ground, first goomba, first ? block
  //   TEACH: Small gap (80u) with coin breadcrumbs, pipe obstacle
  //   TEST:  Medium gap (120u) with bridge platform, staircase section
  //   REWARD: Victory lap with coin trail to goal
  //   NOTE: ? blocks at y=-140 or higher so player can walk under them
  //         (player top = -240 on ground, block bottom at -155 = 85u clearance)
  // ══════════════════════════════════════════════════════════════════════
  {
    levelWidth: 5200,
    groundSections: [
      { start: -200, end: 1400 },     // INTRO: Long safe run
      { start: 1500, end: 2500 },     // TEACH: 100u gap — gentle intro to pits
      { start: 2650, end: 3800 },     // TEST: 150u gap — need running jump
      { start: 3950, end: 5400 },     // REWARD: 150u gap, then victory stretch
    ],
    floatingPlatforms: [
      // INTRO: Generous spacing, ? blocks HIGH enough to walk under
      { x: 400, y: -140, w: 50, type: 'question' },     // First ? block — high enough to walk under
      { x: 700, y: -180, w: 150 },                       // Wide platform — safe first jump target
      { x: 700, y: -20, w: 50, type: 'question' },      // ? above platform — raised for clearance
      { x: 950, y: -140, w: 50, type: 'question' },     // Another ? — moved left for spacing
      { x: 1150, y: -140, w: 100, type: 'brick' },      // Brick row — moved right, separate from ? block
      { x: 1450, y: -170, w: 120 },                      // Stepping stone — moved right for more spacing

      // TEACH section: Platforms over first gap, then escalating
      { x: 1550, y: -220, w: 100 },                      // Safety net platform IN the gap — more spacing
      { x: 1850, y: -180, w: 140 },                      // Wide landing after gap — more spacing
      { x: 1850, y: -10, w: 50, type: 'question' },     // Reward for crossing gap — raised
      { x: 2250, y: -180, w: 120 },                      // Start teaching running jumps — more spacing
      { x: 2550, y: -150, w: 120 },                      // Slightly higher — more spacing
      { x: 2550, y: 25, w: 50, type: 'question' },      // High reward — raised higher

      // TEST section: Staircase formation, then bridge sequence
      // Bridge over gap (150u) — 2 stepping stones
      { x: 2850, y: -220, w: 80 },
      { x: 3000, y: -200, w: 50, type: 'question' },
      // Ascending staircase — more spacing between steps
      { x: 3250, y: -230, w: 100 },
      { x: 3450, y: -180, w: 100 },
      { x: 3650, y: -130, w: 100 },
      { x: 3850, y: -80, w: 100 },
      { x: 3650, y: 40, w: 50, type: 'question' },      // Reward at staircase peak
      // After staircase
      { x: 4050, y: -180, w: 120 },
      { x: 4050, y: -10, w: 50, type: 'question' },     // Raised for clearance

      // REWARD section: Easy platforms, lots of coins
      { x: 4150, y: -180, w: 150 },
      { x: 4400, y: -160, w: 120 },
      { x: 4400, y: 15, w: 50, type: 'question' },      // Raised for clearance
      // Victory staircase to goal flag
      { x: 4700, y: -230, w: 80 },
      { x: 4850, y: -180, w: 80 },
      { x: 5000, y: -130, w: 80 },
    ],
    pipes: [
      { x: 900, height: 60 },      // First pipe — gentle
      { x: 1950, height: 90 },     // Medium pipe — after first gap
      { x: 3550, height: 70 },     // Before final stretch
    ],
    coinArcs: [
      { xs: [400], y: -100 },                              // Coin showing first ? block
      { xs: [680, 710, 740], y: -140 },                    // Guide to first platform
      { xs: [1530, 1570, 1610], y: -190 },                 // Breadcrumbs over first gap — updated
      { xs: [1830, 1860, 1890], y: -140 },                 // Reward after gap — updated
      { xs: [2230, 2260, 2290], y: -140 },                 // Guide running jump — updated
      { xs: [2830, 2900, 2970], y: -180 },                 // Over second gap — updated
      { xs: [3250, 3450, 3650, 3850], y: -40 },            // Staircase coin trail — updated
      { xs: [4330, 4360, 4390], y: -140 },                 // Reward stretch — updated
      { xs: [4580, 4610, 4640], y: -120 },                 // More reward — updated
      { xs: [5200, 5230, 5260, 5290, 5320], y: -250 },    // Victory coin trail to goal — updated
    ],
    groundEnemies: [
      550,           // First goomba — alone, safe, teaches stomping
      950,           // Second goomba — near pipe
      1350,          // Before first gap
      2050, 2400,    // TEACH section — updated for new platform positions
      3400, 3800,    // TEST section — guarding staircase — updated
      4400, 4750,    // REWARD — light resistance — updated
    ],
    platformEnemies: [
      // Enemy on TEACH platform — updated position
      { x: 2620, y: -110 },     // On TEACH platform at x=2550 - offset from ? block
      // Enemy on staircase platform — updated
      { x: 3850, y: -30 },      // On staircase platform - no ? block above
    ],
    aerialEnemies: [
      // World 1 - INTRO: Single flying enemy to teach aerial threats
      { x: 1200, y: -100, range: 80 },
      // TEST: Flying enemy over gap creates pressure
      { x: 2700, y: -120, range: 100 },
      // REWARD: Light aerial presence
      { x: 4300, y: -80, range: 60 },
    ],
    goalX: 5100,
    checkpoints: [
      { x: 3000, y: -290 },   // Center of level (on ground)
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // WORLD 2 — DESERT (Wider gaps, faster enemies)
  //   INTRO: Medium ground, first 120u gap
  //   TEACH: 150u gaps, bridge platforms, tall pipe obstacles
  //   TEST:  Platform-hopping sequence, enemy gauntlet
  //   REWARD: Final sprint through coin-rich stretch
  // ══════════════════════════════════════════════════════════════════════
  {
    levelWidth: 6000,
    groundSections: [
      { start: -200, end: 1000 },     // INTRO: Shorter safe zone
      { start: 1120, end: 2000 },     // 120u gap
      { start: 2150, end: 2900 },     // 150u gap
      { start: 3100, end: 3700 },     // 200u gap — bridge platforms
      { start: 3900, end: 6200 },     // 200u gap, then long reward stretch
    ],
    floatingPlatforms: [
      // INTRO: Platforms and ? blocks with good spacing
      { x: 350, y: -140, w: 50, type: 'question' },     // ? block — high enough to pass under
      { x: 600, y: -170, w: 130 },                       // Wide platform
      { x: 600, y: 0, w: 50, type: 'question' },        // High ? above platform — raised
      { x: 880, y: -160, w: 120, type: 'brick' },       // Brick row

      // Bridge over first gap (120u)
      { x: 1060, y: -210, w: 90 },

      // TEACH: Spread out platforms
      { x: 1350, y: -180, w: 130 },
      { x: 1350, y: -10, w: 50, type: 'question' },     // High ? above platform — raised
      { x: 1700, y: -170, w: 110 },
      { x: 1900, y: -160, w: 120, type: 'brick' },

      // Bridge over second gap (150u) — stepping stone
      { x: 2080, y: -220, w: 80 },

      // TEST: Platform hopping section — generous spacing
      { x: 2350, y: -180, w: 120 },
      { x: 2600, y: -170, w: 110 },
      { x: 2600, y: 0, w: 50, type: 'question' },       // High ? above platform — raised
      { x: 2850, y: -160, w: 100 },

      // Bridge over third gap (200u) — two stepping stones
      { x: 3000, y: -230, w: 80 },
      { x: 3000, y: -90, w: 50, type: 'question' },     // High up
      { x: 3080, y: -200, w: 80 },

      // After third gap
      { x: 3300, y: -180, w: 110 },
      { x: 3550, y: -170, w: 100, type: 'brick' },

      // Bridge over fourth gap (200u) — multi-platform bridge
      { x: 3770, y: -220, w: 80 },
      { x: 3840, y: -180, w: 80 },

      // REWARD section platforms — generous
      { x: 4150, y: -180, w: 140 },
      { x: 4450, y: -170, w: 120, type: 'brick' },
      { x: 4450, y: 0, w: 50, type: 'question' },        // Raised for clearance
      { x: 4750, y: -160, w: 120 },
      // Goal approach staircase
      { x: 5100, y: -220, w: 80 },
      { x: 5250, y: -170, w: 80 },
      { x: 5400, y: -120, w: 80 },
    ],
    pipes: [
      { x: 780, height: 90 },      // Taller pipes in desert
      { x: 1550, height: 110 },    // Forces jump over
      { x: 3400, height: 80 },
      { x: 4650, height: 90 },
    ],
    coinArcs: [
      { xs: [580, 610, 640], y: -130 },                    // INTRO platform coins
      { xs: [1040, 1070, 1100], y: -180 },                 // Over gap 1
      { xs: [1680, 1710, 1740], y: -130 },                 // TEACH area
      { xs: [2060, 2090, 2120], y: -190 },                 // Over gap 2
      { xs: [2330, 2360, 2390], y: -140 },                 // TEST platform guide
      { xs: [2580, 2610, 2640], y: -130 },                 // Platform hop guide
      { xs: [2980, 3020, 3060, 3100], y: -190 },           // Over gap 3 — 4 coins
      { xs: [3750, 3790, 3830, 3870], y: -180 },           // Over gap 4
      { xs: [4130, 4160, 4190], y: -140 },                 // REWARD
      { xs: [5350, 5380, 5410, 5440, 5470], y: -250 },    // Goal approach
    ],
    groundEnemies: [
      450,              // Single intro enemy
      820,              // Near pipe
      1200, 1500,       // Spread out in teach section
      1800,             // Before gap 2
      2400, 2700,       // TEST section
      3350, 3600,       // After gaps
      4200, 4500,       // REWARD — light
      5000,             // Goal approach
    ],
    platformEnemies: [
      { x: 1700, y: -130 },      // On platform (no ? block above)
      { x: 2850, y: -120 },      // TEST platform (no ? block above)
      // Enemy moved from x=4150 to x=4220 - was under ? block at x=4150, y=-30
      { x: 4220, y: -140 },      // REWARD section - offset from ? block above
    ],
    aerialEnemies: [
      // World 2 - INTRO: Low flying enemy
      { x: 900, y: -120, range: 70 },
      // TEACH: Flying over platform gap
      { x: 1850, y: -140, range: 90 },
      // TEST: Two flyers create aerial pressure
      { x: 2600, y: -130, range: 80 },
      { x: 3200, y: -110, range: 70 },
      // REWARD: Single flyer
      { x: 4800, y: -100, range: 60 },
    ],
    goalX: 5900,
    checkpoints: [
      { x: 3300, y: -290 },   // Center of level (away from pipe at 3400)
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // WORLD 3 — COUNTRYSIDE (High/low paths, vertical variety)
  //   INTRO: Moderate ground, introduces high/low path choice
  //   TEACH: Vertical climbing section
  //   TEST:  Long platforming sequence with enemy-guarded platforms
  //   REWARD: High-path bonus area with coin jackpot
  // ══════════════════════════════════════════════════════════════════════
  {
    levelWidth: 5800,
    groundSections: [
      { start: -200, end: 1000 },     // INTRO
      { start: 1120, end: 1900 },     // 120u gap
      { start: 2050, end: 2700 },     // 150u gap
      { start: 2900, end: 3500 },     // 200u gap
      { start: 3700, end: 4200 },     // 200u gap — bridge platforms
      { start: 4400, end: 6000 },     // 200u gap, then reward stretch
    ],
    floatingPlatforms: [
      // INTRO: High/low path choice
      { x: 400, y: -140, w: 50, type: 'question' },     // Easy ? block (walkable under)
      // HIGH PATH (risky)
      { x: 450, y: -100, w: 100 },                       // Step up
      { x: 650, y: -50, w: 90 },                         // Higher step
      { x: 650, y: 115, w: 50, type: 'question' },      // Reward for climbing — raised
      { x: 850, y: -160, w: 140, type: 'brick' },       // Brick wall

      // Bridge over gap 1 (120u)
      { x: 1060, y: -210, w: 90 },

      // TEACH: Vertical climbing section
      { x: 1350, y: -180, w: 120 },
      { x: 1350, y: -10, w: 50, type: 'question' },     // High ? above platform — raised
      // Vertical tower — climb up platforms (INCREASED spacing)
      { x: 1650, y: -240, w: 100 },
      { x: 1650, y: -120, w: 100 },
      { x: 1650, y: 0, w: 100 },
      { x: 1650, y: 120, w: 50, type: 'question' },      // Reward at top — higher for spacing
      { x: 1950, y: -180, w: 120 },                      // Landing from tower — more spacing

      // Bridge over gap 2 (150u)
      { x: 2150, y: -220, w: 80 },

      // TEST: Enemy-guarded platform sequence — INCREASED spacing
      { x: 2450, y: -180, w: 120 },
      { x: 2750, y: -170, w: 110 },
      { x: 2750, y: 0, w: 50, type: 'question' },       // High ? above platform — raised
      { x: 3000, y: -160, w: 120, type: 'brick' },

      // Bridge over gap 3 (200u)
      { x: 3200, y: -220, w: 80 },

      // More TEST: Staircase up then down — INCREASED spacing
      { x: 3450, y: -200, w: 100 },
      { x: 3650, y: -150, w: 100 },
      { x: 3850, y: -100, w: 100 },
      { x: 4050, y: -50, w: 100 },
      { x: 3850, y: 60, w: 50, type: 'question' },      // Peak reward

      // Bridge over gap 4 (200u) — 2 platforms
      { x: 4200, y: -230, w: 80 },
      { x: 4300, y: -190, w: 80 },

      // After big gap
      { x: 3900, y: -180, w: 120 },
      { x: 4100, y: -160, w: 100, type: 'brick' },

      // Bridge over gap 5 (200u)
      { x: 4300, y: -220, w: 80 },
      { x: 4380, y: -180, w: 80 },

      // REWARD: Bonus upper path with coin jackpot
      { x: 4650, y: -180, w: 140 },
      // High reward path
      { x: 4650, y: -50, w: 100 },
      { x: 4850, y: -10, w: 100 },
      { x: 5050, y: 30, w: 50, type: 'question' },
      // Normal path continues
      { x: 5050, y: -180, w: 120 },
      { x: 5300, y: -170, w: 100 },
      // Goal staircase
      { x: 5500, y: -230, w: 80 },
      { x: 5650, y: -180, w: 80 },
      { x: 5800, y: -130, w: 80 },
    ],
    pipes: [
      { x: 700, height: 80 },
      { x: 1650, height: 100 },
      { x: 3400, height: 70 },
      { x: 4000, height: 90 },
      { x: 5200, height: 80 },
    ],
    coinArcs: [
      { xs: [380, 420, 460], y: -100 },                    // Intro ? block guide
      { xs: [630, 660, 690], y: -10 },                     // High path coins
      { xs: [1040, 1070, 1100], y: -180 },                 // Gap 1 breadcrumbs
      { xs: [1630, 1660, 1690], y: 120 },                  // Above tower top — updated
      { xs: [2130, 2160, 2190], y: -190 },                 // Gap 2 — updated
      { xs: [2430, 2500, 2570], y: -130 },                 // TEST guide — updated
      { xs: [3180, 3250, 3320], y: -180 },                 // Gap 3 — updated
      { xs: [3450, 3650, 3850, 4050], y: -40 },            // Staircase coins — updated
      { xs: [4180, 4240, 4300, 4360], y: -190 },           // Gap 4 — updated
      // REWARD high path jackpot
      { xs: [4630, 4700, 4770, 4840, 4910, 4980, 5050], y: 70 },  // 7 coins!
      { xs: [5750, 5780, 5810, 5840, 5870], y: -250 },     // Goal
    ],
    groundEnemies: [
      500, 750,        // INTRO — near decision point
      1350, 1550,      // TEACH — before tower — updated spacing
      2350, 2650,      // TEST start — updated spacing
      3300, 3600,      // Staircase guards — updated
      4150, 4350,      // After big gap — updated
      4900, 5300,      // REWARD — updated
      5600,
    ],
    platformEnemies: [
      { x: 650, y: -10 },       // Guards high path — risk!
      { x: 2450, y: -140 },     // TEST platform guard — updated position
      { x: 3650, y: -100 },     // Staircase guard — updated position
      { x: 5500, y: -150 },     // Near goal — updated position
    ],
    aerialEnemies: [
      // World 3 - INTRO: Higher flyer (countryside feel)
      { x: 800, y: -50, range: 90 },
      // TEACH: Flying enemy between paths
      { x: 1400, y: -80, range: 100 },
      // TEST: Multiple flyers create aerial maze
      { x: 2500, y: -120, range: 80 },
      { x: 3000, y: -60, range: 70 },
      { x: 3800, y: -100, range: 90 },
      // REWARD: Light presence
      { x: 5000, y: -80, range: 60 },
    ],
    goalX: 5900,
    checkpoints: [
      { x: 3300, y: -290 },   // Center of level
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // WORLD 4 — CITY (Night, rooftop jumping)
  //   INTRO: Short safe ground, rooftop platforms
  //   TEACH: Rooftop hopping with 100u+ wide platforms
  //   TEST:  Long platforming gauntlet over city streets
  //   REWARD: Final rooftop sprint with coin trails
  // ══════════════════════════════════════════════════════════════════════
  {
    levelWidth: 6000,
    groundSections: [
      { start: -200, end: 700 },      // INTRO
      { start: 820, end: 1500 },      // 120u gap
      { start: 1650, end: 2200 },     // 150u gap
      { start: 2400, end: 3000 },     // 200u gap
      { start: 3200, end: 3700 },     // 200u gap
      { start: 3900, end: 4300 },     // 200u gap
      { start: 4500, end: 6200 },     // 200u gap, then home stretch
    ],
    floatingPlatforms: [
      // INTRO: Rooftop-style platforms
      { x: 350, y: -140, w: 50, type: 'question' },     // ? block (walkable under)
      { x: 550, y: -170, w: 110 },                       // 110u wide rooftop
      { x: 550, y: 5, w: 50, type: 'question' },         // High ? — raised

      // Gap 1 bridge (120u)
      { x: 760, y: -220, w: 80 },

      // TEACH: Rooftop sequence — generous widths
      { x: 1000, y: -180, w: 110 },
      { x: 1000, y: -5, w: 50, type: 'question' },       // High ? above platform — raised
      { x: 1300, y: -170, w: 100, type: 'brick' },

      // Gap 2 bridge (150u)
      { x: 1580, y: -220, w: 80 },

      // More rooftops — generous spacing between groups
      { x: 1850, y: -180, w: 110 },
      { x: 2050, y: -160, w: 100 },
      { x: 2050, y: 15, w: 50, type: 'question' },       // High ? — raised
      { x: 2200, y: -170, w: 100, type: 'brick' },

      // Gap 3 bridge (200u)
      { x: 2330, y: -230, w: 80 },
      { x: 2330, y: -90, w: 50, type: 'question' },     // High up

      // TEST: Rooftop gauntlet — wider platforms, more spacing
      { x: 2550, y: -180, w: 110 },
      { x: 2800, y: -170, w: 100 },
      { x: 2800, y: 5, w: 50, type: 'question' },        // High ? — raised
      { x: 3000, y: -180, w: 100 },

      // Gap 4 bridge (200u)
      { x: 3130, y: -230, w: 80 },
      { x: 3130, y: -90, w: 50, type: 'question' },

      // Descending staircase
      { x: 3350, y: -200, w: 100 },
      { x: 3500, y: -160, w: 100 },
      { x: 3650, y: -120, w: 100, type: 'brick' },

      // Gap 5 bridge (200u)
      { x: 3830, y: -220, w: 80 },
      { x: 3830, y: -80, w: 50, type: 'question' },

      // After gap 5
      { x: 4050, y: -180, w: 110 },
      { x: 4250, y: -160, w: 100 },

      // Gap 6 bridge (200u)
      { x: 4420, y: -210, w: 80 },

      // REWARD: Rooftop sprint
      { x: 4700, y: -180, w: 130 },
      { x: 4950, y: -170, w: 110 },
      { x: 4950, y: 5, w: 50, type: 'question' },        // High ? — raised
      { x: 5200, y: -160, w: 120, type: 'brick' },
      { x: 5450, y: -180, w: 110 },
      // Goal staircase
      { x: 5650, y: -220, w: 80 },
      { x: 5800, y: -170, w: 80 },
      { x: 5950, y: -120, w: 80 },
    ],
    pipes: [
      { x: 500, height: 70 },
      { x: 1200, height: 80 },
      { x: 3500, height: 70 },
      { x: 5100, height: 80 },
    ],
    coinArcs: [
      { xs: [530, 560, 590], y: -130 },                    // INTRO
      { xs: [740, 770, 800], y: -190 },                    // Gap 1
      { xs: [1560, 1590, 1620], y: -190 },                 // Gap 2
      { xs: [2030, 2060, 2090], y: -120 },                 // Rooftop guide
      { xs: [2310, 2340, 2370], y: -200 },                 // Gap 3
      { xs: [2780, 2810, 2840], y: -130 },                 // Gauntlet guide
      { xs: [3110, 3140, 3170], y: -200 },                 // Gap 4
      { xs: [3810, 3840, 3870], y: -190 },                 // Gap 5
      { xs: [4400, 4430, 4460], y: -180 },                 // Gap 6
      { xs: [4680, 4710, 4740], y: -140 },                 // REWARD
      { xs: [5900, 5930, 5960, 5990, 6020], y: -250 },    // Goal
    ],
    groundEnemies: [
      450,              // INTRO
      950, 1200,        // Near gaps
      1850, 2100,       // Rooftops
      2600, 2900,       // Gauntlet
      3400, 3650,       // Descent
      4100,             // After hard section
      4800, 5100,       // REWARD
      5550,
    ],
    platformEnemies: [
      { x: 1300, y: -130 },     // On brick platform (no ? above)
      { x: 2550, y: -140 },     // Gauntlet platform (no ? above)
      { x: 3650, y: -80 },      // On brick staircase (no ? above)
      { x: 5200, y: -120 },     // REWARD brick (no ? above)
      { x: 5450, y: -140 },     // Near goal (no ? above)
    ],
    aerialEnemies: [
      // World 4 - City: More aggressive aerial enemies
      { x: 700, y: -100, range: 80 },
      { x: 1100, y: -140, range: 90 },
      { x: 1700, y: -110, range: 70 },
      // Gauntlet: Dense aerial presence
      { x: 2400, y: -130, range: 85 },
      { x: 2800, y: -90, range: 75 },
      { x: 3300, y: -120, range: 80 },
      // Late level
      { x: 4000, y: -100, range: 70 },
      { x: 4700, y: -80, range: 60 },
    ],
    goalX: 6100,
    checkpoints: [
      { x: 3500, y: -290 },   // Center of level
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // WORLD 5 — MOON (Low gravity -0.3, floaty jumps, wide gaps)
  //   Running jump ~400u horizontal (low gravity = longer air time)
  //   INTRO: Teaches floaty physics on safe ground
  //   TEACH: Wide gaps (200u) — feel natural with low gravity
  //   TEST:  Floating platform sequences, long jumps over void
  //   REWARD: Spectacular floating coin fields, Earth in background
  // ══════════════════════════════════════════════════════════════════════
  {
    levelWidth: 6400,
    groundSections: [
      { start: -200, end: 900 },      // INTRO: discover floaty physics
      { start: 1100, end: 1800 },     // 200u gap — normal in low gravity
      { start: 2100, end: 2700 },     // 300u gap — big but manageable
      { start: 3000, end: 3600 },     // 300u gap — need bridge platforms
      { start: 3900, end: 4400 },     // 300u gap
      { start: 4700, end: 6600 },     // 300u gap, then finale
    ],
    floatingPlatforms: [
      // INTRO: Platforms spaced for floaty jumps — teach new physics
      { x: 350, y: -140, w: 50, type: 'question' },     // ? block (walkable under)
      { x: 600, y: -150, w: 120 },                       // Wide landing
      // Higher platforms — reachable thanks to low gravity!
      { x: 600, y: 20, w: 100 },                         // Very high — only in low gravity
      { x: 600, y: 140, w: 50, type: 'question' },       // Sky-high reward — raised higher
      { x: 850, y: -170, w: 120, type: 'brick' },

      // Gap 1 (200u): No bridge needed — player can clear it
      // Coins at high altitude guide the floaty arc

      // TEACH: Wider platforms, higher jumps — generous spacing
      { x: 1300, y: -180, w: 130 },
      { x: 1300, y: 10, w: 50, type: 'question' },        // High ? — raised
      { x: 1600, y: -150, w: 120 },
      { x: 1600, y: 110, w: 50, type: 'question' },       // High reward — raised

      // Gap 2 (300u): One mid-air platform
      { x: 1950, y: -170, w: 100 },
      { x: 1950, y: 15, w: 50, type: 'question' },        // High ? — raised

      // After gap 2 — generous spacing
      { x: 2300, y: -160, w: 120 },
      { x: 2550, y: -170, w: 110 },
      { x: 2550, y: 10, w: 100, type: 'brick' },       // High brick (low grav reachable)

      // Gap 3 (300u): Multi-platform bridge — 3 stepping stones
      { x: 2800, y: -200, w: 90 },
      { x: 2900, y: -140, w: 90 },
      { x: 2900, y: 30, w: 50, type: 'question' },        // Raised
      { x: 3000, y: -80, w: 90 },                        // Descending — uses low gravity float

      // Between sections — generous platforms
      { x: 3200, y: -180, w: 120 },
      { x: 3450, y: -160, w: 110 },
      { x: 3450, y: 60, w: 50, type: 'question' },        // High ? — raised

      // TEST: Ascending platform sequence — climb to the stars
      { x: 3700, y: -230, w: 100 },
      { x: 3700, y: -110, w: 100 },
      { x: 3700, y: 10, w: 100 },
      { x: 3700, y: 150, w: 50, type: 'question' },      // Highest ? block — even higher!

      // Gap 4 (300u): Floating platforms
      { x: 3850, y: -200, w: 80 },
      { x: 3850, y: -100, w: 80 },

      // After gap 4
      { x: 4100, y: -180, w: 120 },
      { x: 4100, y: 15, w: 50, type: 'question' },        // High ? — raised
      { x: 4350, y: -170, w: 100, type: 'brick' },

      // Gap 5 (300u): Grand bridge — 4 stepping stones
      { x: 4550, y: -210, w: 80 },
      { x: 4550, y: -80, w: 50, type: 'question' },
      { x: 4630, y: -160, w: 80 },
      { x: 4700, y: -210, w: 80 },

      // REWARD: Grand finale platforms — generous
      { x: 5000, y: -180, w: 140 },
      { x: 5000, y: 20, w: 100 },                        // High bonus platform
      { x: 5000, y: 150, w: 50, type: 'question' },       // Sky-high reward — raised higher
      { x: 5300, y: -170, w: 120, type: 'brick' },
      { x: 5600, y: -180, w: 120 },
      { x: 5600, y: 15, w: 50, type: 'question' },        // High ? — raised
      // Grand staircase to final goal
      { x: 5900, y: -230, w: 80 },
      { x: 6050, y: -180, w: 80 },
      { x: 6200, y: -130, w: 80 },
    ],
    pipes: [
      { x: 750, height: 80 },
      { x: 1450, height: 70 },
      { x: 3350, height: 80 },
      { x: 5200, height: 70 },
    ],
    coinArcs: [
      { xs: [580, 610, 640], y: -110 },                    // INTRO
      { xs: [580, 610, 640], y: 140 },                     // SKY coins — reward for discovery
      // Gap 1: high arc breadcrumbs — show floaty trajectory
      { xs: [1000, 1050, 1100, 1150], y: -50 },           // High arc over gap!
      { xs: [1580, 1610, 1640], y: 110 },                  // High platform coins
      // Gap 2
      { xs: [1930, 1970, 2010], y: -130 },
      { xs: [2530, 2560, 2590], y: 50 },                   // High brick coins
      // Gap 3 — coins on the bridge path
      { xs: [2780, 2830, 2880, 2930, 2980], y: -100 },    // 5 coins guide the bridge
      // Tower climb coins
      { xs: [3680, 3710, 3740], y: 150 },                  // Above the tower peak!
      // Gap 5 bridge coins
      { xs: [4530, 4570, 4610, 4650, 4690], y: -110 },    // 5 coins over grand bridge
      // REWARD: Coin fields at multiple heights
      { xs: [4980, 5020, 5060], y: -140 },
      { xs: [4980, 5020, 5060], y: 50 },                   // High field
      { xs: [6150, 6190, 6230, 6270, 6310], y: -250 },    // Goal
    ],
    groundEnemies: [
      500, 800,          // INTRO — sparse, learn low-gravity stomps
      1350, 1650,        // TEACH
      2350, 2600,        // After gap 2
      3250, 3500,        // Between sections
      4100, 4350,        // After gap 4
      5050, 5400,        // REWARD
      5800, 6100,        // Goal approach
    ],
    platformEnemies: [
      { x: 850, y: -130 },       // INTRO brick guard (no ? above)
      { x: 2550, y: -130 },      // Guards brick path (no ? above)
      { x: 3450, y: -120 },      // Between sections (no ? above)
      { x: 5300, y: -130 },      // REWARD brick guard (no ? above)
      { x: 5600, y: -140 },      // Near goal (no ? above)
    ],
    aerialEnemies: [
      // World 5 - Moon: Many flyers (low gravity = more airborne threats)
      { x: 600, y: -60, range: 100 },
      { x: 1000, y: -120, range: 90 },
      { x: 1500, y: -80, range: 80 },
      { x: 2200, y: -140, range: 95 },
      { x: 2800, y: -100, range: 85 },
      { x: 3600, y: -130, range: 90 },
      { x: 4200, y: -110, range: 75 },
      { x: 5100, y: -90, range: 70 },
      { x: 5700, y: -120, range: 80 },
    ],
    goalX: 6300,
    checkpoints: [
      { x: 3500, y: -290 },   // Center of level (on ground)
    ],
  },

  // ═════════════════════════════════════════════════════════════════────═
  // WORLD 6 — DARK FORTRESS (Boss Castle)
  //   SMB3-inspired castle design with:
  //   - Falling hazards (Thwomp-style) from ceiling
  //   - Narrow corridors with precise timing
  //   - Lava-themed ground (no bottomless pits - lava damage instead)
  //   - Final boss arena with "Bulkthulhu" - the Dark Bulk
  //   
  //   Structure:
  //   INTRO: Tight corridor teaches falling hazard pattern
  //   TEACH: Platforming over "lava" with falling spike hazards
  //   TEST: Gauntlet of multiple hazards + enemy gauntlet
  //   BOSS: Arena with platform to fight the final boss
  // ══════════════════════════════════════════════════════════════════════
  {
    levelWidth: 5500,
    groundSections: [
      { start: -200, end: 800 },      // INTRO: Safe start
      { start: 1000, end: 1600 },     // First hazard section
      { start: 1900, end: 2400 },     // Platforming section
      { start: 2700, end: 3200 },     // Gauntlet start
      { start: 3500, end: 3800 },     // Pre-boss
      { start: 4000, end: 5600 },     // BOSS ARENA - extended ground
    ],
    floatingPlatforms: [
      // INTRO: Simple platforms to ease in
      { x: 300, y: -140, w: 50, type: 'question' },
      { x: 550, y: -160, w: 100 },
      { x: 550, y: 20, w: 50, type: 'question' },         // Raised for clearance

      // First hazard crossing - platforms between ground sections
      { x: 900, y: -200, w: 80 },
      { x: 1050, y: -180, w: 80 },
      { x: 1200, y: -200, w: 80 },

      // Mid-air platforming section
      { x: 1700, y: -180, w: 100 },
      { x: 1700, y: 0, w: 50, type: 'question' },         // Raised for clearance
      { x: 1950, y: -160, w: 80 },
      { x: 2100, y: -200, w: 80 },
      { x: 2250, y: -170, w: 80, type: 'brick' },

      // Gauntlet - challenging platform sequence
      { x: 2550, y: -180, w: 70 },
      { x: 2700, y: -140, w: 70 },
      { x: 2850, y: -180, w: 70 },
      { x: 3000, y: -140, w: 70 },

      // Pre-boss rest area - more platforms to reach boss
      { x: 3300, y: -160, w: 120 },
      { x: 3500, y: 15, w: 50, type: 'question' },        // Raised for clearance
      { x: 3700, y: -160, w: 100, type: 'brick' },
      { x: 3900, y: -200, w: 80 },  // Bridge to boss area
      // No platforms directly in front of checkpoint - clear path to boss

      // BOSS ARENA - 3 platforms for boss fight
      // Main floor is the wide ground section at 4000-5600
      { x: 4600, y: -220, w: 150 },  // Left platform - reachable from checkpoint
      { x: 5100, y: -220, w: 150 },  // Right platform - above boss
      { x: 4850, y: -50, w: 100, type: 'void' },  // Secret portal platform
    ],
    pipes: [
      { x: 700, height: 80 },
      { x: 1800, height: 70 },
      { x: 3400, height: 90 },
    ],
    coinArcs: [
      // INTRO coins
      { xs: [280, 310, 340], y: -100 },
      { xs: [530, 560, 590], y: -130 },
      // Hazard section breadcrumbs
      { xs: [880, 1050, 1220], y: -160 },
      { xs: [1680, 1710, 1740], y: -140 },
      // Gauntlet coins
      { xs: [2530, 2700, 2870, 3020], y: -100 },
      // Pre-boss reward
      { xs: [3280, 3310, 3340], y: -120 },
      // Boss arena coins (high value)
      { xs: [4380, 4600, 4900, 5200], y: -60 },
      { xs: [5380, 5410, 5440], y: -200 },
    ],
    groundEnemies: [
      450,              // INTRO - single enemy
      1300,             // First hazard section
      2150,             // Mid-air section
      2900, 3100,       // Gauntlet
      3650,             // Pre-boss
      // No ground enemies in boss arena - the boss is there!
    ],
    platformEnemies: [
      // Enemy at x=1950 moved to x=1920 - was near ? block at x=1700, y=-40
      { x: 1920, y: -120 },      // Platform with no ? block above
      // Enemy at x=3000 moved to x=2970 - was near ? block at x=3300, y=50
      { x: 2970, y: -100 },      // Platform with no ? block above
    ],
    aerialEnemies: [
      // World 6 - Dark Fortress: Few flyers, focus is on boss
      // INTRO: One flyer to keep player alert
      { x: 800, y: -100, range: 80 },
      // Gauntlet: Flying enemy adds pressure with hazards
      { x: 2400, y: -120, range: 90 },
      { x: 3000, y: -80, range: 70 },
      // Pre-boss: Final flyer before the big fight
      { x: 3800, y: -100, range: 60 },
    ],
    goalX: 5400,
    // Boss level specific data
    fallingHazards: [
      // INTRO section - teach hazard pattern
      { x: 600, y: 50 },
      { x: 750, y: 100 },
      // Hazard gauntlet
      { x: 920, y: 80 },
      { x: 1080, y: 120 },
      { x: 1240, y: 80 },
      // Platforming section hazards
      { x: 1720, y: 100 },
      { x: 1980, y: 60 },
      { x: 2280, y: 100 },
      // Gauntlet hazards
      { x: 2570, y: 80 },
      { x: 2870, y: 120 },
      { x: 3020, y: 80 },
      // Pre-boss hazards
      { x: 3320, y: 100 },
      { x: 3520, y: 60 },
    ],
    // Boss checkpoints - one halfway, one before boss
    checkpoints: [
      { x: 2000, y: -290 },   // Halfway checkpoint
      { x: 4000, y: -270 },   // Before final boss
    ],
    hasBoss: true,
    bossX: 4800,
    bossY: -270,
  },
  // ══════════════════════════════════════════════════════════════════════
  // WORLD 7 — SECRET KAIZO LEVEL (Post-game hell)
  //   EXTREME precision platforming, pixel-perfect jumps
  //   No ground enemies - pure platforming torture
  //   Inspired by Kaizo Mario hacks
  // ══════════════════════════════════════════════════════════════════════
  {
    levelWidth: 4000,
    groundSections: [
      { start: -200, end: 200 },      // Tiny starting platform
      // NO MORE GROUND - pure platforming hell
    ],
    floatingPlatforms: [
      // Opening: Jump tutorial with tiny platforms
      { x: 250, y: -200, w: 40 },
      { x: 350, y: -180, w: 35 },
      { x: 450, y: -160, w: 30 },
      { x: 550, y: -140, w: 35 },
      { x: 650, y: -180, w: 40, type: 'question' },
      
      // The Gauntlet: Rapid-fire micro-jumps
      { x: 750, y: -220, w: 25 },
      { x: 850, y: -200, w: 25 },
      { x: 950, y: -240, w: 25 },
      { x: 1050, y: -180, w: 25 },
      { x: 1150, y: -220, w: 25 },
      { x: 1250, y: -260, w: 30 },
      
      // The Climb: Vertical torture
      { x: 1400, y: -240, w: 30 },
      { x: 1400, y: -320, w: 30 },
      { x: 1400, y: -400, w: 30 },
      { x: 1550, y: -380, w: 25 },
      { x: 1700, y: -350, w: 25 },
      { x: 1850, y: -400, w: 30 },
      { x: 2000, y: -450, w: 25, type: 'question' },
      
      // The Descent: Controlled falling
      { x: 2150, y: -400, w: 25 },
      { x: 2300, y: -350, w: 25 },
      { x: 2450, y: -300, w: 25 },
      { x: 2600, y: -250, w: 25 },
      { x: 2750, y: -200, w: 30 },
      
      // Final stretch: The hardest jumps
      { x: 2900, y: -240, w: 20 },
      { x: 3050, y: -280, w: 20 },
      { x: 3200, y: -240, w: 20 },
      { x: 3350, y: -200, w: 25 },
      { x: 3500, y: -160, w: 30 },
      { x: 3650, y: -120, w: 40 },
      
      // Victory platform
      { x: 3800, y: -100, w: 100 },
    ],
    pipes: [], // No pipes in kaizo level
    coinArcs: [
      // Breadcrumbs showing the path
      { xs: [250, 350, 450], y: -230 },
      { xs: [750, 850, 950, 1050, 1150], y: -270 },
      { xs: [1400, 1400, 1400], y: -360 },
      { xs: [1700, 1850, 2000], y: -420 },
      { xs: [2150, 2300, 2450, 2600], y: -330 },
      { xs: [3050, 3200], y: -310 },
      { xs: [3650, 3750], y: -150 },
    ],
    groundEnemies: [], // No ground enemies - pure platforming
    platformEnemies: [
      // Just a few enemies on platforms to add pressure
      { x: 650, y: -210 },   // On question block platform
      { x: 1250, y: -290 },  // Near end of gauntlet
      { x: 2000, y: -480 },  // At peak of climb
      { x: 3350, y: -240 },  // Final stretch
    ],
    aerialEnemies: [
      // Flying enemies add chaos
      { x: 500, y: -100, range: 60 },
      { x: 1000, y: -120, range: 80 },
      { x: 1600, y: -150, range: 100 },
      { x: 2400, y: -200, range: 70 },
      { x: 3100, y: -180, range: 90 },
    ],
    goalX: 3850,
    checkpoints: [
      { x: 2000, y: -290 },   // Center of level
    ],
    fallingHazards: [
      // Extra hazards for maximum pain
      { x: 300, y: 50 },
      { x: 600, y: 80 },
      { x: 900, y: 60 },
      { x: 1200, y: 100 },
      { x: 1500, y: 40 },
      { x: 1800, y: 90 },
      { x: 2200, y: 70 },
      { x: 2800, y: 50 },
      { x: 3400, y: 80 },
    ],
    hasBoss: false, // No boss - the level itself is the boss
  },
]

// ─── GAUNTLET MODE CONSTANTS ───────────────────────────────────────────

const GAUNTLET_THEME: LevelTheme = {
  name: 'Gauntlet',
  sky: { top: '#000000', mid: '#0D0005', bottom: '#1A000A' },
  ground: { surface: 0x1A0020, body: 0x0D0010, dirt: 0x060008 },
  platform: { color: 0x2A0035, brick: 0x3D0050, brickDark: 0x1A0025 },
  pipe: { body: 0x1A0020, top: 0x2A0035 },
  decorations: 'fortress',
  enemySpeed: 1.6,
  gravity: -0.55,
}

const GAUNTLET_LAYOUT: LevelLayout = {
  levelWidth: 5200,
  groundSections: [
    { start: -200, end: 300 },
  ],
  floatingPlatforms: [
    // Zone 1: Mixed wood/stone intro
    { x: 400, y: -220, w: 35 },
    { x: 520, y: -200, w: 30, type: 'question' },
    { x: 640, y: -240, w: 25 },
    { x: 760, y: -180, w: 30, type: 'brick' },
    { x: 880, y: -260, w: 22 },
    { x: 1000, y: -200, w: 28, type: 'question' },
    // Zone 2: Vertical climb (moon platforms)
    { x: 1150, y: -240, w: 25 },
    { x: 1150, y: -320, w: 25 },
    { x: 1150, y: -400, w: 22 },
    { x: 1300, y: -380, w: 28, type: 'brick' },
    { x: 1450, y: -360, w: 25 },
    { x: 1600, y: -400, w: 22, type: 'question' },
    { x: 1750, y: -430, w: 20 },
    // Zone 3: Descent gauntlet (void platforms)
    { x: 1900, y: -380, w: 22 },
    { x: 2050, y: -340, w: 20 },
    { x: 2200, y: -300, w: 25 },
    { x: 2350, y: -260, w: 20 },
    { x: 2500, y: -300, w: 22, type: 'brick' },
    { x: 2650, y: -260, w: 25 },
    { x: 2800, y: -220, w: 30, type: 'question' },
    // Zone 4: The Chaos (all types mixed)
    { x: 2950, y: -260, w: 20 },
    { x: 3100, y: -300, w: 18 },
    { x: 3250, y: -260, w: 20 },
    { x: 3400, y: -220, w: 25, type: 'question' },
    { x: 3550, y: -260, w: 20 },
    { x: 3700, y: -300, w: 18 },
    { x: 3850, y: -260, w: 22, type: 'brick' },
    { x: 4000, y: -220, w: 25 },
    // Zone 5: Final sprint
    { x: 4150, y: -260, w: 20 },
    { x: 4300, y: -300, w: 18 },
    { x: 4450, y: -260, w: 22 },
    { x: 4600, y: -220, w: 28, type: 'question' },
    { x: 4750, y: -200, w: 30 },
    { x: 4900, y: -180, w: 25 },
    { x: 5000, y: -160, w: 50 },
  ],
  pipes: [],
  coinArcs: [
    { xs: [400, 520, 640], y: -260 },
    { xs: [880, 1000], y: -290 },
    { xs: [1150, 1300, 1450], y: -410 },
    { xs: [1900, 2050, 2200], y: -360 },
    { xs: [2950, 3100, 3250], y: -300 },
    { xs: [4150, 4300, 4450], y: -290 },
    { xs: [4750, 4900, 5000], y: -210 },
  ],
  groundEnemies: [],
  platformEnemies: [
    { x: 640, y: -265 },
    { x: 1600, y: -425 },
    { x: 2500, y: -325 },
    { x: 3400, y: -245 },
    { x: 4600, y: -245 },
  ],
  aerialEnemies: [
    { x: 500, y: -130, range: 60 },
    { x: 900, y: -120, range: 70 },
    { x: 1400, y: -150, range: 80 },
    { x: 2100, y: -170, range: 70 },
    { x: 2700, y: -140, range: 90 },
    { x: 3200, y: -160, range: 70 },
    { x: 3800, y: -150, range: 80 },
    { x: 4400, y: -130, range: 60 },
  ],
  goalX: 5050,
  checkpoints: [
    { x: 2000, y: -290 },   // Center of level
  ],
  fallingHazards: [
    { x: 450, y: 60 }, { x: 700, y: 80 }, { x: 950, y: 60 }, { x: 1200, y: 90 },
    { x: 1500, y: 70 }, { x: 1800, y: 80 }, { x: 2100, y: 60 }, { x: 2400, y: 90 },
    { x: 2700, y: 70 }, { x: 3000, y: 80 }, { x: 3300, y: 60 }, { x: 3600, y: 90 },
    { x: 3900, y: 70 }, { x: 4200, y: 80 }, { x: 4500, y: 60 }, { x: 4800, y: 90 },
  ],
  hasBoss: false,
}

export class BulkPlatformerEngine extends BaseGameEngine {
  // Physics
  private readonly GRAVITY = -0.5
  private readonly JUMP_STRENGTH = 12.8        // Base jump height +5% (can reach yellow blocks)
  private readonly JUMP_HOLD_BOOST = 1.1        // Only 10% higher when holding
  private readonly JUMP_HOLD_FRAMES = 10        // Short window to hold for slightly higher jump
  private readonly MOVE_SPEED = 5.5
  private readonly TERMINAL_VELOCITY = -16
  private readonly VIEW_SIZE = 415

  // Game state
  private gameStarted = false
  private gameOver = false
  private score = 0
  private highScore = 0
  private lives = 3
  private currentHealth = 6  // 2 half-hearts per life = 6 total (lives * 2)
  private readonly MAX_HEALTH_PER_LIFE = 2
  private schmegCount = 0
  private readonly SCHMEGS_PER_LIFE = 3
  private dustParticles: { mesh: THREE.Mesh; life: number }[] = []
  private dustTimer = 0

  // Gauntlet Mode
  private isGauntletMode = false
  private gauntletTimer = 0
  private gauntletBestMs: number = (() => {
    try { return parseInt(localStorage.getItem('gauntletBest') ?? '0') } catch { return 0 }
  })()

  // Level progression
  private currentLevel = 0
  private currentTheme: LevelTheme = LEVEL_THEMES[0]
  private currentLayout: LevelLayout = LEVEL_LAYOUTS[0]

  // Checkpoints
  private checkpoints: { x: number; y: number }[] = []
  private lastCheckpointIndex = -1
  private spawnX = 100
  private spawnY = -200

  // Player
  private bulk!: THREE.Group
  private bulkSprite!: THREE.Mesh
  private bulkVelocityX = 0
  private bulkVelocityY = 0
  private isGrounded = false
  private coyoteFrames = 0           // Frames remaining to jump after leaving ground
  private jumpBufferFrames = 0        // Frames to remember early jump press
  private readonly COYOTE_MAX = 6      // ~100ms at 60fps
  private readonly JUMP_BUFFER_MAX = 6 // ~100ms
  private facingRight = true
  private currentAnimation: 'idle' | 'run' | 'jump' | 'shoot' | 'damage' | 'dead' = 'idle'
  private readonly PLAYER_WIDTH = 30
  private readonly PLAYER_HEIGHT = 35
  private wasJumpPressed = false
  private isJumping = false
  private jumpHoldTimer = 0

  // Orb projectile mechanic (replaces punch)
  private isShooting = false
  private shootTimer = 0
  private readonly SHOOT_DURATION = 15
  private readonly SHOOT_COOLDOWN = 50
  private shootCooldownTimer = 0
  private orbs: Orb[] = []
  private readonly ORB_SPEED = 8
  private readonly ORB_MAX_DISTANCE = 180
  private orbTexture: THREE.Texture | null = null
  private orbGroundTexture: THREE.Texture | null = null
  private orbAirTexture: THREE.Texture | null = null
  private batTexture: THREE.Texture | null = null
  private batDamageTexture: THREE.Texture | null = null
  private crabTexture: THREE.Texture | null = null
  private crabDamageTexture: THREE.Texture | null = null
  private fallingRockTexture: THREE.Texture | null = null
  private footdustTexture: THREE.Texture | null = null
  private bossIdleTexture: THREE.Texture | null = null
  private bossRunTexture: THREE.Texture | null = null
  private bossDamageTexture: THREE.Texture | null = null
  private bossDeathTexture: THREE.Texture | null = null
  private bossCorruptedTexture: THREE.Texture | null = null
  private bossJumpTexture: THREE.Texture | null = null
  private bossPunchTexture: THREE.Texture | null = null
  private darkOrbTexture: THREE.Texture | null = null
  private portalTexture: THREE.Texture | null = null
  private checkpointTexture: THREE.Texture | null = null
  private checkpointGreenTexture: THREE.Texture | null = null
  private comboTextTexture: THREE.Texture | null = null
  private cloudTexture1: THREE.Texture | null = null
  private cloudTexture2: THREE.Texture | null = null

  // Camera
  private cameraTargetX = 0

  // Level objects
  private platforms: Platform[] = []
  private enemies: Enemy[] = []
  private coins: Coin[] = []
  private floatingCoins: FloatingCoin[] = []
  private comboTexts: { mesh: THREE.Mesh; x: number; y: number; life: number }[] = []
  private decorations: THREE.Object3D[] = []
  private animatedClouds: { mesh: THREE.Mesh; speed: number; baseY: number }[] = []
  private goalFlag: THREE.Group | null = null
  private goalX = 0
  private goalY = 0
  private backgroundObjects: THREE.Object3D[] = []
  private levelLighting: THREE.Light[] = []
  private fallingHazards: FallingHazard[] = []

  // PowerUps
  private powerUps: PowerUp[] = []

  // Rage Mode (Schmeg powerup) - Mario star-style invincibility
  private isRageMode = false
  private rageModeTimer = 0
  private readonly RAGE_MODE_DURATION = 600 // 10 seconds at 60fps
  private rageModeFlashTimer = 0

  // Boss battle state
  private bossDefeated = false
  private bossProjectiles: { mesh: THREE.Mesh; x: number; y: number; velocityX: number; velocityY: number; distanceTraveled: number; maxDistance: number }[] = []

  // Textures
  private spriteTextures: Map<string, THREE.Texture> = new Map()
  private platformTextures: Map<string, THREE.Texture> = new Map()

  // Systems
  private audio = new AudioManager()
  private input!: InputManager

  // Touch controls
  private touchJumpBtn: HTMLButtonElement | null = null
  private touchShootBtn: HTMLButtonElement | null = null
  private touchJoystick?: {
    container: HTMLDivElement
    stick: HTMLDivElement
    active: boolean
    centerX: number
    centerY: number
    touchId: number | null
  }
  private touchMovingLeft = false
  private touchMovingRight = false
  private touchJumping = false
  private touchShooting = false

  constructor(container: HTMLElement, callbacks: GameCallbacks) {
    super(container, callbacks)
    try {
      this.highScore = parseInt(localStorage.getItem('bulkPlatformerHighScore') || '0', 10)
    } catch { /* storage disabled */ }
  }

  createScene(): void {
    // Orthographic camera - initial setup (will be adjusted in onResize)
    this.camera = new THREE.OrthographicCamera(
      -this.VIEW_SIZE, this.VIEW_SIZE,
      this.VIEW_SIZE, -this.VIEW_SIZE,
      0.1, 1000
    )
    // Camera positioned lower to show more below the player
    // Lowered by 50px (was -50, now -100)
    this.camera.position.set(0, -100, 500)
    this.camera.lookAt(0, -100, 0)

    // Audio
    this.audio.loadBGM(ASSET_PATHS.audio.bgm, 0.25)

    // Input
    this.input = new InputManager(this.container)

    // Load sprites then build level
    this.loadSprites().then(() => {
      this.createBulkSprite()
      this.buildLevel()
      if (this.input.getIsMobile()) {
        this.createTouchControls()
      }
    })

    // Initial resize to ensure correct aspect ratio
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (width && height) {
      this.onResize(width, height)
    }

    this.callbacks.onHighScoreChange?.(this.highScore)
  }

  private async loadSprites(): Promise<void> {
    const loader = new THREE.TextureLoader()

    const [idle, run, jump, punch, damage, dead, blockTex, platformWood, platformStone, platformMoon, platformVoid, coinTex, schmegTex, orbTex, orbGroundTex, orbAirTex, batTex, batDamageTex, crabTex, crabDamageTex, fallRockTex, footdustTex, bossIdleTex, bossRunTex, bossDamageTex, bossDeathTex, bossCorruptedTex, bossJumpTex, bossPunchTex, darkOrbTex, portalTex, checkpointTex, checkpointGreenTex, comboTextTex, cloud1Tex, cloud2Tex] = await Promise.all([
      loader.loadAsync(ASSET_PATHS.sprites.bulk.idle),
      loader.loadAsync(ASSET_PATHS.sprites.bulk.run),
      loader.loadAsync(ASSET_PATHS.sprites.bulk.jump),
      loader.loadAsync(ASSET_PATHS.sprites.bulk.punch),
      loader.loadAsync('/images/pixelbulk-damage.png').catch(() => null),
      loader.loadAsync('/images/pixelbulk-dead.png').catch(() => null),
      loader.loadAsync('/images/block.png').catch(() => null),
      loader.loadAsync('/images/platform1.png').catch(() => null),
      loader.loadAsync('/images/platform-stone.png').catch(() => null),
      loader.loadAsync('/images/platform-moon.png').catch(() => null),
      loader.loadAsync('/images/platform-void.png').catch(() => null),
      loader.loadAsync('/images/coin.png').catch(() => null),
      loader.loadAsync('/images/schmeg.png').catch(() => null),
      loader.loadAsync('/images/orb.png').catch(() => null),
      loader.loadAsync('/images/orb-ground.png').catch(() => null),
      loader.loadAsync('/images/orb-air.png').catch(() => null),
      loader.loadAsync('/images/bat.png').catch(() => null),
      loader.loadAsync('/images/bat-damage.png').catch(() => null),
      loader.loadAsync('/images/crab.png').catch(() => null),
      loader.loadAsync('/images/crab-damage.png').catch(() => null),
      loader.loadAsync('/images/fall-rock.png').catch(() => null),
      loader.loadAsync('/images/footdust.png').catch(() => null),
      loader.loadAsync('/images/dark-pixelbulk.png').catch(() => null),
      loader.loadAsync('/images/dark-run.png').catch(() => null),
      loader.loadAsync('/images/dark_damage.png').catch(() => null),
      loader.loadAsync('/images/dark-death.png').catch(() => null),
      loader.loadAsync('/images/dark_corrupted.png').catch(() => null),
      loader.loadAsync('/images/dark-bulk-jump.png').catch(() => null),
      loader.loadAsync('/images/dark-punch.png').catch(() => null),
      loader.loadAsync('/images/dark-orb.png').catch(() => null),
      loader.loadAsync('/images/portal.png').catch(() => null),
      loader.loadAsync('/images/checkpoint.png').catch(() => { console.warn('Failed to load checkpoint.png'); return null }),
      loader.loadAsync('/images/checkpoint-green.png').catch(() => { console.warn('Failed to load checkpoint-green.png'); return null }),
      loader.loadAsync('/images/combo-text.png').catch(() => null),
      loader.loadAsync('/images/cloud1.png').catch(() => null),
      loader.loadAsync('/images/cloud2.png').catch(() => null),
    ])

    // Pixel-perfect rendering
    for (const texture of [idle, run, jump, punch]) {
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
    }
    
    // Orb textures
    if (orbTex) {
      orbTex.magFilter = THREE.NearestFilter
      orbTex.minFilter = THREE.NearestFilter
      this.orbTexture = orbTex
    }
    if (orbGroundTex) {
      orbGroundTex.magFilter = THREE.NearestFilter
      orbGroundTex.minFilter = THREE.NearestFilter
      this.orbGroundTexture = orbGroundTex
    }
    if (orbAirTex) {
      orbAirTex.magFilter = THREE.NearestFilter
      orbAirTex.minFilter = THREE.NearestFilter
      this.orbAirTexture = orbAirTex
    }
    // Bat texture for flying enemies
    if (batTex) {
      batTex.magFilter = THREE.NearestFilter
      batTex.minFilter = THREE.NearestFilter
      this.batTexture = batTex
    }
    if (batDamageTex) {
      batDamageTex.magFilter = THREE.NearestFilter
      batDamageTex.minFilter = THREE.NearestFilter
      this.batDamageTexture = batDamageTex
    }
    // Crab textures for ground enemies
    if (crabTex) {
      crabTex.magFilter = THREE.NearestFilter
      crabTex.minFilter = THREE.NearestFilter
      this.crabTexture = crabTex
    }
    if (crabDamageTex) {
      crabDamageTex.magFilter = THREE.NearestFilter
      crabDamageTex.minFilter = THREE.NearestFilter
      this.crabDamageTexture = crabDamageTex
    }
    if (fallRockTex) {
      fallRockTex.magFilter = THREE.NearestFilter
      fallRockTex.minFilter = THREE.NearestFilter
      this.fallingRockTexture = fallRockTex
    }
    if (footdustTex) {
      footdustTex.magFilter = THREE.NearestFilter
      footdustTex.minFilter = THREE.NearestFilter
      this.footdustTexture = footdustTex
    }
    if (damage) {
      damage.magFilter = THREE.NearestFilter
      damage.minFilter = THREE.NearestFilter
    }
    if (dead) {
      dead.magFilter = THREE.NearestFilter
      dead.minFilter = THREE.NearestFilter
    }

    this.spriteTextures.set('idle', idle)
    this.spriteTextures.set('run', run)
    this.spriteTextures.set('jump', jump)
    this.spriteTextures.set('punch', punch)
    if (damage) this.spriteTextures.set('damage', damage)
    if (dead) this.spriteTextures.set('dead', dead)

    // Platform textures with pixel-perfect rendering
    const platformTexs = [blockTex, platformWood, platformStone].filter(Boolean) as THREE.Texture[]
    for (const texture of platformTexs) {
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
    }
    if (blockTex) this.platformTextures.set('block', blockTex)
    if (platformWood) this.platformTextures.set('wood', platformWood)
    if (platformStone) this.platformTextures.set('stone', platformStone)
    const moonStoneTexs = [platformMoon, platformVoid].filter(Boolean) as THREE.Texture[]
    for (const t of moonStoneTexs) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter }
    // Boss textures
    const bossTexs = [bossIdleTex, bossRunTex, bossDamageTex, bossDeathTex, bossCorruptedTex, bossJumpTex, cloud1Tex, cloud2Tex].filter(Boolean) as THREE.Texture[]
    for (const t of bossTexs) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter }
    if (bossIdleTex) this.bossIdleTexture = bossIdleTex
    if (bossRunTex) this.bossRunTexture = bossRunTex
    if (bossDamageTex) this.bossDamageTexture = bossDamageTex
    if (bossDeathTex) this.bossDeathTexture = bossDeathTex
    if (bossCorruptedTex) this.bossCorruptedTexture = bossCorruptedTex
    if (bossJumpTex) this.bossJumpTexture = bossJumpTex
    if (bossPunchTex) this.bossPunchTexture = bossPunchTex
    if (darkOrbTex) this.darkOrbTexture = darkOrbTex
    if (portalTex) this.portalTexture = portalTex
    if (checkpointTex) this.checkpointTexture = checkpointTex
    if (checkpointGreenTex) this.checkpointGreenTexture = checkpointGreenTex
    if (comboTextTex) this.comboTextTexture = comboTextTex
    if (cloud1Tex) this.cloudTexture1 = cloud1Tex
    if (cloud2Tex) this.cloudTexture2 = cloud2Tex

    if (platformMoon) this.platformTextures.set('moon', platformMoon)
    if (platformVoid) this.platformTextures.set('void', platformVoid)
    if (coinTex) {
      coinTex.magFilter = THREE.NearestFilter
      coinTex.minFilter = THREE.NearestFilter
      this.platformTextures.set('coin', coinTex)
    }
    if (schmegTex) {
      schmegTex.magFilter = THREE.NearestFilter
      schmegTex.minFilter = THREE.NearestFilter
      this.platformTextures.set('schmeg', schmegTex)
    }
  }

  private createBulkSprite(): void {
    // Bulk sprite 15% smaller (was 100x80, now 85x68)
    const geo = new THREE.PlaneGeometry(85, 68)
    const mat = new THREE.MeshBasicMaterial({
      map: this.spriteTextures.get('idle')!,
      transparent: true,
      side: THREE.DoubleSide,
    })

    this.bulkSprite = new THREE.Mesh(geo, mat)
    this.bulkSprite.position.z = 0

    this.bulk = new THREE.Group()
    this.bulk.add(this.bulkSprite)
    this.bulk.position.set(100, -200, 0)
    this.scene.add(this.bulk)
  }

  // ─── Level Construction ───────────────────────────────────────────

  private buildLevel(): void {
    const theme = this.currentTheme
    const layout = this.currentLayout

    // Sky background
    this.createSkyBackground(theme)

    // Flash overlay for damage
    this.createFlashOverlay()

    // Lighting
    this.createLevelLighting(theme)

    // Parse checkpoints from level layout
    this.checkpoints = layout.checkpoints || []
    // Don't reset checkpoint index - keep activated checkpoints
    // But do set spawn to level start if no checkpoints activated
    if (this.lastCheckpointIndex < 0) {
      this.spawnX = 100
      this.spawnY = -200
    }
    // Build checkpoint flags
    for (let i = 0; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i]
      this.createCheckpointFlag(cp.x, cp.y, i)
    }

    // Ground sections
    for (const section of layout.groundSections) {
      const width = section.end - section.start
      const x = section.start + width / 2
      this.createGroundSection(x, width, theme)
    }

    // Floating platforms
    for (const p of layout.floatingPlatforms) {
      const type = p.type || 'platform'
      let color: number
      switch (type) {
        case 'question': color = 0xFFD700; break
        case 'brick': color = theme.platform.brick; break
        default: color = theme.platform.color; break
      }
      this.createPlatform(p.x, p.y, p.w, 30, type, color, theme)
    }

    // Pipes
    for (const pipe of layout.pipes) {
      this.createPipe(pipe.x, pipe.height, theme)
    }

    // Floating coins
    for (const arc of layout.coinArcs) {
      for (const cx of arc.xs) {
        this.createFloatingCoin(cx, arc.y)
      }
    }

    // Enemies
    this.spawnLevelEnemies(layout, theme)

    // Falling hazards (fortress levels)
    if (layout.fallingHazards) {
      for (const hazard of layout.fallingHazards) {
        this.createFallingHazard(hazard.x, hazard.y)
      }
    }

    // Boss
    if (layout.hasBoss && layout.bossX !== undefined && layout.bossY !== undefined) {
      this.createBoss(layout.bossX, layout.bossY)
    }

    // Goal flag (only if no boss, or boss defeated)
    if (!layout.hasBoss || this.bossDefeated) {
      this.createGoalFlag(layout.goalX)
    }

    // Themed decorations
    this.createThemedDecorations(theme, layout)
  }

  private clearLevel(): void {
    // Remove platforms
    for (const p of this.platforms) {
      this.scene.remove(p.mesh)
      p.mesh.geometry?.dispose()
      const mat = p.mesh.material as THREE.MeshBasicMaterial
      if (mat.map) mat.map.dispose()
      mat.dispose()
    }
    this.platforms = []

    // Remove enemies
    for (const e of this.enemies) {
      this.scene.remove(e.mesh)
    }
    this.enemies = []

    // Remove block-spawned coins
    for (const c of this.coins) {
      this.scene.remove(c.mesh)
      c.mesh.geometry?.dispose()
      ;(c.mesh.material as THREE.MeshBasicMaterial).dispose()
    }
    this.coins = []

    // Remove powerups
    for (const pu of this.powerUps) {
      this.scene.remove(pu.mesh)
      pu.mesh.geometry?.dispose()
      ;(pu.mesh.material as THREE.MeshBasicMaterial).dispose()
    }
    this.powerUps = []

    // Reset rage mode
    this.isRageMode = false
    this.rageModeTimer = 0
    this.resetPlayerColor()

    // Remove orbs
    for (const orb of this.orbs) {
      this.scene.remove(orb.mesh)
      orb.mesh.geometry?.dispose()
      ;(orb.mesh.material as THREE.MeshBasicMaterial).dispose()
    }
    this.orbs = []

    // Remove floating coins
    for (const fc of this.floatingCoins) {
      this.scene.remove(fc.mesh)
      fc.mesh.geometry?.dispose()
      ;(fc.mesh.material as THREE.MeshBasicMaterial).dispose()
    }
    this.floatingCoins = []

    // Remove decorations
    for (const d of this.decorations) {
      this.scene.remove(d)
      d.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose()
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          for (const m of mats) {
            if (m.map) m.map.dispose()
            m.dispose()
          }
        }
      })
    }
    this.decorations = []
    this.animatedClouds = []

    // Remove background objects
    for (const bg of this.backgroundObjects) {
      this.scene.remove(bg)
      bg.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose()
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          for (const m of mats) {
            if (m.map) m.map.dispose()
            m.dispose()
          }
        }
      })
    }
    this.backgroundObjects = []

    // Remove goal flag
    if (this.goalFlag) {
      this.scene.remove(this.goalFlag)
      this.goalFlag.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose()
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          for (const m of mats) {
            if (m.map) m.map.dispose()
            m.dispose()
          }
        }
      })
      this.goalFlag = null
    }

    // Remove lighting
    for (const light of this.levelLighting) {
      this.scene.remove(light)
    }
    this.levelLighting = []

    // Remove falling hazards
    for (const h of this.fallingHazards) {
      this.scene.remove(h.mesh)
      h.mesh.geometry?.dispose()
      ;(h.mesh.material as THREE.MeshBasicMaterial).dispose()
    }
    this.fallingHazards = []

    // Clear dust particles
    for (const dust of this.dustParticles) {
      this.scene.remove(dust.mesh)
      dust.mesh.geometry?.dispose()
      ;(dust.mesh.material as THREE.MeshBasicMaterial).dispose()
    }
    this.dustParticles = []

    // Remove boss projectiles
    for (const p of this.bossProjectiles) {
      this.scene.remove(p.mesh)
      p.mesh.geometry?.dispose()
      ;(p.mesh.material as THREE.MeshBasicMaterial).dispose()
    }
    this.bossProjectiles = []

    // Dispose sky background
    if (this.scene.background instanceof THREE.Texture) {
      this.scene.background.dispose()
      this.scene.background = null
    }
  }

  private flashColor = 0x000000
  private flashFrames = 0

  private createFlashOverlay(): void {
    const geo = new THREE.PlaneGeometry(2000, 2000)
    const mat = new THREE.MeshBasicMaterial({ color: 0xFF0000, transparent: true, opacity: 0 })
    const flash = new THREE.Mesh(geo, mat)
    flash.position.set(0, 0, 100)
    flash.name = 'flashOverlay'
    this.scene.add(flash)
  }

  private flashScreen(color: number, frames: number): void {
    this.flashColor = color
    this.flashFrames = frames
  }

  private createSkyBackground(theme: LevelTheme): void {
    const bgCanvas = document.createElement('canvas')
    bgCanvas.width = 512
    bgCanvas.height = 512
    const ctx = bgCanvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, theme.sky.top)
    gradient.addColorStop(0.5, theme.sky.mid)
    gradient.addColorStop(1, theme.sky.bottom)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)
    this.scene.background = new THREE.CanvasTexture(bgCanvas)
  }

  private createFallbackTexture(color: number): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0')
    ctx.fillRect(0, 0, 32, 32)
    // Add a simple glow effect
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.strokeRect(2, 2, 28, 28)
    const tex = new THREE.CanvasTexture(canvas)
    tex.magFilter = THREE.NearestFilter
    return tex
  }

  private createLevelLighting(theme: LevelTheme): void {
    const isNight = theme.decorations === 'city' || theme.decorations === 'moon' || theme.decorations === 'fortress'
    const isFortress = theme.decorations === 'fortress'
    const ambientIntensity = isFortress ? 0.4 : (isNight ? 0.5 : 0.8)
    const dirIntensity = isFortress ? 0.2 : (isNight ? 0.15 : 0.3)
    
    // Fortress gets a red directional light for atmosphere
    const dirColor = isFortress ? 0xFF4444 : 0xffffff

    const ambient = new THREE.AmbientLight(0xffffff, ambientIntensity)
    this.scene.add(ambient)
    this.levelLighting.push(ambient)

    const directional = new THREE.DirectionalLight(dirColor, dirIntensity)
    directional.position.set(100, 200, 100)
    this.scene.add(directional)
    this.levelLighting.push(directional)
  }

  private createGroundSection(x: number, width: number, theme: LevelTheme): void {
    // Surface layer texture
    const grassCanvas = document.createElement('canvas')
    grassCanvas.width = 128
    grassCanvas.height = 16
    const gctx = grassCanvas.getContext('2d')!

    const surfaceColor = '#' + theme.ground.surface.toString(16).padStart(6, '0')
    const lighterColor = '#' + Math.min(0xFFFFFF, theme.ground.surface + 0x101010).toString(16).padStart(6, '0')

    gctx.fillStyle = surfaceColor
    gctx.fillRect(0, 0, 128, 16)
    gctx.fillStyle = lighterColor
    for (let i = 0; i < 128; i += 4) {
      const h = 3 + Math.random() * 5
      gctx.fillRect(i, 0, 2, h)
    }
    const grassTex = new THREE.CanvasTexture(grassCanvas)
    grassTex.wrapS = THREE.RepeatWrapping
    grassTex.repeat.x = Math.floor(width / 60)
    grassTex.magFilter = THREE.NearestFilter
    grassTex.minFilter = THREE.NearestFilter

    const grassGeo = new THREE.PlaneGeometry(width, 20)
    const grassMat = new THREE.MeshBasicMaterial({ map: grassTex })
    const grass = new THREE.Mesh(grassGeo, grassMat)
    grass.position.set(x, -305, -8)
    this.scene.add(grass)
    this.decorations.push(grass)

    // Main ground body
    this.createPlatform(x, -350, width, 80, 'ground', theme.ground.body, theme)
    // Dirt layer
    this.createPlatform(x, -420, width, 60, 'ground', theme.ground.dirt, theme)
  }

  private createFloatingCoin(x: number, y: number): void {
    const tex = this.platformTextures.get('coin')
    const geo = new THREE.PlaneGeometry(20, 20)
    const mat = tex
      ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1 })
      : new THREE.MeshBasicMaterial({ color: 0xFFD700 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, 2)
    this.scene.add(mesh)

    this.floatingCoins.push({
      mesh, x, y, baseY: y,
      collected: false,
      bobTimer: Math.random() * Math.PI * 2,
    })
  }

  private createComboText(x: number, y: number): void {
    if (!this.comboTextTexture) return
    const geo = new THREE.PlaneGeometry(40, 20)
    const mat = new THREE.MeshBasicMaterial({ map: this.comboTextTexture, transparent: true, alphaTest: 0.1 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, 5)
    this.scene.add(mesh)
    this.comboTexts.push({ mesh, x, y, life: 40 })
  }

  private updateComboTexts(): void {
    for (let i = this.comboTexts.length - 1; i >= 0; i--) {
      const ct = this.comboTexts[i]
      ct.life--
      ct.y += 1.5  // Float upward
      ct.mesh.position.y = ct.y
      // Fade out
      const mat = ct.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = ct.life / 40
      if (ct.life <= 0) {
        this.scene.remove(ct.mesh)
        this.comboTexts.splice(i, 1)
      }
    }
  }

  private checkpointFlags: { mesh: THREE.Mesh; index: number }[] = []

  private createCheckpointFlag(x: number, y: number, index: number): void {
    // Use ONLY checkpoint.png - it has its own pole built in
    const flagGeo = new THREE.PlaneGeometry(63, 125)
    let flagMat: THREE.MeshBasicMaterial
    if (this.checkpointTexture) {
      flagMat = new THREE.MeshBasicMaterial({ map: this.checkpointTexture, transparent: true, side: THREE.DoubleSide })
    } else {
      flagMat = new THREE.MeshBasicMaterial({ color: 0xFF0000, side: THREE.DoubleSide })
    }
    const flagMesh = new THREE.Mesh(flagGeo, flagMat)
    // Position at ground level - image includes pole
    flagMesh.position.set(x + 25, y + 50, 0)
    this.scene.add(flagMesh)
    this.checkpointFlags.push({ mesh: flagMesh, index })
  }

  private checkCheckpoint(): void {
    if (!this.bulk || this.checkpoints.length === 0) return

    for (let i = 0; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i]
      // If player passes checkpoint x and hasn't activated this checkpoint yet
      if (this.bulk.position.x > cp.x && i > this.lastCheckpointIndex) {
        this.lastCheckpointIndex = i
        this.spawnX = cp.x
        this.spawnY = cp.y
        // Visual feedback - change flag to green texture
        const flagObj = this.checkpointFlags.find(f => f.index === i)
        if (flagObj && this.checkpointGreenTexture) {
          const mat = flagObj.mesh.material as THREE.MeshBasicMaterial
          mat.map = this.checkpointGreenTexture
          mat.needsUpdate = true
        }
        // Play checkpoint sound
        this.audio.synthSweep(600, 1200, 0.2, 'sine', 0.3)
        break
      }
    }
  }

  private createGoalFlag(x: number): void {
    // Use ONLY checkpoint.png for goal flag (includes its own pole)
    const flagGeo = new THREE.PlaneGeometry(63, 125)
    let flagMat: THREE.MeshBasicMaterial
    if (this.checkpointTexture) {
      flagMat = new THREE.MeshBasicMaterial({ map: this.checkpointTexture, transparent: true, side: THREE.DoubleSide })
    } else {
      flagMat = new THREE.MeshBasicMaterial({ color: 0x00FF00, side: THREE.DoubleSide })
    }
    this.goalFlag = new THREE.Group()
    const flag = new THREE.Mesh(flagGeo, flagMat)
    flag.position.set(x + 32, -188, 0)  // At ground level
    this.goalFlag.add(flag)

    // "GOAL" text via canvas
    const textCanvas = document.createElement('canvas')
    textCanvas.width = 64
    textCanvas.height = 32
    const tctx = textCanvas.getContext('2d')!
    tctx.fillStyle = '#FFF'
    tctx.font = 'bold 20px monospace'
    tctx.textAlign = 'center'
    tctx.textBaseline = 'middle'
    tctx.fillText('GOAL', 32, 16)
    const textTex = new THREE.CanvasTexture(textCanvas)
    textTex.magFilter = THREE.NearestFilter
    const textGeo = new THREE.PlaneGeometry(50, 25)
    const textMat = new THREE.MeshBasicMaterial({ map: textTex, transparent: true })
    const text = new THREE.Mesh(textGeo, textMat)
    text.position.set(x + 32, -100, 1)
    this.goalFlag.add(text)

    this.scene.add(this.goalFlag)
  }

  private createSecretPortal(x: number, y: number): void {
    // Use portal.png texture - keep aspect ratio, smaller size
    const portalGroup = new THREE.Group()
    
    if (this.portalTexture) {
      // Use image's natural aspect ratio at reasonable size (80 height)
      const portalGeo = new THREE.PlaneGeometry(80, 80)
      const portalMat = new THREE.MeshBasicMaterial({ 
        map: this.portalTexture, 
        transparent: true, 
        alphaTest: 0.1 
      })
      const portal = new THREE.Mesh(portalGeo, portalMat)
      portalGroup.add(portal)
    } else {
      // Fallback to procedural portal if texture not loaded
      const glowGeo = new THREE.CircleGeometry(50, 32)
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x9933FF, transparent: true, opacity: 0.4 })
      const glow = new THREE.Mesh(glowGeo, glowMat)
      portalGroup.add(glow)
    }

    portalGroup.position.set(x, y, 10)
    this.scene.add(portalGroup)

    // Store portal for collision
    this.goalX = x
    this.goalY = y

    // Create "Victory!" text above portal
    const textCanvas = document.createElement('canvas')
    textCanvas.width = 256
    textCanvas.height = 64
    const tctx = textCanvas.getContext('2d')!
    tctx.fillStyle = '#FFD700'  // Gold color
    tctx.font = 'bold 48px monospace'
    tctx.textAlign = 'center'
    tctx.textBaseline = 'middle'
    tctx.strokeStyle = '#000'
    tctx.lineWidth = 3
    tctx.strokeText('Victory!', 128, 32)
    tctx.fillText('Victory!', 128, 32)
    const textTex = new THREE.CanvasTexture(textCanvas)
    textTex.magFilter = THREE.NearestFilter
    const textGeo = new THREE.PlaneGeometry(120, 30)
    const textMat = new THREE.MeshBasicMaterial({ map: textTex, transparent: true })
    const text = new THREE.Mesh(textGeo, textMat)
    text.position.set(x, y + 70, 15)
    this.scene.add(text)
  }

  private createPlatform(
    x: number, y: number, width: number, height: number,
    type: Platform['type'], color: number, theme: LevelTheme
  ): void {
    const geo = new THREE.PlaneGeometry(width, height)
    let mat: THREE.MeshBasicMaterial

    if (type === 'question') {
      // Use block.png texture for question blocks
      const blockTex = this.platformTextures.get('block')
      if (blockTex) {
        mat = new THREE.MeshBasicMaterial({ map: blockTex, transparent: true })
      } else {
        // Fallback to yellow color if texture not loaded
        mat = new THREE.MeshBasicMaterial({ color: 0xFFD700 })
      }
    } else if (type === 'platform') {
      // Use platform texture based on world (1-3 wood, 4-6 stone, 5 moon, 7 void)
      let platformTexKey = 'wood'
      if (this.isGauntletMode) {
        // Cycle through textures based on x position: wood → stone → moon → void
        const zone = Math.floor(x / 1000) % 4
        platformTexKey = ['wood', 'stone', 'moon', 'void'][zone]
      } else if (this.currentLevel === 4) platformTexKey = 'moon'
      else if (this.currentLevel === 6) platformTexKey = 'void'
      else if (this.currentLevel >= 3) platformTexKey = 'stone'
      const platformTex = this.platformTextures.get(platformTexKey) ?? this.platformTextures.get('stone')
      if (platformTex) {
        platformTex.wrapS = THREE.RepeatWrapping
        platformTex.repeat.x = Math.max(1, Math.floor(width / 50))
        mat = new THREE.MeshBasicMaterial({ map: platformTex, transparent: true })
      } else {
        mat = new THREE.MeshBasicMaterial({ color })
      }
    } else if (type === 'brick') {
      const brickColor = '#' + theme.platform.brick.toString(16).padStart(6, '0')
      const brickDark = '#' + theme.platform.brickDark.toString(16).padStart(6, '0')
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 32
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = brickColor
      ctx.fillRect(0, 0, 64, 32)
      ctx.strokeStyle = brickDark
      ctx.lineWidth = 1
      ctx.strokeRect(0, 0, 32, 16)
      ctx.strokeRect(32, 0, 32, 16)
      ctx.strokeRect(16, 16, 32, 16)
      ctx.strokeRect(-16, 16, 32, 16)
      ctx.strokeRect(48, 16, 32, 16)
      const texture = new THREE.CanvasTexture(canvas)
      texture.wrapS = THREE.RepeatWrapping
      texture.repeat.x = Math.floor(width / 30)
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
      mat = new THREE.MeshBasicMaterial({ map: texture })
    } else if (type === 'void') {
      // Void platform - use platform-void.png texture
      const voidTex = this.platformTextures.get('void')
      if (voidTex) {
        voidTex.wrapS = THREE.RepeatWrapping
        voidTex.repeat.x = Math.max(1, Math.floor(width / 50))
        mat = new THREE.MeshBasicMaterial({ map: voidTex, transparent: true })
      } else {
        mat = new THREE.MeshBasicMaterial({ color: 0x1a0a2e }) // Dark purple fallback
      }
    } else {
      mat = new THREE.MeshBasicMaterial({ color })
    }

    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, -10)
    this.scene.add(mesh)
    this.platforms.push({ mesh, x, y, width, height, type })
  }

  private createPipe(x: number, height: number, theme: LevelTheme): void {
    // Pipe body
    const bodyGeo = new THREE.PlaneGeometry(50, height)
    const bodyMat = new THREE.MeshBasicMaterial({ color: theme.pipe.body })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.set(x, -310 + height / 2, -5)
    this.scene.add(body)

    // Pipe top (wider)
    const topGeo = new THREE.PlaneGeometry(60, 20)
    const topMat = new THREE.MeshBasicMaterial({ color: theme.pipe.top })
    const top = new THREE.Mesh(topGeo, topMat)
    top.position.set(x, -310 + height, -4)
    this.scene.add(top)

    // Pipe is also a platform you can stand on
    this.platforms.push({
      mesh: top,
      x, y: -310 + height + 10,
      width: 60, height: 20,
      type: 'platform',
    })

    this.decorations.push(body, top)
  }

  // ─── Themed Decorations ─────────────────────────────────────────────

  private createThemedDecorations(theme: LevelTheme, layout: LevelLayout): void {
    switch (theme.decorations) {
      case 'grasslands': this.createGrasslandsDecorations(layout); break
      case 'desert': this.createDesertDecorations(layout); break
      case 'countryside': this.createCountrysideDecorations(layout); break
      case 'city': this.createCityDecorations(layout); break
      case 'moon': this.createMoonDecorations(layout); break
      case 'fortress': this.createFortressDecorations(layout); break
    }
  }

  private createGrasslandsDecorations(layout: LevelLayout): void {
    // Bushes on ground sections
    for (const section of layout.groundSections) {
      const width = section.end - section.start
      const x = section.start + width / 2
      const bushCount = Math.floor(width / 300)
      for (let i = 0; i < bushCount; i++) {
        const bx = x - width / 2 + 100 + Math.random() * (width - 200)
        this.createBush(bx, -298)
      }
    }

    // Background hills on ground sections only
    for (const section of layout.groundSections) {
      const width = section.end - section.start
      const hillCount = Math.floor(width / 400)
      for (let i = 0; i < hillCount; i++) {
        const hx = section.start + 100 + Math.random() * (width - 200)
        const hw = 200 + Math.random() * 200
        const hh = 80 + Math.random() * 60
        const hillGeo = new THREE.CircleGeometry(hw / 2, 32, 0, Math.PI)
        const hillMat = new THREE.MeshBasicMaterial({
          color: 0x3D7A1E, transparent: true, opacity: 0.4,
        })
        const hill = new THREE.Mesh(hillGeo, hillMat)
        hill.position.set(hx, -310 + hh / 4, -50)
        hill.scale.y = hh / (hw / 2)
        this.scene.add(hill)
        this.decorations.push(hill)
      }
    }

    // Clouds
    const cloudSpacing = layout.levelWidth / 9
    for (let i = 0; i < 9; i++) {
      const cx = 100 + i * cloudSpacing + Math.random() * 100
      const cy = 200 + Math.random() * 200
      this.createCloud(cx, cy)
    }
  }

  private createDesertDecorations(layout: LevelLayout): void {
    // Cacti on ground sections
    for (const section of layout.groundSections) {
      const width = section.end - section.start
      const cactusCount = Math.floor(width / 400)
      for (let i = 0; i < cactusCount; i++) {
        const cx = section.start + 100 + Math.random() * (width - 200)
        this.createCactus(cx, -298)
      }
    }

    // Sand dunes in background
    const duneSpacing = layout.levelWidth / 6
    for (let i = 0; i < 6; i++) {
      const dx = 200 + i * duneSpacing + Math.random() * 150
      const dw = 250 + Math.random() * 200
      const dh = 60 + Math.random() * 40
      const duneGeo = new THREE.CircleGeometry(dw / 2, 32, 0, Math.PI)
      const duneMat = new THREE.MeshBasicMaterial({
        color: 0xDEB887, transparent: true, opacity: 0.4,
      })
      const dune = new THREE.Mesh(duneGeo, duneMat)
      dune.position.set(dx, -310 + dh / 4, -50)
      dune.scale.y = dh / (dw / 2)
      this.scene.add(dune)
      this.decorations.push(dune)
    }

    // Big sun in sky
    const sunGeo = new THREE.CircleGeometry(80, 32)
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xFFDD44, transparent: true, opacity: 0.8,
    })
    const sun = new THREE.Mesh(sunGeo, sunMat)
    sun.position.set(layout.levelWidth * 0.7, 350, -70)
    this.scene.add(sun)
    this.backgroundObjects.push(sun)

    // Sun glow
    const glowGeo = new THREE.CircleGeometry(120, 32)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xFFEE88, transparent: true, opacity: 0.2,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.set(layout.levelWidth * 0.7, 350, -71)
    this.scene.add(glow)
    this.backgroundObjects.push(glow)
  }

  private createCountrysideDecorations(layout: LevelLayout): void {
    // Trees on ground sections
    for (const section of layout.groundSections) {
      const width = section.end - section.start
      const treeCount = Math.floor(width / 350)
      for (let i = 0; i < treeCount; i++) {
        const tx = section.start + 80 + Math.random() * (width - 160)
        this.createTreeDecoration(tx, -298)
      }
    }

    // Barns anchored to ground sections (avoid floating over gaps)
    const wideSections = layout.groundSections.filter(s => (s.end - s.start) > 300)
    const barnIdxA = Math.floor(wideSections.length * 0.3)
    const barnIdxB = Math.floor(wideSections.length * 0.7)
    for (const idx of [barnIdxA, barnIdxB]) {
      const sec = wideSections[idx]
      if (!sec) continue
      const bx = sec.start + 80 + Math.random() * Math.max(0, sec.end - sec.start - 200)
      this.createBarn(bx, -298)
    }

    // Fences between ground sections
    for (const section of layout.groundSections) {
      const width = section.end - section.start
      if (width > 500) {
        const fx = section.start + 50
        this.createFence(fx, -298, Math.min(width - 100, 400))
      }
    }

    // Clouds
    const cloudSpacing = layout.levelWidth / 8
    for (let i = 0; i < 8; i++) {
      const cx = 150 + i * cloudSpacing + Math.random() * 100
      const cy = 250 + Math.random() * 150
      this.createCloud(cx, cy)
    }
  }

  private createCityDecorations(layout: LevelLayout): void {
    // Buildings anchored to ground sections (avoid floating over gaps)
    for (const section of layout.groundSections) {
      const width = section.end - section.start
      const count = Math.max(1, Math.floor(width / 480))
      for (let i = 0; i < count; i++) {
        const bx = section.start + 50 + (i / count) * (width - 100) + Math.random() * 50
        const bh = 150 + Math.random() * 250
        const bw = 80 + Math.random() * 60
        this.createBuilding(bx, bw, bh)
      }
    }

    // Street lamps on ground sections
    for (const section of layout.groundSections) {
      const width = section.end - section.start
      const lampCount = Math.floor(width / 300)
      for (let i = 0; i < lampCount; i++) {
        const lx = section.start + 100 + Math.random() * (width - 200)
        this.createStreetLamp(lx, -298)
      }
    }

    // Stars in sky
    for (let i = 0; i < 60; i++) {
      const sx = Math.random() * layout.levelWidth
      const sy = 50 + Math.random() * 400
      const size = 1 + Math.random() * 3
      const starGeo = new THREE.PlaneGeometry(size, size)
      const starMat = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF, transparent: true, opacity: 0.4 + Math.random() * 0.5,
      })
      const star = new THREE.Mesh(starGeo, starMat)
      star.position.set(sx, sy, -65)
      this.scene.add(star)
      this.backgroundObjects.push(star)
    }
  }

  private createMoonDecorations(layout: LevelLayout): void {
    // Craters on ground sections
    for (const section of layout.groundSections) {
      const width = section.end - section.start
      const craterCount = Math.floor(width / 250)
      for (let i = 0; i < craterCount; i++) {
        const cx = section.start + 80 + Math.random() * (width - 160)
        this.createCrater(cx, -308)
      }
    }

    // Moon rocks scattered
    for (const section of layout.groundSections) {
      const width = section.end - section.start
      const rockCount = Math.floor(width / 400)
      for (let i = 0; i < rockCount; i++) {
        const rx = section.start + 60 + Math.random() * (width - 120)
        this.createMoonRock(rx, -295)
      }
    }

    // Star field (lots of stars)
    for (let i = 0; i < 100; i++) {
      const sx = Math.random() * layout.levelWidth
      const sy = 50 + Math.random() * 450
      const size = 1 + Math.random() * 2
      const starGeo = new THREE.PlaneGeometry(size, size)
      const starMat = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF, transparent: true, opacity: 0.3 + Math.random() * 0.6,
      })
      const star = new THREE.Mesh(starGeo, starMat)
      star.position.set(sx, sy, -65)
      this.scene.add(star)
      this.backgroundObjects.push(star)
    }

    // Earth in sky
    this.createEarth(layout.levelWidth * 0.6, 350)
  }

  private createFortressDecorations(layout: LevelLayout): void {
    // Lava glow effect at bottom of screen (simulated with large red circles)
    for (let i = 0; i < 8; i++) {
      const lx = (i * layout.levelWidth / 8) + Math.random() * 200
      const lavaGeo = new THREE.CircleGeometry(80 + Math.random() * 60, 16)
      const lavaMat = new THREE.MeshBasicMaterial({
        color: 0xFF2200, transparent: true, opacity: 0.15,
      })
      const lava = new THREE.Mesh(lavaGeo, lavaMat)
      lava.position.set(lx, -400, -80)
      this.scene.add(lava)
      this.backgroundObjects.push(lava)
    }

    // Dark spiky rocks on ground
    for (const section of layout.groundSections) {
      const width = section.end - section.start
      const rockCount = Math.floor(width / 350)
      for (let i = 0; i < rockCount; i++) {
        const rx = section.start + 100 + Math.random() * (width - 200)
        this.createDarkRock(rx, -305)
      }
    }

    // Chains hanging from ceiling
    for (let i = 0; i < 15; i++) {
      const cx = 300 + i * (layout.levelWidth / 15) + Math.random() * 100
      const chainLength = 60 + Math.random() * 100
      this.createChain(cx, 150, chainLength)
    }

    // Torch flames along the path
    for (const section of layout.groundSections) {
      const width = section.end - section.start
      if (width > 400) {
        const torchCount = Math.floor(width / 400)
        for (let i = 0; i < torchCount; i++) {
          const tx = section.start + 150 + i * 400 + Math.random() * 50
          this.createTorch(tx, -300)
        }
      }
    }

    // Boss arena specific decorations
    if (layout.hasBoss) {
      // Large archway at boss arena entrance
      this.createBossArchway(4100, -310)
    }
  }

  // ─── Decoration Primitives ──────────────────────────────────────────

  private createBush(x: number, y: number): void {
    const group = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color: 0x3D8C2E })
    const sizes = [14, 20, 14]
    const offsets = [-12, 0, 12]
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.CircleGeometry(sizes[i], 12, 0, Math.PI)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(offsets[i], i === 1 ? 4 : 0, 0)
      group.add(mesh)
    }
    group.position.set(x, y, -9)
    this.scene.add(group)
    this.decorations.push(group)
  }

  private createCloud(x: number, y: number): void {
    const tex = Math.random() < 0.5 ? this.cloudTexture1 : this.cloudTexture2
    const geo = new THREE.PlaneGeometry(96, 48)
    const mat = tex
      ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.05 })
      : new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, -60)
    this.scene.add(mesh)
    this.decorations.push(mesh)
    // Store for animation
    const speed = 0.2 + Math.random() * 0.3  // Slow drift speed
    this.animatedClouds.push({ mesh, speed, baseY: y })
  }

  private updateClouds(): void {
    for (const cloud of this.animatedClouds) {
      cloud.mesh.position.x += cloud.speed
      // Loop clouds when they go off screen
      if (cloud.mesh.position.x > this.currentLayout.levelWidth + 100) {
        cloud.mesh.position.x = -100
      }
    }
  }

  private createCactus(x: number, y: number): void {
    const group = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color: 0x2D8B2D })

    // Main trunk
    const trunkGeo = new THREE.PlaneGeometry(12, 50)
    const trunk = new THREE.Mesh(trunkGeo, mat)
    trunk.position.set(0, 25, 0)
    group.add(trunk)

    // Left arm
    const leftArmGeo = new THREE.PlaneGeometry(18, 8)
    const leftArm = new THREE.Mesh(leftArmGeo, mat)
    leftArm.position.set(-9, 30, 0)
    group.add(leftArm)
    const leftUpGeo = new THREE.PlaneGeometry(8, 20)
    const leftUp = new THREE.Mesh(leftUpGeo, mat)
    leftUp.position.set(-15, 40, 0)
    group.add(leftUp)

    // Right arm (higher)
    const rightArmGeo = new THREE.PlaneGeometry(16, 8)
    const rightArm = new THREE.Mesh(rightArmGeo, mat)
    rightArm.position.set(8, 20, 0)
    group.add(rightArm)
    const rightUpGeo = new THREE.PlaneGeometry(8, 15)
    const rightUp = new THREE.Mesh(rightUpGeo, mat)
    rightUp.position.set(13, 30, 0)
    group.add(rightUp)

    group.position.set(x, y, -9)
    this.scene.add(group)
    this.decorations.push(group)
  }

  private createTreeDecoration(x: number, y: number): void {
    const group = new THREE.Group()

    // Trunk
    const trunkGeo = new THREE.PlaneGeometry(14, 40)
    const trunkMat = new THREE.MeshBasicMaterial({ color: 0x6B4226 })
    const trunk = new THREE.Mesh(trunkGeo, trunkMat)
    trunk.position.set(0, 20, 0)
    group.add(trunk)

    // Canopy (circle)
    const canopyGeo = new THREE.CircleGeometry(30, 16)
    const canopyMat = new THREE.MeshBasicMaterial({ color: 0x228B22 })
    const canopy = new THREE.Mesh(canopyGeo, canopyMat)
    canopy.position.set(0, 50, 1)
    group.add(canopy)

    // Second smaller canopy for volume
    const canopy2Geo = new THREE.CircleGeometry(20, 16)
    const canopy2 = new THREE.Mesh(canopy2Geo, canopyMat)
    canopy2.position.set(10, 55, 2)
    group.add(canopy2)

    group.position.set(x, y, -9)
    this.scene.add(group)
    this.decorations.push(group)
  }

  private createBarn(x: number, y: number): void {
    const group = new THREE.Group()

    // Barn body
    const bodyGeo = new THREE.PlaneGeometry(80, 60)
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x8B2500 })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.set(0, 30, 0)
    group.add(body)

    // Roof (triangle)
    const roofShape = new THREE.Shape()
    roofShape.moveTo(-48, 0)
    roofShape.lineTo(0, 35)
    roofShape.lineTo(48, 0)
    roofShape.closePath()
    const roofGeo = new THREE.ShapeGeometry(roofShape)
    const roofMat = new THREE.MeshBasicMaterial({ color: 0x5C1700, side: THREE.DoubleSide })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.set(0, 60, 1)
    group.add(roof)

    // Door
    const doorGeo = new THREE.PlaneGeometry(20, 30)
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x4A1800 })
    const door = new THREE.Mesh(doorGeo, doorMat)
    door.position.set(0, 15, 1)
    group.add(door)

    group.position.set(x, y, -45)
    this.scene.add(group)
    this.backgroundObjects.push(group)
  }

  private createFence(x: number, y: number, width: number): void {
    const group = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color: 0x8B7355 })

    // Horizontal bar
    const barGeo = new THREE.PlaneGeometry(width, 4)
    const bar = new THREE.Mesh(barGeo, mat)
    bar.position.set(width / 2, 15, 0)
    group.add(bar)

    const bar2 = new THREE.Mesh(barGeo.clone(), mat)
    bar2.position.set(width / 2, 25, 0)
    group.add(bar2)

    // Posts
    const postCount = Math.floor(width / 40) + 1
    for (let i = 0; i < postCount; i++) {
      const postGeo = new THREE.PlaneGeometry(4, 35)
      const post = new THREE.Mesh(postGeo, mat)
      post.position.set(i * 40, 17, 1)
      group.add(post)
    }

    group.position.set(x, y, -9)
    this.scene.add(group)
    this.decorations.push(group)
  }

  private createBuilding(x: number, width: number, height: number): void {
    const group = new THREE.Group()

    // Building body
    const bodyGeo = new THREE.PlaneGeometry(width, height)
    const bodyColor = 0x1A1A3A + Math.floor(Math.random() * 0x101020)
    const bodyMat = new THREE.MeshBasicMaterial({ color: bodyColor })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.set(0, height / 2 - 310, 0)
    group.add(body)

    // Windows (lit yellow dots via canvas texture)
    const winCanvas = document.createElement('canvas')
    const cols = Math.floor(width / 20)
    const rows = Math.floor(height / 30)
    winCanvas.width = cols * 10
    winCanvas.height = rows * 10
    const wctx = winCanvas.getContext('2d')!
    wctx.fillStyle = '#1A1A3A'
    wctx.fillRect(0, 0, winCanvas.width, winCanvas.height)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.3) {
          const brightness = Math.random() > 0.5 ? '#FFDD44' : '#FFE88A'
          wctx.fillStyle = brightness
          wctx.fillRect(c * 10 + 2, r * 10 + 2, 6, 6)
        }
      }
    }
    const winTex = new THREE.CanvasTexture(winCanvas)
    winTex.magFilter = THREE.NearestFilter
    winTex.minFilter = THREE.NearestFilter
    const winGeo = new THREE.PlaneGeometry(width - 8, height - 8)
    const winMat = new THREE.MeshBasicMaterial({ map: winTex })
    const win = new THREE.Mesh(winGeo, winMat)
    win.position.set(0, height / 2 - 310, 1)
    group.add(win)

    group.position.set(x, 0, -55)
    this.scene.add(group)
    this.backgroundObjects.push(group)
  }

  private createStreetLamp(x: number, y: number): void {
    const group = new THREE.Group()

    // Pole
    const poleGeo = new THREE.PlaneGeometry(4, 60)
    const poleMat = new THREE.MeshBasicMaterial({ color: 0x555555 })
    const pole = new THREE.Mesh(poleGeo, poleMat)
    pole.position.set(0, 30, 0)
    group.add(pole)

    // Lamp head
    const lampGeo = new THREE.PlaneGeometry(14, 8)
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x333333 })
    const lamp = new THREE.Mesh(lampGeo, lampMat)
    lamp.position.set(0, 62, 0)
    group.add(lamp)

    // Glow
    const glowGeo = new THREE.CircleGeometry(15, 16)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xFFDD88, transparent: true, opacity: 0.3,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.set(0, 55, -1)
    group.add(glow)

    group.position.set(x, y, -9)
    this.scene.add(group)
    this.decorations.push(group)
  }

  private createCrater(x: number, y: number): void {
    const size = 20 + Math.random() * 30
    const craterGeo = new THREE.CircleGeometry(size, 16)
    const craterMat = new THREE.MeshBasicMaterial({
      color: 0x555555, transparent: true, opacity: 0.5,
    })
    const crater = new THREE.Mesh(craterGeo, craterMat)
    crater.position.set(x, y, -7)
    crater.scale.y = 0.4
    this.scene.add(crater)
    this.decorations.push(crater)
  }

  private createMoonRock(x: number, y: number): void {
    const group = new THREE.Group()

    // Jagged rock shape
    const shape = new THREE.Shape()
    shape.moveTo(-8, 0)
    shape.lineTo(-12, 10)
    shape.lineTo(-5, 18)
    shape.lineTo(3, 22)
    shape.lineTo(10, 16)
    shape.lineTo(14, 8)
    shape.lineTo(8, 0)
    shape.closePath()

    const rockGeo = new THREE.ShapeGeometry(shape)
    const rockMat = new THREE.MeshBasicMaterial({ color: 0x666666, side: THREE.DoubleSide })
    const rock = new THREE.Mesh(rockGeo, rockMat)
    group.add(rock)

    const scale = 0.8 + Math.random() * 0.6
    group.scale.set(scale, scale, 1)
    group.position.set(x, y, -8)
    this.scene.add(group)
    this.decorations.push(group)
  }

  private createEarth(x: number, y: number): void {
    const group = new THREE.Group()

    // Earth circle (blue/green via canvas)
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!

    // Blue ocean
    ctx.fillStyle = '#2266CC'
    ctx.beginPath()
    ctx.arc(32, 32, 30, 0, Math.PI * 2)
    ctx.fill()

    // Green continents (simple blobs)
    ctx.fillStyle = '#33AA44'
    ctx.beginPath()
    ctx.ellipse(24, 22, 10, 12, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(38, 28, 8, 14, 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(28, 42, 12, 6, 0.1, 0, Math.PI * 2)
    ctx.fill()

    // White polar caps
    ctx.fillStyle = '#DDDDEE'
    ctx.beginPath()
    ctx.ellipse(32, 6, 14, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(32, 58, 12, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    const texture = new THREE.CanvasTexture(canvas)
    const earthGeo = new THREE.PlaneGeometry(60, 60)
    const earthMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    group.add(earth)

    // Atmosphere glow
    const glowGeo = new THREE.CircleGeometry(38, 32)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4488FF, transparent: true, opacity: 0.15,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.z = -1
    group.add(glow)

    group.position.set(x, y, -70)
    this.scene.add(group)
    this.backgroundObjects.push(group)
  }

  // ─── Fortress Decoration Primitives ─────────────────────────────────

  private createDarkRock(x: number, y: number): void {
    const group = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color: 0x333333 })

    // Main spike
    const shape = new THREE.Shape()
    shape.moveTo(-10, 0)
    shape.lineTo(-15, 20)
    shape.lineTo(-5, 35)
    shape.lineTo(0, 45)
    shape.lineTo(5, 35)
    shape.lineTo(15, 20)
    shape.lineTo(10, 0)
    shape.closePath()

    const geo = new THREE.ShapeGeometry(shape)
    const mesh = new THREE.Mesh(geo, mat)
    group.add(mesh)

    // Smaller side spike
    const smallShape = new THREE.Shape()
    smallShape.moveTo(-20, 0)
    smallShape.lineTo(-25, 15)
    smallShape.lineTo(-15, 25)
    smallShape.lineTo(-10, 0)
    smallShape.closePath()
    const smallGeo = new THREE.ShapeGeometry(smallShape)
    const smallMesh = new THREE.Mesh(smallGeo, mat)
    group.add(smallMesh)

    group.position.set(x, y, -8)
    this.scene.add(group)
    this.decorations.push(group)
  }

  private createChain(x: number, y: number, length: number): void {
    const group = new THREE.Group()
    const linkCount = Math.floor(length / 15)

    for (let i = 0; i < linkCount; i++) {
      const linkGeo = new THREE.PlaneGeometry(8, 12)
      const linkMat = new THREE.MeshBasicMaterial({ color: 0x444444 })
      const link = new THREE.Mesh(linkGeo, linkMat)
      link.position.set(0, -i * 15, 0)
      group.add(link)
    }

    group.position.set(x, y, -50)
    this.scene.add(group)
    this.decorations.push(group)
  }

  private createTorch(x: number, y: number): void {
    const group = new THREE.Group()

    // Torch stick
    const stickGeo = new THREE.PlaneGeometry(6, 25)
    const stickMat = new THREE.MeshBasicMaterial({ color: 0x4A3728 })
    const stick = new THREE.Mesh(stickGeo, stickMat)
    stick.position.set(0, 12, 0)
    group.add(stick)

    // Flame
    const flameGeo = new THREE.CircleGeometry(10, 8)
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xFF6600 })
    const flame = new THREE.Mesh(flameGeo, flameMat)
    flame.position.set(0, 30, 1)
    group.add(flame)

    // Inner flame (yellow)
    const innerFlameGeo = new THREE.CircleGeometry(6, 8)
    const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xFFCC00 })
    const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat)
    innerFlame.position.set(0, 32, 2)
    group.add(innerFlame)

    group.position.set(x, y, -8)
    this.scene.add(group)
    this.decorations.push(group)
  }

  private createBossArchway(x: number, y: number): void {
    const group = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color: 0x220022 })

    // Left pillar
    const leftPillarGeo = new THREE.PlaneGeometry(40, 200)
    const leftPillar = new THREE.Mesh(leftPillarGeo, mat)
    leftPillar.position.set(-60, 100, 0)
    group.add(leftPillar)

    // Right pillar
    const rightPillarGeo = new THREE.PlaneGeometry(40, 200)
    const rightPillar = new THREE.Mesh(rightPillarGeo, mat)
    rightPillar.position.set(60, 100, 0)
    group.add(rightPillar)

    // Arch top
    const archGeo = new THREE.PlaneGeometry(160, 40)
    const arch = new THREE.Mesh(archGeo, mat)
    arch.position.set(0, 200, 0)
    group.add(arch)

    // Arch detail (red glowing center)
    const glowGeo = new THREE.CircleGeometry(25, 16)
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xFF0000, transparent: true, opacity: 0.6 })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.set(0, 200, 1)
    group.add(glow)

    // Skull symbol on arch
    const skullGeo = new THREE.CircleGeometry(15, 8)
    const skullMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
    const skull = new THREE.Mesh(skullGeo, skullMat)
    skull.position.set(0, 200, 2)
    group.add(skull)

    group.position.set(x, y, -45)
    this.scene.add(group)
    this.decorations.push(group)
  }

  // ─── Falling Hazard System ──────────────────────────────────────────

  private createFallingHazard(x: number, y: number): void {
    // Use fall-rock.png texture, fallback to spike shape
    const geo = new THREE.PlaneGeometry(40, 50)
    const mat = this.fallingRockTexture
      ? new THREE.MeshBasicMaterial({ map: this.fallingRockTexture, transparent: true, alphaTest: 0.1 })
      : new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geo, mat)

    mesh.position.set(x, y, 0)
    this.scene.add(mesh)

    this.fallingHazards.push({
      mesh,
      x,
      y,
      baseY: y,
      velocityY: 0,
      state: 'waiting',
      waitTimer: Math.random() * 120,
    })
  }

  // ─── Foot Dust System ───────────────────────────────────────────────

  private createFootDust(): void {
    if (!this.bulk || !this.footdustTexture) return

    // Create dust particle at player's feet - larger and more visible
    const geo = new THREE.PlaneGeometry(20, 20)
    const mat = new THREE.MeshBasicMaterial({
      map: this.footdustTexture,
      transparent: true,
      opacity: 1.0,
      alphaTest: 0.05,
    })
    const mesh = new THREE.Mesh(geo, mat)

    // Position at player's feet, offset opposite to movement direction
    const offsetX = this.facingRight ? -18 : 18
    mesh.position.set(
      this.bulk.position.x + offsetX,
      this.bulk.position.y - 25,
      this.bulk.position.z - 1
    )

    this.scene.add(mesh)
    this.dustParticles.push({ mesh, life: 30 })
  }

  private createBossDust(x: number, y: number): void {
    if (!this.footdustTexture) return

    const geo = new THREE.PlaneGeometry(15, 15)
    const mat = new THREE.MeshBasicMaterial({
      map: this.footdustTexture,
      transparent: true,
      opacity: 0.7,
      alphaTest: 0.05,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, -1)
    this.scene.add(mesh)
    this.dustParticles.push({ mesh, life: 20 })
  }

  private updateDustParticles(): void {
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const dust = this.dustParticles[i]
      dust.life--

      // Fade out
      const mat = dust.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = (dust.life / 20) * 0.8

      // Float upward slightly
      dust.mesh.position.y += 0.3

      if (dust.life <= 0) {
        this.scene.remove(dust.mesh)
        if (dust.mesh.geometry) dust.mesh.geometry.dispose()
        if (dust.mesh.material) (dust.mesh.material as THREE.Material).dispose()
        this.dustParticles.splice(i, 1)
      }
    }
  }

  // ─── Boss System ────────────────────────────────────────────────────

  private createBoss(x: number, y: number): void {
    const group = new THREE.Group()

    // Boss body — use dark-pixelbulk.png, 30% larger
    const bodyGeo = new THREE.PlaneGeometry(91, 78)
    const bodyMat = this.bossIdleTexture
      ? new THREE.MeshBasicMaterial({ map: this.bossIdleTexture, transparent: true, alphaTest: 0.1 })
      : new THREE.MeshBasicMaterial({ color: 0x4A0080 })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.name = 'body'
    group.add(body)

    // Boss faces right by default (dark-pixelbulk.png faces right)

    // Health bar background
    const healthBgGeo = new THREE.PlaneGeometry(80, 10)
    const healthBgMat = new THREE.MeshBasicMaterial({ color: 0x330000 })
    const healthBg = new THREE.Mesh(healthBgGeo, healthBgMat)
    healthBg.position.set(0, 50, 0)
    healthBg.name = 'healthBg'
    group.add(healthBg)

    // Health bar fill
    const healthFillGeo = new THREE.PlaneGeometry(76, 6)
    const healthFillMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 })
    const healthFill = new THREE.Mesh(healthFillGeo, healthFillMat)
    healthFill.position.set(0, 50, 1)
    healthFill.name = 'healthFill'
    group.add(healthFill)

    group.position.set(x, y, 0)
    this.scene.add(group)

    this.enemies.push({
      mesh: group,
      x, y,
      width: 60,
      height: 50,
      velocityX: -1,
      velocityY: 0,
      alive: true,
      type: 'boss',
      squishTimer: 0,
      health: 6,
      maxHealth: 6,
      jumpTimer: 0,
      shootTimer: 90,
      phase: 1,
      invulnerable: false,
      invulnerableTimer: 0,
    })

    this.bossDefeated = false
  }

  private updateBoss(boss: Enemy): void {
    if (!boss.alive || boss.type !== 'boss') return

    // Update invulnerability
    if (boss.invulnerable) {
      boss.invulnerableTimer!--
      boss.mesh.visible = Math.floor(boss.invulnerableTimer! / 5) % 2 === 0
      if (boss.invulnerableTimer! <= 0) {
        boss.invulnerable = false
        boss.mesh.visible = true
      }
    }

    // Boss movement (patrol between 4200 and 5200)
    boss.x += boss.velocityX!
    if (boss.x < 4300 || boss.x > 5200) {
      boss.velocityX! *= -1
    }
    boss.mesh.position.x = boss.x

    // Boss foot dust when moving on ground
    if (boss.y <= -265 && this.footdustTexture && Math.abs(boss.velocityX!) > 0.1) {
      if (Math.random() < 0.15) {
        this.createBossDust(boss.x, boss.y - 30)
      }
    }

    // Boss jumping (15% higher)
    boss.jumpTimer!--
    if (boss.jumpTimer! <= 0) {
      boss.velocityY = 12  // 15% decrease from 14
      boss.jumpTimer! = 90 + Math.random() * 60
    }

    // Apply gravity to boss
    boss.velocityY! += this.currentTheme.gravity ?? this.GRAVITY
    boss.y += boss.velocityY!

    // Boss floor collision - match ground level
    if (boss.y < -270) {
      boss.y = -270
      boss.velocityY = 0
    }

    // Boss platform collision - stand on platforms
    for (const plat of this.platforms) {
      const platTop = plat.y + plat.height / 2
      const platLeft = plat.x - plat.width / 2
      const platRight = plat.x + plat.width / 2
      
      // Check if boss is falling onto platform from above
      if (boss.velocityY! <= 0 &&
          boss.y - 30 <= platTop && boss.y - 30 >= platTop - 20 &&
          boss.x >= platLeft && boss.x <= platRight) {
        boss.y = platTop + 30
        boss.velocityY = 0
        break
      }
    }

    boss.mesh.position.y = boss.y

    // Boss shooting
    boss.shootTimer!--
    if (boss.shootTimer! <= 0 && !boss.invulnerable) {
      // Face projectile toward player: if player is left, shoot left; if player is right, shoot right
      const projectileDir = this.bulk && this.bulk.position.x < boss.x ? -1 : 1
      // Pass boss phase for speed/range calculations
      this.createBossProjectile(boss.x, boss.y, projectileDir, boss.phase)
      // Faster shooting in corrupted phase
      boss.shootTimer! = boss.phase === 2 ? 80 : 120
    }

    // Corrupted phase at half health (3 HP) - 25% bigger
    if (boss.health! <= 3 && boss.phase === 1) {
      boss.phase = 2
      boss.mesh.scale.set(1.25, 1.25, 1)
      boss.velocityX = boss.velocityX! > 0 ? -1.5 : 1.5  // Slightly faster in corrupted phase
    }

    this.updateBossSprite(boss)
  }

  private updateBossSprite(boss: Enemy): void {
    const body = boss.mesh.getObjectByName('body') as THREE.Mesh | undefined
    if (!body) return
    const mat = body.material as THREE.MeshBasicMaterial

    // Priority: damage flash > jump > run > punch (about to shoot) > corrupted (phase2+) > idle
    let tex: THREE.Texture | null = null
    if (boss.invulnerable && this.bossDamageTexture) {
      tex = this.bossDamageTexture
    } else if ((boss.shootTimer ?? 80) < 20 && this.bossPunchTexture) {
      // Show punch animation only briefly when about to shoot (check BEFORE run)
      tex = this.bossPunchTexture
    } else if ((boss.velocityY ?? 0) > 5 && this.bossJumpTexture) {
      // Only show jump when actually going up fast
      tex = this.bossJumpTexture
    } else if (Math.abs(boss.velocityX ?? 0) > 0.1 && this.bossRunTexture) {
      // Show run when moving horizontally
      tex = this.bossRunTexture
    } else if (boss.phase === 2 && this.bossCorruptedTexture) {
      tex = this.bossCorruptedTexture
    } else if (this.bossIdleTexture) {
      tex = this.bossIdleTexture
    }

    if (tex && mat.map !== tex) {
      mat.map = tex
      mat.needsUpdate = true
    }

    // Flip to face player
    if (this.bulk) {
      body.scale.x = this.bulk.position.x < boss.x ? -1 : 1
    }
  }

  private createBossProjectile(x: number, y: number, direction: number, phase: number = 1): void {
    // Use dark-orb.png texture, same width as player orb
    const geo = new THREE.PlaneGeometry(107, 30)
    const mat = this.darkOrbTexture
      ? new THREE.MeshBasicMaterial({ map: this.darkOrbTexture, transparent: true, alphaTest: 0.1 })
      : new THREE.MeshBasicMaterial({ color: 0x8B00FF })
    const mesh = new THREE.Mesh(geo, mat)
    // Flip projectile based on direction (-1 = left, 1 = right) - invert for dark-orb.png
    mesh.scale.x = -direction
    mesh.position.set(x, y, 0)
    this.scene.add(mesh)

    // Speed: player orb is 8, phase 1 is 10% slower (7.2), phase 2 is same as player (8)
    const speed = phase === 2 ? 8 : 7.2
    // Range: player orb is 180, phase 1 is +10% (198), phase 2 is +20% (216)
    const maxRange = phase === 2 ? 324 : 297
    const vx = direction * speed

    this.bossProjectiles.push({
      mesh,
      x, y,
      velocityX: vx,
      velocityY: 0,
      distanceTraveled: 0,
      maxDistance: maxRange,
    })

    this.audio.synthTone(200, 0.1, 'sawtooth', 0.2)
  }

  private updateBossProjectiles(): void {
    for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
      const p = this.bossProjectiles[i]
      p.x += p.velocityX
      p.y += p.velocityY
      p.distanceTraveled += Math.abs(p.velocityX)
      p.mesh.position.x = p.x
      p.mesh.position.y = p.y

      // Check collision with player
      if (this.bulk) {
        const dx = Math.abs(this.bulk.position.x - p.x)
        const dy = Math.abs(this.bulk.position.y - p.y)
        if (dx < 30 && dy < 30) {
          this.takeDamage()
          return
        }
      }

      // Remove if exceeded max range or off screen
      if (p.distanceTraveled > p.maxDistance || p.x < 4000 || p.x > 5600 || p.y < -400 || p.y > 300) {
        this.scene.remove(p.mesh)
        p.mesh.geometry.dispose()
        ;(p.mesh.material as THREE.MeshBasicMaterial).dispose()
        this.bossProjectiles.splice(i, 1)
      }
    }
  }

  private updateBossHealthBar(boss: Enemy): void {
    const healthFill = boss.mesh.getObjectByName('healthFill') as THREE.Mesh
    if (healthFill) {
      const pct = (boss.health! / boss.maxHealth!)
      healthFill.scale.x = pct
      // Color change based on health
      const mat = healthFill.material as THREE.MeshBasicMaterial
      if (pct > 0.66) mat.color.setHex(0xFF0000)
      else if (pct > 0.33) mat.color.setHex(0xFF8800)
      else mat.color.setHex(0xFFFF00)
    }
  }

  // ─── Enemy System ─────────────────────────────────────────────────

  private spawnLevelEnemies(layout: LevelLayout, theme: LevelTheme): void {
    const speed = 1.5 * theme.enemySpeed
    for (const ex of layout.groundEnemies) {
      this.createGoomba(ex, -260, speed)
    }
    for (const pe of layout.platformEnemies) {
      this.createGoomba(pe.x, pe.y, speed)
    }
    // Spawn aerial enemies (flying)
    if (layout.aerialEnemies) {
      for (const ae of layout.aerialEnemies) {
        this.createParagoomba(ae.x, ae.y, speed, ae.range || 100)
      }
    }
  }

  private createGoomba(x: number, y: number, speed = 1.5): void {
    const group = new THREE.Group()

    // Use crab.png texture for ground enemy
    const bodyGeo = new THREE.PlaneGeometry(59, 53)
    const tex = this.crabTexture
    let bodyMat: THREE.MeshBasicMaterial

    if (tex) {
      bodyMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1 })
    } else {
      // Fallback to canvas if crab.png not loaded
      const bodyCanvas = document.createElement('canvas')
      bodyCanvas.width = 36
      bodyCanvas.height = 32
      const ctx = bodyCanvas.getContext('2d')!
      ctx.fillStyle = '#8B4513'
      ctx.fillRect(0, 8, 36, 24)
      ctx.fillStyle = '#6B3410'
      ctx.beginPath()
      ctx.ellipse(18, 10, 18, 12, 0, Math.PI, 0)
      ctx.fill()
      ctx.fillStyle = '#FFF'
      ctx.fillRect(8, 12, 6, 6)
      ctx.fillRect(22, 12, 6, 6)
      ctx.fillStyle = '#000'
      ctx.fillRect(10, 14, 3, 3)
      ctx.fillRect(24, 14, 3, 3)
      ctx.fillStyle = '#000'
      ctx.fillRect(4, 28, 10, 4)
      ctx.fillRect(22, 28, 10, 4)

      const bodyTexture = new THREE.CanvasTexture(bodyCanvas)
      bodyTexture.magFilter = THREE.NearestFilter
      bodyTexture.minFilter = THREE.NearestFilter
      bodyMat = new THREE.MeshBasicMaterial({
        map: bodyTexture, transparent: true,
      })
    }

    const body = new THREE.Mesh(bodyGeo, bodyMat)
    group.add(body)

    group.position.set(x, y, 0)
    this.scene.add(group)

    this.enemies.push({
      mesh: group,
      x, y,
      width: 30,
      height: 28,
      velocityX: -speed,
      velocityY: 0,
      alive: true,
      type: 'goomba',
      squishTimer: 0,
    })
  }

  private switchEnemyToDamageTexture(enemy: Enemy): void {
    // Switch enemy texture to damage version when killed
    if (enemy.type === 'paragoomba' && this.batDamageTexture) {
      const mesh = enemy.mesh.children[0] as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.map = this.batDamageTexture
      mat.needsUpdate = true
    } else if (enemy.type === 'goomba' && this.crabDamageTexture) {
      const mesh = enemy.mesh.children[0] as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.map = this.crabDamageTexture
      mat.needsUpdate = true
    }
  }

  private createParagoomba(x: number, y: number, speed = 1.5, range = 100): void {
    const group = new THREE.Group()

    // Use bat.png texture for flying enemy
    const bodyGeo = new THREE.PlaneGeometry(60, 48)
    const tex = this.batTexture
    let bodyMat: THREE.MeshBasicMaterial
    
    if (tex) {
      bodyMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1 })
    } else {
      // Fallback to canvas if bat.png not loaded
      const bodyCanvas = document.createElement('canvas')
      bodyCanvas.width = 32
      bodyCanvas.height = 28
      const ctx = bodyCanvas.getContext('2d')!
      ctx.fillStyle = '#4444CC'
      ctx.fillRect(0, 0, 32, 28)
      const bodyTexture = new THREE.CanvasTexture(bodyCanvas)
      bodyTexture.magFilter = THREE.NearestFilter
      bodyMat = new THREE.MeshBasicMaterial({ map: bodyTexture, transparent: true })
    }
    
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    group.add(body)

    group.position.set(x, y, 0)
    this.scene.add(group)

    this.enemies.push({
      mesh: group,
      x, y,
      width: 28,
      height: 24,
      velocityX: -speed * 0.8, // Slightly slower
      velocityY: 0,
      alive: true,
      type: 'paragoomba',
      squishTimer: 0,
      baseY: y,
      flyTimer: 0,
      swoopRange: range,
    })
  }

  // ─── Coin System ──────────────────────────────────────────────────

  private spawnCoin(x: number, y: number): void {
    const tex = this.platformTextures.get('coin')
    const geo = new THREE.PlaneGeometry(24, 24)
    const mat = tex
      ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1 })
      : new THREE.MeshBasicMaterial({ color: 0xFFD700 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, 2)
    this.scene.add(mesh)

    this.coins.push({
      mesh, x, y,
      velocityY: 8,
      collectTimer: 0,
      collected: false,
    })
  }

  private spawnSchmeg(x: number, y: number): void {
    const tex = this.platformTextures.get('schmeg')
    const geo = new THREE.PlaneGeometry(28, 32)
    const mat = tex
      ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1 })
      : new THREE.MeshBasicMaterial({ color: 0x9932CC })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, 2)
    this.scene.add(mesh)

    this.powerUps.push({
      mesh, x, y,
      velocityY: 6,
      type: 'schmeg',
      collected: false,
    })
  }

  // ─── Touch Controls ──────────────────────────────────────────────

  private createTouchControls(): void {
    // Transparent overlay with joystick and action buttons
    const overlay = document.createElement('div')
    overlay.id = 'mobile-touch-controls'
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 100;
      display: none;
      touch-action: none;
      pointer-events: none;
    `
    this.container.appendChild(overlay)

    // Create joystick (bottom left)
    const joystickContainer = document.createElement('div')
    joystickContainer.style.cssText = `
      position: absolute;
      left: 20px;
      bottom: 60px;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: rgba(155, 77, 202, 0.2);
      border: 3px solid rgba(255,255,255,0.3);
      pointer-events: auto;
      touch-action: none;
    `

    const joystickStick = document.createElement('div')
    joystickStick.style.cssText = `
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(155, 77, 202, 0.6);
      border: 2px solid rgba(255,255,255,0.5);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `
    joystickContainer.appendChild(joystickStick)
    overlay.appendChild(joystickContainer)

    this.touchJoystick = {
      container: joystickContainer,
      stick: joystickStick,
      active: false,
      centerX: 0,
      centerY: 0,
      touchId: null
    }

    // Helper to create action button
    const createBtn = (right: string, bottom: string, emoji: string, color: string) => {
      const btn = document.createElement('button')
      btn.style.cssText = `
        position: absolute;
        right: ${right};
        bottom: ${bottom};
        width: 60px;
        height: 60px;
        background: transparent;
        border: 2px solid ${color};
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        touch-action: none;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        opacity: 0.6;
        transition: opacity 0.1s, transform 0.1s;
      `
      btn.innerHTML = emoji
      return btn
    }

    // Shoot (orb) - right side, upper
    const shootBtn = createBtn('16px', '140px', '&#9673;', 'rgba(100,150,255,0.6)')
    overlay.appendChild(shootBtn)
    this.touchShootBtn = shootBtn as unknown as HTMLButtonElement

    // Jump (up arrow) - right side, lower
    const jumpBtn = createBtn('16px', '60px', '&#11014;', 'rgba(255,215,0,0.6)')
    overlay.appendChild(jumpBtn)
    this.touchJumpBtn = jumpBtn as unknown as HTMLButtonElement

    // Joystick handlers
    const joystick = this.touchJoystick

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
          this.touchMovingLeft = false
          this.touchMovingRight = false
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
      
      // Set movement based on horizontal position
      const normalizedX = dx / maxDist
      this.touchMovingLeft = normalizedX < -0.3
      this.touchMovingRight = normalizedX > 0.3
    }

    joystick.container.addEventListener('touchstart', handleJoystickStart, { passive: false })
    window.addEventListener('touchmove', handleJoystickMove, { passive: false })
    window.addEventListener('touchend', handleJoystickEnd, { passive: false })
    window.addEventListener('touchcancel', handleJoystickEnd, { passive: false })

    // Action button handlers
    const addPress = (btn: HTMLElement, onStart: () => void, onEnd: () => void) => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault()
        btn.style.opacity = '1'
        btn.style.transform = 'scale(0.9)'
        onStart()
      }, { passive: false })
      const end = (e: TouchEvent) => {
        e.preventDefault()
        btn.style.opacity = '0.6'
        btn.style.transform = 'scale(1)'
        onEnd()
      }
      btn.addEventListener('touchend', end, { passive: false })
      btn.addEventListener('touchcancel', end, { passive: false })
    }

    addPress(shootBtn, () => { this.touchShooting = true }, () => { this.touchShooting = false })
    addPress(jumpBtn, () => { this.touchJumping = true }, () => { this.touchJumping = false })
  }

  private showTouchControls(visible: boolean): void {
    const overlay = document.getElementById('mobile-touch-controls')
    if (overlay) overlay.style.display = visible ? 'block' : 'none'
  }

  private removeTouchControls(): void {
    const overlay = document.getElementById('mobile-touch-controls')
    if (overlay) overlay.remove()
    this.touchJoystick = undefined
    this.touchJumpBtn = null
    this.touchShootBtn = null
  }

  // ─── Input Handling ───────────────────────────────────────────────

  private handleInput(): void {
    if (!this.gameStarted || this.gameOver) return

    const left = this.input.isAnyKeyDown('ArrowLeft', 'KeyA') || this.touchMovingLeft
    const right = this.input.isAnyKeyDown('ArrowRight', 'KeyD') || this.touchMovingRight
    const jumpKey = this.input.isAnyKeyDown('Space', 'ArrowUp', 'KeyW') || this.touchJumping
    const shootKey = this.input.isAnyKeyDown('KeyZ', 'KeyX') || this.touchShooting

    // Handle shoot input
    if (shootKey && this.shootCooldownTimer <= 0 && !this.isShooting) {
      this.shootOrb()
    }

    // Movement (disabled during shoot)
    if (!this.isShooting) {
      if (left) {
        this.bulkVelocityX = -this.MOVE_SPEED
        this.facingRight = false
      } else if (right) {
        this.bulkVelocityX = this.MOVE_SPEED
        this.facingRight = true
      }
    }

    // Foot dust particles when running on ground
    if (this.isGrounded && Math.abs(this.bulkVelocityX) > 0.5 && this.footdustTexture) {
      this.dustTimer++
      if (this.dustTimer >= 5) { // Spawn dust more frequently
        this.dustTimer = 0
        this.createFootDust()
      }
    }

    if (jumpKey && !this.wasJumpPressed && !this.isShooting) {
      this.handleJump()
    }
    this.wasJumpPressed = jumpKey
  }

  private shootOrb(): void {
    if (!this.bulk) return
    
    this.isShooting = true
    this.shootTimer = this.SHOOT_DURATION
    this.shootCooldownTimer = this.SHOOT_COOLDOWN + this.SHOOT_DURATION
    this.bulkVelocityX *= 0.5 // Slow down while shooting

    // Play shoot sound
    this.audio.synthTone(800, 0.1, 'sine', 0.3)

    // Create orb projectile
    this.createOrb()
  }

  private createOrb(): void {
    if (!this.bulk) return

    const orbGeo = new THREE.PlaneGeometry(97, 27)
    const tex = this.orbTexture || this.createFallbackTexture(0x00aaff)
    const mat = new THREE.MeshBasicMaterial({ 
      map: tex, 
      transparent: true,
      alphaTest: 0.1
    })
    const mesh = new THREE.Mesh(orbGeo, mat)

    // Spawn in front of player
    // Orb texture has ball on right 1/3, tail on left
    // Offset spawn so the ball (not the tail) appears at the hand position
    const direction = this.facingRight ? 1 : -1
    // When facing right, spawn further left so ball is at hand
    // When facing left, spawn further right so ball is at hand
    const startX = this.bulk.position.x + (direction * 45) - (direction * 10)
    const startY = this.bulk.position.y - 5

    mesh.position.set(startX, startY, 45)
    // Flip texture when facing left so tail trails behind
    mesh.scale.x = direction
    this.scene.add(mesh)

    this.orbs.push({
      mesh,
      x: startX,
      y: startY,
      velocityX: direction * this.ORB_SPEED,
      active: true,
      distanceTraveled: 0
    })
  }

  private updateOrbs(): void {
    // Update shoot state
    if (!this.isShooting) {
      if (this.shootCooldownTimer > 0) {
        this.shootCooldownTimer--
      }
    } else {
      this.shootTimer--
      if (this.shootTimer <= 0) {
        this.isShooting = false
      }
    }

    // Update active orbs
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i]
      if (!orb.active) continue

      // Move orb
      orb.x += orb.velocityX
      orb.distanceTraveled += Math.abs(orb.velocityX)
      orb.mesh.position.x = orb.x

      // Check for enemy hits
      this.checkOrbHit(orb)
      
      // Skip remaining checks if orb was deactivated
      if (!orb.active) continue

      // Check for collision with boss projectiles
      for (let j = this.bossProjectiles.length - 1; j >= 0; j--) {
        const bossProj = this.bossProjectiles[j]
        const dx = Math.abs(orb.x - bossProj.x)
        const dy = Math.abs(orb.y - bossProj.y)
        if (dx < 40 && dy < 20) {
          // Player orb and boss projectile collide - cancel both
          orb.active = false
          this.scene.remove(orb.mesh)
          this.orbs.splice(i, 1)
          this.scene.remove(bossProj.mesh)
          bossProj.mesh.geometry?.dispose()
          ;(bossProj.mesh.material as THREE.Material).dispose()
          this.bossProjectiles.splice(j, 1)
          this.audio.synthTone(150, 0.1, 'square', 0.2)
          break
        }
      }

      // Check if orb exceeded max distance
      if (orb.distanceTraveled >= this.ORB_MAX_DISTANCE) {
        orb.active = false
        this.scene.remove(orb.mesh)
        this.orbs.splice(i, 1)
      }
    }
  }

  private checkOrbHit(orb: Orb): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue

      // Simple AABB collision check
      const dx = Math.abs(enemy.x - orb.x)
      const dy = Math.abs(enemy.y - orb.y)
      const hitDistance = 20 + enemy.width / 2

      if (dx < hitDistance && dy < hitDistance + enemy.height / 2) {
        // Enemy hit!
        orb.active = false
        this.scene.remove(orb.mesh)
        this.orbs = this.orbs.filter(o => o !== orb)

        if (enemy.type === 'boss') {
          // Boss takes 1 damage from orbs (less than stomp)
          enemy.health!--
          enemy.invulnerable = true
          enemy.invulnerableTimer = 30  // Shorter invulnerability for orbs
          this.score += 50
          this.callbacks.onScoreChange?.(this.score)
          this.audio.synthTone(300, 0.1, 'square', 0.3)
        } else {
          // Regular enemy - orb kills them
          enemy.alive = false
          enemy.squishTimer = 20
          this.switchEnemyToDamageTexture(enemy)
          enemy.mesh.scale.set(1.3, 0.3, 1)
          enemy.mesh.position.y -= 10
          this.score += 100
          this.callbacks.onScoreChange?.(this.score)
          this.createComboText(enemy.x, enemy.y)
          this.audio.synthTone(400, 0.15, 'square', 0.4)
        }
        break // Orb hits only one enemy
      }
    }
  }

  private handleJump(): void {
    // Buffer the jump press
    this.jumpBufferFrames = this.JUMP_BUFFER_MAX

    // Can jump if on ground OR in coyote time
    const canJump = this.isGrounded || this.coyoteFrames > 0

    if (canJump && this.jumpBufferFrames > 0) {
      // Start jump - standard height initially
      this.bulkVelocityY = this.JUMP_STRENGTH
      this.isGrounded = false
      this.isJumping = true
      this.jumpHoldTimer = 0
      this.coyoteFrames = 0           // Clear coyote after jumping
      this.jumpBufferFrames = 0       // Clear buffer after executing
      this.audio.synthSweep(400, 600, 0.1, 'sine', 0.3)
    }
  }

  // ─── Physics ──────────────────────────────────────────────────────

  private updatePhysics(): void {
    if (!this.bulk) return

    // Variable jump height - hold for higher jump
    const jumpKey = this.input.isAnyKeyDown('Space', 'ArrowUp', 'KeyW') || this.touchJumping
    if (this.isJumping && jumpKey && this.bulkVelocityY > 0) {
      // Still holding jump and ascending
      this.jumpHoldTimer++
      // Slight upward boost while holding for max height (only 10% more)
      if (this.jumpHoldTimer <= this.JUMP_HOLD_FRAMES) {
        // Minimal boost - just 10% more height
        this.bulkVelocityY += 0.12
      }
    } else {
      // Released jump or descending - end jump boost
      this.isJumping = false
      this.jumpHoldTimer = 0
    }

    // Apply gravity (theme override for moon)
    const gravity = this.currentTheme.gravity ?? this.GRAVITY
    this.bulkVelocityY += gravity
    if (this.bulkVelocityY < this.TERMINAL_VELOCITY) {
      this.bulkVelocityY = this.TERMINAL_VELOCITY
    }

    this.bulk.position.x += this.bulkVelocityX
    this.bulk.position.y += this.bulkVelocityY

    // Friction
    if (this.isGrounded) {
      this.bulkVelocityX *= 0.82
    } else {
      this.bulkVelocityX *= 0.95
    }
    if (Math.abs(this.bulkVelocityX) < 0.1) this.bulkVelocityX = 0

    // Level boundaries
    if (this.bulk.position.x < -100) {
      this.bulk.position.x = -100
      this.bulkVelocityX = 0
    }

    // Update progress for HUD
    if (this.bulk && this.currentLayout.goalX > 0) {
      const firstSectionStart = this.currentLayout.groundSections[0]?.start ?? 0
      const progress = Math.max(0, Math.min(1, (this.bulk.position.x + 100) / (this.currentLayout.goalX - firstSectionStart)))
      this.callbacks.onProgressChange?.({
        x: this.bulk.position.x,
        goalX: this.currentLayout.goalX,
        percent: progress
      })
    }

    // Fall into pit = take damage
    if (this.bulk.position.y < -500) {
      this.takeDamage()
      return
    }

    this.checkPlatformCollisions()

    // Coyote time: if was grounded last frame and now airborne, start counting
    if (this.isGrounded) {
      this.coyoteFrames = this.COYOTE_MAX
    } else {
      this.coyoteFrames = Math.max(0, this.coyoteFrames - 1)
    }

    // Decrement jump buffer
    if (this.jumpBufferFrames > 0) {
      this.jumpBufferFrames--
    }
  }

  private checkPlatformCollisions(): void {
    if (!this.bulk) return

    this.isGrounded = false
    const px = this.bulk.position.x
    const py = this.bulk.position.y
    const pw = this.PLAYER_WIDTH
    const ph = this.PLAYER_HEIGHT

    for (const platform of this.platforms) {
      const platLeft = platform.x - platform.width / 2
      const platRight = platform.x + platform.width / 2
      const platTop = platform.y + platform.height / 2
      const platBottom = platform.y - platform.height / 2

      const playerLeft = px - pw
      const playerRight = px + pw
      const playerTop = py + ph
      const playerBottom = py - ph

      if (playerRight <= platLeft || playerLeft >= platRight ||
          playerTop <= platBottom || playerBottom >= platTop) {
        continue
      }

      const overlapLeft = playerRight - platLeft
      const overlapRight = platRight - playerLeft
      const overlapTop = playerTop - platBottom
      const overlapBottom = platTop - playerBottom

      const minOverlapX = Math.min(overlapLeft, overlapRight)
      const minOverlapY = Math.min(overlapTop, overlapBottom)

      if (minOverlapY < minOverlapX) {
        if (overlapBottom < overlapTop) {
          this.bulk.position.y = platTop + ph
          this.bulkVelocityY = 0
          this.isGrounded = true
          this.isJumping = false
          this.jumpHoldTimer = 0
        } else {
          this.bulk.position.y = platBottom - ph
          this.bulkVelocityY = 0
          this.handleBlockHit(platform)
        }
      } else {
        if (overlapLeft < overlapRight) {
          this.bulk.position.x = platLeft - pw
        } else {
          this.bulk.position.x = platRight + pw
        }
        this.bulkVelocityX = 0
      }
    }
  }

  private handleBlockHit(platform: Platform): void {
    if (platform.type === 'question' && !platform.hit) {
      platform.hit = true
      const mat = platform.mesh.material as THREE.MeshBasicMaterial
      if (mat.map) mat.map.dispose()
      mat.map = null
      mat.color.setHex(0x886644)
      mat.needsUpdate = true

      // 30% chance to spawn Schmeg powerup instead of coin
      if (Math.random() < 0.3) {
        this.spawnSchmeg(platform.x, platform.y + 40)
      } else {
        this.spawnCoin(platform.x, platform.y + 40)
        this.score += 50
        this.callbacks.onScoreChange?.(this.score)
      }
      this.audio.synthTone(800, 0.1, 'square', 0.3)

      const origY = platform.mesh.position.y
      platform.mesh.position.y += 8
      setTimeout(() => {
        if (platform.mesh) platform.mesh.position.y = origY
      }, 100)
    } else if (platform.type === 'brick') {
      const origY = platform.mesh.position.y
      platform.mesh.position.y += 5
      setTimeout(() => {
        if (platform.mesh) platform.mesh.position.y = origY
      }, 100)
      this.audio.synthTone(200, 0.05, 'square', 0.2)
    }
  }

  // ─── Enemy Updates ────────────────────────────────────────────────

  private updateEnemies(): void {
    const levelWidth = this.currentLayout.levelWidth

    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        if (enemy.squishTimer > 0) {
          enemy.squishTimer--
          if (enemy.squishTimer <= 0) {
            this.scene.remove(enemy.mesh)
          }
        }
        continue
      }

      // Boss has custom update logic
      if (enemy.type === 'boss') {
        this.updateBoss(enemy)
        this.updateBossHealthBar(enemy)
        this.checkBossCollision(enemy)
        continue
      }

      // Flying enemies (paragoombas) - straight horizontal patrol
      if (enemy.type === 'paragoomba') {
        enemy.x += enemy.velocityX
        enemy.mesh.position.x = enemy.x

        // Turn around at edges
        if (enemy.x < -100 || enemy.x > levelWidth) {
          enemy.velocityX *= -1
        }

        this.checkEnemyCollision(enemy)
        continue
      }

      enemy.x += enemy.velocityX
      enemy.mesh.position.x = enemy.x

      // Enemy gravity uses same theme gravity (halved)
      const gravity = this.currentTheme.gravity ?? this.GRAVITY
      enemy.velocityY += gravity * 0.5
      enemy.y += enemy.velocityY
      enemy.mesh.position.y = enemy.y

      // Platform collision for enemies
      for (const platform of this.platforms) {
        const platTop = platform.y + platform.height / 2
        const platLeft = platform.x - platform.width / 2
        const platRight = platform.x + platform.width / 2

        if (enemy.x + enemy.width / 2 > platLeft &&
            enemy.x - enemy.width / 2 < platRight &&
            enemy.y - enemy.height / 2 < platTop + 5 &&
            enemy.y - enemy.height / 2 > platTop - 15 &&
            enemy.velocityY < 0) {
          enemy.y = platTop + enemy.height / 2
          enemy.velocityY = 0
          enemy.mesh.position.y = enemy.y

          const aheadX = enemy.x + enemy.velocityX * 20
          if (aheadX - enemy.width / 2 < platLeft || aheadX + enemy.width / 2 > platRight) {
            enemy.velocityX *= -1
          }
        }
      }

      if (enemy.x < -100 || enemy.x > levelWidth) {
        enemy.velocityX *= -1
      }

      if (enemy.y < -500) {
        enemy.alive = false
        this.scene.remove(enemy.mesh)
      }

      this.checkEnemyCollision(enemy)
    }

    // Update boss projectiles
    this.updateBossProjectiles()
  }

  private checkBossCollision(boss: Enemy): void {
    if (!this.bulk || !boss.alive || boss.type !== 'boss') return

    const dx = Math.abs(this.bulk.position.x - boss.x)
    const dy = this.bulk.position.y - boss.y

    // Player hits boss from above - narrow hitbox for stomp
    if (this.bulkVelocityY < 0 && dy > boss.height! * 0.1 &&
        dx < boss.width * 0.4) {
      // Always bounce when hitting from above
      this.bulkVelocityY = 10
      // Push player away from boss to prevent landing inside
      this.bulk.position.x = this.bulk.position.x < boss.x ? boss.x - 60 : boss.x + 60
      
      if (!boss.invulnerable) {
        boss.health!--
        boss.invulnerable = true
        boss.invulnerableTimer = 60
        this.score += 200
        this.callbacks.onScoreChange?.(this.score)
        this.audio.synthTone(400, 0.15, 'square', 0.4)

        if (boss.health! <= 0) {
          // Boss defeated!
          boss.alive = false
          boss.squishTimer = 30
          boss.mesh.scale.set(1.5, 0.2, 1)
          if (this.bossDeathTexture) {
            const body = boss.mesh.getObjectByName('body') as THREE.Mesh | undefined
            if (body) {
              (body.material as THREE.MeshBasicMaterial).map = this.bossDeathTexture;
              (body.material as THREE.MeshBasicMaterial).needsUpdate = true
            }
          }
          this.bossDefeated = true
          this.score += 2000
          this.callbacks.onScoreChange?.(this.score)
          this.audio.synthSweep(300, 800, 0.5, 'square', 0.5)

          // Create secret portal after delay
          setTimeout(() => {
            // Create portal at the void platform above boss arena
            this.createSecretPortal(4850, 0)
          }, 1000)
        }
      }
      return
    }

    // Player touches boss from side/bottom - take damage
    if (dx < this.PLAYER_WIDTH + boss.width / 2 - 10 &&
        Math.abs(dy) < this.PLAYER_HEIGHT + boss.height! / 2 - 10) {
      this.takeDamage()
    }
  }

  private checkEnemyCollision(enemy: Enemy): void {
    if (!this.bulk || !enemy.alive) return

    const dx = Math.abs(this.bulk.position.x - enemy.x)
    const dy = this.bulk.position.y - enemy.y

    if (dx < this.PLAYER_WIDTH + enemy.width / 2 - 5 &&
        Math.abs(dy) < this.PLAYER_HEIGHT + enemy.height / 2 - 5) {
      
      // Rage Mode - defeat any enemy on touch!
      if (this.isRageMode) {
        enemy.alive = false
        enemy.squishTimer = 15
        this.switchEnemyToDamageTexture(enemy)
        enemy.mesh.scale.set(1.5, 0.2, 1)
        enemy.mesh.position.y -= 15
        // Bounce off enemy
        this.bulkVelocityY = 10
        this.score += 200
        this.callbacks.onScoreChange?.(this.score)
        this.audio.synthTone(600, 0.1, 'square', 0.4)
        return
      }

      // Boss-specific damage: jump on head to damage (narrow hitbox)
      if (enemy.type === 'boss') {
        // Only count as stomp if player is above boss and falling
        const isAbove = dy > enemy.height * 0.6 && this.bulkVelocityY < 0
        const isStomping = isAbove && Math.abs(dx) < enemy.width * 0.3
        
        if (isStomping) {
          // Player jumped on boss - damage boss if not invulnerable
          if (!enemy.invulnerable) {
            enemy.health!--
            enemy.invulnerable = true
            enemy.invulnerableTimer = 60  // 1 second invulnerability
            this.bulkVelocityY = 10  // Bounce off
            this.score += 100
            this.callbacks.onScoreChange?.(this.score)
            this.createComboText(enemy.x, enemy.y)
            this.audio.synthTone(400, 0.1, 'square', 0.3)
          } else {
            // Boss invulnerable - just bounce, no damage
            this.bulkVelocityY = 10
          }
          // After bouncing, briefly push player away to prevent landing inside boss
          this.bulk.position.x = this.bulk.position.x < enemy.x ? enemy.x - 50 : enemy.x + 50
        } else if (!enemy.invulnerable) {
          // Touched boss from side/below - take damage
          this.takeDamage()
        }
        return
      }

      // Regular enemy: stomp to kill
      if (this.bulkVelocityY < 0 && dy > enemy.height / 2) {
        enemy.alive = false
        enemy.squishTimer = 20
        this.switchEnemyToDamageTexture(enemy)
        enemy.mesh.scale.set(1.3, 0.3, 1)
        enemy.mesh.position.y -= 10

        this.bulkVelocityY = 8
        this.score += 100
        this.callbacks.onScoreChange?.(this.score)
        this.createComboText(enemy.x, enemy.y)
        this.audio.synthTone(300, 0.1, 'square', 0.3)
      } else {
        this.takeDamage()
      }
    }
  }

  // ─── Coin Updates ─────────────────────────────────────────────────

  private updateCoins(): void {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i]
      if (!coin.collected) {
        // Coins fall with gravity - NO platform collision (pass through everything)
        coin.velocityY -= 0.3
        coin.y += coin.velocityY
        coin.mesh.position.y = coin.y
        coin.collectTimer++
        if (coin.collectTimer > 90) {
          coin.collected = true
          this.scene.remove(coin.mesh)
          coin.mesh.geometry.dispose()
          ;(coin.mesh.material as THREE.MeshBasicMaterial).dispose()
          this.coins.splice(i, 1)
        }
      }
    }

    if (!this.bulk) return
    const px = this.bulk.position.x
    const py = this.bulk.position.y

    for (const fc of this.floatingCoins) {
      if (fc.collected) continue

      fc.bobTimer += 0.05
      fc.mesh.position.y = fc.baseY + Math.sin(fc.bobTimer) * 5

      const dx = Math.abs(px - fc.x)
      const dy = Math.abs(py - fc.mesh.position.y)
      if (dx < 30 && dy < 30) {
        fc.collected = true
        this.scene.remove(fc.mesh)
        fc.mesh.geometry.dispose()
        ;(fc.mesh.material as THREE.MeshBasicMaterial).dispose()
        this.score += 25
        this.callbacks.onScoreChange?.(this.score)
        this.audio.synthTone(1000, 0.06, 'sine', 0.25)
      }
    }
  }

  private updatePowerUps(): void {
    if (!this.bulk) return
    const px = this.bulk.position.x
    const py = this.bulk.position.y

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i]
      if (pu.collected) continue

      // Apply gravity to powerup
      pu.velocityY -= 0.25
      pu.y += pu.velocityY
      pu.mesh.position.y = pu.y

      // Check collection
      const dx = Math.abs(px - pu.x)
      const dy = Math.abs(py - pu.y)
      if (dx < 35 && dy < 35) {
        pu.collected = true
        this.scene.remove(pu.mesh)
        pu.mesh.geometry.dispose()
        ;(pu.mesh.material as THREE.MeshBasicMaterial).dispose()
        this.powerUps.splice(i, 1)

        // Activate Rage Mode!
        this.activateRageMode()
        continue
      }

      // Remove if fell off screen
      if (pu.y < -400) {
        pu.collected = true
        this.scene.remove(pu.mesh)
        pu.mesh.geometry.dispose()
        ;(pu.mesh.material as THREE.MeshBasicMaterial).dispose()
        this.powerUps.splice(i, 1)
      }
    }
  }

  private activateRageMode(): void {
    this.isRageMode = true
    this.rageModeTimer = this.RAGE_MODE_DURATION
    this.rageModeFlashTimer = 0
    this.score += 200
    this.callbacks.onScoreChange?.(this.score)

    // Track schmegs collected — every 3 grants an extra life
    this.schmegCount++
    this.callbacks.onSchmegChange?.(this.schmegCount)
    if (this.schmegCount >= this.SCHMEGS_PER_LIFE) {
      this.schmegCount = 0
      this.callbacks.onSchmegChange?.(0)
      this.lives++
      this.callbacks.onLivesChange?.(this.lives)
      // Celebratory extra-life sound
      this.audio.synthSweep(800, 1600, 0.2, 'sine', 0.4)
      setTimeout(() => this.audio.synthSweep(1000, 2000, 0.2, 'sine', 0.4), 200)
    } else {
      // Play powerup sound
      this.audio.synthSweep(400, 1200, 0.3, 'square', 0.5)
      setTimeout(() => this.audio.synthSweep(600, 1600, 0.3, 'square', 0.5), 150)
    }
  }

  private updateRageMode(): void {
    if (!this.isRageMode) return

    this.rageModeTimer--
    this.rageModeFlashTimer++

    // Flash player purple/white during rage mode
    if (this.bulk) {
      const flashSpeed = 8
      const flashFrame = Math.floor(this.rageModeFlashTimer / flashSpeed) % 4
      const colors = [0x9932CC, 0xFFFFFF, 0xBA55D3, 0xFFFFFF] // Purple flash
      
      this.bulk.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshBasicMaterial
          if (mat && !mat.map) { // Only tint non-textured parts
            mat.color.setHex(colors[flashFrame])
          }
        }
      })
    }

    // End rage mode
    if (this.rageModeTimer <= 0) {
      this.isRageMode = false
      this.resetPlayerColor()
    }
  }

  private resetPlayerColor(): void {
    if (!this.bulk) return
    this.bulk.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshBasicMaterial
        if (mat && !mat.map) {
          // Restore original green color
          mat.color.setHex(0x4ade80)
        }
      }
    })
  }

  // ─── Goal & Level Progression ─────────────────────────────────────

  private checkGoal(): void {
    if (!this.bulk || this.gameOver) return

    // After boss defeated: portal goes to secret level, running past ends game
    if (this.bossDefeated && this.goalX > 0) {
      const dx = Math.abs(this.bulk.position.x - this.goalX)
      const dy = Math.abs(this.bulk.position.y - this.goalY)
      
      // Touch portal - go to secret level
      if (dx < 50 && dy < 60) {
        this.score += 1000
        this.callbacks.onScoreChange?.(this.score)
        this.gameOver = true
        this.audio.stopBGM()
        this.callbacks.onStateChange?.('win')
        return
      }
      
      // Run past portal (to the right) - end game (victory!)
      if (this.bulk.position.x > this.goalX + 60) {
        this.score += 500
        this.callbacks.onScoreChange?.(this.score)
        this.gameOver = true
        this.audio.stopBGM()
        this.audio.synthSweep(400, 800, 0.3, 'sine', 0.4)
        this.callbacks.onStateChange?.('win')
        return
      }
    }

    // In boss level, can't reach goal until boss is defeated
    if (this.currentLayout.hasBoss && !this.bossDefeated) {
      // Cap player position before goal
      if (this.bulk.position.x >= this.currentLayout.goalX - 100) {
        this.bulk.position.x = this.currentLayout.goalX - 100
        this.bulkVelocityX = 0
      }
      return
    }

    // Gauntlet mode win
    if (this.isGauntletMode && this.bulk.position.x >= this.currentLayout.goalX - 30) {
      const elapsedMs = Math.round((this.gauntletTimer / 60) * 1000)
      if (this.gauntletBestMs === 0 || elapsedMs < this.gauntletBestMs) {
        this.gauntletBestMs = elapsedMs
        try { localStorage.setItem('gauntletBest', String(elapsedMs)) } catch { /* */ }
      }
      this.score = elapsedMs
      this.callbacks.onScoreChange?.(elapsedMs)
      this.gameOver = true
      this.audio.stopBGM()
      this.callbacks.onStateChange?.('win')
      return
    }

    if (this.bulk.position.x >= this.currentLayout.goalX - 30) {
      this.score += 500
      this.callbacks.onScoreChange?.(this.score)

      this.gameOver = true
      this.audio.stopBGM()
      this.audio.synthSweep(400, 800, 0.3, 'sine', 0.4)
      setTimeout(() => {
        this.audio.synthSweep(600, 1200, 0.3, 'sine', 0.4)
      }, 200)

      if (this.currentLevel < LEVEL_THEMES.length - 1) {
        // More levels to go (including secret level 7 after beating world 6)
        this.callbacks.onStateChange?.('levelcomplete')
        setTimeout(() => {
          this.advanceToNextLevel()
        }, 2000)
      } else {
        // All worlds complete!
        if (this.score > this.highScore) {
          this.highScore = this.score
          try { localStorage.setItem('bulkPlatformerHighScore', String(this.highScore)) } catch { /* */ }
          this.callbacks.onHighScoreChange?.(this.highScore)
        }
        this.callbacks.onStateChange?.('win')
      }
    }
  }

  private advanceToNextLevel(): void {
    this.currentLevel++
    this.currentTheme = LEVEL_THEMES[this.currentLevel]
    this.currentLayout = LEVEL_LAYOUTS[this.currentLevel]

    this.clearLevel()
    this.buildLevel()

    // Reset player position
    this.bulk.position.set(100, -200, 0)
    this.bulkVelocityX = 0
    this.bulkVelocityY = 0
    this.isGrounded = false
    this.facingRight = true
    this.currentAnimation = 'idle'
    this.wasJumpPressed = false

    // Notify React
    this.callbacks.onWaveChange?.(this.currentLevel + 1)
    this.gameOver = false
    this.callbacks.onStateChange?.('playing')
    this.audio.playBGM()
  }

  // ─── Animation ────────────────────────────────────────────────────

  private updateAnimation(): void {
    if (!this.bulkSprite) return

    let targetAnim: 'idle' | 'run' | 'jump' | 'shoot' = 'idle'

    // Shoot animation takes priority
    if (this.isShooting) {
      targetAnim = 'shoot'
    } else if (!this.isGrounded) {
      targetAnim = 'jump'
    } else if (Math.abs(this.bulkVelocityX) > 0.5) {
      targetAnim = 'run'
    }

    if (targetAnim !== this.currentAnimation) {
      this.currentAnimation = targetAnim
      const mat = this.bulkSprite.material as THREE.MeshBasicMaterial
      
      // Use orb textures for shooting animation
      if (targetAnim === 'shoot') {
        if (this.isGrounded && this.orbGroundTexture) {
          mat.map = this.orbGroundTexture
          // Orb sprites are wider (showing orb shooting from palm) - maintain aspect ratio
          // Scale X more to accommodate the wider sprite, Y for height
          this.bulkSprite.scale.set(1.6, 1.1, 1)  // Much wider for shooting sprite
        } else if (!this.isGrounded && this.orbAirTexture) {
          mat.map = this.orbAirTexture
          // Orb sprites are wider - maintain aspect ratio
          this.bulkSprite.scale.set(1.65, 1.1, 1)  // Much wider for shooting sprite
        } else {
          // Fallback to punch texture if orb textures not loaded
          const tex = this.spriteTextures.get('punch')
          if (tex) mat.map = tex
          this.bulkSprite.scale.set(1, 1, 1)
        }
        this.bulkSprite.position.x = 0.25   // tweak: 0.15–0.40 usually
      } else {
        const tex = this.spriteTextures.get(targetAnim)
        if (tex) mat.map = tex
        // Reset scale to normal for regular animations
        this.bulkSprite.scale.set(1, 1, 1)

        this.bulkSprite.position.x = 0
      }
      mat.needsUpdate = true
    }

    // Flip sprite based on facing direction (preserve actual X scale, not Y)
    const absX = Math.abs(this.bulkSprite.scale.x)
    this.bulkSprite.scale.x = this.facingRight ? absX : -absX
  }

  // ─── Camera ───────────────────────────────────────────────────────

  private updateCamera(): void {
    if (!this.bulk || !(this.camera instanceof THREE.OrthographicCamera)) return

    this.cameraTargetX = this.bulk.position.x

    const halfWidth = (this.camera.right - this.camera.left) / 2
    const minX = this.camera.left + halfWidth
    const maxX = this.currentLayout.levelWidth - halfWidth
    this.cameraTargetX = Math.max(minX, Math.min(maxX, this.cameraTargetX))

    this.camera.position.x += (this.cameraTargetX - this.camera.position.x) * 0.1
  }

  // ─── Resize ───────────────────────────────────────────────────────

  protected override onResize(width: number, height: number): void {
    if (this.camera instanceof THREE.OrthographicCamera) {
      // Account for control panel on mobile
      const isMobile = this.input?.getIsMobile() ?? false
      const panelHeight = isMobile ? Math.min(180, height * 0.22) : 0
      const availableHeight = height - panelHeight
      
      // Use actual container aspect ratio
      const aspect = width / Math.max(availableHeight, 1)
      
      // Mobile: 20% more zoom (0.8), Desktop: 10% more zoom (0.9)
      const zoomFactor = isMobile ? 0.8 : 0.9
      const viewHeight = this.VIEW_SIZE * zoomFactor
      const viewWidth = viewHeight * aspect
      
      this.camera.left = -viewWidth
      this.camera.right = viewWidth
      this.camera.top = viewHeight
      this.camera.bottom = -viewHeight
      
      this.camera.updateProjectionMatrix()
    }
  }

  // ─── Game Lifecycle ───────────────────────────────────────────────

  start(): void {
    if (!this.bulk) return
    this.gameStarted = true
    this.gameOver = false
    this.score = 0
    this.lives = 3
    this.currentHealth = 6  // Full hearts (3 lives * 2)
    this.schmegCount = 0
    this.callbacks.onSchmegChange?.(0)
    this.currentLevel = 0
    this.currentTheme = LEVEL_THEMES[0]
    this.currentLayout = LEVEL_LAYOUTS[0]
    this.bossDefeated = false
    this.bulkVelocityX = 0
    this.bulkVelocityY = 0
    this.bulk.position.set(100, -200, 0)
    this.isGrounded = false
    this.facingRight = true
    this.currentAnimation = 'idle'
    this.wasJumpPressed = false

    this.showTouchControls(true)
    this.callbacks.onStateChange?.('playing')
    this.callbacks.onScoreChange?.(0)
    this.callbacks.onLivesChange?.(this.lives)
    this.callbacks.onWaveChange?.(1)
    this.audio.playBGM()
  }

  restart(): void {
    // Reset level to world 1
    this.currentLevel = 0
    this.currentTheme = LEVEL_THEMES[0]
    this.currentLayout = LEVEL_LAYOUTS[0]
    this.bossDefeated = false

    this.clearLevel()
    this.buildLevel()

    this.showTouchControls(false)
    this.touchMovingLeft = false
    this.touchMovingRight = false
    this.touchJumping = false
    this.touchShooting = false
    this.callbacks.onStateChange?.('title')
    this.gameStarted = false
    this.gameOver = false
    this.score = 0
    this.lives = 3
    this.currentHealth = 6  // Reset to full hearts
    this.isGauntletMode = false
  }

  startGauntlet(): void {
    this.isGauntletMode = true
    this.gauntletTimer = 0
    this.gameStarted = true
    this.gameOver = false
    this.score = 0
    this.lives = 1
    this.schmegCount = 0
    this.callbacks.onSchmegChange?.(0)
    this.currentLevel = 0
    this.currentTheme = GAUNTLET_THEME
    this.currentLayout = GAUNTLET_LAYOUT
    this.bossDefeated = false
    this.bulkVelocityX = 0
    this.bulkVelocityY = 0
    this.bulk.position.set(100, -200, 0)
    this.isGrounded = false
    this.facingRight = true
    this.currentAnimation = 'idle'
    this.wasJumpPressed = false
    this.clearLevel()
    this.buildLevel()
    this.showTouchControls(true)
    this.callbacks.onStateChange?.('playing')
    this.callbacks.onScoreChange?.(0)
    this.callbacks.onLivesChange?.(1)
    this.callbacks.onWaveChange?.(99) // 99 signals gauntlet mode to React
    this.audio.playBGM()
  }

  startBoss(): void {
    // Skip to boss fight (level 6) - spawn near the boss
    this.isGauntletMode = false
    this.gameStarted = true
    this.gameOver = false
    this.score = 0
    this.lives = 3
    this.schmegCount = 0
    this.callbacks.onSchmegChange?.(0)
    this.currentLevel = 5  // World 6 (0-indexed)
    this.currentTheme = LEVEL_THEMES[5]
    this.currentLayout = LEVEL_LAYOUTS[5]
    this.bossDefeated = false
    this.bulkVelocityX = 0
    this.bulkVelocityY = 0
    // Spawn at boss checkpoint (boss is at x: 4800, y: -270)
    this.bulk.position.set(4000, -270, 0)
    this.spawnX = 4000
    this.spawnY = -270
    this.lastCheckpointIndex = 0  // Pretend checkpoint is activated
    this.isGrounded = false
    this.facingRight = true
    this.currentAnimation = 'idle'
    this.wasJumpPressed = false
    this.clearLevel()
    this.buildLevel()
    this.showTouchControls(true)
    this.callbacks.onStateChange?.('playing')
    this.callbacks.onScoreChange?.(0)
    this.callbacks.onLivesChange?.(this.lives)
    this.callbacks.onWaveChange?.(6)
    this.audio.playBGM()
  }

  // ─── Damage System ────────────────────────────────────────────────

  private takeDamage(): void {
    // Gauntlet mode: instant restart
    if (this.isGauntletMode) {
      this.gauntletTimer = 0
      this.callbacks.onScoreChange?.(0)
      this.bulk.position.set(100, -200, 0)
      this.bulkVelocityX = 0
      this.bulkVelocityY = 0
      this.isGrounded = false
      this.clearLevel()
      this.buildLevel()
      this.audio.synthSweep(400, 100, 0.3, 'sawtooth', 0.3)
      return
    }

    // Regular mode: each hit = lose 1 life
    this.lives--
    this.callbacks.onLivesChange?.(this.lives)

    // Knockback
    this.bulkVelocityX = this.facingRight ? -8 : 8

    if (this.lives <= 0) {
      // Full death - game over
      this.lives = 0
      this.gameOver = true  // Stop the game loop immediately
      this.currentAnimation = 'dead'
      const deadTex = this.spriteTextures.get('dead')
      if (deadTex && this.bulkSprite) {
        (this.bulkSprite.material as THREE.MeshBasicMaterial).map = deadTex
        this.bulkSprite.scale.set(1.05, 1.05, 1)
      }
      this.audio.synthSweep(400, 100, 0.5, 'sawtooth', 0.3)
      // Delay showing game over screen
      setTimeout(() => {
        this.callbacks.onStateChange?.('gameover')
      }, 1500)
      return
    }

    // Just took damage - brief invulnerability pause then respawn
    this.gameOver = true
    this.currentAnimation = 'damage'
    const damageTex = this.spriteTextures.get('damage')
    if (damageTex && this.bulkSprite) {
      const mat = this.bulkSprite.material as THREE.MeshBasicMaterial
      mat.map = damageTex
      this.bulkSprite.scale.set(1.05, 1.05, 1)
    }
    this.audio.synthSweep(400, 100, 0.5, 'sawtooth', 0.3)
    setTimeout(() => {
      this.respawnPlayer()
    }, 1000)
  }

  private endGame(): void {
    // Delegate to takeDamage for all damage handling
    this.takeDamage()
  }

  private respawnPlayer(): void {
    // Rebuild current level (reset enemies, coins, blocks)
    this.clearLevel()
    this.buildLevel()

    // Reset player state at checkpoint (or start if no checkpoint)
    this.bulk.position.set(this.spawnX, this.spawnY, 0)
    this.bulkVelocityX = 0
    this.bulkVelocityY = 0
    this.isGrounded = false
    this.facingRight = true
    this.currentAnimation = 'idle'
    this.wasJumpPressed = false
    this.gameOver = false

    // Lives persist, don't restore

    // Score persists, lives already decremented
    this.callbacks.onStateChange?.('playing')
  }

  // ─── Main Update Loop ─────────────────────────────────────────────

  update(_delta: number): void {
    if (!this.bulk || !this.gameStarted || this.gameOver) return

    // Gauntlet timer
    if (this.isGauntletMode) {
      this.gauntletTimer++
      // Report as centiseconds for display: divide by 0.6 to get tenths of seconds
      this.callbacks.onScoreChange?.(Math.round((this.gauntletTimer / 60) * 100) / 100)
    }

    this.handleInput()
    this.updatePhysics()
    this.updateOrbs()
    this.updateAnimation()
    this.updateClouds()
    this.updateEnemies()
    this.updateDustParticles()
    this.updateFallingHazards()
    this.updateCoins()
    this.updateComboTexts()
    this.updatePowerUps()
    this.updateRageMode()
    this.checkCheckpoint()
    this.checkGoal()

    // Handle screen flash
    if (this.flashFrames > 0) {
      const flashMesh = this.scene.getObjectByName('flashOverlay') as THREE.Mesh
      if (flashMesh) {
        (flashMesh.material as THREE.MeshBasicMaterial).opacity = 0.3 * (this.flashFrames / 5)
      }
      this.flashFrames--
      if (this.flashFrames === 0) {
        this.scene.remove(flashMesh)
        if (flashMesh.geometry) flashMesh.geometry.dispose()
        if (flashMesh.material) (flashMesh.material as THREE.Material).dispose()
      }
    }

    this.updateCamera()
  }

  private updateFallingHazards(): void {
    if (!this.bulk) return

    const playerX = this.bulk.position.x

    for (const hazard of this.fallingHazards) {
      switch (hazard.state) {
        case 'waiting':
          // Only activate if player is nearby
          if (Math.abs(playerX - hazard.x) < 200) {
            hazard.waitTimer--
            if (hazard.waitTimer <= 0) {
              hazard.state = 'falling'
              hazard.velocityY = 0
            }
          }
          break

        case 'falling':
          hazard.velocityY += 0.5
          hazard.y -= hazard.velocityY
          hazard.mesh.position.y = hazard.y

          // Check collision with player
          const dx = Math.abs(playerX - hazard.x)
          const dy = Math.abs(this.bulk.position.y - (hazard.y - 27))
          if (dx < 25 && dy < 35) {
            this.takeDamage()
            return
          }

          // Hit ground
          if (hazard.y < -270) {
            hazard.y = -270
            hazard.velocityY = 0
            hazard.state = 'rising'
            hazard.waitTimer = 60
            hazard.mesh.position.y = hazard.y
          }
          break

        case 'rising':
          hazard.waitTimer--
          if (hazard.waitTimer <= 0) {
            hazard.y += 3
            hazard.mesh.position.y = hazard.y
            if (hazard.y >= hazard.baseY) {
              hazard.y = hazard.baseY
              hazard.state = 'waiting'
              hazard.waitTimer = 60 + Math.random() * 60
            }
          }
          break
      }
    }
  }

  dispose(): void {
    this.input?.dispose()
    this.audio.dispose()
    this.removeTouchControls()

    for (const [, tex] of this.spriteTextures) {
      tex.dispose()
    }
    this.spriteTextures.clear()

    super.dispose()
  }
}