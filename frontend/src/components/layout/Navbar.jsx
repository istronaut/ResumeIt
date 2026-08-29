import React from 'react';
import { Sparkles, Cpu, Moon, Sun } from 'lucide-react';

export default function Navbar({ health, theme, setTheme, onOpenLlmModal }) {
  return (
    <header className="top-navbar">
      <div className="brand-title">
        <Sparkles size={20} color="var(--accent-color)" />
        <span>ResumeIt Studio</span>
        <span style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 'normal' }}>Arch Linux Edition</span>
      </div>

      <div className="nav-controls">
        {health && (() => {
          const hasLlm = health.llm_providers?.gemini || health.llm_providers?.nvidia_nim || health.llm_providers?.ollama;
          const llmLabel = !hasLlm
            ? 'No LLM found'
            : health.active_provider === 'google_gemini'
            ? 'Gemini (3.6-flash)'
            : health.active_provider === 'nvidia_nim'
            ? 'NVIDIA NIM'
            : health.active_provider === 'local_ollama'
            ? `Ollama (${health.active_model || 'Local'})`
            : 'Auto Router';
          return (
            <div
              className={`status-badge ${hasLlm ? 'online' : 'offline'} clickable-llm-pill`}
              onClick={onOpenLlmModal}
              title="Click to select & ping LLM model"
              style={{ cursor: 'pointer' }}
            >
              <div className={`status-dot ${hasLlm ? 'online' : 'offline'}`} />
              <span>
                LLM: {llmLabel} | PDF: {health.pdflatex_available ? 'pdflatex' : 'Missing'}
              </span>
              <Cpu size={14} style={{ marginLeft: '4px', opacity: 0.8 }} />
            </div>
          );
        })()}

        <button
          type="button"
          className="theme-toggle-btn"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  );
}
