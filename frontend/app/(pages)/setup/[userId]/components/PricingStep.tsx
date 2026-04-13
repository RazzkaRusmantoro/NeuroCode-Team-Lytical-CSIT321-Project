'use client';
import { useState } from 'react';
interface PricingStepProps {
    selectedPlan: string;
    onPlanSelect: (plan: string) => void;
    onNext: () => void;
}
export default function PricingStep({ selectedPlan, onPlanSelect, onNext, }: PricingStepProps) {
    return (<div className="w-full">
      
      <h1 className="text-3xl font-bold text-left text-white mb-3 flex items-center gap-3">
        <img src="/icon.png" alt="Neurocode Icon" className="h-14 w-14"/>
        Choose Your Plan
      </h1>
      
      
      <p className="text-white/60 text-base mb-8">
        Select the perfect plan to accelerate your development workflow with AI-powered code analysis and assistance.
      </p>

      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <div className="relative p-10 bg-[#212121] border border-[#424242] rounded-lg transition-all hover:border-gray-600/50">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white mb-2">Basic</h3>
            <div className="flex items-baseline mb-2">
              <span className="text-3xl font-bold text-white">$19</span>
              <span className="text-white/70 ml-2">/month</span>
            </div>
            <p className="text-white/70 text-sm mb-4">
              Ideal for small teams and startups looking to understand, improve, and maintain codebases with AI assistance.
            </p>
            <button type="button" className="w-full py-2 px-4 bg-[#BC4918] hover:bg-[#D85A2A] text-white font-medium rounded-lg transition-all duration-300 ease-in-out hover:shadow-[0_0_25px_rgba(188,73,24,0.8)] cursor-pointer">
              Select Plan
            </button>
          </div>
          <ul className="space-y-3 mt-10">
            <li className="text-white/70 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Multi-repository Support (5 repos)
            </li>
            <li className="text-white/70 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Personalized Onboarding Assistant
            </li>
            <li className="text-white/70 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Automated Test Case Generation
            </li>
            <li className="text-white/70 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Direct Code Optimization to Repository
            </li>
          </ul>
        </div>

        
        <div className="relative p-10 bg-[#212121] border border-[#BC4918] rounded-lg transition-all hover:border-[#D85A2A]">
          
          <div className="absolute -top-3 left-4">
            <span className="bg-[#BC4918] text-white text-xs font-semibold px-3 py-1 rounded-full">
              RECOMMENDED
            </span>
          </div>
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white mb-2">Professional</h3>
            <div className="flex items-baseline mb-2">
              <span className="text-3xl font-bold text-white">$29</span>
              <span className="text-white/70 ml-2">/month</span>
            </div>
            <p className="text-white/70 text-sm mb-4">
              Designed for growing organizations that need faster development cycles, deeper insights, and integrated workflows.
            </p>
            <button type="button" className="w-full py-2 px-4 bg-[#BC4918] hover:bg-[#D85A2A] text-white font-medium rounded-lg transition-all duration-300 ease-in-out hover:shadow-[0_0_25px_rgba(188,73,24,0.8)] cursor-pointer">
              Select Plan
            </button>
          </div>
          <ul className="space-y-3 mt-10">
            <li className="text-white/70 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Everything in Basic
            </li>
            <li className="text-white/70 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Multi-repository Support (10 repos)
            </li>
            <li className="text-white/70 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Priority Processing
            </li>
            <li className="text-white/70 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Full Jira Integration
            </li>
            <li className="text-white/70 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              More Team Collaboration Features
            </li>
          </ul>
        </div>

        
        <div className="relative p-10 bg-[#212121] border border-[#424242] rounded-lg transition-all hover:border-gray-600/50">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white mb-2">Enterprise</h3>
            <div className="flex items-baseline mb-2">
              <span className="text-3xl font-bold text-white">$59</span>
              <span className="text-white/70 ml-2">/month</span>
            </div>
            <p className="text-white/70 text-sm mb-4">
              Built for established teams requiring scalable analysis, custom integrations, and enterprise-level support.
            </p>
            <button type="button" className="w-full py-2 px-4 bg-[#BC4918] hover:bg-[#D85A2A] text-white font-medium rounded-lg transition-all duration-300 ease-in-out hover:shadow-[0_0_25px_rgba(188,73,24,0.8)] cursor-pointer">
              Select Plan
            </button>
          </div>
          <ul className="space-y-3 mt-10">
            <li className="text-white/70 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Everything in Professional
            </li>
            <li className="text-white/70 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Multi-repository Support (Unlimited repos)
            </li>
            <li className="text-white/70 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Custom integrations (Slack, custom APIs)
            </li>
          </ul>
        </div>
      </div>

      
      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={onNext} className="px-6 py-1.5 text-sm font-medium text-white/70 hover:text-white transition-all duration-200 cursor-pointer flex items-center gap-2">
          Continue with Basic Plan
          <svg className="w-5 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
          </svg>
        </button>
      </div>
    </div>);
}
