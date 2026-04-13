import type { Metadata } from "next";
export const metadata: Metadata = {
    title: "Knowledge Graph — NeuroCode",
    description: "Preview of an interactive knowledge graph linking files, symbols, and dependencies across your codebase.",
};
export default function KnowledgeGraphLayout({ children, }: {
    children: React.ReactNode;
}) {
    return children;
}
