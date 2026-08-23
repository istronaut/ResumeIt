import React, { useState } from 'react';
import { FolderGit2, RefreshCw, Search, Cpu, BookOpen, Folder, Layers, CheckCircle2 } from 'lucide-react';
import DirectoryBrowserModal from '../components/indexer/DirectoryBrowserModal';

export default function RepoIndexer({
  repoPath,
  setRepoPath,
  onScanRepository,
  indexing,
  lastScanResult,
  projects
}) {
  const [scanMode, setScanMode] = useState('single'); // 'single' or 'batch'
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  const handleTriggerScan = (e) => {
    if (onScanRepository) {
      onScanRepository(e, repoPath, scanMode);
    }
  };

  return (
    <div>
      <div className="panel-card">
        <div className="panel-title">
          <FolderGit2 size={18} />
          Local Repository Codebase Indexer & AST Parser
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Select or enter an absolute path to a local directory. SHA256 hashes track file changes to prevent duplicate AI processing.
        </p>

        {/* Directory Input & Browse Button */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            className="text-input"
            placeholder="/home/ishaan/Code/EarCandy3D"
            value={repoPath}
            onChange={e => setRepoPath(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsBrowserOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Folder size={16} /> Browse...
          </button>
        </div>

        {/* Scan Mode Selection Options */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={16} color="var(--accent-color)" /> Select Scan Scope & Mode:
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Mode 1: Single Repo / Current Dir */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${scanMode === 'single' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                backgroundColor: scanMode === 'single' ? 'var(--accent-light)' : 'var(--card-bg)',
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name="scanMode"
                value="single"
                checked={scanMode === 'single'}
                onChange={() => setScanMode('single')}
                style={{ marginTop: '2px' }}
              />
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Review Current Directory Only</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Index the chosen path as a single standalone repository/project.
                </p>
              </div>
            </label>

            {/* Mode 2: Batch Subdirectories */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${scanMode === 'batch' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                backgroundColor: scanMode === 'batch' ? 'var(--accent-light)' : 'var(--card-bg)',
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name="scanMode"
                value="batch"
                checked={scanMode === 'batch'}
                onChange={() => setScanMode('batch')}
                style={{ marginTop: '2px' }}
              />
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Review All Subdirectories (Batch Scan)</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Index every child repository folder inside parent directory (e.g. <code>/home/ishaan/Code/</code>).
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Trigger Scan Button */}
        <button
          type="button"
          className="btn-primary"
          onClick={handleTriggerScan}
          disabled={indexing || !repoPath}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {indexing ? <RefreshCw className="spin" size={16} /> : <Search size={16} />}
          {indexing ? 'Indexing AST...' : scanMode === 'batch' ? 'Scan All Subdirectories' : 'Scan & Rate Repo'}
        </button>
      </div>

      {/* Scan Results Panel */}
      {lastScanResult && (
        <div className="panel-card">
          <div className="panel-title">
            <Cpu size={18} />
            Scan Insights & Rating Output
          </div>

          {lastScanResult.message && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> {lastScanResult.message}
            </div>
          )}

          {lastScanResult.skipped_hash && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Hash match found in metadata_tracker.json — Re-indexing skipped!
            </div>
          )}

          {lastScanResult.project && (
            <div>
              <h4>{lastScanResult.project.title}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Path: {lastScanResult.project.repo_path}</p>

              <h5 style={{ marginTop: '16px' }}>7-Category Domain Ratings (1 to 5 scale):</h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '8px' }}>
                {lastScanResult.project.category_scores && Object.entries(lastScanResult.project.category_scores).map(([cat, score]) => (
                  <div key={cat} style={{ border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)' }}>
                    <span style={{ fontSize: '0.8rem', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{cat}</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent-color)' }}>{score} / 5</div>
                  </div>
                ))}
              </div>

              <h5 style={{ marginTop: '16px' }}>Formulated Metric Bullet Points:</h5>
              <ul style={{ paddingLeft: '20px', marginTop: '8px', fontSize: '0.9rem' }}>
                {lastScanResult.project.bullet_points?.map((bullet, idx) => (
                  <li key={idx} style={{ marginBottom: '6px' }}>{bullet}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Indexed Projects List Table */}
      <div className="panel-card">
        <div className="panel-title">
          <BookOpen size={18} />
          All Indexed Projects ({projects.length})
        </div>
        {projects.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No projects indexed yet.</p>
        ) : (
          <table className="notion-table">
            <thead>
              <tr>
                <th>Project Title</th>
                <th>Tech Stack</th>
                <th>Ratings Summary</th>
                <th>Bullet Points</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.title}</td>
                  <td>{p.tech_stack?.slice(0, 4).join(', ')}</td>
                  <td>
                    {p.category_scores && Object.entries(p.category_scores).map(([c, v]) => (
                      <span key={c} className="score-pill" style={{ marginRight: '4px' }}>{c[0].toUpperCase()}:{v}</span>
                    ))}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{p.bullet_points?.[0]?.substring(0, 90)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Directory Browser Modal */}
      <DirectoryBrowserModal
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        initialPath={repoPath}
        onSelectDirectory={(selectedPath) => setRepoPath(selectedPath)}
      />
    </div>
  );
}
