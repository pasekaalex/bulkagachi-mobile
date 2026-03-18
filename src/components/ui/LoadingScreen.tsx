interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-purple-darkest">
      <div className="text-4xl font-bold text-gold-DEFAULT text-shadow-gold animate-pulse font-[family-name:var(--font-display)] mb-4">
        BULK
      </div>
      <div className="w-48 h-2 bg-purple-darker rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-DEFAULT to-gold-DEFAULT rounded-full animate-shimmer" style={{ width: '60%', backgroundSize: '200% 100%' }} />
      </div>
      <p className="text-purple-DEFAULT/70 text-sm mt-3">{message}</p>
    </div>
  )
}
