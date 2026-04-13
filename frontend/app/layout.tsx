import type { Metadata } from "next";
import { Geist_Mono, Red_Hat_Text, Red_Hat_Display, Red_Hat_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
const redHatText = Red_Hat_Text({
    variable: "--font-geist-sans",
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
});
const redHatDisplay = Red_Hat_Display({
    variable: "--font-red-hat-display",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800", "900"],
});
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});
const redHatMono = Red_Hat_Mono({
    variable: "--font-red-hat-mono",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});
export const metadata: Metadata = {
    title: "NeuroCode: AI-Powered Documentation & Onboarding",
    description: "Next Level AI-Powered Documentation & Onboarding for Developers",
};
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="en">
      <body className={`${redHatText.variable} ${redHatDisplay.variable} ${geistMono.variable} ${redHatMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>);
}
