import React from 'react';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';

export default function ExtracurricularsSection({
  extracurriculars,
  newExtracurricular,
  setNewExtracurricular,
  onAddExtracurricular,
  onDeleteExtracurricular
}) {
  return (
    <div className="panel-card">
      <div className="panel-title">
        <GraduationCap size={18} />
        Extracurriculars & Leadership ({extracurriculars.length})
      </div>

      {/* Add Extracurricular Form */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '10px' }}>Add Extracurricular / Leadership</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            className="text-input"
            placeholder="Organization *"
            value={newExtracurricular.organization}
            onChange={e => setNewExtracurricular({ ...newExtracurricular, organization: e.target.value })}
          />
          <input
            type="text"
            className="text-input"
            placeholder="Role Title *"
            value={newExtracurricular.role}
            onChange={e => setNewExtracurricular({ ...newExtracurricular, role: e.target.value })}
          />
          <input
            type="text"
            className="text-input"
            placeholder="Location"
            value={newExtracurricular.location}
            onChange={e => setNewExtracurricular({ ...newExtracurricular, location: e.target.value })}
          />
          <input
            type="text"
            className="text-input"
            placeholder="Date Range"
            value={newExtracurricular.date_range}
            onChange={e => setNewExtracurricular({ ...newExtracurricular, date_range: e.target.value })}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <textarea
            rows={2}
            className="textarea-input"
            placeholder="Bullet points (one per line)..."
            value={newExtracurricular.bullet_points}
            onChange={e => setNewExtracurricular({ ...newExtracurricular, bullet_points: e.target.value })}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={onAddExtracurricular}
          style={{ width: 'fit-content' }}
        >
          <Plus size={16} /> Add Extracurricular
        </button>
      </div>

      {extracurriculars.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No extracurricular items added yet.</p>
      ) : (
        <table className="notion-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Role</th>
              <th>Dates</th>
              <th>Bullets</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {extracurriculars.map(e => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.organization}</td>
                <td>{e.role}</td>
                <td>{e.date_range}</td>
                <td style={{ fontSize: '0.8rem' }}>
                  {Array.isArray(e.bullet_points) ? e.bullet_points.join(' • ') : e.bullet_points}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => onDeleteExtracurricular(e.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#da1e28' }}
                    title="Delete Extracurricular"
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
