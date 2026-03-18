import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarketData } from '../hooks/useMarketData'
import { useBulkBalance } from '../hooks/useBulkBalance'
import { Modal } from '../components/ui/Modal'
import { SoundToggle } from '../components/layout/SoundToggle'
import { WalletButton } from '../components/ui/WalletButton'
import { CONTRACT_ADDRESS, API_URLS, SOCIAL_LINKS, ASSET_PATHS, GAMES } from '../constants'

export default function Landing() {
  const [gamesMenuOpen, setGamesMenuOpen] = useState(false)
  const [socialsMenuOpen, setSocialsMenuOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const videoRef = useRef<HTMLVideoElement>(null)
  const navigate = useNavigate()
  const { marketCap } = useMarketData()
  const { isHolder } = useBulkBalance()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev
      if (videoRef.current) videoRef.current.muted = !next
      return next
    })
  }, [])

  const copyContract = useCallback(() => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS).then(() => {
      alert('Contract address copied!')
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-5 relative overflow-hidden">
      {/* Purple oozing cursor effect */}
      <div
        className="pointer-events-none fixed w-80 h-80 rounded-full opacity-30 blur-[100px] transition-all duration-300 ease-out z-[2]"
        style={{
          background: 'radial-gradient(circle, rgba(155,77,202,0.8) 0%, rgba(155,77,202,0.4) 40%, transparent 70%)',
          left: cursorPos.x - 160,
          top: cursorPos.y - 160,
        }}
      />

      {/* Background Video */}
      <video
        ref={videoRef}
        src={ASSET_PATHS.video.bulk}
        className="fixed top-[62.5%] left-1/2 -translate-x-1/2 -translate-y-1/2 scale-75 min-w-full min-h-full w-auto h-auto z-[1] opacity-30 object-cover"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Mobile Top Banner */}
      <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center p-2.5 bg-gradient-to-b from-black/95 via-black/85 to-transparent md:hidden">
        <video
          src={ASSET_PATHS.video.title}
          className="w-[30%] max-w-[30%] animate-scale-in"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
      </div>

      {/* Wallet Button */}
      <div className="fixed top-3 right-3 z-[99] hidden md:block">
        <WalletButton />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-[600px] w-full flex flex-col items-center gap-6 pt-[120px] md:pt-0">
        {/* Desktop Title */}
        <video
          src={ASSET_PATHS.video.title}
          className="hidden md:block w-1/3 max-w-[33.33%] -mt-8 animate-scale-in"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />

        {/* Contract Address */}
        <code
          onClick={copyContract}
          className="font-mono text-white text-sm sm:text-base break-all py-3.5 px-4.5 border-2 border-purple-DEFAULT rounded-lg cursor-pointer transition-all bg-bulk-bg/40 shadow-[0_0_20px_rgba(155,77,202,0.5),0_0_40px_rgba(155,77,202,0.2)] hover:border-gold-DEFAULT hover:bg-purple-DEFAULT/20 hover:shadow-[0_0_35px_rgba(255,215,0,0.6),0_0_60px_rgba(155,77,202,0.5)] hover:scale-[1.04] animate-pulse-glow relative overflow-hidden"
          title="Click to copy"
        >
          <span className="relative z-10">{CONTRACT_ADDRESS}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-DEFAULT/10 to-transparent animate-shimmer" />
        </code>

        {/* Mobile Wallet Button */}
        <div className="md:hidden">
          <WalletButton />
        </div>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-5">
          <a
            href={API_URLS.jupiterSwap}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 py-4 px-6 w-[300px] bg-gradient-to-br from-gold-DEFAULT to-gold-dark border-3 border-purple-DEFAULT rounded-xl text-black font-bold text-base no-underline font-[family-name:var(--font-display)] shadow-[0_0_30px_rgba(255,215,0,0.6),0_0_60px_rgba(155,77,202,0.4)] transition-all animate-pulse-glow min-h-[44px] hover:scale-110 hover:-rotate-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            BUY NOW
          </a>

          <button
            onClick={() => setGamesMenuOpen(true)}
            className="flex items-center justify-center gap-3 py-4 px-6 w-[300px] bg-gradient-to-br from-purple-DEFAULT to-purple-dark border-3 border-gold-DEFAULT rounded-xl text-white font-bold text-base font-[family-name:var(--font-display)] shadow-[0_0_30px_rgba(155,77,202,0.6),0_0_60px_rgba(255,215,0,0.3)] transition-all animate-pulse-glow min-h-[44px] cursor-pointer hover:scale-110 hover:rotate-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
            PLAY GAMES
          </button>

          <button
            onClick={() => navigate('/achievements')}
            className="flex items-center justify-center gap-3 py-4 px-6 w-[300px] bg-gradient-to-br from-purple-DEFAULT to-purple-dark border-3 border-gold-DEFAULT rounded-xl text-white font-bold text-base font-[family-name:var(--font-display)] shadow-[0_0_30px_rgba(155,77,202,0.6),0_0_60px_rgba(255,215,0,0.3)] transition-all animate-pulse-glow min-h-[44px] cursor-pointer hover:scale-110 hover:rotate-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z" />
              <path d="M4 22h16" />
              <path d="M10 22V2h4v20" />
              <path d="M6 9h12v4a8 8 0 0 1-12 0V9z" />
            </svg>
            ACHIEVEMENTS
          </button>

          <button
            onClick={() => navigate('/leaderboard')}
            className="flex items-center justify-center gap-3 py-4 px-6 w-[300px] bg-gradient-to-br from-purple-DEFAULT to-purple-dark border-3 border-gold-DEFAULT rounded-xl text-white font-bold text-base font-[family-name:var(--font-display)] shadow-[0_0_30px_rgba(155,77,202,0.6),0_0_60px_rgba(255,215,0,0.3)] transition-all animate-pulse-glow min-h-[44px] cursor-pointer hover:scale-110 hover:rotate-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            LEADERBOARD
          </button>

          <button
            onClick={() => setSocialsMenuOpen(true)}
            className="flex items-center justify-center gap-3 py-4 px-6 w-[300px] bg-gradient-to-br from-purple-DEFAULT to-purple-dark border-3 border-gold-DEFAULT rounded-xl text-white font-bold text-base font-[family-name:var(--font-display)] shadow-[0_0_30px_rgba(155,77,202,0.6),0_0_60px_rgba(255,215,0,0.3)] transition-all animate-pulse-glow min-h-[44px] cursor-pointer hover:scale-110 hover:rotate-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5z" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            SOCIALS
          </button>
        </div>

        {/* Market Cap */}
        <a
          href={SOCIAL_LINKS.dexScreener}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 py-3.5 px-5 bg-gradient-to-r from-bulk-bg to-bulk-bg-dark border-2 border-purple-DEFAULT/60 rounded-lg text-white text-base shadow-[0_0_15px_rgba(155,77,202,0.4)] whitespace-nowrap animate-fade-in-up no-underline hover:border-purple-DEFAULT hover:shadow-[0_0_25px_rgba(155,77,202,0.6)] transition-all hover:scale-[1.02]"
        >
          <span className="text-white/70 text-sm mr-1">MARKET CAP:</span>
          <span className="font-bold font-mono text-xl">${marketCap}</span>
        </a>
      </div>

      {/* Games Menu Modal - Dynamic Visual */}
      <Modal open={gamesMenuOpen} onClose={() => setGamesMenuOpen(false)} title="SELECT GAME">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[80vh] overflow-y-auto p-4 mt-2">
          {GAMES.map((game, index) => {
            const isLocked = (game.isLocked && !isHolder)

            return (
              <button
                key={game.path}
                onClick={() => {
                  if (isLocked) return
                  setGamesMenuOpen(false)
                  navigate(game.path)
                }}
                disabled={isLocked}
                className={`group relative overflow-hidden rounded-xl border-3 border-gold-DEFAULT transition-all duration-300 ${
                  isLocked
                    ? 'opacity-50 cursor-not-allowed border-purple-DEFAULT/50'
                    : 'cursor-pointer hover:scale-105 hover:shadow-[0_0_40px_rgba(255,215,0,0.8)]'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Cover Image Background */}
                {game.coverImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <img
                      src={game.coverImage}
                      alt={game.name}
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  </div>
                )}

                {/* Fallback colored background if no cover */}
                {!game.coverImage && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-DEFAULT to-purple-dark" />
                )}

                {/* Locked Overlay */}
                {isLocked && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 text-white/50">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                )}

                {/* Content */}
                <div className="relative p-3 flex flex-col items-start justify-end h-56 sm:h-52 lg:h-56 text-left">
                  <h3 className={`font-bold text-lg sm:text-xl font-[family-name:var(--font-display)] ${
                    isLocked ? 'text-white/50' : 'text-white drop-shadow-lg'
                  }`}>
                    {game.name}
                  </h3>
                  <p className={`text-xs sm:text-sm ${isLocked ? 'text-white/30' : 'text-white/80'}`}>
                    {game.description}
                  </p>
                  {isLocked && (
                    <span className="text-xs text-gold-DEFAULT/70 font-bold mt-2">
                      HOLD 10K $BULK
                    </span>
                  )}
                  {!isLocked && (
                    <span className="text-xs text-gold-DEFAULT font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      ▶ PLAY NOW
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </Modal>

      {/* Socials Menu Modal */}
      <Modal open={socialsMenuOpen} onClose={() => setSocialsMenuOpen(false)} title="SOCIALS">
        <div className="flex flex-col gap-4">
          <a
            href={SOCIAL_LINKS.dexScreener}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-purple-DEFAULT to-purple-dark border-3 border-gold-DEFAULT rounded-xl text-white font-bold text-base font-[family-name:var(--font-display)] shadow-[0_0_30px_rgba(155,77,202,0.6)] transition-all min-h-[44px] hover:scale-105 no-underline"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 17" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            DEXSCREENER
          </a>
          <a
            href={SOCIAL_LINKS.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-purple-DEFAULT to-purple-dark border-3 border-gold-DEFAULT rounded-xl text-white font-bold text-base font-[family-name:var(--font-display)] shadow-[0_0_30px_rgba(155,77,202,0.6)] transition-all min-h-[44px] hover:scale-105 no-underline"
          >
            <span className="text-xl">&#120143;</span>
            TWITTER / X
          </a>
          <a
            href={SOCIAL_LINKS.community}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-purple-DEFAULT to-purple-dark border-3 border-gold-DEFAULT rounded-xl text-white font-bold text-base font-[family-name:var(--font-display)] shadow-[0_0_30px_rgba(155,77,202,0.6)] transition-all min-h-[44px] hover:scale-105 no-underline"
          >
            X COMMUNITY
          </a>
        </div>
      </Modal>

      {/* Sound Toggle */}
      <SoundToggle soundOn={soundOn} onToggle={toggleSound} />
    </div>
  )
}
