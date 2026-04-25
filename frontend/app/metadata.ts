// app/metadata.ts
import type { Metadata } from "next"

export const siteConfig = {
  name: "Cerebra",
  description:
    "Explore the universe of human knowledge as a living 3D neural network",
  url: "https://cerebra.ai",
  ogImage: "https://cerebra.ai/cerebra-logo.png",
  links: {
    twitter: "https://twitter.com/cerebraai",
    github: "https://github.com/cerebraai",
  },
}

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Cerebra — Knowledge Visualized",
    template: "%s | Cerebra",
  },
  description: siteConfig.description,
  keywords: [
    "knowledge graph",
    "visualization",
    "3D neural network",
    "information exploration",
    "semantic search",
    "AI",
  ],
  authors: [{ name: "Cerebra Team" }],
  creator: "Cerebra",
}
