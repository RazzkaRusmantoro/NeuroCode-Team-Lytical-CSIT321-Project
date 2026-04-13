'use client';
import { useLoadingBar } from '../contexts/LoadingBarContext';
export default function TopLoadingBar() {
    const { loading, progress } = useLoadingBar();
    return (<div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-transparent pointer-events-none">
      {loading && (<div className="h-full bg-gradient-to-r from-[#D97018] via-[var(--color-primary)] to-[var(--color-primary-light)] transition-all duration-150 ease-linear" style={{
                width: `${progress}%`,
                boxShadow: `0 0 8px rgba(var(--color-primary-rgb), 0.7), 0 0 16px rgba(var(--color-primary-rgb), 0.5)`,
            }}/>)}
    </div>);
}
