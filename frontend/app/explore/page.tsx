// app/explore/page.tsx
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

export default function ExplorePage() {
  const setGraph = useStore((s) => s.setGraph)
  const orbitRef = useRef<any>(null)

  useEffect(() => {
    fetchGraph().then(setGraph).catch(console.error)
  }, [setGraph])

  const handleInteractStart = () => {
    if (orbitRef.current) orbitRef.current.autoRotate = false
  }

  const handleInteractEnd = () => {
    setTimeout(() => {
      if (orbitRef.current) orbitRef.current.autoRotate = true
    }, 3000)
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050508" }}>
      {/* Loading screen — covers canvas until graph loads */}
      <LoadingScreen />

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 22], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 0, 0]} intensity={1.5} color="#ffffff" />
        <pointLight position={[8, 8, 8]} intensity={0.8} color="#4CC9F0" />
        <pointLight position={[-8, -8, -8]} intensity={0.6} color="#F72585" />
        <pointLight position={[0, 10, -5]} intensity={0.5} color="#9D4EDD" />

        <Stars
          radius={80}
          depth={50}
          count={3000}
          factor={3}
          saturation={0.5}
          fade
          speed={0.3}
        />

        <Brain />

        <OrbitControls
          ref={orbitRef}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={5}
          maxDistance={50}
          autoRotate
          autoRotateSpeed={0.3}
          touches={{ ONE: 2, TWO: 1 }}
          onStart={handleInteractStart}
          onEnd={handleInteractEnd}
        />

        <EffectComposer>
          <Bloom
            intensity={0.6}
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
      </Canvas>

      {/* UI Overlay */}
      <StatsBar />
      <SearchBar />
      <Tooltip />
      <NodePanel />
      <DomainLegend />
      <ChatOverlay />
    </div>
  )
}
