"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
const SCROLL_THRESHOLD = 24;
const sectionNav = [
    { id: "hero", label: "Overview" },
    { id: "product", label: "Product" },
    { id: "workflow", label: "Workflow" },
    { id: "features", label: "Features" },
    { id: "team", label: "Team" },
] as const;
function scrollToSectionId(id: string) {
    if (id === "hero") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();
    const { data: session } = useSession();
    const router = useRouter();
    const isHome = pathname === "/";
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    const handleLoginClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (session?.user) {
            router.push('/organizations');
        }
        else {
            router.push('/login');
        }
    };
    const navLinkClass = "text-sm text-white/70 hover:text-white transition-colors duration-200 whitespace-nowrap";
    return (<div className={`fixed top-0 left-0 right-0 w-full z-50 ${scrolled ? "pt-4 px-4 md:px-6" : "pt-0 px-0"}`} style={{
            fontFamily: "var(--font-poppins)",
            transition: "padding 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}>
      <nav className={`backdrop-blur-sm bg-[#0f0f11]/80 border-white/5 mx-auto ${scrolled
            ? "max-w-5xl rounded-2xl border shadow-lg shadow-black/20 translate-y-0"
            : "max-w-full rounded-none border-b border-t-0 border-l-0 border-r-0 shadow-none -translate-y-px"}`} style={{
            transition: "max-width 0.32s cubic-bezier(0.32, 0.72, 0, 1), border-radius 0.32s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.32s cubic-bezier(0.32, 0.72, 0, 1), transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}>
      <div className="flex items-center justify-between px-4 sm:px-6 py-5 sm:py-6 gap-4 sm:gap-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-6 lg:gap-10 min-w-0 flex-1">
          <div className="pr-2 sm:pr-4 flex-shrink-0">
            <Link href="/" className="block">
              <img src="/Full-logo.png" alt="NeuroCode" className="h-10 sm:h-12 w-auto" style={{ minWidth: 'fit-content' }}/>
            </Link>
          </div>
          <div className="hidden lg:flex items-center gap-3 xl:gap-5 min-w-0">
            {sectionNav.map(({ id, label }) => (<a key={id} href={isHome ? `#${id}` : `/#${id}`} className={navLinkClass} onClick={(e) => {
                    if (!isHome) {
                        return;
                    }
                    e.preventDefault();
                    scrollToSectionId(id);
                    window.history.replaceState(null, "", `#${id}`);
                }}>
                {label}
              </a>))}
          </div>
        </div>
        <a href="/login" className="flex-shrink-0 ml-2 inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98]" onClick={handleLoginClick}>
            Log in
          </a>
      </div>
      <div className="lg:hidden border-t border-white/5 px-4 pb-4">
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3">
          {sectionNav.map(({ id, label }) => (<a key={id} href={isHome ? `#${id}` : `/#${id}`} className="text-xs text-white/70 hover:text-white" onClick={(e) => {
                    if (!isHome) {
                        return;
                    }
                    e.preventDefault();
                    scrollToSectionId(id);
                    window.history.replaceState(null, "", `#${id}`);
                }}>
              {label}
            </a>))}
        </div>
      </div>
      </nav>
    </div>);
}
