export const CONTRACT_ADDRESS = 'F4TJfiMVi7zFGRJj4FVC1Zuj7fdCo6skKa4SnAU4pump'

export const SOLANA_RPC_URL = 'https://solana-rpc.publicnode.com'
export const BULK_REQUIRED = 10_000

export const API_URLS = {
  dexScreener: `https://api.dexscreener.com/latest/dex/tokens/${CONTRACT_ADDRESS}`,
  jupiterSwap: `https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=${CONTRACT_ADDRESS}`,
} as const

export const SOCIAL_LINKS = {
  dexScreener: 'https://dexscreener.com/solana/4fiwnawmxpctyqgljp5niyid9sbrznz8dgtqqtibbmhc',
  twitter: 'https://x.com/bulkedsol',
  community: 'https://x.com/i/communities/1993091379786895690',
} as const

export const ASSET_PATHS = {
  models: {
    bulk: '/models/bulk.glb',
    run: '/models/run.glb',
  },
  audio: {
    bgm: '/audio/bgm.mp3',
    run: '/audio/run.mp3',
    jazz: '/audio/jazz.mp3',
    nuke: '/audio/nuke.mp3',
  },
  video: {
    bulk: '/video/bulk.mp4',
    title: '/video/title.mp4',
  },
  images: {
    spin: '/images/spin.png',
    portal: '/images/portal.png',
    checkpoint: '/images/checkpoint.png',
    checkpointGreen: '/images/checkpoint-green.png',
    comboText: '/images/combo-text.png',
  },
  sprites: {
    bulk: {
      idle: '/images/pixelbulk.png',
      run: '/images/pixelbulk-run.png',
      jump: '/images/pixelbulk-jump.png',
      punch: '/images/pixelbulk-punch.png',
    },
  },
} as const

export interface GameInfo {
  name: string
  path: string
  description: string
  coverImage?: string
  isLocked?: boolean
}

export const GAMES: GameInfo[] = [
  { name: 'BULK RUNNER', path: '/games/runner', description: 'Run through the night city', coverImage: '/images/coverrunner.png' },
  { name: 'SUPER BULK BROS', path: '/games/bulkbros', description: 'Classic side-scrolling action!', coverImage: '/images/coverbros.png' },
  { name: 'STREETS OF SCHMEG', path: '/games/schmeg', description: 'Beat \'em up brawler!', coverImage: '/images/coverstreets.png' },
  { name: 'FLAPPY BULK', path: '/games/flappy', description: 'Fly through the city', coverImage: '/images/coverflappy.png' },
  { name: 'BULK CLIMB', path: '/games/climb', description: 'Climb the skyscraper', coverImage: '/images/coverclimb.png' },
  // { name: 'BULK BREAKER', path: '/games/breaker', description: 'Smash bricks with Bulk!' }, // TEMPORARILY HIDDEN
  // { name: 'BULK RAMPAGE', path: '/games/rampage', description: 'Destroy the city!' },
  { name: 'BULKAGACHI', path: '/games/bulkagachi', description: 'Care for your Bulk', coverImage: '/images/cover-baby.png' },
]
