'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowRight, Plus, Link, Check } from 'lucide-react';
import { createNewOrganization } from '@/actions/organization';
import { useLoadingBar } from '@/app/contexts/LoadingBarContext';
interface CreateOrganizationModalProps {
    onClose: () => void;
}
export default function CreateOrganizationModal({ onClose }: CreateOrganizationModalProps) {
    const router = useRouter();
    const { startLoading, stopLoading } = useLoadingBar();
    const [step, setStep] = useState<'name' | 'invite'>('name');
    const [orgName, setOrgName] = useState('');
    const [emails, setEmails] = useState(['', '']);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        inputRef.current?.focus();
    }, []);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape')
            onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    const handleCreate = async () => {
        if (!orgName.trim() || loading)
            return;
        setLoading(true);
        startLoading();
        onClose();
        const validEmails = emails.map((e) => e.trim()).filter((e) => e.includes('@'));
        const result = await createNewOrganization(orgName.trim(), validEmails);
        if (result.error) {
            stopLoading();
            return;
        }
        router.push(`/org-${result.shortId}/dashboard`);
    };
    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.origin + '/join');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>

            
            <div className="relative w-full max-w-lg bg-[#111113] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden">

                
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#1e1e1e]">
                    <div className="flex items-center gap-3">
                        <img src="/icon.png" alt="NeuroCode" className="w-7 h-7"/>
                        <div>
                            <h2 className="text-base font-semibold text-white">New Organization</h2>
                            <p className="text-xs text-white/30 mt-0.5">
                                {step === 'name' ? 'Step 1 of 2 — Name' : 'Step 2 of 2 — Invite'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors">
                        <X className="w-4 h-4"/>
                    </button>
                </div>

                
                <div className="flex h-0.5">
                    <div className="flex-1 bg-[var(--color-primary)] transition-all duration-300"/>
                    <div className={`flex-1 transition-all duration-300 ${step === 'invite' ? 'bg-[var(--color-primary)]' : 'bg-[#1e1e1e]'}`}/>
                </div>

                <div className="px-6 py-6">
                    {step === 'name' ? (<div className="space-y-5">
                            <div>
                                <p className="text-sm text-white/50 mb-5">
                                    Give your organization a name to get started. You can always change it later.
                                </p>
                                <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">
                                    Organization Name
                                </label>
                                <input ref={inputRef} type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && orgName.trim())
            setStep('invite'); }} className="w-full px-4 py-3 bg-[#1a1a1c] border border-[#2a2a2a] rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-[var(--color-primary)]/50 focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all text-sm" placeholder="e.g. Acme Corp, My Startup…"/>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button onClick={() => orgName.trim() && setStep('invite')} disabled={!orgName.trim()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed" style={{
                background: orgName.trim() ? 'var(--color-primary)' : undefined,
                color: orgName.trim() ? 'white' : undefined,
                backgroundColor: !orgName.trim() ? 'rgba(255,255,255,0.05)' : undefined,
            }}>
                                    Next <ArrowRight className="w-3.5 h-3.5"/>
                                </button>
                            </div>
                        </div>) : (<div className="space-y-5">
                            <p className="text-sm text-white/50">
                                Invite teammates to <span className="text-white/80 font-medium">{orgName}</span>. You can skip this and do it later from settings.
                            </p>

                            <div>
                                <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">
                                    Team Members
                                </label>
                                <div className="bg-[#1a1a1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
                                    {emails.map((email, i) => (<div key={i} className="flex items-center border-b border-[#2a2a2a] last:border-b-0">
                                            <input type="email" value={email} onChange={(e) => {
                    const next = [...emails];
                    next[i] = e.target.value;
                    setEmails(next);
                }} className="flex-1 px-4 py-3 bg-transparent text-white placeholder-white/25 focus:outline-none text-sm" placeholder="colleague@company.com"/>
                                        </div>))}
                                    <button type="button" onClick={() => setEmails([...emails, ''])} className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-white/35 hover:text-white/60 transition-colors">
                                        <Plus className="w-3.5 h-3.5"/> Add another
                                    </button>
                                </div>
                            </div>

                            <button type="button" onClick={handleCopyLink} className="flex items-center gap-2 text-xs text-white/40 hover:text-[var(--color-primary-light)] transition-colors">
                                {copied ? <Check className="w-3.5 h-3.5"/> : <Link className="w-3.5 h-3.5"/>}
                                {copied ? 'Copied!' : 'Copy invite link'}
                            </button>

                            <div className="flex items-center justify-between pt-2">
                                <button onClick={() => setStep('name')} className="text-xs text-white/35 hover:text-white/60 underline underline-offset-2 transition-colors">
                                    Back
                                </button>
                                <button onClick={handleCreate} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60" style={{ background: 'var(--color-primary)' }}>
                                    Create Organization
                                </button>
                            </div>
                        </div>)}
                </div>
            </div>
        </div>);
}
