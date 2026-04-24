// lib/layout.ts
import { KnowledgeNode, KnowledgeEdge, Domain } from "./types"
import * as THREE from "three"

// ─────────────────────────────────────────────
// BRAIN ANATOMY MAPPING
//
// Real brain lobes → domain assignment:
//   Frontal lobe   (front-top)  → technology, math       [planning, logic]
//   Parietal lobe  (top-back)   → physics, cosmos        [spatial, abstract]
//   Temporal lobe  (sides)      → arts, psychology       [language, emotion]
//   Occipital lobe (back)       → philosophy, history    [deep memory]
//   Limbic (center-bottom)      → biology, economics     [survival, reward]
//
// Left hemisphere  → logic, language, sequence
// Right hemisphere → creativity, pattern, emotion
// ─────────────────────────────────────────────

interface BrainRegion {
  center: THREE.Vector3
  // Ellipsoid radii — how far nodes spread in each axis
  rx: number // left-right spread
  ry: number // up-down spread
  rz: number // front-back spread
  hemisphere: "left" | "right" | "both"
}

const BRAIN_REGIONS: Record<Domain, BrainRegion> = {
  // ── RIGHT HEMISPHERE (x > 0) ──
  technology: {
    center: new THREE.Vector3(2.8, 1.8, 2.5), // right frontal
    rx: 1.8,
    ry: 1.5,
    rz: 1.6,
    hemisphere: "right",
  },
  math: {
    center: new THREE.Vector3(2.2, 2.8, 0.5), // right parietal
    rx: 1.6,
    ry: 1.4,
    rz: 1.5,
    hemisphere: "right",
  },
  arts: {
    center: new THREE.Vector3(4.0, 0.2, -0.5), // right temporal
    rx: 1.5,
    ry: 1.6,
    rz: 1.8,
    hemisphere: "right",
  },
  cosmos: {
    center: new THREE.Vector3(2.0, 2.2, -2.2), // right parietal-occipital
    rx: 1.7,
    ry: 1.5,
    rz: 1.6,
    hemisphere: "right",
  },
  economics: {
    center: new THREE.Vector3(2.0, -1.5, 0.5), // right limbic
    rx: 1.4,
    ry: 1.2,
    rz: 1.3,
    hemisphere: "right",
  },

  // ── LEFT HEMISPHERE (x < 0) ──
  physics: {
    center: new THREE.Vector3(-2.5, 2.5, 0.0), // left parietal
    rx: 1.8,
    ry: 1.5,
    rz: 1.7,
    hemisphere: "left",
  },
  history: {
    center: new THREE.Vector3(-2.8, 0.5, -2.0), // left occipital-temporal
    rx: 1.6,
    ry: 1.4,
    rz: 1.6,
    hemisphere: "left",
  },
  philosophy: {
    center: new THREE.Vector3(-2.0, 1.0, -3.0), // left occipital
    rx: 1.5,
    ry: 1.3,
    rz: 1.5,
    hemisphere: "left",
  },
  psychology: {
    center: new THREE.Vector3(-3.8, 0.0, 0.0), // left temporal
    rx: 1.4,
    ry: 1.5,
    rz: 1.6,
    hemisphere: "left",
  },
  biology: {
    center: new THREE.Vector3(-1.8, -1.5, 0.5), // left limbic
    rx: 1.5,
    ry: 1.2,
    rz: 1.4,
    hemisphere: "left",
  },
}

// ─────────────────────────────────────────────
// BRAIN VOLUME CONSTRAINT
//
// The whole brain is a slightly flattened ellipsoid:
// (x/5.5)² + (y/4.0)² + (z/4.5)² ≤ 1
// Plus a small inter-hemispheric gap around x=0
// ─────────────────────────────────────────────
function isInsideBrain(x: number, y: number, z: number): boolean {
  // Main ellipsoid check
  const ellipsoid = (x / 5.5) ** 2 + (y / 4.0) ** 2 + (z / 4.5) ** 2

  // Flatten slightly at top and bottom (brains aren't perfect ellipsoids)
  const flattenY = y > 3.0 ? (y - 3.0) * 0.4 : 0

  return ellipsoid + flattenY <= 1.0
}

// Seeded deterministic random — fixed LCG
function seededRandom(seed: number): () => number {
  let s = (seed + 1) * 7919
  return () => {
    s = (s * 16807 + 1) % 2147483647
    return Math.abs(s / 2147483647)
  }
}

// ─────────────────────────────────────────────
// MAIN LAYOUT FUNCTION
// ─────────────────────────────────────────────
export function computeLayout(
  nodes: KnowledgeNode[],
  _edges: KnowledgeEdge[],
): Map<string, THREE.Vector3> {
  const positions = new Map<string, THREE.Vector3>()

  nodes.forEach((node, index) => {
    const rand = seededRandom(index * 7919)
    const region = BRAIN_REGIONS[node.domain]

    if (!region) {
      positions.set(node.id, new THREE.Vector3(0, 0, 0))
      return
    }

    // Try up to 20 candidate positions, pick first one inside brain volume
    // This is rejection sampling — simple and robust
    let placed = false
    for (let attempt = 0; attempt < 20; attempt++) {
      // Sample within the region's ellipsoid using spherical coords
      const acosInput = Math.max(-1, Math.min(1, 2 * rand() - 1))
      const phi = Math.acos(acosInput)
      const theta = rand() * Math.PI * 2

      // More important nodes → closer to region center (smaller radius)
      const importance =
        typeof node.importance === "number" ? node.importance : 0.5
      const spread = 0.3 + (1 - importance) * 0.7 // 0.3–1.0

      const rx = region.rx * spread
      const ry = region.ry * spread
      const rz = region.rz * spread

      const x = region.center.x + rx * Math.sin(phi) * Math.cos(theta)
      const y = region.center.y + ry * Math.sin(phi) * Math.sin(theta)
      const z = region.center.z + rz * Math.cos(phi)

      if (isNaN(x) || isNaN(y) || isNaN(z)) continue

      // Accept if inside brain volume
      if (isInsideBrain(x, y, z)) {
        positions.set(node.id, new THREE.Vector3(x, y, z))
        placed = true
        break
      }
    }

    // Fallback: place at region center if all attempts fail
    if (!placed) {
      positions.set(node.id, region.center.clone())
    }
  })

  return positions
}

// ─────────────────────────────────────────────
// BRAIN SURFACE GEOMETRY
// Returns vertices for a wireframe brain outline
// Used to render the brain shell in BrainShell.tsx
// ─────────────────────────────────────────────
export function getBrainShellGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const points: number[] = []

  // Generate points on the brain ellipsoid surface
  // We'll render these as a faint point cloud
  for (let i = 0; i < 3000; i++) {
    const phi = Math.acos(1 - 2 * Math.random())
    const theta = Math.random() * Math.PI * 2

    const x = 5.5 * Math.sin(phi) * Math.cos(theta)
    const y = 4.0 * Math.sin(phi) * Math.sin(theta)
    const z = 4.5 * Math.cos(phi)

    // Only add if actually inside our flatten constraint
    if (isInsideBrain(x * 0.98, y * 0.98, z * 0.98)) {
      points.push(x, y, z)
    }
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3))
  return geometry
}

// Domain color palette
export const DOMAIN_COLORS: Record<Domain, string> = {
  physics: "#4CC9F0",
  biology: "#80FFB8",
  math: "#E0E0FF",
  history: "#F9C74F",
  philosophy: "#9D4EDD",
  arts: "#F72585",
  technology: "#4361EE",
  cosmos: "#00F5D4",
  psychology: "#FF9F1C",
  economics: "#CBFF8C",
}

export function getDomainColor(domain: Domain): THREE.Color {
  return new THREE.Color(DOMAIN_COLORS[domain] ?? "#ffffff")
}
