import React from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';

export default function CertificatesSection({
  certificates,
  newCert,
  setNewCert,
  onAddCertificate,
  onDeleteCertificate
}) {
  return (
    <div className="panel-card">
      <div className="panel-title">
        <BookOpen size={18} />
        Certificates & Courses ({certificates.length})
      </div>

      {/* Add Certificate Form */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '10px' }}>Add Certification or Course</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px' }}>
          <input
            type="text"
            className="text-input"
            placeholder="Course/Cert Title *"
            value={newCert.title}
            onChange={e => setNewCert({ ...newCert, title: e.target.value })}
          />
          <input
            type="text"
            className="text-input"
            placeholder="Issuer (e.g. Coursera / AWS) *"
            value={newCert.issuer}
            onChange={e => setNewCert({ ...newCert, issuer: e.target.value })}
          />
          <input
            type="text"
            className="text-input"
            placeholder="Instructor / Institution (e.g. Andrew Ng)"
            value={newCert.instructor}
            onChange={e => setNewCert({ ...newCert, instructor: e.target.value })}
          />
          <input
            type="text"
            className="text-input"
            placeholder="Issue Date (e.g. 2024)"
            value={newCert.issue_date}
            onChange={e => setNewCert({ ...newCert, issue_date: e.target.value })}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={onAddCertificate}
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {certificates.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No certificates added yet.</p>
      ) : (
        <table className="notion-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Issuer</th>
              <th>Instructor / Institution</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {certificates.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.title}</td>
                <td>{c.issuer}</td>
                <td style={{ color: 'var(--accent-color)' }}>{c.instructor || 'N/A'}</td>
                <td>{c.issue_date || '2024'}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => onDeleteCertificate(c.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#da1e28' }}
                    title="Delete Certificate"
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
