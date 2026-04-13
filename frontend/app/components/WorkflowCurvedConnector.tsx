'use client';
import { useId } from 'react';
type WorkflowCurvedConnectorProps = {
    mirror?: boolean;
};
export default function WorkflowCurvedConnector({ mirror = false }: WorkflowCurvedConnectorProps) {
    const id = useId().replace(/:/g, '');
    const gradId = `workflow-connector-grad-${id}`;
    const glowId = `workflow-connector-glow-${id}`;
    const glowStrongId = `workflow-connector-glow-strong-${id}`;
    const pathBottomToTop = 'M 0 235 C 28 195 68 75 96 65';
    const pathTopToBottom = 'M 0 45 C 26 115 70 205 96 215';
    const pathBottomToTopReversed = 'M 96 65 C 68 75 28 195 0 235';
    const pathTopToBottomReversed = 'M 96 215 C 70 205 26 115 0 45';
    const motionPath1 = mirror ? pathBottomToTopReversed : pathBottomToTop;
    const motionPath2 = mirror ? pathTopToBottomReversed : pathTopToBottom;
    const content = (<>
      
      <path d={pathBottomToTop} stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" fill="none" filter={`url(#${glowId})`} className="workflow-curve" style={{ ['--curve-delay' as string]: '0ms' }}/>
      
      <path d={pathTopToBottom} stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" fill="none" filter={`url(#${glowId})`} className="workflow-curve" style={{ ['--curve-delay' as string]: '200ms' }}/>
      
      <circle r="3" fill="currentColor" opacity="0.95" filter={`url(#${glowStrongId})`}>
        <animateMotion dur="2.2s" repeatCount="indefinite" path={motionPath1}/>
      </circle>
      <circle r="2" fill="currentColor" opacity="0.75" filter={`url(#${glowId})`}>
        <animateMotion dur="2.2s" repeatCount="indefinite" path={motionPath2} begin="0.5s"/>
      </circle>
    </>);
    return (<div className="hidden lg:flex flex-shrink-0 w-20 xl:w-24 items-stretch justify-center self-stretch min-h-[280px]" aria-hidden>
      <svg className="w-full h-full text-[var(--color-primary)]" viewBox="0 0 96 280" fill="none" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15"/>
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.15"/>
          </linearGradient>
          <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id={glowStrongId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
            <feFlood floodColor="rgb(var(--color-primary-rgb))" floodOpacity="0.5" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glow"/>
            <feMerge>
              <feMergeNode in="glow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {mirror ? (<g transform="translate(96, 0) scale(-1, 1)">
            {content}
          </g>) : (content)}
      </svg>
    </div>);
}
