'use client';
import React from 'react';
import RepositoryCard from './RepositoryCard';
export type RepoItem = {
    id: string;
    name: string;
    urlName: string;
    url: string;
    source?: 'github' | 'bitbucket' | 'upload';
    description?: string;
    size?: string;
    lastUpdate?: Date | string;
    addedAt: Date | string;
};
interface RepositoriesGridProps {
    repositories: RepoItem[];
    orgShortId: string;
}
export default function RepositoriesGrid({ repositories, orgShortId }: RepositoriesGridProps) {
    if (repositories.length === 0) {
        return null;
    }
    const gridClasses = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch';
    return (<div className={gridClasses}>
      {repositories.map((repo) => (<div key={repo.id} className="h-full min-h-0">
          <RepositoryCard id={repo.id} name={repo.name} urlName={repo.urlName} url={repo.url} orgShortId={orgShortId} source={repo.source} addedAt={repo.addedAt} description={repo.description} size={repo.size} lastUpdate={repo.lastUpdate}/>
        </div>))}
    </div>);
}
