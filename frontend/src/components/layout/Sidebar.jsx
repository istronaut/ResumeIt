import React from 'react';
import { FileText, FolderGit2, Search, User, History } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <button
        type="button"
        className={`nav-item ${activeTab === 'studio' ? 'active' : ''}`}
        onClick={() => setActiveTab('studio')}
      >
        <FileText size={16} />
        <span>Resume Studio</span>
      </button>

      <button
        type="button"
        className={`nav-item ${activeTab === 'indexer' ? 'active' : ''}`}
        onClick={() => setActiveTab('indexer')}
      >
        <FolderGit2 size={16} />
        <span>Repo Indexer</span>
      </button>

      <button
        type="button"
        className={`nav-item ${activeTab === 'jd' ? 'active' : ''}`}
        onClick={() => setActiveTab('jd')}
      >
        <Search size={16} />
        <span>Job Intelligence</span>
      </button>

      <button
        type="button"
        className={`nav-item ${activeTab === 'profile' || activeTab === 'stores' ? 'active' : ''}`}
        onClick={() => setActiveTab('profile')}
      >
        <User size={16} />
        <span>Profile Vault</span>
      </button>

      <button
        type="button"
        className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => setActiveTab('history')}
      >
        <History size={16} />
        <span>Generated History</span>
      </button>
    </aside>
  );
}
