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
            Synthesized Ideal Candidate Profile (ideal_profile.json)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p><strong>Company:</strong> {idealProfile.company_name}</p>
              <p><strong>Role:</strong> {idealProfile.role_title}</p>
              <p><strong>Bullet Tone:</strong> {idealProfile.expected_bullet_tone}</p>
            </div>
            <div>
              <strong>Top Skills Hierarchy:</strong>
              <div className="score-pills" style={{ marginTop: '6px' }}>
                {idealProfile.key_skills_hierarchy?.map((skill, idx) => (
                  <span key={idx} className="score-pill" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)' }}>
                    {idx + 1}. {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
