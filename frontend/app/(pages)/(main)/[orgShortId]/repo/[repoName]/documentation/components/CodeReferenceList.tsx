'use client';
import { useState, useMemo, useCallback, useRef } from 'react';
import CodeSnippet from './CodeSnippet';
interface CodeReference {
    _id?: string;
    referenceId: string;
    name: string;
    type?: 'function' | 'class' | 'method' | 'module';
    module?: string;
    filePath?: string;
    description: string;
    signature?: string;
    parameters?: Array<{
        name: string;
        type: string;
        required: boolean;
        default?: any;
        description: string;
    }>;
    returns?: {
        type: string;
        description: string;
    };
    code?: string;
}
interface CodeReferenceListProps {
    codeReferences: CodeReference[];
    loading: boolean;
    error: string | null;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}
function parseDescription(text: string): (string | React.ReactElement)[] {
    if (!text)
        return [text];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = codeBlockRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        const language = match[1] || '';
        const code = match[2];
        parts.push(<CodeSnippet key={key++} language={language} code={code}/>);
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? parts : [text];
}
export default function CodeReferenceList({ codeReferences, loading, error, searchQuery, onSearchChange, }: CodeReferenceListProps) {
    const [expandedRefs, setExpandedRefs] = useState<Set<string>>(new Set());
    const parsedDescriptionsCache = useRef(new Map<string, (string | React.ReactElement)[]>());
    const getParsedDescription = useCallback((text: string): (string | React.ReactElement)[] => {
        if (!text)
            return [text];
        const cache = parsedDescriptionsCache.current;
        if (cache.has(text)) {
            return cache.get(text)!;
        }
        const parsed = parseDescription(text);
        cache.set(text, parsed);
        return parsed;
    }, []);
    const toggleRefExpansion = (refId: string) => {
        setExpandedRefs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(refId)) {
                newSet.delete(refId);
            }
            else {
                newSet.add(refId);
            }
            return newSet;
        });
    };
    const filteredCodeReferences = useMemo(() => {
        if (!searchQuery.trim())
            return codeReferences;
        const query = searchQuery.toLowerCase();
        return codeReferences.filter(ref => ref.name.toLowerCase().includes(query));
    }, [codeReferences, searchQuery]);
    if (loading) {
        return (<div className="flex flex-col gap-4">
        {[1, 2, 3, 4, 5].map((i) => (<div key={i} className="w-full">
            <div className="flex flex-col w-full">
              <div className="h-6 bg-white/10 rounded mb-2 animate-pulse w-full"></div>
              <div className="h-4 bg-white/10 rounded mb-4 w-2/3 animate-pulse"></div>
            </div>
          </div>))}
      </div>);
    }
    if (error) {
        return (<div className="bg-red-500/10 border border-red-500/50 rounded p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>);
    }
    if (filteredCodeReferences.length === 0) {
        return (<div className="text-center py-12">
        <p className="text-white/60 mb-2">
          {searchQuery ? 'No code references match your search' : 'No code references found'}
        </p>
        <p className="text-white/40 text-sm">
          {searchQuery ? 'Try a different search term' : 'Code references will appear here after documentation is generated.'}
        </p>
      </div>);
    }
    return (<div className="pb-4">
      <div className="flex flex-col gap-6">
        {filteredCodeReferences.map((ref) => {
            const isExpanded = expandedRefs.has(ref.referenceId);
            return (<div key={ref.referenceId} className="w-full cursor-pointer group">
              <div className="flex flex-col h-full hover:text-[var(--color-primary)] transition-colors" onClick={() => toggleRefExpansion(ref.referenceId)}>
                
                <div className="flex items-center gap-3">
                  <svg className={`w-5 h-5 text-white/60 flex-shrink-0 transition-transform duration-300 ease-in-out ${isExpanded ? 'transform rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                  <h3 className="text-white/65 font-semibold text-lg line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">
                    {ref.name}
                  </h3>
                </div>
              </div>
              
              
              {isExpanded && (<div className="mt-6 space-y-4">
                  
                  {ref.signature && (<div className="text-white/70 text-sm font-mono mb-4">
                      {ref.type && (<span className="text-white/60 mr-2">
                          {ref.type}
                        </span>)}
                      {ref.signature}
                    </div>)}
                  
                  
                  {ref.description && (<div className="prose prose-invert max-w-none mb-4">
                      <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                        {getParsedDescription(ref.description)}
                      </p>
                    </div>)}
                  
                  
                  {ref.parameters && ref.parameters.length > 0 && (<div className="mt-4 mb-4">
                      <h4 className="text-sm font-semibold text-white/60 mb-3">Parameters:</h4>
                      <div className="space-y-3 ml-4">
                        {ref.parameters.map((param, paramIdx) => (<div key={paramIdx} className="border-l-2 border-white/10 pl-4">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-mono text-[#3fb1c5]">{param.name}</span>
                            </div>
                            {param.description && (<p className="text-white/60 text-sm mt-1 ml-0">
                                {getParsedDescription(param.description)}
                              </p>)}
                          </div>))}
                      </div>
                    </div>)}
                  
                  
                  {ref.code && (<CodeSnippet code={ref.code} language={ref.type === 'class' ? 'typescript' : undefined}/>)}
                  
                  
                  {ref.returns && (<div className="mt-4 mb-4">
                      <h4 className="text-sm font-semibold text-white/60 mb-2">Returns:</h4>
                      <div className="ml-4">
                        {ref.returns.type && (<span className="font-mono text-[#3fb1c5]">{ref.returns.type}</span>)}
                        {ref.returns.description && (<p className="text-white/60 text-sm mt-1">
                            {getParsedDescription(ref.returns.description)}
                          </p>)}
                      </div>
                    </div>)}
                </div>)}
            </div>);
        })}
      </div>
    </div>);
}
