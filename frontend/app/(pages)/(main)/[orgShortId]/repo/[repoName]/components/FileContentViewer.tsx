'use client';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
interface FileContentViewerProps {
    content: string;
    fileName: string;
    language?: string;
}
export default function FileContentViewer({ content, fileName, language }: FileContentViewerProps) {
    const detectLanguage = (): string => {
        if (language)
            return language.toLowerCase();
        const extension = fileName.split('.').pop()?.toLowerCase();
        const languageMap: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'tsx',
            'js': 'javascript',
            'jsx': 'jsx',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'sh': 'bash',
            'bash': 'bash',
            'zsh': 'bash',
            'yaml': 'yaml',
            'yml': 'yaml',
            'json': 'json',
            'xml': 'xml',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'md': 'markdown',
            'sql': 'sql',
            'vue': 'vue',
            'svelte': 'svelte',
        };
        return extension && languageMap[extension] ? languageMap[extension] : 'text';
    };
    const detectedLanguage = detectLanguage();
    return (<div className="h-full bg-[#1a1a1a] text-white font-mono text-sm flex flex-col">
      <style dangerouslySetInnerHTML={{
            __html: `
          .react-syntax-highlighter-line-number {
            color: rgba(255, 255, 255, 0.4) !important;
          }
          .react-syntax-highlighter-code {
            cursor: text !important;
          }
          .react-syntax-highlighter-code * {
            cursor: text !important;
          }
        `
        }}/>
      <div className="flex-1 overflow-auto min-h-0 custom-scrollbar">
        <SyntaxHighlighter language={detectedLanguage} style={vscDarkPlus} customStyle={{
            margin: 0,
            padding: '8px 16px',
            background: '#1a1a1a',
            fontSize: '14px',
            lineHeight: '1.5',
            cursor: 'text',
        }} lineNumberStyle={{
            minWidth: '60px',
            paddingRight: '24px',
            paddingLeft: '16px',
            color: 'rgba(255, 255, 255, 0.4)',
            backgroundColor: '#1a1a1a',
        }} showLineNumbers lineNumberContainerStyle={{
            float: 'left',
            paddingRight: '24px',
            paddingLeft: '16px',
            backgroundColor: '#1a1a1a',
        }}>
          {content}
        </SyntaxHighlighter>
      </div>
    </div>);
}
