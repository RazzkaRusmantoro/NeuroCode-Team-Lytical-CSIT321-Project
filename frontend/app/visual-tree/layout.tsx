import type { Metadata } from "next";
export const metadata: Metadata = {
    title: "Visual Tree — NeuroCode",
    description: "Explore a repository-wide architecture tree: folders, ownership hotspots, and AI annotations layered on structure.",
};
export default function VisualTreeLayout({ children, }: {
    children: React.ReactNode;
}) {
    return children;
}
