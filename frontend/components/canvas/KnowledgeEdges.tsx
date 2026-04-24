// components/canvas/KnowledgeEdges.tsx
"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { KnowledgeEdge } from "@/lib/types"
import { useStore } from "@/store/useStore"

interface Props {
  edges: KnowledgeEdge[]
  positions: Map<string, THREE.Vector3>
  breathRef: React.MutableRefObject<number>
}

export default function KnowledgeEdges({ edges, positions, breathRef }: Props) {
  const selectedNode = useStore((s) => s.selectedNode)
  const highlightedNodes = useStore((s) => s.highlightedNodes)

  // Split edges into: connected to selected, highlighted by search, and rest
  const { activeEdges, dimEdges } = useMemo(() => {
    if (!selectedNode && highlightedNodes.size === 0) {
      return { activeEdges: edges, dimEdges: [] }
    }

    const active: KnowledgeEdge[] = []
    const dim: KnowledgeEdge[] = []

    edges.forEach((edge) => {
      const isConnected =
        selectedNode &&
        (edge.source === selectedNode.id || edge.target === selectedNode.id)
      const isHighlighted =
        highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target)

      if (isConnected || isHighlighted) {
        active.push(edge)
      } else {
        dim.push(edge)
      }
    })

    return { activeEdges: active, dimEdges: dim }
  }, [edges, selectedNode, highlightedNodes])

  // Build geometry for active edges
  const activeGeometry = useMemo(
    () => buildGeometry(activeEdges, positions),
    [activeEdges, positions],
  )

  // Build geometry for dimmed edges
  const dimGeometry = useMemo(
    () => buildGeometry(dimEdges, positions),
    [dimEdges, positions],
  )

  const activeMaterialRef = useRef<THREE.LineBasicMaterial>(null)
  const dimMaterialRef = useRef<THREE.LineBasicMaterial>(null)

  useFrame(() => {
    if (!activeMaterialRef.current || !dimMaterialRef.current) return
    const breath = breathRef.current
    // Active edges pulse with breathing
    activeMaterialRef.current.opacity = 0.7 + Math.sin(breath * 1.047) * 0.15
    // Dim edges are barely visible
    dimMaterialRef.current.opacity =
      selectedNode || highlightedNodes.size > 0 ? 0.04 : 0.18
  })

  return (
    <group>
      {/* Dimmed edges */}
      {dimGeometry.attributes.position && (
        <lineSegments geometry={dimGeometry}>
          <lineBasicMaterial
            ref={dimMaterialRef}
            color="#4a4a6a"
            transparent
            opacity={0.18}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {/* Active / highlighted edges */}
      {activeGeometry.attributes.position && (
        <lineSegments geometry={activeGeometry}>
          <lineBasicMaterial
            ref={activeMaterialRef}
            color="#9D4EDD"
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </lineSegments>
      )}
    </group>
  )
}

function buildGeometry(
  edges: KnowledgeEdge[],
  positions: Map<string, THREE.Vector3>,
): THREE.BufferGeometry {
  const points: number[] = []

  edges.forEach((edge) => {
    const source = positions.get(edge.source)
    const target = positions.get(edge.target)
    if (!source || !target) return
    if (
      isNaN(source.x) ||
      isNaN(source.y) ||
      isNaN(source.z) ||
      isNaN(target.x) ||
      isNaN(target.y) ||
      isNaN(target.z)
    )
      return

    points.push(source.x, source.y, source.z)
    points.push(target.x, target.y, target.z)
  })

  const geo = new THREE.BufferGeometry()
  if (points.length > 0) {
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3))
  }
  return geo
}
