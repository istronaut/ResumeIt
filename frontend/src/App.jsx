import React, { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import LlmModal from './components/layout/LlmModal';
import ResumeStudio from './pages/ResumeStudio';
import RepoIndexer from './pages/RepoIndexer';
import JobIntelligence from './pages/JobIntelligence';
import ProfileVault from './pages/ProfileVault';
import GeneratedHistory from './pages/GeneratedHistory';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [activeTab, setActiveTab] = useState('studio');
  const [health, setHealth] = useState(null);

  // LLM Selector Modal State
  const [showLlmModal, setShowLlmModal] = useState(false);
  const [llmProviders, setLlmProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('auto');
  const [selectedOllamaModel, setSelectedOllamaModel] = useState('');
  const [ollamaModels, setOllamaModels] = useState([]);
  const [pingResult, setPingResult] = useState(null);
  const [pinging, setPinging] = useState(false);

  // Data Stores State
  const [projects, setProjects] = useState([]);
  const [workexp, setWorkexp] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [extracurriculars, setExtracurriculars] = useState([]);
  const [history, setHistory] = useState([]);
  const [idealProfile, setIdealProfile] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState({
    full_name: '',
    phone: '',
    email: '',
    linkedin_url: '',
    linkedin_handle: '',
    github_url: '',
    github_handle: '',
    portfolio_url: '',
    portfolio_handle: ''
  });

  // Resume Studio State
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('template_1.tex');
  const [includeCerts, setIncludeCerts] = useState(true);

  // Live Resume PDF State
  const [currentPdfUrl, setCurrentPdfUrl] = useState('');
  const [currentTexUrl, setCurrentTexUrl] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Repo Indexer State
  const [repoPath, setRepoPath] = useState('');
  const [indexing, setIndexing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);

  // JD Analyzer State
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState('');
  const [extractedSnippet, setExtractedSnippet] = useState('');
  const [analyzingJd, setAnalyzingJd] = useState(false);

  // Form states for Profile Vault CRUD
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);
  const [newWorkexp, setNewWorkexp] = useState({ company: '', role: '', location: '', date_range: '', bullet_points: '' });
  const [newCert, setNewCert] = useState({ title: '', issuer: '', instructor: '', issue_date: '', credential_url: '' });
  const [newAchievement, setNewAchievement] = useState({ title: '', description: '', date: '', impact: '' });
  const [newExtracurricular, setNewExtracurricular] = useState({ organization: '', role: '', location: '', date_range: '', bullet_points: '' });

  // Initialize theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch initial status and data stores
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

  const fetchLlmModels = async () => {
    try {
      const res = await fetch('/api/llm/models');
      const data = await res.json();
      setLlmProviders(data.providers || []);
      setSelectedProvider(data.active_provider || 'auto');
      setSelectedOllamaModel(data.active_model || data.ollama_models?.[0] || '');
      setOllamaModels(data.ollama_models || []);
      return data;
    } catch (e) {
      console.error("Error fetching LLM models", e);
    }
  };

  const handleOpenLlmModal = async () => {
    setShowLlmModal(true);
    const data = await fetchLlmModels();
    const providerToPing = data?.active_provider || 'auto';
    const modelToPing = providerToPing === 'local_ollama' ? (data?.active_model || data?.ollama_models?.[0]) : undefined;
    handlePingLlm(providerToPing, modelToPing);
  };

  const handlePingLlm = async (provider, model) => {
    setPinging(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/llm/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model })
      });
      const data = await res.json();
      setPingResult(data);
    } catch (e) {
      setPingResult({ status: 'offline', error: e.message });
    } finally {
      setPinging(false);
    }
  };

  const handleSelectLlmProvider = async (provider, model) => {
    try {
      await fetch('/api/llm/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model })
      });
      await fetchHealth();
      setShowLlmModal(false);
    } catch (e) {
      alert("Failed to save LLM selection: " + e.message);
    }
  };

  const fetchAllStores = async () => {
    try {
      const [projRes, expRes, achRes, certRes, extraRes, histRes, profileRes, candidateRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/workexp'),
        fetch('/api/achievements'),
        fetch('/api/certificates'),
        fetch('/api/extracurriculars'),
        fetch('/api/resume/history'),
        fetch('/api/jd/profile'),
        fetch('/api/profile')
      ]);

      const [projData, expData, achData, certData, extraData, histData, profileData, candidateData] = await Promise.all([
        projRes.json(), expRes.json(), achRes.json(), certRes.json(), extraRes.json(), histRes.json(), profileRes.json(), candidateRes.json()
      ]);

      setProjects(projData);
      setWorkexp(expData);
      setAchievements(achData);
      setCertificates(certData);
      setExtracurriculars(extraData);
      setHistory(histData);
      setIdealProfile(profileData);

      if (candidateData && typeof candidateData === 'object') {
        setCandidateProfile(prev => ({ ...prev, ...candidateData }));
      }

      if (projData.length > 0) {
        setSelectedProjectIds(projData.map(p => p.id));
      }
    } catch (e) {
      console.error("Error fetching stores", e);
    }
  };

  const handleSaveCandidateProfile = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidateProfile)
      });
      if (res.ok) {
        setProfileSavedMsg(true);
        setTimeout(() => setProfileSavedMsg(false), 3000);
      }
    } catch (e) {
      alert("Failed to save profile: " + e.message);
    }
  };

  const toggleProjectSelection = (id) => {
    setSelectedProjectIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleGenerateResume = async (e) => {
    if (e) e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_name: selectedTemplate,
          target_company: targetCompany || "Target Company",
          target_role: targetRole || "Software Engineer",
          selected_project_ids: selectedProjectIds,
          include_certificates: includeCerts
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPdfUrl(`${data.pdf_url}?t=${Date.now()}`);
        setCurrentTexUrl(data.tex_url);
        setHasGenerated(true);
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

  const handleScanRepository = async (e, customPath, scanMode = 'single') => {
    if (e) e.preventDefault();
    const targetPath = customPath || repoPath;
    if (!targetPath) return;
    setIndexing(true);
    try {
      const res = await fetch('/api/indexer/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_path: targetPath, scan_mode: scanMode })
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

  const handleAnalyzeJd = async (e) => {
    if (e) e.preventDefault();
    if (!jdFile && (!jdText || jdText.trim().length < 10)) {
      alert("Please select a JD PDF file or paste Job Description text.");
      return;
    }

    setAnalyzingJd(true);
    try {
      let profileResult = null;
      let textSnippet = "";

      if (jdFile) {
        const formData = new FormData();
        formData.append('file', jdFile);
        if (targetCompany) formData.append('company_name', targetCompany);
        if (targetRole) formData.append('role_title', targetRole);

        const res = await fetch('/api/jd/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          profileResult = data.ideal_profile;
          textSnippet = data.extracted_text_snippet;
        } else {
          alert("JD Upload Error: " + data.detail);
        }
      } else {
        const res = await fetch('/api/jd/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jd_text: jdText,
            company_name: targetCompany,
            role_title: targetRole
          })
        });
        const data = await res.json();
        if (res.ok) {
          profileResult = data;
          textSnippet = jdText.substring(0, 300);
        } else {
          alert("JD Text Error: " + data.detail);
        }
      }

      if (profileResult) {
        setIdealProfile(profileResult);
        setExtractedSnippet(textSnippet);
        if (profileResult.company_name && profileResult.company_name !== "Target Company") {
          setTargetCompany(profileResult.company_name);
        }
        if (profileResult.role_title && profileResult.role_title !== "Software Engineer") {
          setTargetRole(profileResult.role_title);
        }
      }
    } catch (e) {
      alert("JD Analysis failed: " + e.message);
    } finally {
      setAnalyzingJd(false);
    }
  };

  const handleAddCertificate = async (e) => {
    if (e) e.preventDefault();
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

  const handleAddWorkexp = async (e) => {
    if (e) e.preventDefault();
    if (!newWorkexp.company || !newWorkexp.role) return;
    try {
      const bullets = typeof newWorkexp.bullet_points === 'string'
        ? newWorkexp.bullet_points.split('\n').map(b => b.trim()).filter(Boolean)
        : newWorkexp.bullet_points;
      const res = await fetch('/api/workexp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newWorkexp, bullet_points: bullets, id: `exp-${Date.now()}` })
      });
      if (res.ok) {
        setNewWorkexp({ company: '', role: '', location: '', date_range: '', bullet_points: '' });
        fetch('/api/workexp').then(r => r.json()).then(setWorkexp);
      }
    } catch (e) {
      console.error("Add workexp error", e);
    }
  };

  const handleDeleteWorkexp = async (id) => {
    try {
      await fetch(`/api/workexp/${id}`, { method: 'DELETE' });
      fetch('/api/workexp').then(r => r.json()).then(setWorkexp);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAchievement = async (e) => {
    if (e) e.preventDefault();
    if (!newAchievement.title || !newAchievement.description) return;
    try {
      const res = await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newAchievement, id: `ach-${Date.now()}` })
      });
      if (res.ok) {
        setNewAchievement({ title: '', description: '', date: '', impact: '' });
        fetch('/api/achievements').then(r => r.json()).then(setAchievements);
      }
    } catch (e) {
      console.error("Add achievement error", e);
    }
  };

  const handleDeleteAchievement = async (id) => {
    try {
      await fetch(`/api/achievements/${id}`, { method: 'DELETE' });
      fetch('/api/achievements').then(r => r.json()).then(setAchievements);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddExtracurricular = async (e) => {
    if (e) e.preventDefault();
    if (!newExtracurricular.organization || !newExtracurricular.role) return;
    try {
      const bullets = typeof newExtracurricular.bullet_points === 'string'
        ? newExtracurricular.bullet_points.split('\n').map(b => b.trim()).filter(Boolean)
        : newExtracurricular.bullet_points;
      const res = await fetch('/api/extracurriculars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newExtracurricular, bullet_points: bullets, id: `extra-${Date.now()}` })
      });
      if (res.ok) {
        setNewExtracurricular({ organization: '', role: '', location: '', date_range: '', bullet_points: '' });
        fetch('/api/extracurriculars').then(r => r.json()).then(setExtracurriculars);
      }
    } catch (e) {
      console.error("Add extracurricular error", e);
    }
  };

  const handleDeleteExtracurricular = async (id) => {
    try {
      await fetch(`/api/extracurriculars/${id}`, { method: 'DELETE' });
      fetch('/api/extracurriculars').then(r => r.json()).then(setExtracurriculars);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        health={health}
        theme={theme}
        setTheme={setTheme}
        onOpenLlmModal={handleOpenLlmModal}
      />

      {/* Main Container */}
      <div className="main-wrapper">
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <main className="content-area">
          {activeTab === 'studio' && (
            <ResumeStudio
              setJdFile={setJdFile}
              jdText={jdText}
              setJdText={setJdText}
              onAnalyzeJd={handleAnalyzeJd}
              analyzingJd={analyzingJd}
              extractedSnippet={extractedSnippet}
              idealProfile={idealProfile}
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              includeCerts={includeCerts}
              setIncludeCerts={setIncludeCerts}
              onGenerateResume={handleGenerateResume}
              generating={generating}
              selectedProjectIds={selectedProjectIds}
              projects={projects}
              toggleProjectSelection={toggleProjectSelection}
              targetCompany={targetCompany}
              targetRole={targetRole}
              currentTexUrl={currentTexUrl}
              setCurrentTexUrl={setCurrentTexUrl}
              currentPdfUrl={currentPdfUrl}
              setCurrentPdfUrl={setCurrentPdfUrl}
              hasGenerated={hasGenerated}
              setHasGenerated={setHasGenerated}
            />
          )}

          {activeTab === 'indexer' && (
            <RepoIndexer
              repoPath={repoPath}
              setRepoPath={setRepoPath}
              onScanRepository={handleScanRepository}
              indexing={indexing}
              lastScanResult={lastScanResult}
              projects={projects}
            />
          )}

          {activeTab === 'jd' && (
            <JobIntelligence
              setJdFile={setJdFile}
              jdText={jdText}
              setJdText={setJdText}
              onAnalyzeJd={handleAnalyzeJd}
              analyzingJd={analyzingJd}
              idealProfile={idealProfile}
            />
          )}

          {(activeTab === 'profile' || activeTab === 'stores') && (
            <ProfileVault
              candidateProfile={candidateProfile}
              setCandidateProfile={setCandidateProfile}
              onSaveProfile={handleSaveCandidateProfile}
              profileSavedMsg={profileSavedMsg}
              workexp={workexp}
              newWorkexp={newWorkexp}
              setNewWorkexp={setNewWorkexp}
              onAddWorkexp={handleAddWorkexp}
              onDeleteWorkexp={handleDeleteWorkexp}
              certificates={certificates}
              newCert={newCert}
              setNewCert={setNewCert}
              onAddCertificate={handleAddCertificate}
              onDeleteCertificate={handleDeleteCertificate}
              achievements={achievements}
              newAchievement={newAchievement}
              setNewAchievement={setNewAchievement}
              onAddAchievement={handleAddAchievement}
              onDeleteAchievement={handleDeleteAchievement}
              extracurriculars={extracurriculars}
              newExtracurricular={newExtracurricular}
              setNewExtracurricular={setNewExtracurricular}
              onAddExtracurricular={handleAddExtracurricular}
              onDeleteExtracurricular={handleDeleteExtracurricular}
            />
          )}

          {activeTab === 'history' && (
            <GeneratedHistory history={history} />
          )}
        </main>
      </div>

      {/* LLM Selector Modal */}
      <LlmModal
        showLlmModal={showLlmModal}
        setShowLlmModal={setShowLlmModal}
        llmProviders={llmProviders}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        selectedOllamaModel={selectedOllamaModel}
        setSelectedOllamaModel={setSelectedOllamaModel}
        ollamaModels={ollamaModels}
        pingResult={pingResult}
        pinging={pinging}
        handlePingLlm={handlePingLlm}
        handleSelectLlmProvider={handleSelectLlmProvider}
      />
    </div>
  );
}
