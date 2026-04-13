'use client';
import { useState, useEffect } from 'react';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import TextInput from '@/app/components/TextInput';
import { addRepository } from '@/actions/repository';
import type { OrganizationWithId } from '@/actions/organization';
import { generateSlug } from '@/lib/utils/slug';
interface AddRepositoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    githubAccount?: string | null;
    selectedOrganization: OrganizationWithId | null;
    onUploadFromGitHub?: () => void;
}
interface Repository {
    id: number;
    name: string;
    fullName: string;
    description: string | null;
    private: boolean;
    url: string;
    language: string | null;
    stars: number;
    forks: number;
    updatedAt: string;
    createdAt: string;
    defaultBranch: string;
    size: number;
    openIssues: number;
    watchers: number;
    topics: string[];
    license: string | null;
    archived: boolean;
    disabled: boolean;
    fork: boolean;
    homepage: string | null;
    owner: {
        login: string;
        avatarUrl: string;
        url: string;
    };
}
export default function AddRepositoryModal({ isOpen, onClose, githubAccount, selectedOrganization, onUploadFromGitHub, }: AddRepositoryModalProps) {
    const [showRepositoryList, setShowRepositoryList] = useState(false);
    const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [filteredRepositories, setFilteredRepositories] = useState<Repository[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [collaborators, setCollaborators] = useState<Array<{
        id: number;
        login: string;
        avatarUrl: string;
        url: string;
        permissions: any;
    }>>([]);
    const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [urlName, setUrlName] = useState<string>('');
    const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
    const isGitHubConnected = !!githubAccount;
    const githubAvatarUrl = githubAccount ? `https://github.com/${githubAccount}.png` : null;
    useEffect(() => {
        if (!isOpen) {
            setShowRepositoryList(false);
            setSelectedRepository(null);
            setSearchQuery('');
            setRepositories([]);
            setFilteredRepositories([]);
            setIsLoading(false);
            setCollaborators([]);
            setIsLoadingCollaborators(false);
            setError(null);
            setUrlName('');
            setIsSubmittingAdd(false);
        }
    }, [isOpen]);
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredRepositories(repositories);
        }
        else {
            const query = searchQuery.toLowerCase();
            setFilteredRepositories(repositories.filter((repo) => repo.name.toLowerCase().includes(query) ||
                repo.fullName.toLowerCase().includes(query) ||
                (repo.description && repo.description.toLowerCase().includes(query))));
        }
    }, [searchQuery, repositories]);
    const handleUploadFromGitHub = async () => {
        if (!isGitHubConnected) {
            onUploadFromGitHub?.();
            return;
        }
        setIsLoading(true);
        setShowRepositoryList(true);
        try {
            const response = await fetch('/api/github/repositories');
            if (response.ok) {
                const data = await response.json();
                setRepositories(data.repositories || []);
                setFilteredRepositories(data.repositories || []);
            }
            else {
                console.error('Failed to fetch repositories');
            }
        }
        catch (error) {
            console.error('Error fetching repositories:', error);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleBackToMain = () => {
        setShowRepositoryList(false);
        setSearchQuery('');
    };
    const handleSelectRepository = async (repo: Repository) => {
        setSelectedRepository(repo);
        setUrlName(generateSlug(repo.name));
        setIsLoadingCollaborators(true);
        try {
            const response = await fetch(`/api/github/repositories/${encodeURIComponent(repo.fullName)}/collaborators`);
            if (response.ok) {
                const data = await response.json();
                setCollaborators(data.collaborators || []);
            }
            else {
                console.error('Failed to fetch collaborators');
                setCollaborators([]);
            }
        }
        catch (error) {
            console.error('Error fetching collaborators:', error);
            setCollaborators([]);
        }
        finally {
            setIsLoadingCollaborators(false);
        }
    };
    const handleBackToRepositoryList = () => {
        setSelectedRepository(null);
    };
    const handleAddRepository = async () => {
        if (!selectedRepository || !selectedOrganization) {
            setError('Organization not selected');
            return;
        }
        if (!urlName.trim()) {
            setError('URL name is required');
            return;
        }
        setError(null);
        setIsSubmittingAdd(true);
        try {
            const result = await addRepository(selectedOrganization.id, {
                githubId: selectedRepository.id,
                name: selectedRepository.name,
                urlName: urlName.trim(),
                url: selectedRepository.url,
                source: 'github',
                description: selectedRepository.description || undefined,
                size: selectedRepository.size,
                lastUpdate: selectedRepository.updatedAt,
            });
            if (result.success) {
                onClose();
            }
            else {
                setError(result.error || 'Failed to add repository');
            }
        }
        catch (err: any) {
            setError(err.message || 'Failed to add repository');
        }
        finally {
            setIsSubmittingAdd(false);
        }
    };
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center">
      
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-150 animate-[fadeIn_0.15s_ease-out]" onClick={onClose}/>
      
      
      <div className={`relative z-10 bg-[#121215] rounded border border-[#262626] p-8 w-full mx-4 shadow-2xl transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${showRepositoryList ? 'max-w-5xl' : selectedRepository ? 'max-w-4xl' : 'max-w-3xl'}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            {(showRepositoryList || selectedRepository) && (<button onClick={selectedRepository ? handleBackToRepositoryList : handleBackToMain} className="text-white/60 hover:text-white transition-colors duration-200 cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                </svg>
              </button>)}
            <h2 className="text-2xl font-bold text-white">
              {showRepositoryList || selectedRepository ? 'Select Repository' : 'Add Repository'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors duration-200 cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="relative flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={selectedRepository ? { maxHeight: '600px' } : undefined}>
          {selectedRepository ? (<div className="flex flex-col animate-[fadeIn_0.2s_ease-out]">
              
              <div className="space-y-6 pb-6">
                
                <div>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-white">{selectedRepository.name}</h3>
                      <div className="flex items-center gap-2">
                        {selectedRepository.private && (<span className="px-2 py-1 text-xs bg-[#424242] text-white/60 rounded">
                            Private
                          </span>)}
                        {selectedRepository.archived && (<span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                            Archived
                          </span>)}
                        {selectedRepository.fork && (<span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">
                            Fork
                          </span>)}
                        {selectedRepository.disabled && (<span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">
                            Disabled
                          </span>)}
                      </div>
                    </div>
                    <a href={selectedRepository.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#262626] hover:bg-[#404040] border border-[#262626] rounded text-white text-sm transition-all duration-200 cursor-pointer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                      </svg>
                      View on GitHub
                    </a>
                  </div>
                  <p className="text-sm text-white/60 mb-2">{selectedRepository.fullName}</p>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    {selectedRepository.owner.avatarUrl && (<div className="flex items-center gap-2">
                        <span className="text-sm text-white/40">by</span>
                        <a href={selectedRepository.owner.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                          <img src={selectedRepository.owner.avatarUrl} alt={selectedRepository.owner.login} className="w-6 h-6 rounded-full border border-[#424242]"/>
                          <span className="text-sm text-white/80 font-medium">{selectedRepository.owner.login}</span>
                        </a>
                      </div>)}
                    <div className="text-sm text-white/40 ml-auto">
                      <span>Last updated at: {new Date(selectedRepository.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                
                {selectedRepository.description && (<div>
                    <h4 className="text-sm font-semibold text-white/60 mb-2">Description</h4>
                    <p className="text-white/80">{selectedRepository.description}</p>
                  </div>)}

                
                <div>
                  <TextInput label="URL Name" type="text" value={urlName} onChange={(e) => setUrlName(generateSlug(e.target.value))} placeholder="url-name" containerClassName="space-y-2"/>
                  <p className="text-xs text-white/40 mt-2">
                    This will be used in the URL: /org-{selectedOrganization?.shortId}/repo/{urlName || 'url-name'}
                  </p>
                </div>

                
                {selectedRepository.topics && selectedRepository.topics.length > 0 && (<div>
                    <h4 className="text-sm font-semibold text-white/60 mb-2">Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRepository.topics.map((topic, index) => (<span key={index} className="px-3 py-1 text-xs bg-[#171717]/50 border border-[#262626] text-white/70 rounded">
                          {topic}
                        </span>))}
                    </div>
                  </div>)}

                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#2a2a2a] border border-[#424242] rounded p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      <span className="text-sm text-white/60">Stars</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{selectedRepository.stars.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#2a2a2a] border border-[#424242] rounded p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      <span className="text-sm text-white/60">Forks</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{selectedRepository.forks.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#2a2a2a] border border-[#424242] rounded p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span className="text-sm text-white/60">Issues</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{selectedRepository.openIssues.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#2a2a2a] border border-[#424242] rounded p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                      <span className="text-sm text-white/60">Watchers</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{selectedRepository.watchers.toLocaleString()}</p>
                  </div>
                </div>

                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch" style={{ height: '170px' }}>
                  <div className="bg-[#2a2a2a] border border-[#424242] rounded p-4 flex flex-col h-full overflow-hidden">
                    <h4 className="text-sm font-semibold text-white/60 mb-3 flex-shrink-0">Repository Information</h4>
                    <div className="space-y-2 text-sm flex-1 overflow-hidden">
                      <div className="flex justify-between">
                        <span className="text-white/60">Language:</span>
                        <span className="text-white">{selectedRepository.language || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Default Branch:</span>
                        <span className="text-white">{selectedRepository.defaultBranch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Size:</span>
                        <span className="text-white">{(selectedRepository.size / 1024).toFixed(2)} MB</span>
                      </div>
                      {selectedRepository.license && (<div className="flex justify-between">
                          <span className="text-white/60">License:</span>
                          <span className="text-white">{selectedRepository.license}</span>
                        </div>)}
                    </div>
                  </div>
                  <div className="bg-[#2a2a2a] border border-[#424242] rounded p-4 flex flex-col h-full overflow-hidden">
                    <h4 className="text-sm font-semibold text-white/60 mb-3 flex-shrink-0">Collaborators</h4>
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      {isLoadingCollaborators ? (<div className="flex items-center justify-center flex-1 h-full">
                          <div className="scale-50">
                            <LoadingSpinner />
                          </div>
                        </div>) : collaborators.length === 0 ? (<div className="flex items-center justify-center flex-1">
                          <div className="text-sm text-white/60">No collaborators</div>
                        </div>) : (<div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] min-h-0">
                          <div className="space-y-2">
                            {collaborators.map((collab) => (<a key={collab.id} href={collab.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded hover:bg-[#262626] transition-colors cursor-pointer">
                                <img src={collab.avatarUrl} alt={collab.login} className="w-8 h-8 rounded-full border border-[#262626] flex-shrink-0"/>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white font-medium truncate">{collab.login}</p>
                                  {collab.login === selectedRepository.owner.login && (<p className="text-xs text-white/60">Owner</p>)}
                                </div>
                              </a>))}
                          </div>
                        </div>)}
                    </div>
                  </div>
                </div>

              </div>
            </div>) : showRepositoryList ? (<div className="flex flex-col h-[calc(80vh-8rem)] animate-[fadeIn_0.2s_ease-out]">
            
            <div className="mb-4">
              <TextInput type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search repositories..." className="w-full"/>
            </div>

            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading ? (<div className="space-y-2">
                  {[...Array(6)].map((_, index) => (<div key={index} className="w-full px-4 py-4 bg-[#262626]/50 border border-[#262626] rounded animate-pulse">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-5 w-32 bg-white/10 rounded"></div>
                            <div className="h-4 w-16 bg-white/10 rounded"></div>
                          </div>
                          <div className="h-4 w-full bg-white/10 rounded mb-1"></div>
                          <div className="h-4 w-3/4 bg-white/10 rounded mb-3"></div>
                          <div className="flex items-center gap-4">
                            <div className="h-3 w-20 bg-white/10 rounded"></div>
                            <div className="h-3 w-16 bg-white/10 rounded"></div>
                            <div className="h-3 w-16 bg-white/10 rounded"></div>
                            <div className="h-3 w-24 bg-white/10 rounded"></div>
                          </div>
                        </div>
                        <div className="h-5 w-5 bg-white/10 rounded flex-shrink-0"></div>
                      </div>
                    </div>))}
                </div>) : filteredRepositories.length === 0 ? (<div className="flex items-center justify-center h-full">
                  <div className="text-white/60">
                    {searchQuery ? 'No repositories found' : 'No repositories available'}
                  </div>
                </div>) : (<div className="space-y-2">
                  {filteredRepositories.map((repo) => (<button key={repo.id} onClick={() => handleSelectRepository(repo)} className="w-full px-4 py-4 bg-[#262626]/50 hover:bg-[#262626]/70 border border-[#262626] rounded text-white text-left transition-all duration-200 group cursor-pointer">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-white group-hover:text-[var(--color-primary)] transition-colors">
                              {repo.name}
                            </h3>
                            {repo.private && (<span className="px-2 py-0.5 text-xs bg-[#424242] text-white/60 rounded">
                                Private
                              </span>)}
                          </div>
                          {repo.description && (<p className="text-sm text-white/60 mb-2 line-clamp-2">{repo.description}</p>)}
                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                              </svg>
                              {repo.stars}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                              </svg>
                              {repo.forks}
                            </span>
                            <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-white/70 group-hover:text-[var(--color-primary)] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                        </svg>
                      </div>
                    </button>))}
                </div>)}
            </div>
            </div>) : (<div className="space-y-3 animate-[fadeIn_0.2s_ease-out]">
          <button onClick={handleUploadFromGitHub} className="w-full px-6 py-4 bg-[#262626]/50 hover:bg-[#262626]/70 border border-[#262626] rounded text-white text-left transition-all duration-200 flex items-center gap-3 group cursor-pointer">
            <svg className="w-6 h-6 text-white/60 group-hover:text-white transition-colors flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <div className="flex-1">
              <div className="font-medium">
                {isGitHubConnected ? 'Upload repository from GitHub' : 'Connect your GitHub account'}
              </div>
              <div className="text-sm text-white/60 flex items-center gap-2">
                {isGitHubConnected ? (<>
                    <span>Connected as</span>
                    <span className="flex items-center gap-1.5">
                      {githubAvatarUrl && (<img src={githubAvatarUrl} alt={githubAccount || ''} className="w-4 h-4 rounded-full"/>)}
                      <span className="font-medium text-white/80">@{githubAccount}</span>
                    </span>
                  </>) : ('Connect to import a repository')}
              </div>
            </div>
              </button>
            </div>)}
        </div>

        
        {selectedRepository && (<div className="pt-6 border-t border-[#262626] mt-6 flex-shrink-0">
            {error && (<div className="mb-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
                {error}
              </div>)}
            <button type="button" onClick={handleAddRepository} disabled={!selectedOrganization || isSubmittingAdd} className="w-full px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-primary)]/50 disabled:cursor-not-allowed text-white font-medium rounded transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]">
              {isSubmittingAdd ? (<>
                  <div className="scale-50">
                    <LoadingSpinner />
                  </div>
                  <span>Adding repository…</span>
                </>) : ('Add Repository')}
            </button>
          </div>)}
      </div>
    </div>);
}
