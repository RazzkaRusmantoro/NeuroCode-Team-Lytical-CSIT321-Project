'use client';
import { useState } from 'react';
import { useRepoCache } from '../../context/RepoCacheContext';
interface FileTreeItem {
    name: string;
    path: string;
    type: 'file' | 'dir';
    size: number;
    sha: string;
    url: string;
    downloadUrl: string | null;
    gitUrl: string;
    content?: string;
    language?: string;
}
interface FileTreeProps {
    contents: FileTreeItem[];
    repoFullName: string;
    orgShortId: string;
    repoUrlName: string;
    selectedBranch: string;
    onFileSelect?: (file: FileTreeItem) => void;
    onContentsChange?: (contents: FileTreeItem[]) => void;
    onPathChange?: (path: string[]) => void;
    isLoading?: boolean;
}
function FileIcon({ type }: {
    type: 'file' | 'dir';
}) {
    if (type === 'dir') {
        return (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
      </svg>);
    }
    return (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>);
}
function FileTreeItem({ item, level = 0, isLast = false, onClick }: {
    item: FileTreeItem;
    level?: number;
    isLast?: boolean;
    onClick?: () => void;
}) {
    return (<div>
      <div onClick={onClick} className={`flex items-center gap-2 py-3 hover:bg-[#171717] transition-colors border-b border-[#262626] ${item.type === 'dir' ? 'font-medium text-white cursor-pointer' : 'text-white/80 cursor-pointer'}`} style={{ paddingLeft: `${20 + level * 16}px`, paddingRight: '12px' }}>
        <FileIcon type={item.type}/>
        <span className="text-sm truncate">{item.name}</span>
      </div>
    </div>);
}
export default function FileTree({ contents, repoFullName, orgShortId, repoUrlName, selectedBranch, onFileSelect, onContentsChange, onPathChange, isLoading: initialLoading = false }: FileTreeProps) {
    const cache = useRepoCache();
    const sortedContents = [...contents].sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'dir' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
    const handleFolderClick = (folder: FileTreeItem) => {
        if (folder.type !== 'dir')
            return;
        const pathParts = folder.path.split('/');
        if (onPathChange) {
            onPathChange(pathParts);
        }
    };
    const handleFileClick = async (file: FileTreeItem) => {
        if (file.type !== 'file' || !onFileSelect)
            return;
        const cached = cache.getFile(selectedBranch, file.path);
        if (cached && cached.content) {
            onFileSelect(cached);
            return;
        }
        try {
            const response = await fetch(`/api/github/repositories/${encodeURIComponent(repoFullName)}/contents?path=${encodeURIComponent(file.path)}&ref=${encodeURIComponent(selectedBranch)}&orgShortId=${encodeURIComponent(orgShortId)}&repoUrlName=${encodeURIComponent(repoUrlName)}`);
            if (response.ok) {
                const data = await response.json();
                const fileContent = data.contents[0];
                if (fileContent && fileContent.content) {
                    try {
                        const decodedContent = atob(fileContent.content);
                        const fileWithContent: FileTreeItem = {
                            ...file,
                            content: decodedContent,
                            language: fileContent.language || undefined,
                        };
                        cache.setFile(selectedBranch, file.path, fileWithContent);
                        onFileSelect(fileWithContent);
                    }
                    catch (decodeError) {
                        console.error('Error decoding file content:', decodeError);
                    }
                }
            }
            else {
                console.error('Failed to fetch file content:', response.status);
            }
        }
        catch (error) {
            console.error('Error fetching file content:', error);
        }
    };
    const SkeletonLoader = () => {
        const skeletonWidths = [150, 200, 120, 180, 160, 140, 190, 170];
        const rowCount = 28;
        return (<div>
        {[...Array(rowCount)].map((_, index) => (<div key={index} className="flex items-center gap-2 py-3 border-b border-[#262626] animate-pulse" style={{ paddingLeft: '20px', paddingRight: '12px' }}>
            <div className="w-4 h-4 bg-[#262626]/50 rounded"></div>
            <div className="h-4 bg-[#262626]/50 rounded" style={{ width: `${skeletonWidths[index % skeletonWidths.length]}px` }}></div>
          </div>))}
      </div>);
    };
    return (<div className={`h-full overflow-y-auto ${initialLoading ? 'hide-scrollbar' : 'custom-scrollbar'}`}>
      {initialLoading ? (<SkeletonLoader />) : (<div>
        {sortedContents.length === 0 ? (<div className="px-4 py-8 text-center text-white/60 text-sm">
            No files found
          </div>) : (sortedContents.map((item, index) => (<FileTreeItem key={item.path} item={item} isLast={index === sortedContents.length - 1} onClick={item.type === 'dir' ? () => handleFolderClick(item) : () => handleFileClick(item)}/>)))}
      </div>)}
    </div>);
}
