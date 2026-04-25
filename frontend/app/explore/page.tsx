"use client"

import { useEffect, useRef } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Stars } from "@react-three/drei"
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
} from "@react-three/postprocessing"
import { BlendFunction } from "postprocessing"
import * as THREE from "three"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import Brain from "@/components/canvas/Brain"
import Tooltip from "@/components/ui/Tooltip"
import NodePanel from "@/components/ui/NodePanel"
import SearchBar from "@/components/ui/SearchBar"
import ChatOverlay from "@/components/ui/ChatOverlay"
import DomainLegend from "@/components/ui/DomainLegend"
import StatsBar from "@/components/ui/StatsBar"
import LoadingScreen from "@/components/ui/LoadingScreen"
import { useStore } from "@/store/useStore"
import { fetchGraph } from "@/lib/api"
import { useIsMobile } from "@/hooks/useIsMobile"

export default function ExplorePage() {
  const setGraph = useStore((s) => s.setGraph)
  const selectedNode = useStore((s) => s.selectedNode)
  const orbitRef = useRef<OrbitControlsImpl | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    fetchGraph().then(setGraph).catch(console.error)
  }, [setGraph])

  const handleInteractStart = () => {
    if (orbitRef.current) orbitRef.current.autoRotate = false
  }

  const handleInteractEnd = () => {
    setTimeout(() => {
      if (orbitRef.current && !selectedNode) orbitRef.current.autoRotate = true
    }, 3000)
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        background: "#050508",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <LoadingScreen />

      <Canvas
        camera={{
          position: isMobile ? [0, 0, 28] : [0, 0, 22],
          fov: isMobile ? 70 : 60,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: !isMobile, alpha: false }}
        dpr={isMobile ? 1 : [1, 2]}
        style={{ touchAction: "none" }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 0, 0]} intensity={1.5} color="#ffffff" />
        <pointLight position={[8, 8, 8]} intensity={0.8} color="#4CC9F0" />
        <pointLight position={[-8, -8, -8]} intensity={0.6} color="#F72585" />
        <pointLight position={[0, 10, -5]} intensity={0.5} color="#9D4EDD" />

        <Stars
          radius={80}
          depth={50}
          count={isMobile ? 600 : 3000}
          factor={3}
          saturation={0.5}
          fade
          speed={0.3}
        />

        <Brain />

        <OrbitControls
          ref={orbitRef}
          makeDefault
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={isMobile ? 0.7 : 0.5}
          zoomSpeed={isMobile ? 0.6 : 0.8}
          minDistance={isMobile ? 8 : 5}
          maxDistance={isMobile ? 60 : 50}
          autoRotate={!selectedNode}
          autoRotateSpeed={0.3}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
          onStart={handleInteractStart}
          onEnd={handleInteractEnd}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.8}
        />

        {!isMobile && (
          <EffectComposer>
            <Bloom
              intensity={0.5}
              luminanceThreshold={0.4}
              luminanceSmoothing={0.9}
              blendFunction={BlendFunction.ADD}
            />
            <ChromaticAberration
              offset={[0.0005, 0.0005]}
              blendFunction={BlendFunction.NORMAL}
              radialModulation={false}
              modulationOffset={0}
            />
          </EffectComposer>
        )}
      </Canvas>

      <StatsBar />
      <SearchBar />
      {!isMobile && <Tooltip />}
      <NodePanel />
      <DomainLegend />
      <ChatOverlay />
    </div>
  )
}
