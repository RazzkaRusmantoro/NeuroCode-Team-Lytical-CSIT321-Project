"use client";
import React, { useEffect, useRef, memo } from "react";
export interface SpiralAnimationProps {
    totalDots?: number;
    size?: number;
    dotRadius?: number;
    margin?: number;
    duration?: number;
    dotColor?: string;
    backgroundColor?: string;
    className?: string;
    visibility?: number;
    fillContainer?: boolean;
}
export const SpiralAnimation: React.FC<SpiralAnimationProps> = memo(({ totalDots = 600, size = 400, dotRadius = 2, margin = 2, duration = 3, dotColor = "#f97316", backgroundColor = "transparent", className = "", visibility = 1, fillContainer = false, }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    useEffect(() => {
        if (!svgRef.current)
            return;
        const svg = svgRef.current;
        const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
        const CENTER = size / 2;
        const MAX_RADIUS = CENTER - margin - dotRadius;
        const svgNS = "http://www.w3.org/2000/svg";
        svg.innerHTML = "";
        const baseOpacity = 0.6 * visibility;
        const lowOpacity = 0.3 * visibility;
        const highOpacity = Math.min(1, 1 * visibility);
        for (let i = 0; i < totalDots; i++) {
            const idx = i + 0.5;
            const frac = idx / totalDots;
            const r = Math.sqrt(frac) * MAX_RADIUS;
            const theta = idx * GOLDEN_ANGLE;
            const x = CENTER + r * Math.cos(theta);
            const y = CENTER + r * Math.sin(theta);
            const c = document.createElementNS(svgNS, "circle");
            c.setAttribute("cx", x.toString());
            c.setAttribute("cy", y.toString());
            c.setAttribute("r", dotRadius.toString());
            c.setAttribute("fill", "none");
            c.setAttribute("stroke", dotColor);
            c.setAttribute("stroke-width", "1.2");
            c.setAttribute("opacity", baseOpacity.toString());
            svg.appendChild(c);
            const animR = document.createElementNS(svgNS, "animate");
            animR.setAttribute("attributeName", "r");
            animR.setAttribute("values", `${dotRadius * 0.5};${dotRadius * 1.5};${dotRadius * 0.5}`);
            animR.setAttribute("dur", `${duration}s`);
            animR.setAttribute("begin", `${frac * duration}s`);
            animR.setAttribute("repeatCount", "indefinite");
            animR.setAttribute("calcMode", "spline");
            animR.setAttribute("keySplines", "0.4 0 0.6 1;0.4 0 0.6 1");
            c.appendChild(animR);
            const animO = document.createElementNS(svgNS, "animate");
            animO.setAttribute("attributeName", "opacity");
            animO.setAttribute("values", `${lowOpacity};${highOpacity};${lowOpacity}`);
            animO.setAttribute("dur", `${duration}s`);
            animO.setAttribute("begin", `${frac * duration}s`);
            animO.setAttribute("repeatCount", "indefinite");
            animO.setAttribute("calcMode", "spline");
            animO.setAttribute("keySplines", "0.4 0 0.6 1;0.4 0 0.6 1");
            c.appendChild(animO);
        }
    }, [
        totalDots,
        size,
        dotRadius,
        margin,
        duration,
        dotColor,
        visibility,
    ]);
    return (<div ref={containerRef} className={fillContainer
            ? `absolute inset-0 overflow-hidden ${className}`.trim()
            : `flex items-center justify-center overflow-hidden ${className}`.trim()} style={{ backgroundColor }}>
      <div className={fillContainer ? "h-full w-full" : ""} style={fillContainer ? undefined : { width: size, height: size }}>
        <svg ref={svgRef} width={fillContainer ? "100%" : size} height={fillContainer ? "100%" : size} viewBox={`0 0 ${size} ${size}`} preserveAspectRatio={fillContainer ? "xMidYMid slice" : undefined}/>
      </div>
    </div>);
});
