// hooks/useCameraController.ts
import { useRef, useEffect } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useStore } from "@/store/useStore"

const _targetPosition = new THREE.Vector3()
const _currentLookAt = new THREE.Vector3()
const _desiredPosition = new THREE.Vector3()

export function useCameraController(positions: Map<string, THREE.Vector3>) {
  const { camera } = useThree()
  const selectedNode = useStore((s) => s.selectedNode)
  const isAnimating = useRef(false)
  const targetPos = useRef<THREE.Vector3 | null>(null)

  // When selected node changes, set a new camera target
  useEffect(() => {
    if (!selectedNode) return
    const nodePos = positions.get(selectedNode.id)
    if (!nodePos) return

    // Position camera offset from the node
    // We pull back along the current camera direction so the node
    // is centered but we don't fly INTO it
    const offset = new THREE.Vector3(0, 1.5, 6)
    targetPos.current = nodePos.clone().add(offset)
    isAnimating.current = true
  }, [selectedNode, positions])

  useFrame((state, delta) => {
    if (!isAnimating.current || !targetPos.current) return
    if (!selectedNode) return

    const nodePos = positions.get(selectedNode.id)
    if (!nodePos) return

    // Lerp camera position toward target
    // 0.06 = smooth, 0.15 = snappier
    camera.position.lerp(targetPos.current, delta * 4)

    // Lerp look-at toward the node
    _currentLookAt.set(0, 0, -1).applyQuaternion(camera.quaternion)
    _targetPosition.copy(nodePos)

    const currentLookAtWorld = camera.position.clone().add(_currentLookAt)
    currentLookAtWorld.lerp(_targetPosition, delta * 4)
    camera.lookAt(currentLookAtWorld)

    // Stop animating when close enough
    const dist = camera.position.distanceTo(targetPos.current)
    if (dist < 0.05) {
      isAnimating.current = false
    }
  })
}
