import { NodeProps, Handle, Position, EdgeProps, getStraightPath, BaseEdge, getBezierPath, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';
import { GeneralizationArrow, arrowBase, DEFAULT_ARROW_LENGTH } from './UmlRelationshipMarkers';
export function DestroyX({ className = '', style }: {
    className?: string;
    style?: React.CSSProperties;
}) {
    return (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className} style={style}>
      <line x1="4" y1="4" x2="20" y2="20"/>
      <line x1="20" y1="4" x2="4" y2="20"/>
    </svg>);
}
export function SequenceMessageEdge({ id, sourceX, sourceY, targetX, targetY, style, data, markerEnd, }: EdgeProps) {
    const [edgePath] = getStraightPath({
        sourceX,
        sourceY,
        targetX,
        targetY: sourceY,
    });
    const isReturn = !!data?.isReturn;
    return (<g style={style}>
      <BaseEdge path={edgePath} id={id} style={{
            strokeWidth: 1.5,
            stroke: '#e4e4e7',
            strokeDasharray: isReturn ? '5, 5' : undefined
        }} markerEnd={markerEnd}/>
      {typeof data?.label === 'string' && data.label && (<text x={(sourceX + targetX) / 2} y={sourceY - 8} textAnchor="middle" fill="#e4e4e7" fontSize={12} fontFamily="ui-monospace, monospace">
          {data.label}
        </text>)}
    </g>);
}
export function SequenceSelfMessageEdge({ id, sourceX, sourceY, targetX, targetY, style, data, markerEnd, }: EdgeProps) {
    const dx = 40;
    const dy = Math.max(30, targetY - sourceY);
    const actualTargetY = sourceY + dy;
    const edgePath = `M ${sourceX} ${sourceY} L ${sourceX + dx} ${sourceY} L ${sourceX + dx} ${actualTargetY} L ${targetX} ${actualTargetY}`;
    return (<g style={style}>
      <BaseEdge path={edgePath} id={id} style={{
            strokeWidth: 1.5,
            stroke: '#e4e4e7',
        }} markerEnd={markerEnd}/>
      {typeof data?.label === 'string' && data.label && (<text x={sourceX + dx + 8} y={(sourceY + actualTargetY) / 2} textAnchor="start" dominantBaseline="middle" fill="#e4e4e7" fontSize={12} fontFamily="ui-monospace, monospace">
          {data.label}
        </text>)}
    </g>);
}
export function SequenceFragmentNode({ data }: NodeProps) {
    const operator = (data.operator as string) || 'alt';
    const condition = data.condition as string;
    const width = (data.width as number) || 400;
    const height = (data.height as number) || 200;
    const operatorWidth = Math.max(operator.length * 8 + 16, 40);
    const lw = operatorWidth;
    const lh = 24;
    const cut = 8;
    return (<div className="relative pointer-events-none" style={{ width, height }}>
      
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        <rect x={0.5} y={0.5} width={width - 1} height={height - 1} fill="rgba(255,255,255,0.02)" stroke="#e4e4e7" strokeWidth="1.5"/>
        
        
        <path d={`M 0.5 0.5 L ${lw} 0.5 L ${lw} ${lh - cut} L ${lw - cut} ${lh} L 0.5 ${lh} Z`} fill="#1e1e22" stroke="#e4e4e7" strokeWidth="1.5"/>
      </svg>
      
      <div className="absolute top-0 left-0 px-2 py-1 text-[#e4e4e7] font-bold text-[11px] font-mono z-10">
        {operator}
      </div>
      {condition && (<div className="absolute top-1 text-[#a1a1aa] text-[11px] font-mono z-10" style={{ left: lw + 8 }}>
          {condition}
        </div>)}
    </div>);
}
export function SequenceStepLabelNode({ data }: NodeProps) {
    const title = (data.title as string) || '';
    const stepIndex = typeof data.stepIndex === 'number' ? data.stepIndex + 1 : 1;
    return (<div className="pointer-events-none flex items-center gap-2">
      <span className="rounded bg-[#2a2a2e] border border-[#444] px-2 py-1 text-[11px] font-semibold text-[#a1a1aa] font-mono">
        Step {stepIndex}
      </span>
      <span className="text-[12px] text-[#e4e4e7] font-mono">{title}</span>
    </div>);
}
export function UMLLifelineNode({ data }: NodeProps) {
    const isActor = !!data.isActor;
    const isDestroyed = !!data.isDestroyed;
    const activations = (data.activations as Array<{
        startY: number;
        height: number;
        xOffset?: number;
    }>) || [];
    const lifelineHeight = typeof data.lifelineHeight === 'number' && data.lifelineHeight > 0 ? data.lifelineHeight : 600;
    return (<div className="flex flex-col items-center pointer-events-none" style={{ height: `${lifelineHeight}px`, width: '200px' }}>
      <Handle type="target" position={Position.Left} id="lifeline-target" style={{ opacity: 0, left: '50%', top: '50%' }}/>
      <Handle type="source" position={Position.Right} id="lifeline-source" style={{ opacity: 0, left: '50%', top: '50%' }}/>
      {isActor ? (<div className="flex flex-col items-center mb-1 pointer-events-auto z-10 bg-[#1a1a1d]">
          <svg width="32" height="40" viewBox="0 0 40 50" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[#ccc]">
            <circle cx="20" cy="10" r="8"/>
            <line x1="20" y1="18" x2="20" y2="35"/>
            <line x1="5" y1="25" x2="35" y2="25"/>
            <line x1="20" y1="35" x2="10" y2="48"/>
            <line x1="20" y1="35" x2="30" y2="48"/>
          </svg>
          <span className="text-white font-semibold mt-1">{data.label as string}</span>
        </div>) : (<div className="bg-[#2a2a2e] border border-[#444] rounded-md px-4 py-2 text-white font-semibold min-w-[120px] text-center shadow-md pointer-events-auto z-10">
          {data.label as string}
        </div>)}
      <div className="flex-1 w-px border-l-2 border-dashed border-[#555] mt-2 relative flex flex-col items-center justify-end">
        {activations.map((act, i) => (<div key={i} className="absolute bg-[#e4e4e7] border border-[#333] rounded-sm shadow-sm" style={{
                top: act.startY,
                height: act.height,
                width: '16px',
                left: `calc(50% + ${act.xOffset || 0}px)`,
                transform: 'translateX(-50%)',
                zIndex: 5 + i,
            }}>
            <Handle type="source" position={Position.Right} id={`act-${i}-source-right`} style={{ opacity: 0, top: 0, right: 0 }}/>
            <Handle type="target" position={Position.Right} id={`act-${i}-target-right`} style={{ opacity: 0, top: 0, right: 0 }}/>
            <Handle type="source" position={Position.Left} id={`act-${i}-source-left`} style={{ opacity: 0, top: 0, left: 0 }}/>
            <Handle type="target" position={Position.Left} id={`act-${i}-target-left`} style={{ opacity: 0, top: 0, left: 0 }}/>
          </div>))}
        {isDestroyed && (<div className="absolute -bottom-5 text-[#e4e4e7] bg-[#1a1a1d] z-10">
            <DestroyX />
          </div>)}
      </div>
    </div>);
}
export function UseCaseSystemBoundaryNode({ data }: NodeProps) {
    const width = (data.width as number) || 400;
    const height = (data.height as number) || 500;
    const label = (data.label as string) || 'System Boundary';
    return (<div className="relative pointer-events-auto" style={{ width, height }}>
      
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
        <rect x={0.5} y={0.5} width={width - 1} height={height - 1} fill="rgba(255,255,255,0.02)" stroke="#e4e4e7" strokeWidth="2"/>
      </svg>
      <div className="absolute top-0 left-0 w-full text-center py-2 text-[#e4e4e7] font-bold text-[14px] font-mono z-10 pointer-events-none">
        {label}
      </div>
    </div>);
}
export function UseCaseActorNode({ data }: NodeProps) {
    const label = (data.label as string) || 'Actor';
    const size = 48;
    return (<div className="flex flex-col items-center justify-start pointer-events-auto" style={{ width: 80, height: 80 }}>
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0, width: 1, height: 1 }}/>
      <div className="flex flex-col items-center gap-1 w-full">
        <svg width={size} height={size} viewBox="0 0 40 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#e4e4e7] shrink-0">
          <circle cx="20" cy="10" r="8"/>
          <line x1="20" y1="18" x2="20" y2="35"/>
          <line x1="5" y1="25" x2="35" y2="25"/>
          <line x1="20" y1="35" x2="10" y2="48"/>
          <line x1="20" y1="35" x2="30" y2="48"/>
        </svg>
        <span className="text-[#e4e4e7] text-xs font-semibold font-mono text-center max-w-[120px] truncate" title={label}>
          {label}
        </span>
      </div>
    </div>);
}
export function UseCaseNode({ data }: NodeProps) {
    const label = (data.label as string) || 'Use Case';
    const width = (data.width as number) || 140;
    const height = (data.height as number) || 72;
    const cx = width / 2;
    const cy = height / 2;
    const rx = (width / 2) - 4;
    const ry = (height / 2) - 4;
    return (<div className="relative flex items-center justify-center pointer-events-auto" style={{ width, height }}>
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0, width: 1, height: 1 }}/>
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(255,255,255,0.04)" stroke="#e4e4e7" strokeWidth="1.5"/>
      </svg>
      <span className="relative z-10 text-[#e4e4e7] text-xs font-medium font-mono text-center px-2 max-w-full truncate" title={label}>
        {label}
      </span>
    </div>);
}
export function CommunicationLinkEdge({ id, sourceX, sourceY, targetX, targetY, data, style, markerEnd, }: EdgeProps) {
    const d = data as {
        x1?: number;
        y1?: number;
        x2?: number;
        y2?: number;
    } | undefined;
    const hasBorderPoints = d && typeof d.x1 === 'number' && typeof d.y1 === 'number' && typeof d.x2 === 'number' && typeof d.y2 === 'number';
    const path = hasBorderPoints
        ? `M ${d!.x1} ${d!.y1} L ${d!.x2} ${d!.y2}`
        : getStraightPath({ sourceX, sourceY, targetX, targetY })[0];
    return (<g style={style}>
      <BaseEdge id={id} path={path} style={{
            strokeWidth: 1.5,
            stroke: '#e4e4e7',
        }} markerEnd={markerEnd}/>
    </g>);
}
export function UseCaseExtendEdge({ id, sourceX, sourceY, targetX, targetY, data, style, markerEnd, }: EdgeProps) {
    const d = data as {
        x1?: number;
        y1?: number;
        x2?: number;
        y2?: number;
    } | undefined;
    const hasBorderPoints = d && typeof d.x1 === 'number' && typeof d.y1 === 'number' && typeof d.x2 === 'number' && typeof d.y2 === 'number';
    const x1 = hasBorderPoints ? d!.x1! : sourceX;
    const y1 = hasBorderPoints ? d!.y1! : sourceY;
    const x2 = hasBorderPoints ? d!.x2! : targetX;
    const y2 = hasBorderPoints ? d!.y2! : targetY;
    const path = `M ${x1} ${y1} L ${x2} ${y2}`;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    return (<g style={style}>
      <BaseEdge id={id} path={path} style={{
            strokeWidth: 1.5,
            stroke: '#e4e4e7',
            strokeDasharray: '6, 6',
        }} markerEnd={markerEnd}/>
      <rect x={midX - 40} y={midY - 10} width={80} height={20} fill="#1a1a1d" rx={4}/>
      <text x={midX} y={midY} textAnchor="middle" dominantBaseline="middle" fill="#e4e4e7" fontSize={11} fontFamily="ui-monospace, monospace">
        &lt;&lt;extend&gt;&gt;
      </text>
    </g>);
}
export function UseCaseIncludeEdge({ id, sourceX, sourceY, targetX, targetY, data, style, markerEnd, }: EdgeProps) {
    const d = data as {
        x1?: number;
        y1?: number;
        x2?: number;
        y2?: number;
    } | undefined;
    const hasBorderPoints = d && typeof d.x1 === 'number' && typeof d.y1 === 'number' && typeof d.x2 === 'number' && typeof d.y2 === 'number';
    const x1 = hasBorderPoints ? d!.x1! : sourceX;
    const y1 = hasBorderPoints ? d!.y1! : sourceY;
    const x2 = hasBorderPoints ? d!.x2! : targetX;
    const y2 = hasBorderPoints ? d!.y2! : targetY;
    const path = `M ${x1} ${y1} L ${x2} ${y2}`;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    return (<g style={style}>
      <BaseEdge id={id} path={path} style={{
            strokeWidth: 1.5,
            stroke: '#e4e4e7',
            strokeDasharray: '6, 6',
        }} markerEnd={markerEnd}/>
      <rect x={midX - 42} y={midY - 10} width={84} height={20} fill="#1a1a1d" rx={4}/>
      <text x={midX} y={midY} textAnchor="middle" dominantBaseline="middle" fill="#e4e4e7" fontSize={11} fontFamily="ui-monospace, monospace">
        &lt;&lt;include&gt;&gt;
      </text>
    </g>);
}
export function UseCaseGeneralizationEdge({ id, sourceX, sourceY, targetX, targetY, data, style, }: EdgeProps) {
    const d = data as {
        x1?: number;
        y1?: number;
        x2?: number;
        y2?: number;
    } | undefined;
    const hasBorderPoints = d && typeof d.x1 === 'number' && typeof d.y1 === 'number' && typeof d.x2 === 'number' && typeof d.y2 === 'number';
    const x1 = hasBorderPoints ? d!.x1! : sourceX;
    const y1 = hasBorderPoints ? d!.y1! : sourceY;
    const x2 = hasBorderPoints ? d!.x2! : targetX;
    const y2 = hasBorderPoints ? d!.y2! : targetY;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const base = arrowBase(x2, y2, ux, uy, DEFAULT_ARROW_LENGTH);
    const path = `M ${x1} ${y1} L ${base.x} ${base.y}`;
    return (<g style={style}>
      <BaseEdge id={id} path={path} style={{
            strokeWidth: 1.5,
            stroke: '#e4e4e7',
        }}/>
      <GeneralizationArrow tipX={x2} tipY={y2} dirX={ux} dirY={uy} stroke="#e4e4e7" fill="#1a1a1d"/>
    </g>);
}
export function InitialStateNode({ data }: NodeProps) {
    return (<div className="flex items-center justify-center pointer-events-auto" style={{ width: 30, height: 30 }}>
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="source" position={Position.Left} id="left" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="source" position={Position.Top} id="top" style={{ opacity: 0, width: 1, height: 1 }}/>
      <div className="w-[20px] h-[20px] bg-[#e4e4e7] rounded-full"/>
    </div>);
}
export function FinalStateNode({ data }: NodeProps) {
    return (<div className="flex items-center justify-center pointer-events-auto" style={{ width: 30, height: 30 }}>
      <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="target" position={Position.Right} id="right" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="target" position={Position.Bottom} id="bottom" style={{ opacity: 0, width: 1, height: 1 }}/>
      <div className="w-[26px] h-[26px] border-2 border-[#e4e4e7] rounded-full flex items-center justify-center">
        <div className="w-[14px] h-[14px] bg-[#e4e4e7] rounded-full"/>
      </div>
    </div>);
}
export function StateNode({ data }: NodeProps) {
    const label = (data.label as string) || 'State';
    const explicitW = data.width as number | undefined;
    const explicitH = data.height as number | undefined;
    return (<div className="relative flex items-center justify-center pointer-events-auto shadow-md" style={{
            padding: '16px 24px',
            minWidth: 120,
            minHeight: 64,
            borderRadius: 12,
            background: 'linear-gradient(160deg, #252528 0%, #1e1e22 100%)',
            border: '1.5px solid #3f3f46',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            ...(explicitW != null && explicitH != null
                ? { width: explicitW, height: explicitH }
                : { width: 'fit-content', height: 'fit-content', maxWidth: 260 }),
        }}>
      <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0, width: 1, height: 1 }}/>
      <span className="text-[#e4e4e7] text-[12px] font-semibold font-mono text-center" style={{ overflow: 'visible', whiteSpace: 'nowrap', letterSpacing: '0.01em' }} title={label}>
        {label}
      </span>
    </div>);
}
export function CompositeStateNode({ data }: NodeProps) {
    const label = (data.label as string) || 'Composite State';
    const width = (data.width as number) ?? 400;
    const height = (data.height as number) ?? 300;
    return (<div className="relative flex flex-col pointer-events-auto" style={{
            width,
            height,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.025)',
            border: '1.5px solid #52525b',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        }}>
      <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0, width: 1, height: 1 }}/>
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0, width: 1, height: 1 }}/>
      
      <div className="w-full px-4 py-2 min-h-[40px] flex items-center justify-center" style={{
            borderBottom: '1px solid #3f3f46',
            borderRadius: '10px 10px 0 0',
            background: 'rgba(255,255,255,0.04)',
        }}>
        <span className="text-[#a1a1aa] text-[11px] font-semibold font-mono text-center tracking-wider uppercase" style={{ overflow: 'visible', whiteSpace: 'nowrap' }} title={label}>
          {label}
        </span>
      </div>
    </div>);
}
export function StateTransitionEdge({ id, sourceX, sourceY, targetX, targetY, style, data, markerEnd, }: EdgeProps) {
    const d = data as {
        x1?: number;
        y1?: number;
        x2?: number;
        y2?: number;
        sourcePos?: Position;
        targetPos?: Position;
        label?: string;
    } | undefined;
    const hasBorderPoints = d && typeof d.x1 === 'number' && typeof d.y1 === 'number' && typeof d.x2 === 'number' && typeof d.y2 === 'number';
    const x1 = hasBorderPoints ? d!.x1! : sourceX;
    const y1 = hasBorderPoints ? d!.y1! : sourceY;
    const x2 = hasBorderPoints ? d!.x2! : targetX;
    const y2 = hasBorderPoints ? d!.y2! : targetY;
    const sourcePos = d?.sourcePos ?? Position.Bottom;
    const targetPos = d?.targetPos ?? Position.Top;
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX: x1,
        sourceY: y1,
        sourcePosition: sourcePos,
        targetX: x2,
        targetY: y2,
        targetPosition: targetPos,
        borderRadius: 32,
    });
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;
    const labelOffset = 28;
    const labelPosX = labelX + perpX * labelOffset;
    const labelPosY = labelY + perpY * labelOffset;
    const label = typeof data?.label === 'string' ? data.label : '';
    return (<g style={style}>
      <BaseEdge id={id} path={edgePath} style={{
            strokeWidth: 1.5,
            stroke: '#71717a',
        }} markerEnd={markerEnd}/>
      {label && (<EdgeLabelRenderer>
          <div style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelPosX}px, ${labelPosY}px)`,
                background: '#1a1a1d',
                border: '1px solid #3f3f46',
                padding: '2px 8px',
                borderRadius: '6px',
                color: '#a1a1aa',
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace',
                pointerEvents: 'all',
                zIndex: 10,
                whiteSpace: 'nowrap',
            }}>
            {label}
          </div>
        </EdgeLabelRenderer>)}
    </g>);
}
