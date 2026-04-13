'use client';
import { useState } from 'react';
interface OrganizationStepProps {
    organizationName: string;
    onOrganizationNameChange: (value: string) => void;
    onNext: () => void;
    onFinish: () => void;
}
export default function OrganizationStep({ organizationName, onOrganizationNameChange, onNext, onFinish, }: OrganizationStepProps) {
    const [step, setStep] = useState<'organization' | 'invite'>('organization');
    const [emailAddresses, setEmailAddresses] = useState<string[]>(['', '']);
    const [copied, setCopied] = useState(false);
    const isFormComplete = organizationName.trim() !== '';
    const handleNext = () => {
        if (!isFormComplete)
            return;
        setStep('invite');
    };
    const handleBack = () => {
        setStep('organization');
    };
    const handleEmailChange = (index: number, value: string) => {
        const newEmails = [...emailAddresses];
        newEmails[index] = value;
        setEmailAddresses(newEmails);
    };
    const handleAddMore = () => {
        setEmailAddresses([...emailAddresses, '']);
    };
    const handleCopyInviteLink = () => {
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };
    const maxRows = 5;
    const shouldScroll = emailAddresses.length > maxRows;
    return (<div className="w-full relative overflow-hidden px-6 py-4">
      
      <h1 className="text-3xl font-bold text-left text-white mb-3 flex items-center gap-3">
        <img src="/icon.png" alt="Neurocode Icon" className="h-14 w-14"/>
        Set up your organization
      </h1>

      
      <div className={`transition-all duration-500 ease-in-out ${step === 'invite'
            ? 'transform -translate-x-full opacity-0 absolute w-full'
            : 'transform translate-x-0 opacity-100 relative'}`}>
        
        <p className="text-white/60 text-base mb-8">
          Give us your organization name to get started.
        </p>

        
        <div className="space-y-6">
          
          <div>
            <label htmlFor="organizationName" className="block text-sm font-medium text-white/70 mb-3">
              Organization Name
            </label>
            <input type="text" id="organizationName" name="organizationName" value={organizationName} onChange={(e) => onOrganizationNameChange(e.target.value)} className="w-full px-4 py-2.5 bg-[#212121] border border-[#424242] rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#BC4918] focus:border-transparent transition-all" placeholder="Enter your organization name"/>
          </div>
        </div>

        
        <div className="flex justify-end gap-3 mt-32">
          <button type="button" onClick={handleNext} disabled={!isFormComplete} className={`px-8 py-1.5 text-sm font-semibold rounded-lg border transition-all duration-300 ease-in-out ${isFormComplete
            ? 'bg-[#BC4918] hover:bg-[#D85A2A] text-white border-[#BC4918] hover:border-[#D85A2A] hover:shadow-[0_0_15px_rgba(188,73,24,0.6)] cursor-pointer'
            : 'bg-gray-700/50 text-white/50 border-gray-700 cursor-not-allowed'}`}>
            Next
          </button>
        </div>
      </div>

      
      <div className={`transition-all duration-500 ease-in-out ${step === 'invite'
            ? 'transform translate-x-0 opacity-100 relative'
            : 'transform translate-x-full opacity-0 absolute w-full'}`}>
        
        <p className="text-white/60 text-base mb-8">
          Invite your team members to collaborate.
        </p>

        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">Invite team members</h2>
          
          <div className="bg-[#212121] border border-[#424242] rounded-lg overflow-hidden">
            <div className={`p-4 space-y-0 ${shouldScroll ? 'max-h-[400px] overflow-y-auto custom-scrollbar' : ''}`}>
              {emailAddresses.map((email, index) => (<div key={index} className="border-b border-[#424242] last:border-b-0 pb-3 mb-3 last:mb-0 last:pb-0">
                  <input type="email" value={email} onChange={(e) => handleEmailChange(index, e.target.value)} className="w-full pl-4 pt-1.5 bg-transparent border-0 rounded-none text-white placeholder-white/60 focus:outline-none focus:ring-0 transition-colors" placeholder="Email address"/>
                </div>))}
              <button type="button" onClick={handleAddMore} className="w-full pl-4 text-white font-medium transition-colors duration-200 cursor-pointer flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                </svg>
                Add more
              </button>
            </div>
          </div>

          
          <div className="mt-6">
            <button type="button" onClick={handleCopyInviteLink} className="text-blue-400 hover:text-blue-300 transition-colors duration-200 cursor-pointer flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
              {copied ? 'Copied!' : 'Copy invite link'}
            </button>
          </div>
        </div>

        
        <div className="flex justify-end gap-3 mt-32">
          <button type="button" onClick={handleBack} className="text-sm text-white/60 hover:text-white font-medium underline transition-colors duration-200 cursor-pointer mr-5">
            Back
          </button>
          <button type="button" onClick={onFinish} className="px-8 py-1.5 text-sm font-semibold rounded-lg border bg-[#BC4918] hover:bg-[#D85A2A] text-white border-[#BC4918] hover:border-[#D85A2A] hover:shadow-[0_0_15px_rgba(188,73,24,0.6)] cursor-pointer transition-all duration-300 ease-in-out">
            Finish
          </button>
        </div>
      </div>
    </div>);
}
