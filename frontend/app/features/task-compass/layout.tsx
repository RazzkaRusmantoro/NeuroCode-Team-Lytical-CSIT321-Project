import type { Metadata } from "next";
export const metadata: Metadata = {
    title: "Task Compass — NeuroCode",
    description: "Task-oriented context: summaries, cautions, entry points, and relevant files before you implement.",
};
export default function Layout({ children, }: {
    children: React.ReactNode;
}) {
    return children;
}
