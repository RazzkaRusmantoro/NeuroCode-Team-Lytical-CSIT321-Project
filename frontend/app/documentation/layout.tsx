import type { Metadata } from "next";
export const metadata: Metadata = {
    title: "Documentation — NeuroCode",
    description: "Preview of AI-synchronized documentation: guides, API reference, and architecture overviews generated from your repository.",
};
export default function DocumentationLayout({ children, }: {
    children: React.ReactNode;
}) {
    return children;
}
