import type { Metadata } from "next";
export const metadata: Metadata = {
    title: "Glossary & Code Reference — NeuroCode",
    description: "Shared vocabulary and code reference panels linked across docs and source.",
};
export default function Layout({ children, }: {
    children: React.ReactNode;
}) {
    return children;
}
