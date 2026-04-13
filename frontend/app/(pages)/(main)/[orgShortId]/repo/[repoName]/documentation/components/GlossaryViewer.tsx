'use client';
import { useState } from 'react';
import GlossaryView from './GlossaryView';
import DocumentationHeader from './DocumentationHeader';
import GenerateDocumentationModal from './GenerateDocumentationModal';
interface GlossaryViewerProps {
    repositoryId: string;
    orgShortId: string;
    repoUrlName: string;
    repoName: string;
}
export default function GlossaryViewer({ repositoryId, orgShortId, repoUrlName, repoName, }: GlossaryViewerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const handleGenerateDocumentation = () => {
        setIsModalOpen(true);
    };
    const handleCloseModal = () => {
        setIsModalOpen(false);
    };
    const repoFullName = '';
    return (<>
      <div className="h-full flex flex-col bg-transparent">
        <div className="max-w-screen-2xl mx-auto w-full h-full flex flex-col">
          
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
            
            <DocumentationHeader activeTab="glossary" searchQuery="" onSearchChange={undefined} onGenerateClick={handleGenerateDocumentation}/>

            
            <div className="mt-12">
              <GlossaryView />
            </div>
          </div>
        </div>
      </div>

      <GenerateDocumentationModal isOpen={isModalOpen} onClose={handleCloseModal} repoName={repoName} repoFullName={repoFullName} orgShortId={orgShortId} repoUrlName={repoUrlName} repositoryId={repositoryId}/>
    </>);
}
