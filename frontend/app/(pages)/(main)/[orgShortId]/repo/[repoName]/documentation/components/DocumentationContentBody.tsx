'use client';
import React from 'react';
import CodeSnippet from './CodeSnippet';
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
        segments.push({ type: 'code', content: match[2].replace(/\n$/, ''), language });
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
            {headerRow.map((cell, ci) => (<th key={ci} className={`${cellPadding} text-left font-semibold text-white/95`}>{cell}</th>))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, ri) => (<tr key={ri} className={`border-b border-white/10 last:border-b-0 ${ri % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}`}>
              {row.map((cell, ci) => (<td key={ci} className={`${cellPadding} text-left text-white/85 align-top`}>{cell}</td>))}
            </tr>))}
        </tbody>
      </table>
    </div>);
}
export interface CodeReferenceDetail {
    referenceId?: string;
    name: string;
    type?: string;
    description?: string;
    signature?: string;
    parameters?: Array<{
        name: string;
        description?: string;
    }>;
    returns?: {
        type?: string;
        description?: string;
    };
    code?: string;
}
export interface DocumentationContentBodyProps {
    content: {
        title?: string;
        documentation?: {
            sections?: Array<{
                id: string;
                title: string;
                description: string;
                subsections?: Array<{
                    id: string;
                    title: string;
                    description: string;
                }>;
            }>;
        };
        code_references?: (string | CodeReferenceDetail)[];
    };
    onCodeRefClick?: (codeRefId: string) => void;
}
export default function DocumentationContentBody({ content, onCodeRefClick }: DocumentationContentBodyProps) {
    const sections = content.documentation?.sections ?? [];
    const codeRefs = content.code_references ?? [];
    return (<>
      {sections.length > 0 && (<div className="space-y-12">
          {sections.map((section, index) => (<div key={section.id} id={`section-${section.id}`} className="scroll-mt-6">
              {index > 0 && <div className="border-t-2 border-white/20 mb-16 mt-16"/>}
              <h2 className="text-2xl font-semibold text-white mb-4">{section.id}. {section.title}</h2>
              <div className="prose prose-invert max-w-none mb-6 space-y-2">
                {parseDescription(section.description || '', onCodeRefClick).map((seg, i) => seg.type === 'code' ? (<CodeSnippet key={i} code={seg.content} language={seg.language}/>) : seg.type === 'table' ? (<DocTable key={i} rows={seg.rows}/>) : (<p key={i} className="text-white leading-relaxed whitespace-pre-wrap">{seg.content}</p>))}
              </div>
              {section.subsections?.map((subsection) => (<div key={subsection.id} id={`subsection-${subsection.id}`} className="ml-6 mt-8 space-y-8 scroll-mt-6">
                  <h3 className="text-xl font-semibold text-white mb-3">{subsection.id}. {subsection.title}</h3>
                  <div className="prose prose-invert max-w-none mb-4 space-y-2">
                    {parseDescription(subsection.description || '', onCodeRefClick).map((seg, i) => seg.type === 'code' ? (<CodeSnippet key={i} code={seg.content} language={seg.language}/>) : seg.type === 'table' ? (<DocTable key={i} rows={seg.rows}/>) : (<p key={i} className="text-white leading-relaxed whitespace-pre-wrap">{seg.content}</p>))}
                  </div>
                </div>))}
            </div>))}
        </div>)}
      {codeRefs.length > 0 && (<div id="code-references-section" className="mt-12 pt-8 border-t border-white/10 scroll-mt-6">
          <h2 className="text-2xl font-semibold text-white mb-8">Code References</h2>
          <div className="space-y-8">
            {codeRefs.map((ref, idx) => {
                const isDetailed = typeof ref === 'object' && ref !== null && 'description' in ref;
                const refDetail = isDetailed ? (ref as CodeReferenceDetail) : null;
                const refName = isDetailed ? refDetail!.name : (ref as string);
                const refDescription = refDetail?.description ?? '';
                const refId = isDetailed ? (refDetail!.referenceId || refDetail!.name) : (ref as string);
                return (<div key={idx} id={`code-ref-${refId}`} className="scroll-mt-6">
                  <h3 className="text-xl font-semibold text-white font-mono mb-2">{refName}</h3>
                  {refDetail?.signature && (<div className="text-white/70 text-sm font-mono mb-4">{refDetail.signature}</div>)}
                  {refDescription && (<div className="prose prose-invert max-w-none mb-4 space-y-2">
                      {parseDescription(refDescription, onCodeRefClick).map((seg, i) => seg.type === 'code' ? (<CodeSnippet key={i} code={seg.content} language={seg.language}/>) : seg.type === 'table' ? (<DocTable key={i} rows={seg.rows}/>) : (<p key={i} className="text-white leading-relaxed whitespace-pre-wrap">{seg.content}</p>))}
                    </div>)}
                  {refDetail?.code && <CodeSnippet code={refDetail.code}/>}
                </div>);
            })}
          </div>
        </div>)}
    </>);
}
