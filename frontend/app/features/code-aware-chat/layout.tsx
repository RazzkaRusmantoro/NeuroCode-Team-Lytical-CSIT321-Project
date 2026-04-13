import type { Metadata } from "next";
export const metadata: Metadata = {
    title: "Code-Aware Chat — NeuroCode",
    description: "Chat grounded in your organization's indexed code context: answers with citations and safe boundaries.",
};
export default function Layout({ children, }: {
    children: React.ReactNode;
}) {
    return children;
}
