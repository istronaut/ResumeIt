import React from 'react';
import { Briefcase, Plus, Trash2 } from 'lucide-react';

export default function WorkExpSection({
  workexp,
  newWorkexp,
  setNewWorkexp,
  onAddWorkexp,
  onDeleteWorkexp
}) {
  return (
    <div className="panel-card">
      <div className="panel-title">
        <Briefcase size={18} />
        Work Experience ({workexp.length})
      </div>

      {/* Add Work Experience Form */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '10px' }}>Add Work Experience</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            className="text-input"
            placeholder="Company Name *"
            value={newWorkexp.company}
            onChange={e => setNewWorkexp({ ...newWorkexp, company: e.target.value })}
          />
          <input
            type="text"
            className="text-input"
            placeholder="Role Title *"
            value={newWorkexp.role}
            onChange={e => setNewWorkexp({ ...newWorkexp, role: e.target.value })}
          />
          <input
            type="text"
            className="text-input"
            placeholder="Location (e.g. San Francisco, CA)"
            value={newWorkexp.location}
            onChange={e => setNewWorkexp({ ...newWorkexp, location: e.target.value })}
          />
          <input
            type="text"
            className="text-input"
            placeholder="Date Range (e.g. Jun 2023 - Present)"
            value={newWorkexp.date_range}
            onChange={e => setNewWorkexp({ ...newWorkexp, date_range: e.target.value })}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <textarea
            rows={2}
            className="textarea-input"
            placeholder="Bullet points (one per line)..."
            value={newWorkexp.bullet_points}
            onChange={e => setNewWorkexp({ ...newWorkexp, bullet_points: e.target.value })}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={onAddWorkexp}
          style={{ width: 'fit-content' }}
        >
          <Plus size={16} /> Add Work Experience
        </button>
      </div>

      {workexp.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No work experience items added yet.</p>
      ) : (
        <table className="notion-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Role</th>
              <th>Location</th>
              <th>Dates</th>
              <th>Bullets</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workexp.map(w => (
              <tr key={w.id}>
                <td style={{ fontWeight: 600 }}>{w.company}</td>
                <td>{w.role}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{w.location || 'N/A'}</td>
                <td>{w.date_range}</td>
                <td style={{ fontSize: '0.8rem' }}>
                  {Array.isArray(w.bullet_points) ? w.bullet_points.join(' • ') : w.bullet_points}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => onDeleteWorkexp(w.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#da1e28' }}
                    title="Delete Experience"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
