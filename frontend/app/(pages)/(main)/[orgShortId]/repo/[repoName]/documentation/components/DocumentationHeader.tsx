'use client';
import TextInput from '@/app/components/TextInput';
type TabType = 'documentation' | 'visual-tree' | 'code-reference' | 'glossary' | 'uml-diagrams';
interface DocumentationHeaderProps {
    activeTab: TabType;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
    onGenerateClick?: () => void;
}
export default function DocumentationHeader({ activeTab, searchQuery = '', onSearchChange, onGenerateClick, }: DocumentationHeaderProps) {
    const getTitle = () => {
        switch (activeTab) {
            case 'documentation':
                return 'Documentation';
            case 'uml-diagrams':
                return 'UML Diagrams';
            case 'visual-tree':
                return 'Visual Tree';
            case 'code-reference':
                return 'Code Reference';
            case 'glossary':
                return 'Glossary';
            default:
                return '';
        }
    };
    return (<div className="flex justify-between items-center mb-6 gap-4">
      <h2 className="text-2xl font-bold text-white">
        {getTitle()}
      </h2>
      {(activeTab === 'documentation' || activeTab === 'uml-diagrams') && (<div className="flex items-center gap-4 flex-wrap">
          
          <div className="w-128 relative">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <TextInput type="text" id="documentationSearch" value={searchQuery} onChange={(e) => onSearchChange?.(e.target.value)} placeholder={activeTab === 'uml-diagrams' ? 'Search UML diagrams...' : 'Search documentations...'} className="w-full pl-10"/>
          </div>
          <button type="button" onClick={onGenerateClick} className="relative min-w-[220px] px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded text-white text-sm font-semibold overflow-hidden transition-all duration-300 cursor-pointer group shadow-lg hover:shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.4)] hover:scale-[1.02] active:scale-[0.98]">
            <span className="relative z-[1]">
              {activeTab === 'uml-diagrams' ? 'Generate diagram' : 'Generate Documentation'}
            </span>
            <span className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary-light)] to-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></span>
          </button>
        </div>)}
      {activeTab === 'code-reference' && (<div className="flex items-center gap-4">
          
          <div className="w-128 relative">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <TextInput type="text" id="codeReferenceSearch" value={searchQuery} onChange={(e) => onSearchChange?.(e.target.value)} placeholder="Search code references..." className="w-full pl-10"/>
          </div>
        </div>)}
    </div>);
}
