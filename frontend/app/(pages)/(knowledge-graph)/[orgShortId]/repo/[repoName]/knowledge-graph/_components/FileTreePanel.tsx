'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode, Search, Filter, PanelLeftClose, PanelLeft, Layers, GitMerge, Cpu, Zap, RotateCcw } from 'lucide-react';
import { useKGState } from '../../../../../_lib/useKGState';
import { FILTERABLE_LABELS, NODE_COLORS, ALL_EDGE_TYPES, EDGE_INFO, type EdgeType } from '../../../../../_lib/constants';
import { GraphNode, NodeLabel } from '../../../../../_lib/types';
interface TreeNode {
    id: string;
    name: string;
    type: 'folder' | 'file';
    path: string;
    children: TreeNode[];
    graphNode?: GraphNode;
}
const buildFileTree = (nodes: GraphNode[]): TreeNode[] => {
    const root: TreeNode[] = [];
    const pathMap = new Map<string, TreeNode>();
    const fileNodes = nodes.filter(n => n.label === 'Folder' || n.label === 'File');
    fileNodes.sort((a, b) => a.properties.filePath.localeCompare(b.properties.filePath));
    fileNodes.forEach(node => {
        const parts = node.properties.filePath.split('/').filter(Boolean);
        let currentPath = '';
        let currentLevel = root;
        parts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            let existing = pathMap.get(currentPath);
            if (!existing) {
                const isLastPart = index === parts.length - 1;
                const isFile = isLastPart && node.label === 'File';
                existing = {
                    id: isLastPart ? node.id : currentPath,
                    name: part,
                    type: isFile ? 'file' : 'folder',
                    path: currentPath,
                    children: [],
                    graphNode: isLastPart ? node : undefined,
                };
                pathMap.set(currentPath, existing);
                currentLevel.push(existing);
            }
            currentLevel = existing.children;
        });
    });
    return root;
};
interface TreeItemProps {
    node: TreeNode;
    depth: number;
    onNodeClick: (node: TreeNode) => void;
    expandedPaths: Set<string>;
    toggleExpanded: (path: string) => void;
    selectedPath: string | null;
}
const TreeItem = ({ node, depth, onNodeClick, expandedPaths, toggleExpanded, selectedPath }: TreeItemProps) => {
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = selectedPath === node.path;
    const hasChildren = node.children.length > 0;
    const handleClick = () => {
        if (hasChildren)
            toggleExpanded(node.path);
        onNodeClick(node);
    };
    return (<div>
      <button onClick={handleClick} className={`w-full flex items-center gap-1.5 px-2 py-[3px] text-left text-xs hover:bg-white/[0.04] transition-colors relative border-l-2 ${isSelected
            ? 'bg-[var(--color-primary)]/10 text-white border-[var(--color-primary)]'
            : 'text-white/50 hover:text-white/80 border-transparent'}`} style={{ paddingLeft: `${depth * 12 + 8}px` }}>
        {hasChildren ? (isExpanded
            ? <ChevronDown className="w-3 h-3 shrink-0 text-white/30"/>
            : <ChevronRight className="w-3 h-3 shrink-0 text-white/30"/>) : (<span className="w-3"/>)}
        {node.type === 'folder' ? (isExpanded
            ? <FolderOpen className="w-3.5 h-3.5 shrink-0" style={{ color: NODE_COLORS.Folder }}/>
            : <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: NODE_COLORS.Folder }}/>) : (<FileCode className="w-3.5 h-3.5 shrink-0" style={{ color: NODE_COLORS.File }}/>)}
        <span className="truncate font-mono">{node.name}</span>
      </button>

      {isExpanded && node.children.length > 0 && (<div>
          {node.children.map(child => (<TreeItem key={child.id} node={child} depth={depth + 1} onNodeClick={onNodeClick} expandedPaths={expandedPaths} toggleExpanded={toggleExpanded} selectedPath={selectedPath}/>))}
        </div>)}
    </div>);
};
interface FlatSearchResultProps {
    node: GraphNode;
    isSelected: boolean;
    query: string;
    onClick: () => void;
}
const FlatSearchResult = ({ node, isSelected, query, onClick }: FlatSearchResultProps) => {
    const fp = node.properties.filePath || '';
    const name = node.properties.name || fp.split('/').pop() || '';
    const dir = fp.includes('/') ? fp.substring(0, fp.lastIndexOf('/')) : '';
    const isFolder = node.label === 'Folder';
    const highlight = (text: string) => {
        const idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1)
            return <span>{text}</span>;
        return (<span>
            {text.slice(0, idx)}
            <span className="text-[var(--color-primary-light)] font-semibold">{text.slice(idx, idx + query.length)}</span>
            {text.slice(idx + query.length)}
        </span>);
    };
    return (<button onClick={onClick} className={`w-full flex items-start gap-2 px-3 py-2 text-left text-xs hover:bg-white/[0.04] transition-colors border-l-2 ${isSelected ? 'bg-[var(--color-primary)]/10 text-white border-[var(--color-primary)]' : 'text-white/60 hover:text-white/90 border-transparent'}`}>
            {isFolder
            ? <Folder className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: NODE_COLORS.Folder }}/>
            : <FileCode className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: NODE_COLORS.File }}/>}
            <div className="min-w-0">
                <div className="font-mono truncate">{highlight(name)}</div>
                {dir && <div className="text-[10px] text-white/25 font-mono truncate mt-0.5">{dir}</div>}
            </div>
        </button>);
};
const LANG_COLORS: Record<string, string> = {
    python: '#3572A5',
    typescript: '#2b7489',
    javascript: '#f1e05a',
    java: '#b07219',
    go: '#00ADD8',
    rust: '#dea584',
    cpp: '#f34b7d',
    c: '#555555',
    ruby: '#CC342D',
    php: '#4F5D95',
    swift: '#F05138',
    kotlin: '#A97BFF',
};
const langColor = (lang: string) => LANG_COLORS[lang.toLowerCase()] ?? '#6366f1';
const PRESETS: {
    id: string;
    label: string;
    icon: React.ElementType;
    labels: string[];
}[] = [
    { id: 'all', label: 'Everything', icon: Layers, labels: ['Folder', 'File', 'Class', 'Function', 'Method', 'Interface'] },
    { id: 'structure', label: 'Structure', icon: GitMerge, labels: ['Folder', 'File'] },
    { id: 'logic', label: 'Logic', icon: Cpu, labels: ['Class', 'Function', 'Method', 'Interface'] },
    { id: 'callgraph', label: 'Call graph', icon: Zap, labels: ['Function', 'Method'] },
];
interface FiltersPanelProps {
    graph: {
        nodes: GraphNode[];
        relationships: {
            type: string;
        }[];
    } | null;
    visibleLabels: string[];
    toggleLabelVisibility: (label: NodeLabel) => void;
    visibleEdgeTypes: string[];
    toggleEdgeVisibility: (edge: EdgeType) => void;
}
const FiltersPanel = ({ graph, visibleLabels, toggleLabelVisibility, visibleEdgeTypes, toggleEdgeVisibility }: FiltersPanelProps) => {
    const [activePreset, setActivePreset] = useState<string | null>(null);
    const nodeCounts = useMemo(() => {
        const map: Record<string, number> = {};
        graph?.nodes.forEach(n => { map[n.label] = (map[n.label] ?? 0) + 1; });
        return map;
    }, [graph]);
    const edgeCounts = useMemo(() => {
        const map: Record<string, number> = {};
        graph?.relationships.forEach(r => { map[r.type] = (map[r.type] ?? 0) + 1; });
        return map;
    }, [graph]);
    const languages = useMemo(() => {
        const map: Record<string, number> = {};
        graph?.nodes.forEach(n => {
            const lang = n.properties.language as string | undefined;
            if (lang)
                map[lang] = (map[lang] ?? 0) + 1;
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [graph]);
    const applyPreset = (preset: typeof PRESETS[0]) => {
        setActivePreset(preset.id);
        FILTERABLE_LABELS.forEach(lbl => {
            const shouldBeVisible = preset.labels.includes(lbl);
            const isVisible = visibleLabels.includes(lbl);
            if (shouldBeVisible !== isVisible)
                toggleLabelVisibility(lbl);
        });
    };
    const resetPreset = () => {
        setActivePreset(null);
        FILTERABLE_LABELS.forEach(lbl => {
            if (!visibleLabels.includes(lbl))
                toggleLabelVisibility(lbl);
        });
    };
    return (<div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#1e1e1e]">

            
            <div className="px-3 pt-3 pb-3">
                <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">View Presets</p>
                    {activePreset && (<button onClick={resetPreset} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
                            <RotateCcw className="w-2.5 h-2.5"/> Reset
                        </button>)}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                    {PRESETS.map(p => {
            const Icon = p.icon;
            const isActive = activePreset === p.id;
            return (<button key={p.id} onClick={() => applyPreset(p)} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${isActive
                    ? 'bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 text-[var(--color-primary-light)]'
                    : 'bg-[#1a1a1a] border border-[#262626] text-white/50 hover:text-white/80 hover:border-white/10'}`}>
                                <Icon className="w-3 h-3 shrink-0"/>
                                <span className="text-[11px] font-medium">{p.label}</span>
                            </button>);
        })}
                </div>
            </div>

            
            <div className="px-3 pt-3 pb-3">
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2.5">Node Types</p>
                <div className="grid grid-cols-3 gap-1">
                    {FILTERABLE_LABELS.map(label => {
            const isVisible = visibleLabels.includes(label);
            const count = nodeCounts[label] ?? 0;
            const color = NODE_COLORS[label];
            return (<button key={label} onClick={() => { setActivePreset(null); toggleLabelVisibility(label); }} className={`flex flex-col items-center gap-1.5 px-1 py-2.5 rounded-lg text-center transition-all ${isVisible
                    ? 'border border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'
                    : 'border border-transparent opacity-30 hover:opacity-50'}`}>
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}/>
                                <span className="text-[10px] font-medium text-white/65 leading-none">{label}</span>
                                <span className="text-[9px] font-mono rounded px-1 py-0.5 leading-none" style={{ color, backgroundColor: `${color}18` }}>
                                    {count}
                                </span>
                            </button>);
        })}
                </div>
            </div>

            
            <div className="px-3 pt-3 pb-3">
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2.5">Relationships</p>
                <div className="flex flex-col gap-0.5">
                    {ALL_EDGE_TYPES.map(edgeType => {
            const info = EDGE_INFO[edgeType];
            const isVisible = visibleEdgeTypes.includes(edgeType);
            const count = edgeCounts[edgeType] ?? 0;
            return (<button key={edgeType} onClick={() => toggleEdgeVisibility(edgeType)} className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-all ${isVisible ? 'hover:bg-white/[0.03]' : 'opacity-30 hover:opacity-50'}`}>
                                
                                <div className="flex items-center gap-0.5 w-10 shrink-0">
                                    <div className="h-px flex-1" style={{ backgroundColor: info.color }}/>
                                    <div className="w-0 h-0 border-t-[3px] border-b-[3px] border-l-[5px] border-t-transparent border-b-transparent" style={{ borderLeftColor: info.color }}/>
                                </div>
                                <span className={`text-xs flex-1 ${isVisible ? 'text-white/65' : 'text-white/30'}`}>{info.label}</span>
                                <span className="text-[9px] font-mono text-white/20 tabular-nums">{count}</span>
                            </button>);
        })}
                </div>
            </div>

            
            {languages.length > 0 && (<div className="px-3 pt-3 pb-4">
                    <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2.5">Languages</p>
                    <div className="flex flex-col gap-1.5">
                        {languages.map(([lang, count]) => {
                const total = languages.reduce((s, [, c]) => s + c, 0);
                const pct = Math.round((count / total) * 100);
                const color = langColor(lang);
                return (<div key={lang} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }}/>
                                    <span className="text-[11px] text-white/55 capitalize flex-1 font-mono">{lang}</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }}/>
                                        </div>
                                        <span className="text-[9px] font-mono text-white/20 w-6 text-right">{pct}%</span>
                                    </div>
                                </div>);
            })}
                    </div>
                </div>)}
        </div>);
};
interface FileTreePanelProps {
    onFocusNode: (nodeId: string) => void;
    onCollapsedChange?: (collapsed: boolean) => void;
}
export const FileTreePanel = ({ onFocusNode, onCollapsedChange }: FileTreePanelProps) => {
    const { graph, visibleLabels, toggleLabelVisibility, visibleEdgeTypes, toggleEdgeVisibility, selectedNode, setSelectedNode, openCodePanel } = useKGState();
    const [isCollapsed, setIsCollapsed] = useState(false);
    useEffect(() => {
        onCollapsedChange?.(isCollapsed);
    }, [isCollapsed, onCollapsedChange]);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'files' | 'filters'>('files');
    const fileTree = useMemo(() => (graph ? buildFileTree(graph.nodes) : []), [graph]);
    useEffect(() => {
        if (fileTree.length > 0 && expandedPaths.size === 0) {
            setExpandedPaths(new Set(fileTree.map(n => n.path)));
        }
    }, [fileTree.length]);
    useEffect(() => {
        const path = selectedNode?.properties?.filePath;
        if (!path)
            return;
        const parts = path.split('/').filter(Boolean);
        const pathsToExpand: string[] = [];
        let currentPath = '';
        for (let i = 0; i < parts.length - 1; i++) {
            currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
            pathsToExpand.push(currentPath);
        }
        if (pathsToExpand.length > 0) {
            setExpandedPaths(prev => {
                const next = new Set(prev);
                pathsToExpand.forEach(p => next.add(p));
                return next;
            });
        }
    }, [selectedNode?.id]);
    const toggleExpanded = useCallback((path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path))
                next.delete(path);
            else
                next.add(path);
            return next;
        });
    }, []);
    const handleNodeClick = useCallback((treeNode: TreeNode) => {
        if (treeNode.graphNode) {
            const isSameNode = selectedNode?.id === treeNode.graphNode.id;
            setSelectedNode(treeNode.graphNode);
            if (treeNode.type === 'file' || treeNode.graphNode.properties.filePath) {
                openCodePanel();
            }
            if (!isSameNode)
                onFocusNode(treeNode.graphNode.id);
        }
    }, [setSelectedNode, openCodePanel, onFocusNode, selectedNode]);
    const selectedPath = selectedNode?.properties.filePath || null;
    const flatSearchResults = useMemo(() => {
        if (!searchQuery.trim() || !graph)
            return null;
        const q = searchQuery.toLowerCase();
        return graph.nodes
            .filter(n => (n.label === 'File' || n.label === 'Folder') &&
            (n.properties.name?.toLowerCase().includes(q) ||
                n.properties.filePath?.toLowerCase().includes(q)))
            .sort((a, b) => {
            const an = (a.properties.name || '').toLowerCase();
            const bn = (b.properties.name || '').toLowerCase();
            const aStarts = an.startsWith(q) ? 0 : 1;
            const bStarts = bn.startsWith(q) ? 0 : 1;
            if (aStarts !== bStarts)
                return aStarts - bStarts;
            return an.localeCompare(bn);
        });
    }, [searchQuery, graph]);
    const tabCls = (tab: 'files' | 'filters') => `px-3 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === tab
        ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary-light)]'
        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'}`;
    if (isCollapsed) {
        return (<div className="h-full w-12 shrink-0 bg-[#121215] border border-[#262626] rounded-xl shadow-xl shadow-black/30 flex flex-col items-center py-3 gap-1">
        <button onClick={() => setIsCollapsed(false)} className="p-2 text-white/30 hover:text-white/80 hover:bg-white/[0.04] rounded-lg transition-colors" title="Expand">
          <PanelLeft className="w-4 h-4"/>
        </button>
        <div className="w-5 h-px bg-[#262626] my-1"/>
        <button onClick={() => { setIsCollapsed(false); setActiveTab('files'); }} className={`p-2 rounded-lg transition-colors ${activeTab === 'files' ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]'}`} title="Explorer">
          <Folder className="w-4 h-4"/>
        </button>
        <button onClick={() => { setIsCollapsed(false); setActiveTab('filters'); }} className={`p-2 rounded-lg transition-colors ${activeTab === 'filters' ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]'}`} title="Filters">
          <Filter className="w-4 h-4"/>
        </button>
      </div>);
    }
    return (<div className="h-full w-64 shrink-0 min-h-0 flex flex-col bg-[#121215] border border-[#262626] rounded-xl shadow-xl shadow-black/30 overflow-hidden">
      
      <div className="px-3 pt-3 pb-2 border-b border-[#262626] shrink-0">
        <div className="flex items-center gap-2 mb-2 min-w-0">
          <div className="flex gap-1 flex-1 min-w-0">
            <button type="button" onClick={() => setActiveTab('files')} className={tabCls('files')}>Explorer</button>
            <button type="button" onClick={() => setActiveTab('filters')} className={tabCls('filters')}>Filters</button>
          </div>
          <button type="button" onClick={() => setIsCollapsed(true)} className="p-1.5 shrink-0 text-white/25 hover:text-white/70 hover:bg-white/[0.04] rounded-lg transition-colors" title="Collapse">
            <PanelLeftClose className="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>

      {activeTab === 'files' && (<>
          <div className="px-3 py-2 border-b border-[#262626]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25"/>
              <input type="text" placeholder="Search files..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-7 pr-3 py-1.5 bg-[#1a1a1a] border border-[#262626] rounded text-xs text-white/80 placeholder:text-white/25 focus:outline-none focus:border-[var(--color-primary)]/60 transition-colors"/>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-1 custom-scrollbar">
            {fileTree.length === 0 ? (<div className="px-3 py-6 text-center text-white/25 text-xs">No files loaded</div>) : flatSearchResults ? (flatSearchResults.length === 0 ? (<div className="px-3 py-6 text-center text-white/25 text-xs">No files match "{searchQuery}"</div>) : (<div>
                        <div className="px-3 py-1 text-[10px] text-white/20 font-mono">{flatSearchResults.length} result{flatSearchResults.length !== 1 ? 's' : ''}</div>
                        {flatSearchResults.map(node => (<FlatSearchResult key={node.id} node={node} isSelected={selectedNode?.id === node.id} query={searchQuery} onClick={() => {
                        setSelectedNode(node);
                        if (node.label === 'File')
                            openCodePanel();
                        onFocusNode(node.id);
                    }}/>))}
                    </div>)) : (fileTree.map(node => (<TreeItem key={node.id} node={node} depth={0} onNodeClick={handleNodeClick} expandedPaths={expandedPaths} toggleExpanded={toggleExpanded} selectedPath={selectedPath}/>)))}
          </div>
        </>)}

      {activeTab === 'filters' && (<FiltersPanel graph={graph} visibleLabels={visibleLabels} toggleLabelVisibility={toggleLabelVisibility} visibleEdgeTypes={visibleEdgeTypes} toggleEdgeVisibility={toggleEdgeVisibility}/>)}

      
      {graph && (<div className="px-3 py-2 border-t border-[#262626] bg-[#0e0e11]">
          <div className="flex items-center justify-between text-[10px] text-white/25 font-mono">
            <span>{graph.nodes.length} nodes</span>
            <span>{graph.relationships.length} edges</span>
          </div>
        </div>)}
    </div>);
};
