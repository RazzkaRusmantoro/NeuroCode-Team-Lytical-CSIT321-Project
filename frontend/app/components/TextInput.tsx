import React from 'react';
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    rightIcon?: React.ReactNode;
    containerClassName?: string;
}
export default function TextInput({ label, error, rightIcon, containerClassName = '', className = '', id, ...inputProps }: TextInputProps) {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (<div className={containerClassName}>
      {label && (<label htmlFor={inputId} className="block text-sm font-medium text-white/70 mb-2">
          {label}
        </label>)}
      <div className="relative">
        <input id={inputId} className={`w-full px-4 py-3 ${rightIcon ? 'pr-12' : ''} bg-[#262626]/50 border border-[#262626] rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-gray-700 transition-all ${className}`} {...inputProps}/>
        {rightIcon && (<div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightIcon}
          </div>)}
      </div>
      {error && (<div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          <span>{error}</span>
        </div>)}
    </div>);
}
