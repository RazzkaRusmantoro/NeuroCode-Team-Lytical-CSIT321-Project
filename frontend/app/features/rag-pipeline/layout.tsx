import type { Metadata } from "next";
export const metadata: Metadata = {
    title: "RAG Pipeline — NeuroCode",
    description: "Ingest, chunk, embed, index, and generate: how repositories become searchable context for humans and AI.",
};
export default function Layout({ children, }: {
    children: React.ReactNode;
}) {
    return children;
}
