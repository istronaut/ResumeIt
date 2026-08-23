import React from 'react';
import { User, Save, CheckCircle2 } from 'lucide-react';

export default function PersonalDetailsSection({
  candidateProfile,
  setCandidateProfile,
  onSaveProfile,
  profileSavedMsg
}) {
  return (
    <div className="panel-card">
      <div className="panel-title">
        <User size={18} />
        Candidate Personal Header & Details
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="input-group">
          <label className="input-label">Full Name</label>
          <input
            type="text"
            className="text-input"
            placeholder="Jane Doe"
            value={candidateProfile.full_name || ''}
            onChange={e => setCandidateProfile({ ...candidateProfile, full_name: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label className="input-label">Phone Number</label>
          <input
            type="text"
            className="text-input"
            placeholder="+1 (555) 019-2834"
            value={candidateProfile.phone || ''}
            onChange={e => setCandidateProfile({ ...candidateProfile, phone: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label className="input-label">Email Address</label>
          <input
            type="email"
            className="text-input"
            placeholder="jane.doe@example.com"
            value={candidateProfile.email || ''}
            onChange={e => setCandidateProfile({ ...candidateProfile, email: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label className="input-label">LinkedIn URL</label>
          <input
            type="url"
            className="text-input"
            placeholder="https://linkedin.com/in/janedoe"
            value={candidateProfile.linkedin_url || ''}
            onChange={e => setCandidateProfile({ ...candidateProfile, linkedin_url: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label className="input-label">GitHub URL</label>
          <input
            type="url"
            className="text-input"
            placeholder="https://github.com/janedoe"
            value={candidateProfile.github_url || ''}
            onChange={e => setCandidateProfile({ ...candidateProfile, github_url: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label className="input-label">Portfolio Site URL</label>
          <input
            type="url"
            className="text-input"
            placeholder="https://janedoe.dev"
            value={candidateProfile.portfolio_url || ''}
            onChange={e => setCandidateProfile({ ...candidateProfile, portfolio_url: e.target.value })}
          />
        </div>
        <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={onSaveProfile}
            style={{ width: 'fit-content' }}
          >
            <Save size={16} /> Save Candidate Profile
          </button>
          {profileSavedMsg && (
            <span style={{ fontSize: '0.85rem', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={16} /> Profile saved!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
