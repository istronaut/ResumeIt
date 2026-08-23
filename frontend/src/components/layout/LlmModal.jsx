import React from 'react';
import { Cpu, Activity, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LlmModal({
  showLlmModal,
  setShowLlmModal,
  llmProviders,
  selectedProvider,
  setSelectedProvider,
  selectedOllamaModel,
  setSelectedOllamaModel,
  ollamaModels,
  pingResult,
  pinging,
  handlePingLlm,
  handleSelectLlmProvider
}) {
  if (!showLlmModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowLlmModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={20} color="var(--accent-color)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Select LLM Engine & Ping Model</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={() => setShowLlmModal(false)}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-subtitle">Select the LLM provider for repo rating, project metrics formulation, and JD parsing.</p>

          <div className="provider-grid">
            {llmProviders.map(p => (
              <div
                key={p.id}
                className={`provider-card ${selectedProvider === p.id ? 'active' : ''} ${!p.available && p.id !== 'auto' ? 'disabled' : ''}`}
                onClick={() => {
                  setSelectedProvider(p.id);
                  const modelToPing = p.id === 'local_ollama' ? (selectedOllamaModel || p.models?.[0]) : p.model;
                  handlePingLlm(p.id, modelToPing);
                }}
              >
                <div className="provider-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className={`status-dot ${p.available ? 'online' : 'offline'}`} />
                    <strong style={{ fontSize: '0.9rem' }}>{p.name}</strong>
                  </div>
                  {selectedProvider === p.id && <span className="active-badge">Selected</span>}
                </div>
                <p className="provider-desc">{p.description}</p>
                
                {p.id === 'local_ollama' && (
                  <div className="ollama-select-box" onClick={e => e.stopPropagation()}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '6px' }}>Installed Ollama Model:</label>
                    <select
                      className="text-input"
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                      value={selectedOllamaModel}
                      onChange={e => {
                        setSelectedOllamaModel(e.target.value);
                        setSelectedProvider('local_ollama');
                        handlePingLlm('local_ollama', e.target.value);
                      }}
                    >
                      {ollamaModels.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      {ollamaModels.length === 0 && <option value="">No installed models found</option>}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Ping Status Area */}
          <div className="ping-status-panel">
            <div className="ping-status-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="var(--accent-color)" />
                <span>Model Health & Response Test</span>
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                disabled={pinging}
                onClick={() => {
                  const modelToPing = selectedProvider === 'local_ollama' ? selectedOllamaModel : undefined;
                  handlePingLlm(selectedProvider, modelToPing);
                }}
              >
                {pinging ? <RefreshCw className="spin" size={12} /> : 'Ping Selected Model'}
              </button>
            </div>

            {pinging && (
              <div className="ping-loading">
                <RefreshCw className="spin" size={16} />
                <span>Sending ping request to {selectedProvider}...</span>
              </div>
            )}

            {!pinging && pingResult && (
              <div className={`ping-result-card ${pingResult.status}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {pingResult.status === 'online' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <strong style={{ fontSize: '0.88rem' }}>
                      {pingResult.status === 'online' ? 'Model Responding' : 'Model Unreachable / Offline'}
                    </strong>
                  </div>
                  {pingResult.latency_ms !== undefined && (
                    <span className="latency-badge">{pingResult.latency_ms} ms</span>
                  )}
                </div>
                {pingResult.status === 'online' ? (
                  <p style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.9 }}>
                    {pingResult.provider} ({pingResult.model || 'active'}) answered ping prompt successfully.
                  </p>
                ) : (
                  <p style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.9 }}>
                    {pingResult.error || 'Connection timed out or API key missing.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={() => setShowLlmModal(false)}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleSelectLlmProvider(selectedProvider, selectedOllamaModel)}
          >
            Save & Use Model
          </button>
        </div>
      </div>
    </div>
  );
}
