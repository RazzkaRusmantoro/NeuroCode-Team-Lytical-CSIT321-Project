'use client';
import { useState, useEffect } from 'react';
import GenerateDocumentationModal from './GenerateDocumentationModal';
import DocumentationHeader from './DocumentationHeader';
import DocumentationList from './DocumentationList';
interface Documentation {
    _id: string;
    target?: string;
    prompt?: string;
    title?: string;
    description?: string;
    slug?: string | null;
    branch: string;
    version: number;
    isLatest: boolean;
    documentationType?: string | null;
    createdAt: string;
    updatedAt: string;
}
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
export type DocumentationListItem = {
    kind: 'doc';
    doc: Documentation;
} | {
    kind: 'uml';
    uml: UmlDiagramItem;
};
interface DocumentationViewerProps {
    repositoryId: string;
    repoFullName: string;
    orgShortId: string;
    repoUrlName: string;
    repoName: string;
}
export default function DocumentationViewer({ repositoryId, repoFullName, orgShortId, repoUrlName, repoName, }: DocumentationViewerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [documentations, setDocumentations] = useState<Documentation[]>([]);
    const [umlDiagrams, setUmlDiagrams] = useState<UmlDiagramItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [documentationsFetched, setDocumentationsFetched] = useState(false);
    const handleGenerateDocumentation = () => {
        setIsModalOpen(true);
    };
    const handleCloseModal = () => {
        setIsModalOpen(false);
    };
    const fetchDocumentations = async (forceRefresh = false) => {
        if (documentationsFetched && !forceRefresh) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/documentation/repository/${repositoryId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch documentations');
            }
            const data = await response.json();
            if (data.success) {
                setDocumentations(data.documentations || []);
                setUmlDiagrams(data.umlDiagrams || []);
                setDocumentationsFetched(true);
            }
            else {
                throw new Error(data.error || 'Failed to fetch documentations');
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching documentations:', err);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (!documentationsFetched) {
            fetchDocumentations();
        }
        else {
            setLoading(false);
        }
    }, [repositoryId, documentationsFetched]);
    useEffect(() => {
        setDocumentationsFetched(false);
        setDocumentations([]);
        setUmlDiagrams([]);
    }, [repositoryId]);
    const documentationListItems: DocumentationListItem[] = documentations
        .map(doc => ({ kind: 'doc' as const, doc }))
        .sort((a, b) => new Date(b.doc.createdAt).getTime() - new Date(a.doc.createdAt).getTime());
    return (<>
      <div className="h-full flex flex-col bg-transparent">
        <div className="max-w-screen-2xl mx-auto w-full h-full flex flex-col">
          
          <div className={`flex-1 overflow-y-auto px-6 py-6 ${loading ? 'hide-scrollbar' : 'custom-scrollbar'}`}>
            
            <DocumentationHeader activeTab="documentation" searchQuery={searchQuery} onSearchChange={setSearchQuery} onGenerateClick={handleGenerateDocumentation}/>

            
            <div className="mt-12">
              <DocumentationList items={documentationListItems} loading={loading} error={error} searchQuery={searchQuery} onSearchChange={setSearchQuery} orgShortId={orgShortId} repoUrlName={repoUrlName} onDocumentationDeleted={() => fetchDocumentations(true)}/>
            </div>
          </div>
        </div>
      </div>

      <GenerateDocumentationModal isOpen={isModalOpen} onClose={handleCloseModal} repoName={repoName} repoFullName={repoFullName} orgShortId={orgShortId} repoUrlName={repoUrlName} repositoryId={repositoryId}/>
    </>);
}
