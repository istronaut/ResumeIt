import React from 'react';
import { Search, Upload, RefreshCw, Sparkles } from 'lucide-react';

export default function JobIntelligence({
  setJdFile,
  jdText,
  setJdText,
  onAnalyzeJd,
  analyzingJd,
  idealProfile
}) {
  return (
    <div>
      <div className="panel-card">
        <div className="panel-title">
          <Search size={18} />
          Upload Job Description PDF / Paste Raw Text
        </div>

        <div className="input-group">
          <label className="input-label">Select JD PDF File</label>
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
          <label className="input-label">Or Paste JD Text</label>
          <textarea
            rows={5}
            className="textarea-input"
            placeholder="Paste full Job Description here..."
            value={jdText}
            onChange={e => {
              setJdText(e.target.value);
              setJdFile(null);
            }}
          />
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={onAnalyzeJd}
          disabled={analyzingJd}
          style={{ width: 'fit-content' }}
        >
          {analyzingJd ? <RefreshCw className="spin" size={16} /> : <Upload size={16} />}
          {analyzingJd ? 'Extracting via PyMuPDF...' : 'Analyze JD'}
        </button>
      </div>

      {idealProfile && (
        <div className="panel-card">
          <div className="panel-title">
            <Sparkles size={18} />
            Synthesized Job Intelligence Profile
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Metadata Header Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block' }}>Company</span>
                <strong>{idealProfile.metadata?.company_name || idealProfile.company_name || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block' }}>Role Title</span>
                <strong>{idealProfile.metadata?.role_title || idealProfile.role_title || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block' }}>Seniority Level</span>
                <strong style={{ textTransform: 'capitalize' }}>{idealProfile.metadata?.seniority_level || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block' }}>Location Type</span>
                <strong style={{ textTransform: 'capitalize' }}>{idealProfile.metadata?.location_type || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block' }}>Primary Domain</span>
                <strong>{idealProfile.metadata?.primary_domain || 'N/A'}</strong>
              </div>
            </div>

            {/* Skills Taxonomy Categories & Domain Weights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <strong style={{ fontSize: '0.9rem' }}>Recommended Skills Section Taxonomy Categories:</strong>
                <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: '2px 0 8px 0' }}>LaTeX Skill buckets ordered by role relevance</p>
                <div className="score-pills">
                  {idealProfile.skills_taxonomy?.recommended_categories?.map((cat, idx) => (
                    <span key={idx} className="score-pill" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', fontWeight: 600 }}>
                      {idx + 1}. {cat}
                    </span>
                  ))}
                  {(!idealProfile.skills_taxonomy?.recommended_categories || idealProfile.skills_taxonomy.recommended_categories.length === 0) && (
                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>No categories defined</span>
                  )}
                </div>
              </div>

              <div>
                <strong style={{ fontSize: '0.9rem' }}>Domain Focus Weights:</strong>
                <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: '2px 0 8px 0' }}>Normalized focus area distribution</p>
                <div className="score-pills">
                  {idealProfile.domain_weights && Object.entries(idealProfile.domain_weights).map(([domain, weight], idx) => (
                    <span key={idx} className="score-pill">
                      {domain}: <strong>{Math.round(weight * 100)}%</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ATS Optimization Keywords, Action Verbs, Methodologies */}
            {idealProfile.ats_optimization && (
              <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>ATS Keyword Optimization & Jargon:</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--accent-color)', marginRight: '6px' }}>Exact Keywords:</span>
                    {idealProfile.ats_optimization.exact_keywords?.join(', ')}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--accent-color)', marginRight: '6px' }}>Action Verbs:</span>
                    {idealProfile.ats_optimization.action_verbs?.join(', ')}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--accent-color)', marginRight: '6px' }}>Methodologies & Architectures:</span>
                    {idealProfile.ats_optimization.methodologies?.join(', ')}
                  </div>
                </div>
              </div>
            )}

            {/* Key Responsibilities */}
            {idealProfile.key_responsibilities?.length > 0 && (
              <div>
                <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '6px' }}>Key Functional Responsibilities:</strong>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  {idealProfile.key_responsibilities.map((resp, idx) => (
                    <li key={idx}>{resp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
