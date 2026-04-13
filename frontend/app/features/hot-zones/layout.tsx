import type { Metadata } from "next";
export const metadata: Metadata = {
    title: "Hot Zones & Risk Patterns — NeuroCode",
    description: "Surface high-churn and semantically hot areas so changes land where impact is greatest.",
};
export default function Layout({ children, }: {
    children: React.ReactNode;
}) {
    return children;
}
