import React, { useState, useEffect } from 'react';
import { Folder, FolderGit2, FolderUp, Search, RefreshCw, CheckCircle2, ChevronRight, X, Home, HardDrive } from 'lucide-react';

export default function DirectoryBrowserModal({ isOpen, onClose, onSelectDirectory, initialPath }) {
  const [currentPath, setCurrentPath] = useState(initialPath || '');
  const [editablePath, setEditablePath] = useState(initialPath || '');
  const [parentPath, setParentPath] = useState(null);
  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    if (isOpen) {
      const path = initialPath || '';
      setCurrentPath(path);
      setEditablePath(path);
      setFilterText('');
      fetchDirectories(path);
    }
  }, [isOpen, initialPath]);

  const fetchDirectories = async (targetPath) => {
    setLoading(true);
    try {
      const url = targetPath && targetPath.trim()
        ? `/api/fs/browse?path=${encodeURIComponent(targetPath.trim())}`
        : '/api/fs/browse';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setCurrentPath(data.current_path);
        setEditablePath(data.current_path);
        setParentPath(data.parent_path);
        setDirectories(data.directories || []);
      }
    } catch (e) {
      console.error("Directory browse error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path) => {
    setFilterText('');
    fetchDirectories(path);
  };

  const handlePathInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNavigate(editablePath);
    }
  };

  const handleSelectCurrent = () => {
    onSelectDirectory(currentPath);
    onClose();
  };

  if (!isOpen) return null;

  const filteredDirs = directories.filter(d =>
    d.name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '92%' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Folder size={20} color="var(--accent-color)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Browse Local Directory</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Quick Location Shortcuts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Locations:</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '3px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => handleNavigate('')}
            >
              <Home size={12} /> Home (~)
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '3px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => handleNavigate('/home/ishaan/Code')}
            >
              <Folder size={12} /> Code Dir
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '3px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => handleNavigate('/')}
            >
              <HardDrive size={12} /> Root (/)
            </button>
          </div>

          {/* Current Path Bar & Up Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={!parentPath || loading}
              onClick={() => parentPath && handleNavigate(parentPath)}
              title="Go up to parent directory"
              style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <FolderUp size={16} /> Up
            </button>

            <input
              type="text"
              className="text-input"
              style={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}
              value={editablePath}
              onChange={e => setEditablePath(e.target.value)}
              onKeyDown={handlePathInputKeyDown}
              placeholder="Type or paste path and press Enter..."
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleNavigate(editablePath)}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Go
            </button>
          </div>

          {/* Directory Filter Input */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="text-input"
              style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
              placeholder="Filter folders in current directory..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
          </div>

          {/* Directory List Container */}
          <div
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: 'var(--card-bg)'
            }}
          >
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw className="spin" size={20} style={{ marginBottom: '8px' }} />
                <p style={{ fontSize: '0.85rem' }}>Loading directories...</p>
              </div>
            ) : filteredDirs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No child directories found in <code>{currentPath}</code>
              </div>
            ) : (
              filteredDirs.map(dir => (
                <div
                  key={dir.path}
                  onClick={() => handleNavigate(dir.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 14px',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {dir.is_git ? (
                      <FolderGit2 size={18} color="var(--accent-color)" />
                    ) : (
                      <Folder size={18} color="var(--text-secondary)" />
                    )}
                    <span style={{ fontSize: '0.88rem', fontWeight: dir.is_git ? 600 : 400 }}>
                      {dir.name}
                    </span>
                    {dir.is_git && (
                      <span className="score-pill" style={{ fontSize: '0.7rem', backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)' }}>
                        Git Repo
                      </span>
                    )}
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSelectCurrent}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle2 size={16} /> Select This Directory
          </button>
        </div>
      </div>
    </div>
  );
}
