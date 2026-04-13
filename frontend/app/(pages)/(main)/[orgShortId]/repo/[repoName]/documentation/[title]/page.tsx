'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import JSZip from 'jszip';
import { useDocumentation } from '../context/DocumentationContext';
import CodeSnippet from '../components/CodeSnippet';
import ArchitectureSectionCanvas from '../components/ArchitectureSectionCanvas';
import ArchitectureClassDiagramCanvas, { type ApiUmlClass, type ApiUmlRelationship } from '../components/ArchitectureClassDiagramCanvas';
import { slugify } from '@/lib/utils/slug';
type DocSegment = {
    type: 'paragraph';
    content: (string | React.ReactElement)[];
} | {
    type: 'code';
    content: string;
    language?: string;
} | {
    type: 'table';
    rows: string[][];
};
function parseInline(text: string, onCodeRefClick?: (codeRefId: string) => void, keyStart: number = 0): {
    parts: (string | React.ReactElement)[];
    nextKey: number;
} {
    const parts: (string | React.ReactElement)[] = [];
    let key = keyStart;
    let hasMatches = false;
    const allMatches: Array<{
        type: 'link' | 'code' | 'bold';
        start: number;
        end: number;
        text: string;
        priority: number;
    }> = [];
    const patterns = [
        { regex: /`\[\[([^\]]+)\]\]`/g, type: 'link', priority: 4 },
        { regex: /\[\[([^\]]+)\]\]/g, type: 'link', priority: 3 },
        { regex: /`([^`\n]+)`/g, type: 'code', priority: 2 },
        { regex: /\*\*([^*\n]+?)\*\*/g, type: 'bold', priority: 1 },
    ];
    patterns.forEach(({ regex, type, priority }) => {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
            allMatches.push({ type: type as 'link' | 'code' | 'bold', start: match.index, end: match.index + match[0].length, text: match[1], priority });
        }
    });
    allMatches.sort((a, b) => (a.start !== b.start ? a.start - b.start : b.priority - a.priority));
    const filteredMatches: typeof allMatches = [];
    for (const current of allMatches) {
        let shouldAdd = true;
        for (let i = 0; i < filteredMatches.length; i++) {
            const existing = filteredMatches[i];
            if (current.start < existing.end && current.end > existing.start) {
                if (current.priority > existing.priority)
                    filteredMatches[i] = current;
                shouldAdd = false;
                break;
            }
        }
        if (shouldAdd)
            filteredMatches.push(current);
    }
    filteredMatches.sort((a, b) => a.start - b.start);
    let lastIndex = 0;
    for (const match of filteredMatches) {
        hasMatches = true;
        if (match.start > lastIndex)
            parts.push(text.substring(lastIndex, match.start));
        const cleanText = match.text.replace(/[`\[\]]/g, '');
        if (match.type === 'link') {
            const codeRefId = `code-ref-${cleanText}`;
            parts.push(<a key={key++} href={`#${codeRefId}`} onClick={(e) => {
                    e.preventDefault();
                    if (onCodeRefClick)
                        onCodeRefClick(codeRefId);
                    else {
                        const el = document.getElementById(codeRefId);
                        if (el)
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        else
                            document.getElementById('code-references-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }} className="inline font-bold text-orange-400 underline underline-offset-2 cursor-pointer hover:text-orange-300 transition-colors">
          {cleanText}
        </a>);
        }
        else if (match.type === 'code') {
            parts.push(<span key={key++} className="inline px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: 'rgba(128, 128, 128, 0.3)' }}>{cleanText}</span>);
        }
        else if (match.type === 'bold') {
            parts.push(<strong key={key++} className="font-semibold text-white">{match.text}</strong>);
        }
        lastIndex = match.end;
    }
    if (lastIndex < text.length)
        parts.push(text.substring(lastIndex));
    return { parts: hasMatches ? parts : [text], nextKey: key };
}
function DocTable({ rows, compact = false }: {
    rows: string[][];
    compact?: boolean;
}) {
    if (!rows.length)
        return null;
    const [headerRow, ...bodyRows] = rows;
    const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
    const textSize = compact ? 'text-xs' : 'text-sm';
    return (<div className="my-4 overflow-x-auto rounded-lg border border-white/15 bg-white/[0.03] shadow-sm ring-1 ring-white/5 min-w-0">
      <table className={`w-full border-collapse ${textSize} text-white/90`}>
        <thead>
          <tr className="border-b border-white/20 bg-white/[0.06]">
            {headerRow.map((cell, ci) => (<th key={ci} className={`${cellPadding} text-left font-semibold text-white/95`}>
                {cell}
              </th>))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, ri) => (<tr key={ri} className={`border-b border-white/10 last:border-b-0 ${ri % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}`}>
              {row.map((cell, ci) => (<td key={ci} className={`${cellPadding} text-left text-white/85 align-top`}>
                  {cell}
                </td>))}
            </tr>))}
        </tbody>
      </table>
    </div>);
}
function splitTablesAndParagraphs(text: string): Array<{
    type: 'table';
    rows: string[][];
} | {
    type: 'paragraph';
    content: string;
}> {
    const result: Array<{
        type: 'table';
        rows: string[][];
    } | {
        type: 'paragraph';
        content: string;
    }> = [];
    const lines = text.split('\n');
    let i = 0;
    const isTableLine = (line: string) => /^\|.+\|$/.test(line.trim());
    const isSeparatorLine = (cells: string[]) => cells.every((c) => /^[\s\-:]+$/.test(c));
    while (i < lines.length) {
        if (isTableLine(lines[i])) {
            const tableRows: string[][] = [];
            let j = i;
            while (j < lines.length && isTableLine(lines[j])) {
                const cells = lines[j].trim().split('|').map((c) => c.trim());
                if (cells[0] === '')
                    cells.shift();
                if (cells.length > 0 && cells[cells.length - 1] === '')
                    cells.pop();
                tableRows.push(cells);
                j++;
            }
            if (tableRows.length >= 2 && isSeparatorLine(tableRows[1]))
                tableRows.splice(1, 1);
            if (tableRows.length >= 1) {
                result.push({ type: 'table', rows: tableRows });
                i = j;
                continue;
            }
        }
        let paraStart = i;
        while (i < lines.length && !isTableLine(lines[i]))
            i++;
        const paraContent = lines.slice(paraStart, i).join('\n');
        if (paraContent.trim().length > 0)
            result.push({ type: 'paragraph', content: paraContent });
    }
    return result;
}
function parseDescription(description: string, onCodeRefClick?: (codeRefId: string) => void): DocSegment[] {
    const segments: DocSegment[] = [];
    const fenceRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let key = 0;
    let lastEnd = 0;
    let match;
    while ((match = fenceRegex.exec(description)) !== null) {
        const before = description.slice(lastEnd, match.index).trimEnd();
        if (before.length > 0) {
            for (const block of splitTablesAndParagraphs(before)) {
                if (block.type === 'table') {
                    segments.push({ type: 'table', rows: block.rows });
                }
                else {
                    const { parts, nextKey } = parseInline(block.content, onCodeRefClick, key);
                    key = nextKey;
                    segments.push({ type: 'paragraph', content: parts });
                }
            }
        }
        const language = match[1]?.trim() || undefined;
        const codeContent = match[2].replace(/\n$/, '');
        segments.push({ type: 'code', content: codeContent, language });
        lastEnd = fenceRegex.lastIndex;
    }
    const after = description.slice(lastEnd);
    if (after.length > 0) {
        for (const block of splitTablesAndParagraphs(after)) {
            if (block.type === 'table') {
                segments.push({ type: 'table', rows: block.rows });
            }
            else {
                const { parts, nextKey } = parseInline(block.content, onCodeRefClick, key);
                key = nextKey;
                segments.push({ type: 'paragraph', content: parts });
            }
        }
    }
    if (segments.length === 0) {
        for (const block of splitTablesAndParagraphs(description)) {
            if (block.type === 'table') {
                segments.push({ type: 'table', rows: block.rows });
            }
            else {
                const { parts, nextKey } = parseInline(block.content, onCodeRefClick, key);
                key = nextKey;
                segments.push({ type: 'paragraph', content: parts });
            }
        }
    }
    return segments;
}
interface CodeReferenceDetail {
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
    examples?: Array<{
        code: string;
        description: string;
    }>;
    seeAlso?: string[];
    code?: string;
}
function extractMdFromFenced(description: string): string | null {
    const match = description.match(/^```(?:md)?\s*\n([\s\S]*?)\n```\s*$/);
    return match ? match[1].trimEnd() : null;
}
function isAiAgentMdDoc(doc: DocumentationContent): boolean {
    return (doc.metadata?.documentation_type === 'aiAgent' &&
        doc.metadata?.ai_agent_doc_kind === 'custom');
}
function buildMarkdownExport(doc: DocumentationContent): string {
    const lines: string[] = [];
    lines.push(`# ${doc.title}\n`);
    if (doc.metadata?.generated_at) {
        lines.push(`*Generated: ${doc.metadata.generated_at}*\n`);
    }
    const sections = doc.documentation?.sections ?? [];
    for (const section of sections) {
        lines.push(`## ${section.id}. ${section.title}\n`);
        lines.push(section.description.trimEnd());
        lines.push('\n');
        if (section.subsections?.length) {
            for (const sub of section.subsections) {
                lines.push(`### ${sub.id}. ${sub.title}\n`);
                lines.push(sub.description.trimEnd());
                lines.push('\n');
            }
        }
    }
    const refs = doc.code_references ?? [];
    if (refs.length > 0) {
        lines.push('## Code References\n\n');
        for (const ref of refs) {
            const isDetail = typeof ref === 'object' && 'name' in ref;
            const name = isDetail ? (ref as CodeReferenceDetail).name : String(ref);
            const desc = isDetail ? (ref as CodeReferenceDetail).description ?? '' : '';
            const code = isDetail ? (ref as CodeReferenceDetail).code ?? '' : '';
            lines.push(`### ${name}\n\n`);
            if (desc)
                lines.push(desc.trimEnd(), '\n\n');
            if (code)
                lines.push('```\n', code, '\n```\n\n');
        }
    }
    return lines.join('');
}
function sectionToFilename(section: {
    id: string;
    title: string;
}): string {
    const base = section.title.trim();
    const hasExt = /\.md$/i.test(base);
    const safe = base.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-') || section.id;
    return hasExt ? safe : `${slugify(safe) || section.id}.md`;
}
interface DocumentationContent {
    _id: string;
    title: string;
    metadata: {
        title: string;
        generated_at?: string;
        prompt?: string;
        repository?: string;
        branch?: string;
        scope?: string;
        documentation_type?: string;
        ai_agent_doc_kind?: string;
    };
    documentation: {
        sections: Array<{
            id: string;
            title: string;
            description: string;
            code_references?: string[];
            diagramType?: 'flowchart' | 'class' | null;
            diagram?: {
                nodes: {
                    id: string;
                    label: string;
                }[];
                edges: {
                    source: string;
                    target: string;
                }[];
            } | {
                classes: Array<{
                    id: string;
                    className: string;
                    attributes: unknown[];
                    methods: unknown[];
                }>;
                relationships: Array<{
                    source: string;
                    target: string;
                    relationship: string;
                }>;
            } | null;
            subsections?: Array<{
                id: string;
                title: string;
                description: string;
                code_references?: string[];
                diagramType?: 'flowchart' | 'class' | null;
                diagram?: {
                    nodes: {
                        id: string;
                        label: string;
                    }[];
                    edges: {
                        source: string;
                        target: string;
                    }[];
                } | {
                    classes: unknown[];
                    relationships: unknown[];
                } | null;
            }>;
        }>;
    };
    code_references?: (string | CodeReferenceDetail)[];
}
export default function DocumentationTitlePage() {
    const router = useRouter();
    const params = useParams<{
        orgShortId: string;
        repoName: string;
        title: string | string[];
    }>();
    const searchParams = useSearchParams();
    const { setDocumentation, setActiveSection } = useDocumentation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [content, setContent] = useState<DocumentationContent | null>(null);
    const [exporting, setExporting] = useState(false);
    const handleExport = useCallback(async () => {
        if (!content)
            return;
        setExporting(true);
        try {
            const folderName = content.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') || 'documentation';
            if (isAiAgentMdDoc(content)) {
                const zip = new JSZip();
                const sections = content.documentation?.sections ?? [];
                for (const section of sections) {
                    const rawMd = extractMdFromFenced(section.description);
                    const text = rawMd ?? section.description.trimEnd();
                    const filename = sectionToFilename(section);
                    zip.file(filename, text);
                }
                const blob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${folderName}.zip`;
                a.click();
                URL.revokeObjectURL(url);
            }
            else {
                const md = buildMarkdownExport(content);
                const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${folderName}.md`;
                a.click();
                URL.revokeObjectURL(url);
            }
        }
        finally {
            setExporting(false);
        }
    }, [content]);
    useEffect(() => {
        setDocumentation(null);
        const fetchDocumentation = async () => {
            try {
                setLoading(true);
                setError(null);
                const legacyTitleQuery = searchParams.get('title');
                const rawParamTitle = Array.isArray(params?.title) ? params.title[0] : params?.title;
                const isLegacyPlaceholder = rawParamTitle === 'title' && !!legacyTitleQuery;
                const rawTitle = isLegacyPlaceholder ? legacyTitleQuery : (rawParamTitle ?? legacyTitleQuery);
                if (!rawTitle) {
                    setError('No title provided');
                    setLoading(false);
                    return;
                }
                let decodedTitle = rawTitle;
                try {
                    decodedTitle = decodeURIComponent(rawTitle);
                }
                catch {
                }
                if (isLegacyPlaceholder && params?.orgShortId && params?.repoName) {
                    const canonicalSlug = slugify(decodedTitle) || decodedTitle;
                    const canonicalPath = `/${params.orgShortId}/repo/${params.repoName}/documentation/${encodeURIComponent(canonicalSlug)}`;
                    router.replace(canonicalPath);
                }
                const response = await fetch(`/api/documentation/content/${encodeURIComponent(decodedTitle)}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch documentation');
                }
                const data = await response.json();
                if (data.success) {
                    setContent(data.documentation);
                    const realTitle: string | undefined = data.documentation?.title;
                    const expectedSlug = realTitle ? slugify(realTitle) : '';
                    const currentParam = Array.isArray(params?.title) ? params.title[0] : params?.title;
                    let currentSlug = currentParam || '';
                    try {
                        currentSlug = currentParam ? decodeURIComponent(currentParam) : '';
                    }
                    catch {
                    }
                    if (expectedSlug &&
                        currentParam &&
                        params?.orgShortId &&
                        params?.repoName &&
                        currentSlug !== expectedSlug) {
                        const canonicalPath = `/${params.orgShortId}/repo/${params.repoName}/documentation/${encodeURIComponent(expectedSlug)}`;
                        router.replace(canonicalPath);
                    }
                    setDocumentation({
                        title: data.documentation.title,
                        sections: data.documentation.documentation?.sections || [],
                        code_references: data.documentation.code_references || [],
                    });
                }
                else {
                    throw new Error(data.error || 'Failed to fetch documentation');
                }
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                console.error('Error fetching documentation:', err);
            }
            finally {
                setLoading(false);
            }
        };
        if (params?.title || searchParams.get('title')) {
            fetchDocumentation();
        }
    }, [params?.orgShortId, params?.repoName, params?.title, router, searchParams, setDocumentation]);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastActiveSectionRef = useRef<string | null>(null);
    const isProgrammaticScrollRef = useRef<boolean>(false);
    const programmaticScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const updateActiveSection = useCallback((sectionId: string) => {
        if (isProgrammaticScrollRef.current) {
            return;
        }
        if (sectionId === lastActiveSectionRef.current) {
            return;
        }
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        updateTimeoutRef.current = setTimeout(() => {
            lastActiveSectionRef.current = sectionId;
            setActiveSection(sectionId);
        }, 200);
    }, [setActiveSection]);
    const handleCodeRefClick = useCallback((codeRefId: string) => {
        isProgrammaticScrollRef.current = true;
        if (programmaticScrollTimeoutRef.current) {
            clearTimeout(programmaticScrollTimeoutRef.current);
        }
        const specificRef = document.getElementById(codeRefId);
        if (specificRef) {
            specificRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        else {
            const codeRefSection = document.getElementById('code-references-section');
            if (codeRefSection) {
                codeRefSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        programmaticScrollTimeoutRef.current = setTimeout(() => {
            isProgrammaticScrollRef.current = false;
            const targetId = specificRef ? codeRefId : 'code-references-section';
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                const sectionId = targetId.startsWith('code-ref-')
                    ? targetId
                    : targetId.replace(/^(section|subsection)-/, '');
                lastActiveSectionRef.current = sectionId;
                setActiveSection(sectionId);
            }
        }, 1000);
    }, [setActiveSection]);
    useEffect(() => {
        if (!content?.documentation?.sections)
            return;
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        if (programmaticScrollTimeoutRef.current) {
            clearTimeout(programmaticScrollTimeoutRef.current);
        }
        const sections = content.documentation.sections;
        const allSectionIds: string[] = [];
        sections.forEach(section => {
            allSectionIds.push(`section-${section.id}`);
            if (section.subsections) {
                section.subsections.forEach(subsection => {
                    allSectionIds.push(`subsection-${subsection.id}`);
                });
            }
        });
        if (content.code_references && content.code_references.length > 0) {
            allSectionIds.push('code-references-section');
            content.code_references.forEach((ref) => {
                if (typeof ref === 'object' && 'referenceId' in ref) {
                    allSectionIds.push(`code-ref-${ref.referenceId || ref.name}`);
                }
                else if (typeof ref === 'string') {
                    allSectionIds.push(`code-ref-${ref}`);
                }
            });
        }
        const observerOptions = {
            root: null,
            rootMargin: '-10% 0px -70% 0px',
            threshold: [0, 0.1, 0.5],
        };
        const visibleSections = new Map<string, number>();
        const handleIntersection = (entries: IntersectionObserverEntry[]) => {
            if (isProgrammaticScrollRef.current) {
                return;
            }
            entries.forEach(entry => {
                const target = entry.target as HTMLElement;
                if (!target.id)
                    return;
                if (entry.isIntersecting) {
                    visibleSections.set(target.id, entry.intersectionRatio);
                }
                else {
                    visibleSections.delete(target.id);
                }
            });
            if (visibleSections.size === 0)
                return;
            let mostVisibleId: string | null = null;
            let highestRatio = 0;
            for (const [id, ratio] of visibleSections.entries()) {
                if (ratio > highestRatio) {
                    highestRatio = ratio;
                    mostVisibleId = id;
                }
            }
            if (mostVisibleId) {
                let sectionId: string;
                if (mostVisibleId.startsWith('code-ref-')) {
                    sectionId = mostVisibleId;
                }
                else {
                    sectionId = mostVisibleId.replace(/^(section|subsection)-/, '');
                }
                updateActiveSection(sectionId);
            }
        };
        const observer = new IntersectionObserver(handleIntersection, observerOptions);
        observerRef.current = observer;
        allSectionIds.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                observer.observe(element);
            }
        });
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
            if (programmaticScrollTimeoutRef.current) {
                clearTimeout(programmaticScrollTimeoutRef.current);
            }
            visibleSections.clear();
        };
    }, [content, updateActiveSection]);
    if (loading) {
        return (<div className="h-full flex flex-col overflow-y-auto custom-scrollbar py-6">
        <div className="max-w-screen-2xl mx-auto w-full px-6 flex-1 flex flex-col min-h-0">
          <div className="animate-pulse flex-1 flex flex-col">
            <div className="h-8 bg-white/10 rounded w-3/4 mb-6 flex-shrink-0"/>
            <div className="space-y-4 flex-1 flex flex-col">
              {Array.from({ length: 24 }).map((_, i) => (<div key={i} className="h-4 bg-white/10 rounded flex-shrink-0" style={{ width: i % 3 === 0 ? '100%' : i % 3 === 1 ? '83%' : '66%' }}/>))}
            </div>
          </div>
        </div>
      </div>);
    }
    if (error) {
        return (<div className="h-full overflow-y-auto custom-scrollbar py-6">
        <div className="max-w-screen-2xl mx-auto w-full px-6">
          <div className="bg-red-500/10 border border-red-500/50 rounded p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      </div>);
    }
    if (!content) {
        return (<div className="h-full overflow-y-auto custom-scrollbar py-6">
        <div className="max-w-screen-2xl mx-auto w-full px-6">
          <p className="text-white/60">Documentation not found</p>
        </div>
      </div>);
    }
    return (<div className="h-full overflow-y-auto custom-scrollbar py-6">
      <div className="max-w-screen-2xl mx-auto w-full px-6">
        
        <div className="flex justify-between items-start gap-4 mb-4">
          <h1 className="text-3xl font-bold text-white text-left flex-1 min-w-0">
            {content.title}
          </h1>
          <button type="button" onClick={() => handleExport()} disabled={exporting} className="relative flex-shrink-0 px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg text-white text-sm font-semibold shadow-lg hover:shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 overflow-hidden group" title={isAiAgentMdDoc(content) ? 'Export as folder (ZIP of .md files)' : 'Export as Markdown'}>
            <span className="relative z-[1] flex items-center gap-2">
              {exporting ? (<>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12"/>
                  </svg>
                  Exporting…
                </>) : (<>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  Export
                </>)}
            </span>
            <span className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary-light)] to-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"/>
          </button>
        </div>
        <div className="border-t-2 border-white/20 mb-10"/>

        
        {content.documentation?.sections && content.documentation.sections.length > 0 && (() => {
            const isAiAgentMdDocs = content.metadata?.documentation_type === 'aiAgent' &&
                content.metadata?.ai_agent_doc_kind === 'custom';
            return (<div className="space-y-12">
            {content.documentation.sections.map((section, index) => {
                    const rawMd = isAiAgentMdDocs ? extractMdFromFenced(section.description) : null;
                    return (<div key={section.id} id={`section-${section.id}`} className="scroll-mt-6">
                
                {index > 0 && (<div className="border-t-2 border-white/20 mb-16 mt-16"></div>)}
                
                
                <h2 className="text-2xl font-semibold text-white mb-4">
                  {section.id}. {section.title}
                </h2>

                
                {isAiAgentMdDocs && rawMd !== null ? (<div className="mb-6">
                    <CodeSnippet code={rawMd} language="markdown"/>
                  </div>) : (<div className="prose prose-invert max-w-none mb-6 space-y-2">
                  {parseDescription(section.description, handleCodeRefClick).map((seg, i) => seg.type === 'code' ? (<CodeSnippet key={i} code={seg.content} language={seg.language}/>) : seg.type === 'table' ? (<DocTable key={i} rows={seg.rows}/>) : (<p key={i} className="text-white leading-relaxed whitespace-pre-wrap">
                        {seg.content}
                      </p>))}
                </div>)}

                
                {section.subsections && section.subsections.length > 0 && (<div className="ml-6 mt-8 space-y-8">
                    {section.subsections.map((subsection) => (<div key={subsection.id} id={`subsection-${subsection.id}`} className="scroll-mt-6">
                        
                        <h3 className="text-xl font-semibold text-white mb-3">
                          {subsection.id}. {subsection.title}
                        </h3>

                        
                        <div className="prose prose-invert max-w-none mb-4 space-y-2">
                          {parseDescription(subsection.description, handleCodeRefClick).map((seg, i) => seg.type === 'code' ? (<CodeSnippet key={i} code={seg.content} language={seg.language}/>) : seg.type === 'table' ? (<DocTable key={i} rows={seg.rows}/>) : (<p key={i} className="text-white leading-relaxed whitespace-pre-wrap">
                                {seg.content}
                              </p>))}
                        </div>

                        
                        {content.metadata?.documentation_type === 'architecture' && subsection.diagram != null && (<div className="mt-6">
                            {subsection.diagramType === 'class' && 'classes' in subsection.diagram && (subsection.diagram.classes?.length ?? 0) > 0 ? (<ArchitectureClassDiagramCanvas sectionId={`${section.id}-${subsection.id}`} classes={(subsection.diagram as {
                                            classes: ApiUmlClass[];
                                            relationships: ApiUmlRelationship[];
                                        }).classes} relationships={(subsection.diagram as {
                                            classes: ApiUmlClass[];
                                            relationships: ApiUmlRelationship[];
                                        }).relationships}/>) : 'nodes' in subsection.diagram && (subsection.diagram.nodes?.length ?? 0) > 0 ? (<ArchitectureSectionCanvas sectionId={`${section.id}-${subsection.id}`} sectionTitle={subsection.title} diagram={subsection.diagram as {
                                            nodes: {
                                                id: string;
                                                label: string;
                                            }[];
                                            edges: {
                                                source: string;
                                                target: string;
                                            }[];
                                        }}/>) : null}
                          </div>)}
                      </div>))}
                  </div>)}

                
                {content.metadata?.documentation_type === 'architecture' && section.diagram != null && (<div className="mt-8">
                    {section.diagramType === 'class' && 'classes' in section.diagram && (section.diagram.classes?.length ?? 0) > 0 ? (<ArchitectureClassDiagramCanvas sectionId={section.id} classes={(section.diagram as {
                                    classes: ApiUmlClass[];
                                    relationships: ApiUmlRelationship[];
                                }).classes} relationships={(section.diagram as {
                                    classes: ApiUmlClass[];
                                    relationships: ApiUmlRelationship[];
                                }).relationships}/>) : 'nodes' in section.diagram && (section.diagram.nodes?.length ?? 0) > 0 ? (<ArchitectureSectionCanvas sectionId={section.id} sectionTitle={section.title} diagram={section.diagram as {
                                    nodes: {
                                        id: string;
                                        label: string;
                                    }[];
                                    edges: {
                                        source: string;
                                        target: string;
                                    }[];
                                }}/>) : null}
                  </div>)}
              </div>);
                })}
          </div>);
        })()}

        
        {content.code_references && content.code_references.length > 0 && (<div id="code-references-section" className="mt-12 pt-8 border-t border-white/10 scroll-mt-6">
            <h2 className="text-2xl font-semibold text-white mb-8">Code References</h2>
            <div className="space-y-8">
              {content.code_references.map((ref, idx) => {
                const isDetailed = typeof ref === 'object' && 'description' in ref;
                const refDetail = isDetailed ? ref as CodeReferenceDetail : null;
                const refName = isDetailed ? refDetail!.name : ref as string;
                const refDescription = refDetail?.description || '';
                const refParameters = refDetail?.parameters || [];
                const refSignature = refDetail?.signature;
                const refReturns = refDetail?.returns;
                const refCode = refDetail?.code;
                const refId = isDetailed ? (refDetail!.referenceId || refDetail!.name) : (ref as string);
                return (<div key={idx} id={`code-ref-${refId}`} className="scroll-mt-6">
                    
                    <div className="mb-3">
                      <h3 className="text-xl font-semibold text-white font-mono mb-2">
                        {refName}
                      </h3>
                      {refSignature && (<div className="text-white/70 text-sm font-mono">
                          {refDetail?.type && (<span className="text-white/60 mr-2">
                              {refDetail.type}
                            </span>)}
                          {refSignature}
                        </div>)}
                    </div>
                    
                    
                    {refDescription && (<div className="prose prose-invert max-w-none mb-4 space-y-2">
                        {parseDescription(refDescription, handleCodeRefClick).map((seg, i) => seg.type === 'code' ? (<CodeSnippet key={i} code={seg.content} language={seg.language}/>) : seg.type === 'table' ? (<DocTable key={i} rows={seg.rows}/>) : (<p key={i} className="text-white leading-relaxed whitespace-pre-wrap">
                              {seg.content}
                            </p>))}
                      </div>)}

                    
                    {refParameters && refParameters.length > 0 && (<div className="mt-4 mb-4">
                        <h4 className="text-sm font-semibold text-white/60 mb-3">Parameters:</h4>
                        <div className="space-y-3 ml-4">
                          {refParameters.map((param, paramIdx) => (<div key={paramIdx} className="border-l-2 border-white/10 pl-4">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="font-mono text-[#3fb1c5]">{param.name}</span>
                              </div>
                              {param.description && (<div className="text-white/60 text-sm mt-1 ml-0 space-y-2">
                                  {parseDescription(param.description, handleCodeRefClick).map((seg, i) => seg.type === 'code' ? (<CodeSnippet key={i} code={seg.content} language={seg.language}/>) : seg.type === 'table' ? (<DocTable key={i} rows={seg.rows} compact/>) : (<p key={i}>{seg.content}</p>))}
                                </div>)}
                            </div>))}
                        </div>
                      </div>)}
                    
                    
                    {refCode && (<CodeSnippet code={refCode} language={refDetail?.type === 'class' ? 'typescript' : undefined}/>)}
                    
                    
                    {refReturns && (<div className="mt-4 mb-4">
                        <h4 className="text-sm font-semibold text-white/60 mb-2">Returns:</h4>
                        <div className="ml-4">
                          {refReturns.type && (<span className="font-mono text-[#3fb1c5]">{refReturns.type}</span>)}
                          {refReturns.description && (<div className="text-white/60 text-sm mt-1 space-y-2">
                              {parseDescription(refReturns.description, handleCodeRefClick).map((seg, i) => seg.type === 'code' ? (<CodeSnippet key={i} code={seg.content} language={seg.language}/>) : seg.type === 'table' ? (<DocTable key={i} rows={seg.rows} compact/>) : (<p key={i}>{seg.content}</p>))}
                            </div>)}
                        </div>
                      </div>)}
                  </div>);
            })}
            </div>
          </div>)}
      </div>
    </div>);
}
