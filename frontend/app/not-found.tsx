'use client';
import { useRouter } from 'next/navigation';
export default function NotFound() {
    const router = useRouter();
    return (<div className="min-h-screen flex items-center justify-center px-4 relative bg-[#0f0f11] overflow-hidden">
      
      <div className="absolute inset-0 z-0 hidden md:block bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:24px_24px] animate-grid-flow motion-reduce:animate-none">
        
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f11] via-transparent to-[#0f0f11]"></div>
        
        <div className="absolute left-1/2 top-0 -translate-x-1/2 bg-[var(--color-primary)]/30 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"></div>
      </div>
      
      <div className="w-full max-w-2xl bg-transparent relative z-10 text-center">
        
        <div className="flex justify-center mb-8">
          <img src="/Full-logo.png" alt="Neurocode Logo" className="h-16 w-auto"/>
        </div>

        
        <div className="mb-8">
          <h1 className="text-9xl md:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-b from-[var(--color-primary)] via-[var(--color-primary-light)] to-[var(--color-primary)] animate-pulse">
            404
          </h1>
        </div>

        
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-white/70 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved to a different location.
          </p>
        </div>

        
        <div className="flex justify-center items-center">
          <button onClick={() => router.back()} className="group text-[var(--color-primary)] hover:text-[var(--color-primary-light)] font-medium transition-all duration-300 cursor-pointer inline-flex items-center gap-2 px-4 py-2">
            <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>);
}
