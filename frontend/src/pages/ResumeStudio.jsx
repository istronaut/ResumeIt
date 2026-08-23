import React, { useState, useEffect } from 'react';
import {
  Upload,
  Search,
  RefreshCw,
  Layers,
  Play,
  CheckSquare,
  Square,
  FileText,
  Code,
  Eye,
  Download,
  CheckCircle2,
  AlertCircle
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
  targetRole,
  currentTexUrl,
  setCurrentTexUrl,
  currentPdfUrl,
  setCurrentPdfUrl,
  hasGenerated,
  setHasGenerated
}) {
  // Preview & TeX Editor State
  const [viewMode, setViewMode] = useState('pdf'); // 'pdf' | 'tex'
  const [editableTex, setEditableTex] = useState('');
  const [loadingTex, setLoadingTex] = useState(false);
  const [recompilingTex, setRecompilingTex] = useState(false);
  const [compileError, setCompileError] = useState(null);
  const [compileSuccess, setCompileSuccess] = useState(false);

  // Compute active preview & TeX URLs
  const activePdfUrl = hasGenerated && currentPdfUrl
    ? currentPdfUrl
    : `/api/templates/pdf/${selectedTemplate}`;

  const activeTexUrl = hasGenerated && currentTexUrl
    ? currentTexUrl
    : `/api/templates/tex/${selectedTemplate}`;

  // Fetch TeX content when activeTexUrl changes or when component mounts
  useEffect(() => {
    let isMounted = true;
    const fetchTexContent = async () => {
      if (!activeTexUrl) return;
      setLoadingTex(true);
      try {
        const res = await fetch(activeTexUrl);
        if (res.ok) {
          const text = await res.text();
          if (isMounted) {
            setEditableTex(text);
            setCompileError(null);
          }
        }
      } catch (e) {
        console.error("Error fetching TeX content", e);
      } finally {
        if (isMounted) setLoadingTex(false);
      }
    };

    fetchTexContent();
    return () => { isMounted = false; };
  }, [activeTexUrl, selectedTemplate]);

  // Handle re-compiling user-edited LaTeX string
  const handleRecompileTex = async () => {
    if (!editableTex) return;
    setRecompilingTex(true);
    setCompileError(null);
    setCompileSuccess(false);

    try {
      const filenameToUse = hasGenerated && currentTexUrl
        ? currentTexUrl.split('/').pop()
        : undefined;

      const res = await fetch('/api/resume/compile-tex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tex_content: editableTex,
          filename: filenameToUse,
          target_company: targetCompany || "Target Company",
          target_role: targetRole || "Software Engineer"
        })
      });

      const data = await res.json();
      if (res.ok) {
        const timestampUrl = `${data.pdf_url}?t=${Date.now()}`;
        setCurrentPdfUrl(timestampUrl);
        setCurrentTexUrl(data.tex_url);
        if (setHasGenerated) setHasGenerated(true);
        setCompileSuccess(true);
        setTimeout(() => setCompileSuccess(false), 3500);
      } else {
        setCompileError(data.detail || "LaTeX compilation failed.");
      }
    } catch (e) {
      setCompileError("Compilation request failed: " + e.message);
    } finally {
      setRecompilingTex(false);
    }
  };

  // Handle downloading active PDF file
  const handleDownloadPdf = () => {
    const rawFilename = activePdfUrl.split('/').pop().split('?')[0];
    const downloadUrl = `/api/resume/download/${rawFilename}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', rawFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
              onChange={e => {
                setSelectedTemplate(e.target.value);
                if (setHasGenerated) setHasGenerated(false);
              }}
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

      {/* PANEL 3: Center Screen Resume Live Preview & TeX Editor */}
      <div className="studio-preview">
        <div className="preview-toolbar" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color="var(--accent-color)" />
            {hasGenerated ? (
              <>Generated Resume {targetCompany ? `(${targetCompany})` : ''}</>
            ) : (
              <>Template Preview ({selectedTemplate})</>
            )}
          </span>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
            {/* View Mode Toggle Button */}
            <button
              type="button"
              className={`btn-secondary ${viewMode === 'tex' ? 'active-toggle' : ''}`}
              onClick={() => setViewMode(prev => prev === 'pdf' ? 'tex' : 'pdf')}
              style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              title={viewMode === 'pdf' ? 'Switch to TeX Code Editor' : 'Switch to PDF Preview'}
            >
              {viewMode === 'pdf' ? <Code size={14} /> : <Eye size={14} />}
              {viewMode === 'pdf' ? 'Edit / View TeX' : 'View PDF Preview'}
            </button>

            {/* Dedicated Download Button */}
            <button
              type="button"
              className="btn-primary"
              onClick={handleDownloadPdf}
              style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Download PDF File"
            >
              <Download size={14} /> Download PDF
            </button>
          </div>
        </div>

        {/* View Mode Switcher: PDF Preview vs TeX Editor */}
        {viewMode === 'pdf' ? (
          <iframe
            key={activePdfUrl}
            src={activePdfUrl}
            className="preview-iframe"
            title="Compiled Resume PDF Preview"
          />
        ) : (
          <div className="tex-editor-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                <Code size={14} color="var(--accent-color)" />
                {hasGenerated ? 'LaTeX Source Code (Generated Resume)' : `LaTeX Template Source (${selectedTemplate})`}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {compileSuccess && (
                  <span style={{ color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Recompiled & Updated PDF!
                  </span>
                )}

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleRecompileTex}
                  disabled={recompilingTex || loadingTex}
                  style={{ padding: '4px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {recompilingTex ? <RefreshCw className="spin" size={14} /> : <Play size={14} />}
                  {recompilingTex ? 'Recompiling...' : 'Save & Recompile TeX'}
                </button>
              </div>
            </div>

            {compileError && (
              <div style={{ padding: '8px 14px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fca5a5', color: '#991b1b', fontSize: '0.78rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '120px', overflowY: 'auto' }}>
                <AlertCircle size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                {compileError}
              </div>
            )}

            <textarea
              className="tex-textarea"
              value={editableTex}
              onChange={e => setEditableTex(e.target.value)}
              placeholder="LaTeX code..."
              disabled={loadingTex}
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
