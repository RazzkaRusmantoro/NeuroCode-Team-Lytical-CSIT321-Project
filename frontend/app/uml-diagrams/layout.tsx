import type { Metadata } from "next";
export const metadata: Metadata = {
    title: "UML Diagrams — NeuroCode",
    description: "Concept preview for UML and architecture diagrams generated from code: classes, sequences, and states you can navigate and share.",
};
export default function UmlDiagramsLayout({ children, }: {
    children: React.ReactNode;
}) {
    return children;
}
