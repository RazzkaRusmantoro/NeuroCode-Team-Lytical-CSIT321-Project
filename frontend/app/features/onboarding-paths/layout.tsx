import type { Metadata } from "next";
export const metadata: Metadata = {
    title: "Onboarding Paths — NeuroCode",
    description: "Role-specific onboarding modules generated from your architecture: setup, workflows, and first PR guidance.",
};
export default function Layout({ children, }: {
    children: React.ReactNode;
}) {
    return children;
}
