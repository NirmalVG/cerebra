// store/useStore.ts
import { create } from "zustand"
import { KnowledgeNode, KnowledgeGraph } from "@/lib/types"

interface AppState {
  // Graph data
  graph: KnowledgeGraph | null
  setGraph: (graph: KnowledgeGraph) => void

  dynamicNodes: any[]
  addDynamicNode: (node: any) => void

  // Selection
  selectedNode: KnowledgeNode | null
  hoveredNode: KnowledgeNode | null
  setSelectedNode: (node: KnowledgeNode | null) => void
  setHoveredNode: (node: KnowledgeNode | null) => void

  // Search / Query
  searchQuery: string
  highlightedNodes: Set<string> // node ids currently lit up
  setSearchQuery: (q: string) => void
  setHighlightedNodes: (ids: string[]) => void

  // UI
  chatOpen: boolean
  toggleChat: () => void

  // Camera
  cameraTarget: [number, number, number] | null
  setCameraTarget: (target: [number, number, number] | null) => void
}

export const useStore = create<AppState>((set) => ({
  graph: null,
  setGraph: (graph) => set({ graph }),

  selectedNode: null,
  hoveredNode: null,
  setSelectedNode: (node) => set({ selectedNode: node }),
  setHoveredNode: (node) => set({ hoveredNode: node }),

  searchQuery: "",
  highlightedNodes: new Set(),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setHighlightedNodes: (ids) => set({ highlightedNodes: new Set(ids) }),

  chatOpen: false,
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),

  cameraTarget: null,
  setCameraTarget: (target) => set({ cameraTarget: target }),

  dynamicNodes: [],
  addDynamicNode: (node) =>
    set((s) => ({
      dynamicNodes: [...s.dynamicNodes, node],
    })),
}))
