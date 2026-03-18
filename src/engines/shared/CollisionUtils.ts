import * as THREE from 'three'

export function checkAABBCollision(
  ax: number, ay: number,
  bx: number, by: number,
  widthThreshold: number,
  heightThreshold: number,
): boolean {
  return (
    Math.abs(ax - bx) < widthThreshold &&
    Math.abs(ay - by) < heightThreshold
  )
}

export function checkBox3Collision(
  a: THREE.Object3D,
  b: THREE.Object3D,
): boolean {
  const boxA = new THREE.Box3().setFromObject(a)
  const boxB = new THREE.Box3().setFromObject(b)
  return boxA.intersectsBox(boxB)
}

export function checkDistance2D(
  ax: number, az: number,
  bx: number, bz: number,
  threshold: number,
): boolean {
  const dx = ax - bx
  const dz = az - bz
  return dx * dx + dz * dz < threshold * threshold
}

export function checkLaneCollision(
  playerX: number,
  objectX: number,
  objectZ: number,
  laneThreshold: number,
  zMin: number,
  zMax: number,
): boolean {
  return (
    Math.abs(playerX - objectX) < laneThreshold &&
    objectZ > zMin &&
    objectZ < zMax
  )
}
