"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { KnowledgeNode } from "@/lib/types"
import { DOMAIN_COLORS } from "@/lib/layout"
import { useStore } from "@/store/useStore"

interface Props {
  nodes: KnowledgeNode[]
  positions: Map<string, THREE.Vector3>
  breathRef: React.MutableRefObject<number>
}

// One component per node — simple, debuggable, guaranteed visible
function NodeSphere({
  node,
  position,
  index,
  breathRef,
}: {
  node: KnowledgeNode
  position: THREE.Vector3
  index: number
  breathRef: React.MutableRefObject<number>
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const setSelectedNode = useStore((s) => s.setSelectedNode)
  const setHoveredNode = useStore((s) => s.setHoveredNode)
  const selectedNode = useStore((s) => s.selectedNode)
  const highlightedNodes = useStore((s) => s.highlightedNodes)

  const color = useMemo(
    () => new THREE.Color(DOMAIN_COLORS[node.domain] ?? "#ffffff"),
    [node.domain],
  )

  const baseScale = 0.15 + node.importance * 0.18

  useFrame(() => {
    if (!meshRef.current) return
    const breath = breathRef.current
    const breathOffset = index * 0.08
    const breathScale = 1 + Math.sin(breath * 1.047 + breathOffset) * 0.08

    const isSelected = selectedNode?.id === node.id
    const isHighlighted = highlightedNodes.has(node.id)
    const highlightScale = isSelected ? 2.0 : isHighlighted ? 1.5 : 1.0

    const s = baseScale * breathScale * highlightScale
    meshRef.current.scale.set(s, s, s)
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        setSelectedNode(node)
      }}
      onPointerEnter={(e) => {
        e.stopPropagation()
        setHoveredNode(node)
      }}
      onPointerLeave={() => setHoveredNode(null)}
    >
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

export default function KnowledgeNodes({ nodes, positions, breathRef }: Props) {
  // Debug: log what we have
  console.log(
    "KnowledgeNodes rendering:",
    nodes.length,
    "nodes,",
    positions.size,
    "positions",
  )

  if (nodes.length === 0) {
    console.warn("No nodes to render")
    return null
  }

  return (
    <group>
      {nodes.map((node, index) => {
        const position = positions.get(node.id)
        if (!position) {
          console.warn("No position for node:", node.id)
          return null
        }
        return (
          <NodeSphere
            key={node.id}
            node={node}
            position={position}
            index={index}
            breathRef={breathRef}
          />
        )
      })}
    </group>
  )
}
