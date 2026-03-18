interface TitleScreenProps {
  title: string
  subtitle?: string
  instructions?: string[]
  onStart: () => void
}

export function TitleScreen({ title, subtitle, instructions, onStart }: TitleScreenProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-purple-darkest/95 to-black/95">
      <div className="text-center animate-fade-in-up">
        <h1 className="text-4xl sm:text-6xl font-bold text-gold-DEFAULT text-shadow-gold mb-4 animate-float font-[family-name:var(--font-display)]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg text-purple-DEFAULT mb-6">{subtitle}</p>
        )}
        {instructions && instructions.length > 0 && (
          <div className="mb-6 space-y-1">
            {instructions.map((inst, i) => (
              <p key={i} className="text-sm text-white/60">{inst}</p>
            ))}
          </div>
        )}
        <button
          onClick={onStart}
          className="px-10 py-4 bg-gradient-to-r from-gold-DEFAULT to-gold-dark border-3 border-purple-DEFAULT rounded-xl text-black text-xl font-bold hover:scale-110 transition-transform animate-pulse-glow cursor-pointer"
        >
          START GAME
        </button>
      </div>
    </div>
  )
}
