import { BackButton } from '../components/layout/BackButton'

export default function Soon() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-purple-darkest text-white">
      <BackButton />
      <h1 className="text-5xl font-bold text-gold-DEFAULT text-shadow-gold animate-float font-[family-name:var(--font-display)]">
        COMING SOON
      </h1>
      <p className="text-purple-DEFAULT mt-4">Something big is being bulked up...</p>
    </div>
  )
}
