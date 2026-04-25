// components/canvas/BrainShell.tsx
"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { getBrainShellGeometry } from "@/lib/layout"

export default function BrainShell() {
  const materialRef = useRef<THREE.PointsMaterial>(null)
  const { viewport } = useThree()

  // Detect mobile by viewport
  const isMobile = viewport.width < 768

  // Shell geometry — generated once
  const geometry = useMemo(() => getBrainShellGeometry(), [])

  // Slowly pulse opacity
  useFrame(({ clock }) => {
    if (!materialRef.current) return
    // Higher base opacity and pulse on mobile for visibility
    if (isMobile) {
      materialRef.current.opacity =
        0.12 + Math.sin(clock.elapsedTime * 0.5) * 0.04
    } else {
      materialRef.current.opacity =
        0.04 + Math.sin(clock.elapsedTime * 0.5) * 0.015
    }
  })

  return (
    <points geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        color="#9D4EDD"
        size={isMobile ? 0.12 : 0.05}
        transparent
        opacity={isMobile ? 0.12 : 0.05}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
