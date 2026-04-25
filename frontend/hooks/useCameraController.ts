// hooks/useCameraController.ts
import { useRef, useEffect } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { useStore } from "@/store/useStore"

const _nodeTarget = new THREE.Vector3()
const _cameraTarget = new THREE.Vector3()
const _cameraDirection = new THREE.Vector3()

export function useCameraController(positions: Map<string, THREE.Vector3>) {
  const { camera } = useThree()
  const controls = useThree(
    (state) => state.controls as OrbitControlsImpl | undefined,
  )
  const selectedNode = useStore((s) => s.selectedNode)
  const isAnimating = useRef(false)
  const cameraTarget = useRef<THREE.Vector3 | null>(null)
  const lookTarget = useRef<THREE.Vector3 | null>(null)

  // When selected node changes, set a new camera target
  useEffect(() => {
    if (!selectedNode) {
      isAnimating.current = false
      return
    }

    const nodePos = positions.get(selectedNode.id)
    if (!nodePos) return

    _nodeTarget.copy(nodePos)
    _cameraDirection.copy(camera.position).sub(_nodeTarget)
    if (_cameraDirection.lengthSq() < 0.0001) {
      _cameraDirection.set(0, 0, 1)
    }
    _cameraDirection.normalize()

    const currentDistance = camera.position.distanceTo(_nodeTarget)
    const targetDistance = THREE.MathUtils.clamp(currentDistance, 9, 16)

    _cameraTarget
      .copy(_nodeTarget)
      .addScaledVector(_cameraDirection, targetDistance)
    _cameraTarget.y += 0.8

    cameraTarget.current = _cameraTarget.clone()
    lookTarget.current = _nodeTarget.clone()
    isAnimating.current = true
  }, [camera, controls, selectedNode, positions])

  useFrame((_, delta) => {
    if (!isAnimating.current || !cameraTarget.current || !lookTarget.current) {
      return
    }
    if (!selectedNode) return

    const nodePos = positions.get(selectedNode.id)
    if (!nodePos) return

    lookTarget.current.copy(nodePos)

    const alpha = 1 - Math.exp(-delta * 4.2)
    camera.position.lerp(cameraTarget.current, alpha)

    if (controls) {
      controls.target.lerp(lookTarget.current, alpha)
      controls.update()
    } else {
      camera.lookAt(lookTarget.current)
    }

    // Stop animating when close enough
    const cameraDistance = camera.position.distanceTo(cameraTarget.current)
    const targetDistance = controls
      ? controls.target.distanceTo(lookTarget.current)
      : 0

    if (cameraDistance < 0.03 && targetDistance < 0.03) {
      isAnimating.current = false
    }
  })
}
