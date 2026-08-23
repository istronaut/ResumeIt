import React, { useState } from 'react';
import { User, Briefcase, BookOpen, Award, GraduationCap } from 'lucide-react';
import PersonalDetailsSection from '../components/profile/PersonalDetailsSection';
import WorkExpSection from '../components/profile/WorkExpSection';
import CertificatesSection from '../components/profile/CertificatesSection';
import AchievementsSection from '../components/profile/AchievementsSection';
import ExtracurricularsSection from '../components/profile/ExtracurricularsSection';

export default function ProfileVault({
  candidateProfile,
  setCandidateProfile,
  onSaveProfile,
  profileSavedMsg,
  workexp,
  newWorkexp,
  setNewWorkexp,
  onAddWorkexp,
  onDeleteWorkexp,
  certificates,
  newCert,
  setNewCert,
  onAddCertificate,
  onDeleteCertificate,
  achievements,
  newAchievement,
  setNewAchievement,
  onAddAchievement,
  onDeleteAchievement,
  extracurriculars,
  newExtracurricular,
  setNewExtracurricular,
  onAddExtracurricular,
  onDeleteExtracurricular
}) {
  const [profileSubTab, setProfileSubTab] = useState('all');

  return (
    <div>
      {/* Profile Header Banner */}
      <div className="profile-header-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <User size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
              {candidateProfile.full_name || 'Candidate Master Profile'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Unified Profile Store • Work Experience, Certifications & Courses, Achievements, Extracurriculars
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <span
            className="score-pill"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '6px 12px'
            }}
          >
            <Briefcase size={12} style={{ marginRight: '4px' }} /> {workexp.length} Experience
          </span>
          <span
            className="score-pill"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '6px 12px'
            }}
          >
            <BookOpen size={12} style={{ marginRight: '4px' }} /> {certificates.length} Certs
          </span>
          <span
            className="score-pill"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '6px 12px'
            }}
          >
            <Award size={12} style={{ marginRight: '4px' }} /> {achievements.length} Achievements
          </span>
        </div>
      </div>

      {/* Profile Section Switcher Subnav */}
      <div className="profile-subnav">
        <button
          type="button"
          className={`profile-subnav-btn ${profileSubTab === 'all' ? 'active' : ''}`}
          onClick={() => setProfileSubTab('all')}
        >
          <span>All Profile Sections</span>
        </button>
        <button
          type="button"
          className={`profile-subnav-btn ${profileSubTab === 'header' ? 'active' : ''}`}
          onClick={() => setProfileSubTab('header')}
        >
          <User size={14} />
          <span>Personal Details</span>
        </button>
        <button
          type="button"
          className={`profile-subnav-btn ${profileSubTab === 'workexp' ? 'active' : ''}`}
          onClick={() => setProfileSubTab('workexp')}
        >
          <Briefcase size={14} />
          <span>Work Experience</span>
          <span className="profile-subnav-badge">{workexp.length}</span>
        </button>
        <button
          type="button"
          className={`profile-subnav-btn ${profileSubTab === 'certs' ? 'active' : ''}`}
          onClick={() => setProfileSubTab('certs')}
        >
          <BookOpen size={14} />
          <span>Certificates & Courses</span>
          <span className="profile-subnav-badge">{certificates.length}</span>
        </button>
        <button
          type="button"
          className={`profile-subnav-btn ${profileSubTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setProfileSubTab('achievements')}
        >
          <Award size={14} />
          <span>Achievements & Honors</span>
          <span className="profile-subnav-badge">{achievements.length}</span>
        </button>
        <button
          type="button"
          className={`profile-subnav-btn ${profileSubTab === 'extracurriculars' ? 'active' : ''}`}
          onClick={() => setProfileSubTab('extracurriculars')}
        >
          <GraduationCap size={14} />
          <span>Extracurriculars</span>
          <span className="profile-subnav-badge">{extracurriculars.length}</span>
        </button>
      </div>

      {/* SECTION 1: Personal Header & Contact */}
      {(profileSubTab === 'all' || profileSubTab === 'header') && (
        <PersonalDetailsSection
          candidateProfile={candidateProfile}
          setCandidateProfile={setCandidateProfile}
          onSaveProfile={onSaveProfile}
          profileSavedMsg={profileSavedMsg}
        />
      )}

      {/* SECTION 2: Work Experience Store */}
      {(profileSubTab === 'all' || profileSubTab === 'workexp') && (
        <WorkExpSection
          workexp={workexp}
          newWorkexp={newWorkexp}
          setNewWorkexp={setNewWorkexp}
          onAddWorkexp={onAddWorkexp}
          onDeleteWorkexp={onDeleteWorkexp}
        />
      )}

      {/* SECTION 3: Certificates Store */}
      {(profileSubTab === 'all' || profileSubTab === 'certs') && (
        <CertificatesSection
          certificates={certificates}
          newCert={newCert}
          setNewCert={setNewCert}
          onAddCertificate={onAddCertificate}
          onDeleteCertificate={onDeleteCertificate}
        />
      )}

      {/* SECTION 4: Achievements Store */}
      {(profileSubTab === 'all' || profileSubTab === 'achievements') && (
        <AchievementsSection
          achievements={achievements}
          newAchievement={newAchievement}
          setNewAchievement={setNewAchievement}
          onAddAchievement={onAddAchievement}
          onDeleteAchievement={onDeleteAchievement}
        />
      )}

      {/* SECTION 5: Extracurriculars Store */}
      {(profileSubTab === 'all' || profileSubTab === 'extracurriculars') && (
        <ExtracurricularsSection
          extracurriculars={extracurriculars}
          newExtracurricular={newExtracurricular}
          setNewExtracurricular={setNewExtracurricular}
          onAddExtracurricular={onAddExtracurricular}
          onDeleteExtracurricular={onDeleteExtracurricular}
        />
      )}
    </div>
  );
}
