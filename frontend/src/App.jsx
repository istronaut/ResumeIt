import React, { useState, useEffect } from 'react';
import {
  FileText,
  FolderGit2,
  Briefcase,
  Award,
  BookOpen,
  History,
  Sun,
  Moon,
  Play,
  Upload,
  Search,
  CheckSquare,
  Square,
  Download,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [activeTab, setActiveTab] = useState('studio');
  const [health, setHealth] = useState(null);

  // Data Stores State
  const [projects, setProjects] = useState([]);
  const [workexp, setWorkexp] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [extracurriculars, setExtracurriculars] = useState([]);
  const [history, setHistory] = useState([]);
  const [idealProfile, setIdealProfile] = useState(null);

  // Resume Studio State
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [targetCompany, setTargetCompany] = useState('Google');
  const [targetRole, setTargetRole] = useState('Senior Software Engineer');
  const [selectedTemplate, setSelectedTemplate] = useState('template_1.tex');
  const [includeCerts, setIncludeCerts] = useState(true);

  // Live Resume PDF State
  const [currentPdfUrl, setCurrentPdfUrl] = useState('');
  const [currentTexUrl, setCurrentTexUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  // Repo Indexer State
  const [repoPath, setRepoPath] = useState('');
  const [indexing, setIndexing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);

  // JD Analyzer State
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [analyzingJd, setAnalyzingJd] = useState(false);

  // Form states for CRUD
  const [newCert, setNewCert] = useState({ title: '', issuer: '', instructor: '', issue_date: '', credential_url: '' });

  // Initialize theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch initial system status and data stores
  useEffect(() => {
    fetchHealth();
    fetchAllStores();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (e) {
      console.error("Health check failed", e);
    }
  };

  const fetchAllStores = async () => {
    try {
      const [projRes, expRes, achRes, certRes, extraRes, histRes, profileRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/workexp'),
        fetch('/api/achievements'),
        fetch('/api/certificates'),
        fetch('/api/extracurriculars'),
        fetch('/api/resume/history'),
        fetch('/api/jd/profile')
      ]);

      const [projData, expData, achData, certData, extraData, histData, profileData] = await Promise.all([
        projRes.json(), expRes.json(), achRes.json(), certRes.json(), extraRes.json(), histRes.json(), profileRes.json()
      ]);

      setProjects(projData);
      setWorkexp(expData);
      setAchievements(achData);
      setCertificates(certData);
      setExtracurriculars(extraData);
      setHistory(histData);
      setIdealProfile(profileData);

      // Default select all project IDs initially
      if (projData.length > 0) {
        setSelectedProjectIds(projData.map(p => p.id));
      }

      // If history exists, populate initial preview
      if (histData.length > 0) {
        setCurrentPdfUrl(`/api/resume/pdf/${histData[0].pdf_file}`);
        setCurrentTexUrl(`/api/resume/tex/${histData[0].latex_file}`);
      }
    } catch (e) {
      console.error("Error fetching stores", e);
    }
  };

  const toggleProjectSelection = (id) => {
    setSelectedProjectIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleGenerateResume = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_name: selectedTemplate,
          target_company: targetCompany,
          target_role: targetRole,
          selected_project_ids: selectedProjectIds,
          include_certificates: includeCerts
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPdfUrl(`${data.pdf_url}?t=${Date.now()}`);
        setCurrentTexUrl(data.tex_url);
        fetch('/api/resume/history').then(r => r.json()).then(setHistory);
      } else {
        alert("Generation Error: " + data.detail);
      }
    } catch (e) {
      alert("Failed to generate resume: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleScanRepository = async (e) => {
    e.preventDefault();
    if (!repoPath) return;
    setIndexing(true);
    try {
      const res = await fetch('/api/indexer/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_path: repoPath })
      });
      const data = await res.json();
      if (res.ok) {
        setLastScanResult(data);
        fetch('/api/projects').then(r => r.json()).then(setProjects);
      } else {
        alert("Scan Error: " + data.detail);
      }
    } catch (e) {
      alert("Scan failed: " + e.message);
    } finally {
      setIndexing(false);
    }
  };

  const handleUploadJdPdf = async (e) => {
    e.preventDefault();
    if (!jdFile) return;
    setAnalyzingJd(true);
    const formData = new FormData();
    formData.append('file', jdFile);
    formData.append('company_name', targetCompany);
    formData.append('role_title', targetRole);

    try {
      const res = await fetch('/api/jd/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setIdealProfile(data.ideal_profile);
      } else {
        alert("JD Error: " + data.detail);
      }
    } catch (e) {
      alert("Upload failed: " + e.message);
    } finally {
      setAnalyzingJd(false);
    }
  };

  const handleAddCertificate = async (e) => {
    e.preventDefault();
    if (!newCert.title || !newCert.issuer) return;
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCert, id: `cert-${Date.now()}` })
      });
      if (res.ok) {
        setNewCert({ title: '', issuer: '', instructor: '', issue_date: '', credential_url: '' });
        fetch('/api/certificates').then(r => r.json()).then(setCertificates);
      }
    } catch (e) {
      console.error("Add cert error", e);
    }
  };

  const handleDeleteCertificate = async (id) => {
    try {
      await fetch(`/api/certificates/${id}`, { method: 'DELETE' });
      fetch('/api/certificates').then(r => r.json()).then(setCertificates);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="top-navbar">
        <div className="brand-title">
          <Sparkles size={20} color="var(--accent-color)" />
          <span>ResumeIt Studio</span>
          <span style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 'normal' }}>Arch Linux Edition</span>
        </div>

        <div className="nav-controls">
          {/* Provider Status Indicator */}
          {health && (
            <div className={`status-badge ${health.pdflatex_available ? 'online' : 'offline'}`}>
              <div className={`status-dot ${health.pdflatex_available ? 'online' : 'offline'}`} />
              <span>
                LLM: {health.llm_providers?.gemini ? 'Gemini' : health.llm_providers?.nvidia_nim ? 'NVIDIA NIM' : 'Ollama'} | PDF: {health.pdflatex_available ? 'pdflatex' : 'Missing'}
              </span>
            </div>
          )}

          {/* Light / Dark Mode Toggle */}
          <button
            className="theme-toggle-btn"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title="Toggle Notion Dark/Light Theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="main-wrapper">
        {/* Sidebar */}
        <aside className="sidebar">
          <button
            className={`nav-item ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('studio')}
          >
            <FileText size={16} />
            <span>Resume Studio</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'indexer' ? 'active' : ''}`}
            onClick={() => setActiveTab('indexer')}
          >
            <FolderGit2 size={16} />
            <span>Repo Indexer</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'jd' ? 'active' : ''}`}
            onClick={() => setActiveTab('jd')}
          >
            <Search size={16} />
            <span>Job Intelligence</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'stores' ? 'active' : ''}`}
            onClick={() => setActiveTab('stores')}
          >
            <BookOpen size={16} />
            <span>Data Stores</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            <span>Resume History</span>
          </button>
        </aside>

        {/* Content Area */}
        <main className="content-area">
          {/* TAB 1: RESUME STUDIO */}
          {activeTab === 'studio' && (
            <div className="studio-container">
              {/* Studio Sidebar Control */}
              <div className="studio-sidebar">
                <div className="panel-card">
                  <div className="panel-title">
                    <Briefcase size={18} />
                    Target Job Configuration
                  </div>
                  <div className="input-group">
                    <label className="input-label">Target Company</label>
                    <input
                      type="text"
                      className="text-input"
                      value={targetCompany}
                      onChange={e => setTargetCompany(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Target Role Title</label>
                    <input
                      type="text"
                      className="text-input"
                      value={targetRole}
                      onChange={e => setTargetRole(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">LaTeX Template</label>
                    <select
                      className="select-input"
                      value={selectedTemplate}
                      onChange={e => setSelectedTemplate(e.target.value)}
                    >
                      <option value="template_1.tex">template_1.tex (Default Clean)</option>
                    </select>
                  </div>

                  <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="certsCheck"
                      checked={includeCerts}
                      onChange={e => setIncludeCerts(e.target.checked)}
                    />
                    <label htmlFor="certsCheck" className="input-label" style={{ margin: 0, cursor: 'pointer' }}>
                      Include Certifications (with Instructors)
                    </label>
                  </div>

                  <button
                    className="btn-primary"
                    style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
                    onClick={handleGenerateResume}
                    disabled={generating}
                  >
                    {generating ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}
                    {generating ? 'Compiling PDF...' : 'Compile & Generate Resume'}
                  </button>
                </div>

                {/* Interactive Project Selection Checklist */}
                <div className="panel-card">
                  <div className="panel-title">
                    <CheckSquare size={18} />
                    Select Projects to Include ({selectedProjectIds.length}/{projects.length})
                  </div>
                  <div className="checklist-container">
                    {projects.map(proj => {
                      const isSelected = selectedProjectIds.includes(proj.id);
                      return (
                        <div
                          key={proj.id}
                          className={`checklist-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleProjectSelection(proj.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="checkbox-custom">
                            {isSelected ? <CheckSquare size={16} color="var(--accent-color)" /> : <Square size={16} color="var(--text-muted)" />}
                          </div>
                          <div className="checklist-content">
                            <div className="checklist-title">
                              <span>{proj.title}</span>
                              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                Tech: {proj.tech_stack?.slice(0, 3).join(', ')}
                              </span>
                            </div>
                            <div className="score-pills">
                              {proj.category_scores && Object.entries(proj.category_scores).map(([cat, val]) => (
                                <span key={cat} className="score-pill">
                                  {cat.substring(0, 4)}: {val}/5
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Center Screen PDF Live Preview */}
              <div className="studio-preview">
                <div className="preview-toolbar">
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={16} />
                    Generated Resume Preview ({targetCompany})
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {currentTexUrl && (
                      <a href={currentTexUrl} target="_blank" rel="noreferrer" className="btn-secondary" style={{ textDecoration: 'none', padding: '4px 10px', fontSize: '0.8rem' }}>
                        View .tex
                      </a>
                    )}
                    {currentPdfUrl && (
                      <a href={currentPdfUrl} download className="btn-primary" style={{ textDecoration: 'none', padding: '4px 10px', fontSize: '0.8rem' }}>
                        <Download size={14} /> Download PDF
                      </a>
                    )}
                  </div>
                </div>

                {currentPdfUrl ? (
                  <iframe src={currentPdfUrl} className="preview-iframe" title="Compiled Resume PDF" />
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <FileText size={48} strokeWidth={1} />
                    <p style={{ marginTop: '12px' }}>Click "Compile & Generate Resume" to preview target resume PDF</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: REPO INDEXER */}
          {activeTab === 'indexer' && (
            <div>
              <div className="panel-card">
                <div className="panel-title">
                  <FolderGit2 size={18} />
                  Local Repository Codebase Indexer & AST Parser
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Enter an absolute path to a local Git repository. Content SHA256 hashes will be tracked in <code>metadata_tracker.json</code> to prevent duplicate scanning.
                </p>

                <form onSubmit={handleScanRepository} style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="/home/ishaan/Code/EarCandy3D"
                    value={repoPath}
                    onChange={e => setRepoPath(e.target.value)}
                  />
                  <button type="submit" className="btn-primary" disabled={indexing}>
                    {indexing ? <RefreshCw className="spin" size={16} /> : <Search size={16} />}
                    {indexing ? 'Indexing AST...' : 'Scan & Rate Repo'}
                  </button>
                </form>
              </div>

              {lastScanResult && (
                <div className="panel-card">
                  <div className="panel-title">
                    <Cpu size={18} />
                    Scan Insights & Rating Output
                  </div>
                  {lastScanResult.skipped_hash && (
                    <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)', fontSize: '0.85rem', marginBottom: '16px' }}>
                      Hash match found in metadata_tracker.json — Re-indexing skipped!
                    </div>
                  )}

                  <h4>{lastScanResult.project?.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Path: {lastScanResult.project?.repo_path}</p>

                  <h5 style={{ marginTop: '16px' }}>7-Category Domain Ratings (1 to 5 scale):</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '8px' }}>
                    {lastScanResult.project?.category_scores && Object.entries(lastScanResult.project.category_scores).map(([cat, score]) => (
                      <div key={cat} style={{ border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)' }}>
                        <span style={{ fontSize: '0.8rem', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{cat}</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent-color)' }}>{score} / 5</div>
                      </div>
                    ))}
                  </div>

                  <h5 style={{ marginTop: '16px' }}>Formulated Metric Bullet Points:</h5>
                  <ul style={{ paddingLeft: '20px', marginTop: '8px', fontSize: '0.9rem' }}>
                    {lastScanResult.project?.bullet_points?.map((bullet, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Indexed Projects List */}
              <div className="panel-card">
                <div className="panel-title">
                  <BookOpen size={18} />
                  All Indexed Projects ({projects.length})
                </div>
                <table className="notion-table">
                  <thead>
                    <tr>
                      <th>Project Title</th>
                      <th>Tech Stack</th>
                      <th>Ratings Summary</th>
                      <th>Bullet Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.title}</td>
                        <td>{p.tech_stack?.slice(0, 4).join(', ')}</td>
                        <td>
                          {p.category_scores && Object.entries(p.category_scores).map(([c, v]) => (
                            <span key={c} className="score-pill" style={{ marginRight: '4px' }}>{c[0].toUpperCase()}:{v}</span>
                          ))}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>{p.bullet_points?.[0]?.substring(0, 90)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: JOB INTELLIGENCE */}
          {activeTab === 'jd' && (
            <div>
              <div className="panel-card">
                <div className="panel-title">
                  <Search size={18} />
                  Upload Job Description PDF (PyMuPDF Extraction)
                </div>
                <form onSubmit={handleUploadJdPdf} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Select JD PDF File</label>
                    <input
                      type="file"
                      accept=".pdf"
                      className="text-input"
                      onChange={e => setJdFile(e.target.files[0])}
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={analyzingJd || !jdFile} style={{ width: 'fit-content' }}>
                    {analyzingJd ? <RefreshCw className="spin" size={16} /> : <Upload size={16} />}
                    {analyzingJd ? 'Extracting via PyMuPDF...' : 'Analyze JD PDF'}
                  </button>
                </form>
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
          )}

          {/* TAB 4: DATA STORES */}
          {activeTab === 'stores' && (
            <div>
              {/* Certificates Store (With Instructor/Teacher Field) */}
              <div className="panel-card">
                <div className="panel-title">
                  <Award size={18} />
                  Certificates & Courses (With Instructor Attribution)
                </div>

                <form onSubmit={handleAddCertificate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Course/Cert Title"
                    value={newCert.title}
                    onChange={e => setNewCert({ ...newCert, title: e.target.value })}
                  />
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Issuer (e.g. Coursera)"
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
                  <button type="submit" className="btn-primary">
                    <Plus size={16} /> Add
                  </button>
                </form>

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
                          <button onClick={() => handleDeleteCertificate(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#da1e28' }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Work Experience */}
              <div className="panel-card">
                <div className="panel-title">
                  <Briefcase size={18} />
                  Work Experience Store ({workexp.length})
                </div>
                <table className="notion-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Role</th>
                      <th>Dates</th>
                      <th>Bullets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workexp.map(w => (
                      <tr key={w.id}>
                        <td style={{ fontWeight: 600 }}>{w.company}</td>
                        <td>{w.role}</td>
                        <td>{w.date_range}</td>
                        <td style={{ fontSize: '0.8rem' }}>{w.bullet_points?.[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Achievements Store */}
              <div className="panel-card">
                <div className="panel-title">
                  <Award size={18} />
                  Achievements & Honors ({achievements.length})
                </div>
                <table className="notion-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Description</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {achievements.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.title}</td>
                        <td style={{ fontSize: '0.85rem' }}>{a.description}</td>
                        <td>{a.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: RESUME HISTORY */}
          {activeTab === 'history' && (
            <div className="panel-card">
              <div className="panel-title">
                <History size={18} />
                Historical Generated Resumes ({history.length})
              </div>
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
                        <a href={`/api/resume/pdf/${item.pdf_file}`} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '2px 8px', fontSize: '0.8rem', textDecoration: 'none' }}>
                          <ExternalLink size={12} /> Open PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
