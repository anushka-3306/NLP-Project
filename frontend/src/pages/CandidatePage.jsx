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
          <div className="fade-up flex flex-col gap-8 md:gap-12">
            <div className="flex justify-between items-center">
              <button onClick={() => setResult(null)} className="text-slate-500 dark:text-slate-400 font-bold text-sm flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-fit group">
                <span className="group-hover:-translate-x-1 transition-transform">&larr;</span> Back to Application
              </button>
            </div>

            {/* Results Header / Candidate Identity */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl relative overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-10 dark:opacity-20 -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
              <div className="flex items-center gap-6 z-10 flex-wrap">
                <img
                  alt="Candidate Photo"
                  className="w-20 h-20 rounded-full object-cover border-4 border-slate-50 dark:border-slate-900"
                  src={`https://ui-avatars.com/api/?name=${result.candidate_name}&background=e0e7ff&color=4f46e5&size=128`}
                />
                <div>
                  <h2 className="font-['Manrope'] text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white break-words">{result.candidate_name}</h2>
                  <p className="font-['Inter'] text-slate-600 dark:text-slate-400 text-base mt-1">Applying for <span className="font-semibold text-indigo-600 dark:text-indigo-400">{selectedJob?.title}</span></p>
                  <div className="flex gap-3 mt-3 flex-wrap">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-sm font-medium">Just Analyzed</span>
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-sm font-medium break-all max-w-[200px]">{file?.name || result.resume_path?.split('/').pop()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 z-10 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md px-4 md:px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-right">
                  <div className="font-['Manrope'] text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overall AI Match</div>
                  <div className="font-['Manrope'] text-3xl md:text-4xl font-extrabold" style={{ color: getScoreColor(result.final_score) }}>{result.final_score}%</div>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center relative">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-200 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8"></path>
                    <path style={{ color: getScoreColor(result.final_score) }} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${result.final_score}, 100`} strokeWidth="3.8"></path>
                  </svg>
                  <svg className="w-6 h-6 relative z-10" style={{ color: getScoreColor(result.final_score) }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Bento Grid: Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-['Manrope'] font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    Skill Match
                  </h3>
                  <span className="font-['Manrope'] font-extrabold text-xl text-indigo-600 dark:text-indigo-400">{result.breakdown?.skill_match || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${result.breakdown?.skill_match || 0}%` }}></div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-['Inter']">Alignment with core technical requirements based on job graph.</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-['Manrope'] font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                    Semantic Fit
                  </h3>
                  <span className="font-['Manrope'] font-extrabold text-xl text-indigo-600 dark:text-indigo-400">{result.breakdown?.semantic_similarity || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${result.breakdown?.semantic_similarity || 0}%` }}></div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-['Inter']">Contextual match between experience described and job responsibilities.</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-['Manrope'] font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    Integrity Score
                  </h3>
                  <span className="font-['Manrope'] font-extrabold text-xl text-indigo-600 dark:text-indigo-400">{result.breakdown?.fraud_integrity || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${result.breakdown?.fraud_integrity || 0}%` }}></div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-['Inter']">Confidence based on timeline continuity and anomaly detection.</p>
              </div>
            </div>

            {/* Best Job Match Card */}
            {result.job_prediction && (
              <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-6 relative overflow-hidden border border-indigo-100 dark:border-indigo-900/50">
                {/* Decorative orb */}
                <div style={{
                  position: 'absolute', right: 0, top: 0,
                  width: 200, height: 200,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                  transform: 'translate(30%, -30%)',
                  pointerEvents: 'none'
                }} />

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl flex-shrink-0 bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <svg width="26" height="26" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Text */}
                <div className="flex-1 z-10">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em] mb-1.5">
                    AI Career Match · TF-IDF + Logistic Regression
                  </div>
                  {result.job_prediction.low_confidence ? (
                    <div>
                      <div className="font-['Manrope'] font-extrabold text-2xl text-slate-800 dark:text-slate-200">
                        Low Confidence Prediction
                      </div>
                      <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-1">
                        The model could not confidently classify this resume into a known category (confidence: {(result.job_prediction.confidence * 100).toFixed(1)}%).
                        This may indicate a highly specialised or mixed-domain profile.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="font-['Manrope'] font-extrabold text-2xl md:text-3xl text-indigo-700 dark:text-indigo-400">
                        {result.job_prediction.predicted_category}
                      </div>
                      <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-1">
                        Based on your resume content, our classifier recommends roles in <strong className="text-indigo-600 dark:text-indigo-300">{result.job_prediction.predicted_category}</strong>.
                        Confidence: <strong>{(result.job_prediction.confidence * 100).toFixed(1)}%</strong>.
                      </p>
                    </div>
                  )}
                </div>

                {/* Confidence Badge */}
                {!result.job_prediction.low_confidence && (
                  <div className="text-center flex-shrink-0 z-10">
                    <div className="w-[72px] h-[72px] rounded-full border-4 border-indigo-50 dark:border-indigo-900/30 bg-gradient-to-br from-slate-50 to-indigo-50/50 dark:from-slate-800 dark:to-indigo-900/20 flex flex-col items-center justify-center">
                      <div className="font-['Manrope'] font-black text-base text-indigo-700 dark:text-indigo-400 leading-none">
                        {(result.job_prediction.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase mt-0.5">
                        match
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Radar Chart from Existing */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm w-full">
              <h3 className="font-bold text-sm mb-6 text-slate-800 dark:text-slate-200 uppercase tracking-wider">Candidate DNA Profile</h3>
              <div className="w-full flex justify-center h-[300px]">
                <RadarChart breakdown={result.breakdown} finalScore={result.final_score} />
              </div>
            </div>

            {/* Detailed Analysis Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

              {/* Left Column: Skills Detail */}
              <div className="flex flex-col gap-6 md:gap-8 bg-slate-50 dark:bg-slate-900/50 p-6 md:p-8 rounded-xl border border-slate-200 dark:border-slate-700/50">
                <h3 className="font-['Manrope'] font-bold text-xl md:text-2xl text-slate-900 dark:text-white">Skill Extraction</h3>

                <div>
                  <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4">Matched Core Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.details?.matched_skills?.length > 0 ? (
                      result.details.matched_skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1.5 break-words max-w-full">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">No core skills matched.</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4">Missing or Weak Signals</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.details?.missing_skills?.length > 0 ? (
                      result.details.missing_skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded flex items-center gap-1.5 break-words max-w-full">
                          <svg className="w-4 h-4 flex-shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">No significant gaps identified.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: AI Insights & Fraud */}
              <div className="flex flex-col gap-6 md:gap-8">

                {/* AI Recommendations */}
                <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 rounded-l-xl"></div>
                  <h3 className="font-['Manrope'] font-bold text-xl text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    AI Recommendations
                  </h3>
                  <ul className="flex flex-col gap-4">
                    {result.recommendations?.length > 0 ? (
                      result.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                            <p className="font-semibold">{rec.skill}</p>
                            {rec.resources && rec.resources.length > 0 && (
                              <ul className="list-disc ml-5 mt-1 space-y-1">
                                {rec.resources.map(([title, link], idx) => (
                                  <li key={idx} className="break-words">
                                    <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                                      {title}
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" /></svg>
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-500 dark:text-slate-400 text-sm">No recommendations available</li>
                    )}
                  </ul>
                </div>

                {/* Fraud Report Mini */}
                <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="font-['Manrope'] font-bold text-xl text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Integrity Checks
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Overall Risk Verdict</span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-sm uppercase ${
                        result.details?.fraud_report?.verdict === "High Risk" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400" :
                        result.details?.fraud_report?.verdict === "Suspicious" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                      }`}>
                        {result.details?.fraud_report?.verdict || "Low Risk"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 flex-wrap gap-2">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Timeline Continuity</span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-sm uppercase ${result.details?.fraud_report?.timeline_valid === false ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {result.details?.fraud_report?.timeline_valid === false ? 'Flagged' : 'Clear'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 flex-wrap gap-2">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Keyword Stuffing Detected</span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-sm uppercase ${result.details?.fraud_report?.keyword_stuffing ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {result.details?.fraud_report?.keyword_stuffing ? 'Detected' : 'Negative'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 flex-wrap gap-2">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Hidden Text Analysis</span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-sm uppercase ${result.details?.fraud_report?.hidden_text ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {result.details?.fraud_report?.hidden_text ? 'Found' : 'Clean'}
                      </span>
                    </div>

                    {result.details?.fraud_report?.flags?.length > 0 && (
                      <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                        <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">Detected Issues</h4>
                        <div className="flex flex-col">
                          {result.details.fraud_report.flags.map((flag, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-none">
                              <span className="text-sm text-slate-600 dark:text-slate-400 pr-4">{flag}</span>
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-sm bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 whitespace-nowrap">FLAGGED</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Semantic Detail Table (From Existing) */}
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