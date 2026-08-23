import React from 'react';
import { History, ExternalLink } from 'lucide-react';

export default function GeneratedHistory({ history }) {
  return (
    <div className="panel-card">
      <div className="panel-title">
        <History size={18} />
        Historical Generated Resumes ({history.length})
      </div>
      {history.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '12px 0' }}>No generated resume history yet.</p>
      ) : (
        <table className="notion-table">
          <thead>
            <tr>
              <th>Target Company</th>
              <th>Role Title</th>
              <th>Date Generated</th>
              <th>Template Used</th>
              <th>PDF Artifact</th>
            </tr>
          </thead>
          <tbody>
            {history.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>{item.company_name}</td>
                <td>{item.role_title}</td>
                <td>{item.created_at}</td>
                <td><code>{item.template_name}</code></td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => window.open(`/api/resume/pdf/${item.pdf_file}`, '_blank')}
                    style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                  >
                    <ExternalLink size={12} /> Open PDF
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
