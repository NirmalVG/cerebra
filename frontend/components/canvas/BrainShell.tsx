// components/canvas/BrainShell.tsx
"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { getBrainShellGeometry } from "@/lib/layout"

export default function BrainShell() {
  const materialRef = useRef<THREE.PointsMaterial>(null)

  // Shell geometry — generated once
  const geometry = useMemo(() => getBrainShellGeometry(), [])

  // Slowly pulse opacity
  useFrame(({ clock }) => {
    if (!materialRef.current) return
    materialRef.current.opacity =
      0.04 + Math.sin(clock.elapsedTime * 0.5) * 0.015
  })

  return (
    <points geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        color="#9D4EDD"
        size={0.05}
        transparent
        opacity={0.05}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
