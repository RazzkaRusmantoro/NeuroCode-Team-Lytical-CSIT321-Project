'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TextInput from '../../components/TextInput';
import PasswordInput from '../../components/PasswordInput';
export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });
            if (result?.error) {
                console.log(result.error);
                setError('Invalid email or password');
            }
            else {
                router.push('/organizations');
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
        signIn('github', { callbackUrl: '/organizations' });
    };
    const handleGoogleLogin = () => {
        signIn('google', { callbackUrl: '/organizations' });
    };
    return (<div className="min-h-screen flex items-center justify-center px-4 relative bg-[#0f0f11] overflow-hidden">
      
      <div className="absolute inset-0 z-0 hidden md:block bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:24px_24px] animate-grid-flow motion-reduce:animate-none">
        
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f11] via-transparent to-[#0f0f11]"></div>
        
        <div className="absolute left-1/2 top-0 -translate-x-1/2 bg-[var(--color-primary)]/30 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"></div>
      </div>
      
      <div className="w-full max-w-md bg-transparent relative z-10">
        
        <div className="flex justify-center mb-8">
          <img src="/Full-logo.png" alt="Neurocode Logo" className="h-16 w-auto"/>
        </div>

        
        <h1 className="text-4xl font-bold text-center text-white mb-2">
          WELCOME BACK
        </h1>

        
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex-1 max-w-[130px] border-t border-white/70"></div>
          <span className="text-white/70 text-sm whitespace-nowrap">Login with</span>
          <div className="flex-1 max-w-[130px] border-t border-white/70"></div>
        </div>

        
        <div className="space-y-3 mb-6">
          <button type="button" onClick={handleGithubLogin} className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-900 border-t-gray-500/50 rounded text-white font-medium transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
            </svg>
            Continue with GitHub
          </button>
          
          <button type="button" onClick={handleGoogleLogin} className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 border border-gray-900 border-t-gray-500/50 rounded text-white font-medium transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>


        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <TextInput type="email" id="email" name="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" placeholder="Enter your email"/>

          
          <PasswordInput id="password" name="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="off" placeholder="Enter your password" error={error}/>

          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 bg-transparent border border-gray-800 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 outline-none ring-0 ring-offset-0 cursor-pointer checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)]" style={{ WebkitTapHighlightColor: 'transparent' }}/>
              <label htmlFor="rememberMe" className="ml-2 text-sm text-white/70 cursor-pointer">
                Remember me
              </label>
            </div>
            <Link href="/forgot-password" className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors">
              Forgot password?
            </Link>
          </div>

          
          <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-primary)]/50 disabled:cursor-not-allowed disabled:hover:shadow-none cursor-pointer text-white font-semibold rounded transition-all duration-300 ease-in-out hover:shadow-[0_0_25px_rgba(var(--color-primary-rgb),0.5)]">
            Sign In
          </button>
        </form>

        
        <div className="mt-6 text-center">
          <p className="text-sm text-white/70">
            Don't have an account?{' '}
            <Link href="/register" className="text-[var(--color-primary)] hover:text-[var(--color-primary-light)] font-medium transition-colors duration-300 relative inline-block after:content-[''] after:absolute after:w-0 after:h-[1.5px] after:bottom-[-1.5px] after:left-0 after:bg-[var(--color-primary)] after:transition-all after:duration-300 after:ease-in-out hover:after:w-full">
              Sign up for free!
            </Link>
          </p>
        </div>
      </div>
    </div>);
}
