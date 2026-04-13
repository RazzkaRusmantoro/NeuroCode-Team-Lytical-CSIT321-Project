'use client';
import { useState, useEffect } from 'react';
import GenerateUmlModal from './GenerateUmlModal';
import DocumentationHeader from './DocumentationHeader';
import DocumentationList from './DocumentationList';
import type { DocumentationListItem } from './DocumentationViewer';
interface UmlDiagramItem {
    _id: string;
    name: string;
    slug: string;
    type: string;
    description?: string | null;
    prompt?: string | null;
    createdAt: string;
    updatedAt: string;
}
interface UmlDiagramsViewerProps {
    repositoryId: string;
    repoFullName: string;
    orgShortId: string;
    repoUrlName: string;
    repoName: string;
}
export default function UmlDiagramsViewer({ repositoryId, repoFullName, orgShortId, repoUrlName, repoName, }: UmlDiagramsViewerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [umlDiagrams, setUmlDiagrams] = useState<UmlDiagramItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [fetched, setFetched] = useState(false);
    const fetchDiagrams = async (forceRefresh = false) => {
        if (fetched && !forceRefresh) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/documentation/repository/${repositoryId}`);
            if (!response.ok)
                throw new Error('Failed to fetch UML diagrams');
            const data = await response.json();
            if (data.success) {
                setUmlDiagrams(data.umlDiagrams || []);
                setFetched(true);
            }
            else {
                throw new Error(data.error || 'Failed to fetch');
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (!fetched)
            fetchDiagrams();
        else
            setLoading(false);
    }, [repositoryId, fetched]);
    useEffect(() => {
        setFetched(false);
        setUmlDiagrams([]);
    }, [repositoryId]);
    const listItems: DocumentationListItem[] = umlDiagrams
        .map((uml) => ({ kind: 'uml' as const, uml }))
        .sort((a, b) => new Date(b.uml.createdAt).getTime() - new Date(a.uml.createdAt).getTime());
    return (<>
      <div className="h-full flex flex-col bg-transparent">
        <div className="max-w-screen-2xl mx-auto w-full h-full flex flex-col">
          <div className={`flex-1 overflow-y-auto px-6 py-6 ${loading ? 'hide-scrollbar' : 'custom-scrollbar'}`}>
            <DocumentationHeader activeTab="uml-diagrams" searchQuery={searchQuery} onSearchChange={setSearchQuery} onGenerateClick={() => setIsModalOpen(true)}/>
            <div className="mt-12">
              <DocumentationList items={listItems} loading={loading} error={error} searchQuery={searchQuery} onSearchChange={setSearchQuery} orgShortId={orgShortId} repoUrlName={repoUrlName}/>
            </div>
          </div>
        </div>
      </div>
      <GenerateUmlModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} repoName={repoName} repoFullName={repoFullName} orgShortId={orgShortId} repoUrlName={repoUrlName} repositoryId={repositoryId}/>
    </>);
}
