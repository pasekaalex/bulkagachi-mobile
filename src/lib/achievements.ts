export interface AchievementDef {
  id: string
  game: string
  icon: string
  title: string
  desc: string
}

const STORAGE_KEY = 'bulkAchievements'

export const ALL_ACHIEVEMENTS: AchievementDef[] = [
  // Flappy Bulk
  { id: 'flappy_first', game: 'Flappy Bulk', icon: '\u{1F423}', title: 'First Flight', desc: 'Score at least 1 point' },
  { id: 'flappy_10', game: 'Flappy Bulk', icon: '\u{1F426}', title: 'Soaring High', desc: 'Score 10 points' },
  { id: 'flappy_25', game: 'Flappy Bulk', icon: '\u{1F985}', title: 'Eagle Eye', desc: 'Score 25 points' },
  { id: 'flappy_50', game: 'Flappy Bulk', icon: '\u{1F680}', title: 'Flap God', desc: 'Score 50 points' },

  // Bulk Climb
  { id: 'climb_100', game: 'Bulk Climb', icon: '\u{1FA7C}', title: 'Getting Started', desc: 'Climb 100m' },
  { id: 'climb_500', game: 'Bulk Climb', icon: '\u{26F0}\u{FE0F}', title: 'Mountain Goat', desc: 'Climb 500m' },
  { id: 'climb_1000', game: 'Bulk Climb', icon: '\u{1F3D4}\u{FE0F}', title: 'Summit King', desc: 'Climb 1000m' },

  // Bulk Runner
  { id: 'runner_500', game: 'Bulk Runner', icon: '\u{1F3C3}', title: 'Jogger', desc: 'Run 500m' },
  { id: 'runner_2000', game: 'Bulk Runner', icon: '\u{1F3C3}\u{200D}\u{2642}\u{FE0F}', title: 'Marathon Man', desc: 'Run 2000m' },
  { id: 'runner_rage', game: 'Bulk Runner', icon: '\u{1F608}', title: 'Rampage Runner', desc: 'Activate rage mode' },

  // Bulk Breaker // TEMPORARILY HIDDEN
  // { id: 'breaker_first', game: 'Bulk Breaker', icon: '🧱', title: 'Brick Basher', desc: 'Score 100 points' },
  // { id: 'breaker_1000', game: 'Bulk Breaker', icon: '⚡', title: 'Breaker Pro', desc: 'Score 1000 points' },
  // { id: 'breaker_5000', game: 'Bulk Breaker', icon: '💥', title: 'Destruction Master', desc: 'Score 5000 points' },
  // { id: 'breaker_level5', game: 'Bulk Breaker', icon: '🏆', title: 'Level Legend', desc: 'Reach Level 5' },

  // Bulk Rampage
  { id: 'rampage_wave3', game: 'Bulk Rampage', icon: '\u{1F4A5}', title: 'Warmed Up', desc: 'Reach Wave 3' },
  { id: 'rampage_wave5', game: 'Bulk Rampage', icon: '\u{1F525}', title: 'Unstoppable', desc: 'Reach Wave 5' },
  { id: 'rampage_kills50', game: 'Bulk Rampage', icon: '\u{1F480}', title: 'Mass Destruction', desc: 'Defeat 50 enemies' },
  { id: 'rampage_combo20', game: 'Bulk Rampage', icon: '\u{26A1}', title: 'Combo Fiend', desc: 'Reach a 20x combo' },

  // Super Bulk Bros
  { id: 'platformer_first', game: 'Super Bulk Bros', icon: '\u{1F3AE}', title: 'First Steps', desc: 'Score 100 points' },
  { id: 'platformer_1000', game: 'Super Bulk Bros', icon: '\u{2B50}', title: 'Coin Collector', desc: 'Score 1000 points' },
  { id: 'platformer_5000', game: 'Super Bulk Bros', icon: '\u{1F4B0}', title: 'Bulk Millionaire', desc: 'Score 5000 points' },
  { id: 'platformer_lives3', game: 'Super Bulk Bros', icon: '\u{2764}\u{FE0F}', title: 'Untouchable', desc: 'Complete a world without losing a life' },
  { id: 'platformer_punch10', game: 'Super Bulk Bros', icon: '\u{1F44A}', title: 'Fist of Fury', desc: 'Defeat 10 enemies with punches' },
  { id: 'platformer_stomp20', game: 'Super Bulk Bros', icon: '\u{1F9B6}', title: 'Stomp Master', desc: 'Defeat 20 enemies by jumping on them' },
  { id: 'platformer_world2', game: 'Super Bulk Bros', icon: '\u{1F3DC}\u{FE0F}', title: 'Desert Explorer', desc: 'Reach World 2' },
  { id: 'platformer_world3', game: 'Super Bulk Bros', icon: '\u{1F33E}', title: 'Country Roads', desc: 'Reach World 3' },
  { id: 'platformer_world4', game: 'Super Bulk Bros', icon: '\u{1F306}', title: 'City Slicker', desc: 'Reach World 4' },
  { id: 'platformer_world5', game: 'Super Bulk Bros', icon: '\u{1F319}', title: 'Moonwalker', desc: 'Reach World 5' },
  { id: 'platformer_world6', game: 'Super Bulk Bros', icon: '\u{1F3EF}', title: 'Fortress Conqueror', desc: 'Reach World 6 - The Dark Fortress' },
  { id: 'platformer_win', game: 'Super Bulk Bros', icon: '\u{1F3C6}', title: 'World Champion', desc: 'Complete all 6 worlds and defeat the Dark Bulk' },
  { id: 'platformer_secret', game: 'Super Bulk Bros', icon: '\u{1F480}', title: 'Beyond the Beyond', desc: 'Discover and complete the secret Kaizo level' },
  { id: 'platformer_perfect', game: 'Super Bulk Bros', icon: '\u{1F451}', title: 'Speedrunner', desc: 'Complete all worlds in under 10 minutes' },

  // Streets of Schmeg
  { id: 'schmeg_1000', game: 'Streets of Schmeg', icon: '👊', title: 'Street Fighter', desc: 'Score 1000 points' },
  { id: 'schmeg_5000', game: 'Streets of Schmeg', icon: '💪', title: 'Brawl Master', desc: 'Score 5000 points' },
  { id: 'schmeg_10combo', game: 'Streets of Schmeg', icon: '⚡', title: 'Combo King', desc: 'Reach a 10x combo' },
  { id: 'schmeg_beatgame', game: 'Streets of Schmeg', icon: '🏆', title: 'Street Champion', desc: 'Defeat the Tank Boss' },
  { id: 'schmeg_rich', game: 'Streets of Schmeg', icon: '💰', title: 'Schmeckle Millionaire', desc: 'Collect 200 schmeckles' },

  // Bulkagachi (mirrored from engine)
  { id: 'bulkagachi_firstFeed', game: 'Bulkagachi', icon: '\u{1F964}', title: 'First Meal', desc: 'Feed Bulk for the first time' },
  { id: 'bulkagachi_combo10', game: 'Bulkagachi', icon: '\u{1F525}', title: 'Combo Master', desc: 'Reach a 10x combo' },
  { id: 'bulkagachi_perfectCare', game: 'Bulkagachi', icon: '\u{1F4AF}', title: 'Perfect Care', desc: 'Get all stats to 100%' },
  { id: 'bulkagachi_oneDay', game: 'Bulkagachi', icon: '\u{1F382}', title: 'First Birthday', desc: 'Keep Bulk alive for 1 day' },
  { id: 'bulkagachi_care100', game: 'Bulkagachi', icon: '\u{2764}\u{FE0F}', title: 'Dedicated Carer', desc: 'Perform 100 care actions' },
  { id: 'bulkagachi_care500', game: 'Bulkagachi', icon: '\u{1F4AA}', title: 'Super Parent', desc: 'Perform 500 care actions' },
  { id: 'bulkagachi_revival', game: 'Bulkagachi', icon: '\u{2728}', title: 'Second Chance', desc: 'Revive Bulk' },
  { id: 'bulkagachi_threeDays', game: 'Bulkagachi', icon: '\u{1F31F}', title: 'Week Warrior', desc: 'Keep Bulk alive for 3 days' },
  { id: 'bulkagachi_level5', game: 'Bulkagachi', icon: '\u{2B50}', title: 'Rising Star', desc: 'Reach Level 5' },
  { id: 'bulkagachi_level10', game: 'Bulkagachi', icon: '\u{1F31F}', title: 'Superstar', desc: 'Reach Level 10' },
  { id: 'bulkagachi_goldenPoop', game: 'Bulkagachi', icon: '\u{2728}', title: 'Golden Discovery', desc: 'Find and clean a golden poop' },
  
  // Teen achievements
  { id: 'bulkagachi_teenGood', game: 'Bulkagachi', icon: '\u{1F607}', title: 'Good Boy', desc: 'Choose the good teen path' },
  { id: 'bulkagachi_teenBad', game: 'Bulkagachi', icon: '\u{1F608}', title: 'Rebel Teen', desc: 'Choose the bad teen path' },
  
  // Ghost achievements
  { id: 'bulkagachi_ghostOneHour', game: 'Bulkagachi', icon: '\u{1F47B}', title: 'Ghostly Hour', desc: 'Spend 1 hour as a ghost' },
  { id: 'bulkagachi_ghostOneDay', game: 'Bulkagachi', icon: '\u{1F383}', title: 'Forever Ghost', desc: 'Spend 24 hours as a ghost' },
  { id: 'bulkagachi_ghostWeek', game: 'Bulkagachi', icon: '\u{1F47C}', title: 'Persistent Spirit', desc: 'Spend 7 days as a ghost' },
  
  // Elder achievements  
  { id: 'bulkagachi_elder', game: 'Bulkagachi', icon: '\u{1F474}', title: 'Wise Elder', desc: 'Reach the Elder stage' },
  { id: 'bulkagachi_oneWeek', game: 'Bulkagachi', icon: '\u{1F4C5}', title: 'Week Survivor', desc: 'Keep Bulk alive for 1 week' },
  { id: 'bulkagachi_twoWeeks', game: 'Bulkagachi', icon: '\u{1F4C6}', title: 'Fortnight Friend', desc: 'Keep Bulk alive for 2 weeks' },
  { id: 'bulkagachi_oneMonth', game: 'Bulkagachi', icon: '\u{1F4C5}', title: 'Monthly Miracle', desc: 'Keep Bulk alive for 30 days' },
]

export function getUnlocked(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* storage disabled */ }
  return {}
}

function saveUnlocked(unlocked: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked))
  } catch { /* storage full/disabled */ }
}

export function checkAndUnlock(checks: { id: string; condition: boolean }[]): AchievementDef[] {
  const unlocked = getUnlocked()
  const newlyUnlocked: AchievementDef[] = []

  for (const { id, condition } of checks) {
    if (condition && !unlocked[id]) {
      unlocked[id] = true
      const def = ALL_ACHIEVEMENTS.find((a) => a.id === id)
      if (def) newlyUnlocked.push(def)
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlocked(unlocked)
  }

  return newlyUnlocked
}

export function syncBulkagachi(engineAchievements: Record<string, boolean>) {
  const unlocked = getUnlocked()
  let changed = false

  for (const [id, value] of Object.entries(engineAchievements)) {
    const globalId = `bulkagachi_${id}`
    if (value && !unlocked[globalId]) {
      unlocked[globalId] = true
      changed = true
    }
  }

  if (changed) {
    saveUnlocked(unlocked)
  }
}
