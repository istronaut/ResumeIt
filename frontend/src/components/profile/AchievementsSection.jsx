import React from 'react';
import { Award, Plus, Trash2 } from 'lucide-react';

export default function AchievementsSection({
  achievements,
  newAchievement,
  setNewAchievement,
  onAddAchievement,
  onDeleteAchievement
}) {
  return (
    <div className="panel-card">
      <div className="panel-title">
        <Award size={18} />
        Achievements & Honors ({achievements.length})
      </div>

      {/* Add Achievement Form */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '10px' }}>Add Achievement / Honor</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            className="text-input"
            placeholder="Achievement Title *"
            value={newAchievement.title}
            onChange={e => setNewAchievement({ ...newAchievement, title: e.target.value })}
          />
          <input
            type="text"
            className="text-input"
            placeholder="Date / Year (e.g. 2024)"
            value={newAchievement.date}
            onChange={e => setNewAchievement({ ...newAchievement, date: e.target.value })}
          />
          <input
            type="text"
            className="text-input"
            placeholder="Impact / Scale (e.g. Ranked Top 1%)"
            value={newAchievement.impact}
            onChange={e => setNewAchievement({ ...newAchievement, impact: e.target.value })}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={onAddAchievement}
          >
            <Plus size={16} /> Add
          </button>
        </div>
        <input
          type="text"
          className="text-input"
          placeholder="Description *"
          value={newAchievement.description}
          onChange={e => setNewAchievement({ ...newAchievement, description: e.target.value })}
        />
      </div>

      {achievements.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No achievement items added yet.</p>
      ) : (
        <table className="notion-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Impact</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {achievements.map(a => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.title}</td>
                <td style={{ fontSize: '0.85rem' }}>{a.description}</td>
                <td style={{ color: 'var(--accent-color)', fontSize: '0.85rem' }}>{a.impact || 'N/A'}</td>
                <td>{a.date}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => onDeleteAchievement(a.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#da1e28' }}
                    title="Delete Achievement"
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
