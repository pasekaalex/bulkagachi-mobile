export class AudioManager {
  private bgm: HTMLAudioElement | null = null
  private sfxElements: Map<string, HTMLAudioElement> = new Map()
  private audioContext: AudioContext | null = null
  private muted = false

  loadBGM(url: string, volume = 0.3): void {
    this.bgm = new Audio(url)
    this.bgm.loop = true
    this.bgm.volume = volume
  }

  playBGM(): void {
    if (this.bgm && !this.muted) {
      this.bgm.play().catch(() => {})
    }
  }

  stopBGM(): void {
    if (this.bgm) {
      this.bgm.pause()
      this.bgm.currentTime = 0
    }
  }

  pauseBGM(): void {
    this.bgm?.pause()
  }

  loadSFX(name: string, url: string, volume = 0.5): void {
    const audio = new Audio(url)
    audio.volume = volume
    this.sfxElements.set(name, audio)
  }

  playSFX(name: string): void {
    if (this.muted) return
    const audio = this.sfxElements.get(name)
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(() => {})
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    return this.audioContext
  }

  synthTone(frequency: number, duration: number, type: OscillatorType = 'square', volume = 0.3): void {
    if (this.muted) return
    try {
      const ctx = this.getAudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(frequency, ctx.currentTime)
      gain.gain.setValueAtTime(volume, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch {
      // Audio context not available
    }
  }

  synthSweep(startFreq: number, endFreq: number, duration: number, type: OscillatorType = 'square', volume = 0.3): void {
    if (this.muted) return
    try {
      const ctx = this.getAudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(startFreq, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration)
      gain.gain.setValueAtTime(volume, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch {
      // Audio context not available
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.bgm) {
      this.bgm.muted = muted
    }
  }

  isMuted(): boolean {
    return this.muted
  }

  dispose(): void {
    this.stopBGM()
    if (this.bgm) this.bgm.src = ''
    this.bgm = null
    this.sfxElements.forEach((audio) => {
      audio.pause()
      audio.src = ''
    })
    this.sfxElements.clear()
    this.audioContext?.close()
    this.audioContext = null
  }
}
