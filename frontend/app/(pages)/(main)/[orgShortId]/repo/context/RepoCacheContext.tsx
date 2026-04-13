'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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
interface Branch {
    name: string;
    sha: string;
    protected: boolean;
}
interface Commit {
    sha: string;
    message: string;
    author: {
        name: string;
        email: string;
        date: string;
    };
    url: string;
}
interface RepoCacheData {
    branches: Branch[];
    selectedBranch: string;
    recentCommits: Map<string, Commit>;
    contentsCache: Map<string, FileTreeItem[]>;
    fileCache: Map<string, FileTreeItem>;
    lastFetched: {
        branches?: number;
        [key: string]: number | undefined;
    };
}
interface RepoCacheContextType {
    cache: RepoCacheData;
    setBranches: (branches: Branch[]) => void;
    setSelectedBranch: (branch: string) => void;
    setRecentCommit: (branch: string, commit: Commit) => void;
    setContents: (branch: string, path: string, contents: FileTreeItem[]) => void;
    getContents: (branch: string, path: string) => FileTreeItem[] | undefined;
    setFile: (branch: string, path: string, file: FileTreeItem) => void;
    getFile: (branch: string, path: string) => FileTreeItem | undefined;
    clearBranchCache: (branch: string) => void;
    clearAllCache: () => void;
}
const RepoCacheContext = createContext<RepoCacheContextType | undefined>(undefined);
const CACHE_EXPIRY = 5 * 60 * 1000;
export function RepoCacheProvider({ children }: {
    children: ReactNode;
}) {
    const [cache, setCache] = useState<RepoCacheData>({
        branches: [],
        selectedBranch: 'main',
        recentCommits: new Map(),
        contentsCache: new Map(),
        fileCache: new Map(),
        lastFetched: {},
    });
    const setBranches = useCallback((branches: Branch[]) => {
        setCache(prev => ({
            ...prev,
            branches,
            lastFetched: {
                ...prev.lastFetched,
                branches: Date.now(),
            },
        }));
    }, []);
    const setSelectedBranch = useCallback((branch: string) => {
        setCache(prev => ({
            ...prev,
            selectedBranch: branch,
        }));
    }, []);
    const setRecentCommit = useCallback((branch: string, commit: Commit) => {
        setCache(prev => {
            const newCommits = new Map(prev.recentCommits);
            newCommits.set(branch, commit);
            return {
                ...prev,
                recentCommits: newCommits,
                lastFetched: {
                    ...prev.lastFetched,
                    [`commit:${branch}`]: Date.now(),
                },
            };
        });
    }, []);
    const setContents = useCallback((branch: string, path: string, contents: FileTreeItem[]) => {
        setCache(prev => {
            const newContentsCache = new Map(prev.contentsCache);
            const key = `${branch}:${path}`;
            newContentsCache.set(key, contents);
            return {
                ...prev,
                contentsCache: newContentsCache,
                lastFetched: {
                    ...prev.lastFetched,
                    [`contents:${key}`]: Date.now(),
                },
            };
        });
    }, []);
    const getContents = useCallback((branch: string, path: string): FileTreeItem[] | undefined => {
        const key = `${branch}:${path}`;
        const contents = cache.contentsCache.get(key);
        const lastFetched = cache.lastFetched[`contents:${key}`];
        if (contents && lastFetched && Date.now() - lastFetched < CACHE_EXPIRY) {
            return contents;
        }
        return undefined;
    }, [cache]);
    const setFile = useCallback((branch: string, path: string, file: FileTreeItem) => {
        setCache(prev => {
            const newFileCache = new Map(prev.fileCache);
            const key = `${branch}:${path}`;
            newFileCache.set(key, file);
            return {
                ...prev,
                fileCache: newFileCache,
                lastFetched: {
                    ...prev.lastFetched,
                    [`file:${key}`]: Date.now(),
                },
            };
        });
    }, []);
    const getFile = useCallback((branch: string, path: string): FileTreeItem | undefined => {
        const key = `${branch}:${path}`;
        const file = cache.fileCache.get(key);
        const lastFetched = cache.lastFetched[`file:${key}`];
        if (file && lastFetched && Date.now() - lastFetched < CACHE_EXPIRY) {
            return file;
        }
        return undefined;
    }, [cache]);
    const clearBranchCache = useCallback((branch: string) => {
        setCache(prev => {
            const newContentsCache = new Map(prev.contentsCache);
            const newFileCache = new Map(prev.fileCache);
            for (const key of newContentsCache.keys()) {
                if (key.startsWith(`${branch}:`)) {
                    newContentsCache.delete(key);
                }
            }
            for (const key of newFileCache.keys()) {
                if (key.startsWith(`${branch}:`)) {
                    newFileCache.delete(key);
                }
            }
            return {
                ...prev,
                contentsCache: newContentsCache,
                fileCache: newFileCache,
            };
        });
    }, []);
    const clearAllCache = useCallback(() => {
        setCache({
            branches: [],
            selectedBranch: 'main',
            recentCommits: new Map(),
            contentsCache: new Map(),
            fileCache: new Map(),
            lastFetched: {},
        });
    }, []);
    return (<RepoCacheContext.Provider value={{
            cache,
            setBranches,
            setSelectedBranch,
            setRecentCommit,
            setContents,
            getContents,
            setFile,
            getFile,
            clearBranchCache,
            clearAllCache,
        }}>
      {children}
    </RepoCacheContext.Provider>);
}
export function useRepoCache() {
    const context = useContext(RepoCacheContext);
    if (context === undefined) {
        throw new Error('useRepoCache must be used within a RepoCacheProvider');
    }
    return context;
}
