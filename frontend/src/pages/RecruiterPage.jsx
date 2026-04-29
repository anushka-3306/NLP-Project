import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RadarChart from '../components/RadarChart';
import PDFViewer from '../components/PDFViewer';
import ThemeToggle from '../components/ThemeToggle';

export default function RecruiterPage() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  
  // Job Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editJobId, setEditJobId] = useState(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isDeletingApp, setIsDeletingApp] = useState(null);

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      const r = await fetch('http://localhost:8000/api/jobs');
      const data = await r.json();
      setJobs(data);
    } catch (e) { console.error(e); }
  };

  const handleSaveJob = async () => {
    if (!jobTitle.trim() || !jobDesc.trim()) { setFormError('Both fields are required.'); return; }
    setIsSaving(true); setFormError('');
    try {
      const url = isEditing ? `http://localhost:8000/api/jobs/${editJobId}` : 'http://localhost:8000/api/jobs';
      const method = isEditing ? 'PUT' : 'POST';
      
      const r = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: jobTitle.trim(), description: jobDesc.trim() }),
      });
      
      if (!r.ok) throw new Error('Failed to save job');
      
      const savedJob = await r.json();
      
      setJobTitle(''); setJobDesc(''); setShowForm(false); setIsEditing(false); setEditJobId(null);
      await fetchJobs();
      
      if (selectedJob?.id === editJobId) {
        setSelectedJob(savedJob);
      }
    } catch (e) { setFormError('Failed to save job.'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteJob = async (e, jobId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure? This will delete the job and all its applications.")) return;
    
    try {
      await fetch(`http://localhost:8000/api/jobs/${jobId}`, { method: 'DELETE' });
      if (selectedJob?.id === jobId) setSelectedJob(null);
      await fetchJobs();
    } catch (e) { console.error(e); }
  };

  const openEditForm = (e, job) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditJobId(job.id);
    setJobTitle(job.title);
    setJobDesc(job.description);
    setShowForm(true);
  };

  const selectJob = async (job) => {
    setSelectedJob(job);
    setSelectedCandidate(null);
    fetchApplications(job.id);
  };

  const fetchApplications = async (jobId) => {
    try {
      const r = await fetch(`http://localhost:8000/api/jobs/${jobId}/applications`);
      setApplications(await r.json());
    } catch (e) { console.error(e); }
  };

  const handleDeleteApplication = async (e, appId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this candidate application?")) return;
    
    setIsDeletingApp(appId);
    try {
      await fetch(`http://localhost:8000/api/applications/${appId}`, { method: 'DELETE' });
      setApplications(prev => prev.filter(app => app.id !== appId));
      if (selectedCandidate?.id === appId) setSelectedCandidate(null);
    } catch (e) { console.error(e); }
    finally { setIsDeletingApp(null); }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#F59E0B";
    return "#F43F5E";
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)] font-['Inter'] text-slate-900 dark:text-white transition-colors duration-200 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-[280px] fixed top-0 left-0 h-screen bg-[var(--bg-card)] border-r border-slate-200 dark:border-slate-800 flex flex-col p-6 z-20">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <div className="font-['Manrope'] font-bold text-base tracking-tight text-slate-900 dark:text-white">Aira Professional</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Recruiter Suite</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 mb-6">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-medium text-sm transition-colors border border-transparent">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Home
          </Link>
          <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-md font-semibold text-sm cursor-pointer border border-indigo-100 dark:border-indigo-800/30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Manage Jobs
          </div>
        </nav>

        <button 
          onClick={() => { setShowForm(!showForm); setIsEditing(false); setJobTitle(''); setJobDesc(''); }}
          className="w-full py-2 bg-indigo-600 text-white rounded-md font-semibold text-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mb-6"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {showForm && !isEditing ? 'Cancel New Job' : 'Add New Opening'}
        </button>

        {showForm && (
          <div className="flex flex-col gap-2 mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm fade-up">
            <input
              type="text"
              placeholder="e.g. Senior Software Engineer"
              className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
            />
            <textarea
              className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded outline-none focus:border-indigo-500 resize-none text-slate-900 dark:text-slate-100"
              placeholder="Job description..."
              rows={4}
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
            />
            {formError && <p className="text-[10px] text-rose-500">{formError}</p>}
            <div className="flex gap-2 mt-1">
              <button onClick={handleSaveJob} disabled={isSaving} className="flex-1 bg-indigo-600 text-white text-xs font-semibold py-1.5 rounded hover:bg-indigo-700">
                {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Save'}
              </button>
              <button onClick={() => { setShowForm(false); setIsEditing(false); setFormError(''); }} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-medium py-1.5 rounded">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Active Listings ({jobs.length})</div>
          <div className="flex flex-col gap-1.5">
            {jobs.map(job => (
              <div 
                key={job.id} 
                onClick={() => selectJob(job)}
                className={`group p-2.5 rounded-md cursor-pointer border transition-all ${selectedJob?.id === job.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/30' : 'bg-white dark:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
              >
                <div className="flex justify-between items-start mb-0.5">
                  <div className="font-semibold text-xs truncate text-slate-900 dark:text-slate-200 pr-2">{job.title}</div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => openEditForm(e, job)} className="p-1 hover:text-indigo-600 text-slate-400">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={(e) => handleDeleteJob(e, job.id)} className="p-1 hover:text-rose-600 text-slate-400">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 line-clamp-2">{job.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link to="/candidate" className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            Candidate Portal
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-[280px] flex-1 flex flex-col h-screen min-h-0 p-8 max-w-[1400px]">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        {selectedCandidate ? (
          /* SPLIT PANEL VIEW */
          <div className="fade-up flex flex-col h-[calc(100vh-6rem)] min-h-0 gap-4">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setSelectedCandidate(null)}
                className="text-indigo-600 dark:text-indigo-400 font-medium text-xs flex items-center gap-1 hover:underline"
              >
                &larr; Back to Leaderboard
              </button>
              <button 
                onClick={(e) => handleDeleteApplication(e, selectedCandidate.id)}
                className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-md text-xs font-bold border border-rose-100 dark:border-rose-800/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete Application
              </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
              <div className="lg:w-[60%] min-h-0 bg-[#1E1E2E] rounded-lg shadow-sm border border-slate-800 flex flex-col overflow-hidden relative">
                <PDFViewer fileUrl={selectedCandidate.resume_path ? `http://localhost:8000${selectedCandidate.resume_path}` : null} />
              </div>

              <div className="lg:w-[40%] min-h-0 flex flex-col gap-4 overflow-y-auto hide-scrollbar pr-1 pb-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                  <img
                    alt={selectedCandidate.candidate_name}
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedCandidate.candidate_name)}&background=EEF2FF&color=4F46E5&size=128`}
                    className="w-16 h-16 rounded-full shadow-sm mb-3 border border-slate-100 dark:border-slate-700"
                  />
                  <h2 className="text-xl font-bold font-['Manrope'] mb-1 text-slate-900 dark:text-white text-center">{selectedCandidate.candidate_name}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-5 text-center">Applied for: {selectedJob.title}</p>
                  
                  <div className="text-center mb-6">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">AI Match Score</div>
                    <div className="text-3xl font-extrabold" style={{ color: getScoreColor(selectedCandidate.final_score) }}>{selectedCandidate.final_score}%</div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 w-full">
                    <div className="flex flex-col items-center p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase">Skill</span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{selectedCandidate.skill_match || 0}%</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase">Semantic</span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{selectedCandidate.semantic_similarity || 0}%</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase">Integrity</span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{selectedCandidate.fraud_integrity || 0}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-5 shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-sm mb-4 font-['Manrope'] text-slate-900 dark:text-white">JD Match Analysis</h3>
                  <RadarChart 
                    breakdown={selectedCandidate.breakdown || {
                      semantic_similarity: selectedCandidate.semantic_similarity,
                      skill_match: selectedCandidate.skill_match,
                      experience_match: selectedCandidate.skill_match - 10 > 0 ? selectedCandidate.skill_match - 10 : 0,
                      education_match: 100,
                      projects_match: 100
                    }} 
                    finalScore={selectedCandidate.final_score} 
                  />
                </div>
              </div>
            </div>
          </div>
        ) : !selectedJob ? (
          /* Empty State */
          <div className="flex flex-col gap-8">
            <div className="fade-up">
              <h1 className="font-['Manrope'] font-bold text-3xl mb-1 text-slate-900 dark:text-white tracking-tight">Recruiter Suite</h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg">Manage your talent pipeline and analyze AI-ranked candidates.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 fade-up">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-[160px]">
                <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-['Manrope']">{jobs.length}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Job Listings</div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-[160px]">
                <div className="w-12 h-12 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-['Manrope']">Pro</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suite Status</div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-[160px]">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 font-['Manrope']">&lt; 30s</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Processing Latency</div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-12 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 fade-up">
              <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <p className="font-semibold text-slate-600 dark:text-slate-400">Select a job from the sidebar to view ranked applicants.</p>
            </div>
          </div>
        ) : (
          /* LEADERBOARD VIEW */
          <div className="flex flex-col h-full fade-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-['Manrope'] font-bold text-2xl mb-1 text-slate-900 dark:text-white">{selectedJob.title}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Sorted by AI Match Confidence • {applications.length} Candidates</p>
              </div>
              <div className="flex gap-2">
                <button onClick={(e) => openEditForm(e, selectedJob)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Edit Job Details
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              {applications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-500">
                  <p className="font-medium text-sm mb-2">No applications yet</p>
                  <p className="text-xs">Once candidates apply through the portal, they will appear here ranked by fit.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="px-6 py-4 w-16 text-center">Rank</th>
                      <th className="px-6 py-4">Candidate</th>
                      <th className="px-6 py-4 text-center">Skill</th>
                      <th className="px-6 py-4 text-center">Semantic</th>
                      <th className="px-6 py-4 text-center">Integrity</th>
                      <th className="px-6 py-4 text-center">Score</th>
                      <th className="px-6 py-4 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {applications.map((app, i) => (
                      <tr 
                        key={app.id} 
                        onClick={() => setSelectedCandidate(app)}
                        className="group hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 text-center">
                          <span className={`text-xs font-bold ${i < 3 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>#{i + 1}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              alt={app.candidate_name}
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(app.candidate_name)}&background=F3F4F8&color=111827&size=64`}
                              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700"
                            />
                            <div className="font-semibold text-slate-900 dark:text-slate-200 text-sm">{app.candidate_name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{app.skill_match}%</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{app.semantic_similarity}%</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{app.fraud_integrity}%</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-sm" style={{ color: getScoreColor(app.final_score) }}>
                            {app.final_score}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => handleDeleteApplication(e, app.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
