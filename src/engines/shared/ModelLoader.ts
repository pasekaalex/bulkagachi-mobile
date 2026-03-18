import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export interface LoadedModel {
  scene: THREE.Group
  mixer: THREE.AnimationMixer | null
  animations: THREE.AnimationClip[]
}

export function loadGLBModel(
  url: string,
  targetSize: number,
): Promise<LoadedModel> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = targetSize / maxDim
        model.scale.set(scale, scale, scale)

        const center = box.getCenter(new THREE.Vector3())
        model.position.set(
          -center.x * scale,
          -box.min.y * scale,
          -center.z * scale,
        )

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })

        let mixer: THREE.AnimationMixer | null = null
        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model)
          gltf.animations.forEach((clip) => {
            mixer!.clipAction(clip).play()
          })
        }

        resolve({ scene: model, mixer, animations: gltf.animations })
      },
      undefined,
      (error) => reject(error),
    )
  })
}

export function createFallbackModel(
  size: number,
  color: number = 0x9b4dca,
): THREE.Group {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(size, size * 1.5, size),
    new THREE.MeshStandardMaterial({ color }),
  )
  body.position.y = size * 0.75
  group.add(body)

  const eyeGeo = new THREE.SphereGeometry(size * 0.12)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
  leftEye.position.set(-size * 0.2, size * 1.2, size * 0.5)
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
  rightEye.position.set(size * 0.2, size * 1.2, size * 0.5)
  group.add(leftEye, rightEye)

  return group
}
