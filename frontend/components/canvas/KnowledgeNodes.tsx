"use client"

import { useCallback, useMemo, useRef } from "react"
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
  setNodeRef,
}: {
  node: KnowledgeNode
  position: THREE.Vector3
  setNodeRef: (id: string, mesh: THREE.Mesh | null) => void
}) {
  const setSelectedNode = useStore((s) => s.setSelectedNode)
  const setHoveredNode = useStore((s) => s.setHoveredNode)

  const color = useMemo(
    () => new THREE.Color(DOMAIN_COLORS[node.domain] ?? "#ffffff"),
    [node.domain],
  )

  return (
    <mesh
      ref={(mesh) => setNodeRef(node.id, mesh)}
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
  const selectedNode = useStore((s) => s.selectedNode)
  const highlightedNodes = useStore((s) => s.highlightedNodes)
  const meshRefs = useRef(new Map<string, THREE.Mesh>())

  const animationData = useMemo(
    () =>
      nodes.map((node, index) => ({
        id: node.id,
        baseScale: 0.15 + node.importance * 0.18,
        breathOffset: index * 0.08,
      })),
    [nodes],
  )

  const setNodeRef = useCallback((id: string, mesh: THREE.Mesh | null) => {
    if (mesh) {
      meshRefs.current.set(id, mesh)
    } else {
      meshRefs.current.delete(id)
    }
  }, [])

  useFrame(() => {
    const breath = breathRef.current
    const selectedId = selectedNode?.id

    for (const node of animationData) {
      const mesh = meshRefs.current.get(node.id)
      if (!mesh) continue

      const breathScale =
        1 + Math.sin(breath * 1.047 + node.breathOffset) * 0.08
      const isSelected = selectedId === node.id
      const isHighlighted = highlightedNodes.has(node.id)
      const highlightScale = isSelected ? 2.0 : isHighlighted ? 1.5 : 1.0
      const scale = node.baseScale * breathScale * highlightScale

      mesh.scale.setScalar(scale)
    }
  })

  if (nodes.length === 0) {
    return null
  }

  return (
    <group>
      {nodes.map((node) => {
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
            setNodeRef={setNodeRef}
          />
        )
      })}
    </group>
  )
}
