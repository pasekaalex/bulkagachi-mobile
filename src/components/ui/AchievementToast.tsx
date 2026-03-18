import type { AchievementDef } from '../../lib/achievements'

interface AchievementToastProps {
  achievement: AchievementDef
  onDone: () => void
}

export function AchievementToast({ achievement, onDone }: AchievementToastProps) {
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-fade-in-up"
      onAnimationEnd={() => {
        setTimeout(onDone, 3000)
      }}
    >
      <div className="flex items-center gap-3 bg-gradient-to-r from-gold-DEFAULT to-gold-dark border-2 border-purple-DEFAULT rounded-xl px-5 py-3 shadow-[0_0_30px_rgba(255,215,0,0.6)]">
        <span className="text-2xl">{achievement.icon}</span>
        <div>
          <div className="text-xs text-purple-darker font-bold tracking-wider">UNLOCKED!</div>
          <div className="text-sm text-black font-bold font-[family-name:var(--font-display)]">{achievement.title}</div>
        </div>
      </div>
    </div>
  )
}
