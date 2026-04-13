'use client';
import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
interface LoadingBarContextType {
    startLoading: () => void;
    stopLoading: () => void;
    loading: boolean;
    progress: number;
}
const LoadingBarContext = createContext<LoadingBarContextType | undefined>(undefined);
export function LoadingBarProvider({ children }: {
    children: ReactNode;
}) {
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const progressRef = useRef(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isNavigatingRef = useRef(false);
    const previousPathnameRef = useRef(pathname);
    const completeLoading = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
        }
        setProgress(100);
        completionTimeoutRef.current = setTimeout(() => {
            setLoading(false);
            setProgress(0);
            progressRef.current = 0;
            isNavigatingRef.current = false;
        }, 300);
    }, []);
    const startLoading = useCallback(() => {
        isNavigatingRef.current = true;
        setLoading(true);
        setProgress(0);
        progressRef.current = 0;
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        if (completionTimeoutRef.current) {
            clearTimeout(completionTimeoutRef.current);
        }
        if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
        }
        intervalRef.current = setInterval(() => {
            progressRef.current = Math.min(progressRef.current + (100 - progressRef.current) * 0.05, 90);
            setProgress(progressRef.current);
        }, 100);
        fallbackTimeoutRef.current = setTimeout(() => {
            if (isNavigatingRef.current) {
                completeLoading();
            }
        }, 30000);
    }, [completeLoading]);
    const stopLoading = useCallback(() => {
        completeLoading();
    }, [completeLoading]);
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest('a');
            if (!anchor)
                return;
            let href = anchor.getAttribute('href');
            if (!href && anchor instanceof HTMLAnchorElement && anchor.href) {
                try {
                    const url = new URL(anchor.href);
                    if (url.origin === window.location.origin) {
                        href = url.pathname + url.search + url.hash;
                    }
                    else {
                        return;
                    }
                }
                catch {
                    if (anchor.href.startsWith(window.location.origin)) {
                        href = anchor.href.replace(window.location.origin, '');
                    }
                    else {
                        return;
                    }
                }
            }
            if (!href)
                return;
            if (href === '#')
                return;
            if (href.startsWith('http') && !href.startsWith(window.location.origin) && !href.startsWith('/')) {
                return;
            }
            if (href.startsWith('mailto:') || href.startsWith('tel:')) {
                return;
            }
            const withoutOrigin = href.replace(window.location.origin, '').split('?')[0];
            const pathOnly = withoutOrigin.split('#')[0];
            const currentPath = pathname.split('?')[0].split('#')[0];
            const destinationPath = pathOnly === '' ? currentPath : pathOnly;
            if (destinationPath === currentPath) {
                return;
            }
            startLoading();
        };
        document.addEventListener('click', handleClick, true);
        return () => {
            document.removeEventListener('click', handleClick, true);
        };
    }, [pathname, startLoading]);
    useEffect(() => {
        if (previousPathnameRef.current === pathname)
            return;
        const wasNavigating = isNavigatingRef.current;
        previousPathnameRef.current = pathname;
        if (!wasNavigating) {
            startLoading();
            setTimeout(() => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                setProgress(100);
                completionTimeoutRef.current = setTimeout(() => {
                    setLoading(false);
                    setProgress(0);
                    progressRef.current = 0;
                    isNavigatingRef.current = false;
                }, 300);
            }, 200);
            return;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setProgress(100);
        completionTimeoutRef.current = setTimeout(() => {
            setLoading(false);
            setProgress(0);
            progressRef.current = 0;
            isNavigatingRef.current = false;
        }, 300);
        return () => {
            if (completionTimeoutRef.current) {
                clearTimeout(completionTimeoutRef.current);
            }
        };
    }, [pathname, startLoading]);
    useEffect(() => {
        const handlePopState = () => {
            if (isNavigatingRef.current) {
                stopLoading();
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [stopLoading]);
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (completionTimeoutRef.current) {
                clearTimeout(completionTimeoutRef.current);
            }
            if (fallbackTimeoutRef.current) {
                clearTimeout(fallbackTimeoutRef.current);
            }
        };
    }, []);
    return (<LoadingBarContext.Provider value={{ startLoading, stopLoading, loading, progress }}>
      {children}
    </LoadingBarContext.Provider>);
}
export function useLoadingBar() {
    const context = useContext(LoadingBarContext);
    if (context === undefined) {
        throw new Error('useLoadingBar must be used within a LoadingBarProvider');
    }
    return context;
}
