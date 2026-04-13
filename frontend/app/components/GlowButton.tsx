'use client';
import React from 'react';
interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    color: string;
    children: React.ReactNode;
    className?: string;
}
export default function GlowButton({ color, children, className = '', ...props }: GlowButtonProps) {
    const hexToRgb = (hex: string): {
        r: number;
        g: number;
        b: number;
    } | null => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
            }
            : null;
    };
    const getHoverColor = (hex: string): string => {
        const rgb = hexToRgb(hex);
        if (!rgb)
            return hex;
        const factor = 1.15;
        const r = Math.min(255, Math.round(rgb.r * factor));
        const g = Math.min(255, Math.round(rgb.g * factor));
        const b = Math.min(255, Math.round(rgb.b * factor));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };
    const rgb = hexToRgb(color);
    const shadowColor = rgb
        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`
        : 'rgba(188, 73, 24, 0.8)';
    const hoverColor = getHoverColor(color);
    return (<button className={`px-4 py-2 rounded text-sm font-medium text-white transition-all duration-300 ease-in-out cursor-pointer ${className}`} style={{
            backgroundColor: color,
            borderColor: color,
            borderWidth: '1px',
            borderStyle: 'solid',
        }} onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = hoverColor;
            e.currentTarget.style.borderColor = hoverColor;
            e.currentTarget.style.boxShadow = `0 0 25px ${shadowColor}`;
        }} onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = color;
            e.currentTarget.style.borderColor = color;
            e.currentTarget.style.boxShadow = 'none';
        }} {...props}>
      {children}
    </button>);
}
