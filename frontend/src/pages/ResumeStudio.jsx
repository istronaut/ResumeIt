import React from 'react';
import {
  Upload,
  Search,
  RefreshCw,
  Layers,
  Play,
  CheckSquare,
  Square,
  FileText,
  ExternalLink
} from 'lucide-react';

export default function ResumeStudio({
  setJdFile,
  jdText,
  setJdText,
  onAnalyzeJd,
  analyzingJd,
  extractedSnippet,
  idealProfile,
  selectedTemplate,
  setSelectedTemplate,
  includeCerts,
  setIncludeCerts,
  onGenerateResume,
  generating,
  selectedProjectIds,
  projects,
  toggleProjectSelection,
  targetCompany,
  currentTexUrl,
  currentPdfUrl
}) {
  return (
    <div className="studio-container">
      {/* PANEL 1: Target Job & JD Upload / Text Parsing */}
      <div className="studio-panel">
        <div className="panel-card">
          <div className="panel-title">
            <Upload size={18} />
            Job Description Intelligence
          </div>
          <div className="input-group">
            <label className="input-label">Upload JD PDF</label>
            <input
              type="file"
              accept=".pdf"
              className="text-input"
              onChange={e => {
                setJdFile(e.target.files[0]);
                setJdText('');
              }}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Or Paste JD Raw Text</label>
            <textarea
              rows={4}
              className="textarea-input"
              placeholder="Paste Job Description text here..."
              value={jdText}
              onChange={e => {
                setJdText(e.target.value);
                setJdFile(null);
              }}
            />
          </div>

          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={onAnalyzeJd}
            disabled={analyzingJd}
          >
            {analyzingJd ? <RefreshCw className="spin" size={16} /> : <Search size={16} />}
            {analyzingJd ? 'Extracting Text & Skills...' : 'Parse JD & Auto-Fill'}
          </button>

          {extractedSnippet && (
            <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <strong>Extracted Raw Text Snippet:</strong>
              <p style={{ fontStyle: 'italic', marginTop: '2px' }}>"{extractedSnippet.substring(0, 150)}..."</p>
            </div>
          )}

          {idealProfile && (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
              <p><strong>Parsed Company:</strong> {idealProfile.company_name}</p>
              <p><strong>Parsed Role:</strong> {idealProfile.role_title}</p>
              {idealProfile.key_skills_hierarchy?.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <strong>Target Skills Hierarchy:</strong>
                  <div className="score-pills" style={{ marginTop: '4px' }}>
                    {idealProfile.key_skills_hierarchy.slice(0, 6).map((sk, idx) => (
                      <span key={idx} className="score-pill" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)' }}>
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PANEL 2: Template Selection & Content Checklist */}
      <div className="studio-panel">
        <div className="panel-card">
          <div className="panel-title">
            <Layers size={18} />
            Template & Options
          </div>
          <div className="input-group">
            <label className="input-label">LaTeX Template</label>
            <select
              className="select-input"
              value={selectedTemplate}
              onChange={e => setSelectedTemplate(e.target.value)}
            >
              <option value="template_1.tex">template_1.tex (Default Clean)</option>
            </select>
          </div>

          <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="certsCheck"
              checked={includeCerts}
              onChange={e => setIncludeCerts(e.target.checked)}
            />
            <label htmlFor="certsCheck" className="input-label" style={{ margin: 0, cursor: 'pointer' }}>
              Include Certifications (with Instructors)
            </label>
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
            onClick={onGenerateResume}
            disabled={generating}
          >
            {generating ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}
            {generating ? 'Compiling PDF via pdflatex...' : 'Compile & Generate Resume'}
          </button>
        </div>

        {/* Interactive Project Selection Checklist */}
        <div className="panel-card" style={{ flex: 1 }}>
          <div className="panel-title">
            <CheckSquare size={18} />
            Select Projects to Include ({selectedProjectIds.length}/{projects.length})
          </div>

          {projects.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No projects indexed yet. Use the <strong>Repo Indexer</strong> tab to scan local repositories.
            </p>
          ) : (
            <div className="checklist-container">
              {projects.map(proj => {
                const isSelected = selectedProjectIds.includes(proj.id);
                return (
                  <div
                    key={proj.id}
                    className={`checklist-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleProjectSelection(proj.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="checkbox-custom">
                      {isSelected ? <CheckSquare size={16} color="var(--accent-color)" /> : <Square size={16} color="var(--text-muted)" />}
                    </div>
                    <div className="checklist-content">
                      <div className="checklist-title">
                        <span>{proj.title}</span>
                      </div>
                      <div className="score-pills">
                        {proj.category_scores && Object.entries(proj.category_scores).map(([cat, val]) => (
                          <span key={cat} className="score-pill">
                            {cat.substring(0, 4)}: {val}/5
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* PANEL 3: Center Screen Resume Live Preview */}
      <div className="studio-preview">
        <div className="preview-toolbar">
          <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} />
            Live Resume Preview {targetCompany ? `(${targetCompany})` : ''}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentTexUrl && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => window.open(currentTexUrl, '_blank')}
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                View .tex
              </button>
            )}
            {currentPdfUrl && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => window.open(currentPdfUrl, '_blank')}
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                <ExternalLink size={14} /> Open PDF
              </button>
            )}
          </div>
        </div>

        {currentPdfUrl ? (
          <iframe src={currentPdfUrl} className="preview-iframe" title="Compiled Resume PDF" />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <FileText size={48} strokeWidth={1} />
            <p style={{ marginTop: '12px' }}>Click "Compile & Generate Resume" to preview target resume PDF</p>
          </div>
        )}
      </div>
    </div>
  );
}
