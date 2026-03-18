import * as THREE from 'three'

export interface Particle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  life: number
  maxLife: number
}

export class ParticleSystem {
  private particles: Particle[] = []
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  emit(
    position: THREE.Vector3,
    count: number,
    options: {
      color?: number
      size?: number
      speed?: number
      life?: number
      spread?: number
    } = {},
  ): void {
    const {
      color = 0xff6600,
      size = 3,
      speed = 5,
      life = 50,
      spread = 1,
    } = options

    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(size, size, size)
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(position)

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * speed * spread,
        Math.random() * speed,
        (Math.random() - 0.5) * speed * spread,
      )

      this.scene.add(mesh)
      this.particles.push({ mesh, velocity, life, maxLife: life })
    }
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.mesh.position.add(p.velocity)
      p.velocity.y -= 0.15
      p.life--

      const mat = p.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = p.life / p.maxLife

      p.mesh.rotation.x += 0.1
      p.mesh.rotation.y += 0.1

      if (p.life <= 0) {
        this.scene.remove(p.mesh)
        p.mesh.geometry.dispose()
        ;(p.mesh.material as THREE.Material).dispose()
        this.particles.splice(i, 1)
      }
    }
  }

  clear(): void {
    for (const p of this.particles) {
      this.scene.remove(p.mesh)
      p.mesh.geometry.dispose()
      ;(p.mesh.material as THREE.Material).dispose()
    }
    this.particles = []
  }

  get count(): number {
    return this.particles.length
  }
}
