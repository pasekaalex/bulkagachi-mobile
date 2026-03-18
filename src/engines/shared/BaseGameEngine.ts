import * as THREE from 'three'

export interface GameCallbacks {
  onScoreChange?: (score: number) => void
  onStateChange?: (state: 'title' | 'playing' | 'gameover' | 'win' | 'levelcomplete') => void
  onHealthChange?: (health: number) => void
  onLivesChange?: (lives: number) => void
  onHeightChange?: (height: number) => void
  onComboChange?: (combo: number) => void
  onMoneyChange?: (money: number) => void
  onDistanceChange?: (distance: number) => void
  onRageChange?: (rage: number) => void
  onWaveChange?: (wave: number) => void
  onHighScoreChange?: (highScore: number) => void
  onOrbsChange?: (orbs: number) => void
  onSchmegChange?: (count: number) => void
  onRageModeChange?: (rageMode: boolean) => void
  onBossHealthChange?: (health: {current: number, max: number} | null) => void
  onProgressChange?: (progress: { x: number, goalX: number, percent: number }) => void
}

export abstract class BaseGameEngine {
  protected scene: THREE.Scene
  protected camera!: THREE.Camera
  protected renderer: THREE.WebGLRenderer
  protected clock: THREE.Clock
  protected animationFrameId = 0
  protected disposed = false
  protected callbacks: GameCallbacks
  protected container: HTMLElement

  constructor(container: HTMLElement, callbacks: GameCallbacks = {}) {
    this.container = container
    this.callbacks = callbacks
    this.scene = new THREE.Scene()
    this.clock = new THREE.Clock()
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    const isMobile = container.clientWidth < 768
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))
    container.appendChild(this.renderer.domElement)

    this._onResize = this._onResize.bind(this)
    window.addEventListener('resize', this._onResize)
  }

  abstract createScene(): void
  abstract update(delta: number): void

  init(): void {
    this.createScene()
    this.animate()
  }

  protected animate = (): void => {
    if (this.disposed) return
    this.animationFrameId = requestAnimationFrame(this.animate)
    const delta = this.clock.getDelta()
    this.update(delta)
    this.renderer.render(this.scene, this.camera)
  }

  private _onResize(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (!width || !height) return

    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
    }

    this.renderer.setSize(width, height)
    this.onResize(width, height)
  }

  protected onResize(_width: number, _height: number): void {
    // Override in subclasses for custom resize behavior
  }

  /** Remove an object from the scene and dispose its geometries/materials */
  protected disposeObject(obj: THREE.Object3D): void {
    this.scene.remove(obj)
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        for (const m of materials) {
          m?.dispose()
        }
      }
    })
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.animationFrameId)
    window.removeEventListener('resize', this._onResize)

    // Dispose scene background texture
    if (this.scene.background instanceof THREE.Texture) {
      this.scene.background.dispose()
    }

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const m of materials) {
          if (!m) continue
          // Dispose textures attached to materials
          if (m.map) m.map.dispose()
          if (m.emissiveMap) m.emissiveMap.dispose()
          if (m.normalMap) m.normalMap.dispose()
          if (m.roughnessMap) m.roughnessMap.dispose()
          if (m.metalnessMap) m.metalnessMap.dispose()
          m.dispose()
        }
      }
    })

    this.renderer.dispose()
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }
}
