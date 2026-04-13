'use client';
import { useState, useEffect } from 'react';
import CodeReferenceList from './CodeReferenceList';
import DocumentationHeader from './DocumentationHeader';
import GenerateDocumentationModal from './GenerateDocumentationModal';
interface CodeReferenceViewerProps {
    repositoryId: string;
    repoFullName: string;
    orgShortId: string;
    repoUrlName: string;
    repoName: string;
}
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
}
export default function CodeReferenceViewer({ repositoryId, repoFullName, orgShortId, repoUrlName, repoName, }: CodeReferenceViewerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [codeReferences, setCodeReferences] = useState<CodeReference[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [codeReferencesFetched, setCodeReferencesFetched] = useState(false);
    const handleGenerateDocumentation = () => {
        setIsModalOpen(true);
    };
    const handleCloseModal = () => {
        setIsModalOpen(false);
    };
    const fetchCodeReferences = async (forceRefresh = false) => {
        if (codeReferencesFetched && !forceRefresh) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/code-references/repository/${repositoryId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch code references');
            }
            const data = await response.json();
            if (data.success) {
                setCodeReferences(data.codeReferences || []);
                setCodeReferencesFetched(true);
            }
            else {
                throw new Error(data.error || 'Failed to fetch code references');
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching code references:', err);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (!codeReferencesFetched) {
            fetchCodeReferences();
        }
        else {
            setLoading(false);
        }
    }, [repositoryId, codeReferencesFetched]);
    useEffect(() => {
        setCodeReferencesFetched(false);
        setCodeReferences([]);
    }, [repositoryId]);
    return (<>
      <div className="h-full flex flex-col bg-transparent">
        <div className="max-w-screen-2xl mx-auto w-full h-full flex flex-col">
          
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
            
            <DocumentationHeader activeTab="code-reference" searchQuery={searchQuery} onSearchChange={setSearchQuery} onGenerateClick={handleGenerateDocumentation}/>

            
            <div className="mt-12">
              <CodeReferenceList codeReferences={codeReferences} loading={loading} error={error} searchQuery={searchQuery} onSearchChange={setSearchQuery}/>
            </div>
          </div>
        </div>
      </div>

      <GenerateDocumentationModal isOpen={isModalOpen} onClose={handleCloseModal} repoName={repoName} repoFullName={repoFullName} orgShortId={orgShortId} repoUrlName={repoUrlName} repositoryId={repositoryId}/>
    </>);
}
