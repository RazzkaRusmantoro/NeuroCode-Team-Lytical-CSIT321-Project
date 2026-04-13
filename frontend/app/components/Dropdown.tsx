'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
export type DropdownOption = string | {
    value: string;
    label: string;
};
function optionValue(option: DropdownOption): string {
    return typeof option === 'string' ? option : option.value;
}
function optionLabel(option: DropdownOption): string {
    return typeof option === 'string' ? option : option.label;
}
interface DropdownProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    id?: string;
    className?: string;
    disabled?: boolean;
    menuZClass?: string;
}
export default function Dropdown({ options, value, onChange, placeholder = 'Select', id, className = '', disabled = false, menuZClass = 'z-[100]', }: DropdownProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const normalized = useMemo(() => options.map((o) => ({
        value: optionValue(o),
        label: optionLabel(o),
    })), [options]);
    const displayLabel = useMemo(() => {
        if (!value)
            return '';
        const hit = normalized.find((o) => o.value === value);
        return hit?.label ?? value;
    }, [normalized, value]);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    useEffect(() => {
        if (disabled && isDropdownOpen)
            setIsDropdownOpen(false);
    }, [disabled, isDropdownOpen]);
    return (<div className={`relative ${className}`} ref={dropdownRef}>
      <button type="button" id={id} disabled={disabled} onClick={() => {
            if (!disabled)
                setIsDropdownOpen(!isDropdownOpen);
        }} className="w-full px-4 py-2.5 pr-5 bg-[#212121] border border-[#424242] rounded text-white text-left focus:outline-none focus:ring-2 focus:ring-[#BC4918] focus:border-transparent transition-all flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
        <span className={value ? 'text-white truncate' : 'text-white/60 truncate'}>
          {value ? displayLabel : placeholder}
        </span>
        <svg className={`w-5 h-5 text-white/60 transition-transform duration-200 shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {isDropdownOpen && !disabled && (<div className={`absolute ${menuZClass} w-full mt-2 bg-[#212121] backdrop-blur-sm border border-[#424242] rounded shadow-lg overflow-hidden`}>
          <div className="py-2 px-2 max-h-80 overflow-y-auto custom-scrollbar">
            {normalized.map((opt, index) => (<button key={`${opt.value}-${index}`} type="button" onClick={() => {
                    onChange(opt.value);
                    setIsDropdownOpen(false);
                }} className={`w-full py-2.5 text-left text-white hover:bg-[#2a2a2a] rounded transition-colors cursor-pointer flex items-center gap-3 ${value ? 'pl-3 pr-4' : 'px-4'} ${value === opt.value ? 'bg-[#2a2a2a]' : ''}`}>
                {value && (<>
                    {value === opt.value ? (<svg className="w-5 h-5 text-[#BC4918] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                      </svg>) : (<div className="w-5 h-5 flex-shrink-0"/>)}
                  </>)}
                <span className="truncate">{opt.label}</span>
              </button>))}
          </div>
        </div>)}
    </div>);
}
