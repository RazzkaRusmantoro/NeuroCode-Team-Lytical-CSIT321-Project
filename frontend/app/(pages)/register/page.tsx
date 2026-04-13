'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/actions/auth';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (!firstName.trim() || !lastName.trim()) {
            setError('First name and last name are required');
            return;
        }
        setLoading(true);
        try {
            const result = await registerUser(email, password, firstName, lastName);
            if (result.error) {
                setError(result.error);
            }
            else {
                await signIn('credentials', {
                    email,
                    password,
                    redirect: false,
                });
                if (result.userId) {
                    router.push(`/setup/${result.userId}`);
                }
                else {
                    router.push('/dashboard');
                }
                router.refresh();
            }
        }
        catch (err) {
            setError('Something went wrong');
        }
        finally {
            setLoading(false);
        }
    };
    const handleGithubLogin = () => {
        signIn('github', { callbackUrl: '/dashboard' });
    };
    const handleGoogleLogin = () => {
        signIn('google', { callbackUrl: '/dashboard' });
    };
    return (<div className="min-h-screen flex items-center justify-center px-4 py-8 relative bg-[#0f0f11] overflow-hidden">
      
      <div className="absolute inset-0 z-0 hidden md:block bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:24px_24px] animate-grid-flow motion-reduce:animate-none">
        
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f11] via-transparent to-[#0f0f11]"></div>
        
        <div className="absolute left-1/2 top-0 -translate-x-1/2 bg-[var(--color-primary)]/30 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"></div>
      </div>
      
      
      <div className="w-full max-w-7xl flex flex-col lg:flex-row rounded overflow-hidden relative z-10">
        <div className="hidden lg:flex lg:w-1/2 bg-gray-900/30 items-center justify-center">
          
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-8 lg:py-8">
          <div className="w-full max-w-lg bg-transparent">
          
          <div className="flex justify-center mb-6">
            <img src="/Full-logo.png" alt="Neurocode Logo" className="h-14 w-auto"/>
          </div>

          
          <h1 className="text-3xl font-bold text-center text-white mb-2">
            CREATE YOUR ACCOUNT
          </h1>

          
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex-1 max-w-[130px] border-t border-white/70"></div>
            <span className="text-white/70 text-sm whitespace-nowrap">Enjoy our services for free</span>
            <div className="flex-1 max-w-[130px] border-t border-white/70"></div>
          </div>

          
          <div className="space-y-3 mb-5">
            <button type="button" onClick={handleGithubLogin} className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-900 border-t-gray-500/50 rounded text-white font-medium transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
              Continue with GitHub
            </button>
            
            <button type="button" onClick={handleGoogleLogin} className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 border border-gray-900 border-t-gray-500/50 rounded text-white font-medium transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-white/70 mb-2">
                First Name
              </label>
              <input type="text" id="firstName" name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full px-4 py-2.5 bg-[#262626]/50 border border-[#262626] rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-gray-700 transition-all" placeholder="Enter your first name"/>
            </div>

            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-white/70 mb-2">
                Last Name
              </label>
              <input type="text" id="lastName" name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full px-4 py-2.5 bg-[#262626]/50 border border-[#262626] rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-gray-700 transition-all" placeholder="Enter your last name"/>
            </div>

            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
                Email
              </label>
              <input type="email" id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" className="w-full px-4 py-2.5 bg-[#262626]/50 border border-[#262626] rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-gray-700 transition-all" placeholder="Enter your email"/>
            </div>

            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-2">
                Password
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} id="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" className="w-full px-4 py-2.5 pr-12 bg-[#262626]/50 border border-[#262626] rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-gray-700 transition-all" placeholder="Enter your password"/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200 focus:outline-none cursor-pointer">
                  {showPassword ? (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>)}
                </button>
              </div>
            </div>

            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/70 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" className="w-full px-4 py-2.5 pr-12 bg-[#262626]/50 border border-[#262626] rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-gray-700 transition-all" placeholder="Confirm your password"/>
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200 focus:outline-none cursor-pointer">
                  {showConfirmPassword ? (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>)}
                </button>
              </div>
            </div>

            
            {error && (<div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <span>{error}</span>
              </div>)}

            
            <button type="submit" disabled={loading} className="w-full py-2.5 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-primary)]/50 disabled:cursor-not-allowed disabled:hover:shadow-none cursor-pointer text-white font-semibold rounded transition-all duration-300 ease-in-out hover:shadow-[0_0_25px_rgba(var(--color-primary-rgb),0.5)]">
              Register
            </button>
          </form>

          
          <div className="mt-5 text-center">
            <p className="text-sm text-white/70">
              Already have an account?{' '}
              <Link href="/login" className="text-[var(--color-primary)] hover:text-[var(--color-primary-light)] font-medium transition-colors duration-300 relative inline-block after:content-[''] after:absolute after:w-0 after:h-[1.5px] after:bottom-[-1.5px] after:left-0 after:bg-[var(--color-primary)] after:transition-all after:duration-300 after:ease-in-out hover:after:w-full">
                Sign in now!
              </Link>
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>);
}
