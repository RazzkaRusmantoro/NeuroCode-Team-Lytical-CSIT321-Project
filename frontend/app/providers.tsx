'use client';
import { SessionProvider } from 'next-auth/react';
import { LoadingBarProvider } from './contexts/LoadingBarContext';
import TopLoadingBar from './components/TopLoadingBar';
export function Providers({ children }: {
    children: React.ReactNode;
}) {
    return (<SessionProvider>
      <LoadingBarProvider>
        <TopLoadingBar />
        {children}
      </LoadingBarProvider>
    </SessionProvider>);
}
