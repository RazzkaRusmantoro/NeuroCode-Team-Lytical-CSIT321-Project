'use client';
import { useState } from 'react';
import Dropdown from '@/app/components/Dropdown';
const PRIMARY_GOALS = [
    'Understand a new or existing codebase',
    'Speed up development with AI assistance',
    'Improve code quality and maintainability',
    'Onboard new developers faster',
    'Review pull requests more efficiently',
    'Refactor legacy or messy code',
    'Generate or improve documentation',
    'Debug and troubleshoot issues faster',
    'Explore unfamiliar languages or frameworks',
    'Maintain consistency and best practices across projects',
];
const ROLE_OPTIONS = [
    'Backend Developer',
    'Data Engineer',
    'Frontend Developer',
    'Fullstack Developer',
    'DevOps Engineer',
    'ML Engineer',
    'Data Scientist',
    'Mobile Developer',
    'QA Engineer',
    'Product Manager',
    'UI/UX Designer',
    'Security Engineer',
    'Student',
    'Other',
];
interface PersonalizationStepProps {
    primaryGoal: string;
    role: string;
    onPrimaryGoalChange: (value: string) => void;
    onRoleChange: (value: string) => void;
    onNext: () => void;
    isLoading?: boolean;
}
export default function PersonalizationStep({ primaryGoal, role, onPrimaryGoalChange, onRoleChange, onNext, isLoading = false, }: PersonalizationStepProps) {
    const isFormComplete = primaryGoal && role && !isLoading;
    return (<div className="w-full">
      
      <h1 className="text-3xl font-bold text-left text-white mb-3 flex items-center gap-3">
        <img src="/icon.png" alt="Neurocode Icon" className="h-14 w-14"/>
        Welcome to NeuroCode! Tell us a bit about yourself.
      </h1>
      
      
      <p className="text-white/60 text-base mb-8">
        Help us tailor your experience to better serve your needs.
      </p>

      
      <div className="space-y-6">
        
        <div>
          <label htmlFor="primaryGoal" className="block text-sm font-medium text-white/70 mb-3">
            What is your primary goal?
          </label>
          <Dropdown id="primaryGoal" options={PRIMARY_GOALS} value={primaryGoal} onChange={onPrimaryGoalChange} placeholder="Select"/>
        </div>

        
        <div>
          <label className="block text-sm font-medium text-white/70 mb-3">
            What best describes you?
          </label>
          <div className="flex flex-wrap gap-3">
            {ROLE_OPTIONS.map((option) => (<button key={option} type="button" onClick={() => onRoleChange(option)} className={`px-4 py-2.5 whitespace-nowrap border rounded-lg cursor-pointer transition-all ${role === option
                ? 'bg-[#BC4918]/20 border-[#BC4918] text-white'
                : 'bg-[#212121] border-[#424242] text-white/70 hover:bg-[#2a2a2a] hover:border-gray-600/50'}`}>
                {option}
              </button>))}
          </div>
        </div>
      </div>

      
      <div className="flex justify-end gap-3 mt-32">
        <button type="button" onClick={onNext} disabled={!isFormComplete || isLoading} className={`px-8 py-1.5 text-sm font-semibold rounded-lg border transition-all duration-300 ease-in-out ${isFormComplete && !isLoading
            ? 'bg-[#BC4918] hover:bg-[#D85A2A] text-white border-[#BC4918] hover:border-[#D85A2A] hover:shadow-[0_0_15px_rgba(188,73,24,0.6)] cursor-pointer'
            : 'bg-gray-700/50 text-white/50 border-gray-700 cursor-not-allowed'}`}>
          Next
        </button>
      </div>
    </div>);
}
