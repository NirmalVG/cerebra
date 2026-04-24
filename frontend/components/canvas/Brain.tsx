// components/canvas/Brain.tsx
import { useCameraController } from "@/hooks/useCameraController"
import { computeLayout } from "@/lib/layout"
import { useStore } from "@/store/useStore"
import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import BrainShell from "./BrainShell"
import KnowledgeEdges from "./KnowledgeEdges"
import KnowledgeNodes from "./KnowledgeNodes"

export default function Brain() {
  const graph = useStore((s) => s.graph)
  const dynamicNodes = useStore((s) => s.dynamicNodes)
  const breathRef = useRef(0)

  const allNodes = useMemo(() => {
    if (!graph) return []
    return [...graph.nodes, ...dynamicNodes]
  }, [graph, dynamicNodes])

  const positions = useMemo(() => {
    if (!graph) return new Map()
    return computeLayout(allNodes, graph.edges)
  }, [allNodes, graph])

  useFrame((_, delta) => {
    breathRef.current += delta
  })
  useCameraController(positions)

  if (!graph || positions.size === 0) return null

  return (
    <group>
      <BrainShell />
      <KnowledgeEdges
        edges={graph.edges}
        positions={positions}
        breathRef={breathRef}
      />
      <KnowledgeNodes
        nodes={allNodes}
        positions={positions}
        breathRef={breathRef}
      />
      {/* Newly spawned dynamic nodes get a dramatic entrance ring */}
      {dynamicNodes.map((node) => {
        const pos = positions.get(node.id)
        if (!pos) return null
        return <SpawnRing key={node.id} position={pos} />
      })}
    </group>
  )
}

// Pulsing ring that plays once when a new node spawns
function SpawnRing({ position }: { position: THREE.Vector3 }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const startTime = useRef(Date.now())

  useFrame(() => {
    if (!meshRef.current) return
    const elapsed = (Date.now() - startTime.current) / 1000
    const scale = 1 + elapsed * 3
    const opacity = Math.max(0, 1 - elapsed * 0.8)
    meshRef.current.scale.set(scale, scale, scale)
    ;(meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity
  })

  return (
    <mesh ref={meshRef} position={position}>
      <ringGeometry args={[0.3, 0.35, 32]} />
      <meshBasicMaterial
        color="#00F5D4"
        transparent
        opacity={1}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
