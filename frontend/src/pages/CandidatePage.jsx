import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RadarChart from '../components/RadarChart';
import ThemeToggle from '../components/ThemeToggle';

export default function CandidatePage() {
  const [file, setFile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [previousApplications, setPreviousApplications] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchJobs();
    fetchAndSyncApplications();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/jobs");
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const fetchAndSyncApplications = async () => {
    try {
      const storedApps = localStorage.getItem('candidate_application_ids');
      if (!storedApps) return;

      const appIds = JSON.parse(storedApps);
      if (appIds.length === 0) return;

      setIsSyncing(true);
      const response = await fetch(`http://localhost:8000/api/applications/bulk?ids=${appIds.join(',')}`);
      if (response.ok) {
        const liveApps = await response.json();

        // Sort live apps by ID (descending) to show newest first
        const sortedApps = liveApps.sort((a, b) => b.id - a.id);

        // Sync local storage to only keep IDs that still exist in the backend
        const validIds = liveApps.map(app => app.id);
        localStorage.setItem('candidate_application_ids', JSON.stringify(validIds));

        setPreviousApplications(sortedApps);
      }
    } catch (error) {
      console.error("Error syncing applications:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const saveApplicationId = (appId) => {
    const storedIds = localStorage.getItem('candidate_application_ids');
    const existingIds = storedIds ? JSON.parse(storedIds) : [];
    const updatedIds = [appId, ...existingIds].slice(0, 20); // Keep last 20
    localStorage.setItem('candidate_application_ids', JSON.stringify(updatedIds));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (isValidFile(droppedFile)) {
        setFile(droppedFile);
      } else {
        setError("Invalid file type. Only PDF and DOCX are allowed.");
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (isValidFile(selectedFile)) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Invalid file type. Only PDF and DOCX are allowed.");
      }
    }
  };

  const isValidFile = (f) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    return validTypes.includes(f.type) || f.name.endsWith('.pdf') || f.name.endsWith('.docx') || f.name.endsWith('.doc');
  };

  const handleAnalyze = async () => {
    if (!file || !selectedJob) {
      setError("Please provide a resume file and select a job opening.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("job_title", selectedJob.title);
    formData.append("job_description", selectedJob.description);
    formData.append("job_id", selectedJob.id);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      // Use the same unification logic as handleViewApplication
      const unifiedData = {
        ...data,
        breakdown: data.breakdown || {
          skill_match: data.skill_match || 0,
          semantic_similarity: data.semantic_similarity || 0,
          fraud_integrity: data.fraud_integrity || 0
        },
        details: data.details || {},
        recommendations: data.recommendations || data.details?.recommendations || []
      };

      setResult(unifiedData);

      // We need to check if the response includes an application object with an ID
      if (data.application_id) {
        saveApplicationId(data.application_id);
        fetchAndSyncApplications();
      }

    } catch (err) {
      setError(err.message || "Failed to connect to the analysis engine.");
    } finally {
      setIsLoading(false);
    }
  };

  const getVerdictFromScore = (score) => {
    if (score >= 80) return "STRONG";
    if (score >= 60) return "UNCERTAIN";
    return "HIGH RISK";
  };

  const getVerdictStyle = (verdict) => {
    switch (verdict) {
      case "STRONG": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "UNCERTAIN": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "HIGH RISK": return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400";
      default: return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const handleViewApplication = (app) => {
    // 1. Recover the details object (handles both string and object formats)
    let rawDetails = app.details || {};
    if (typeof rawDetails === 'string') {
      try { rawDetails = JSON.parse(rawDetails); } catch (e) { rawDetails = {}; }
    }

    // 2. Build a unified results object that the UI can always trust
    const unifiedResult = {
      ...app,
      candidate_name: app.candidate_name,
      final_score: app.final_score,
      breakdown: {
        skill_match: app.skill_match ?? app.breakdown?.skill_match ?? 0,
        semantic_similarity: app.semantic_similarity ?? app.breakdown?.semantic_similarity ?? 0,
        fraud_integrity: app.fraud_integrity ?? app.breakdown?.fraud_integrity ?? 0
      },
      details: {
        matched_skills: rawDetails.matched_skills || app.details?.matched_skills || [],
        missing_skills: rawDetails.missing_skills || app.details?.missing_skills || [],
        similarity_report: rawDetails.similarity_report || app.details?.similarity_report || []
      },
      recommendations: rawDetails.recommendations || app.recommendations || []
    };

    setResult(unifiedResult);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#F59E0B";
    return "#F43F5E";
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)] font-['Inter'] text-slate-900 dark:text-white transition-colors duration-200">

      {/* Left Sidebar */}
      <aside className="w-[280px] fixed top-0 left-0 h-screen bg-[var(--bg-card)] border-r border-slate-200 dark:border-slate-800 flex flex-col p-6 z-20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div className="font-['Manrope'] font-bold text-base tracking-tight text-slate-900 dark:text-white">Aira Portal</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Candidate Suite</div>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 mb-8">
          <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-md font-semibold text-sm cursor-pointer border border-indigo-100 dark:border-indigo-800/30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Submit Application
          </div>
          <Link to="/" className="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-medium text-sm transition-colors border border-transparent">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>
        </nav>

        <div className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Status</span>
            {isSyncing && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
          </div>

          <div className="flex flex-col gap-2">
            {previousApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-4 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="font-medium text-slate-500 text-xs">No active applications</div>
              </div>
            ) : (
              previousApplications.map(app => (
                <div
                  key={app.id}
                  onClick={() => handleViewApplication(app)}
                  className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-200 dark:hover:border-indigo-900 transition-all cursor-pointer shadow-sm group"
                >
                  <div className="font-semibold text-xs mb-1 truncate text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{app.candidate_name}</div>
                  <div className="text-[10px] text-slate-500 mb-2">Score: {app.final_score}%</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400">{new Date(app.created_at || Date.now()).toLocaleDateString()}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getVerdictStyle(getVerdictFromScore(app.final_score))}`}>
                      {getVerdictFromScore(app.final_score)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link to="/recruiter" className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Recruiter Portal
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-[280px] flex-1 p-8 max-w-[1000px]">
        <div className="flex justify-end mb-6">
          <ThemeToggle />
        </div>

        {!result ? (
          <div className="fade-up">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-['Manrope'] mb-1 tracking-tight">Talent Application</h1>
              <p className="text-slate-500 dark:text-slate-400">Join our modern workforce. Upload your resume for instant AI matching.</p>
            </header>

            <div className="flex flex-col md:flex-row gap-6 items-stretch">
              <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                <h2 className="text-sm font-semibold mb-4 text-slate-800 dark:text-slate-200">1. Resume Upload</h2>

                <div
                  className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 transition-all duration-200 ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-400 dark:hover:border-slate-600'}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".pdf,.doc,.docx" />

                  {file ? (
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div className="font-semibold text-sm mb-1 break-all text-slate-800 dark:text-slate-100">{file.name}</div>
                      <div className="text-xs text-slate-500 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                      <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        Change File
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center mb-4 text-slate-500 dark:text-slate-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      </div>
                      <div className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-1">Upload Your CV</div>
                      <div className="text-xs text-slate-500 mb-6">Drag and drop or click to browse</div>
                      <button className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm">
                        Select Document
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                <h2 className="text-sm font-semibold mb-4 text-slate-800 dark:text-slate-200">2. Target Opening</h2>

                <select
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-3 px-4 mb-6 outline-none focus:border-indigo-500 text-sm text-slate-900 dark:text-slate-100 shadow-sm"
                  value={selectedJob?.id || ""}
                  onChange={(e) => {
                    const job = jobs.find(j => j.id === parseInt(e.target.value));
                    setSelectedJob(job);
                  }}
                >
                  <option value="" disabled>Choose a role...</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>

                <h2 className="text-[10px] font-bold mb-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">Role Description</h2>
                <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-4 min-h-[140px] max-h-[220px] overflow-y-auto mb-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {selectedJob ? selectedJob.description : <span className="italic opacity-50">Select an opening to view requirements.</span>}
                </div>

                {error && <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs rounded border border-rose-100 dark:border-rose-800/30 font-medium">{error}</div>}

                <button
                  onClick={handleAnalyze}
                  disabled={isLoading || !file || !selectedJob}
                  className="w-full py-3 rounded-md font-bold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg active:transform active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      Analyzing Resume...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Apply Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* RESULTS VIEW */
          <div className="fade-up flex flex-col gap-6">
            <button onClick={() => setResult(null)} className="text-slate-500 dark:text-slate-400 font-bold text-sm flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-fit group">
              <span className="group-hover:-translate-x-1 transition-transform">&larr;</span> Back to Application
            </button>

            {/* Score Summary */}
            <div className="w-full bg-white dark:bg-slate-800 rounded-lg p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <h1 className="text-3xl font-bold font-['Manrope'] mb-1 text-slate-900 dark:text-white tracking-tight">{result.candidate_name}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Application for {selectedJob?.title}</p>
              </div>

              <div className="flex gap-10">
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-1">Match Confidence</div>
                  <div className="text-4xl font-black" style={{ color: getScoreColor(result.final_score) }}>{result.final_score}%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-1">Integrity Index</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{result.breakdown?.fraud_integrity || 0}%</div>
                </div>
              </div>

              <div>
                <div className={`px-4 py-2 rounded font-black text-sm uppercase border shadow-sm ${getVerdictStyle(getVerdictFromScore(result.final_score))}`}>
                  {getVerdictFromScore(result.final_score)}
                </div>
              </div>
            </div>

            {/* Best Job Match Card */}
            {result.job_prediction && (
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-[0_4px_20px_rgb(46,0,82,0.04)] flex flex-col sm:flex-row items-start sm:items-center gap-6 relative overflow-hidden border border-[#f0e6ff]">
                {/* Decorative orb */}
                <div style={{
                  position: 'absolute', right: 0, top: 0,
                  width: 200, height: 200,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
                  transform: 'translate(30%, -30%)',
                  pointerEvents: 'none'
                }} />

                {/* Icon */}
                <div style={{
                  width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                  background: 'linear-gradient(135deg, #2e0052, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(46,0,82,0.2)'
                }}>
                  <svg width="26" height="26" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Text */}
                <div className="flex-1 z-10">
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
                    AI Career Match · TF-IDF + Logistic Regression
                  </div>
                  {result.job_prediction.low_confidence ? (
                    <div>
                      <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 22, color: '#374151' }}>
                        Low Confidence Prediction
                      </div>
                      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                        The model could not confidently classify this resume into a known category (confidence: {(result.job_prediction.confidence * 100).toFixed(1)}%).
                        This may indicate a highly specialised or mixed-domain profile.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 26, color: '#2e0052' }}>
                        {result.job_prediction.predicted_category}
                      </div>
                      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                        Based on your resume content, our classifier recommends roles in{' '}
                        <strong style={{ color: '#4b0082' }}>{result.job_prediction.predicted_category}</strong>.
                        Confidence: <strong>{(result.job_prediction.confidence * 100).toFixed(1)}%</strong>.
                      </p>
                    </div>
                  )}
                </div>

                {/* Confidence Badge */}
                {!result.job_prediction.low_confidence && (
                  <div style={{ textAlign: 'center', flexShrink: 0, zIndex: 10 }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      border: '4px solid #f0e6ff',
                      background: 'linear-gradient(135deg, rgba(46,0,82,0.05), rgba(124,58,237,0.08))',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      <div style={{ fontFamily: 'Manrope', fontWeight: 900, fontSize: 16, color: '#2e0052', lineHeight: 1 }}>
                        {(result.job_prediction.confidence * 100).toFixed(0)}%
                      </div>
                      <div style={{ fontSize: 9, color: '#7c3aed', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', marginTop: 2 }}>
                        match
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-sm mb-6 text-slate-800 dark:text-slate-200 uppercase tracking-wider">Candidate DNA Profile</h3>
                <RadarChart breakdown={result.breakdown} finalScore={result.final_score} />
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-6">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Skill Intelligence</h3>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified Core Competencies
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.details?.matched_skills?.map((s, i) => (
                      <div key={i} className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded text-xs font-bold">
                        {s}
                      </div>
                    ))}
                    {!result.details?.matched_skills?.length && <span className="text-xs text-slate-400 italic">No direct skill matches detected.</span>}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Identified Growth Areas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.details?.missing_skills?.map((s, i) => {
                      const recLink = result.recommendations?.find(r => r.skill === s)?.resources?.[0];
                      return (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded text-xs font-bold transition-transform hover:scale-[1.02] cursor-default">
                          {s}
                          {recLink && <a href={recLink} target="_blank" rel="noreferrer" className="bg-rose-100 dark:bg-rose-800 px-1.5 py-0.5 rounded text-[10px] hover:bg-rose-200 transition-colors">Course</a>}
                        </div>
                      )
                    })}
                    {!result.details?.missing_skills?.length && <span className="text-xs text-slate-400 italic">All target skills present in profile.</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Semantic Detail Table */}
            {result.details?.similarity_report?.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Semantic Trace Analysis</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cross-Context Validation</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-4 font-bold">Requirement Trace</th>
                        <th className="px-6 py-4 font-bold">Optimal Profile Match</th>
                        <th className="px-6 py-4 font-bold w-32 text-center">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {result.details.similarity_report.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4 text-slate-900 dark:text-slate-200 font-medium leading-relaxed">{row.jd_sentence}</td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400 italic leading-relaxed">{row.best_match}</td>
                          <td className="px-6 py-4 font-black text-center" style={{ color: getScoreColor(row.score * 100) }}>
                            {Math.round(row.score * 100)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}